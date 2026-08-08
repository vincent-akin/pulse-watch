const { SslCertificate, Domain, Monitor } = require('../models');
const { getQueue, QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');

// SSL/domain checks run nightly, independent of each monitor's own interval (PRD §11 / DMBR lifecycle rule).
async function runNightlySslDomainChecks() {
  const httpsMonitors = await Monitor.find({ deletedAt: null, url: /^https:\/\// });
  const queue = getQueue(QUEUE_NAMES.SSL_DOMAIN);

  for (const monitor of httpsMonitors) {
    // eslint-disable-next-line no-await-in-loop
    const { ensureSslRecordForMonitor } = require('../modules/ssl-domain/sslDomain.service');
    // eslint-disable-next-line no-await-in-loop
    const record = await ensureSslRecordForMonitor(monitor);
    if (record) await queue.add('recheck-ssl', { sslCertificateId: record._id.toString() });
  }

  const domains = await Domain.find({ deletedAt: null });
  for (const domain of domains) {
    // eslint-disable-next-line no-await-in-loop
    await queue.add('recheck-domain', { domainId: domain._id.toString() });
  }

  logger.info('Nightly SSL/Domain checks queued', { monitorCount: httpsMonitors.length, domainCount: domains.length });
}

module.exports = { runNightlySslDomainChecks };
