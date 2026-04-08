# Naming Conventions for Auto-Generated Components

## Test Case Naming

- Format: `Scenario: {Page} {action} {object}` in feature files
- Example: `Scenario: Reports schedule executive summary`
- Use camelCase for all TypeScript function/method names
- Use kebab-case for file names

### File Reuse Policy (No New Files)

- Do not create new files for features, tests, step definitions, or page objects unless no relevant file exists
- Always reuse and extend the existing files in their respective directories:
  - Feature scenarios: add to existing files under `src/mfe_packages/{mfeName}/tests/`
  - Step definitions: add or extend steps in existing files under `tests/steps/`
  - Page objects: add new methods to existing classes under `tests/ui/pages/`
  - Locators: add new locators to existing objects in `tests/ui/locators.ts`
- If a placement is ambiguous, follow the closest existing pattern or consult reviewers before proposing a new file.

## Step Definition Naming

- Given steps: `Given('open protection console page', ...)` — describe state
- When steps: `When('I navigate to {string} menu', ...)` — describe action
- Then steps: `Then('I should see {string} in reports list', ...)` — describe verification

## Page Object Method Naming

- Action methods: `camelCase` — `scheduleReport()`, `addWidget()`, `clickCloneButton()`
- Data retrieval methods: `get*` — `getAllReports()`, `getWidgetCount()`
- Visibility checks: `is*` — `isMenuVisible()`, `isWidgetPresent()`
- **NEVER**: `verify*()`, `assert*()`, `check*()`, `validate*()` in page objects

## File Naming Conventions

- **Feature Files**: `{screenId}.feature` in `src/mfe_packages/{mfeName}/tests/`
- **Step Definition Files**: `{section}.steps.ts` in `tests/steps/`
- **Page Object Files**: `{page}-page.ts` in `tests/ui/pages/` (kebab-case)
- **Locators File**: `locators.ts` in `tests/ui/`
- **Fixtures File**: `fixtures.ts` in `tests/fixtures/`

## Consistency Requirements

- Maintain consistent naming following existing conventions
- Follow existing patterns found in the codebase
- Use descriptive names that clearly indicate functionality
- Use camelCase for TypeScript functions, methods, and variables
- Use PascalCase for TypeScript classes
- Use UPPER_SNAKE_CASE for locator constant keys
- Use kebab-case for file names
