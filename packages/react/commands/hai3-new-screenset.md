<!-- @standalone -->
# hai3:new-screenset - Create New Screenset

## PREREQUISITES (CRITICAL - STOP IF FAILED)
Run `hai3 --version`.
STOP: If fails, tell user to install.
FORBIDDEN: Creating screenset manually or by copying peers.

## AI WORKFLOW (REQUIRED)
1) Check prerequisites above.
2) Read .ai/targets/SCREENSETS.md and .ai/targets/EVENTS.md before starting.
3) Gather requirements from user (including UI sections).
4) Implement.

## GATHER REQUIREMENTS
Ask user for:
- Screenset name (camelCase).
- Category: Drafts | Mockups | Production.
- Initial screens.
- UI sections per screen (e.g., "stats cards, charts, activity feed").

## STEP 1: Implementation
1) Create screenset via `hai3 screenset create` (REQUIRED).
2) Create components BEFORE screen file per Component Plan.
3) Implement data flow per .ai/targets/EVENTS.md:
   - Actions emit events via eventBus.emit()
   - Effects subscribe and update slices
   - FORBIDDEN: Direct slice dispatch from components
4) Add API service with mocks.
5) Validate: `npm run type-check && npm run arch:check && npm run lint`.
6) Test via Chrome DevTools MCP (REQUIRED):
   - Navigate to new screenset
   - Verify screen renders without console errors
   - Test user interactions trigger correct events
   - Verify state updates via Redux DevTools
   - STOP if MCP connection fails

## COMPONENT PLAN
- REQUIRED: Use @hai3/uikit components first; local uikit only if missing.
- uikit/base/: rare primitives (inline styles allowed, needs justification)
- uikit/composite/: screenset composites (theme tokens only)
- components/: multi-screen components
- screens/{screen}/components/: screen-specific components

## DATA FLOW
- Events: {domain events per EVENTS.md}
- State: slices/, events/, effects/, actions/
- API: api/{Name}ApiService.ts with mocks
