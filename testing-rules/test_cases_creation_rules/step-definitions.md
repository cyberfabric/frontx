# AI Step Definition Generation Patterns

## From MCP Navigation Actions

### Given Steps

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';

const { Given, When, Then } = createBdd(test);

Given('open protection console page', async ({ loginPage }) => {
  await loginPage.loginWithCredentials();
});
```

### When Steps (From MCP click/type/select actions)

```typescript
When('navigate to {string} menu in {string}', async ({ reportsPage }, menu: string, consoleType: string) => {
  await reportsPage.navigateToMenu(menu);
});
```

### Then Steps (From MCP snapshot verifications)

```typescript
Then('see reports page with {string}', async ({ reportsPage }, report: string) => {
  await reportsPage.expectWithScreenshot(true, `report_${report}_visible`);
});
```

## Step Definition Patterns

Follow existing step definition patterns in `steps/*.steps.ts`:

### BDD Pattern Requirements (playwright-bdd)

- **Use `Given()`, `When()`, `Then()`** from `createBdd(test)` to create step definitions
- Use `{string}`, `{int}`, `{float}` placeholders for parameterized steps
- Maintain consistent parameter naming and types
- Page objects are accessed via **fixture injection** (destructured from first argument)

### Example Implementation

```typescript
When(
  'I schedule a report {string} with {string} schedule type',
  async ({ reportPage }, report: string, scheduleType: string) => {
    await reportPage.scheduleReport(report, scheduleType);
  },
);
```

## AI Method Generation Rules

- Generate one method per distinct MCP action sequence
- Combine multiple clicks into logical operations (e.g., "open and configure report")
- Always include wait/verification after actions
- Use existing helper methods when available

## Logging Best Practices

- **ALL action logging must be in Page Object Methods** (POM files in `ui/pages/`)
- **Step definitions should NOT contain logging statements** for actions
- Step definitions may only log verification results if needed
- Page object methods should use:
  - `this.log()` for action messages
  - `console.log()` for detailed flow information
  - `console.error()` for failures (before throwing)

### Correct Pattern:

```typescript
// CORRECT - Step definition is clean
When('I delete section {string} from executive summary report', async ({ executiveSummaryPage }, sectionName: string) => {
  await executiveSummaryPage.deleteSection(sectionName);
});

// CORRECT - Logging in page object method
async deleteSection(sectionName: string): Promise<void> {
  this.log(`Section '${sectionName}' contains widgets`);
  await this.clickElement(deleteButtonLocator);
  this.log(`[ACTION] Clicked delete button for section '${sectionName}'`);
}
```

### Incorrect Pattern:

```typescript
// WRONG - Logging in step definition
When('I delete section {string} from executive summary report', async ({ executiveSummaryPage }, sectionName: string) => {
  await executiveSummaryPage.deleteSection(sectionName);
  console.log(`[ACTION] Deleted section '${sectionName}'`);  // WRONG - Remove this
});
```

## Step Definition Example

```typescript
When('add widget {string} to report {string}', async ({ reportPage }, widget: string, report: string) => {
  await reportPage.addWidgetToReport(widget, report);
  await reportPage.takeScreenshot(`widget_${widget}_added`);
});
```
