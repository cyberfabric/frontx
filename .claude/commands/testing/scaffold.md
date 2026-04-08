---
name: "Testing: Scaffold"
description: Create complete test framework structure from scratch
category: Testing
tags: [testing, scaffold, setup]
---

# Test Framework Scaffold

Create the complete BDD test structure from scratch for any HAI3 + Cypilot project.

## Guardrails

- Use TypeScript + Playwright + playwright-bdd stack
- Never create duplicate files - check existing structure first
- Follow patterns from testing rules docs (see below)

## Testing Rules Location

Search for testing rules in order (use first found):
1. `docs/testing-rules/` (recommended)
2. `testing-rules/`
3. `tests/test_cases_creation_rules/` (legacy)

Key files to read if available:
- `CRITICAL-RULES-CHECKLIST.md`
- `workflow-process.md`
- `page-object-patterns.md`

## Templates Location

All file templates are in the `templates/` subfolder relative to the testing rules location found above.
For example: `testing-rules/test_cases_creation_rules/templates/`

## Screen Auto-Discovery

Before scaffolding, discover all screens from the source code. This drives page object and test directory creation.

**Discovery pattern:**

1. Find all MFE packages: `src/mfe_packages/*/mfe.json`
2. Parse each `mfe.json` to extract `extensions[]` — each extension has an `id`, `presentation.label`, `presentation.route`, and maps to an `entry`
3. Find all screen components: `src/mfe_packages/*/src/screens/*/**/*Screen.tsx`
4. Match extensions to screen components via naming convention (extension route/label maps to screen directory name)

**Mapping rule:** Each screen becomes:

- A page object: `tests/ui/pages/{screen-id}-page.ts` with class `{ScreenName}Page extends BasePage`
- A fixture registration in `tests/fixtures/fixtures.ts`: `{screenId}Page: async ({ page }, use) => { await use(new {ScreenName}Page(page)); }`

**Feature files convention:** Feature files live **inside the MFE package**, NOT in `tests/`:
- Location: `src/mfe_packages/{mfeName}/tests/*.feature`
- This keeps BDD specs co-located with the source code they describe
- `npx bddgen` discovers features via glob patterns in `playwright.config.ts`
- **Do NOT create stub/placeholder feature files during scaffold** — feature files are created only when generating real tests via `/testing:spec-to-tests`

**Skip MFE packages:** `_blank-mfe` (template, not a real MFE)

**Example discovery result:**

| MFE Package | Screen ID    | Screen Component          | Page Object Class    |
| ----------- | ------------ | ------------------------- | -------------------- |
| demo-mfe    | helloworld   | HelloWorldScreen.tsx      | HelloWorldPage       |
| demo-mfe    | profile      | ProfileScreen.tsx         | ProfilePage          |
| demo-mfe    | theme        | CurrentThemeScreen.tsx    | CurrentThemePage     |
| demo-mfe    | uikit        | UIKitElementsScreen.tsx   | UIKitElementsPage    |

## Steps

Track these as TODOs and complete one by one:

### 1. Discover Screens from Source

Parse the source code to build the screen map:

1. Read all `src/mfe_packages/*/mfe.json` files to get extension IDs, routes, and labels
2. Glob `src/mfe_packages/*/src/screens/**/*Screen.tsx` to get screen components
3. Build the mapping table (skip `_blank-mfe` package)
4. This map drives all subsequent steps

### 2. Check Existing Structure

```bash
ls tests/ 2>/dev/null || echo "No tests directory"
```

### 3. Create Directory Structure

Create all directories:

```bash
mkdir -p tests/ui/pages
mkdir -p tests/steps
mkdir -p tests/fixtures
mkdir -p tests/e2e
```

For each discovered MFE package, ensure the feature file directory exists:

```bash
mkdir -p src/mfe_packages/{mfeName}/tests
```

### 4. Create package.json

Read template from `templates/package.json` and write to `tests/package.json`.

### 5. Create playwright.config.ts

Read template from `templates/playwright.config.ts` and write to `tests/playwright.config.ts`.

**CRITICAL:** The `defineBddConfig()` MUST include:

- `featuresRoot: '..'` — required because feature files live outside `tests/` directory
- `steps: ['steps/*.steps.ts', 'fixtures/fixtures.ts']` — include fixtures so bddgen auto-detects custom test instance
- `features: '../src/mfe_packages/*/tests/*.feature'` — glob for feature files in MFE packages

