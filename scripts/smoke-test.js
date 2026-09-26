const base = process.argv[2] || 'http://localhost:3000';
const expectedEnv = process.argv[3];

async function call(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

function check(condition, description) {
  if (!condition) throw new Error(description);
  console.log(`  pass  ${description}`);
}

async function main() {
  console.log(`Smoke testing ${base}`);
  const health = await call('GET', '/health');
  check(health.status === 200 && health.data.status === 'ok', 'health endpoint reports ok');
  if (expectedEnv) check(health.data.environment === expectedEnv, `running in the ${expectedEnv} environment`);

  const creds = { username: `smoke_${Date.now()}`, password: 'Smoke-test-pass-1' };
  check((await call('POST', '/api/auth/register', { body: creds })).status === 201, 'user can register');
  const login = await call('POST', '/api/auth/login', { body: creds });
  check(login.status === 200 && Boolean(login.data.token), 'user can log in and receives a token');
  const token = login.data.token;

  check((await call('GET', '/api/tasks')).status === 401, 'task API rejects anonymous requests');

  const created = await call('POST', '/api/tasks', { token, body: { title: 'Smoke test task', priority: 'high' } });
  check(created.status === 201, 'task can be created');
  const id = created.data.id;

  check((await call('PATCH', `/api/tasks/${id}`, { token, body: { status: 'done' } })).data.status === 'done', 'task can be updated');
  check((await call('GET', '/api/tasks/stats', { token })).data.byStatus.done === 1, 'stats reflect the update');
  check((await call('DELETE', `/api/tasks/${id}`, { token })).status === 204, 'task can be deleted');
  check((await call('GET', `/api/tasks/${id}`, { token })).status === 404, 'deleted task is gone');

  const metrics = await fetch(`${base}/metrics`).then((r) => r.text());
  check(metrics.includes('http_requests_total'), 'metrics endpoint is serving Prometheus data');
}

main()
  .then(() => console.log('Smoke test passed'))
  .catch((err) => {
    console.error(`Smoke test FAILED: ${err.message}`);
    process.exit(1);
  });
