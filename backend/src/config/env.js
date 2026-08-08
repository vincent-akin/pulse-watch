require('dotenv').config();

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  return v;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000/api/v1',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  corsAllowlist: (process.env.CORS_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean),

  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/pulsewatch'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    },
    successRedirect: process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000/oauth/success',
    failureRedirect: process.env.OAUTH_FAILURE_REDIRECT || 'http://localhost:3000/oauth/failure',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'alerts@pulsewatch.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'PulseWatch',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    successUrl: process.env.STRIPE_SUCCESS_URL,
    cancelUrl: process.env.STRIPE_CANCEL_URL,
  },

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};
