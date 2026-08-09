const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ms = require('../../common/ms');
const env = require('../../config/env');
const AppError = require('../../common/AppError');
const { User, RefreshToken, Session } = require('../../models');
const { sendEmail } = require('../../integrations/sendgrid');
const { recordAudit } = require('../audit/audit.service');

const ACCESS_TTL_SECONDS = ms(env.jwt.accessTtl) / 1000;
const REFRESH_TTL_MS = ms(env.jwt.refreshTtl);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user, sessionId) {
  return jwt.sign({ sub: user._id.toString(), sessionId }, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString('hex');
}

async function createSessionAndTokens(user, req) {
  const session = await Session.create({
    userId: user._id,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip,
  });

  const accessToken = signAccessToken(user, session._id.toString());
  const refreshTokenPlain = generateOpaqueToken();

  await RefreshToken.create({
    userId: user._id,
    hashedToken: hashToken(refreshTokenPlain),
    sessionId: session._id,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken: refreshTokenPlain, expiresIn: ACCESS_TTL_SECONDS, sessionId: session._id };
}

async function register({ email, password, firstName, lastName }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw AppError.conflict('An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = generateOpaqueToken();

  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    authProvider: 'password',
    emailVerificationToken,
  });

  const verifyUrl = `${env.appBaseUrl}/verify-email?token=${emailVerificationToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your PulseWatch account',
    html: `<p>Hi ${firstName},</p><p>Confirm your email to finish setting up PulseWatch:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return user;
}

async function verifyEmail(token) {
  const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken');
  if (!user) throw AppError.badRequest('Invalid or expired verification token.');
  user.emailVerified = true;
  user.emailVerificationToken = null;
  await user.save();
  return user;
}

async function login({ email, password }, req) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null }).select('+passwordHash');
  if (!user || !user.passwordHash) throw AppError.unauthorized('Invalid email or password.');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw AppError.unauthorized('Invalid email or password.');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await createSessionAndTokens(user, req);
  await recordAudit({ userId: user._id, action: 'auth.login', resource: 'user', resourceId: user._id, req });
  return { user, ...tokens };
}

// Refresh-token rotation with reuse detection (DDD refreshTokens design).
async function refresh(refreshTokenPlain, req) {
  const hashed = hashToken(refreshTokenPlain);
  const existing = await RefreshToken.findOne({ hashedToken: hashed });
  if (!existing) throw AppError.unauthorized('Invalid refresh token.');

  if (existing.revokedAt) {
    // Reuse of a revoked token — revoke the entire session chain.
    await RefreshToken.updateMany({ sessionId: existing.sessionId, revokedAt: null }, { revokedAt: new Date() });
    await Session.findByIdAndUpdate(existing.sessionId, { revokedAt: new Date() });
    throw AppError.unauthorized('Refresh token reuse detected. All sessions revoked for safety.');
  }

  if (existing.expiresAt < new Date()) throw AppError.unauthorized('Refresh token has expired.');

  const user = await User.findOne({ _id: existing.userId, deletedAt: null });
  if (!user) throw AppError.unauthorized('User no longer exists.');

  const newRefreshPlain = generateOpaqueToken();
  const newRefresh = await RefreshToken.create({
    userId: user._id,
    hashedToken: hashToken(newRefreshPlain),
    sessionId: existing.sessionId,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  existing.revokedAt = new Date();
  existing.replacedByTokenId = newRefresh._id;
  await existing.save();

  await Session.findByIdAndUpdate(existing.sessionId, { lastActiveAt: new Date() });

  const accessToken = signAccessToken(user, existing.sessionId.toString());
  return { accessToken, refreshToken: newRefreshPlain, expiresIn: ACCESS_TTL_SECONDS };
}

async function logout(sessionId) {
  await RefreshToken.updateMany({ sessionId, revokedAt: null }, { revokedAt: new Date() });
  await Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
}

async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) return; // Do not reveal account existence.

  const token = generateOpaqueToken();
  user.passwordResetToken = token;
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.appBaseUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your PulseWatch password',
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
  });
}

async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiresAt');

  if (!user) throw AppError.badRequest('Invalid or expired reset token.');

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Revoke all existing sessions on password reset for safety.
  await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
}

async function changePassword(user, { currentPassword, newPassword }) {
  const fullUser = await User.findById(user._id).select('+passwordHash');
  const matches = fullUser.passwordHash && (await bcrypt.compare(currentPassword, fullUser.passwordHash));
  if (!matches) throw AppError.unauthorized('Current password is incorrect.');

  fullUser.passwordHash = await bcrypt.hash(newPassword, 12);
  await fullUser.save();
}

// OAuth sign-in creates or links a User by verified email (DMBR rule).
async function findOrCreateOAuthUser(provider, profile) {
  if (!profile.email) throw AppError.badRequest('OAuth provider did not return an email address.');

  let user = await User.findOne({ 'oauthProviders.provider': provider, 'oauthProviders.providerId': profile.providerId });
  if (user) return user;

  user = await User.findOne({ email: profile.email.toLowerCase() });
  if (user) {
    user.oauthProviders.push({ provider, providerId: profile.providerId });
    if (!user.emailVerified && profile.emailVerified) user.emailVerified = true;
    await user.save();
    return user;
  }

  user = await User.create({
    email: profile.email.toLowerCase(),
    firstName: profile.firstName || 'User',
    lastName: profile.lastName || '',
    avatarUrl: profile.avatarUrl || null,
    emailVerified: !!profile.emailVerified,
    authProvider: 'oauth',
    oauthProviders: [{ provider, providerId: profile.providerId }],
  });
  return user;
}

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  findOrCreateOAuthUser,
  createSessionAndTokens,
};
