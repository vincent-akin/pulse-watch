const { Worker } = require('bullmq');
const { connectMongo } = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');
const { Monitor, HealthCheck, UsageMetric } = require('../models');

// Rolls up per-organization usage into `usageMetrics` (DDD) so plan-limit checks avoid scanning
// monitors/healthChecks directly. Scheduled nightly via cron (see src/cron).
async function rollupUsage(organizationId) {
  const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [monitorsUsed, healthChecksRun] = await Promise.all([
    Monitor.countDocuments({ organizationId, deletedAt: null }),
    HealthCheck.countDocuments({ organizationId, completedAt: { $gte: new Date(`${period}-01`) } }),
  ]);

  await UsageMetric.findOneAndUpdate(
    { organizationId, period },
    { $set: { monitorsUsed, healthChecksRun } },
    { upsert: true }
  );
}

async function main() {
  await connectMongo();
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      if (job.name === 'rollup-usage') return rollupUsage(job.data.organizationId);
      return { skipped: true };
    },
    { connection, concurrency: 5 }
  );

  worker.on('failed', (job, err) => logger.error('analytics job failed', { jobId: job?.id, err: err.message }));
  logger.info('Analytics worker started.');
}

if (require.main === module) main().catch((err) => { logger.error('Worker crashed', { err }); process.exit(1); });

module.exports = { main, rollupUsage };
