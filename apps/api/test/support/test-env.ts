export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgresql://notifications:notifications@localhost:5440/notification_center_test',
  JWT_SECRET: 'test-only-secret-never-used-outside-the-test-suite',
  JWT_EXPIRES_IN_SECONDS: '3600',
  TRUST_PROXY_HOPS: '0',
  CORS_ORIGINS: 'http://localhost:3000',
};
