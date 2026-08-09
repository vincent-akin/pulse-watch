const { Worker } = require('bullmq');
const { connectMongo } = require('../config/db');
const { getRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../config/logger');
const { Incident, Monitor, HealthCheck } = require('../models');
const { generateIncidentAnalysis } = require('../integrations/ai');

async function main() {
  await connectMongo();
  const connection = getRedisConnection();

  // Non-blocking by design (PRD §11): this worker runs asynchronously well after incident closure.
  const worker = new Worker(
    QUEUE_NAMES.AI_SUMMARY,
    async (job) => {
      const incident = await Incident.findById(job.data.incidentId);
      if (!incident) return { skipped: true };
      const monitor = await Monitor.findById(incident.monitorId);
      const recentHealthChecks = await HealthCheck.find({ monitorId: incident.monitorId }).sort({ completedAt: -1 }).limit(20);

      const analysis = await generateIncidentAnalysis({ monitor, incident, recentHealthChecks });
      if (analysis.summary || analysis.findings.length || analysis.suggestedFixes.length) {
        incident.aiSummary = analysis.summary;
        incident.aiRootCause = { confidence: analysis.confidence, findings: analysis.findings };
        incident.aiSuggestedFixes = analysis.suggestedFixes;
        incident.aiAnalyzedAt = new Date();
        await incident.save();
      }
      return { analyzed: !!analysis.summary };
    },
    { connection, concurrency: 5 }
  );

  worker.on('failed', (job, err) => logger.error('ai-summary job failed', { jobId: job?.id, err: err.message }));
  logger.info('AI worker started.');
}

if (require.main === module) main().catch((err) => { logger.error('Worker crashed', { err }); process.exit(1); });

module.exports = { main };
