# AI Context Management

## Context Detection from Navigation

- URLs containing `/reports/` → Set `currentSection = "reports"`, use `reportsPage` fixture
- URLs containing `/monitoring/` → Set `currentSection = "monitoring"`, use monitoring page fixtures
- URLs containing `/management/` → Set `currentSection = "management"`, use management page fixtures
- Navigation to "Executive Summary" → Use `executiveSummaryPage` fixture
- Login/authentication flows → Use `loginPage` fixture

## Auto-Detect Context from MCP Navigation

- **URL Analysis**: Determine context from navigation URLs
  - `/reports/` → `currentSection = "reports"`
  - `/monitoring/` → `currentSection = "monitoring"`
  - `/management/` → `currentSection = "management"`
  - Executive Summary pages → `currentSection = "executive_summary"`

## Page Object Selection Rules (Fixtures)

Page objects are accessed via **Playwright fixture injection**, not a global singleton:

```typescript
// Step definition receives page objects as fixtures
When('I navigate to reports', async ({ reportsPage }) => {
  await reportsPage.navigateToReports();
});

// Multiple page objects in one step
When('I switch from reports to monitoring', async ({ reportsPage, monitoringPage }) => {
  await reportsPage.closeCurrentReport();
  await monitoringPage.navigateToOverview();
});
```

### Fixture-to-Section Mapping

- Reports section → `reportsPage` fixture
- Executive Summary → `executiveSummaryPage` fixture
- Monitoring → `overviewPage` or `activitiesPage` fixture
- Management → `protectionPlanPage`, `allDevicesPage`, etc.

## Page Object Usage

Reference existing page objects from `ui/pages/` directory:

- `ReportsPage` → for report-related functionality
- `ExecutiveSummaryPage` → for executive summary operations
- `LoginPage` → for authentication
- `OverviewPage`, `ActivitiesPage` → for monitoring sections
- `AllDevicesPage` → for device management
- `ProtectionPlanPage`, `RemoteManagementPlanPage` → for management operations

## Navigation Path Tracking

- Track the sequence of navigation steps for generating Given steps
- Record intermediate pages visited to create proper test flow

## Fixtures Definition

All page objects must be registered in `tests/fixtures/fixtures.ts`:

```typescript
import { test as base } from 'playwright-bdd';
import { ReportsPage } from '../ui/pages/reports-page';
import { ExecutiveSummaryPage } from '../ui/pages/executive-summary-page';

export const test = base.extend<{
  reportsPage: ReportsPage;
  executiveSummaryPage: ExecutiveSummaryPage;
}>({
  reportsPage: async ({ page }, use) => {
    await use(new ReportsPage(page));
  },
  executiveSummaryPage: async ({ page }, use) => {
    await use(new ExecutiveSummaryPage(page));
  },
});
```
