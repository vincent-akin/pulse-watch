const mongoose = require('mongoose');
const { Schema } = mongoose;

const usageMetricSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  period: { type: String, required: true }, // "YYYY-MM"
  monitorsUsed: { type: Number, default: 0 },
  healthChecksRun: { type: Number, default: 0 },
  teamMembersUsed: { type: Number, default: 0 },
}, { timestamps: true });

usageMetricSchema.index({ organizationId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('UsageMetric', usageMetricSchema);
