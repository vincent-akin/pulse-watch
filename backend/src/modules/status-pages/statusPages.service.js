const AppError = require('../../common/AppError');
const slugify = require('../../common/slugify');
const { StatusPage, Monitor, Incident, Subscription, Plan } = require('../../models');
const { assertEtagMatches } = require('../../middlewares/etag');
const { recordAudit } = require('../audit/audit.service');

async function generateUniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await StatusPage.exists({ slug })) slug = `${base}-${++i}`;
  return slug;
}

// Enforce plan-based limits on the number of status pages an organization may publish (PRD §11).
async function assertStatusPageQuota(organizationId) {
  const sub = await Subscription.findOne({ organizationId });
  const plan = sub ? await Plan.findById(sub.planId) : await Plan.findOne({ key: 'free' });
  if (!plan || plan.limits.statusPages === -1) return;
  const count = await StatusPage.countDocuments({ organizationId, deletedAt: null });
  if (count >= plan.limits.statusPages) {
    throw AppError.forbidden(`Your plan (${plan.name}) allows up to ${plan.limits.statusPages} status page(s).`);
  }
}

async function createStatusPage(organizationId, payload, user, req) {
  await assertStatusPageQuota(organizationId);
  const slug = payload.slug ? payload.slug : await generateUniqueSlug(payload.title);
  if (payload.slug && (await StatusPage.exists({ slug }))) throw AppError.conflict('Slug already in use.');

  const page = await StatusPage.create({ ...payload, slug, organizationId });
  await recordAudit({ organizationId, userId: user._id, action: 'statusPage.created', resource: 'statusPage', resourceId: page._id, req });
  return page;
}

async function listStatusPages(organizationId, { skip, limit }) {
  const filter = { organizationId, deletedAt: null };
  const [data, total] = await Promise.all([
    StatusPage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    StatusPage.countDocuments(filter),
  ]);
  return { data, total };
}

async function getStatusPage(organizationId, id) {
  const page = await StatusPage.findOne({ _id: id, organizationId, deletedAt: null });
  if (!page) throw AppError.notFound('Status page not found.');
  return page;
}

async function updateStatusPage(organizationId, id, patch, ifMatch, user, req) {
  const page = await getStatusPage(organizationId, id);
  assertEtagMatches(page, ifMatch);
  Object.assign(page, patch);
  await page.save();
  await recordAudit({ organizationId, userId: user._id, action: 'statusPage.updated', resource: 'statusPage', resourceId: page._id, req });
  return page;
}

async function deleteStatusPage(organizationId, id, user, req) {
  const page = await getStatusPage(organizationId, id);
  await page.softDelete();
  await recordAudit({ organizationId, userId: user._id, action: 'statusPage.deleted', resource: 'statusPage', resourceId: page._id, req });
}

// GET /status-pages/:slug — public, unauthenticated (API Spec). Governs *viewing*, not editing (DMBR RBAC note).
async function getPublicStatusPage(slug) {
  const page = await StatusPage.findOne({ slug, isPublic: true, deletedAt: null });
  if (!page) throw AppError.notFound('Status page not found.');

  const monitors = await Monitor.find({ _id: { $in: page.monitorIds }, deletedAt: null })
    .select('name url status environment');

  const openIncidents = await Incident.find({
    monitorId: { $in: page.monitorIds }, status: 'open', deletedAt: null,
  }).select('monitorId severity startedAt failureReason');

  return {
    title: page.title,
    slug: page.slug,
    monitors: monitors.map((m) => ({
      name: m.name,
      status: m.status,
      environment: m.environment,
      openIncident: openIncidents.find((i) => i.monitorId.toString() === m._id.toString()) || null,
    })),
    overallStatus: monitors.every((m) => m.status === 'healthy') ? 'operational' : 'degraded',
    generatedAt: new Date(),
  };
}

module.exports = { createStatusPage, listStatusPages, getStatusPage, updateStatusPage, deleteStatusPage, getPublicStatusPage };
