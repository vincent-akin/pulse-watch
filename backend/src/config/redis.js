const IORedis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

// Shared connection factory. BullMQ requires maxRetriesPerRequest: null.
let sharedConnection;

function getRedisConnection() {
  if (!sharedConnection) {
    sharedConnection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    sharedConnection.on('error', (err) => logger.error('Redis error', { err: err.message }));
    sharedConnection.on('connect', () => logger.info('Redis connected'));
  }
  return sharedConnection;
}

module.exports = { getRedisConnection };
