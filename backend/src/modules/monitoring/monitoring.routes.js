const express = require('express');
const controller = require('./monitoring.controller');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
router.use(authenticate, smartApiLimiter, requireRole('viewer'));

router.get('/', controller.list);
router.get('/:id', controller.getById);

module.exports = router;
