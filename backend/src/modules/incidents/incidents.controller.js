const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./incidents.service');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listIncidents(req.organizationId, {
    skip, limit, status: req.query.status, severity: req.query.severity, monitorId: req.query.monitorId,
  });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const getById = asyncHandler(async (req, res) => {
  const incident = await service.getIncident(req.organizationId, req.params.id);
  return ok(res, { data: incident });
});

const acknowledge = asyncHandler(async (req, res) => {
  const incident = await service.acknowledgeIncident(req.organizationId, req.params.id, req.user, req);
  return ok(res, { message: 'Incident acknowledged.', data: incident });
});

const resolve = asyncHandler(async (req, res) => {
  const incident = await service.resolveIncidentManually(req.organizationId, req.params.id, req.user, req);
  return ok(res, { message: 'Incident resolved.', data: incident });
});

const summary = asyncHandler(async (req, res) => {
  const result = await service.getIncidentSummary(req.organizationId, req.params.id);
  return ok(res, { data: result });
});

const timeline = asyncHandler(async (req, res) => {
  const result = await service.getIncidentTimeline(req.organizationId, req.params.id);
  return ok(res, { data: result });
});

module.exports = { list, getById, acknowledge, resolve, summary, timeline };
