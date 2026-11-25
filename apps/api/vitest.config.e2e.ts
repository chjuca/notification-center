import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './test/support/test-env.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/support/global-setup.ts'],
    env: TEST_ENV,
  },
});
