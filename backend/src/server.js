const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectMongo } = require('./config/db');
const { initWebsocket } = require('./events/websocket');

async function start() {
  await connectMongo();

  const server = http.createServer(app);
  initWebsocket(server);

  server.listen(env.port, () => {
    logger.info(`PulseWatch API listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server', { err: err.message, stack: err.stack });
  process.exit(1);
});
