# Design: CLI UIKit Replaceability and Layer Violations

## Context

HAI3 follows a strict 4-layer architecture where the app layer (generated projects) should only depend on Layer 3 (@hai3/react) and UI packages (@hai3/uikit, @hai3/studio). Direct imports from Layer 2 (@hai3/framework) or Layer 1 packages (@hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets) violate dependency direction rules.

The CLI currently:
1. Hard-codes @hai3/uikit as a dependency with no opt-out mechanism
2. Generates Menu.tsx with an import that violates layer rules
3. May potentially include L1/L2 dependencies in generated package.json (needs audit)

## Goals

- Restore UIKit replaceability for users who want custom UI kits
- Fix layer violation in generated code (Menu.tsx and potentially other layout templates)
- Ensure demo screenset works independently of UIKit selection
- Enforce that generated package.json only contains allowed HAI3 dependencies
- Add ESLint rules to generated projects to enforce layer boundaries at lint-time
- Maintain backward compatibility (UIKit included by default)

## Non-Goals

- Creating alternative layout templates for non-UIKit projects (users handle this)
- Adding new UI kit options beyond 'hai3' and 'none'

## Decisions

### Decision 1: UIKit Option Values

**What**: Use `--uikit` option with values `hai3` (default) and `none`

**Why**:
- Simple binary choice covers the primary use case
- `hai3` as default maintains backward compatibility
- `none` is clearer than `custom` since we don't provide custom templates

**Alternatives considered**:
- `--no-uikit` boolean flag: Less extensible if we add more UI kit options later
- `--uikit custom`: Implies we provide something for "custom" which we don't

### Decision 1b: Interactive Prompt as Select (Not Boolean)

**What**: Interactive prompt uses select with choices `['hai3', 'none']` instead of boolean confirm

**Why**:
- Consistency with CLI option format
- Future extensibility if more UI kit options are added
- Clearer user experience with explicit choices

**Implementation**:
```typescript
const uikit = await select({
  message: 'Select UI kit:',
  choices: [
    { value: 'hai3', label: 'HAI3 UIKit (@hai3/uikit)' },
    { value: 'none', label: 'None (implement your own)' }
  ],
  default: 'hai3'
});
```

### Decision 2: Conditional Package.json Generation

**What**: Use simple conditional in `generateProject()` to include/exclude @hai3/uikit

**Why**:
- Minimal code change
- Clear intent
- Easy to extend for future UI kit options

**Implementation**:
```typescript
if (uikit === 'hai3') {
  dependencies['@hai3/uikit'] = 'alpha';
}
```

### Decision 3: Conditional Layout Template Copying

**What**: Skip copying `layout/hai3-uikit/` directory when `uikit === 'none'`

**Why**:
- Layout templates are tightly coupled to @hai3/uikit components
- Users choosing `none` need to provide their own layout implementation
- Prevents broken imports in generated code

**Implementation**:
```typescript
if (uikit === 'hai3') {
  const layoutDir = path.join(templatesDir, 'layout', 'hai3-uikit');
  if (await fs.pathExists(layoutDir)) {
    const layoutFiles = await readDirRecursive(layoutDir, 'src/app/layout');
    files.push(...layoutFiles);
  }
}
```

### Decision 4: Layer Violation Fix

**What**: Change Menu.tsx import from `@hai3/framework` to `@hai3/react`

**Why**:
- @hai3/react already re-exports `menuActions` (line 123 of packages/react/src/index.ts)
- Maintains correct layer dependency direction
- No functional change - same export, different import path

### Decision 5: Comprehensive Layout Template Audit

**What**: Audit all layout templates (not just Menu.tsx) for layer violations

**Templates to audit**:
- Header.tsx, Footer.tsx, Sidebar.tsx, Popup.tsx, Overlay.tsx, Screen.tsx, Layout.tsx

**Why**:
- Menu.tsx violation suggests other templates may have similar issues
- Prevents propagating layer violations to all new HAI3 projects
- One-time audit ensures all templates are compliant

### Decision 6: Demo Screenset Exclusion Strategy

