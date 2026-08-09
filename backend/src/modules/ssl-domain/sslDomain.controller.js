const asyncHandler = require('../../common/asyncHandler');
const { ok, created, noContent } = require('../../common/response');
const service = require('./sslDomain.service');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');
const { getQueue, QUEUE_NAMES } = require('../../queues');

// SSL Certificates
const listSsl = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listSslCertificates(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const getSslById = asyncHandler(async (req, res) => {
  const doc = await service.getSslCertificate(req.organizationId, req.params.id);
  return ok(res, { data: doc });
});

const recheckSsl = asyncHandler(async (req, res) => {
  await service.getSslCertificate(req.organizationId, req.params.id); // 404 guard + org scoping
  await getQueue(QUEUE_NAMES.SSL_DOMAIN).add('recheck-ssl', { sslCertificateId: req.params.id });
  return ok(res, { message: 'Recheck queued.' });
});

// Domains
const listDomains = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listDomains(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

const createDomain = asyncHandler(async (req, res) => {
  const domain = await service.createDomain(req.organizationId, req.body, req.user, req);
  return created(res, { message: 'Domain registered for tracking.', data: domain });
});

const getDomainById = asyncHandler(async (req, res) => {
  const doc = await service.getDomain(req.organizationId, req.params.id);
  return ok(res, { data: doc });
});

const removeDomain = asyncHandler(async (req, res) => {
  await service.deleteDomain(req.organizationId, req.params.id, req.user, req);
  return noContent(res);
});

const recheckDomain = asyncHandler(async (req, res) => {
  await service.getDomain(req.organizationId, req.params.id);
  await getQueue(QUEUE_NAMES.SSL_DOMAIN).add('recheck-domain', { domainId: req.params.id });
  return ok(res, { message: 'Recheck queued.' });
});

module.exports = { listSsl, getSslById, recheckSsl, listDomains, createDomain, getDomainById, removeDomain, recheckDomain };
