---
name: "Testing: Spec to Tests"
description: Generate BDD tests from Cypilot FEATURE specification files
category: Testing
tags: [testing, cypilot, bdd, feature-files]
---

# Generate Tests from Cypilot FEATURE Specification

Convert Cypilot `FEATURE.md` requirements into BDD feature files, step definitions, page objects, and fixtures using TypeScript + Playwright + playwright-bdd.

## Guardrails

- **Page Objects = ACTIONS ONLY** - NO verification methods
- **Step definitions = verification** in `Then()` steps only
- Maintain traceability: `@feature:{feature-name}` and `@dod:{dod-id}` tags + line number comments
- Use existing steps/locators when possible
- **Use locator constants** from `tests/ui/locators.ts` — NEVER inline XPath strings in steps or page objects

### Import Rules (CRITICAL — prevents runtime errors)

Step definition files (`*.steps.ts`) must use these imports:

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);
```

Page objects injected via fixture destructuring — NEVER import page objects in step files directly.

### Feature File Location (CRITICAL — prevents discovery errors)

Feature files live **inside the MFE package**: `src/mfe_packages/{mfeName}/tests/*.feature`

`playwright.config.ts` uses `defineBddConfig()` with a features glob that discovers these files:

```typescript
const testDir = defineBddConfig({
  features: '../src/mfe_packages/*/tests/*.feature',
  steps: ['steps/*.steps.ts', 'fixtures/fixtures.ts'],
  featuresRoot: '..',
});
```

## Testing Rules

Read the **AI Test Generation Guide** as the single entry point for all rules:

Search in order (use first found):
1. `docs/testing-rules/ai-test-generation-guide.md`
2. `testing-rules/ai-test-generation-guide.md`

This guide routes to all instruction files:
- Feature file templates
- Test file templates
- Step definitions patterns
- Page object patterns
- Naming conventions
- Validation rules
- Critical rules checklist

**Read the guide first**, then follow the referenced instruction files for each artifact you generate.

## Input

**Three modes:**

### Mode 1: Explicit Path (Standalone)

User provides Cypilot FEATURE file path:
- `architecture/features/feature-studio-devtools/FEATURE.md`
- `architecture/features/feature-react-bindings/FEATURE.md`

### Mode 2: Auto-Detect from Generate (Cypilot Integration)

If invoked from `/cypilot-generate`, auto-detect the feature:
1. Check environment/context for the active FEATURE being implemented
2. Look for `architecture/features/*/FEATURE.md` matching the generation target
3. Use the FEATURE spec that was just implemented

### Mode 3: Current Directory Scan

If no input provided and not in `/cypilot-generate` context:
1. Check `architecture/features/` for all FEATURE.md files
2. Filter to UI-related features (contain keywords: "screen", "menu", "table", "button", "sidebar", "navigation", "page", "panel", "component", "render")
3. If exactly one UI feature matches, use it
4. If multiple, list them and prompt user to specify

## Screen Discovery

Before generating tests, identify which screen the FEATURE targets by parsing the source:

1. Read `src/mfe_packages/*/mfe.json` to get extension IDs, routes, and labels
2. Glob `src/mfe_packages/*/src/screens/**/*Screen.tsx` to find screen components
3. Match the FEATURE's target screen to an existing page object in `tests/ui/pages/`
4. If a page object already exists, ADD methods to it. Do NOT create a new file.

## Requirement Extraction from FEATURE.md

Cypilot FEATURE specs have a structured format. Extract testable requirements from these sections:

### Section 2: Actor Flows (CDSL)

Each flow describes a user/system interaction sequence. Extract:
- **Flow name** from `### {Flow Name}` headers
- **Flow ID** from `cpt-hai3-flow-*` markers
- **Steps** — numbered items within each flow (these become BDD scenario steps)

