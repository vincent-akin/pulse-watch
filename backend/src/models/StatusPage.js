const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { Schema } = mongoose;

const statusPageSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  monitorIds: { type: [Schema.Types.ObjectId], ref: 'Monitor', default: [] },
  isPublic: { type: Boolean, default: true },
  customDomain: { type: String, default: null }, // future enhancement
});

statusPageSchema.index({ slug: 1 }, { unique: true });
statusPageSchema.index({ organizationId: 1 });

softDeletable(statusPageSchema);

module.exports = mongoose.model('StatusPage', statusPageSchema);
