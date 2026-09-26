const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');

function buildApp(overrides = {}) {
  return createApp({ config: { ...loadConfig(), ...overrides } });
}

async function registerAndLogin(app, username = 'alice', password = 'Correct-horse-1') {
  await request(app).post('/api/auth/register').send({ username, password }).expect(201);
  const res = await request(app).post('/api/auth/login').send({ username, password }).expect(200);
  return res.body.token;
}

module.exports = { buildApp, registerAndLogin };
