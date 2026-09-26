const { notFound } = require('../utils/errors');

function notFoundHandler(req, _res, next) {
  next(notFound(`route ${req.method} ${req.path} not found`));
}

function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'request body is not valid JSON' } });
  }
  const status = err.status || 500;
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', message: err.message, stack: err.stack, path: req.path }));
  }

  const message = status >= 500 ? 'internal server error' : err.message;
  return res.status(status).json({ error: { code: err.code || 'ERROR', message } });
}

module.exports = { notFoundHandler, errorHandler };
