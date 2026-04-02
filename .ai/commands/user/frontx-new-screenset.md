<!-- @standalone -->
# frontx:new-screenset - Create New Screenset

## PREREQUISITES (CRITICAL - STOP IF FAILED)
Run `frontx --version`.
STOP: If fails, tell user to install.
FORBIDDEN: Proceeding without CLI tools.
FORBIDDEN: Creating screenset manually or by copying peers.

## AI WORKFLOW (REQUIRED)
1) Check prerequisites above.
2) Read .ai/targets/SCREENSETS.md and .ai/targets/EVENTS.md before starting.
3) Read `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** planning unit tests, validation, or any test-related tasks in this command (project-owned overrides take precedence over defaults here; `UNIT_TESTING.md` defines the exact test commands, shared-helper convention, and durable starter-baseline rules).
4) Read `frontx.config.json` at project root to identify the configured `uikit` value.
   - If a third-party package (not `shadcn` or `none`): read its exports to discover available components.
5) Gather requirements from user (including UI sections).
6) Present implementation plan and wait for approval.
7) Implement after approval.

## GATHER REQUIREMENTS
Ask user for:
- Screenset name (camelCase).
- Category: Drafts | Mockups | Production.
- Initial screens.
- UI sections per screen (e.g., "stats cards, charts, activity feed").

## STEP 1: Present Plan (REQUIRED)
Present the following to the user for approval:

### Plan structure
- **Summary**: Add new {category} screenset "{screensetName}" with {screens} screen(s).
- **Name**: {screensetName}
- **Category**: {category}
- **Initial screens**: {screens}
- **Component Plan**:
  - REQUIRED: Use components from the configured UI kit (from frontx.config.json `uikit` field); create local only if missing.
  - If uikit is a third-party package: import its components directly (e.g., `import { Button } from '@mui/material'`).
  - components/ui/: base UI primitives (shadcn components or custom)
  - components/: multi-screen shared components
  - screens/{screen}/components/: screen-specific components
- **Data Flow**:
  - Events: {domain events per EVENTS.md}
  - State: slices/, events/, effects/, actions/
  - API: api/{Name}ApiService.ts with mocks and endpoint descriptors
  - Endpoint descriptors live on the service class only
- **Tasks**:
  - Create screenset: `frontx screenset create {name}`
  - Create components per Component Plan (BEFORE screen file)
  - Implement data flow per EVENTS.md (actions emit events, effects update slices)
  - Add API service with mocks and endpoint descriptors via explicit contracts (for example `this.protocol(RestEndpointProtocol).query()` / `.mutation()`)
  - Add or update starter unit tests for stable generated behavior and preserve the baseline API-contract plus `HomeScreen` smoke-test patterns from `.ai/project/targets/UNIT_TESTING.md`
  - Validate: run `test:unit`, `type-check`, `arch:check`, and `lint` via this project's package manager per `.ai/project/targets/UNIT_TESTING.md` (which defines the exact commands). Apply constraints from workflow step 3.
  - Test via Chrome DevTools MCP

## STEP 2: Wait for Approval
Tell user: "Review the plan above. Confirm to proceed with implementation."

## STEP 3: Implementation
After approval, follow the plan strictly:
1) Create screenset via `frontx screenset create` (REQUIRED).
2) Create components BEFORE screen file per Component Plan.
3) Implement data flow per .ai/targets/EVENTS.md:
   - Actions emit events via eventBus.emit()
   - Effects subscribe and update slices
   - FORBIDDEN: Direct slice dispatch from components
4) Add API service with mocks and endpoint descriptors:
   - Read endpoints: `readonly prop = this.protocol(RestEndpointProtocol).query<T>('/path')`
   - Write endpoints: `readonly prop = this.protocol(RestEndpointProtocol).mutation<T, V>('PUT', '/path')`
   - NO queryOptions, NO manual query key factories outside the service
   - Screens use `useApiQuery(service.prop)` and `useApiMutation({ endpoint: service.prop })`
5) Add or update starter unit tests for stable generated behavior, preserve the baseline API-contract plus `HomeScreen` smoke-test patterns, and place any test-only helpers in a sibling `__test-utils__/` folder.
6) Validate: run `test:unit`, `type-check`, `arch:check`, and `lint` via this project's package manager per `.ai/project/targets/UNIT_TESTING.md` (which defines the exact commands). Apply constraints from workflow step 3.
7) Test via Chrome DevTools MCP (REQUIRED):
   - Navigate to new screenset
   - Verify screen renders without console errors
   - Test user interactions trigger correct events
   - Verify state updates via Redux DevTools
   - STOP if MCP connection fails

## TESTING
- REQUIRED: Load `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** interpreting unit-test requirements elsewhere in this command.
- REQUIRED: Preserve the generated API-contract test and `HomeScreen` smoke test unless the new behavior replaces that baseline intentionally.
- REQUIRED: Keep starter assertions route-agnostic and placeholder-safe; use durable patterns, neutral fixtures, and stable IDs, keys, or roles instead of generated names or localized copy.
