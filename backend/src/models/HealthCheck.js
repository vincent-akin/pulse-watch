const mongoose = require('mongoose');
const { Schema } = mongoose;

// Append-only / immutable — NO soft delete, NO updatedAt mutation semantics.
const healthCheckSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true },
  status: { type: String, enum: ['healthy', 'degraded', 'unhealthy'], required: true },
  statusCode: { type: Number, default: null },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, required: true },
  responseTime: { type: Number, required: true }, // completedAt - startedAt, ms
  dnsLookup: { type: Number, default: null },
  tcpConnect: { type: Number, default: null },
  tlsHandshake: { type: Number, default: null },
  ttfb: { type: Number, default: null },
  responseSize: { type: Number, default: null },
  validationPassed: { type: Boolean, default: true },
  failureReason: { type: String, default: null },
  region: { type: String, required: true },
  workerId: { type: String, required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

healthCheckSchema.index({ monitorId: 1, completedAt: -1 });
healthCheckSchema.index({ organizationId: 1, completedAt: -1 });

module.exports = mongoose.model('HealthCheck', healthCheckSchema);
