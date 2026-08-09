const crypto = require('crypto');
const { getRedisConnection } = require('../config/redis');
const AppError = require('../common/AppError');

const TTL_SECONDS = 60 * 60 * 24; // 24h, per API Spec "Idempotency"

// Required for Create Monitor, Create Organization, Invite Member (retry-safe operations).
// Clients send `Idempotency-Key: <UUID>`; the server replays the stored response for repeats.
function idempotent() {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next(); // optional at the transport layer; callers SHOULD send it for these ops

    const redis = getRedisConnection();
    const scopeKey = `idem:${req.organizationId || 'anon'}:${req.method}:${req.baseUrl}${req.path}:${key}`;
    const bodyHash = crypto.createHash('sha1').update(JSON.stringify(req.body || {})).digest('hex');

    const existingRaw = await redis.get(scopeKey);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (existing.bodyHash !== bodyHash) {
        return next(AppError.conflict('Idempotency-Key reused with a different request body.'));
      }
      return res.status(existing.status).json(existing.body);
    }

    // Capture the outgoing response so it can be replayed on retry.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) {
        redis.set(scopeKey, JSON.stringify({ status: res.statusCode, body, bodyHash }), 'EX', TTL_SECONDS).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { idempotent };
