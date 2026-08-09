// Seeds the canonical plan table from DMBR "Plan Limits" (Free / Starter / Pro / Enterprise).
const { connectMongo } = require('../config/db');
const { Plan } = require('../models');
const logger = require('../config/logger');

const PLANS = [
  { key: 'free', name: 'Free', priceMonthly: 0, limits: { monitors: 5, checkIntervalSeconds: 300, teamMembers: 1, dataRetentionDays: 30, statusPages: 0, sslDomainMonitoring: false } },
  { key: 'starter', name: 'Starter', priceMonthly: 2900, limits: { monitors: 50, checkIntervalSeconds: 60, teamMembers: 5, dataRetentionDays: 90, statusPages: 1, sslDomainMonitoring: true } },
  { key: 'pro', name: 'Pro', priceMonthly: 9900, limits: { monitors: 500, checkIntervalSeconds: 30, teamMembers: -1, dataRetentionDays: 365, statusPages: 5, sslDomainMonitoring: true } },
  { key: 'enterprise', name: 'Enterprise', priceMonthly: 49900, limits: { monitors: -1, checkIntervalSeconds: 10, teamMembers: -1, dataRetentionDays: -1, statusPages: -1, sslDomainMonitoring: true } },
];

async function seed() {
  await connectMongo();
  for (const plan of PLANS) {
    // eslint-disable-next-line no-await-in-loop
    await Plan.findOneAndUpdate({ key: plan.key }, plan, { upsert: true, new: true });
    logger.info(`Seeded plan: ${plan.key}`);
  }
  process.exit(0);
}

seed().catch((err) => { logger.error('Seeding failed', { err: err.message }); process.exit(1); });
