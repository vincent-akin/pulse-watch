const { Incident, HealthCheck, Notification } = require('../../models');
const AppError = require('../../common/AppError');
const { eventBus, EVENTS } = require('../../events/eventBus');
const { getQueue, QUEUE_NAMES } = require('../../queues');
const { recordAudit } = require('../audit/audit.service');

// Incident lifecycle (DMBR): Healthy → Failure Detected → Retries → Incident Open → Recovery Detected → Incident Closed.
// "One active incident per monitor" is enforced by looking up the current open incident before creating a new one.
async function handleHealthCheckResult(monitor, healthCheck) {
  const openIncident = await Incident.findOne({ monitorId: monitor._id, status: 'open', deletedAt: null });

  if (healthCheck.status === 'unhealthy') {
    if (openIncident) {
      openIncident.failureCount += 1;
      await openIncident.save();
      return openIncident;
    }

    // Configurable retry count before opening an incident (retryPolicy.attempts).
    const recentFailures = await HealthCheck.find({ monitorId: monitor._id })
      .sort({ completedAt: -1 })
      .limit(monitor.retryPolicy?.attempts || 3);

    const allRecentUnhealthy = recentFailures.length >= (monitor.retryPolicy?.attempts || 3)
      && recentFailures.every((h) => h.status === 'unhealthy');

    if (!allRecentUnhealthy) return null; // still within retry grace window

    const incident = await Incident.create({
      organizationId: monitor.organizationId,
      monitorId: monitor._id,
      status: 'open',
      severity: healthCheck.statusCode ? 'major' : 'critical',
      startedAt: healthCheck.completedAt,
      failureReason: healthCheck.failureReason,
      failureCount: recentFailures.length,
    });

    eventBus.emit(EVENTS.INCIDENT_OPENED, { organizationId: monitor.organizationId.toString(), incident });

    // Notification Module is decoupled via the queue, per SSD event-driven architecture.
    await getQueue(QUEUE_NAMES.NOTIFICATION).add('incident.opened', { incidentId: incident._id.toString() });

    return incident;
  }

  // Recovery detected → auto-close (DMBR: "Recovery closes the incident automatically").
  if (openIncident && (healthCheck.status === 'healthy' || healthCheck.status === 'degraded')) {
    return closeIncident(openIncident, false);
  }

  return null;
}

async function closeIncident(incident, resolvedManually, actorId) {
  incident.status = 'closed';
  incident.endedAt = new Date();
  incident.duration = incident.endedAt.getTime() - incident.startedAt.getTime();
  incident.resolvedManually = resolvedManually;
  if (resolvedManually) {
    incident.acknowledgedBy = incident.acknowledgedBy || actorId;
    incident.acknowledgedAt = incident.acknowledgedAt || new Date();
  }
  await incident.save();

  eventBus.emit(EVENTS.INCIDENT_CLOSED, { organizationId: incident.organizationId.toString(), incident });
  await getQueue(QUEUE_NAMES.NOTIFICATION).add('incident.closed', { incidentId: incident._id.toString() });

  // AI summary generation is non-blocking — incident closure never waits on it (PRD §11 AI Incident Summary).
  await getQueue(QUEUE_NAMES.AI_SUMMARY).add('summarize-incident', { incidentId: incident._id.toString() });

  return incident;
}

async function listIncidents(organizationId, { skip, limit, status, severity, monitorId }) {
  const filter = { organizationId, deletedAt: null };
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (monitorId) filter.monitorId = monitorId;

  const [data, total] = await Promise.all([
    Incident.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit),
    Incident.countDocuments(filter),
  ]);
  return { data, total };
}

async function getIncident(organizationId, id) {
  const incident = await Incident.findOne({ _id: id, organizationId, deletedAt: null });
  if (!incident) throw AppError.notFound('Incident not found.');
  return incident;
}

async function acknowledgeIncident(organizationId, id, user, req) {
  const incident = await getIncident(organizationId, id);
  if (incident.status !== 'open') throw AppError.badRequest('Only open incidents can be acknowledged.');
  incident.acknowledgedBy = user._id;
  incident.acknowledgedAt = new Date();
  await incident.save();
  await recordAudit({ organizationId, userId: user._id, action: 'incident.acknowledged', resource: 'incident', resourceId: incident._id, req });
  return incident;
}

