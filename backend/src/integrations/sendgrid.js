const sgMail = require('@sendgrid/mail');
const env = require('../config/env');
const logger = require('../config/logger');

let configured = false;
function ensureConfigured() {
  if (!configured && env.sendgrid.apiKey) {
    sgMail.setApiKey(env.sendgrid.apiKey);
    configured = true;
  }
  return configured;
}

async function sendEmail({ to, subject, html, text }) {
  if (!ensureConfigured()) {
    logger.warn('SENDGRID_API_KEY not set — email not sent (dry-run)', { to, subject });
    return { dryRun: true };
  }
  const msg = {
    to,
    from: { email: env.sendgrid.fromEmail, name: env.sendgrid.fromName },
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
  };
  return sgMail.send(msg);
}

module.exports = { sendEmail };
