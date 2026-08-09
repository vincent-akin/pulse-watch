const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./organizations.service');
const { setEtagHeader } = require('../../middlewares/etag');

const list = asyncHandler(async (req, res) => {
  const results = await service.listUserOrganizations(req.user._id);
  return ok(res, { data: results });
});

const create = asyncHandler(async (req, res) => {
  const org = await service.createOrganization(req.body, req.user, req);
  setEtagHeader(res, org);
  return created(res, { message: 'Organization created successfully.', data: org });
});

const getById = asyncHandler(async (req, res) => {
  const org = await service.getOrganization(req.params.id);
  setEtagHeader(res, org);
  return ok(res, { data: org });
});

const update = asyncHandler(async (req, res) => {
  const org = await service.updateOrganization(req.params.id, req.body, req._ifMatch, req, req.user._id);
  setEtagHeader(res, org);
  return ok(res, { message: 'Organization updated.', data: org });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteOrganization(req.params.id, req.user._id, req);
  return noContent(res);
});

const listMembers = asyncHandler(async (req, res) => {
  const members = await service.listMembers(req.params.id);
  return ok(res, { data: members });
});

const inviteMember = asyncHandler(async (req, res) => {
  const membership = await service.inviteMember({ organizationId: req.params.id, ...req.body }, req.user, req);
  return created(res, { message: 'Invitation sent.', data: membership });
});

const updateMember = asyncHandler(async (req, res) => {
  const membership = await service.updateMember(req.params.id, req.params.memberId, req.body, req.user._id, req);
  return ok(res, { message: 'Member updated.', data: membership });
});

const removeMember = asyncHandler(async (req, res) => {
  await service.removeMember(req.params.id, req.params.memberId, req.user._id, req);
  return noContent(res);
});

module.exports = { list, create, getById, update, remove, listMembers, inviteMember, updateMember, removeMember };
