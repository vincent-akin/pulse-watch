const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./notifications.service');
const { setEtagHeader } = require('../../middlewares/etag');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

// Channels
const createChannel = asyncHandler(async (req, res) => {
  const channel = await service.createChannel(req.organizationId, req.body, req.user, req);
  setEtagHeader(res, channel);
  return created(res, { message: 'Notification channel created.', data: channel });
});

const listChannels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listChannels(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const updateChannel = asyncHandler(async (req, res) => {
  const channel = await service.updateChannel(req.organizationId, req.params.id, req.body, req._ifMatch, req.user, req);
  setEtagHeader(res, channel);
  return ok(res, { message: 'Notification channel updated.', data: channel });
});

const removeChannel = asyncHandler(async (req, res) => {
  await service.deleteChannel(req.organizationId, req.params.id, req.user, req);
  return noContent(res);
});

const testChannel = asyncHandler(async (req, res) => {
  await service.testChannel(req.organizationId, req.params.id);
  return ok(res, { message: 'Test notification sent.' });
});

// Notifications (history)
const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listNotifications(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const getNotification = asyncHandler(async (req, res) => {
  const doc = await service.getNotification(req.organizationId, req.params.id);
  return ok(res, { data: doc });
});

module.exports = { createChannel, listChannels, updateChannel, removeChannel, testChannel, listNotifications, getNotification };
