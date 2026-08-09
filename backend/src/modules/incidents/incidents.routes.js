const express = require('express');
const controller = require('./incidents.controller');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
router.use(authenticate, smartApiLimiter, requireRole('viewer'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/:id/acknowledge', requireRole('engineer'), controller.acknowledge);
router.post('/:id/resolve', requireRole('engineer'), controller.resolve);
router.get('/:id/summary', controller.summary);
router.get('/:id/timeline', controller.timeline);

module.exports = router;
