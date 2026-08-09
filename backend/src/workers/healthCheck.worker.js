const { Worker } = require('bullmq');
const { connectMongo } = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');
const { Monitor } = require('../models');
const { runHealthCheck } = require('../modules/monitoring/monitoring.service');

async function main() {
  await connectMongo();
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.HEALTH_CHECK,
    async (job) => {
      const monitor = await Monitor.findOne({ _id: job.data.monitorId, deletedAt: null, enabled: true });
      if (!monitor) return { skipped: true, reason: 'Monitor not found or disabled.' };
      // job.data.region ties this run to one specific configured region (multi-region monitoring) —
      // each region has its own repeatable job, so this worker never has to guess which one to use.
      return runHealthCheck(monitor, { persist: true, region: job.data.region });
    },
    { connection, concurrency: 20 }
  );

  worker.on('completed', (job) => logger.info('health-check job completed', { jobId: job.id, monitorId: job.data.monitorId }));
  worker.on('failed', (job, err) => logger.error('health-check job failed', { jobId: job?.id, err: err.message }));

  logger.info('Health check worker started.');
}

if (require.main === module) main().catch((err) => { logger.error('Worker crashed', { err }); process.exit(1); });

module.exports = { main };
