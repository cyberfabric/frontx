import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * BDD configuration for playwright-bdd.
 * Maps feature files to step definition files.
 */
const bddTestDir = defineBddConfig({
  features: '../src/mfe_packages/*/tests/*.feature',
  steps: ['steps/*.steps.ts', 'fixtures/fixtures.ts'],
  featuresRoot: '..',
});

export default defineConfig({
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: false,
    viewport: { width: 1280, height: 1080 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
  },

  projects: [
    /* BDD tests (from .feature files via bddgen) */
    {
      name: 'chromium',
      testDir: bddTestDir,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: bddTestDir,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: bddTestDir,
      use: { ...devices['Desktop Safari'] },
    },
    /* Smoke & standalone tests (plain .spec.ts files) */
    {
      name: 'smoke',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
