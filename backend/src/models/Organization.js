const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { Schema } = mongoose;

const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timezone: { type: String, default: 'UTC' },
  plan: { type: String, default: 'free' }, // references plans.key
});

organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ ownerId: 1 });

softDeletable(organizationSchema);

module.exports = mongoose.model('Organization', organizationSchema);
