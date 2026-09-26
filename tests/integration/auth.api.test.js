const request = require('supertest');
const { buildApp } = require('../helpers');

describe('auth API', () => {
  test('registers, rejects a duplicate, then logs in', async () => {
    const app = buildApp();
    const creds = { username: 'carol', password: 'Secret-pass-9' };

    const reg = await request(app).post('/api/auth/register').send(creds).expect(201);
    expect(reg.body).not.toHaveProperty('passwordHash');

    await request(app).post('/api/auth/register').send(creds).expect(409);

    const login = await request(app).post('/api/auth/login').send(creds).expect(200);
    expect(login.body).toMatchObject({ tokenType: 'Bearer', token: expect.any(String) });
  });

  test('returns 400 for invalid registration input', async () => {
    const res = await request(buildApp()).post('/api/auth/register').send({ username: 'x', password: '1' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 401 for bad credentials', async () => {
    await request(buildApp()).post('/api/auth/login').send({ username: 'ghost', password: 'Whatever-123' }).expect(401);
  });

  test('rate limits repeated auth attempts', async () => {
    const app = buildApp({ authRateLimitMax: 3 });
    const attempt = () => request(app).post('/api/auth/login').send({ username: 'ghost', password: 'Whatever-123' });
    for (let i = 0; i < 3; i += 1) await attempt().expect(401);
    await attempt().expect(429);
  });
});
