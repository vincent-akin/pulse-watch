const tls = require('tls');
const dns = require('dns').promises;
const AppError = require('../../common/AppError');
const { SslCertificate, Domain, Subscription, Plan } = require('../../models');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { getQueue, QUEUE_NAMES } = require('../../queues');
const { recordAudit } = require('../audit/audit.service');

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function deriveSslStatus(daysUntilExpiry) {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 30) return 'expiring-soon';
  return 'valid';
}

// Fetches the live TLS certificate for a hostname via a lightweight TLS handshake (no HTTP request needed).
function fetchCertificate(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return reject(new Error('No certificate returned by host.'));
      resolve({
        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
        validFrom: new Date(cert.valid_from),
        validTo: new Date(cert.valid_to),
      });
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('TLS handshake timed out.')); });
    socket.on('error', reject);
  });
}

// Only monitors using HTTPS URLs generate an associated SSLCertificate record (DMBR rule).
async function ensureSslRecordForMonitor(monitor) {
  if (!monitor.url.startsWith('https://')) return null;
  const hostname = new URL(monitor.url).hostname;

  let record = await SslCertificate.findOne({ monitorId: monitor._id, deletedAt: null });
  if (!record) {
    record = await SslCertificate.create({
      organizationId: monitor.organizationId,
      monitorId: monitor._id,
      domain: hostname,
      status: 'valid',
    });
  }
  return record;
}

// Checked nightly, independent of the monitor's own interval (PRD §11 SSL Monitoring).
async function recheckSslCertificate(sslCertificateId) {
  const record = await SslCertificate.findById(sslCertificateId);
  if (!record) return null;

  try {
    const cert = await fetchCertificate(record.domain);
    const daysUntilExpiry = daysBetween(cert.validTo, new Date());
    const status = deriveSslStatus(daysUntilExpiry);

    record.issuer = cert.issuer;
    record.validFrom = cert.validFrom;
    record.validTo = cert.validTo;
    record.daysUntilExpiry = daysUntilExpiry;
    record.status = status;
    record.lastCheckedAt = new Date();
    record.lastError = null;
    await record.save();

    if (status !== 'valid') {
      eventBus.emit(EVENTS.SSLCERTIFICATE_EXPIRING, { organizationId: record.organizationId.toString(), sslCertificate: record });
      await getQueue(QUEUE_NAMES.NOTIFICATION).add('sslcertificate.expiring', { sslCertificateId: record._id.toString() });
    }
  } catch (err) {
    record.lastError = err.message;
    record.lastCheckedAt = new Date();
    await record.save();
  }
  return record;
}

async function listSslCertificates(organizationId, { skip, limit }) {
  const filter = { organizationId, deletedAt: null };
  const [data, total] = await Promise.all([
    SslCertificate.find(filter).sort({ validTo: 1 }).skip(skip).limit(limit),
    SslCertificate.countDocuments(filter),
  ]);
  return { data, total };
}

async function getSslCertificate(organizationId, id) {
  const doc = await SslCertificate.findOne({ _id: id, organizationId, deletedAt: null });
  if (!doc) throw AppError.notFound('SSL certificate not found.');
  return doc;
}

// ── Domains ────────────────────────────────────────────────────────────────
// Domain tracking is opt-in per organization and independent of monitor count (DMBR).
async function createDomain(organizationId, { domainName, registrar }, user, req) {
  const sub = await Subscription.findOne({ organizationId });
  const plan = sub ? await Plan.findById(sub.planId) : await Plan.findOne({ key: 'free' });
  if (plan && !plan.limits.sslDomainMonitoring) {
    throw AppError.forbidden(`Domain monitoring is not included in your plan (${plan.name}).`);
  }

  const existing = await Domain.findOne({ organizationId, domainName, deletedAt: null });
  if (existing) throw AppError.conflict('This domain is already tracked.');

  const domain = await Domain.create({ organizationId, domainName, registrar: registrar || null });
  await recordAudit({ organizationId, userId: user._id, action: 'domain.created', resource: 'domain', resourceId: domain._id, req });
  return domain;
}

// Checks registration expiry nightly via WHOIS-over-DNS heuristics is unreliable without a paid WHOIS API;
// we surface a clear placeholder path here and let the nightly worker call a configured WHOIS provider.
async function recheckDomain(domainId, whoisLookupFn) {
  const domain = await Domain.findById(domainId);
  if (!domain) return null;

  try {
    await dns.lookup(domain.domainName); // confirms the domain still resolves
    if (typeof whoisLookupFn === 'function') {
      const { expiresAt } = await whoisLookupFn(domain.domainName);
      domain.expiresAt = expiresAt;
      const daysUntilExpiry = daysBetween(expiresAt, new Date());
      domain.status = daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry < 30 ? 'expiring-soon' : 'active';
    }
    domain.lastCheckedAt = new Date();
    domain.lastError = null;
    await domain.save();

    if (domain.status !== 'active') {
      eventBus.emit(EVENTS.DOMAIN_EXPIRING, { organizationId: domain.organizationId.toString(), domain });
      await getQueue(QUEUE_NAMES.NOTIFICATION).add('domain.expiring', { domainId: domain._id.toString() });
    }
  } catch (err) {
    domain.lastError = err.message;
    domain.lastCheckedAt = new Date();
    await domain.save();
  }
  return domain;
}

async function listDomains(organizationId, { skip, limit }) {
  const filter = { organizationId, deletedAt: null };
  const [data, total] = await Promise.all([
    Domain.find(filter).sort({ expiresAt: 1 }).skip(skip).limit(limit),
    Domain.countDocuments(filter),
  ]);
  return { data, total };
}

async function getDomain(organizationId, id) {
  const doc = await Domain.findOne({ _id: id, organizationId, deletedAt: null });
  if (!doc) throw AppError.notFound('Domain not found.');
  return doc;
}

async function deleteDomain(organizationId, id, user, req) {
  const domain = await getDomain(organizationId, id);
  await domain.softDelete();
  await recordAudit({ organizationId, userId: user._id, action: 'domain.deleted', resource: 'domain', resourceId: domain._id, req });
}

module.exports = {
  ensureSslRecordForMonitor, recheckSslCertificate, listSslCertificates, getSslCertificate,
  createDomain, recheckDomain, listDomains, getDomain, deleteDomain,
};
