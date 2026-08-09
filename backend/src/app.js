const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const requestId = require('./middlewares/requestId');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const organizationsRoutes = require('./modules/organizations/organizations.routes');
const monitorsRoutes = require('./modules/monitors/monitors.routes');
const monitoringRoutes = require('./modules/monitoring/monitoring.routes');
const incidentsRoutes = require('./modules/incidents/incidents.routes');
const { sslRouter, domainsRouter } = require('./modules/ssl-domain/sslDomain.routes');
const statusPagesRoutes = require('./modules/status-pages/statusPages.routes');
const { channelsRouter, notificationsRouter } = require('./modules/notifications/notifications.routes');
const apiKeysRoutes = require('./modules/apiKeys/apiKeys.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const billingController = require('./modules/billing/billing.controller');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: env.corsAllowlist.length ? env.corsAllowlist : true,
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'ETag'],
}));
app.use(compression());
app.use(requestId);
app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Stripe requires the raw body for webhook signature verification — mounted BEFORE express.json().
app.post('/api/v1/billing/webhook', express.raw({ type: 'application/json' }), billingController.webhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'ok', data: { uptime: process.uptime() } }));

const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/organizations`, organizationsRoutes);
app.use(`${API_PREFIX}/monitors`, monitorsRoutes);
app.use(`${API_PREFIX}/health-checks`, monitoringRoutes);
app.use(`${API_PREFIX}/incidents`, incidentsRoutes);
app.use(`${API_PREFIX}/ssl-certificates`, sslRouter);
app.use(`${API_PREFIX}/domains`, domainsRouter);
app.use(`${API_PREFIX}/status-pages`, statusPagesRoutes);
app.use(`${API_PREFIX}/notification-channels`, channelsRouter);
app.use(`${API_PREFIX}/notifications`, notificationsRouter);
app.use(`${API_PREFIX}/api-keys`, apiKeysRoutes);
app.use(`${API_PREFIX}/audit-logs`, auditRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
