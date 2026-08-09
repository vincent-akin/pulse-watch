const AppError = require('../../common/AppError');
const { Plan, Subscription, Invoice, Organization } = require('../../models');
const { createCheckoutSession, constructWebhookEvent } = require('../../integrations/stripe');
const logger = require('../../config/logger');

async function listPlans() {
  return Plan.find({ active: true }).sort({ priceMonthly: 1 });
}

async function getSubscription(organizationId) {
  const sub = await Subscription.findOne({ organizationId }).populate('planId');
  if (!sub) throw AppError.notFound('No subscription found for this organization.');
  return sub;
}

async function startCheckout(organizationId, planKey, userEmail) {
  const plan = await Plan.findOne({ key: planKey, active: true });
  if (!plan) throw AppError.notFound('Plan not found.');
  if (!plan.stripePriceId) throw AppError.badRequest('This plan is not connected to a Stripe price yet.');

  const organization = await Organization.findById(organizationId);
  const session = await createCheckoutSession({ organization, plan, customerEmail: userEmail });
  return { checkoutUrl: session.url };
}

async function listInvoices(organizationId, { skip, limit }) {
  const filter = { organizationId };
  const [data, total] = await Promise.all([
    Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
  ]);
  return { data, total };
}

// Stripe webhook handler — the source of truth for subscription state changes.
async function handleWebhookEvent(rawBody, signature) {
  const event = constructWebhookEvent(rawBody, signature);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      const planKey = session.metadata?.planKey;
      if (!organizationId || !planKey) break;

      const plan = await Plan.findOne({ key: planKey });
      await Subscription.findOneAndUpdate(
        { organizationId },
        {
          organizationId,
          planId: plan._id,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        },
        { upsert: true }
      );
      await Organization.findByIdAndUpdate(organizationId, { plan: planKey });
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
      if (!sub) break;
      await Invoice.create({
        organizationId: sub.organizationId,
        subscriptionId: sub._id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        issuedAt: new Date(invoice.created * 1000),
        paidAt: new Date(),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      await Subscription.findOneAndUpdate({ stripeSubscriptionId: stripeSub.id }, { status: 'canceled' });
      break;
    }
    default:
      logger.info('Unhandled Stripe webhook event', { type: event.type });
  }

  return { received: true };
}

module.exports = { listPlans, getSubscription, startCheckout, listInvoices, handleWebhookEvent };
