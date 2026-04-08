# Auto-Generated Validation Rules

## From MCP Snapshots

- Always add `expectWithScreenshot()` after major actions
- Generate Then steps for elements that should be visible after navigation
- Include text content verification when element contains important text
- Add screenshot calls with descriptive names: `await page.takeScreenshot('action_object_result')`

## Error Handling Requirements

1. **Always use custom methods** defined in framework configuration
1. **Follow BDD patterns** with proper Gherkin syntax
1. **Use existing page objects** and fixture injection
1. **Reference framework locators** from `locators.ts`
1. **Maintain consistent naming** following existing conventions
1. **Include proper error handling** with screenshots on failures
1. **Set appropriate context** for page object fixture selection
1. **Create locators based on qa-class attribute** when needed
1. **Always use existing methods** when possible

## Screenshot and Debugging

- Use `takeScreenshot()` for debugging
- Include meaningful screenshot names for debugging
- Add screenshots in assertion failures with descriptive names
- Always include verification with screenshot after major actions

## Assertion Patterns

- Use Playwright `expect()` for standard assertions in `Then` steps
- Use `expectWithScreenshot()` for verifications that need visual proof
- Include proper error handling with screenshots on failures
- Add descriptive error messages for failed assertions
- Verify element visibility and content when appropriate