**What**: When `--uikit none` is selected, SKIP copying the demo screenset entirely and display an informational message.

**Context**:
- Demo screenset has 17+ files with `@hai3/uikit` imports
- These imports are integral to demonstrating HAI3 UIKit usage patterns
- Attempting to abstract these would remove the value of the demo

**Resolution**:
- When `uikit === 'none'`: Do NOT copy `templates/screensets/demo/` to `src/screensets/demo/`
- Display message: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
- Generate an empty or minimal `screensetRegistry.tsx` that handles the no-demo case

**Why**:
- Attempting to make demo work without UIKit would require either:
  - Removing all UIKit components (destroys demo value)
  - Creating abstract component interfaces (overengineering)
  - Duplicating demo with non-UIKit version (maintenance burden)
- Clean exclusion with helpful message is the simplest solution
- Users choosing `--uikit none` are expected to implement their own UI layer anyway

**Alternatives considered**:
- Make demo UIKit-agnostic: Too much refactoring, loses educational value
- Dual demo versions: Maintenance burden, unlikely to stay in sync
- Conditional imports in demo: Complex build setup, confusing for users

### Decision 8: ESLint Layer Enforcement (REQUIRED)

**What**: Add ESLint rule configuration to generated projects that prevents imports from L1/L2 packages at lint-time.

**Forbidden imports** (ESLint will error on these):
- `@hai3/framework` (L2)
- `@hai3/state` (L1)
- `@hai3/api` (L1)
- `@hai3/i18n` (L1)
- `@hai3/screensets` (L1)

**Implementation**:
```javascript
// In generated project's eslint.config.js or .eslintrc
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@hai3/framework', '@hai3/framework/*'],
          message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/framework is Layer 2.'
        },
        {
          group: ['@hai3/state', '@hai3/state/*'],
          message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/state is Layer 1.'
        },
        {
          group: ['@hai3/api', '@hai3/api/*'],
          message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/api is Layer 1.'
        },
        {
          group: ['@hai3/i18n', '@hai3/i18n/*'],
          message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/i18n is Layer 1.'
        },
        {
          group: ['@hai3/screensets', '@hai3/screensets/*'],
          message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/screensets is Layer 1.'
        }
      ]
    }]
  }
}
```

**Why**:
- Provides compile-time/lint-time protection against layer violations
- Catches errors before runtime, during development
- Enforces HAI3 architecture at the tooling level
- Clear error messages guide developers to correct imports
- Works with both `--uikit hai3` and `--uikit none` generated projects

**Alternatives considered**:
- `@typescript-eslint/no-restricted-imports`: Better TypeScript integration, but may require additional setup; evaluate based on existing ESLint config
- Custom ESLint plugin: More flexible, but overkill for simple import restrictions
- No ESLint enforcement (original "optional" approach): Rejected because runtime errors from layer violations are harder to debug than lint errors

**Note**: The rule configuration is added to CLI templates so all newly generated projects get layer enforcement automatically.

### Decision 9: Monorepo Source Files Layer Enforcement (CRITICAL)

**What**: Fix layer violations in monorepo source files at `/src/app/`

**Context**: The monorepo's `/src/app/` directory is the SOURCE OF TRUTH for the demo application. Implementation review discovered that these files have layer violations that were missed because the monorepo ESLint config lacked enforcement for `src/app/**`.

**Files requiring fixes:**
1. `/src/app/layout/Menu.tsx`:
   - FROM: `import { menuActions } from '@hai3/framework';`
   - TO: `import { menuActions } from '@hai3/react';`

2. `/src/app/api/mocks.ts`:
   - FROM: `import type { MockMap } from '@hai3/api';`
   - TO: `import type { MockMap } from '@hai3/react';`
   - FROM: `import { Language } from '@hai3/i18n';`
   - TO: `import { Language } from '@hai3/react';`

3. `/src/app/api/AccountsApiService.ts`:
   - FROM: `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/api';`
   - TO: `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';`

**Why**:
- `@hai3/react` already re-exports all required symbols (verified in packages/react/src/index.ts)
- Maintains correct layer dependency direction (app layer -> L3 only)
- Prevents the monorepo from violating its own architecture rules