**CRITICAL:** The config uses **two project types**:
- BDD projects (`chromium`, `firefox`, `webkit`): `testDir` set to `bddTestDir` from `defineBddConfig()`
- Smoke project (`smoke`): `testDir` set to `./e2e` for standalone `.spec.ts` tests

This ensures `npm run test:smoke` works out of the box without `bddgen`.

**CRITICAL:** Use `playwright-bdd@^8.4.0` (NOT v6). v8 removed the `@cucumber/cucumber` dependency. Do NOT add `@cucumber/cucumber` to devDependencies — it causes MODULE_NOT_FOUND errors.

### 6. Create base-page.ts

Read template from `templates/base-page.ts` and write to `tests/ui/base-page.ts`.

### 7. Create locators.ts

Read template from `templates/locators.ts` and write to `tests/ui/locators.ts`.

### 8. Create fixtures.ts

Read template from `templates/fixtures.ts` and write to `tests/fixtures/fixtures.ts`.

**CRITICAL:** The fixtures file MUST include:
- Import of `test as base` from `playwright-bdd`
- `base.extend<TestFixtures>()` with page object registrations for ALL discovered screens (from Step 1)
- Re-export of `expect` from `@playwright/test`

**For each discovered screen**, add to fixtures.ts:

```typescript
// At top, with other imports:
import { {ScreenName}Page } from '../ui/pages/{screen-id}-page';

// Inside TestFixtures type:
{screenId}Page: {ScreenName}Page;

// Inside base.extend():
{screenId}Page: async ({ page }, use) => {
  await use(new {ScreenName}Page(page));
},
```

### 9. Generate Step Definitions

Generate `tests/steps/{section}.steps.ts` based on:
- Step definition rules from `step-definitions.md`
- Page object patterns from `page-object-patterns.md`
- Critical rules from `CRITICAL-RULES-CHECKLIST.md`

The file must follow these rules:
- Import `createBdd` from `playwright-bdd` and create `{ Given, When, Then }` from `createBdd(test)`
- `When()` steps: Call page object methods ONLY, NO console.log statements
- `Then()` steps: Contain verification logic (assertions, `expect()` calls)
- `Given()` steps: Setup preconditions

### 10. Create Smoke Test

Read template from `templates/smoke.spec.ts` and write to `tests/e2e/smoke.spec.ts`.

This smoke test validates:
- Playwright is working
- The application is accessible at `http://localhost:5173/`
- All test infrastructure imports work correctly

Users can run this test immediately after setup:
```bash
cd tests && npm run test:smoke
```

### 11. Create Cypilot Integration (if Cypilot detected)

**Check:** Does `architecture/features/` directory exist with FEATURE.md files?

If YES, create Cypilot-testing bridge:

**Create `architecture/TESTING.md`** with Cypilot-testing bridge content:
- Bridge document between Cypilot FEATURE specs and BDD tests
- Documents workflow: FEATURE spec -> `/cypilot-generate` -> tests
- Includes task template for E2E testing section
- **Acts as hook file** — when this file exists, `/cypilot-generate` workflow automatically enables test generation

**Template location search order:**

1. `docs/testing-rules/test_cases_creation_rules/templates/cypilot/`
2. `testing-rules/test_cases_creation_rules/templates/cypilot/`

If a template `TESTING.md.template` is found, use it directly.

If template not found, generate `architecture/TESTING.md` with this content:

