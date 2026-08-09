const express = require('express');
const controller = require('./monitors.controller');
const validation = require('./monitors.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');
const { requireIfMatch } = require('../../middlewares/etag');
const { idempotent } = require('../../middlewares/idempotency');

const router = express.Router();
router.use(authenticate, smartApiLimiter, requireRole('viewer'));

router.get('/', controller.list);
router.post('/', requireRole('engineer'), idempotent(), validate(validation.create), controller.create);

router.get('/:id', controller.getById);
router.patch('/:id', requireRole('engineer'), requireIfMatch('monitors'), validate(validation.update), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

router.post('/:id/pause', requireRole('engineer'), controller.pause);
router.post('/:id/resume', requireRole('engineer'), controller.resume);
router.post('/:id/test', requireRole('engineer'), controller.test);
router.get('/:id/health-checks', controller.healthChecks);
router.get('/:id/incidents', controller.incidents);
router.get('/:id/regions', controller.regions);

module.exports = router;
