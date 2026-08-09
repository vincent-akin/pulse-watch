const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AppError = require('../../common/AppError');
const { ApiKey } = require('../../models');
const { recordAudit } = require('../audit/audit.service');

function generateRawKey() {
  // "pw_live_" prefix lets authenticate() recognize API keys without a JWT decode attempt.
  const secret = crypto.randomBytes(24).toString('hex');
  return `pw_live_${secret}`;
}

async function createApiKey(organizationId, { name, expiresAt }, user, req) {
  const rawKey = generateRawKey();
  const hashedKey = await bcrypt.hash(rawKey, 12);

  const apiKey = await ApiKey.create({
    organizationId,
    name,
    hashedKey,
    keyPrefix: rawKey.slice(0, 12),
    createdBy: user._id,
    expiresAt: expiresAt || null,
  });

  await recordAudit({ organizationId, userId: user._id, action: 'apiKey.created', resource: 'apiKey', resourceId: apiKey._id, req });

  // The raw key is only ever returned once, at creation time — never stored or retrievable again.
  return { ...apiKey.toObject(), hashedKey: undefined, rawKey };
}

async function listApiKeys(organizationId, { skip, limit }) {
  const filter = { organizationId, deletedAt: null };
  const [data, total] = await Promise.all([
    ApiKey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ApiKey.countDocuments(filter),
  ]);
  return { data, total };
}

async function deleteApiKey(organizationId, id, user, req) {
  const key = await ApiKey.findOne({ _id: id, organizationId, deletedAt: null });
  if (!key) throw AppError.notFound('API key not found.');
  await key.softDelete();
  await recordAudit({ organizationId, userId: user._id, action: 'apiKey.deleted', resource: 'apiKey', resourceId: key._id, req });
}

async function rotateApiKey(organizationId, id, user, req) {
  const key = await ApiKey.findOne({ _id: id, organizationId, deletedAt: null });
  if (!key) throw AppError.notFound('API key not found.');

  const rawKey = generateRawKey();
  key.hashedKey = await bcrypt.hash(rawKey, 12);
  key.keyPrefix = rawKey.slice(0, 12);
  await key.save();

  await recordAudit({ organizationId, userId: user._id, action: 'apiKey.rotated', resource: 'apiKey', resourceId: key._id, req });
  return { ...key.toObject(), hashedKey: undefined, rawKey };
}

module.exports = { createApiKey, listApiKeys, deleteApiKey, rotateApiKey };
