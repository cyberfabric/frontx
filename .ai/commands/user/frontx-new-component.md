<!-- @standalone -->
# frontx:new-component - Add New UI Component

## AI WORKFLOW (REQUIRED)
1) Read `frontx.config.json` at project root to identify the configured `uikit` value.
2) Read `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** any unit-test, validation, or testing steps in this command (project-owned overrides take precedence over defaults here; `UNIT_TESTING.md` defines the exact test commands, shared-helper convention, and durable assertion rules).
3) Check if the configured UI kit or existing project components cover the need (see CHECK EXISTING COMPONENTS).
4) Gather requirements from user.
5) Confirm implementation plan with user.
6) Apply implementation directly.

## CHECK EXISTING COMPONENTS FIRST
- REQUIRED: Read `frontx.config.json` to find the `uikit` value.
- If uikit is a third-party package (not `shadcn` or `none`): read its exports from `node_modules/<package>/` to check for existing components.
- REQUIRED: Before creating a new component, scan the project AND the configured UI library for existing equivalents.
- REQUIRED: Reuse existing components if equivalent exists.

## GATHER REQUIREMENTS
Ask user for:
- Component name (e.g., "DataTable", "ColorPicker").
- Component description and props.

## STEP 1: Confirm Plan
Confirm with user:
- MFE/screenset name, component name, and placement.
- Props contract and expected behavior.

## STEP 2: Apply Implementation

### 2.1 Create Component
File: src/components/ui/{ComponentName}.tsx (for shadcn/base components)
  or: src/screens/{screen}/components/{ComponentName}.tsx (for screen-specific components)
  or: src/components/{ComponentName}.tsx (for shared composites)
- Must be reusable within the MFE.
- NO Redux or state management.
- Accept value/onChange pattern for state.

### 2.2 Export
Export from local index if needed.

### 2.3 Validation
If creating a shared composite in `src/components/`, add or update a component test for its stable behavior.
If test-only helpers are needed, place them in a sibling `__test-utils__/` folder per `.ai/project/targets/UNIT_TESTING.md`.
Run `npm run test:unit`, `npm run type-check`, `npm run arch:check`, and `npm run dev` (or the equivalent commands for this project's configured package manager) and apply any stricter triggers or conventions from `.ai/project/targets/UNIT_TESTING.md`. Apply constraints from workflow step 2.
Test component in UI.

## TESTING
- REQUIRED: Load `.ai/project/GUIDELINES.md` and `.ai/project/targets/UNIT_TESTING.md` when they exist **before** interpreting unit-test requirements elsewhere in this command.
- REQUIRED: Follow `.ai/project/targets/UNIT_TESTING.md` for `__test-utils__/` placement and durable, non-placeholder assertions when adding or updating tests.

## RULES
- REQUIRED: Check configured UI kit and existing project components first; create new only if missing.
- FORBIDDEN: Redux, business logic, side effects in components.
- FORBIDDEN: Inline styles outside components/ui/.
- REQUIRED: Accept value/onChange pattern for state.
- REQUIRED: New shared composite components in `src/components/` include a colocated or nearby unit test when the behavior is stable.
