const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./statusPages.service');
const { setEtagHeader } = require('../../middlewares/etag');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

const create = asyncHandler(async (req, res) => {
  const page = await service.createStatusPage(req.organizationId, req.body, req.user, req);
  setEtagHeader(res, page);
  return created(res, { message: 'Status page created.', data: page });
});

const list = asyncHandler(async (req, res) => {
  const { page: pageNum, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listStatusPages(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page: pageNum, limit, total }) });
});

const getById = asyncHandler(async (req, res) => {
  const page = await service.getStatusPage(req.organizationId, req.params.id);
  setEtagHeader(res, page);
  return ok(res, { data: page });
});

const update = asyncHandler(async (req, res) => {
  const page = await service.updateStatusPage(req.organizationId, req.params.id, req.body, req._ifMatch, req.user, req);
  setEtagHeader(res, page);
  return ok(res, { message: 'Status page updated.', data: page });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteStatusPage(req.organizationId, req.params.id, req.user, req);
  return noContent(res);
});

const publicView = asyncHandler(async (req, res) => {
  const result = await service.getPublicStatusPage(req.params.slug);
  return ok(res, { data: result });
});

const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../common/AppError');
const OrganizationMember = require('../../models/OrganizationMember');
const { User } = require('../../models');

// Same path shape as the API Spec's shared "/status-pages/:slug" entry: an authenticated caller
// passing a Bearer token gets the private, organization-scoped lookup by ID; an anonymous caller
// gets the public, unauthenticated view by slug.
const publicOrPrivateView = asyncHandler(async (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findOne({ _id: payload.sub, deletedAt: null });
    if (!user) throw AppError.unauthorized('User no longer exists.');

    const organizationId = req.headers['x-organization-id'];
    if (!organizationId) throw AppError.badRequest('X-Organization-ID header is required.');

    const membership = await OrganizationMember.findOne({ organizationId, userId: user._id, status: 'active', deletedAt: null });
    if (!membership) throw AppError.forbidden('You are not a member of this organization.');

    const page = await service.getStatusPage(organizationId, req.params.slug);
    setEtagHeader(res, page);
    return ok(res, { data: page });
  }

  const result = await service.getPublicStatusPage(req.params.slug);
  return ok(res, { data: result });
});

module.exports = { create, list, getById, update, remove, publicView, publicOrPrivateView };
