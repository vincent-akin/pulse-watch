const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const { AuditLog } = require('../../models');
const AppError = require('../../common/AppError');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const filter = { organizationId: req.organizationId };
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resource = req.query.resource;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const getById = asyncHandler(async (req, res) => {
  const doc = await AuditLog.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw AppError.notFound('Audit log entry not found.');
  return ok(res, { data: doc });
});

module.exports = { list, getById };
