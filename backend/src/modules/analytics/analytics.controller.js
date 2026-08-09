const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./analytics.service');

const overview = asyncHandler(async (req, res) => ok(res, { data: await service.overview(req.organizationId, req.query) }));
const uptime = asyncHandler(async (req, res) => ok(res, { data: await service.uptime(req.organizationId, req.query) }));
const latency = asyncHandler(async (req, res) => ok(res, { data: await service.latency(req.organizationId, req.query) }));
const incidents = asyncHandler(async (req, res) => ok(res, { data: await service.incidentsAnalytics(req.organizationId, req.query) }));

module.exports = { overview, uptime, latency, incidents };
