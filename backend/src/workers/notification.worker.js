const { Worker } = require('bullmq');
const { connectMongo } = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');
const { Incident, Monitor, SslCertificate, Domain } = require('../models');
const { deliverEventNotifications } = require('../modules/notifications/notifications.service');

async function main() {
  await connectMongo();
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      switch (job.name) {
        case 'incident.opened':
        case 'incident.closed': {
          const incident = await Incident.findById(job.data.incidentId);
          if (!incident) return { skipped: true };
          const monitor = await Monitor.findById(incident.monitorId);
          return deliverEventNotifications(job.name, { incident, monitor, organizationId: incident.organizationId });
        }
        case 'sslcertificate.expiring': {
          const sslCertificate = await SslCertificate.findById(job.data.sslCertificateId);
          if (!sslCertificate) return { skipped: true };
          return deliverEventNotifications('sslcertificate.expiring', { sslCertificate, organizationId: sslCertificate.organizationId });
        }
        case 'domain.expiring': {
          const domain = await Domain.findById(job.data.domainId);
          if (!domain) return { skipped: true };
          return deliverEventNotifications('domain.expiring', { domain, organizationId: domain.organizationId });
        }
        default:
          logger.warn('Unknown notification job', { name: job.name });
          return { skipped: true };
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on('failed', (job, err) => logger.error('notification job failed', { jobId: job?.id, err: err.message }));
  logger.info('Notification worker started.');
}

if (require.main === module) main().catch((err) => { logger.error('Worker crashed', { err }); process.exit(1); });

module.exports = { main };
