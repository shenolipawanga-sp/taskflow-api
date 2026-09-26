function requestLogger(enabled) {
  return (req, res, next) => {
    if (!enabled || req.path === '/metrics') return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : 'info',
        time: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      }));
    });
    return next();
  };
}

module.exports = { requestLogger };
