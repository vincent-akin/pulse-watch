const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { DOMAIN_STATUSES } = require('../common/constants');
const { Schema } = mongoose;

const domainSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  domainName: { type: String, required: true, trim: true, lowercase: true },
  registrar: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  status: { type: String, enum: DOMAIN_STATUSES, default: 'active' },
  lastCheckedAt: { type: Date, default: null },
  lastError: { type: String, default: null },
});

domainSchema.index({ organizationId: 1, expiresAt: 1 });
domainSchema.index({ organizationId: 1, domainName: 1 }, { unique: true });

softDeletable(domainSchema);

module.exports = mongoose.model('Domain', domainSchema);
