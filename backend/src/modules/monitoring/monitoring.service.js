const os = require('os');
const { HealthCheck, Monitor } = require('../../models');
const { executeOnce } = require('./healthCheckRunner');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { encodeCursor, decodeCursor } = require('../../common/pagination');
const AppError = require('../../common/AppError');

const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;

function classifyStatus(result) {
  if (!result.success) return 'unhealthy';
  if (!result.validationPassed) return 'unhealthy';
  if (result.responseTime > 3000) return 'degraded';
  return 'healthy';
}

// Runs one check for a monitor. When persist=true (scheduled/production runs), stores a HealthCheck,
// updates the monitor's rolling status, and publishes healthcheck.completed + hands off to the Incident Engine.
async function runHealthCheck(monitor, { persist = true, workerId = WORKER_ID, region } = {}) {
  eventBus.emit(EVENTS.HEALTHCHECK_STARTED, { organizationId: monitor.organizationId.toString(), monitorId: monitor._id.toString() });

  const result = await executeOnce(monitor);
  const status = classifyStatus(result);
  const chosenRegion = region || monitor.region?.[0] || 'us-east-1';

  const record = {
    organizationId: monitor.organizationId,
    monitorId: monitor._id,
    status,
    statusCode: result.statusCode,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    responseTime: result.responseTime,
    dnsLookup: result.dnsLookup,
    tcpConnect: result.tcpConnect,
    tlsHandshake: result.tlsHandshake,
    ttfb: result.ttfb,
    responseSize: result.responseSize || 0,
    validationPassed: result.validationPassed,
    failureReason: result.failureReason,
    region: chosenRegion,
    workerId,
  };

  if (!persist) return record;

  const healthCheck = await HealthCheck.create(record);

  await Monitor.updateOne({ _id: monitor._id }, { status });

  eventBus.emit(EVENTS.HEALTHCHECK_COMPLETED, {
    organizationId: monitor.organizationId.toString(),
    healthCheck,
  });

  // Hand off to the Incident Engine (SSD Request Flow: Save Log → Update Statistics → Incident Engine).
  const { handleHealthCheckResult } = require('../incidents/incidents.service');
  await handleHealthCheckResult(monitor, healthCheck);

  return healthCheck;
}

async function listHealthChecksForMonitor(organizationId, monitorId, query) {
  return listHealthChecks({ ...query, organizationId, monitorId });
}

// GET /health-checks — cursor-based pagination, the highest-volume collection (API Spec).
async function listHealthChecks({ organizationId, monitorId, cursor, limit = 100, status, region, dateFrom, dateTo, minResponseTime, maxResponseTime }) {
  const filter = { organizationId };
  if (monitorId) filter.monitorId = monitorId;
  if (status) filter.status = status;
  if (region) filter.region = region;
  if (dateFrom || dateTo) {
    filter.completedAt = {};
    if (dateFrom) filter.completedAt.$gte = new Date(dateFrom);
    if (dateTo) filter.completedAt.$lte = new Date(dateTo);
  }
  if (minResponseTime || maxResponseTime) {
    filter.responseTime = {};
    if (minResponseTime) filter.responseTime.$gte = Number(minResponseTime);
    if (maxResponseTime) filter.responseTime.$lte = Number(maxResponseTime);
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw AppError.badRequest('Invalid cursor.');
    filter.$or = [
      { completedAt: { $lt: decoded.completedAt } },
      { completedAt: decoded.completedAt, _id: { $lt: decoded.id } },
    ];
  }

  const capped = Math.min(parseInt(limit, 10) || 100, 500);
  const docs = await HealthCheck.find(filter).sort({ completedAt: -1, _id: -1 }).limit(capped + 1);

  const hasMore = docs.length > capped;
  const page = docs.slice(0, capped);
  const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

  return { data: page, meta: { nextCursor, hasMore } };
}

async function getHealthCheck(organizationId, id) {
  const doc = await HealthCheck.findOne({ _id: id, organizationId });
  if (!doc) throw AppError.notFound('Health check not found.');
  return doc;
}

module.exports = { runHealthCheck, listHealthChecksForMonitor, listHealthChecks, getHealthCheck, WORKER_ID };
