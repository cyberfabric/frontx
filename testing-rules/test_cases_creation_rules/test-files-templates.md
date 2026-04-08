# Test Files Templates

## Overview

With `playwright-bdd`, test files (`.spec.ts`) are **auto-generated** by running `npx bddgen`. You do NOT write them manually. Instead, you write:

1. **Feature files** (`.feature`) — Gherkin scenarios
2. **Step definitions** (`*.steps.ts`) — TypeScript implementations of Given/When/Then

The `npx bddgen` command reads feature files and generates corresponding `.spec.ts` files automatically.

## What You Write Manually

### 1. Feature File

```gherkin
# src/mfe_packages/demo-mfe/tests/reportDetail.feature
@feature:demo-mfe
Feature: Report Detail Widget Management

  Background:
    Given the application is open

  Scenario: Add devices widget to executive summary report
    When I navigate to "Reports" menu
    And I click on add item button
    And I select "devices" widget from widget gallery
    Then I should see that "devices" widget is added
```

### 2. Step Definitions

```typescript
// tests/steps/report-detail.steps.ts
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

Given('the application is open', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

When('I navigate to {string} menu', async ({ reportsPage }, menu: string) => {
  await reportsPage.navigateToMenu(menu);
});

When('I click on add item button', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.clickAddItemButton();
});

When('I select {string} widget from widget gallery', async ({ executiveSummaryPage }, widget: string) => {
  await executiveSummaryPage.selectWidgetFromGallery(widget);
});

Then('I should see that {string} widget is added', async ({ executiveSummaryPage }, widget: string) => {
  const isVisible = await executiveSummaryPage.isWidgetVisible(widget);
  expect(isVisible).toBe(true);
});
```

### 3. Auto-Generated Test File (by npx bddgen)

The generated `.spec.ts` files look like this (DO NOT edit manually):

```typescript
// .features-gen/reportDetail.feature.spec.ts (auto-generated)
import { test } from '../fixtures/fixtures';

test.describe('Report Detail Widget Management', () => {
  test.beforeEach(async ({ Given, page }) => {
    await Given('the application is open');
  });

  test('Add devices widget to executive summary report', async ({ When, Then }) => {
    await When('I navigate to "Reports" menu');
    await When('I click on add item button');
    await When('I select "devices" widget from widget gallery');
    await Then('I should see that "devices" widget is added');
  });
});
```

## Naming Conventions

### Feature File Naming

- **Pattern**: `{screenId}.feature` or `{mfeName}.feature`
- **Location**: `src/mfe_packages/{mfeName}/tests/*.feature`
- **Examples**:
  - `src/mfe_packages/demo-mfe/tests/helloworld.feature`
  - `src/mfe_packages/demo-mfe/tests/profile.feature`

### Step Definition File Naming

- **Pattern**: `{section}.steps.ts`
- **Location**: `tests/steps/`
- **Examples**:
  - `tests/steps/report-detail.steps.ts`
  - `tests/steps/cyber-chat.steps.ts`
  - `tests/steps/common.steps.ts` (shared steps)

## Tags and Filtering

Use Gherkin tags in feature files for filtering tests:

```gherkin
@smoke
Feature: Basic Navigation

@report_detail @widget
Scenario: Add widget to report
  ...
```

Run filtered tests:

```bash
npx bddgen && npx playwright test --grep "@smoke"
```

## Running Tests

```bash
# Generate .spec.ts from .feature files, then run tests
npx bddgen && npx playwright test --project=chromium

# Run specific feature
npx bddgen && npx playwright test reportDetail --project=chromium

# Run with UI mode
npx bddgen && npx playwright test --ui

# Run smoke tests (no bddgen needed — plain Playwright test)
npx playwright test smoke.spec.ts --project=chromium
```

## Quality Checks

- [ ] Feature files have **ONE** `Feature:` per file
- [ ] Feature files live in `src/mfe_packages/{mfeName}/tests/`
- [ ] Step definitions import `createBdd` from `playwright-bdd`
- [ ] Step definitions use fixture injection for page objects (NOT global singletons)
- [ ] All locators come from `tests/ui/locators.ts` — NEVER inline XPath
- [ ] `When` steps have NO logging — just call page object methods
- [ ] `Then` steps have verification logic with `expect()`
- [ ] Page objects imported via fixtures, not direct imports in steps
