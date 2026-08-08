const axios = require('axios');
const logger = require('../config/logger');

// Slack incoming webhook. `configuration.webhookUrl` comes from the notificationChannel document.
async function sendSlack({ webhookUrl, text, blocks }) {
  return axios.post(webhookUrl, blocks ? { text, blocks } : { text }, { timeout: 10000 });
}

// Discord incoming webhook.
async function sendDiscord({ webhookUrl, content }) {
  return axios.post(webhookUrl, { content }, { timeout: 10000 });
}

// Generic outbound webhook — used for custom integrations.
async function sendWebhook({ url, headers = {}, payload }) {
  return axios.post(url, payload, { headers, timeout: 10000 });
}

async function safeSend(fn, args, channelId) {
  try {
    await fn(args);
    return { ok: true };
  } catch (err) {
    logger.error('Notification delivery failed', { channelId, err: err.message });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendSlack, sendDiscord, sendWebhook, safeSend };
