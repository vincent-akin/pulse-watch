const AppError = require('../../common/AppError');
const { Monitor, Subscription, Plan, HealthCheck, Incident } = require('../../models');
const { assertEtagMatches } = require('../../middlewares/etag');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { recordAudit } = require('../audit/audit.service');
const { getQueue, QUEUE_NAMES } = require('../../queues');

// Monitor URL must be unique within an organization (DMBR + DDD application-layer rule).
async function assertUniqueUrl(organizationId, url, excludeId) {
  const query = { organizationId, url, deletedAt: null };
  if (excludeId) query._id = { $ne: excludeId };
  const clashing = await Monitor.findOne(query);
  if (clashing) throw AppError.conflict('A monitor with this URL already exists in this organization.');
}

// Interval must respect the subscription plan (DDD validation rule).
async function assertIntervalAllowed(organizationId, intervalSeconds) {
  const sub = await Subscription.findOne({ organizationId });
  const plan = sub ? await Plan.findById(sub.planId) : await Plan.findOne({ key: 'free' });
  if (plan && intervalSeconds < plan.limits.checkIntervalSeconds) {
    throw AppError.forbidden(`Your plan (${plan.name}) requires a check interval of at least ${plan.limits.checkIntervalSeconds}s.`);
  }
}

async function assertMonitorQuota(organizationId) {
  const sub = await Subscription.findOne({ organizationId });
  const plan = sub ? await Plan.findById(sub.planId) : await Plan.findOne({ key: 'free' });
  if (!plan || plan.limits.monitors === -1) return;
  const count = await Monitor.countDocuments({ organizationId, deletedAt: null });
  if (count >= plan.limits.monitors) {
    throw AppError.forbidden(`Your plan (${plan.name}) allows up to ${plan.limits.monitors} monitors.`);
  }
}

