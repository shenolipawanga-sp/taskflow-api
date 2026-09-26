const shared = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup-env.js'],
};

module.exports = {
  projects: [
    { ...shared, displayName: 'unit', testMatch: ['<rootDir>/tests/unit/**/*.test.js'] },
    { ...shared, displayName: 'integration', testMatch: ['<rootDir>/tests/integration/**/*.test.js'] },
  ],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'cobertura'],
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'junit.xml',
      suiteNameTemplate: '{displayName} - {filepath}',
      classNameTemplate: '{displayName}.{classname}',
      titleTemplate: '{title}',
    }],
  ],
};
