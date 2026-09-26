const { loadConfig } = require('../../src/config');

describe('loadConfig', () => {
  test('uses defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ port: 3000, appEnv: 'development', rateLimitMax: 300, logRequests: true });
    expect(config.jwtSecret).toHaveLength(64);
  });

  test('reads values from the environment', () => {
    const config = loadConfig({ PORT: '8080', APP_ENV: 'staging', APP_VERSION: '1.0.7', LOG_REQUESTS: 'false', RATE_LIMIT_MAX: 'abc' });
    expect(config).toMatchObject({ port: 8080, appEnv: 'staging', version: '1.0.7', logRequests: false, rateLimitMax: 300 });
  });

  test('refuses to start in production without a JWT secret', () => {
    expect(() => loadConfig({ APP_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });
});
