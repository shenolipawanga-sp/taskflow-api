const request = require('supertest');
const { buildApp } = require('../helpers');

describe('service endpoints', () => {
  const app = buildApp({ appEnv: 'test', version: '9.9.9' });

  test('GET / describes the service', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.body).toEqual({ service: 'taskflow-api', version: '9.9.9', environment: 'test' });
  });

  test('GET /health reports ok with version and environment', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', version: '9.9.9', environment: 'test' });
  });

  test('GET /ready reports ready', async () => {
    await request(app).get('/ready').expect(200, { status: 'ready' });
  });

  test('GET /metrics exposes Prometheus metrics, including earlier requests', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/http_requests_total\{.*route="\/health".*\}/);
    expect(res.text).toMatch(/taskflow_build_info\{.*version="9.9.9"/);
  });

  test('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('malformed JSON returns 400 rather than crashing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username": ')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('logs requests as JSON lines when enabled', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const loggingApp = buildApp({ logRequests: true });
    await request(loggingApp).get('/health');
    await request(loggingApp).get('/metrics');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0])).toMatchObject({ method: 'GET', path: '/health', status: 200 });
    logSpy.mockRestore();
  });
});
