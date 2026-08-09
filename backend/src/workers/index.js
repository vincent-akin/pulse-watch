// Runs every worker in a single process — appropriate for the MVP modular monolith (SSD §12).
// Each worker can later be extracted into its own deployable process/service with no code changes,
// since they're already separated by file and queue.
const logger = require('../config/logger');

Promise.all([
  require('./healthCheck.worker').main(),
  require('./notification.worker').main(),
  require('./sslDomain.worker').main(),
  require('./ai.worker').main(),
  require('./analytics.worker').main(),
]).catch((err) => {
  logger.error('Failed to start workers', { err: err.message });
  process.exit(1);
});