// Multi-region Monitoring: each region configured on a monitor gets its own independent
// repeatable job and its own health-check history, rather than only ever checking from
// monitor.region[0]. This is genuinely "checked from N places", not decorative — comparing
// region A vs region B tells you whether an outage is global or localized to one network path.
function scheduleMonitor(monitor) {
  if (!monitor.enabled || monitor.lifecycleStatus !== 'active') return unscheduleMonitor(monitor._id);

  const queue = getQueue(QUEUE_NAMES.HEALTH_CHECK);
  const regions = monitor.region?.length ? monitor.region : ['us-east-1'];

  return Promise.all(regions.map((region) => queue.add(
    'run-check',
    { monitorId: monitor._id.toString(), region },
    {
      jobId: `monitor:${monitor._id}:${region}`,
      repeat: { every: monitor.interval * 1000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    }
  )));
}

async function unscheduleMonitor(monitorId) {
  const queue = getQueue(QUEUE_NAMES.HEALTH_CHECK);
  const repeatableJobs = await queue.getRepeatableJobs();
  const prefix = `monitor:${monitorId}:`;
  const matches = repeatableJobs.filter((j) => j.id === `monitor:${monitorId}` || j.id?.startsWith(prefix));
  await Promise.all(matches.map((j) => queue.removeRepeatableByKey(j.key)));
}

// Re-schedules a monitor's jobs to match its current region list — called whenever `region`
// changes on update, since adding/removing a region means adding/removing a repeatable job.
async function rescheduleMonitor(monitor) {
  await unscheduleMonitor(monitor._id);
  await scheduleMonitor(monitor);
}

async function createMonitor(organizationId, payload, user, req) {
  await assertMonitorQuota(organizationId);
  await assertUniqueUrl(organizationId, payload.url);
  await assertIntervalAllowed(organizationId, payload.interval);

  const monitor = await Monitor.create({
    ...payload,
    organizationId,
    createdBy: user._id,
    lifecycleStatus: payload.enabled ? 'active' : 'draft',
  });

  await scheduleMonitor(monitor);
  await recordAudit({ organizationId, userId: user._id, action: 'monitor.created', resource: 'monitor', resourceId: monitor._id, req });
  eventBus.emit(EVENTS.MONITOR_CREATED, { organizationId, monitor });

  return monitor;
}

async function listMonitors(organizationId, { page, limit, skip, sort, filters }) {
  const query = { organizationId, deletedAt: null, ...filters };
  const [data, total] = await Promise.all([
    Monitor.find(query).sort(sort).skip(skip).limit(limit),
    Monitor.countDocuments(query),
  ]);
  return { data, total };
}

async function getMonitor(organizationId, id) {
  const monitor = await Monitor.findOne({ _id: id, organizationId, deletedAt: null });
  if (!monitor) throw AppError.notFound('Monitor not found.');
  return monitor;
}

async function updateMonitor(organizationId, id, patch, ifMatch, user, req) {
  const monitor = await getMonitor(organizationId, id);
  assertEtagMatches(monitor, ifMatch);

  if (patch.url && patch.url !== monitor.url) await assertUniqueUrl(organizationId, patch.url, id);
  if (patch.interval) await assertIntervalAllowed(organizationId, patch.interval);

  Object.assign(monitor, patch);
  if (patch.enabled !== undefined) monitor.lifecycleStatus = patch.enabled ? 'active' : 'paused';
  await monitor.save();

  await rescheduleMonitor(monitor);
  await recordAudit({ organizationId, userId: user._id, action: 'monitor.updated', resource: 'monitor', resourceId: monitor._id, req });
  eventBus.emit(EVENTS.MONITOR_UPDATED, { organizationId, monitor });

  return monitor;
}

async function deleteMonitor(organizationId, id, user, req) {
  const monitor = await getMonitor(organizationId, id);
  // Archived monitors cannot be restored except by support (DMBR Monitor Lifecycle) —
  // deletion here means archiving via soft delete, consistent with global soft-delete principle.
  monitor.lifecycleStatus = 'archived';
  monitor.enabled = false;
  await monitor.softDelete();
  await unscheduleMonitor(monitor._id);

  await recordAudit({ organizationId, userId: user._id, action: 'monitor.deleted', resource: 'monitor', resourceId: monitor._id, req });
  eventBus.emit(EVENTS.MONITOR_DELETED, { organizationId, monitorId: monitor._id.toString() });
}

async function pauseMonitor(organizationId, id, user, req) {
  const monitor = await getMonitor(organizationId, id);
  monitor.enabled = false;
  monitor.lifecycleStatus = 'paused';
  await monitor.save();
  await unscheduleMonitor(monitor._id);
  await recordAudit({ organizationId, userId: user._id, action: 'monitor.paused', resource: 'monitor', resourceId: monitor._id, req });
  return monitor;
}

async function resumeMonitor(organizationId, id, user, req) {
  const monitor = await getMonitor(organizationId, id);
  monitor.enabled = true;
  monitor.lifecycleStatus = 'active';
  await monitor.save();
  await rescheduleMonitor(monitor);
  await recordAudit({ organizationId, userId: user._id, action: 'monitor.resumed', resource: 'monitor', resourceId: monitor._id, req });
  return monitor;
}

async function testMonitor(organizationId, id) {
  const monitor = await getMonitor(organizationId, id);
  const { runHealthCheck } = require('../monitoring/monitoring.service');
  const regions = monitor.region?.length ? monitor.region : ['us-east-1'];

  // Ad-hoc test run — executed inline for every configured region, NOT persisted as HealthCheck
  // records, NOT counted toward scheduled history.
  const results = await Promise.all(
    regions.map(async (region) => ({
      region,
      ...(await runHealthCheck(monitor, { persist: false, workerId: 'adhoc-test', region })),
    }))
  );
  return results;
}

// Multi-region status grid — the latest independent check result per configured region, so you
// can see "London is fine, Frankfurt is failing" at a glance instead of one blended status.
async function getMonitorRegionStatus(organizationId, id) {
  const monitor = await getMonitor(organizationId, id);
  const regions = monitor.region?.length ? monitor.region : ['us-east-1'];
  const { HealthCheck } = require('../../models');

  const results = await Promise.all(
    regions.map(async (region) => {
      const latest = await HealthCheck.findOne({ monitorId: monitor._id, region }).sort({ completedAt: -1 });
      return {
        region,
        status: latest?.status || 'unknown',
        responseTime: latest?.responseTime ?? null,
        statusCode: latest?.statusCode ?? null,
        lastCheckedAt: latest?.completedAt ?? null,
      };
    })
  );
  return results;
}

async function listMonitorHealthChecks(organizationId, monitorId, params) {
  await getMonitor(organizationId, monitorId); // 404 if not found/owned
  const { listHealthChecksForMonitor } = require('../monitoring/monitoring.service');
  return listHealthChecksForMonitor(organizationId, monitorId, params);
}

async function listMonitorIncidents(organizationId, monitorId, params) {
  await getMonitor(organizationId, monitorId);
  const query = { organizationId, monitorId, deletedAt: null };
  const [data, total] = await Promise.all([
    Incident.find(query).sort({ startedAt: -1 }).skip(params.skip).limit(params.limit),
    Incident.countDocuments(query),
  ]);
  return { data, total };
}

module.exports = {
  createMonitor, listMonitors, getMonitor, updateMonitor, deleteMonitor,
  pauseMonitor, resumeMonitor, testMonitor, listMonitorHealthChecks, listMonitorIncidents,
  scheduleMonitor, unscheduleMonitor, rescheduleMonitor, getMonitorRegionStatus,
};
