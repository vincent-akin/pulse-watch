const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  stripeInvoiceId: { type: String, default: null },
  amount: { type: Number, required: true }, // cents
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['draft', 'open', 'paid', 'void', 'uncollectible'], default: 'open' },
  issuedAt: { type: Date, required: true },
  paidAt: { type: Date, default: null },
  hostedInvoiceUrl: { type: String, default: null },
}, { timestamps: true });

invoiceSchema.index({ organizationId: 1, issuedAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
