# Complete AI Auto-Generation Workflow

## Phase 1: MCP Session Analysis

### 1. Analyze MCP Session

Review all `mcp0_browser_*` commands and their sequence:

- Identify navigation path and page transitions
- Extract element interactions and their sequence
- Note any conditional logic or multiple paths
- Determine the main user workflow being tested

### 2. Extract Navigation Flow

From MCP session, identify:

- Starting page/URL from `mcp0_browser_navigate()`
- Menu navigation from `mcp0_browser_click()` actions
- Form interactions from `mcp0_browser_type()` and `mcp0_browser_select_option()`
- Verification points from `mcp0_browser_snapshot()` calls

## Phase 2: Test Implementation - MANDATORY STEPS

### 3. Create Gherkin Scenario in Feature File

Add scenario to **existing** feature file in `src/mfe_packages/{mfeName}/tests/`:

```gherkin
# Example: Add to existing reportDetail.feature
Scenario: Add devices widget to executive summary report
  When I navigate to 'Executive_summary' tab
  And I click on add item button
  And I select "devices" widget from widget gallery
  Then I should see that "devices" widget is added
```

### 4. Create Step Definitions

**CRITICAL**: Create step definitions in `tests/steps/{section}.steps.ts`:

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

When('I click on add item button', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.clickAddItemButton();
});
```

### 5. MANDATORY: Create Page Object Methods in ui/pages/ Directory

**CRITICAL**: Implement actual functionality in page object files:

```typescript
// In ui/pages/executive-summary-page.ts
async clickAddItemButton(): Promise<void> {
  await this.clickElement(REPORT_PAGE.ADD_ITEM_BUTTON);
  this.log('[ACTION] Clicked add item button in executive summary');
}
```

**CRITICAL RULE - NEVER VIOLATE**
**Page Objects = ACTIONS ONLY. NO VERIFICATION METHODS ALLOWED.**

- FORBIDDEN: `verify*()`, `assert*()`, `check*()` methods in page objects
- FORBIDDEN: Any assertions or expect statements in page object methods
- ALLOWED: `click*()`, `fill*()`, `navigate*()`, `delete*()`, `add*()` - action methods only
- VERIFICATION GOES IN: Step definitions (`Then` steps) ONLY
- See: [Page Object Patterns](page-object-patterns.md) for full details

### 6. Create/Update Locators - FOLLOW REAL DOM EXTRACTION

**MANDATORY**: Follow [Locator Generation Rules](locator-generation.md) for real DOM extraction:

Priority order for locator generation:

1. **qa-class attributes** (highest priority): `//button[contains(@class,'qa-button')]`
2. **Exact class combinations**: `//button[contains(@class, 'qa-button') and contains(@class, 'am-button_variant_primary')]`
3. **data-testid attributes**: `//button[@data-testid='add-widget-btn']`
4. **Text + element type**: `//button[contains(text(), 'Add item')]`
5. **MCP ref evaluation** (last resort): Extract real DOM attributes

**CRITICAL**:

- NEVER use `//generic[...]` elements
- ALWAYS use real HTML elements: `button`, `div`, `input`, `span`
- Extract exact classes from MCP DOM data
- Document MCP source in comments

### 7. Add Page Object Fixtures

Register page objects in `tests/fixtures/fixtures.ts` via `test.extend()`:

```typescript
executiveSummaryPage: async ({ page }, use) => {
  await use(new ExecutiveSummaryPage(page));
},
```

### 8. Include Verification

Add `expect()` assertions in `Then` steps and `expectWithScreenshot()` calls for visual validations

## Phase 3: Generate and Run Tests

### 9. Generate Test Files

```bash
npx bddgen
```

This auto-generates `.spec.ts` files from `.feature` files.

### 10. Run Tests

```bash
npx playwright test --project=chromium
```

## Quality Checks for Generated Tests

- Ensure all custom framework methods are used (from `BasePage`)
- Verify page objects are injected via fixtures
- Confirm locators follow qa-class priority hierarchy
- Include appropriate wait/stability checks
- Add meaningful screenshot names for debugging
- Follow existing naming conventions throughout

## Framework Integration Requirements

- Always use existing methods when possible
- Follow BDD patterns with proper Gherkin syntax
- Use page object fixtures for test context
- Reference framework locators from `locators.ts`
- Include proper error handling with screenshots on failures
