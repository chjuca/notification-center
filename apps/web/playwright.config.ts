import { defineConfig } from "@playwright/test";

const WEB_URL = "http://localhost:3100";
const API_URL = "http://localhost:3101";
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://notifications:notifications@localhost:5440/notification_center_test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter api build && pnpm --filter api start:prod",
      url: `${API_URL}/docs`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: "test",
        PORT: "3101",
        DATABASE_URL: TEST_DATABASE_URL,
        JWT_SECRET: "test-only-secret-never-used-outside-the-test-suite",
        CORS_ORIGINS: WEB_URL,
      },
    },
    {
      command: "pnpm build && pnpm exec next start --port 3100",
      url: `${WEB_URL}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
