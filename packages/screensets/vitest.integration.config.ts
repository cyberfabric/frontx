import { defineConfig } from 'vitest/config';

/**
 * Isolated config for MFE production-build integration tests (slow: runs vite build).
 * Run: npm run test:integration
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/integration/**/*.integration.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
