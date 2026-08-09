const express = require('express');
const controller = require('./apiKeys.controller');
const validation = require('./apiKeys.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
router.use(authenticate, smartApiLimiter, requireRole('admin'));

router.get('/', controller.list);
router.post('/', validate(validation.create), controller.create);
router.delete('/:id', controller.remove);
router.post('/:id/rotate', controller.rotate);

module.exports = router;
