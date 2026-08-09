const express = require('express');
const controller = require('./analytics.controller');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
router.use(authenticate, smartApiLimiter, requireRole('viewer'));

router.get('/overview', controller.overview);
router.get('/uptime', controller.uptime);
router.get('/latency', controller.latency);
router.get('/incidents', controller.incidents);

module.exports = router;
