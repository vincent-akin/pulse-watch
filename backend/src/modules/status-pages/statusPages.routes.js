const express = require('express');
const controller = require('./statusPages.controller');
const validation = require('./statusPages.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');
const { requireIfMatch } = require('../../middlewares/etag');

const router = express.Router();

// Fully authenticated collection routes.
router.get('/', authenticate, smartApiLimiter, requireRole('viewer'), controller.list);
router.post('/', authenticate, smartApiLimiter, requireRole('admin'), validate(validation.create), controller.create);
router.patch('/:id', authenticate, smartApiLimiter, requireRole('admin'), requireIfMatch('statusPages'), validate(validation.update), controller.update);
router.delete('/:id', authenticate, smartApiLimiter, requireRole('admin'), controller.remove);

// Shared path per API Spec: authenticated → private org-scoped lookup; anonymous → public slug view.
router.get('/:slug', controller.publicOrPrivateView);

module.exports = router;
