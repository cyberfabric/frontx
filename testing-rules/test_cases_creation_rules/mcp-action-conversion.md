# MCP Action to Framework Conversion

## MCP Action Mapping

When auto-generating test cases from MCP Playwright navigation, convert actions as follows:

- `mcp0_browser_navigate(url)` → Generate `Given open {page_name} page` step
- `mcp0_browser_click(element, ref)` → Use `clickElement(locator)` in page object method
- `mcp0_browser_type(text, element, ref)` → Generate input step using custom framework methods
- `mcp0_browser_snapshot()` → Add verification step with `expectWithScreenshot()`
- `mcp0_browser_select_option()` → Use dropdown selection methods
- `mcp0_browser_hover()` → Generate hover actions with custom methods

## Custom Methods Usage

Always use the custom methods defined in the framework instead of native Playwright methods:

- **Click Actions**: Use `clickElement()` from BasePage class
- **Assertions**: Use `expectWithScreenshot()` for verifications
- **Navigation**: Use `navigateToMenu()` for menu navigation
- **Screenshots**: Use `takeScreenshot()` for debugging
- **Waits**: Use `waitForElement()` for element waiting
- **Text Retrieval**: Use `getElementText()` for getting text content
