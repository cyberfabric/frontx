# AI Locator Generation Policy - REAL DOM EXTRACTION

## CRITICAL RULES - NEVER VIOLATE THESE

### 0. FIRST: Search for Existing Locators Before Creating New Ones

- **ALWAYS search `locators.ts` for similar or identical locators before adding new ones**
- **Check for duplicate XPath patterns** (e.g., `//input[contains(@class, 'qa-native-input')]`)
- **Reuse existing locators when possible** to avoid duplication and maintenance issues
- **Example**: Use existing `EXEC_SUMMARY_SECTION_NAME_INPUT` instead of creating `EXEC_SUMMARY_SECTION_RENAME_FIELD` with same XPath
- **Search patterns**: grep for similar class names, element types, or functionality

### 1. MANDATORY: Extract from ACTUAL MCP DOM Structure

- **NEVER invent, imagine, or create generic locators**
- **ONLY use real DOM attributes from MCP Playwright session snapshots**
- **NEVER use generic elements like `//generic[...]`** — WRONG
- All locators MUST come from actual HTML elements captured in MCP session
- **ALWAYS extract exact class combinations and attributes from MCP DOM data**

### 2. Use REAL HTML Elements and Classes

```typescript
// CORRECT - Based on actual MCP DOM:
"//button[contains(@class, 'qa-button') and contains(@class, 'am-button_variant_primary')]"
"//div[contains(@class, 'am-text am-text_body-accent am-text_ellipsis qa')]"

// WRONG - Generic placeholders:
"//generic[contains(text(), 'Add item')]"
"//div[contains(@class, 'qa-{widget_name}')]"
```

### 3. XPath Format with Real DOM Attributes

- **ALWAYS use XPath syntax**: `//element[contains(@class,'qa-class')]`
- **NEVER use CSS selectors**: `[qa-class='...']` — WRONG
- **NEVER use bracket notation**: `[data-testid='...']` — WRONG
- **Use actual element types**: `button`, `div`, `input`, `span` (NOT `generic`)

## MANDATORY MCP DOM Extraction Process

### Step 1: Analyze MCP Session DOM Data

From MCP Playwright session snapshots, extract:

- **Exact element types**: `button`, `div`, `input`, `span`
- **Real class combinations**: `am-button am-button_variant_primary qa-button`
- **Actual attributes**: `title`, `aria-label`, `data-testid`
- **Playwright commands used**: `getByRole('button', { name: 'Add widget' })`

### Step 2: Priority Order for Real DOM Locators

1. **MCP ref evaluation**: Extract attributes via mcp0_browser_evaluate
2. **qa-class attributes** (highest priority):
   - `//button[contains(@class,'qa-button')]`
   - `//div[contains(@class, 'qa-add-section')]`
   - `//input[contains(@class, 'qa-native-input')]`
   - `//am-button[contains(@class, 'qa-add-widget-to-section')]`
   - `//span[contains(@class, 'qa-add-report')]`
3. **Exact class combinations**: `//button[contains(@class, 'qa-button') and contains(@class, 'am-button_variant_primary')]`
4. **Text content + element type**: `//button[contains(text(), 'Add item')]`

### Step 3: Document MCP Source in Comments

```typescript
// Add widget button (ref=e728) - Playwright used: getByRole('button', { name: 'Add widget' })
// DOM: <button type="button" title=" Add widget " class="am-button am-button_variant_primary qa-button">
ADD_WIDGET_BUTTON: "//button[contains(@class, 'qa-button') and contains(@class, 'am-button_variant_primary')]",
```

### Step 4: Always Extract DOM Attributes

If MCP snapshot lacks detailed attributes, use mcp0_browser_evaluate:

```json
{
  "tool": "mcp0_browser_evaluate",
  "params": {
    "ref": "<MCP_ELEMENT_REF>",
    "function": "(el) => ({ className: el.className, dataset: { ...el.dataset }, role: el.getAttribute('role'), ariaLabel: el.getAttribute('aria-label'), dataTestName: el.getAttribute('data-test-name'), dataTestId: el.getAttribute('data-testid'), tag: el.tagName.toLowerCase() })"
  }
}
```

Transform returned attributes to XPath:

- If `className` contains `qa-` token: `//{tag}[contains(@class,'qa-your-token')]`
- If `data-test-name` exists: `//{tag}[@data-test-name='exact-value']`
- If `data-testid` exists: `//*[@data-testid='exact-value']`
- Combine multiple classes: `//{tag}[contains(@class,'qa-token') and contains(@class,'am-class')]`

## REAL DOM EXAMPLES (CORRECT APPROACH)

### Executive Summary Widget Management

Based on actual MCP session (ref=e756, e728, e1772):

```typescript
export const EXECUTIVE_SUMMARY = {
  // Add item button (ref=e756) - Playwright: getByRole('button', { name: 'Add item' })
  // Real DOM: button with am-button classes
  ADD_ITEM_BUTTON: "//button[contains(@class, 'am-button') and contains(text(), 'Add item')]",

  // Add widget button (ref=e728) - Playwright: getByRole('button', { name: 'Add widget' })
  // Real DOM: <button class="am-button am-button_variant_primary qa-button" title=" Add widget ">
  ADD_WIDGET_BUTTON: "//button[contains(@class, 'qa-button') and contains(@class, 'am-button_variant_primary')]",

  // Devices widget option (ref=e1772) - Clicked element with device description
  // Real DOM: div containing specific text about registered devices
  DEVICES_WIDGET_OPTION: "//div[contains(text(), 'Shows the detailed information about registered devices')]//ancestor::div[1]",
} as const;
```

## WRONG EXAMPLES TO NEVER USE

```typescript
// NEVER use generic elements:
"//generic[contains(text(), 'Add item')]"

// NEVER use placeholder variables:
"//div[contains(@class, 'qa-{widget_name}')]"

// NEVER invent classes not in MCP DOM:
"//button[contains(@class, 'qa-add-item-button')]"  // If this class doesn't exist

// NEVER use CSS selectors:
"[qa-button='add-widget']"
".qa-button.am-button_variant_primary"
```

## Locator Organization

- Add locators to `tests/ui/locators.ts`
- Use existing objects: `REPORT_PAGE`, `MONITORING_PAGE`
- Create new objects following pattern: `{PAGE_NAME}` (UPPER_SNAKE_CASE keys)
- Always document MCP source with comments

## MANDATORY Quality Checks

- Locator uses actual HTML element type (`button`, `div`, `input`, `span`)
- Classes extracted from real MCP DOM data
- qa-class prioritized when available
- XPath syntax only (no CSS selectors)
- MCP reference documented in comments
- Matches actual Playwright commands from session
