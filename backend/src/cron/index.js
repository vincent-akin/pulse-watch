const cron = require('node-cron');
const { connectMongo } = require('../config/db');
const logger = require('../config/logger');
const { runNightlySslDomainChecks } = require('./sslDomainNightly');
const { runRetentionCleanup } = require('./retentionCleanup');

async function main() {
  await connectMongo();

  // 02:00 UTC daily — SSL/domain checks (PRD §11: "checked nightly").
  cron.schedule('0 2 * * *', () => {
    runNightlySslDomainChecks().catch((err) => logger.error('SSL/Domain nightly job failed', { err: err.message }));
  });

  // 03:00 UTC daily — data retention cleanup (DDD Data Retention policy).
  cron.schedule('0 3 * * *', () => {
    runRetentionCleanup().catch((err) => logger.error('Retention cleanup job failed', { err: err.message }));
  });

  logger.info('Cron scheduler started (SSL/Domain nightly @02:00 UTC, retention cleanup @03:00 UTC).');
}

if (require.main === module) main().catch((err) => { logger.error('Cron process crashed', { err }); process.exit(1); });

module.exports = { main };