### Decision 10: Monorepo ESLint Layer Enforcement

**What**: Add ESLint rules to `/eslint.config.js` that enforce layer boundaries for `src/app/**` files

**Implementation**:
```javascript
// In /eslint.config.js - add after existing src/** rules
{
  files: ['src/app/**/*.ts', 'src/app/**/*.tsx'],
  ignores: ['**/*.test.*', '**/*.spec.*'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@hai3/framework', '@hai3/framework/*'],
            message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/framework is Layer 2.'
          },
          {
            group: ['@hai3/state', '@hai3/state/*'],
            message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/state is Layer 1.'
          },
          {
            group: ['@hai3/api', '@hai3/api/*'],
            message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/api is Layer 1.'
          },
          {
            group: ['@hai3/i18n', '@hai3/i18n/*'],
            message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/i18n is Layer 1.'
          },
          {
            group: ['@hai3/screensets', '@hai3/screensets/*'],
            message: 'App-layer code must import from @hai3/react, not directly from L1/L2 packages. @hai3/screensets is Layer 1.'
          }
        ]
      }
    ]
  }
}
```

**Why**:
- Prevents future layer violations in monorepo source files
- Catches errors during `npm run lint` before they reach production
- Consistent with standalone project ESLint rules (same enforcement)

**Note**: The standalone ESLint config at `packages/cli/template-sources/project/configs/eslint.config.js` already has these rules and should remain unchanged.

### Decision 11: Template Architecture Clarification (SUPERSEDED by Decision 14)

**What**: Clarify the relationship between monorepo sources and CLI templates

**Original Architecture** (before Issue 11 fix):
```
/src/app/layout/                 -> Monorepo demo app layout (SOURCE OF TRUTH for monorepo)
packages/cli/template-sources/   -> CLI template sources (DUPLICATE - manually maintained)
packages/cli/templates/          -> Build output (gitignored, generated from template-sources)
```

**New Architecture** (after Issue 11 fix):
```
/src/app/layout/                 -> SINGLE SOURCE OF TRUTH for both monorepo AND CLI templates
packages/cli/template-sources/   -> Other templates only (layout/ removed, gitignored)
packages/cli/templates/          -> Build output (layout copied from /src/app/layout/)
```

**Key insight**: The CLI templates and monorepo sources were SEPARATE but this caused sync issues (Menu.tsx desync). Issue 11 (Decision 14) eliminates this duplication by making `/src/app/layout/` the single source of truth.

**Why this matters**:
- Fixing `/src/app/layout/` now fixes BOTH the monorepo AND CLI templates automatically
- No more manual synchronization between two locations
- Issue 2, Issue 6, and Issue 9 all affect `/src/app/layout/` - one fix propagates everywhere

### Decision 12: Fix Flux Violations in /src/app/ (Issue 9) - DETAILED DESIGN

**What**: Fix the Flux architecture violation in `/src/app/layout/Menu.tsx` where direct slice dispatch is used.

**Current violation (line 38):**
```typescript
dispatch(menuActions.toggleMenu());  // Direct slice dispatch - VIOLATION
```

**Problem**: `menuActions.toggleMenu()` is a Redux slice action creator (from createSlice). Dispatching it directly bypasses the event-driven architecture required by HAI3's Flux pattern.

**Correct pattern:**
```
Component -> Action (emits event) -> Event -> Effect -> Slice -> Store
```

#### EXISTING FRAMEWORK INFRASTRUCTURE (DISCOVERED)

The framework already provides event-based menu control in `/packages/framework/src/plugins/layout.ts`:

1. **Existing Event:** `layout/menu/collapsed` (declared in EventPayloadMap)
   - Payload: `{ collapsed: boolean }`
   - Past-tense naming follows EVENTS.md conventions

2. **Existing Action:** `toggleMenuCollapsed(payload: { collapsed: boolean })`
   - Location: `/packages/framework/src/plugins/layout.ts` line 86-88
   - Emits: `eventBus.emit('layout/menu/collapsed', payload)`

