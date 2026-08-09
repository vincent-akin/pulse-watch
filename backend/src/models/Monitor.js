const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { ENVIRONMENTS, MONITOR_STATUSES, MONITOR_HEALTH } = require('../common/constants');
const { Schema } = mongoose;

const authenticationSchema = new Schema({
  type: { type: String, enum: ['none', 'basic', 'bearer', 'apiKey'], default: 'none' },
  credentials: { type: Schema.Types.Mixed, default: {} }, // encrypted at rest via app-layer encryption
}, { _id: false });

const retryPolicySchema = new Schema({
  attempts: { type: Number, default: 3, min: 0, max: 10 },
  delay: { type: Number, default: 5000, min: 0 }, // ms
}, { _id: false });

const validationRuleSchema = new Schema({
  path: { type: String, required: true },   // e.g. "$.success" (JSONPath-lite)
  operator: { type: String, enum: ['equals', 'notEquals', 'contains', 'exists', 'greaterThan', 'lessThan'], required: true },
  expected: { type: Schema.Types.Mixed },
}, { _id: false });

const monitorSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  url: { type: String, required: true, trim: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'], default: 'GET' },
  headers: { type: Schema.Types.Mixed, default: {} },
  body: { type: Schema.Types.Mixed, default: null },
  queryParameters: { type: Schema.Types.Mixed, default: {} },
  authentication: { type: authenticationSchema, default: () => ({}) },
  interval: { type: Number, required: true, default: 60 }, // seconds
  timeout: { type: Number, default: 5000 }, // ms
  expectedStatusCode: { type: Number, default: 200 },
  enabled: { type: Boolean, default: true },
  region: { type: [String], default: ['us-east-1'] },
  validationRules: { type: [validationRuleSchema], default: [] },
  retryPolicy: { type: retryPolicySchema, default: () => ({}) },
  tags: { type: [String], default: [], index: true },
  environment: { type: String, enum: ENVIRONMENTS, default: 'production' },
  lifecycleStatus: { type: String, enum: MONITOR_STATUSES, default: 'draft' },
  status: { type: String, enum: MONITOR_HEALTH, default: 'unknown' }, // last-known health
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

monitorSchema.index({ organizationId: 1 });
monitorSchema.index({ enabled: 1 });
monitorSchema.index({ status: 1 });
monitorSchema.index({ environment: 1 });
monitorSchema.index({ organizationId: 1, enabled: 1 });
// Application-layer enforced uniqueness (org, url) — see MonitorService.assertUniqueUrl.
monitorSchema.index({ organizationId: 1, url: 1 });

softDeletable(monitorSchema);

module.exports = mongoose.model('Monitor', monitorSchema);
