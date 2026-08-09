const { Worker } = require('bullmq');
const { connectMongo } = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');
const { recheckSslCertificate, recheckDomain } = require('../modules/ssl-domain/sslDomain.service');

async function main() {
  await connectMongo();
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.SSL_DOMAIN,
    async (job) => {
      if (job.name === 'recheck-ssl') return recheckSslCertificate(job.data.sslCertificateId);
      if (job.name === 'recheck-domain') return recheckDomain(job.data.domainId);
      return { skipped: true };
    },
    { connection, concurrency: 10 }
  );

  worker.on('failed', (job, err) => logger.error('ssl-domain job failed', { jobId: job?.id, err: err.message }));
  logger.info('SSL/Domain worker started.');
}

if (require.main === module) main().catch((err) => { logger.error('Worker crashed', { err }); process.exit(1); });

module.exports = { main };
