<!-- @standalone -->
# hai3:validate - Validate Changes

## AI WORKFLOW (REQUIRED)
1) Read .ai/GUIDELINES.md and identify target file(s) for your changes.
2) Summarize 3-7 key rules from applicable target file(s).
3) Run validation checks.
4) Report results.

## STEP 1: Route to Target Files
- Use .ai/GUIDELINES.md ROUTING section.
- Read each applicable target file.
- Summarize rules internally (not written).

## STEP 2: Run Architecture Check
```bash
npm run arch:check
```
REQUIRED: Must pass with zero errors.

## STEP 3: Check Common Violations
- Direct slice dispatch (use event-driven actions instead).
- Inline styles outside base uikit folders (uikit/base/ only).
- Import violations (package internals, circular dependencies).
- String literal IDs (must use constants or enums).
- Inline component definitions in *Screen.tsx files.
- Inline data arrays (must use API services).
- @hai3/uicore imports in screensets/*/uikit/ folders.
- Screenset uikit component when global @hai3/uikit has equivalent.

## STEP 4: Verify Event-Driven Flow
- Actions emit events (not dispatch slices).
- Effects listen to events and update slices.
- No prop drilling or callback-based state mutation.

## STEP 5: Test via Chrome DevTools MCP
STOP: If MCP WebSocket is closed, fix connection first.
- Exercise all affected flows and screens.
- Verify UI uses @hai3/uikit and theme tokens.
- Verify event-driven behavior (no direct slice dispatch).
- Check for console errors or missing registrations.

## STEP 6: Report Results
- List rules verified.
- List any violations found.
- Confirm npm run arch:check passed.

## IF VIOLATIONS FOUND
Use hai3:fix-violation command to correct issues.
