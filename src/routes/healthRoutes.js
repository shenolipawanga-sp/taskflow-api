const express = require('express');

function createHealthRouter({ config, store, metrics }) {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ service: 'taskflow-api', version: config.version, environment: config.appEnv });
  });


  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'taskflow-api',
      version: config.version,
      environment: config.appEnv,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  router.get('/ready', (_req, res) => {
    const ready = store.ping();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });

  router.get('/metrics', async (_req, res, next) => {
    try {
      res.set('Content-Type', metrics.register.contentType);
      res.end(await metrics.register.metrics());
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createHealthRouter };
