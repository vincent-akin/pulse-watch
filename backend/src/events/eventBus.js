const { EventEmitter } = require('events');

// Internal domain event bus. Modules publish/subscribe instead of calling each other directly
// (SSD §14 Event-Driven Architecture). Event names: resource.action, dot-separated, no hyphens.
class DomainEventBus extends EventEmitter {}

const eventBus = new DomainEventBus();
eventBus.setMaxListeners(50);

const EVENTS = Object.freeze({
  MONITOR_CREATED: 'monitor.created',
  MONITOR_UPDATED: 'monitor.updated',
  MONITOR_DELETED: 'monitor.deleted',
  HEALTHCHECK_STARTED: 'healthcheck.started',
  HEALTHCHECK_COMPLETED: 'healthcheck.completed',
  INCIDENT_OPENED: 'incident.opened',
  INCIDENT_CLOSED: 'incident.closed',
  NOTIFICATION_SENT: 'notification.sent',
  ORGANIZATION_CREATED: 'organization.created',
  MEMBER_INVITED: 'member.invited',
  SSLCERTIFICATE_EXPIRING: 'sslcertificate.expiring',
  DOMAIN_EXPIRING: 'domain.expiring',
});

module.exports = { eventBus, EVENTS };