3. **Existing Effect:** Registered in `layout()` plugin's `onInit()` (line 167-169)
   - Subscribes to `layout/menu/collapsed` event
   - Dispatches: `menuActions.setCollapsed(payload.collapsed)`

**KEY INSIGHT:** The framework has `setCollapsed` (set to specific value) but Menu.tsx uses `toggleMenu` (flip current value). The component needs to read current state and call the action with the opposite value.

#### CORRECTED PATTERN FOR Menu.tsx

**Option A: Use existing framework action (CONSIDERED BUT REJECTED)**

This approach would use the framework's `toggleMenuCollapsed` action via `app.actions`:

```typescript
// THEORETICAL (but not viable):
import { useHAI3 } from '@hai3/react';

const handleToggleCollapse = () => {
  const newCollapsed = !collapsed;
  app.actions.toggleMenuCollapsed({ collapsed: newCollapsed });
};
```

**Why Option A is rejected:**
- `toggleMenuCollapsed` is provided via `app.actions` which is a plugin-based runtime API
- Components don't have direct access to the `app` instance without additional setup
- `app.actions.toggleMenuCollapsed` is NOT directly exported from `@hai3/react`
- Would require passing the app instance through React context or props, adding complexity

**Option B: Direct eventBus.emit (CHOSEN)**

Create a local action that directly emits the event. This is simpler because `eventBus` IS exported from `@hai3/react`.

```typescript
// /src/app/actions/layoutActions.ts (NEW FILE)
import { eventBus } from '@hai3/react';

/**
 * Toggle menu collapsed state
 * Emits 'layout/menu/collapsed' event (framework effect handles slice update)
 */
export function toggleMenuCollapsed(collapsed: boolean): void {
  eventBus.emit('layout/menu/collapsed', { collapsed });
}
```

Then in Menu.tsx:
```typescript
// BEFORE (VIOLATION):
import { menuActions } from '@hai3/react';
const dispatch = useAppDispatch();

const handleToggleCollapse = () => {
  dispatch(menuActions.toggleMenu());  // VIOLATION: Direct slice dispatch
};

// AFTER (CORRECT - Option B chosen):
// /src/app/layout/Menu.tsx (CORRECTED)
import { toggleMenuCollapsed } from '@/app/actions/layoutActions';

const handleToggleCollapse = () => {
  toggleMenuCollapsed(!collapsed);  // No dispatch needed - action emits event
};
```

**Why Option B is chosen:**
1. `eventBus` is directly exported from `@hai3/react` (verified in packages/react/src/index.ts)
2. No need for app instance access or additional React context setup
3. Follows the same pattern the framework's own actions use internally
4. Simpler implementation with fewer dependencies
5. The framework's effect already listens for `layout/menu/collapsed` and handles the slice update

#### DATA FLOW (CORRECTED)

```
User clicks menu toggle
        |
        v
Menu.tsx handleToggleCollapse()
        |
        v
toggleMenuCollapsed({ collapsed: !currentCollapsed })  // Action
        |
        v
eventBus.emit('layout/menu/collapsed', { collapsed })  // Event
        |
        v
layout plugin onInit() effect listener               // Effect
        |
        v
dispatch(menuActions.setCollapsed(collapsed))        // Slice update (in effect only)
        |
        v
Redux store updates state['layout/menu'].collapsed   // Store
        |
        v
Menu.tsx re-renders with new collapsed value         // Component
```

#### FILES TO MODIFY

1. **Create (if Option B):** `/src/app/actions/layoutActions.ts`
   - Export `toggleMenuCollapsed` function that emits event

2. **Modify:** `/src/app/layout/Menu.tsx`
   - Remove: `const dispatch = useAppDispatch();`
   - Remove: `import { menuActions } from '@hai3/react';` (if only used for toggle)
   - Add: Import the action function
   - Change: `handleToggleCollapse` to call action instead of dispatch

#### WHY THIS MATTERS

- Maintains unidirectional data flow
- Effects are the only place where slice actions should be dispatched
- Components should not know about slice implementation details
- Enables proper separation of concerns and testability
- Leverages existing framework infrastructure (no new events needed)

