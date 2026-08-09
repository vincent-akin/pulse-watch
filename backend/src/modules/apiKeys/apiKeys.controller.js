const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./apiKeys.service');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

const create = asyncHandler(async (req, res) => {
  const key = await service.createApiKey(req.organizationId, req.body, req.user, req);
  return created(res, { message: 'API key created. Copy it now — it will not be shown again.', data: key });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listApiKeys(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteApiKey(req.organizationId, req.params.id, req.user, req);
  return noContent(res);
});

const rotate = asyncHandler(async (req, res) => {
  const key = await service.rotateApiKey(req.organizationId, req.params.id, req.user, req);
  return ok(res, { message: 'API key rotated. Copy the new key now — it will not be shown again.', data: key });
});

module.exports = { create, list, remove, rotate };
