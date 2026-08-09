const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

sessionSchema.index({ userId: 1 });

module.exports = mongoose.model('Session', sessionSchema);