### Decision 13: Extend Flux ESLint Rules to /src/app/ (Issue 10)

**What**: Add ESLint rules to catch direct slice action dispatch patterns that the current rules miss.

**Gap identified**: The current ESLint rule catches `dispatch(setXxx(...))` but NOT `dispatch(xxxActions.yyy())`.

**New ESLint selector:**
```javascript
{
  selector: "CallExpression[callee.name='dispatch'] > CallExpression[callee.type='MemberExpression'][callee.property.name=/^[a-z]/]",
  message: 'FLUX VIOLATION: Components cannot dispatch slice actions directly. Use event-emitting actions instead. See EVENTS.md.'
}
```

This selector catches:
- `dispatch(menuActions.toggleMenu())` - slice action object member call
- `dispatch(userActions.setName('test'))` - slice action object member call

**Scope of rules for /src/app/ subdirectories:**

| Directory | Rules Required |
|-----------|----------------|
| `/src/app/layout/` | Component flux rules (no direct dispatch, no store import) |
| `/src/app/actions/` | Action rules (no async, no getState, no slice imports) |
| `/src/app/effects/` | Effect rules (no event emission, no action imports) |
| `/src/app/events/` | Event naming conventions (past-tense) |
| `/src/app/api/` | L3 imports only, minimal flux rules |
| `/src/app/themes/` | Configuration only, minimal rules |
| `/src/app/icons/` | Asset files, minimal rules |
| `/src/app/uikit/` | Presentational rules (no business logic) |

**Why both monorepo and standalone configs need update:**
- Monorepo config (`/eslint.config.js`): Catches violations in monorepo source files
- Standalone config (`packages/cli/template-sources/.../eslint.config.js`): Propagates to generated projects

### Decision 14: Eliminate Layout Template Duplication (Issue 11 - CRITICAL)

**What**: Remove the duplicated layout files in `template-sources/layout/` and make `/src/app/layout/` the single source of truth for CLI layout templates.

**Current problem:**
```
/src/app/layout/                          -> Monorepo's working layout files
packages/cli/template-sources/layout/     -> DUPLICATE, manually maintained (tracked in git)
packages/cli/templates/layout/            -> Build output (gitignored)
```

The duplication causes sync issues. Menu.tsx in template-sources was fixed but the monorepo source was not.

**Solution:**
```
/src/app/layout/                          -> Single source of truth (fix violations here)
packages/cli/template-sources/layout/     -> REMOVED from git, added to .gitignore
packages/cli/templates/layout/            -> Build output, copied from /src/app/layout/
```

**Implementation changes:**

1. **copy-templates.ts** (lines 531-538):
```typescript
// BEFORE:
const layoutSrc = path.join(CLI_ROOT, 'template-sources', 'layout');
const layoutDest = path.join(TEMPLATES_DIR, 'layout');

// AFTER:
const layoutSrc = path.join(PROJECT_ROOT, 'src/app/layout');
const layoutDest = path.join(TEMPLATES_DIR, 'layout', 'hai3-uikit');
```

2. **manifest.yaml** layout section:
```yaml
# BEFORE:
layout:
  source: ./layout/hai3-uikit/
  description: "Layout component templates using @hai3/uikit"

# AFTER:
layout:
  source: ../../src/app/layout/  # Relative to template-sources directory
  description: "Layout component templates using @hai3/uikit (from monorepo source)"
```

3. **.gitignore** addition:
```
# CLI template-sources generated directories
packages/cli/template-sources/layout/
```

4. **Git cleanup**:
```bash
git rm -r --cached packages/cli/template-sources/layout/
```

**Why this matters:**
- Single source of truth eliminates sync issues
- Fixes to `/src/app/layout/` (Issues 6, 9) automatically propagate to CLI templates
- No manual maintenance of duplicate files
- CLI build generates templates from the working monorepo code

**Alternatives considered:**
- Keep both and sync manually: Rejected - error-prone, already caused Menu.tsx desync
- Use symlinks: Rejected - doesn't work well cross-platform
- Build-time validation: Rejected - doesn't prevent the problem, just detects it

