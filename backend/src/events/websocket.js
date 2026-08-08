const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../config/logger');
const { eventBus, EVENTS } = require('./eventBus');

// Real-time dashboard updates. Clients join an org-scoped room after authenticating with their JWT.
// WebSocket event payloads mirror the API Specification's event table 1:1.
let io;

function initWebsocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsAllowlist.length ? env.corsAllowlist : '*' },
    path: '/ws',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Missing auth token'));
      const payload = jwt.verify(token, env.jwt.accessSecret);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', (organizationId) => {
      if (organizationId) {
        socket.join(`org:${organizationId}`);
        logger.info('socket joined org room', { organizationId, socketId: socket.id });
      }
    });
    socket.on('leave', (organizationId) => {
      if (organizationId) socket.leave(`org:${organizationId}`);
    });
  });

  wireDomainEvents();
  return io;
}

function emitToOrg(organizationId, event, payload) {
  if (!io || !organizationId) return;
  io.to(`org:${organizationId}`).emit(event, payload);
}

// Bridges internal domain events onto the WebSocket transport using the standardized event names.
function wireDomainEvents() {
  eventBus.on(EVENTS.MONITOR_UPDATED, ({ organizationId, monitor }) => emitToOrg(organizationId, 'monitor.updated', monitor));
  eventBus.on(EVENTS.HEALTHCHECK_COMPLETED, ({ organizationId, healthCheck }) => emitToOrg(organizationId, 'healthcheck.completed', healthCheck));
  eventBus.on(EVENTS.INCIDENT_OPENED, ({ organizationId, incident }) => emitToOrg(organizationId, 'incident.opened', incident));
  eventBus.on(EVENTS.INCIDENT_CLOSED, ({ organizationId, incident }) => emitToOrg(organizationId, 'incident.closed', incident));
  eventBus.on(EVENTS.NOTIFICATION_SENT, ({ organizationId, notification }) => emitToOrg(organizationId, 'notification.sent', notification));
  eventBus.on(EVENTS.SSLCERTIFICATE_EXPIRING, ({ organizationId, sslCertificate }) => emitToOrg(organizationId, 'sslcertificate.expiring', sslCertificate));
  eventBus.on(EVENTS.DOMAIN_EXPIRING, ({ organizationId, domain }) => emitToOrg(organizationId, 'domain.expiring', domain));
}

module.exports = { initWebsocket, emitToOrg };
