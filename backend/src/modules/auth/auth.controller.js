const asyncHandler = require('../../common/asyncHandler');
const { ok, created } = require('../../common/response');
const AppError = require('../../common/AppError');
const authService = require('./auth.service');
const oauth = require('../../integrations/oauth');
const env = require('../../config/env');
const crypto = require('crypto');
const { Session, RefreshToken } = require('../../models');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return created(res, {
    message: 'Registration successful. Check your email to verify your account.',
    data: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  return ok(res, { message: 'Email verified successfully.' });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, expiresIn } = await authService.login(req.body, req);
  return ok(res, {
    message: 'Login successful.',
    data: {
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
      expiresIn,
    },
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken, req);
  return ok(res, { message: 'Token refreshed.', data: tokens });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.sessionId);
  return ok(res, { message: 'Logged out successfully.' });
});

const me = asyncHandler(async (req, res) => {
  const u = req.user;
  return ok(res, {
    data: {
      id: u._id, email: u.email, firstName: u.firstName, lastName: u.lastName,
      avatarUrl: u.avatarUrl, emailVerified: u.emailVerified, mfaEnabled: u.mfaEnabled,
      authProvider: u.authProvider, lastLoginAt: u.lastLoginAt,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  return ok(res, { message: 'Profile updated.', data: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user, req.body);
  return ok(res, { message: 'Password changed successfully.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return ok(res, { message: 'Password reset successfully.' });
});

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id, revokedAt: null }).sort({ lastActiveAt: -1 });
  return ok(res, { data: sessions });
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
  if (!session) throw AppError.notFound('Session not found.');
  session.revokedAt = new Date();
  await session.save();
  await RefreshToken.updateMany({ sessionId: session._id, revokedAt: null }, { revokedAt: new Date() });
  return ok(res, { message: 'Session revoked.' });
});

// ── OAuth ──────────────────────────────────────────────────────────────────
const oauthState = new Map(); // state -> expiry (swap for Redis in a multi-instance deployment)

function makeState() {
  const state = crypto.randomBytes(16).toString('hex');
  oauthState.set(state, Date.now() + 10 * 60 * 1000);
  return state;
}
function consumeState(state) {
  const expiry = oauthState.get(state);
  oauthState.delete(state);
  return expiry && expiry > Date.now();
}

const googleStart = asyncHandler(async (req, res) => {
  res.redirect(oauth.buildGoogleAuthUrl(makeState()));
});

const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  if (!consumeState(state)) throw AppError.badRequest('Invalid or expired OAuth state.');
  const profile = await oauth.exchangeGoogleCode(code);
  const user = await authService.findOrCreateOAuthUser('google', profile);
  const tokens = await authService.createSessionAndTokens(user, req);
  const redirectUrl = new URL(env.oauth.successRedirect);
  redirectUrl.searchParams.set('accessToken', tokens.accessToken);
  redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
  res.redirect(redirectUrl.toString());
});

const githubStart = asyncHandler(async (req, res) => {
  res.redirect(oauth.buildGithubAuthUrl(makeState()));
});

const githubCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  if (!consumeState(state)) throw AppError.badRequest('Invalid or expired OAuth state.');
  const profile = await oauth.exchangeGithubCode(code);
  const user = await authService.findOrCreateOAuthUser('github', profile);
  const tokens = await authService.createSessionAndTokens(user, req);
  const redirectUrl = new URL(env.oauth.successRedirect);
  redirectUrl.searchParams.set('accessToken', tokens.accessToken);
  redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
  res.redirect(redirectUrl.toString());
});

// MFA (TOTP) is explicitly post-MVP per PRD §11 / API Spec Auth Module. Routes are wired now
// for forward-compatibility but return 501 until the feature ships.
const mfaNotImplemented = asyncHandler(async (req, res) => {
  throw new AppError('MFA is not yet available — planned for a post-MVP release.', 501);
});

module.exports = {
  register, verifyEmail, login, refreshToken, logout, me, updateProfile, changePassword,
  forgotPassword, resetPassword, listSessions, revokeSession,
  googleStart, googleCallback, githubStart, githubCallback,
  mfaEnroll: mfaNotImplemented, mfaVerify: mfaNotImplemented, mfaDisable: mfaNotImplemented,
};
