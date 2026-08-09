const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null },
  channelId: { type: Schema.Types.ObjectId, ref: 'NotificationChannel', required: true },
  eventType: {
    type: String,
    enum: ['incident.opened', 'incident.closed', 'sslcertificate.expiring', 'domain.expiring'],
    required: true,
  },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  recipient: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: null },
  sentAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ organizationId: 1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
