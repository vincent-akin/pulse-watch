const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { Schema } = mongoose;

const oauthProviderSchema = new Schema({
  provider: { type: String, enum: ['google', 'github'], required: true },
  providerId: { type: String, required: true },
}, { _id: false });

const userSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null }, // null for pure OAuth accounts
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  avatarUrl: { type: String, default: null },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null, select: false },
  passwordResetToken: { type: String, default: null, select: false },
  passwordResetExpiresAt: { type: Date, default: null, select: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null, select: false }, // post-MVP
  authProvider: { type: String, enum: ['password', 'oauth'], default: 'password' },
  oauthProviders: { type: [oauthProviderSchema], default: [] },
  lastLoginAt: { type: Date, default: null },
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'oauthProviders.providerId': 1 });

softDeletable(userSchema);

module.exports = mongoose.model('User', userSchema);
