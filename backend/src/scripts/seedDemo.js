// Seeds demo accounts for evaluating the app: one Admin (organization owner) and two Users
// (an Engineer and a Viewer) inside a shared "Demo Organization", plus a few sample monitors,
// a notification channel, and a public status page so the UI isn't empty on first login.
//
// Idempotent — safe to re-run; upserts by email/slug/url instead of duplicating.
const bcrypt = require('bcryptjs');
const { connectMongo } = require('../config/db');
const {
  User, Organization, OrganizationMember, Subscription, Plan, Monitor, NotificationChannel, StatusPage,
} = require('../models');
const logger = require('../config/logger');

const DEMO_ACCOUNTS = [
  { email: 'admin@pulsewatch.demo', password: 'AdminPass123!', firstName: 'Ava', lastName: 'Admin', role: 'owner' },
  { email: 'engineer@pulsewatch.demo', password: 'UserPass123!', firstName: 'Eli', lastName: 'Engineer', role: 'engineer' },
  { email: 'viewer@pulsewatch.demo', password: 'UserPass123!', firstName: 'Vera', lastName: 'Viewer', role: 'viewer' },
];

const SAMPLE_MONITORS = [
  { name: 'GitHub API', url: 'https://api.github.com', method: 'GET', expectedStatusCode: 200, interval: 60, environment: 'production', tags: ['external'] },
  { name: 'HTTPBin — 200 OK', url: 'https://httpbin.org/status/200', method: 'GET', expectedStatusCode: 200, interval: 120, environment: 'production', tags: ['sample'] },
  { name: 'HTTPBin — Delayed response', url: 'https://httpbin.org/delay/1', method: 'GET', expectedStatusCode: 200, interval: 120, environment: 'staging', tags: ['sample'] },
];

async function upsertUser({ email, password, firstName, lastName }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(
    { email },
    { email, passwordHash, firstName, lastName, emailVerified: true, authProvider: 'password' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertMembership(organizationId, userId, role) {
  await OrganizationMember.findOneAndUpdate(
    { organizationId, userId },
    { organizationId, userId, role, status: 'active' },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  await connectMongo();

  const users = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const account of DEMO_ACCOUNTS) {
    // eslint-disable-next-line no-await-in-loop
    users[account.role] = await upsertUser(account);
  }

  let org = await Organization.findOne({ slug: 'demo-organization' });
  if (!org) {
    org = await Organization.create({
      name: 'Demo Organization',
      slug: 'demo-organization',
      ownerId: users.owner._id,
      plan: 'pro',
    });
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const account of DEMO_ACCOUNTS) {
    // eslint-disable-next-line no-await-in-loop
    await upsertMembership(org._id, users[account.role]._id, account.role);
  }

  const proPlan = await Plan.findOne({ key: 'pro' });
  if (proPlan) {
    await Subscription.findOneAndUpdate(
      { organizationId: org._id },
      { organizationId: org._id, planId: proPlan._id, status: 'active' },
      { upsert: true }
    );
  } else {
    logger.warn('Pro plan not found — run `npm run seed:plans` first for full demo functionality (SSL/domain monitoring, status pages).');
  }

  const createdMonitors = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const m of SAMPLE_MONITORS) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await Monitor.findOneAndUpdate(
      { organizationId: org._id, url: m.url },
      { ...m, organizationId: org._id, createdBy: users.owner._id, enabled: true, lifecycleStatus: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdMonitors.push(doc);
  }

  await NotificationChannel.findOneAndUpdate(
    { organizationId: org._id, name: 'Demo Email Alerts' },
    { organizationId: org._id, name: 'Demo Email Alerts', type: 'email', configuration: { to: [users.owner.email] }, enabled: true },
    { upsert: true }
  );

  await StatusPage.findOneAndUpdate(
    { slug: 'demo-status' },
    {
      organizationId: org._id,
      slug: 'demo-status',
      title: 'Demo Organization Status',
      monitorIds: createdMonitors.map((m) => m._id),
      isPublic: true,
    },
    { upsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`
Demo data seeded successfully.

  Organization:        Demo Organization (${org.slug})
  Public status page:  /status/demo-status

  Login credentials
  ------------------------------------------------------------
  Admin (owner):    admin@pulsewatch.demo     / AdminPass123!
  User (engineer):  engineer@pulsewatch.demo  / UserPass123!
  User (viewer):    viewer@pulsewatch.demo    / UserPass123!
  ------------------------------------------------------------
  Change these before deploying anywhere but your own machine.
`);
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Demo seed failed', { err: err.message, stack: err.stack });
  process.exit(1);
});
