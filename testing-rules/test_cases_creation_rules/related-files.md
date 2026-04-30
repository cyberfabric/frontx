# Related Files

## Framework Dependencies

- **[locators.ts](../../ui/locators.ts)**: Contains all locator objects (`REPORT_PAGE`, `MONITORING_PAGE`, etc.)
- **[steps/](../../steps/)**: Directory for step definition files (`*.steps.ts`) with `Given`, `When`, `Then` from playwright-bdd
- **[ui/pages/](../../ui/pages/)**: Directory containing all page object classes (`ReportsPage`, `ExecutiveSummaryPage`, `LoginPage`, etc.)
- **[base-page.ts](../../ui/base-page.ts)**: Contains custom methods (`clickElement()`, `expectWithScreenshot()`, etc.)
- **[fixtures.ts](../../fixtures/fixtures.ts)**: Playwright custom fixtures for page object injection via `test.extend()`
- **[playwright.config.ts](../../playwright.config.ts)**: Playwright configuration including playwright-bdd `defineBddConfig()`
- **Feature files**: `src/mfe_packages/{mfeName}/tests/*.feature` — Gherkin scenarios co-located with source

## Integration Notes

- All generated components should follow the existing patterns found in these related files
- Reference existing locator objects and page objects when possible
- Use custom framework methods (from `BasePage`) instead of raw Playwright methods
- Follow established naming conventions throughout the codebase
- Page objects are injected via fixtures, not imported directly in step definitions
