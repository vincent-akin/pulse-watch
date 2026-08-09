const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

// Named queues per SSD architecture diagram: Health / Notification / Analytics / SSL-Domain / AI workers.
const QUEUE_NAMES = {
  HEALTH_CHECK: 'health-check',
  NOTIFICATION: 'notification',
  SSL_DOMAIN: 'ssl-domain',
  AI_SUMMARY: 'ai-summary',
  ANALYTICS: 'analytics',
  RETENTION_CLEANUP: 'retention-cleanup',
};

const connection = getRedisConnection();
const queues = {};

function getQueue(name) {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection });
  }
  return queues[name];
}

module.exports = { QUEUE_NAMES, getQueue, connection };
