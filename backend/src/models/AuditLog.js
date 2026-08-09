const mongoose = require('mongoose');
const { Schema } = mongoose;

// Append-only / immutable — no deletedAt, no updatedAt.
const auditLogSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null }, // null for account-level actions (e.g. auth.login)
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },       // e.g. "monitor.created"
  resource: { type: String, required: true },      // e.g. "monitor"
  resourceId: { type: Schema.Types.ObjectId, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
