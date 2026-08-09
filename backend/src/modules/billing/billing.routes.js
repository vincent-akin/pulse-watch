const express = require('express');
const controller = require('./billing.controller');
const validation = require('./billing.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();

// NOTE: /billing/webhook is mounted separately (with express.raw()) in app.js, BEFORE json parsing
// and BEFORE this authenticated router, since Stripe calls it directly without a user session.

router.use(authenticate, smartApiLimiter, requireRole('viewer'));
router.get('/plans', controller.listPlans);
router.get('/subscription', controller.getSubscription);
router.post('/checkout', requireRole('owner'), validate(validation.checkout), controller.checkout);
router.get('/invoices', controller.listInvoices);

module.exports = router;
