const express = require('express');
const controller = require('./notifications.controller');
const validation = require('./notifications.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');
const { requireIfMatch } = require('../../middlewares/etag');

const channelsRouter = express.Router();
channelsRouter.use(authenticate, smartApiLimiter, requireRole('viewer'));
channelsRouter.get('/', controller.listChannels);
channelsRouter.post('/', requireRole('admin'), validate(validation.createChannel), controller.createChannel);
channelsRouter.patch('/:id', requireRole('admin'), requireIfMatch('notificationChannels'), validate(validation.updateChannel), controller.updateChannel);
channelsRouter.delete('/:id', requireRole('admin'), controller.removeChannel);
channelsRouter.post('/:id/test', requireRole('engineer'), controller.testChannel);

const notificationsRouter = express.Router();
notificationsRouter.use(authenticate, smartApiLimiter, requireRole('viewer'));
notificationsRouter.get('/', controller.listNotifications);
notificationsRouter.get('/:id', controller.getNotification);

module.exports = { channelsRouter, notificationsRouter };
