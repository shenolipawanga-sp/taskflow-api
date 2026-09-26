const client = require('prom-client');

function resolveRoute(req) {
  if (req.route?.path) return `${req.baseUrl}${req.route.path}`;
  return 'unmatched';
}

function createMetrics({ appEnv, version }) {

  const register = new client.Registry();
  register.setDefaultLabels({ app: 'taskflow-api', env: appEnv });
  client.collectDefaultMetrics({ register });

  const httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
  });
  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [register],
  });
  const tasksCreated = new client.Counter({
    name: 'taskflow_tasks_created_total',
    help: 'Number of tasks created',
    registers: [register],
  });
  const usersRegistered = new client.Counter({
    name: 'taskflow_users_registered_total',
    help: 'Number of users registered',
    registers: [register],
  });
  const buildInfo = new client.Gauge({
    name: 'taskflow_build_info',
    help: 'Running application version',
    labelNames: ['version'],
    registers: [register],
  });
  buildInfo.set({ version }, 1);

  function middleware(req, res, next) {
    const stopTimer = httpDuration.startTimer();
    res.on('finish', () => {
      const labels = { method: req.method, route: resolveRoute(req), status: String(res.statusCode) };
      httpRequests.inc(labels);
      stopTimer(labels);
    });
    next();
  }

  return { register, middleware, tasksCreated, usersRegistered };
}

module.exports = { createMetrics };
