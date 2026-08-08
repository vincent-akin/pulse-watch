const Stripe = require('stripe');
const env = require('../config/env');
const logger = require('../config/logger');

let stripeClient = null;
function getStripe() {
  if (!env.stripe.secretKey) {
    logger.warn('STRIPE_SECRET_KEY not set — billing endpoints will return 503 until configured.');
    return null;
  }
  if (!stripeClient) stripeClient = new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' });
  return stripeClient;
}

async function createCheckoutSession({ organization, plan, customerEmail }) {
  const stripe = getStripe();
  if (!stripe) throw Object.assign(new Error('Billing is not configured.'), { statusCode: 503 });

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: env.stripe.successUrl,
    cancel_url: env.stripe.cancelUrl,
    client_reference_id: organization._id.toString(),
    metadata: { organizationId: organization._id.toString(), planKey: plan.key },
  });
}

function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw Object.assign(new Error('Billing is not configured.'), { statusCode: 503 });
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}

module.exports = { getStripe, createCheckoutSession, constructWebhookEvent };
