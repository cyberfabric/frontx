/**
 * Custom Playwright fixtures for page object injection.
 *
 * Uses Playwright's test.extend() to inject page objects as fixtures
 * into tests and step definitions.
 *
 * Usage in step definitions:
 *   const { Given, When, Then } = createBdd(test);
 *   When('I click add item', async ({ executiveSummaryPage }) => { ... });
 *
 * Add new page objects here as the test suite grows.
 */
import { test as base } from 'playwright-bdd';

// Import page objects as they are created:
// import { ReportsListPage } from '../ui/pages/reports-list-page';
// import { ReportDetailPage } from '../ui/pages/report-detail-page';
// import { ChatPage } from '../ui/pages/chat-page';

// Define the fixture types
type TestFixtures = {
  // reportsListPage: ReportsListPage;
  // reportDetailPage: ReportDetailPage;
  // chatPage: ChatPage;
};

export const test = base.extend<TestFixtures>({
  // Uncomment and add fixtures for each discovered page object:
  //
  // reportsListPage: async ({ page }, use) => {
  //   await use(new ReportsListPage(page));
  // },
  //
  // reportDetailPage: async ({ page }, use) => {
  //   await use(new ReportDetailPage(page));
  // },
  //
  // chatPage: async ({ page }, use) => {
  //   await use(new ChatPage(page));
  // },
});