// Manual override — an engineer can force-resolve an incident (API Spec: POST /incidents/:id/resolve).
async function resolveIncidentManually(organizationId, id, user, req) {
  const incident = await getIncident(organizationId, id);
  if (incident.status !== 'open') throw AppError.badRequest('Incident is already closed.');
  const resolved = await closeIncident(incident, true, user._id);
  await recordAudit({ organizationId, userId: user._id, action: 'incident.resolved', resource: 'incident', resourceId: incident._id, req });
  return resolved;
}

async function getIncidentSummary(organizationId, id) {
  const incident = await getIncident(organizationId, id);
  return {
    aiSummary: incident.aiSummary,
    aiRootCause: incident.aiRootCause,
    aiSuggestedFixes: incident.aiSuggestedFixes,
    aiAnalyzedAt: incident.aiAnalyzedAt,
    generated: !!incident.aiAnalyzedAt,
  };
}

// Incident Timeline — assembles a single chronological view of everything that happened around
// an incident: the leading health-check signal, the open event, every notification attempt,
// acknowledgement, closure, and the AI analysis — rather than making engineers piece it together
// from four different pages. Built on read from existing collections; no new collection needed.
async function getIncidentTimeline(organizationId, id) {
  const incident = await getIncident(organizationId, id);
  const events = [];

  // Leading signal: health checks in the minutes before the incident opened, so the timeline
  // shows the degradation building up, not just the moment it crossed the retry threshold.
  const lookbackWindowMs = 15 * 60 * 1000; // 15 minutes of context before open
  const leadingChecks = await HealthCheck.find({
    monitorId: incident.monitorId,
    completedAt: { $gte: new Date(incident.startedAt.getTime() - lookbackWindowMs), $lte: incident.startedAt },
  }).sort({ completedAt: 1 }).limit(20);

  leadingChecks.forEach((hc) => {
    if (hc.status === 'healthy') return; // only surface the degradation signal, not every healthy check
    events.push({
      type: 'healthcheck',
      timestamp: hc.completedAt,
      label: hc.status === 'unhealthy' ? 'Health check failed' : 'Health check degraded',
      detail: hc.failureReason || `Response time ${hc.responseTime}ms in ${hc.region}`,
      meta: { status: hc.status, region: hc.region, responseTime: hc.responseTime, statusCode: hc.statusCode },
    });
  });

  events.push({
    type: 'incident.opened',
    timestamp: incident.startedAt,
    label: 'Incident opened',
    detail: incident.failureReason || `${incident.failureCount} consecutive failures`,
    meta: { severity: incident.severity },
  });

  const notifications = await Notification.find({ incidentId: incident._id }).sort({ createdAt: 1 });
  notifications.forEach((n) => {
    events.push({
      type: n.status === 'failed' ? 'notification.failed' : 'notification.sent',
      timestamp: n.sentAt || n.createdAt,
      label: n.status === 'failed' ? 'Notification delivery failed' : 'Notification sent',
      detail: `${n.eventType} \u2192 ${n.recipient}`,
      meta: { status: n.status, attempts: n.attempts },
    });
  });

  if (incident.acknowledgedAt) {
    events.push({
      type: 'incident.acknowledged',
      timestamp: incident.acknowledgedAt,
      label: 'Incident acknowledged',
      detail: null,
      meta: {},
    });
  }

  if (incident.endedAt) {
    events.push({
      type: 'incident.closed',
      timestamp: incident.endedAt,
      label: incident.resolvedManually ? 'Incident resolved manually' : 'Incident closed automatically (recovered)',
      detail: incident.duration ? `Duration: ${Math.round(incident.duration / 1000)}s` : null,
      meta: { resolvedManually: incident.resolvedManually },
    });
  }

  if (incident.aiAnalyzedAt) {
    events.push({
      type: 'ai.analysis',
      timestamp: incident.aiAnalyzedAt,
      label: 'AI analysis generated',
      detail: incident.aiSummary,
      meta: { confidence: incident.aiRootCause?.confidence ?? null },
    });
  }

  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { incidentId: incident._id, status: incident.status, events };
}

module.exports = {
  handleHealthCheckResult, closeIncident, listIncidents, getIncident,
  acknowledgeIncident, resolveIncidentManually, getIncidentSummary, getIncidentTimeline,
};
