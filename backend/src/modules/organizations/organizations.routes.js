const express = require('express');
const controller = require('./organizations.controller');
const validation = require('./organizations.validation');
const { validate } = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { smartApiLimiter } = require('../../middlewares/rateLimit');
const { requireRole } = require('../../middlewares/rbac');
const bindOrgParam = require('../../middlewares/bindOrgParam');
const { requireIfMatch } = require('../../middlewares/etag');
const { idempotent } = require('../../middlewares/idempotency');

const router = express.Router();
router.use(authenticate, smartApiLimiter);

router.get('/', controller.list);
router.post('/', idempotent(), validate(validation.create), controller.create);

router.get('/:id', bindOrgParam('id'), requireRole('viewer'), controller.getById);
router.patch('/:id', bindOrgParam('id'), requireRole('admin'), requireIfMatch('organizations'), validate(validation.update), controller.update);
router.delete('/:id', bindOrgParam('id'), requireRole('owner'), controller.remove);

router.get('/:id/members', bindOrgParam('id'), requireRole('viewer'), controller.listMembers);
router.post('/:id/invitations', bindOrgParam('id'), requireRole('admin'), idempotent(), validate(validation.invite), controller.inviteMember);
router.patch('/:id/members/:memberId', bindOrgParam('id'), requireRole('admin'), validate(validation.updateMember), controller.updateMember);
router.delete('/:id/members/:memberId', bindOrgParam('id'), requireRole('admin'), controller.removeMember);

module.exports = router;