```markdown
# Testing Integration

This document bridges Cypilot FEATURE specifications and BDD test automation.

## Workflow

1. **FEATURE spec** defines requirements in `architecture/features/*/FEATURE.md`
2. **`/cypilot-generate`** implements code from the FEATURE spec
3. **`/testing:spec-to-tests`** generates BDD tests from FEATURE requirements
4. **`/testing:locators`** adds qa-class attributes to new components

## Requirement Sources

Tests trace back to FEATURE spec sections:
- **Actor Flows** (Section 2) — user interaction scenarios
- **Definitions of Done** (Section 5) — implementation verification
- **Acceptance Criteria** (Section 6) — end-to-end validation

## Traceability

Feature files use `@feature:{feature-name}` and `@dod:{dod-id}` tags to link back to FEATURE specs.

## Task Template

When running `/cypilot-generate` for UI features, include these testing tasks:

### E2E Testing
- [ ] Add qa-class attributes to new components (`/testing:locators`)
- [ ] Generate tests from FEATURE spec (`/testing:spec-to-tests`)
- [ ] Run tests: `cd tests && npx bddgen && npx playwright test --project=chromium`
```

**How the hook works:**
- `/cypilot-generate` checks if `architecture/TESTING.md` exists
- If yes -> After code generation completes, prompt user: "Test integration detected. Run `/testing:spec-to-tests` to generate tests for the implemented feature?"
- If no -> Standard generate workflow (no test generation prompt)

### 12. Update cypilot-generate Skill (if needed)

**Check:** Does `.claude/commands/cypilot-generate.md` exist?

If YES, verify test generation hook is present:

**Read** `.claude/commands/cypilot-generate.md` and check if it references:
- `architecture/TESTING.md` detection
- Test generation prompt after code generation
- `/testing:spec-to-tests` invocation
- `/testing:locators` invocation

**If the generate command delegates to a workflow file** (e.g., contains only `ALWAYS open and follow ...`):
- Do NOT modify the generate command itself
- Instead, note in the scaffold output that the test integration hook is via `architecture/TESTING.md` and must be manually checked by the developer after `/cypilot-generate` runs

**If the generate command has inline steps and ANY test hooks are missing:**
- Update to include the test generation workflow
- Preserve all other steps and content

### 13. Verify Structure

Final structure should be (example for demo-mfe):

```
tests/
├── playwright.config.ts         # defineBddConfig() with feature/step globs
├── package.json                 # @playwright/test, playwright-bdd, typescript
├── tsconfig.json
├── screenshots/
├── ui/
│   ├── base-page.ts
│   ├── locators.ts
│   └── pages/
│       ├── hello-world-page.ts      # from HelloWorldScreen
│       ├── profile-page.ts          # from ProfileScreen
│       ├── current-theme-page.ts    # from CurrentThemeScreen
│       └── uikit-elements-page.ts   # from UIKitElementsScreen
├── steps/
│   └── {section}.steps.ts
├── fixtures/
│   └── fixtures.ts              # test.extend() with all page objects
└── e2e/
    └── smoke.spec.ts            # Infrastructure validation test

# Feature files live in MFE packages (NOT in tests/):
src/mfe_packages/
└── demo-mfe/tests/*.feature

# Auto-generated test files (by npx bddgen):
.features-gen/
└── *.spec.ts                    # DO NOT edit manually

# Cypilot integration (if FEATURE specs detected):
architecture/
└── TESTING.md                   # Bridge doc + hook file
```

Page objects and fixtures are created for each discovered screen (Step 1).
Feature files are co-located with their MFE package source code.
Cypilot integration hook (`architecture/TESTING.md`) is created only if `architecture/features/` directory exists with FEATURE specs.

## Cypilot Integration

If the project has `architecture/features/` with FEATURE.md files, scaffold enriches itself:

### Auto-Discovery from FEATURE Specs

After discovering screens from source code (Step 1), also scan Cypilot FEATURE specs:

1. Check `architecture/features/*/FEATURE.md` for features with UI-related Actor Flows or Acceptance Criteria
2. A FEATURE targets UI if it contains keywords: "screen", "menu", "table", "button", "sidebar", "navigation", "page", "panel", "component", "render"
3. For each FEATURE that targets a screen, ensure the `tests/` directory exists in the MFE package (but do NOT create feature files — those are generated by `/testing:spec-to-tests`)

### Task Template Injection

When scaffolding in a Cypilot project, output a reminder:

```
Cypilot FEATURE specs detected. For each future /cypilot-generate on UI features, include:

## E2E Testing
- [ ] Add qa-class attributes to new components (/testing:locators)
- [ ] Generate tests from FEATURE spec (/testing:spec-to-tests)
- [ ] Run tests: cd tests && npx bddgen && npx playwright test --project=chromium
```

## Next Steps

After scaffold:

1. **Install test dependencies:**

   ```bash
   cd tests && npm install
   ```

2. **Install Playwright browsers:**

   ```bash
   cd tests && npx playwright install chromium
   ```

   Alternative: Run `/testing:setup` skill or `node testing-rules/setup_windows.mjs` / `node testing-rules/setup_macos.mjs`

3. **Verify setup with smoke test:**

   ```bash
   # Start dev server first (if not running)
   npm run dev

   # Run smoke test
   cd tests && npm run test:smoke
   ```

4. **Add qa-class attributes to components:**

   ```bash
   /testing:locators
   ```

5. **Generate tests from FEATURE specs** (if applicable):

   ```bash
   /testing:spec-to-tests
   ```

6. **Run all tests:**

   ```bash
   cd tests && npx bddgen && npx playwright test --project=chromium
   ```
