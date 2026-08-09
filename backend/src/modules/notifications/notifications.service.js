const AppError = require('../../common/AppError');
const { NotificationChannel, Notification } = require('../../models');
const { assertEtagMatches } = require('../../middlewares/etag');
const { sendEmail } = require('../../integrations/sendgrid');
const { sendSlack, sendDiscord, sendWebhook, safeSend } = require('../../integrations/webhookNotifiers');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { recordAudit } = require('../audit/audit.service');

// ── Channels CRUD ────────────────────────────────────────────────────────
async function createChannel(organizationId, payload, user, req) {
  const channel = await NotificationChannel.create({ ...payload, organizationId });
  await recordAudit({ organizationId, userId: user._id, action: 'notificationChannel.created', resource: 'notificationChannel', resourceId: channel._id, req });
  return channel;
}

async function listChannels(organizationId, { skip, limit }) {
  const filter = { organizationId, deletedAt: null };
  const [data, total] = await Promise.all([
    NotificationChannel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationChannel.countDocuments(filter),
  ]);
  return { data, total };
}

async function getChannel(organizationId, id) {
  const channel = await NotificationChannel.findOne({ _id: id, organizationId, deletedAt: null });
  if (!channel) throw AppError.notFound('Notification channel not found.');
  return channel;
}

async function updateChannel(organizationId, id, patch, ifMatch, user, req) {
  const channel = await getChannel(organizationId, id);
  assertEtagMatches(channel, ifMatch);
  Object.assign(channel, patch);
  await channel.save();
  await recordAudit({ organizationId, userId: user._id, action: 'notificationChannel.updated', resource: 'notificationChannel', resourceId: channel._id, req });
  return channel;
}

async function deleteChannel(organizationId, id, user, req) {
  const channel = await getChannel(organizationId, id);
  await channel.softDelete();
  await recordAudit({ organizationId, userId: user._id, action: 'notificationChannel.deleted', resource: 'notificationChannel', resourceId: channel._id, req });
}

async function dispatchToChannel(channel, { subject, text, html }) {
  switch (channel.type) {
    case 'email':
      return Promise.all(channel.configuration.to.map((to) => sendEmail({ to, subject, html: html || text, text })));
    case 'slack':
      return safeSend(sendSlack, { webhookUrl: channel.configuration.webhookUrl, text: `*${subject}*\n${text}` }, channel._id);
    case 'discord':
      return safeSend(sendDiscord, { webhookUrl: channel.configuration.webhookUrl, content: `**${subject}**\n${text}` }, channel._id);
    case 'webhook':
      return safeSend(sendWebhook, { url: channel.configuration.url, headers: channel.configuration.headers, payload: { subject, text } }, channel._id);
    default:
      return null;
  }
}

async function testChannel(organizationId, id) {
  const channel = await getChannel(organizationId, id);
  await dispatchToChannel(channel, {
    subject: 'PulseWatch test notification',
    text: 'This is a test notification from PulseWatch to confirm this channel is configured correctly.',
  });
  return { sent: true };
}

// ── Notification history (delivery) ────────────────────────────────────
// Failed deliveries are retried; delivery history is retained (DMBR Notifications rules).
async function deliverEventNotifications(eventType, { incident, monitor, sslCertificate, domain, organizationId }) {
  const channels = await NotificationChannel.find({ organizationId, enabled: true, deletedAt: null });
  const results = [];

  const { subject, text } = buildMessage(eventType, { incident, monitor, sslCertificate, domain });

  for (const channel of channels) {
    // eslint-disable-next-line no-await-in-loop
    const recipients = channel.type === 'email' ? channel.configuration.to : [channel.name];
    for (const recipient of recipients) {
      // eslint-disable-next-line no-await-in-loop
      const notification = await Notification.create({
        organizationId,
        incidentId: incident?._id || null,
        channelId: channel._id,
        eventType,
        status: 'pending',
        recipient,
      });

      // eslint-disable-next-line no-await-in-loop
      const outcome = await dispatchToChannelWithRetry(channel, { subject, text }, notification);
      results.push(outcome);
    }
  }
  return results;
}

async function dispatchToChannelWithRetry(channel, message, notification, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    notification.attempts = attempt;
    try {
      // eslint-disable-next-line no-await-in-loop
      await dispatchToChannel(channel, message);
      notification.status = 'sent';
      notification.sentAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await notification.save();
      eventBus.emit(EVENTS.NOTIFICATION_SENT, { organizationId: notification.organizationId.toString(), notification });
      return notification;
    } catch (err) {
      notification.lastError = err.message;
      if (attempt === maxAttempts) {
        notification.status = 'failed';
        // eslint-disable-next-line no-await-in-loop
        await notification.save();
        return notification;
      }
    }
  }
  return notification;
}

function buildMessage(eventType, { incident, monitor, sslCertificate, domain }) {
  switch (eventType) {
    case 'incident.opened':
      return { subject: `🔴 Incident opened: ${monitor?.name}`, text: `${monitor?.url} is failing: ${incident?.failureReason || 'unknown reason'}.` };
    case 'incident.closed':
      return { subject: `✅ Incident resolved: ${monitor?.name}`, text: `${monitor?.url} has recovered. Downtime: ${Math.round((incident?.duration || 0) / 1000)}s.` };
    case 'sslcertificate.expiring':
      return { subject: `⚠️ SSL certificate ${sslCertificate?.status}`, text: `Certificate for ${sslCertificate?.domain} expires in ${sslCertificate?.daysUntilExpiry} day(s).` };
    case 'domain.expiring':
      return { subject: `⚠️ Domain ${domain?.status}`, text: `Domain ${domain?.domainName} is approaching its renewal deadline (${domain?.expiresAt}).` };
    default:
      return { subject: 'PulseWatch notification', text: 'An event occurred.' };
  }
}

async function listNotifications(organizationId, { skip, limit }) {
  const filter = { organizationId };
  const [data, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  return { data, total };
}

async function getNotification(organizationId, id) {
  const doc = await Notification.findOne({ _id: id, organizationId });
  if (!doc) throw AppError.notFound('Notification not found.');
  return doc;
}

module.exports = {
  createChannel, listChannels, getChannel, updateChannel, deleteChannel, testChannel,
  deliverEventNotifications, listNotifications, getNotification,
};
