const slugify = require('../../common/slugify');
const AppError = require('../../common/AppError');
const { Organization, OrganizationMember, Plan, Subscription } = require('../../models');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { recordAudit } = require('../audit/audit.service');

async function generateUniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Organization.exists({ slug })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

async function createOrganization({ name, timezone }, owner, req) {
  const slug = await generateUniqueSlug(name);
  const org = await Organization.create({ name, slug, ownerId: owner._id, timezone: timezone || 'UTC', plan: 'free' });

  await OrganizationMember.create({ organizationId: org._id, userId: owner._id, role: 'owner', status: 'active' });

  const freePlan = await Plan.findOne({ key: 'free' });
  if (freePlan) {
    await Subscription.create({ organizationId: org._id, planId: freePlan._id, status: 'active' });
  }

  await recordAudit({ organizationId: org._id, userId: owner._id, action: 'organization.created', resource: 'organization', resourceId: org._id, req });
  eventBus.emit(EVENTS.ORGANIZATION_CREATED, { organizationId: org._id.toString(), organization: org });

  return org;
}

async function listUserOrganizations(userId) {
  const memberships = await OrganizationMember.find({ userId, status: 'active', deletedAt: null }).populate('organizationId');
  return memberships.filter((m) => m.organizationId && !m.organizationId.deletedAt).map((m) => ({
    organization: m.organizationId,
    role: m.role,
  }));
}

async function getOrganization(id) {
  const org = await Organization.findOne({ _id: id, deletedAt: null });
  if (!org) throw AppError.notFound('Organization not found.');
  return org;
}

async function updateOrganization(id, patch, ifMatch, req, userId) {
  const org = await getOrganization(id);
  const { assertEtagMatches } = require('../../middlewares/etag');
  assertEtagMatches(org, ifMatch);

  Object.assign(org, patch);
  await org.save();

  await recordAudit({ organizationId: org._id, userId, action: 'organization.updated', resource: 'organization', resourceId: org._id, req });
  return org;
}

async function deleteOrganization(id, userId, req) {
  const org = await getOrganization(id);
  await org.softDelete();
  // Deleting an Organization soft-deletes all child data (DMBR ownership rule).
  const models = require('../../models');
  const childCollections = [
    'Monitor', 'Incident', 'NotificationChannel', 'StatusPage', 'ApiKey',
    'SslCertificate', 'Domain', 'OrganizationMember',
  ];
  await Promise.all(childCollections.map((name) => models[name].updateMany(
    { organizationId: org._id, deletedAt: null },
    { deletedAt: new Date() }
  )));

  await recordAudit({ organizationId: org._id, userId, action: 'organization.deleted', resource: 'organization', resourceId: org._id, req });
  return org;
}

// ── Members ────────────────────────────────────────────────────────────────
async function listMembers(organizationId) {
  return OrganizationMember.find({ organizationId, deletedAt: null }).populate('userId', 'firstName lastName email avatarUrl');
}

async function inviteMember({ organizationId, email, role }, invitedBy, req) {
  const { User } = require('../../models');
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  const existingMembership = await OrganizationMember.findOne({
    organizationId,
    $or: [{ userId: existingUser?._id }, { invitedEmail: email.toLowerCase() }],
    deletedAt: null,
  });
  if (existingMembership) throw AppError.conflict('This person is already a member or has a pending invitation.');

  const membership = await OrganizationMember.create({
    organizationId,
    userId: existingUser ? existingUser._id : undefined,
    invitedEmail: existingUser ? undefined : email.toLowerCase(),
    role,
    status: 'invited',
  });

  const { sendEmail } = require('../../integrations/sendgrid');
  const env = require('../../config/env');
  await sendEmail({
    to: email,
    subject: "You've been invited to a PulseWatch organization",
    html: `<p>You've been invited to join a PulseWatch organization as ${role}.</p><p><a href="${env.appBaseUrl}/invitations/accept?membershipId=${membership._id}">Accept invitation</a></p>`,
  });

  await recordAudit({ organizationId, userId: invitedBy._id, action: 'member.invited', resource: 'organizationMember', resourceId: membership._id, req });
  eventBus.emit(EVENTS.MEMBER_INVITED, { organizationId, membership });

  return membership;
}

async function updateMember(organizationId, memberId, { role }, actorId, req) {
  const membership = await OrganizationMember.findOne({ _id: memberId, organizationId, deletedAt: null });
  if (!membership) throw AppError.notFound('Membership not found.');
  if (membership.role === 'owner') throw AppError.forbidden("The organization owner's role cannot be changed here.");

  membership.role = role;
  await membership.save();

  await recordAudit({ organizationId, userId: actorId, action: 'member.updated', resource: 'organizationMember', resourceId: membership._id, req });
  return membership;
}

async function removeMember(organizationId, memberId, actorId, req) {
  const membership = await OrganizationMember.findOne({ _id: memberId, organizationId, deletedAt: null });
  if (!membership) throw AppError.notFound('Membership not found.');
  if (membership.role === 'owner') throw AppError.forbidden('The organization owner cannot be removed.');

  await membership.softDelete();
  await recordAudit({ organizationId, userId: actorId, action: 'member.removed', resource: 'organizationMember', resourceId: membership._id, req });
}

module.exports = {
  createOrganization, listUserOrganizations, getOrganization, updateOrganization, deleteOrganization,
  listMembers, inviteMember, updateMember, removeMember,
};
