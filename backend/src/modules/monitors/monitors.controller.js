const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./monitors.service');
const { setEtagHeader } = require('../../middlewares/etag');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');
const { parseSort } = require('../../common/sort');

function buildFilters(query) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.enabled !== undefined) filters.enabled = query.enabled === 'true';
  if (query.environment) filters.environment = query.environment;
  if (query.tags) filters.tags = { $in: String(query.tags).split(',') };
  if (query.search) filters.name = { $regex: query.search, $options: 'i' };
  return filters;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'name', 'status'], { createdAt: -1 });
  const filters = buildFilters(req.query);
  const { data, total } = await service.listMonitors(req.organizationId, { page, limit, skip, sort, filters });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const create = asyncHandler(async (req, res) => {
  const monitor = await service.createMonitor(req.organizationId, req.body, req.user, req);
  setEtagHeader(res, monitor);
  return created(res, { message: 'Monitor created successfully.', data: monitor });
});

const getById = asyncHandler(async (req, res) => {
  const monitor = await service.getMonitor(req.organizationId, req.params.id);
  setEtagHeader(res, monitor);
  return ok(res, { data: monitor });
});

const update = asyncHandler(async (req, res) => {
  const monitor = await service.updateMonitor(req.organizationId, req.params.id, req.body, req._ifMatch, req.user, req);
  setEtagHeader(res, monitor);
  return ok(res, { message: 'Monitor updated.', data: monitor });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteMonitor(req.organizationId, req.params.id, req.user, req);
  return noContent(res);
});

const pause = asyncHandler(async (req, res) => {
  const monitor = await service.pauseMonitor(req.organizationId, req.params.id, req.user, req);
  return ok(res, { message: 'Monitor paused.', data: monitor });
});

const resume = asyncHandler(async (req, res) => {
  const monitor = await service.resumeMonitor(req.organizationId, req.params.id, req.user, req);
  return ok(res, { message: 'Monitor resumed.', data: monitor });
});

const test = asyncHandler(async (req, res) => {
  const result = await service.testMonitor(req.organizationId, req.params.id);
  return ok(res, { message: 'Test check executed.', data: result });
});

const healthChecks = asyncHandler(async (req, res) => {
  const result = await service.listMonitorHealthChecks(req.organizationId, req.params.id, req.query);
  return ok(res, { data: result.data, meta: result.meta });
});

const incidents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listMonitorIncidents(req.organizationId, req.params.id, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const regions = asyncHandler(async (req, res) => {
  const result = await service.getMonitorRegionStatus(req.organizationId, req.params.id);
  return ok(res, { data: result });
});

module.exports = { list, create, getById, update, remove, pause, resume, test, healthChecks, incidents, regions };
