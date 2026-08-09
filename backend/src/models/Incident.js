const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { INCIDENT_STATUSES, INCIDENT_SEVERITIES } = require('../common/constants');
const { Schema } = mongoose;

const rootCauseSchema = new Schema({
  confidence: { type: Number, min: 0, max: 100, default: null }, // 0-100, AI's self-reported confidence
  findings: { type: [String], default: [] }, // short evidence bullets, e.g. "DNS resolution rose from 12ms to 1.3s"
}, { _id: false });

const incidentSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true },
  status: { type: String, enum: INCIDENT_STATUSES, default: 'open' },
  severity: { type: String, enum: INCIDENT_SEVERITIES, default: 'critical' },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: null }, // ms, set on close
  failureReason: { type: String, default: null },
  failureCount: { type: Number, default: 0 },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedAt: { type: Date, default: null },
  resolvedManually: { type: Boolean, default: false },
  // AI Incident Intelligence (PulseWatch AI) — populated by the AI worker, non-blocking.
  aiSummary: { type: String, default: null },
  aiRootCause: { type: rootCauseSchema, default: () => ({}) },
  aiSuggestedFixes: { type: [String], default: [] },
  aiAnalyzedAt: { type: Date, default: null },
});

incidentSchema.index({ organizationId: 1, status: 1 });
incidentSchema.index({ monitorId: 1, startedAt: -1 });

softDeletable(incidentSchema);

module.exports = mongoose.model('Incident', incidentSchema);
