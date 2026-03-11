<!-- @standalone -->
# hai3:new-screen - Add New Screen

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/SCREENSETS.md and .ai/targets/EVENTS.md before starting.
2) Gather requirements from user (including UI sections).
3) Implement.

## GATHER REQUIREMENTS
Ask user for:
- Screenset path (e.g., src/screensets/chat).
- Screen name (camelCase).
- UI sections (e.g., "header, form, data table").
- Add to menu? (Y/N)

## STEP 1: Implementation
1) Add screen ID to ids.ts.
2) Create components BEFORE screen file per Component Plan.
3) Create screen following data flow rules from .ai/targets/EVENTS.md:
   - Use actions to trigger state changes
   - FORBIDDEN: Direct slice dispatch from screen
4) Add i18n with useScreenTranslations(). Export default.
5) Add to menu if requested.
6) Validate: `npm run type-check && npm run lint`.
7) Test via Chrome DevTools MCP (REQUIRED):
   - Navigate to new screen
   - Verify screen renders without console errors
   - Test UI interactions and data flow
   - Verify translations load correctly
   - STOP if MCP connection fails

## COMPONENT PLAN
- REQUIRED: Use @hai3/uikit components first; local uikit only if missing.
- uikit/base/: rare primitives (inline styles allowed, needs justification)
- uikit/composite/: screenset composites (theme tokens only)
- screens/{screen}/components/: screen-specific components

## DATA FLOW
- Uses existing screenset events/slices per EVENTS.md
- Screen dispatches actions, never direct slice updates