Example:
```markdown
### Bootstrap Application with HAI3Provider
- [x] `p1` - **ID**: `cpt-hai3-flow-react-bindings-bootstrap`
1. [x] - `p1` - Developer wraps root component with `<HAI3Provider app={mfeApp}>` - `inst-wrap-root`
2. [x] - `p1` - Provider reads `app` from props and stores it in `HAI3Context` - `inst-store-context`
```

Maps to BDD:
```gherkin
@feature:react-bindings @flow:bootstrap
Scenario: Bootstrap application with HAI3Provider
  Given the application is loaded
  When the developer wraps root with HAI3Provider
  Then HAI3Context should contain the app instance
```

### Section 5: Definitions of Done (DoD)

Each DoD defines a verifiable implementation requirement. Extract:
- **DoD name** from `### DoD: {Name}` headers
- **DoD ID** from `cpt-hai3-dod-*` markers
- **Implementation details** — specifics that can be verified in tests

### Section 6: Acceptance Criteria

Direct testable statements. Each bullet is a test scenario:

Example:
```markdown
- [x] Studio panel renders as a fixed glassmorphic overlay in development mode
- [x] Panel can be dragged to any in-viewport position
- [x] `Shift+\`` toggles panel visibility
```

Maps to BDD:
```gherkin
@feature:studio-devtools @acceptance
Scenario: Studio panel renders in development mode
  Given the application is running in development mode
  Then the Studio panel should be visible as a fixed overlay

Scenario: Studio panel can be dragged
  Given the Studio panel is visible
  When I drag the panel header to a new position
  Then the panel should move to the new position
