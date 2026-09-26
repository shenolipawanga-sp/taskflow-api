const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { loadConfig } = require('./config');
const { createMemoryStore } = require('./store/memoryStore');
const { createAuthService } = require('./services/authService');
const { createTaskService } = require('./services/taskService');
const { createMetrics } = require('./middleware/metrics');
const { requestLogger } = require('./middleware/requestLogger');
const { requireAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createHealthRouter } = require('./routes/healthRoutes');
const { createAuthRouter } = require('./routes/authRoutes');
const { createTaskRouter } = require('./routes/taskRoutes');

function limiter(max) {
  return rateLimit({ windowMs: 60 * 1000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false });
}

function createApp({ config = loadConfig(), store = createMemoryStore() } = {}) {
  const app = express();
  const metrics = createMetrics(config);
  const authService = createAuthService({ store, config });
  const taskService = createTaskService({ store, metrics });

  app.disable('x-powered-by');
  app.use(metrics.middleware);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(requestLogger(config.logRequests));

  app.use(createHealthRouter({ config, store, metrics }));
  app.use('/api', limiter(config.rateLimitMax));
  app.use('/api/auth', limiter(config.authRateLimitMax), createAuthRouter({ authService, metrics }));
  app.use('/api/tasks', requireAuth(authService), createTaskRouter({ taskService }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
