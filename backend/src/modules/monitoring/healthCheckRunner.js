const http = require('http');
const https = require('https');
const { URL } = require('url');
const { performance } = require('perf_hooks');

// Executes a single monitor check over real HTTP(S), capturing granular timing
// (DNS lookup, TCP connect, TLS handshake, TTFB, total response time) via socket + response events.
// This is the heart of the Health Check Engine (PRD §11 / SSD "Monitoring Module").
function buildRequestOptions(monitor) {
  const target = new URL(monitor.url);
  if (Object.keys(monitor.queryParameters || {}).length) {
    Object.entries(monitor.queryParameters).forEach(([k, v]) => target.searchParams.set(k, v));
  }

  const headers = { 'User-Agent': 'PulseWatch-Monitor/1.0', ...(monitor.headers || {}) };
  if (monitor.authentication?.type === 'bearer' && monitor.authentication.credentials?.token) {
    headers.Authorization = `Bearer ${monitor.authentication.credentials.token}`;
  } else if (monitor.authentication?.type === 'basic' && monitor.authentication.credentials?.username) {
    const { username, password } = monitor.authentication.credentials;
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password || ''}`).toString('base64')}`;
  } else if (monitor.authentication?.type === 'apiKey' && monitor.authentication.credentials?.headerName) {
    headers[monitor.authentication.credentials.headerName] = monitor.authentication.credentials.value;
  }

  return { target, headers };
}

function getByPath(obj, path) {
  // Tiny JSONPath-lite resolver: "$.a.b[0].c"
  const cleanPath = path.replace(/^\$\.?/, '');
  const tokens = cleanPath.split(/\.|\[(\d+)\]/).filter((t) => t !== undefined && t !== '');
  return tokens.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function evaluateRule(rule, body) {
  const actual = getByPath(body, rule.path);
  switch (rule.operator) {
    case 'exists': return actual !== undefined;
    case 'equals': return JSON.stringify(actual) === JSON.stringify(rule.expected);
    case 'notEquals': return JSON.stringify(actual) !== JSON.stringify(rule.expected);
    case 'contains': return typeof actual === 'string' && actual.includes(rule.expected);
    case 'greaterThan': return Number(actual) > Number(rule.expected);
    case 'lessThan': return Number(actual) < Number(rule.expected);
    default: return true;
  }
}

function validateResponse(monitor, statusCode, rawBody) {
  if (monitor.expectedStatusCode && statusCode !== monitor.expectedStatusCode) {
    return { passed: false, reason: `Expected status ${monitor.expectedStatusCode}, got ${statusCode}.` };
  }
  if (!monitor.validationRules || monitor.validationRules.length === 0) return { passed: true };

  let parsedBody = rawBody;
  try { parsedBody = JSON.parse(rawBody); } catch { /* non-JSON body; rules requiring JSON simply fail below */ }

  for (const rule of monitor.validationRules) {
    if (!evaluateRule(rule, parsedBody)) {
      return { passed: false, reason: `Validation rule failed: ${rule.path} ${rule.operator} ${JSON.stringify(rule.expected)}` };
    }
  }
  return { passed: true };
}

function executeOnce(monitor) {
  return new Promise((resolve) => {
    const { target, headers } = buildRequestOptions(monitor);
    const isHttps = target.protocol === 'https:';
    const lib = isHttps ? https : http;

    const timings = { dnsLookup: null, tcpConnect: null, tlsHandshake: null, ttfb: null };
    const tStart = performance.now();
    let tDnsStart = null, tConnectStart = null;

    const reqOptions = {
      method: monitor.method,
      headers,
      timeout: monitor.timeout,
      agent: new lib.Agent({ keepAlive: false }),
    };

    const req = lib.request(target, reqOptions, (res) => {
      const chunks = [];
      let ttfbCaptured = false;

      res.on('data', (chunk) => {
        if (!ttfbCaptured) {
          timings.ttfb = Math.round(performance.now() - tStart);
          ttfbCaptured = true;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const completedAt = new Date();
        const responseTime = Math.round(performance.now() - tStart);
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const { passed, reason } = validateResponse(monitor, res.statusCode, rawBody);

        resolve({
          success: true,
          statusCode: res.statusCode,
          startedAt: new Date(completedAt.getTime() - responseTime),
          completedAt,
          responseTime,
          responseSize: Buffer.byteLength(rawBody),
          validationPassed: passed,
          failureReason: passed ? null : reason,
          ...timings,
        });
      });
    });

    req.on('socket', (socket) => {
      socket.on('lookup', () => { tDnsStart = performance.now(); timings.dnsLookup = Math.round(tDnsStart - tStart); });
      socket.on('connect', () => {
        tConnectStart = performance.now();
        timings.tcpConnect = Math.round(tConnectStart - (tDnsStart || tStart));
      });
      socket.on('secureConnect', () => {
        timings.tlsHandshake = Math.round(performance.now() - (tConnectStart || tStart));
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: null,
        startedAt: new Date(Date.now() - monitor.timeout),
        completedAt: new Date(),
        responseTime: monitor.timeout,
        validationPassed: false,
        failureReason: 'Request timed out.',
        ...timings,
      });
    });

    req.on('error', (err) => {
      const responseTime = Math.round(performance.now() - tStart);
      resolve({
        success: false,
        statusCode: null,
        startedAt: new Date(Date.now() - responseTime),
        completedAt: new Date(),
        responseTime,
        validationPassed: false,
        failureReason: err.message,
        ...timings,
      });
    });

    if (monitor.body && ['POST', 'PUT', 'PATCH'].includes(monitor.method)) {
      const payload = typeof monitor.body === 'string' ? monitor.body : JSON.stringify(monitor.body);
      req.setHeader('Content-Type', req.getHeader('Content-Type') || 'application/json');
      req.write(payload);
    }
    req.end();
  });
}

module.exports = { executeOnce };
