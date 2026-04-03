# AI Feature File Generation Template

## Auto-Generated from MCP Navigation

```gherkin
Feature: {Feature name derived from navigation flow}
  Scenario: {Scenario name from MCP action sequence}
    Given {Initial page state from first mcp0_browser_navigate}
    When {Action sequence from mcp0_browser_click/type actions}
    And {Additional actions if multiple steps performed}
    Then {Verification from mcp0_browser_snapshot or expected results}
```

## Example based on MCP session

```gherkin
Feature: Executive Report Widget Management
  Scenario: Add protection status widget to executive report
    Given open protection console page
    When navigate to "Reports" menu in "management_console"
    And open default report "Executive summary report"
    And add widget "Protection Status" to report "Executive summary report"
    Then widget "Protection Status" is visible in report
```

## Test Case Creation Process

### Step 1: Add Scenario to Existing Feature File

**ALWAYS use existing feature files** — Do not create new .feature files. Add scenarios to existing files.

Feature files live in MFE packages: `src/mfe_packages/{mfeName}/tests/*.feature`

### Step 2: Create Step Definitions

**MANDATORY**: After creating the feature scenario, create corresponding step definitions in `tests/steps/{section}.steps.ts`:

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

When('I click on add item button', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.clickAddItemButton();
});

Then('I should see that {string} widget is added', async ({ executiveSummaryPage }, widget: string) => {
  const isVisible = await executiveSummaryPage.isWidgetVisible(widget);
  expect(isVisible).toBe(true);
});
```

### Step 3: Reference Existing Step Definitions

**Reuse existing step definitions** from `tests/steps/*.steps.ts` when possible.

## Feature File Requirements

### CRITICAL: ONE Feature per File

**NEVER** create multiple `Feature:` blocks in a single file. Use ONE Feature with MULTIPLE Scenarios.

**WRONG (Multiple Features):**
```gherkin
Feature: Menu Navigation
  Scenario: Menu item visible

Feature: Table Display
  Scenario: Table has columns
```

**CORRECT (One Feature, Multiple Scenarios):**
```gherkin
Feature: Bug Reports Screen
  Background:
    Given the application is open

  Scenario: Menu item visible
    When the MFE package is active
    Then the menu displays the item

  Scenario: Table has columns
    Given I navigate to the screen
    Then the table displays columns
```

### Structure Rules

- **ONE** `Feature:` per file (required)
- **ZERO or ONE** `Background:` block (shared setup for all scenarios)
- **MULTIPLE** `Scenario:` blocks (one per test case)
- Use `@feature:`, `@flow:`, `@dod:` tags for traceability
- Use `@tag` tags for test filtering

### Additional Requirements

- Create descriptive feature names based on the main functionality being tested
- Use clear scenario names that describe the specific test case
- Follow BDD patterns with proper Gherkin syntax
- Place feature files in `src/mfe_packages/{mfeName}/tests/`
