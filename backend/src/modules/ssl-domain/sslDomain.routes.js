const express = require('express');
const controller = require('./sslDomain.controller');
const validation = require('./sslDomain.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');

const sslRouter = express.Router();
sslRouter.use(authenticate, smartApiLimiter, requireRole('viewer'));
sslRouter.get('/', controller.listSsl);
sslRouter.get('/:id', controller.getSslById);
sslRouter.post('/:id/recheck', requireRole('engineer'), controller.recheckSsl);

const domainsRouter = express.Router();
domainsRouter.use(authenticate, smartApiLimiter, requireRole('viewer'));
domainsRouter.get('/', controller.listDomains);
domainsRouter.post('/', requireRole('admin'), validate(validation.createDomain), controller.createDomain);
domainsRouter.get('/:id', controller.getDomainById);
domainsRouter.delete('/:id', requireRole('admin'), controller.removeDomain);
domainsRouter.post('/:id/recheck', requireRole('engineer'), controller.recheckDomain);

module.exports = { sslRouter, domainsRouter };
