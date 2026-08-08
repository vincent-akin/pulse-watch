const { HealthCheck, Notification, AuditLog, Organization, Subscription, Plan } = require('../models');
const logger = require('../config/logger');

// Health checks: Plan-based retention (30 days–Unlimited). Notifications: 1 year. Audit Logs: 2 years.
// Incidents are permanent and are intentionally NOT purged here (DDD Data Retention table).
async function runRetentionCleanup() {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);

  const notifResult = await Notification.deleteMany({ createdAt: { $lt: oneYearAgo } });
  const auditResult = await AuditLog.deleteMany({ createdAt: { $lt: twoYearsAgo } });

  const organizations = await Organization.find({ deletedAt: null });
  let healthChecksPurged = 0;

  for (const org of organizations) {
    // eslint-disable-next-line no-await-in-loop
    const sub = await Subscription.findOne({ organizationId: org._id });
    // eslint-disable-next-line no-await-in-loop
    const plan = sub ? await Plan.findById(sub.planId) : await Plan.findOne({ key: 'free' });
    if (!plan || plan.limits.dataRetentionDays === -1) continue; // Unlimited plan — skip purge

    const cutoff = new Date(Date.now() - plan.limits.dataRetentionDays * 24 * 60 * 60 * 1000);
    // eslint-disable-next-line no-await-in-loop
    const result = await HealthCheck.deleteMany({ organizationId: org._id, completedAt: { $lt: cutoff } });
    healthChecksPurged += result.deletedCount;
  }

  logger.info('Retention cleanup complete', {
    notificationsPurged: notifResult.deletedCount,
    auditLogsPurged: auditResult.deletedCount,
    healthChecksPurged,
  });
}

module.exports = { runRetentionCleanup };
