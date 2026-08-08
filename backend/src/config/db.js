const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection; // already connected — safe to call from multiple workers in one process
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return mongoose.connection;
}

module.exports = { connectMongo, mongoose };
