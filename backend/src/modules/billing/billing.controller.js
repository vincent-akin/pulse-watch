const asyncHandler = require('../../common/asyncHandler');
const { ok } = require('../../common/response');
const service = require('./billing.service');
const { parseOffsetPagination, buildOffsetMeta } = require('../../common/pagination');

const listPlans = asyncHandler(async (req, res) => ok(res, { data: await service.listPlans() }));

const getSubscription = asyncHandler(async (req, res) => ok(res, { data: await service.getSubscription(req.organizationId) }));

const checkout = asyncHandler(async (req, res) => {
  const result = await service.startCheckout(req.organizationId, req.body.planKey, req.user.email);
  return ok(res, { message: 'Checkout session created.', data: result });
});

const listInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parseOffsetPagination(req.query);
  const { data, total } = await service.listInvoices(req.organizationId, { skip, limit });
  return ok(res, { data, meta: buildOffsetMeta({ page, limit, total }) });
});

// Stripe requires the RAW request body for signature verification — see app.js for the raw-body route wiring.
const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const result = await service.handleWebhookEvent(req.body, signature);
  return res.status(200).json(result);
});

module.exports = { listPlans, getSubscription, checkout, listInvoices, webhook };
