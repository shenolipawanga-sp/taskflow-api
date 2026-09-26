const crypto = require('crypto');
const pkg = require('../package.json');

function readInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function loadConfig(env = process.env) {
  const appEnv = env.APP_ENV || 'development';

  if (appEnv === 'production' && !env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }

  return {
    port: readInt(env.PORT, 3000),
    appEnv,
    version: env.APP_VERSION || pkg.version,
    jwtSecret: env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
    jwtExpiresIn: env.JWT_EXPIRES_IN || '1h',
    bcryptRounds: readInt(env.BCRYPT_ROUNDS, 10),
    rateLimitMax: readInt(env.RATE_LIMIT_MAX, 300),
    authRateLimitMax: readInt(env.AUTH_RATE_LIMIT_MAX, 20),
    logRequests: env.LOG_REQUESTS !== 'false',
  };
}

module.exports = { loadConfig };
