const mongoose = require('mongoose');
const { Schema } = mongoose;

const limitsSchema = new Schema({
  monitors: { type: Number, required: true },       // -1 = unlimited
  checkIntervalSeconds: { type: Number, required: true },
  teamMembers: { type: Number, required: true },    // -1 = unlimited
  dataRetentionDays: { type: Number, required: true }, // -1 = unlimited
  statusPages: { type: Number, required: true },    // -1 = unlimited
  sslDomainMonitoring: { type: Boolean, required: true },
}, { _id: false });

const planSchema = new Schema({
  key: { type: String, required: true, lowercase: true }, // free | starter | pro | enterprise
  name: { type: String, required: true },
  limits: { type: limitsSchema, required: true },
  priceMonthly: { type: Number, required: true }, // cents
  stripePriceId: { type: String, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

planSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Plan', planSchema);
