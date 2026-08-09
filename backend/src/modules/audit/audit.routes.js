const express = require('express');
const controller = require('./audit.controller');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
// Read-only — audit logs cannot be created, modified, or deleted via the API (API Spec).
router.use(authenticate, smartApiLimiter, requireRole('admin'));
router.get('/', controller.list);
router.get('/:id', controller.getById);

module.exports = router;
