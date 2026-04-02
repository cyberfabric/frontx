<!-- @standalone -->
# frontx:new-screen - Add New Screen

## PREREQUISITES (CRITICAL - STOP IF FAILED)
FORBIDDEN: Proceeding without user approval of the plan.
FORBIDDEN: Creating screen without reading target files first.

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/SCREENSETS.md and .ai/targets/EVENTS.md before starting.
2) Read `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** planning unit tests, validation, or any test-related tasks in this command (project-owned overrides take precedence over defaults here; `UNIT_TESTING.md` defines the exact test commands, shared-helper convention, and durable assertion rules).
3) Read `frontx.config.json` at project root to identify the configured `uikit` value.
   - If a third-party package (not `shadcn` or `none`): read its exports to discover available components.
4) Gather requirements from user (including UI sections).
5) Present implementation plan and wait for approval.
6) Implement after approval.

## GATHER REQUIREMENTS
Ask user for:
- Screenset path (e.g., src/screensets/chat).
- Screen name (camelCase).
- UI sections (e.g., "header, form, data table").
- Add to menu? (Y/N)

## STEP 1: Present Plan (REQUIRED)
Present the following to the user for approval:

### Plan structure
- **Summary**: Add new screen "{screenName}" to {screenset} screenset.
- **Screenset**: {screenset}
- **Screen name**: {screenName}
- **Add to menu**: {Y/N}
- **Component Plan**:
  - REQUIRED: Use components from the configured UI kit (from frontx.config.json `uikit` field); create local only if missing.
  - If uikit is a third-party package: import its components directly.
  - components/ui/: base UI primitives (shadcn components or custom)
  - screens/{screen}/components/: screen-specific components
- **Data Flow**: Uses existing screenset events/slices per EVENTS.md; screen dispatches actions, never direct slice updates. Data fetching via endpoint descriptors: `useApiQuery(service.descriptor)`, `useApiMutation({ endpoint: service.descriptor })`.
- **Tasks**:
  - Add screen ID to ids.ts
  - Create components per Component Plan (BEFORE screen file)
  - Create screen (orchestrates components, follows EVENTS.md data flow)
  - Add or update a screen test that covers stable render or behavior and follows `.ai/project/targets/UNIT_TESTING.md` for helper placement and durable assertions
  - Add i18n files for all languages
  - Add to menu (if requested)
  - Validate: run `test:unit`, `type-check`, and `arch:check` via this project's package manager per `.ai/project/targets/UNIT_TESTING.md` (which defines the exact commands). Apply constraints from workflow step 2.
  - Test via Chrome DevTools MCP

## STEP 2: Wait for Approval
Tell user: "Review the plan above. Confirm to proceed with implementation."

## STEP 3: Implementation
After approval, follow the plan strictly:
1) Add screen ID to ids.ts.
2) Create components BEFORE screen file per Component Plan.
3) Create screen following data flow rules from .ai/targets/EVENTS.md:
   - Use actions to trigger state changes
   - FORBIDDEN: Direct slice dispatch from screen
4) Add i18n with useScreenTranslations(). Export default.
5) Add or update a screen test that covers stable render or behavior for the new screen and place any test-only helpers in a sibling `__test-utils__/` folder.
6) Add to menu if requested.
7) Validate: run `test:unit`, `type-check`, and `arch:check` via this project's package manager per `.ai/project/targets/UNIT_TESTING.md` (which defines the exact commands). Apply constraints from workflow step 2.
8) Test via Chrome DevTools MCP (REQUIRED):
   - Navigate to new screen
   - Verify screen renders without console errors
   - Test UI interactions and data flow
   - Verify translations load correctly
   - STOP if MCP connection fails

## TESTING
- REQUIRED: Load `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** interpreting unit-test requirements elsewhere in this command.
- REQUIRED: Use neutral fixtures, translation mocks, and stable keys, roles, or IDs instead of placeholder-derived copy when adding or updating generated screen tests.
