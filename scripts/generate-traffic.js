const base = process.argv[2] || 'http://localhost:3000';
const seconds = Number(process.argv[3] || 60);

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function main() {
  const creds = { username: `load_${Date.now()}`, password: 'Load-test-pass-1' };
  await post('/api/auth/register', creds);
  const { token } = await post('/api/auth/login', creds);
  const auth = { Authorization: `Bearer ${token}` };
  const stopAt = Date.now() + seconds * 1000;
  let sent = 0;

  while (Date.now() < stopAt) {
    const task = await post('/api/tasks', { title: `Load task ${sent}` }, token);
    await fetch(`${base}/api/tasks`, { headers: auth });
    await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE', headers: auth });
    await fetch(`${base}/api/tasks/does-not-exist`, { headers: auth });
    sent += 4;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.log(`Sent ${sent} requests over ${seconds}s`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
