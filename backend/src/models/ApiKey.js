const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { Schema } = mongoose;

const apiKeySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  hashedKey: { type: String, required: true, select: false },
  keyPrefix: { type: String, required: true }, // first 8 chars shown in UI, e.g. "pw_live_ab12"
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastUsedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
});

apiKeySchema.index({ organizationId: 1 });
apiKeySchema.index({ hashedKey: 1 }, { unique: true });

softDeletable(apiKeySchema);

module.exports = mongoose.model('ApiKey', apiKeySchema);
