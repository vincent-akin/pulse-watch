const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { SSL_STATUSES } = require('../common/constants');
const { Schema } = mongoose;

const sslCertificateSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true },
  domain: { type: String, required: true },
  issuer: { type: String, default: null },
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  daysUntilExpiry: { type: Number, default: null },
  status: { type: String, enum: SSL_STATUSES, default: 'valid' },
  lastCheckedAt: { type: Date, default: null },
  lastError: { type: String, default: null },
});

sslCertificateSchema.index({ organizationId: 1, validTo: 1 });
sslCertificateSchema.index({ monitorId: 1 });

softDeletable(sslCertificateSchema);

module.exports = mongoose.model('SslCertificate', sslCertificateSchema);
