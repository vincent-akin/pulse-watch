const mongoose = require('mongoose');
const { Schema } = mongoose;

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hashedToken: { type: String, required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  replacedByTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
});

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ hashedToken: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-purge

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
