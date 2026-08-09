const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');

// AI Incident Intelligence (PulseWatch AI) — generates a structured analysis from recent
// health-check history: a plain-language summary, a root-cause hypothesis with a confidence
// score and supporting evidence, and a short list of concrete suggested fixes.
// Non-blocking by design: failures here never prevent incident closure (PRD §11 AI Incident Summary).
async function generateIncidentAnalysis({ monitor, incident, recentHealthChecks }) {
  const fallback = { summary: null, confidence: null, findings: [], suggestedFixes: [] };

  if (!env.ai.apiKey) {
    logger.warn('ANTHROPIC_API_KEY not set — skipping AI incident analysis.');
    return fallback;
  }

  const historyDigest = recentHealthChecks
    .slice(0, 15)
    .map((h) => `${h.completedAt.toISOString()} status=${h.status} code=${h.statusCode ?? 'n/a'} region=${h.region} rt=${h.responseTime}ms dns=${h.dnsLookup ?? 'n/a'}ms tls=${h.tlsHandshake ?? 'n/a'}ms reason=${h.failureReason ?? 'n/a'}`)
    .join('\n');

  const prompt = `You are an SRE assistant analyzing a monitoring incident. Respond with ONLY a single valid JSON object — no markdown fences, no prose before or after — matching exactly this shape:

{
  "summary": "2-4 sentence plain-language summary of what happened, for engineers",
  "confidence": <integer 0-100, your confidence in the root cause hypothesis below>,
  "findings": ["short evidence bullet", "short evidence bullet", ...],
  "suggestedFixes": ["short actionable fix", "short actionable fix", ...]
}

Rules:
- findings: 2-5 short, specific, evidence-based bullets drawn from the data below (timing anomalies, status code patterns, failure reasons). Do not invent data not implied by the history.
- suggestedFixes: 2-5 short, concrete, actionable steps an engineer could take right now (e.g. "Restart the Redis cache", "Roll back the most recent deployment", "Renew the TLS certificate", "Increase the request timeout"). Base these on the actual failure pattern, not generic advice.
- If the data is too sparse to be confident, say so honestly in the summary and use a low confidence score rather than fabricating specifics.

Monitor: ${monitor.name} (${monitor.url})
Incident severity: ${incident.severity}
Started: ${incident.startedAt.toISOString()}
Ended: ${incident.endedAt ? incident.endedAt.toISOString() : 'ongoing'}
Failure reason logged: ${incident.failureReason || 'unknown'}
Recent health checks (most recent first):
${historyDigest}`;

  try {
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: env.ai.model,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': env.ai.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 25000,
      }
    );

    const raw = data.content?.map((c) => c.text || '').join('\n').trim() || '';
    // Claude reliably follows "JSON only" instructions, but strip markdown fences defensively
    // in case a code block slips through.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      logger.error('AI incident analysis returned non-JSON output', { incidentId: incident._id?.toString(), raw: raw.slice(0, 500) });
      return { ...fallback, summary: raw || null }; // still surface whatever text came back
    }

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      confidence: Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : null,
      findings: Array.isArray(parsed.findings) ? parsed.findings.filter((f) => typeof f === 'string').slice(0, 6) : [],
      suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes.filter((f) => typeof f === 'string').slice(0, 6) : [],
    };
  } catch (err) {
    logger.error('AI incident analysis generation failed', { err: err.message, incidentId: incident._id?.toString() });
    return fallback;
  }
}

module.exports = { generateIncidentAnalysis };
