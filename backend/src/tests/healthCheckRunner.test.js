const http = require('http');
const { executeOnce } = require('../modules/monitoring/healthCheckRunner');

describe('healthCheckRunner.executeOnce', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === '/fail') {
        res.writeHead(500);
        res.end('error');
      }
    });
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => { server.close(done); });

  test('passes validation on expected 200 with matching JSON rule', async () => {
    const monitor = {
      url: `${baseUrl}/ok`, method: 'GET', headers: {}, queryParameters: {}, authentication: {},
      timeout: 5000, expectedStatusCode: 200,
      validationRules: [{ path: '$.success', operator: 'equals', expected: true }],
    };
    const result = await executeOnce(monitor);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.validationPassed).toBe(true);
  });

  test('fails validation on unexpected status code', async () => {
    const monitor = {
      url: `${baseUrl}/fail`, method: 'GET', headers: {}, queryParameters: {}, authentication: {},
      timeout: 5000, expectedStatusCode: 200, validationRules: [],
    };
    const result = await executeOnce(monitor);
    expect(result.statusCode).toBe(500);
    expect(result.validationPassed).toBe(false);
  });
});
