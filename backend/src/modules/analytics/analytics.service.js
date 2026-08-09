const { HealthCheck, Incident, Monitor } = require('../../models');

function parseRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

async function overview(organizationId, query) {
  const { from, to } = parseRange(query);
  const [totalMonitors, activeMonitors, openIncidents, checksInRange] = await Promise.all([
    Monitor.countDocuments({ organizationId, deletedAt: null }),
    Monitor.countDocuments({ organizationId, deletedAt: null, enabled: true }),
    Incident.countDocuments({ organizationId, status: 'open', deletedAt: null }),
    HealthCheck.countDocuments({ organizationId, completedAt: { $gte: from, $lte: to } }),
  ]);

  const uptimeAgg = await HealthCheck.aggregate([
    { $match: { organizationId, completedAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: 1 }, healthy: { $sum: { $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0] } } } },
  ]);
  const uptimePercentage = uptimeAgg[0] ? (uptimeAgg[0].healthy / uptimeAgg[0].total) * 100 : 100;

  return { totalMonitors, activeMonitors, openIncidents, checksInRange, uptimePercentage: Number(uptimePercentage.toFixed(3)), range: { from, to } };
}

async function uptime(organizationId, query) {
  const { from, to } = parseRange(query);
  const match = { organizationId, completedAt: { $gte: from, $lte: to } };
  if (query.monitorId) match.monitorId = query.monitorId;

  const daily = await HealthCheck.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        total: { $sum: 1 },
        healthy: { $sum: { $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0] } },
      },
    },
    { $project: { date: '$_id', _id: 0, total: 1, healthy: 1, uptimePercentage: { $multiply: [{ $divide: ['$healthy', '$total'] }, 100] } } },
    { $sort: { date: 1 } },
  ]);

  return { range: { from, to }, daily };
}

async function latency(organizationId, query) {
  const { from, to } = parseRange(query);
  const match = { organizationId, completedAt: { $gte: from, $lte: to } };
  if (query.monitorId) match.monitorId = query.monitorId;

  const daily = await HealthCheck.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $project: { date: '$_id', _id: 0, avgResponseTime: { $round: ['$avgResponseTime', 0] } } },
    { $sort: { date: 1 } },
  ]);

  return { range: { from, to }, daily };
}

async function incidentsAnalytics(organizationId, query) {
  const { from, to } = parseRange(query);
  const match = { organizationId, startedAt: { $gte: from, $lte: to }, deletedAt: null };

  const [bySeverity, mttrAgg, total] = await Promise.all([
    Incident.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    Incident.aggregate([
      { $match: { ...match, status: 'closed', duration: { $ne: null } } },
      { $group: { _id: null, avgDurationMs: { $avg: '$duration' } } },
    ]),
    Incident.countDocuments(match),
  ]);

  return {
    range: { from, to },
    total,
    bySeverity: bySeverity.map((s) => ({ severity: s._id, count: s.count })),
    meanTimeToResolutionMs: mttrAgg[0] ? Math.round(mttrAgg[0].avgDurationMs) : null,
  };
}

module.exports = { overview, uptime, latency, incidentsAnalytics };
