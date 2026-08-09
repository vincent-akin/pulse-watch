const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../common/AppError');
const asyncHandler = require('../common/asyncHandler');
const { User, ApiKey } = require('../models');
const bcrypt = require('bcryptjs');

// Verifies a JWT access token OR a programmatic API key (Bearer pw_live_...).
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Missing or malformed Authorization header.');
  }

  // API keys are prefixed so we can distinguish them from JWTs without a decode attempt.
  if (token.startsWith('pw_')) {
    return authenticateApiKey(token, req, next);
  }

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findOne({ _id: payload.sub, deletedAt: null });
    if (!user) throw AppError.unauthorized('User no longer exists.');

    req.user = user;
    req.authType = 'jwt';
    req.sessionId = payload.sessionId;
    req.organizationId = req.headers['x-organization-id'] || payload.organizationId || null;
    return next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired access token.');
  }
});

async function authenticateApiKey(token, req, next) {
  // hashedKey lookup requires scanning by prefix then bcrypt.compare (bcrypt hashes aren't searchable directly).
  const prefix = token.slice(0, 12);
  const candidates = await ApiKey.find({ keyPrefix: prefix, deletedAt: null }).select('+hashedKey');

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const matches = await bcrypt.compare(token, candidate.hashedKey);
    if (matches) {
      if (candidate.expiresAt && candidate.expiresAt < new Date()) {
        throw AppError.unauthorized('API key has expired.');
      }
      candidate.lastUsedAt = new Date();
      await candidate.save();

      req.authType = 'apiKey';
      req.apiKey = candidate;
      req.organizationId = candidate.organizationId.toString();
      req.user = null; // API keys act at the organization level, not as a specific user
      return next();
    }
  }
  throw AppError.unauthorized('Invalid API key.');
}

module.exports = { authenticate };
