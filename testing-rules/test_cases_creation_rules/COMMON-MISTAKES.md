# Common Mistakes in BDD Test Generation

This document lists common mistakes when generating BDD tests and how to avoid them.

## CRITICAL: Multiple Features in One File

### MISTAKE

Creating multiple `Feature:` blocks in a single `.feature` file:

```gherkin
Feature: Menu Navigation
  Scenario: Menu item visible
    When the MFE package is active
    Then the menu displays the item

Feature: Table Display  # WRONG! Second Feature block
  Scenario: Table has columns
    When I navigate to screen
    Then the table displays columns
```

**Problem:**
- Gherkin parsers expect ONE Feature per file
- playwright-bdd / bddgen will fail with parsing errors
- Background blocks become ambiguous
- Scenarios from different Features mix together

### CORRECT

ONE Feature with MULTIPLE Scenarios:

```gherkin
Feature: Bug Reports Screen
  The Bug Reports screen provides navigation and table display.

  Background:
    Given the application is open

  @feature:demo-mfe
  Scenario: Menu item visible
    When the MFE package is active
    Then the menu displays the item

  @dod:cpt-hai3-dod-table-display
  Scenario: Table has columns
    Given I navigate to screen
    Then the table displays columns
```

**Solution:**
- ONE `Feature:` per file (required)
- Use `@feature:`, `@flow:`, `@dod:` tags to track requirements
- Group related scenarios under a single Feature
- Use Background for shared setup

---

## 2. Multiple Background Blocks

### MISTAKE

```gherkin
Feature: Bug Reports

  Background:
    Given the application is open

  Scenario: Menu visible
    When the menu loads
    Then I see Bug Reports

  Background:  # WRONG! Second Background
    Given I navigate to Bug Reports

  Scenario: Table displayed
    Then I see the table
```

### CORRECT

```gherkin
Feature: Bug Reports

  Background:
    Given the application is open

  Scenario: Menu visible
    When the menu loads
    Then I see Bug Reports

  Scenario: Table displayed
    Given I navigate to Bug Reports
    Then I see the table
```

**Solution:** Use ONE Background, add specific setup to Scenario as `Given` steps.

---

## 3. Feature File Not Found

### MISTAKE

Feature file not placed in the correct location or `playwright.config.ts` not configured:

```
Error: No feature files found matching pattern
```

### CORRECT

Feature files must be in `src/mfe_packages/{mfeName}/tests/*.feature` and `playwright.config.ts` must have:

```typescript
const testDir = defineBddConfig({
  features: '../src/mfe_packages/*/tests/*.feature',
  steps: 'steps/*.steps.ts',
});
```

---

## 4. Inline XPath in Steps

### MISTAKE

```typescript
// In tests/steps/bug-reports.steps.ts
Then('Bug Reports menu is visible', async ({ page }) => {
  const menu = page.locator("//nav//a[contains(., 'Bug Reports')]");  // Inline XPath
  await expect(menu).toBeVisible();
});
```

### CORRECT

```typescript
// In tests/ui/locators.ts
export const BUG_REPORTS = {
  MENU_ITEM: "//nav//a[contains(., 'Bug Reports')]",
} as const;

// In tests/steps/bug-reports.steps.ts
import { BUG_REPORTS } from '../ui/locators';

Then('Bug Reports menu is visible', async ({ page }) => {
  const menu = page.locator(BUG_REPORTS.MENU_ITEM);  // From locators.ts
  await expect(menu).toBeVisible();
});
```

**Solution:** ALL locators must be constants in `tests/ui/locators.ts`.

---

## 5. Verification in Page Objects

### MISTAKE

```typescript
// In tests/ui/pages/bug-reports-page.ts
export class BugReportsPage extends BasePage {
  async verifyMenuVisible(): Promise<void> {  // verify_* method
    const menu = this.page.locator(BUG_REPORTS.MENU_ITEM);
    await expect(menu).toBeVisible();  // assertion in page object
  }
}
```

### CORRECT

```typescript
// In tests/ui/pages/bug-reports-page.ts
export class BugReportsPage extends BasePage {
  async navigateToBugReports(): Promise<void> {  // Action method
    await this.clickElement(BUG_REPORTS.MENU_ITEM);
  }

  async isMenuVisible(): Promise<boolean> {  // Returns data, no assertion
    return await this.isElementVisible(BUG_REPORTS.MENU_ITEM);
  }
}

// In tests/steps/bug-reports.steps.ts
Then('Bug Reports menu is visible', async ({ bugReportsPage }) => {
  const isVisible = await bugReportsPage.isMenuVisible();  // Get data
  expect(isVisible).toBe(true);  // Assert in step
});
```

**Solution:** Page objects = ACTIONS ONLY. Assertions go in `Then` steps.

---

## 6. Logger in When Steps

### MISTAKE

```typescript
When('I click Bug Reports menu', async ({ bugReportsPage }) => {
  console.log('Clicking Bug Reports menu');  // Logger in When step
  await bugReportsPage.navigateToBugReports();
});
```

### CORRECT

```typescript
When('I click Bug Reports menu', async ({ bugReportsPage }) => {
  await bugReportsPage.navigateToBugReports();  // No logger
});
```

**Solution:** `When` steps = page object calls ONLY. Logger only in `Then` steps if needed.

---

## 7. Not Using Fixture Injection

### MISTAKE

```typescript
// Importing page object directly in steps
import { BugReportsPage } from '../ui/pages/bug-reports-page';

When('I click Bug Reports menu', async ({ page }) => {
  const bugReportsPage = new BugReportsPage(page);  // WRONG: manual instantiation
  await bugReportsPage.navigateToBugReports();
});
```

### CORRECT

```typescript
// Page object provided via fixture injection
When('I click Bug Reports menu', async ({ bugReportsPage }) => {
  await bugReportsPage.navigateToBugReports();  // Injected via fixtures.ts
});
```

**Solution:** Always use fixture injection. Register page objects in `tests/fixtures/fixtures.ts`.

---

## 8. Forgot to Register Page Object Fixture

### MISTAKE

Created `bug-reports-page.ts` but forgot to register in fixtures:

```typescript
// fixtures.ts - missing registration
export const test = base.extend<{ reportsPage: ReportsPage }>({
  reportsPage: async ({ page }, use) => { await use(new ReportsPage(page)); },
  // bugReportsPage is missing!
});
```

**Result:** Runtime error — fixture `bugReportsPage` not found

### CORRECT

```typescript
// fixtures.ts
import { BugReportsPage } from '../ui/pages/bug-reports-page';

export const test = base.extend<{
  reportsPage: ReportsPage;
  bugReportsPage: BugReportsPage;
}>({
  reportsPage: async ({ page }, use) => { await use(new ReportsPage(page)); },
  bugReportsPage: async ({ page }, use) => { await use(new BugReportsPage(page)); },
});
```

**Solution:** Always register new page objects in `tests/fixtures/fixtures.ts`.

---

## Prevention Checklist

Before submitting tests, verify:

- [ ] **ONE** `Feature:` per file
- [ ] Feature files in `src/mfe_packages/{mfeName}/tests/`
- [ ] `playwright.config.ts` `features` glob matches feature file locations
- [ ] All XPath in `locators.ts`, not inline
- [ ] Page objects = actions only (no `verify*`, no assertions)
- [ ] `When` steps have NO logger
- [ ] `Then` steps have assertions + `expect()`
- [ ] Page objects accessed via fixture injection
- [ ] New page objects registered in `fixtures.ts`

See also: [CRITICAL-RULES-CHECKLIST.md](CRITICAL-RULES-CHECKLIST.md)
