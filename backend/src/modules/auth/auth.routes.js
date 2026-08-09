const express = require('express');
const controller = require('./auth.controller');
const validation = require('./auth.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter, smartApiLimiter } = require('../../middlewares/rateLimit');

const router = express.Router();

// ── Public ───────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validate(validation.register), controller.register);
router.post('/login', loginLimiter, validate(validation.login), controller.login);
router.post('/forgot-password', passwordResetLimiter, validate(validation.forgotPassword), controller.forgotPassword);
router.post('/reset-password', validate(validation.resetPassword), controller.resetPassword);
router.post('/refresh-token', validate(validation.refreshToken), controller.refreshToken);
router.get('/verify-email', controller.verifyEmail);

router.get('/oauth/google', controller.googleStart);
router.get('/oauth/google/callback', controller.googleCallback);
router.get('/oauth/github', controller.githubStart);
router.get('/oauth/github/callback', controller.githubCallback);

// ── Protected ────────────────────────────────────────────────────────────
router.use(authenticate, smartApiLimiter);

router.post('/logout', controller.logout);
router.get('/me', controller.me);
router.patch('/profile', validate(validation.updateProfile), controller.updateProfile);
router.post('/change-password', validate(validation.changePassword), controller.changePassword);
router.get('/sessions', controller.listSessions);
router.delete('/sessions/:id', controller.revokeSession);

router.post('/mfa/enroll', controller.mfaEnroll);
router.post('/mfa/verify', controller.mfaVerify);
router.delete('/mfa', controller.mfaDisable);

module.exports = router;
