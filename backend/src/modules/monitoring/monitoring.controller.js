const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./monitoring.service');

const list = asyncHandler(async (req, res) => {
  const result = await service.listHealthChecks({
    organizationId: req.organizationId,
    monitorId: req.query.monitorId,
    cursor: req.query.cursor,
    limit: req.query.limit,
    status: req.query.status,
    region: req.query.region,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    minResponseTime: req.query.minResponseTime,
    maxResponseTime: req.query.maxResponseTime,
  });
  return ok(res, { data: result.data, meta: result.meta });
});

const getById = asyncHandler(async (req, res) => {
  const doc = await service.getHealthCheck(req.organizationId, req.params.id);
  return ok(res, { data: doc });
});

module.exports = { list, getById };