### Decision 7: Generated Package.json Layer Enforcement (CRITICAL)

**What**: Strictly enforce that generated package.json contains only allowed HAI3 dependencies

**Allowed dependencies**:
- `@hai3/react` (L3) - REQUIRED for all generated projects
- `@hai3/uikit` (L3+) - CONDITIONAL, only when `--uikit hai3`
- `@hai3/studio` (L3+) - CONDITIONAL, only when `--studio` is enabled

**Forbidden dependencies** (MUST NOT appear in generated package.json):
- `@hai3/framework` (L2)
- `@hai3/state` (L1)
- `@hai3/api` (L1)
- `@hai3/i18n` (L1)
- `@hai3/screensets` (L1)

**Why**:
- Enforces HAI3 layer architecture at the dependency level
- Prevents generated projects from having invalid dependency graphs
- L1/L2 packages are internal implementation details of @hai3/react
- App layer should only interact with the L3 facade

**Validation**:
- Audit current `generateProject()` to verify compliance
- Add test case that verifies generated package.json has no L1/L2 deps
- Test should fail if forbidden packages are added in the future

## Risks and Mitigations

### Risk: Users selecting `--uikit none` without understanding implications
**Mitigation**:
- Clear documentation in CLI help text
- Warning message during project creation that layout must be implemented manually

### Risk: Breaking change if UIKit was expected
**Mitigation**:
- Default value is `hai3` (UIKit included)
- Existing workflows unchanged

### Risk: Demo screenset has UIKit dependencies
**Mitigation**:
- Audit demo screenset templates before implementation
- If UIKit dependencies found, either:
  - Remove them and use generic patterns
  - Or conditionally exclude demo when `--uikit none`
- Document any limitations in CLI help

### Risk: Other layout templates have layer violations
**Mitigation**:
- Comprehensive audit of all layout templates (Header, Footer, Sidebar, etc.)
- Fix any violations found using same pattern as Menu.tsx
- Verify @hai3/react exports required symbols

### Risk: Generated package.json includes L1/L2 dependencies
**Mitigation**:
- Audit current `generateProject()` code
- Add explicit test that fails if L1/L2 deps are present
- Document allowed dependency whitelist in design

