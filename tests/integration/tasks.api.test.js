const request = require('supertest');
const { buildApp, registerAndLogin } = require('../helpers');

describe('tasks API', () => {
  let app;
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = buildApp();
    token = await registerAndLogin(app);
  });

  test('requires a valid bearer token', async () => {
    await request(app).get('/api/tasks').expect(401);
    await request(app).get('/api/tasks').set('Authorization', 'Bearer not-a-token').expect(401);
    await request(app).get('/api/tasks').set('Authorization', `Basic ${token}`).expect(401);
  });

  test('supports the full create, read, update, delete cycle', async () => {
    const created = await request(app).post('/api/tasks').set(auth())
      .send({ title: 'Configure Jenkins', priority: 'high' }).expect(201);
    const id = created.body.id;

    await request(app).get(`/api/tasks/${id}`).set(auth()).expect(200)
      .expect((res) => expect(res.body.title).toBe('Configure Jenkins'));

    const patched = await request(app).patch(`/api/tasks/${id}`).set(auth()).send({ status: 'done' }).expect(200);
    expect(patched.body.status).toBe('done');

    await request(app).delete(`/api/tasks/${id}`).set(auth()).expect(204);
    await request(app).get(`/api/tasks/${id}`).set(auth()).expect(404);
  });

  test('filters the task list and rejects bad filters', async () => {
    await request(app).post('/api/tasks').set(auth()).send({ title: 'A', status: 'done' }).expect(201);
    await request(app).post('/api/tasks').set(auth()).send({ title: 'B' }).expect(201);

    const done = await request(app).get('/api/tasks?status=done').set(auth()).expect(200);
    expect(done.body.map((t) => t.title)).toEqual(['A']);

    await request(app).get('/api/tasks?status=bogus').set(auth()).expect(400);
  });

  test('returns summary stats', async () => {
    await request(app).post('/api/tasks').set(auth()).send({ title: 'Old', dueDate: '2020-01-01' }).expect(201);
    const res = await request(app).get('/api/tasks/stats').set(auth()).expect(200);
    expect(res.body).toEqual({ total: 1, byStatus: { todo: 1, in_progress: 0, done: 0 }, overdue: 1 });
  });

  test('validates task input', async () => {
    await request(app).post('/api/tasks').set(auth()).send({ priority: 'high' }).expect(400);
    await request(app).post('/api/tasks').set(auth()).send({ title: 'x', ownerId: 'hijack' }).expect(400);
  });

  test('keeps users\' tasks separate', async () => {
    const created = await request(app).post('/api/tasks').set(auth()).send({ title: 'Mine' }).expect(201);
    const otherToken = await registerAndLogin(app, 'mallory');
    const other = { Authorization: `Bearer ${otherToken}` };

    await request(app).get(`/api/tasks/${created.body.id}`).set(other).expect(404);
    await request(app).delete(`/api/tasks/${created.body.id}`).set(other).expect(404);
    const list = await request(app).get('/api/tasks').set(other).expect(200);
    expect(list.body).toEqual([]);
  });

  test('hides internal error details behind a generic 500', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { createApp } = require('../../src/app');
    const { createMemoryStore } = require('../../src/store/memoryStore');
    const { loadConfig } = require('../../src/config');
    const store = createMemoryStore();
    store.listTasks = () => { throw new Error('disk on fire'); };
    const brokenApp = createApp({ config: loadConfig(), store });
    const brokenToken = await registerAndLogin(brokenApp, 'dave');

    const res = await request(brokenApp).get('/api/tasks').set('Authorization', `Bearer ${brokenToken}`).expect(500);
    expect(res.body.error.message).toBe('internal server error');
    expect(JSON.stringify(res.body)).not.toMatch(/disk on fire/);
    errorSpy.mockRestore();
  });
});
