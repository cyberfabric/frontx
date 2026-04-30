/**
 * Locators for UI elements.
 * Organized by page/component for easy maintenance.
 *
 * Priority for locator selection:
 * 1. qa-class attributes (highest priority)
 * 2. data-testid attributes
 * 3. Exact class combinations
 * 4. Text + element type (last resort)
 *
 * CRITICAL: Always use XPath syntax, NEVER CSS selectors.
 */

export const COMMON = {
  /** Loading states */
  LOADING_SPINNER: "//div[contains(@class, 'qa-loading')]",

  /** Notifications */
  TOAST_NOTIFICATION: "//div[@role='alert']",
} as const;


// Add page-specific locator objects as needed:
// export const CHAT_PAGE = {
//   MESSAGE_INPUT: "//textarea[contains(@class, 'qa-message-input')]",
//   SEND_BUTTON: "//button[contains(@class, 'qa-send-button')]",
// } as const;
