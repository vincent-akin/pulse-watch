const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: { type: String, enum: ['active', 'past_due', 'canceled', 'trialing'], default: 'active' },
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  renewalDate: { type: Date, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },
}, { timestamps: true });

subscriptionSchema.index({ organizationId: 1 }, { unique: true });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
