const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { NOTIFICATION_CHANNEL_TYPES } = require('../common/constants');
const { Schema } = mongoose;

const notificationChannelSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: NOTIFICATION_CHANNEL_TYPES, required: true },
  // email: { to: [...] } | slack/discord: { webhookUrl } | webhook: { url, headers }
  configuration: { type: Schema.Types.Mixed, required: true },
  enabled: { type: Boolean, default: true },
});

notificationChannelSchema.index({ organizationId: 1 });

softDeletable(notificationChannelSchema);

module.exports = mongoose.model('NotificationChannel', notificationChannelSchema);
