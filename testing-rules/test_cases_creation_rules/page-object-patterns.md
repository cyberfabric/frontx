# AI Page Object Method Generation

## MANDATORY: Page Object Implementation Required

**CRITICAL**: After creating step definitions, you MUST implement the actual functionality in page object files. Step definitions should only call page object methods, not contain business logic.

## From MCP Action Sequence

```typescript
async methodNameFromActions(param: string): Promise<void> {
  // Generated from mcp0_browser_click sequence
  await this.clickElement(LOCATORS.GENERATED_LOCATOR);

  // Add wait/verification from framework patterns
  await this.waitForElement(LOCATORS.STABLE_ELEMENT);

  // Include conditional logic if multiple MCP paths observed
  if (conditionFromNavigation) {
    await this.clickElement(LOCATORS.CONDITIONAL_LOCATOR);
  }

  // Always add verification with screenshot
  await this.expectWithScreenshot(true, 'action_completed');

  // Include debug logging
  this.log('Action description completed successfully');
}
```

## Real Example from MCP Navigation

```typescript
async addWidgetToReport(widget: string, report: string): Promise<void> {
  // From mcp0_browser_click on add widget button
  await this.clickElement(REPORT_PAGE.ADD_WIDGET_TO_REPORT_BUTTON);

  // From mcp0_browser_type or select actions
  const widgetName = WIDGET_NAME_MAP[widget];
  const locator = REPORT_PAGE.DEFINED_WIDGET_IN_REPORT_ADD_MODAL_WINDOW
    .replace('{widget_name}', widgetName);

  // Wait for stability (framework pattern)
  await this.waitForElement(locator);

  // Conditional logic based on different MCP navigation paths
  if (['Devices', 'Not Protected', 'Cloud Applications, Protection Status'].includes(widget)) {
    await this.clickElement(locator);
  } else if (['5 latest alerts', 'Historical Alerts Summary', 'Active Alerts Summary'].includes(widget)) {
    await this.selectWidgetToAddInReport(widgetName, 'Alerts');
  }

  // Verification with screenshot (always required)
  const currentReportName = await this.getCurrentReportName();
  await this.expectWithScreenshot(
    currentReportName === report,
    'added_widget_to_report_mismatch',
  );

  this.log(`Widget ${widget} added to report ${currentReportName}`);
}
```

## Page Object Creation Guidelines

### **MANDATORY Implementation Steps**

1. **Identify Target Page Object**: Based on MCP navigation context
   - Reports section → `ui/pages/reports-page.ts` or `ui/pages/executive-summary-page.ts`
   - Management section → `ui/pages/management-page.ts`
   - Monitoring section → `ui/pages/monitoring-page.ts`

2. **Create Methods in Appropriate Page Object File**:

```typescript
// Example in ui/pages/executive-summary-page.ts
async clickAddItemButton(): Promise<void> {
  await this.clickElement(REPORT_PAGE.ADD_ITEM_BUTTON);
  this.log('[ACTION] Clicked add item button in executive summary');
}

async selectWidgetFromGallery(widget: string): Promise<void> {
  await this.addWidgetToReport(widget, 'Executive summary report');
  this.log(`[ACTION] Selected ${widget} widget from gallery`);
}
```

3. **Framework Integration Requirements**:

- **Strictly follow Page Object approach** to create the implementation of the step itself in the related page file in `ui/pages/` directory
- **Use OOP SOLID principles** to create methods in page object related files and split complex functions
- Create logical, reusable methods that combine multiple MCP actions when appropriate
- Always use custom framework methods (`clickElement()`, `expectWithScreenshot()`)
- Include proper logging and error handling

4. **Verification Logic Separation**:

- **NEVER create verification/assertion methods in page objects** (e.g., `verifyMenuVisible()`)
- **ALWAYS keep verification logic in step definitions** (`Then` steps)
- **Page objects handle ACTIONS** (click, type, navigate, hover)
- **Step definitions handle VERIFICATION** (assertions, expectations, validations)
- **Example**: Instead of `page.verifySectionRenamed()` → put assertion logic directly in `Then` step
- **Rationale**: Keeps verification logic in BDD layer where it belongs, maintains single responsibility principle
- **If verification logic exceeds 25 lines**: Consider extracting to a helper module, but still call from steps

## Example Complex Method Generation

```typescript
function createRandomDailySchedule(): { days: string[]; hour: string } {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const count = Math.floor(Math.random() * 7) + 1;
  const daysToDeselect = weekDays.sort(() => 0.5 - Math.random()).slice(0, count);
  const hour = String(Math.floor(Math.random() * 9) + 3);
  return { days: daysToDeselect, hour };
}
```
