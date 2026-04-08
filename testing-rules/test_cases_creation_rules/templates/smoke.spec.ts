/**
 * Smoke test to verify test infrastructure is set up correctly.
 *
 * This test validates that:
 * - Playwright is working
 * - the application is accessible at http://localhost:5173/
 * - basic page operations work
 *
 * Run with: npx playwright test smoke.spec.ts --project=chromium
 *
 * IMPORTANT: Make sure your dev server is running on http://localhost:5173/ before running.
 * Start it with: npm run dev
 */
import { test, expect } from '@playwright/test';

test('Playwright is working', async () => {
  expect(true).toBe(true);
});

test('Application is accessible', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/localhost:5173/);
});

test('Page loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});
