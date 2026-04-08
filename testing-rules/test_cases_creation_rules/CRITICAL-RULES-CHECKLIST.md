# CRITICAL RULES CHECKLIST

## Before Submitting Any Test Case Code - Verify ALL Items Below

### Page Object Files Check (`ui/pages/*-page.ts`)

**For EVERY method you created in page object files:**

- [ ] Method name is `click*()`, `fill*()`, `navigate*()`, `hover*()`, `delete*()`, `add*()`, `get*()` or similar **ACTION** verb
- [ ] Method name is **NOT** `verify*()`, `assert*()`, `check*()`, `validate*()`, `ensure*()`
- [ ] Method contains **ONLY** UI interaction code (clicks, fills, waits)
- [ ] Method may call `get*()` to retrieve data but does NOT assert on it
- [ ] All logging uses `this.log()` for **actions**, not verifications

**FORBIDDEN in Page Objects:**

```typescript
// ui/pages/executive-summary-page.ts
async verifyReportExists(name: string): Promise<void> {  // WRONG: verify* name
  const reports = await this.getAllReports();
  expect(reports).toContain(name);   // WRONG: assertion in page object
}
```

**ALLOWED in Page Objects:**

```typescript
async clickCloneButton(): Promise<void> {  // action name
  await this.clickElement(REPORT_PAGE.CLONE_BUTTON);  // UI interaction only
  this.log('[ACTION] Clicked clone button');  // action log
}
```

---

### Step Definition Files Check (`steps/*.steps.ts`)

**For EVERY `When` step you created:**

- [ ] Contains **NO** logging statements
- [ ] Only calls page object action methods
- [ ] Minimal implementation - just delegates to page objects
- [ ] No verification logic

**For EVERY `Then` step you created:**

- [ ] Contains verification logic (assertions, expect calls)
- [ ] Calls page object `get*()` methods to retrieve data
- [ ] Performs assertions/validations on that data
- [ ] May call `pageObject.expectWithScreenshot()` for verification
- [ ] May call `pageObject.takeScreenshot()` after verification

**CORRECT Pattern:**

```typescript
When('I clone report', async ({ reportPage }) => {
  await reportPage.cloneReport();  // No logger, just call page method
});

Then('I should see {string} in list', async ({ reportPage }, report: string) => {
  const reportList = await reportPage.getAllReports();  // Get data
  expect(reportList).toContain(report);  // Assert in step
  await reportPage.takeScreenshot('verification');  // Screenshot
});
```

---

### Feature File Check (`src/mfe_packages/*/tests/*.feature`)

**CRITICAL: ONE Feature per File**

- [ ] **ONLY ONE** `Feature:` block in the entire file
- [ ] Multiple `Scenario:` blocks under the single Feature
- [ ] Zero or ONE `Background:` block (shared setup)
- [ ] `@feature:`, `@flow:`, `@dod:` tags for traceability
- [ ] Scenario name is descriptive and clear
- [ ] Steps use proper Given/When/Then structure
- [ ] No implementation details leaked into Gherkin
- [ ] Parameters use proper Gherkin format (`{string}`, `{int}`)

**WRONG (Multiple Features):**
```gherkin
Feature: Menu Navigation
  Scenario: Item visible

Feature: Table Display  # Second Feature - FORBIDDEN!
  Scenario: Columns displayed
```

**CORRECT (One Feature, Multiple Scenarios):**
```gherkin
Feature: Bug Reports Screen
  Background:
    Given the application is open

  Scenario: Item visible
  Scenario: Columns displayed
```

---

### Step Definition / Fixture Check

- [ ] Step definitions use `createBdd(test)` from playwright-bdd
- [ ] Page objects accessed via fixture injection, NOT global singletons
- [ ] New page objects registered in `tests/fixtures/fixtures.ts`
- [ ] All locators from `tests/ui/locators.ts` — never inline XPath

---

## Common Violation Patterns - AVOID THESE

### Pattern 1: Verification Method in Page Object

```typescript
// ui/pages/executive-summary-page.ts
async verifyCloneNotification(reportName: string): Promise<void> {  // WRONG!
  const notification = this.page.locator(`//*[text()='${reportName}']`);
  await this.expectWithScreenshot(true, 'clone_notification');  // Verification in page object
}
```

### Pattern 2: Page Object Method Does Verification

```typescript
// ui/pages/executive-summary-page.ts
async checkReportInList(name: string): Promise<void> {  // WRONG!
  const reports = await this.getAllReports();
  expect(reports).toContain(name);  // Assertion in page object
}

// steps/reports.steps.ts
Then('report exists', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.checkReportInList('Report');  // Calls verification method
});
```

---

## Correct Implementation Pattern

### Page Object (Actions Only)

```typescript
// ui/pages/executive-summary-page.ts
export class ExecutiveSummaryPage extends BasePage {

  async cloneReport(): Promise<void> {
    await this.clickElement(REPORT_PAGE.ELLIPSIS_BUTTON);
    await this.clickElement(REPORT_PAGE.CLONE_BUTTON);
    await this.page.waitForLoadState('domcontentloaded');
    this.log('[ACTION] Report cloned');
  }

  async getAllReports(): Promise<string[]> {
    const element = this.locateElement(REPORT_PAGE.REPORT_LIST);
    return await element.allTextContents();
  }
}
```

### Step Definition (Verification)

```typescript
// steps/reports.steps.ts
When('I click on clone report button', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.cloneReport();
});

Then('I should see {string} in reports list', async ({ executiveSummaryPage }, reportName: string) => {
  const reportList = await executiveSummaryPage.getAllReports();

  expect(reportList.join(', ')).toContain(reportName);

  await executiveSummaryPage.takeScreenshot(`report_${reportName}_verified`);
});
```

---

## Final Check Question

**Before you submit, ask yourself:**

> "Did I create ANY method in `ui/pages/*-page.ts` that contains assertions or verification logic?"

- If **YES** → **STOP! Move that logic to step definitions**
- If **NO** → **Good! Proceed with submission**

---

## Why This Rule Matters

1. **Separation of Concerns**: Page objects know HOW to interact with UI, Steps know WHAT to verify
1. **Reusability**: Action methods can be reused across different verification scenarios
1. **Maintainability**: When UI changes, only page objects update. When test logic changes, only steps update
1. **Framework Design**: Follows BDD principles and industry best practices
1. **This violation happens repeatedly** - that's why this checklist exists!

---

**Reference**: [Page Object Patterns](page-object-patterns.md)
