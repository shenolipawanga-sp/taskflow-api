const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();
const app = createApp({ config });

const server = app.listen(config.port, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `taskflow-api ${config.version} listening`,
    port: config.port,
    environment: config.appEnv,
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', message: `${signal} received, shutting down` }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