```

## Steps

Track these as TODOs and complete one by one:

### 1. Read AI Test Generation Guide

Read the guide and all referenced instruction files relevant to the task.

### 1b. Discover Existing Test Infrastructure

Before creating anything, check what already exists:

- Read `tests/ui/locators.ts` — reuse existing locator constants
- Read `tests/ui/pages/*-page.ts` — reuse existing page objects
- Read `tests/steps/*.steps.ts` — reuse existing step definitions
- Read `tests/fixtures/fixtures.ts` — check registered page objects

### 2. Read and Parse FEATURE Specification

Read the FEATURE.md file and identify:

- **Actor Flows** (Section 2) — interaction sequences with `cpt-hai3-flow-*` IDs
- **Definitions of Done** (Section 5) — implementation requirements with `cpt-hai3-dod-*` IDs
- **Acceptance Criteria** (Section 6) — direct testable statements
- **Line numbers** for traceability

**Priority for test generation:**
1. Acceptance Criteria — most directly testable (each bullet = one scenario)
2. Actor Flows — user-facing flows map naturally to BDD scenarios
3. Definitions of Done — verify implementation details (lower priority for E2E)

**Skip non-UI requirements:** Flows/DoDs that describe SDK internals, type system, build constraints, or package API surface are not testable with Playwright BDD.

### 3. Create Feature File

Create in `src/mfe_packages/{mfeName}/tests/` following `feature-file-templates.md`.
Feature files are co-located with MFE package source code, NOT inside `tests/`.

**CRITICAL: ONE Feature per file**
- Create **ONLY ONE** `Feature:` block per file
- Add **MULTIPLE** `Scenario:` blocks under the single Feature
- Use **ONE** `Background:` block for shared setup (optional)
- Never create multiple `Feature:` blocks in the same file

### 4. Create Step Definitions

Add to `tests/steps/{section}.steps.ts` following `step-definitions.md`.

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

When('I click on add item button', async ({ executiveSummaryPage }) => {
  await executiveSummaryPage.clickAddItemButton();
});

Then('I should see {string} widget is added', async ({ executiveSummaryPage }, widget: string) => {
  const reports = await executiveSummaryPage.getAllReports();
  expect(reports).toContain(widget);
});
```

- All locators must come from `tests/ui/locators.ts` constants — NEVER inline XPath
- `When()` steps: call page object methods ONLY, NO console.log
- `Then()` steps: verification logic with `expect()` assertions

### 5. Create Page Object Methods

Add to `tests/ui/pages/{screen-id}-page.ts` following `page-object-patterns.md`.

```typescript
import { BasePage } from '../base-page';
import { REPORT_PAGE } from '../locators';

export class ReportDetailPage extends BasePage {
  async clickAddItemButton(): Promise<void> {
    await this.clickElement(REPORT_PAGE.ADD_ITEM_BUTTON);
    this.log('[ACTION] Clicked add item button');
  }

  async getAllReports(): Promise<string[]> {
    return this.getElementTexts(REPORT_PAGE.REPORT_ROW);
  }
}
```

- All locators must come from `tests/ui/locators.ts` constants — NEVER inline XPath
- ACTION methods only (`click*`, `get*`, `fill*`, `navigate*`)
- If page object is new, register it in `tests/fixtures/fixtures.ts`:

  ```typescript
  // Import at top:
  import { ReportDetailPage } from '../ui/pages/report-detail-page';

  // Add to TestFixtures type:
  reportDetailPage: ReportDetailPage;

  // Add to base.extend():
  reportDetailPage: async ({ page }, use) => {
    await use(new ReportDetailPage(page));
  },
  ```

### 6. Update Locators (if needed)

If components lack qa-class, either:
- Note which components need qa-class added (use `/testing:locators`)
- Or use fallback locators (text, placeholder, class combinations)
- All locator constants go to `tests/ui/locators.ts` — never duplicate in steps or page objects

```typescript
export const REPORT_PAGE = {
  ADD_ITEM_BUTTON: "//button[contains(@class, 'qa-add-item')]",
  REPORT_ROW: "//tr[contains(@class, 'qa-report-row')]",
} as const;
```

### 7. Run bddgen to Generate Test Files

After creating feature files and step definitions, run:

```bash
cd tests && npx bddgen
```

This auto-generates `.spec.ts` files in `.features-gen/` from the feature files. These files should NEVER be edited manually.

### 8. Final Validation

Run through `CRITICAL-RULES-CHECKLIST.md` before completing.

Additional checks:

- [ ] No inline XPath strings in step files or page objects — all from `locators.ts`
- [ ] Feature files are in `src/mfe_packages/{mfeName}/tests/` (co-located with source)
- [ ] New page objects are registered in `tests/fixtures/fixtures.ts`
- [ ] Step definitions use `createBdd(test)` from playwright-bdd
- [ ] `When()` steps only call page object methods — no assertions
- [ ] `Then()` steps contain `expect()` assertions
- [ ] Traceability tags present: `@feature:{name}`, `@flow:{id}` or `@dod:{id}`
- [ ] Run: `cd tests && npx bddgen && npx playwright test --project=chromium`

## Cypilot Integration Notes

### When invoked from `/cypilot-generate`

The spec-to-tests skill should:

1. **Auto-detect the FEATURE context** — read the active FEATURE being implemented from the generate command
2. **Focus on UI-testable sections** — Actor Flows with UI interactions, Acceptance Criteria with visible behavior
3. **Skip SDK/infrastructure requirements** — DoDs about type system, package API surface, build constraints are not E2E testable
4. **Update architecture/TESTING.md** — note which FEATURE was tested and when

### Traceability

Feature files should include traceability to the Cypilot FEATURE spec:

```gherkin
# Auto-generated from: architecture/features/feature-studio-devtools/FEATURE.md
# Feature: Studio DevTools
# Generated: 2026-04-03

@feature:studio-devtools @acceptance
Feature: Studio DevTools Panel

  @dod:cpt-hai3-dod-studio-devtools-panel-overlay
  Scenario: Studio panel renders as fixed overlay
    Given the application is running in development mode
    Then the Studio panel should be visible as a fixed glassmorphic overlay

  @flow:cpt-hai3-flow-studio-devtools-drag-panel
  Scenario: Studio panel can be dragged
    Given the Studio panel is visible
    When I drag the panel header to position 100,200
    Then the panel should be at position 100,200
```

This ensures tests remain traceable to FEATURE specs via `@feature:`, `@flow:`, and `@dod:` tags.