### Risk: ESLint rule may have false positives or be too restrictive
**Mitigation**:
- Rule only blocks specific @hai3/* packages (L1/L2), not all imports
- Clear error messages explain why the import is forbidden and what to use instead
- Rule applies only to generated projects, not to HAI3 framework itself
- Developers can override rule in specific files if truly needed (not recommended)

## Data Flow

```
hai3 create my-app --uikit none
         |
         v
   createCommand
         |
    uikit='none'
         |
         v
   generateProject({
     projectName: 'my-app',
     studio: true,
     uikit: 'none',  // <-- New parameter
     layer: 'app'
   })
         |
         v
   Conditional checks:
   - if (uikit === 'hai3') add @hai3/uikit to package.json
   - if (uikit === 'hai3') copy layout/hai3-uikit/ templates
```

## Validation

### CLI Template Validation
1. **Type-check**: `npm run type-check` must pass
2. **Architecture check**: `npm run arch:check` must pass
3. **Manual test**: Create projects with both `--uikit hai3` and `--uikit none`
4. **Verify imports**: Confirm all layout templates use @hai3/react imports (not @hai3/framework)
5. **Demo screenset test**: Verify demo screenset has no @hai3/uikit imports that would break with `--uikit none`
6. **Package.json layer compliance**: Verify generated package.json contains ONLY:
   - Required: `@hai3/react`
   - Conditional: `@hai3/uikit` (when `--uikit hai3`), `@hai3/studio` (when `--studio`)
   - No L1/L2 packages: `@hai3/framework`, `@hai3/state`, `@hai3/api`, `@hai3/i18n`, `@hai3/screensets`
7. **ESLint layer enforcement test**: Verify generated projects have ESLint rule that:
   - Errors when importing from `@hai3/framework`, `@hai3/state`, `@hai3/api`, `@hai3/i18n`, `@hai3/screensets`
   - Allows imports from `@hai3/react` and `@hai3/uikit`
   - Works in both `--uikit hai3` and `--uikit none` projects
   - Provides clear error message directing to `@hai3/react`

### Monorepo Source Validation (Issue 6 and 7)
8. **Monorepo source files layer compliance**: Verify the following files import from `@hai3/react`:
   - `/src/app/layout/Menu.tsx`: `menuActions` from `@hai3/react`
   - `/src/app/api/mocks.ts`: `MockMap` and `Language` from `@hai3/react`
   - `/src/app/api/AccountsApiService.ts`: `BaseApiService`, `RestProtocol`, `RestMockPlugin` from `@hai3/react`
9. **@hai3/react export verification**: Confirm packages/react/src/index.ts exports:
   - `menuActions` (line 123)
   - `BaseApiService`, `RestProtocol`, `RestMockPlugin` (lines 186-190)
   - `MockMap` (line 293)
   - `Language` (line 218)
10. **Monorepo ESLint enforcement**: Verify `/eslint.config.js` includes layer rules for `src/app/**`:
    - Rule blocks imports from `@hai3/framework`, `@hai3/state`, `@hai3/api`, `@hai3/i18n`, `@hai3/screensets`
    - Rule is applied to `src/app/**/*.ts` and `src/app/**/*.tsx` files
11. **Monorepo lint pass**: After fixing source files and adding ESLint rules, `npm run lint` must pass
12. **Monorepo build**: `npm run build` must succeed after all fixes

### Flux Architecture Validation (Issue 9 and 10)
13. **Menu.tsx Flux compliance**: Verify `/src/app/layout/Menu.tsx` does NOT contain direct slice dispatch:
    - No `dispatch(menuActions.xxx())` patterns
    - No `dispatch(xxxActions.yyy())` patterns where xxxActions is a slice actions object
    - Menu toggle uses event-based action pattern
14. **Event-based menu toggle**: Verify the menu toggle flow follows Flux pattern:
    - Action function emits event (e.g., `uicore/menu/toggled`)
    - Effect subscribes to event and dispatches slice action
    - Component calls action function, not dispatch
15. **ESLint catches slice action dispatch**: Verify ESLint rule catches `dispatch(xxxActions.yyy())` pattern:
    - Test with: `dispatch(menuActions.toggleMenu())` - should error
    - Test with: `dispatch(userActions.setName('test'))` - should error
    - Allowed: `dispatch(setLoading(true))` - still caught by existing rule
16. **ESLint rule in both configs**: Verify both ESLint configs have the new rule:
    - `/eslint.config.js` - monorepo config
    - `/packages/cli/template-sources/project/configs/eslint.config.js` - standalone config
17. **Generated project Flux enforcement**: Verify generated projects catch the pattern:
    - Create project with `hai3 create test-flux`
    - Add test file with `dispatch(testActions.doSomething())`
    - Run `npm run lint` - should error
18. **Demo app functional test**: Verify menu toggle works after fix:
    - Click menu collapse button
    - Menu should collapse/expand as before
    - No console errors

### Layout Template Single Source of Truth (Issue 11)
19. **Git tracking removed**: Verify `packages/cli/template-sources/layout/` is NOT tracked in git:
    - `git ls-files packages/cli/template-sources/layout/` returns empty
    - Directory is listed in `.gitignore`
20. **Build copies from monorepo source**: Verify `copy-templates.ts` copies from `/src/app/layout/`:
    - Run `npm run build` in packages/cli
    - Verify `templates/layout/hai3-uikit/` files match `/src/app/layout/` files exactly
21. **Layout sync verification**: After fixing Issues 6 and 9 in `/src/app/layout/`:
    - Run CLI build
    - Verify CLI templates have the fixes (import from @hai3/react, no direct dispatch)
    - No manual sync required
22. **Generated project layout test**: Verify generated projects get correct layout:
    - `hai3 create test-layout --uikit hai3`
    - Verify `test-layout/src/app/layout/` files match monorepo source
    - Verify no layer violations in generated layout files
