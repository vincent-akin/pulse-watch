const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisConnection } = require('../config/redis');
const AppError = require('../common/AppError');

function makeStore(prefix) {
  const client = getRedisConnection();
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => client.call(...args),
  });
}

function buildLimiter({ windowMs, max, keyer, prefix }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(prefix),
    keyGenerator: keyer,
    handler: (req, res, next) => next(AppError.tooManyRequests('Too many requests. Please try again later.')),
  });
}

// Per API Specification "Rate Limiting" table.
const loginLimiter = buildLimiter({
  windowMs: 60 * 1000, max: 5, prefix: 'login',
  keyer: (req) => req.ip,
});

const registerLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000, max: 3, prefix: 'register',
  keyer: (req) => req.ip,
});

const passwordResetLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000, max: 5, prefix: 'pwreset',
  keyer: (req) => (req.body && req.body.email) || req.ip,
});

const generalApiLimiter = buildLimiter({
  windowMs: 60 * 1000, max: 120, prefix: 'general',
  keyer: (req) => (req.user ? req.user._id.toString() : req.ip),
});

const apiKeyLimiter = buildLimiter({
  windowMs: 60 * 1000, max: 600, prefix: 'apikey',
  keyer: (req) => (req.apiKey ? req.apiKey._id.toString() : req.ip),
});

// Applied after `authenticate` on protected routes — 120/min/user for JWT callers, 600/min/key for API keys.
function smartApiLimiter(req, res, next) {
  if (req.authType === 'apiKey') return apiKeyLimiter(req, res, next);
  return generalApiLimiter(req, res, next);
}

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  generalApiLimiter,
  apiKeyLimiter,
  smartApiLimiter,
};
