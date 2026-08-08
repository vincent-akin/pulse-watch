module.exports = {
  ROLES: ['owner', 'admin', 'engineer', 'viewer'],
  MONITOR_STATUSES: ['draft', 'active', 'paused', 'archived'],
  MONITOR_HEALTH: ['healthy', 'degraded', 'unhealthy', 'unknown'],
  INCIDENT_STATUSES: ['open', 'closed'],
  INCIDENT_SEVERITIES: ['critical', 'major', 'minor'],
  NOTIFICATION_CHANNEL_TYPES: ['email', 'slack', 'discord', 'webhook'],
  ENVIRONMENTS: ['production', 'staging', 'development'],
  SSL_STATUSES: ['valid', 'expiring-soon', 'expired'],
  DOMAIN_STATUSES: ['active', 'expiring-soon', 'expired'],
  MUTABLE_ETAG_RESOURCES: ['monitors', 'notificationChannels', 'statusPages', 'organizations'],
};
