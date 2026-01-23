# Change: Fix CLI UIKit Replaceability and Layer Violations

## Why

The `hai3 create` command no longer allows developers to opt-out of bundling @hai3/uikit. The `--uikit` option was removed, making UIKit a hard dependency for all generated projects. Additionally, the Menu.tsx layout template violates layer architecture rules by importing `menuActions` from @hai3/framework (Layer 2) instead of @hai3/react (Layer 3).

These issues:
1. Prevent users from using custom or alternative UI kits
2. Violate HAI3's own layer dependency rules in generated code
3. Could propagate architectural violations to all new HAI3 projects

## What Changes

### Issue 1: UIKit Replaceability
- **MODIFIED** `hai3 create` command: Restore `--uikit` option with choices: `hai3` (default) and `none`
- **MODIFIED** `generateProject()`: Add conditional logic to:
  - Include/exclude @hai3/uikit dependency in generated package.json
  - Include/exclude layout templates from `layout/hai3-uikit/`
- **MODIFIED** Interactive prompt: Change from boolean confirm to select with choices `['hai3', 'none']` for consistency with CLI option
- Affected files:
  - `packages/cli/src/commands/create/index.ts`
  - `packages/cli/src/generators/project.ts`

### Issue 2: Layer Violation Fix
- **MODIFIED** Menu.tsx template: Change import from `@hai3/framework` to `@hai3/react`
  - FROM: `import { menuActions } from '@hai3/framework';`
  - TO: `import { menuActions } from '@hai3/react';`
- **AUDIT** All layout templates for layer violations:
  - `templates/layout/hai3-uikit/Header.tsx`
  - `templates/layout/hai3-uikit/Footer.tsx`
  - `templates/layout/hai3-uikit/Sidebar.tsx`
  - `templates/layout/hai3-uikit/Popup.tsx`
  - `templates/layout/hai3-uikit/Overlay.tsx`
  - `templates/layout/hai3-uikit/Screen.tsx`
  - `templates/layout/hai3-uikit/Layout.tsx`
- Affected file: `packages/cli/templates/layout/hai3-uikit/Menu.tsx` (and potentially others found in audit)

### Issue 3: Demo Screenset UIKit Independence
- **AUDIT** Demo screenset templates for @hai3/uikit imports (17+ files have @hai3/uikit imports)
- **DECISION**: When `--uikit none` is selected, SKIP copying the demo screenset entirely
- **MESSAGE**: Display "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
- **RATIONALE**: Demo screenset is tightly coupled to @hai3/uikit components; abstracting these would remove its value as a demonstration
- Affected directory: `packages/cli/templates/screensets/demo/`

### Issue 4: Generated Package.json Layer Enforcement (CRITICAL)
- **ENFORCE** The CLI-generated project's package.json MUST NOT have dependencies on L1 or L2 packages
- **ALLOWED** HAI3 dependencies in generated package.json:
  - `@hai3/react` (L3) - REQUIRED always
  - `@hai3/uikit` (L3+) - CONDITIONAL on `--uikit` option
  - `@hai3/studio` (L3+) - CONDITIONAL on `--studio` option
- **NOT ALLOWED** in generated package.json:
  - `@hai3/framework` (L2)
  - `@hai3/state` (L1)
  - `@hai3/api` (L1)
  - `@hai3/i18n` (L1)
  - `@hai3/screensets` (L1)
- **AUDIT AND REMOVE**: Current `generateProject()` (lines 264-270 of project.ts) includes L1/L2 dependencies that MUST be removed:
  - `@hai3/framework` - REMOVE
  - `@hai3/state` - REMOVE
  - `@hai3/api` - REMOVE
  - `@hai3/i18n` - REMOVE
- **ADD** Validation/test step to enforce package.json compliance

### Issue 5: ESLint Layer Enforcement (REQUIRED)
- **ADD** ESLint rule configuration to generated projects to enforce layer boundaries at lint-time
- **RULE**: Configure `no-restricted-imports` (or `@typescript-eslint/no-restricted-imports` for TypeScript) to disallow:
  - `@hai3/framework` (L2)
  - `@hai3/state` (L1)
  - `@hai3/api` (L1)
  - `@hai3/i18n` (L1)
  - `@hai3/screensets` (L1)
- **ERROR MESSAGE**: "App-layer code must import from @hai3/react, not directly from L1/L2 packages"
- **IMPLEMENTATION**:
  - Add ESLint rule configuration to CLI templates (so all new projects get it)
  - Configuration goes in generated project's `eslint.config.js` or `.eslintrc`
  - Rule applies to all `src/**/*.{ts,tsx}` files in generated projects
- **RATIONALE**: Provides compile-time/lint-time protection against layer violations, catching errors before runtime
- Affected files:
  - `packages/cli/templates/eslint.config.js` (or equivalent ESLint config template)
  - ESLint configuration in project generator

## Impact

- Affected specs: `cli`
- Affected code:
  - `/packages/cli/src/commands/create/index.ts`
  - `/packages/cli/src/generators/project.ts`
  - `/packages/cli/templates/layout/hai3-uikit/Menu.tsx`
  - `/packages/cli/templates/layout/hai3-uikit/*.tsx` (all layout templates)
  - `/packages/cli/templates/screensets/demo/` (audit only)
  - `/packages/cli/templates/eslint.config.js` (ESLint layer enforcement rules)
- **NOT breaking**: Default behavior unchanged (UIKit included by default)
- **Compatibility**: Existing projects unaffected (but can manually add ESLint rules)

### Issue 6: Monorepo Source Files Are the Source of Truth (CRITICAL)

The monorepo's `/src/app/` directory contains the SOURCE OF TRUTH for application-layer files. These files have layer violations that were missed because the monorepo's ESLint config lacks layer enforcement for `src/app/**`.

**Files requiring fixes:**
1. `/src/app/layout/Menu.tsx` line 19:
   - FROM: `import { menuActions } from '@hai3/framework';`
   - TO: `import { menuActions } from '@hai3/react';`
2. `/src/app/api/mocks.ts` lines 9-10:
   - FROM: `import type { MockMap } from '@hai3/api';`
   - TO: `import type { MockMap } from '@hai3/react';`
   - FROM: `import { Language } from '@hai3/i18n';`
   - TO: `import { Language } from '@hai3/react';`
3. `/src/app/api/AccountsApiService.ts` line 8:
   - FROM: `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/api';`
   - TO: `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';`

**Verification:** `@hai3/react` already re-exports all required symbols:
- `menuActions` (line 123 of packages/react/src/index.ts)
- `BaseApiService`, `RestProtocol`, `RestMockPlugin` (lines 186-190)
- `MockMap` (line 293)
- `Language` (line 218)

### Issue 7: Monorepo ESLint Must Enforce Layer Rules on /src/app/

The monorepo's `/eslint.config.js` does NOT have layer enforcement rules for `/src/app/`. This allowed the violations in Issue 6 to exist uncaught.

**Required change to `/eslint.config.js`:**
Add a new rule block for `src/app/**` files that restricts imports from L1/L2 packages:
- `@hai3/framework` (L2)
- `@hai3/state` (L1)
- `@hai3/api` (L1)
- `@hai3/i18n` (L1)
- `@hai3/screensets` (L1)

**Note:** The standalone ESLint config in `template-sources/project/configs/eslint.config.js` already has these rules and should remain as-is.

### Issue 8: Template Directory Clarification

The CLI templates at `packages/cli/templates/layout/hai3-uikit/` are BUILD ARTIFACTS generated from template sources. The actual source of truth for layout files in the monorepo is `/src/app/layout/`.

**Architecture clarification:**
- `/src/app/layout/` - Monorepo's demo app layout (SOURCE OF TRUTH for monorepo)
- `packages/cli/template-sources/` - Template sources for CLI generation
- `packages/cli/templates/` - Build output (gitignored)

The proposal's Issue 2 (Layout Templates) should reference CLI template-sources, NOT the monorepo's `/src/app/layout/`. Issue 6 handles the monorepo source files.

### Issue 9: Flux Architecture Violations in /src/app/ (CRITICAL)

The monorepo's `/src/app/` files violate the Flux data flow rules documented in EVENTS.md.

**Rule from EVENTS.md:**
- "Data flow is fixed: Component -> Action -> Event -> Effect -> Slice -> Store"
- "Direct slice dispatch... is FORBIDDEN"

**Current violation in `/src/app/layout/Menu.tsx` line 38:**
```typescript
dispatch(menuActions.toggleMenu());  // VIOLATION: Direct slice dispatch
```

**Problem:** `menuActions.toggleMenu()` returns a Redux slice action (created via createSlice), and dispatching it directly bypasses the event-driven architecture. Components should call action functions that emit events, not dispatch slice actions.

**Correct pattern (event-based):**
Components should call actions that emit events through the event bus. Effects listen to events and update slices. This maintains the unidirectional data flow:
```
Component -> Action (emits event) -> Event -> Effect -> Slice -> Store
```

**Required fix:**
1. Audit `/src/app/layout/Menu.tsx` for flux violations
2. Replace direct slice dispatch with event-based pattern using actions that emit events
3. Ensure any menu toggle behavior goes through the proper action -> event -> effect flow

### Issue 10: ESLint Rules Not Enforced on /src/app/ for Flux Architecture

The screenset ESLint rules that enforce Flux architecture are NOT fully applied to `/src/app/`:

**Gap 1: Direct slice action dispatch pattern not caught**
The existing ESLint rule catches `dispatch(setXxx(...))` but does NOT catch `dispatch(xxxActions.yyy())` where `xxxActions` is a slice actions object imported from a package.

Current selector only catches:
```typescript
dispatch(setLoading(true));  // CAUGHT: setXxx pattern
```

But misses:
```typescript
dispatch(menuActions.toggleMenu());  // NOT CAUGHT: xxxActions.yyy pattern
```

**Gap 2: L1/L2 import restrictions scope**
The L1/L2 import restrictions from the standalone config apply globally to all `**/*.{ts,tsx}` files, which is correct. However, the monorepo ESLint overrides some rules for `packages/**` that may inadvertently apply to `src/app/`.

**Required changes to `/eslint.config.js`:**

1. **Add ESLint rule to catch `dispatch(xxxActions.yyy())` pattern:**
   - Selector: `CallExpression[callee.name='dispatch'] > CallExpression > MemberExpression[property.type='Identifier']`
   - This catches when dispatch receives a call to a member of an object (like `menuActions.toggleMenu()`)
   - Apply to `src/app/**/*.tsx` files (excluding actions/effects directories)

2. **Extend Flux architecture rules to `/src/app/` subdirectories:**
   - `/src/app/layout/` - MUST follow Flux patterns (templates for generated projects)
   - `/src/app/actions/` - MUST follow action rules (no async, no getState, etc.)
   - `/src/app/effects/` - MUST follow effect rules (no event emission, etc.)
   - `/src/app/events/` - MUST follow event naming conventions

3. **Document which `/src/app/` subdirectories need which rules:**
   - `/src/app/layout/` - Component flux rules (no direct dispatch)
   - `/src/app/api/` - May have different rules (API service definitions use @hai3/react)
   - `/src/app/themes/` - Configuration files, minimal rules
   - `/src/app/icons/` - Asset files, minimal rules
   - `/src/app/uikit/` - Presentational components, uikit rules

**Note:** The standalone ESLint config already has comprehensive Flux rules. The monorepo config inherits from it but may need additional configuration to ensure `/src/app/` is fully covered.

## Impact

- Affected specs: `cli`
- Affected code:
  - `/packages/cli/src/commands/create/index.ts`
  - `/packages/cli/src/generators/project.ts`
  - `/packages/cli/templates/layout/hai3-uikit/Menu.tsx` (CLI templates)
  - `/packages/cli/templates/layout/hai3-uikit/*.tsx` (all layout templates)
  - `/packages/cli/templates/screensets/demo/` (audit only)
  - `/packages/cli/templates/eslint.config.js` (ESLint layer enforcement rules)
  - `/src/app/layout/Menu.tsx` (monorepo source - Issue 6, Issue 9)
  - `/src/app/api/mocks.ts` (monorepo source - Issue 6)
  - `/src/app/api/AccountsApiService.ts` (monorepo source - Issue 6)
  - `/eslint.config.js` (monorepo ESLint - Issue 7, Issue 10)
  - `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone ESLint - Issue 10)
  - `/packages/cli/template-sources/layout/` (Issue 11 - remove from git)
  - `/packages/cli/scripts/copy-templates.ts` (Issue 11 - update source path)
  - `/packages/cli/template-sources/manifest.yaml` (Issue 11 - update layout source)
  - `/.gitignore` or `/packages/cli/.gitignore` (Issue 11 - add template-sources/layout/)
- **NOT breaking**: Default behavior unchanged (UIKit included by default)
- **Compatibility**: Existing projects unaffected (but can manually add ESLint rules)

## Dependencies

- Issue 2 (layer violation) MUST be fixed before Issue 1 is fully usable
- If UIKit is made optional without fixing the layer violation, the Menu.tsx template would still have incorrect imports
- Issue 3 (demo screenset audit) MUST be completed to ensure `--uikit none` doesn't break demo
- Issue 4 (package.json layer enforcement) MUST be verified before any changes are deployed
- Issue 5 (ESLint layer enforcement) provides lint-time safety net and SHOULD be implemented alongside Issue 4
- Issue 6 (monorepo source files) MUST be fixed to ensure the monorepo itself passes layer validation
- Issue 7 (monorepo ESLint) MUST be added to prevent future regressions in monorepo source files
- Issue 9 (Flux violations) MUST be fixed to ensure monorepo follows its own Flux architecture rules
- Issue 10 (Flux ESLint rules) MUST be added to prevent future Flux violations in `/src/app/`
- Issue 9 depends on Issue 6 (both affect `/src/app/layout/Menu.tsx`)
- Issue 10 depends on Issue 7 (both modify `/eslint.config.js`)
- Issue 11 MUST be implemented to prevent future sync issues between monorepo and template sources
- Issue 12 (TypeScript import detection) MUST be fixed to ensure ESLint catches all layer violations including type-only and side-effect imports
- Issue 12 depends on Issue 7 (both modify `/eslint.config.js`)
- Issue 13 (module augmentation architecture gap) depends on Issue 12 (revealed by the eslint-disable hack workaround)
- Issue 13 MUST be fixed to eliminate inline eslint-disable comments in app code
- Issue 14 (TypeScript errors in generated projects) is independent but blocks generated project usability
- Issue 14 MUST be fixed before generated projects can pass TypeScript compilation
- Issue 15 (ESLint domain rules) depends on Issue 10 (extends the ESLint configuration for /src/app/)
- Issue 15 MUST be implemented to ensure domain-specific rules apply to monorepo source files
- **Issue 16 (prohibit inline ESLint disabling) depends on Issue 17** - Cannot remove noInlineConfig exception until module augmentation is fixed
- **Issue 17 (module augmentation fix) MUST be fixed FIRST** - This is the root cause that enables Issue 16
- **Issue 18 (state flow protection rules) MUST be implemented before Issue 19** - Rules must exist before refactoring
- **Issue 19 (refactor /src/app/) depends on Issues 16, 17, 18** - All foundation issues must be resolved first
- **Issue 20 (Redux terminology ban) can be done in parallel with Issues 18-19** - Independent ESLint rule addition

### Implementation Order (Issues 14, 16-20)

The remaining issues MUST be implemented in this dependency-driven sequence:

1. **Issue 17 - Module Augmentation Fix (MUST BE FIRST)**
   - Re-declare EventPayloadMap in @hai3/react to enable layer-compliant module augmentation
   - This is the root cause blocking all other issues

2. **Issue 16 - Prohibit Inline ESLint Disabling**
   - Remove noInlineConfig exception once Issue 17 provides proper augmentation pattern
   - Depends on: Issue 17

3. **Issue 18 - Add HAI3 State Flow Protection Rules for /src/app/**
   - Add component, action, effect, and event rules to ESLint config
   - Can start after Issue 17 is complete

4. **Issue 20 - Prohibit Redux Terms, Enforce HAI3 Terms**
   - Ban useDispatch/useSelector from react-redux, enforce HAI3 terminology
   - Can be done in parallel with Issue 18, but must complete before Issue 19

5. **Issue 19 - Refactor /src/app/ to Address Violations**
   - Fix all ESLint violations revealed by Issues 16, 17, 18, and 20
   - Depends on: Issues 16, 17, 18, 20 (all must be complete)

6. **Issue 14 - Fix TypeScript Errors in Generated Projects**
   - Independent of other issues, addresses generated project usability
   - Can be done last as it does not block other work

### Issue 11: Layout Templates Duplicated in CLI Template-Sources (CRITICAL)

Currently there are TWO copies of layout files that must be kept in sync:
1. `/src/app/layout/` - The monorepo's working layout files (SOURCE OF TRUTH)
2. `/packages/cli/template-sources/layout/hai3-uikit/` - Manually maintained duplicate for CLI templates

This creates maintenance problems:
- Changes to `/src/app/layout/` don't propagate to template-sources
- The files can get out of sync (as happened with Menu.tsx - template-sources has the fix, monorepo does not)
- Developers may fix one location but not the other

**IMPORTANT SOURCE OF TRUTH CLARIFICATION:**

| Location | Structure | Hook Usage | Status |
|----------|-----------|------------|--------|
| `/src/app/layout/` | Files at root (no subdirectory) | `useAppDispatch` (CORRECT) | CANONICAL SOURCE |
| `/packages/cli/template-sources/layout/hai3-uikit/` | hai3-uikit subdirectory | `useDispatch` (INCORRECT) | DUPLICATE - TO BE REMOVED |
| `/packages/cli/templates/layout/hai3-uikit/` | hai3-uikit subdirectory | N/A (build artifact) | gitignored |

**Files in canonical source `/src/app/layout/`:**
- Footer.tsx, Header.tsx, Layout.tsx, Menu.tsx, Overlay.tsx, Popup.tsx, Screen.tsx, Sidebar.tsx (8 files)

**Transformation mapping:**
```
SOURCE:      /src/app/layout/*.tsx                    (no subdirectory)
DESTINATION: templates/layout/hai3-uikit/*.tsx        (hai3-uikit subdirectory)
```

**Current state:**
- `template-sources/layout/hai3-uikit/` is tracked in git (8 files)
- It's manually maintained separately from `/src/app/layout/`
- The `copy-templates.ts` script copies FROM `template-sources/layout/` TO `templates/layout/`
- template-sources version incorrectly uses `useDispatch` from react-redux instead of `useAppDispatch` from @hai3/react

**Required fix:**
1. Remove `packages/cli/template-sources/layout/` from git tracking
2. Update `copy-templates.ts` to copy layout files FROM `/src/app/layout/` directly (not from template-sources)
3. Update `manifest.yaml` to reference `/src/app/layout/` as the source for layout files
4. Add `packages/cli/template-sources/layout/` to `.gitignore`
5. The build process generates `templates/layout/hai3-uikit/` from `/src/app/layout/` (note the hai3-uikit subdirectory in destination)

**Benefits:**
- Single source of truth: `/src/app/layout/` is the only location for layout files
- Changes to monorepo layout files automatically propagate to CLI templates on next build
- No manual synchronization required
- Existing Issues 6, 8, 9 fixes to `/src/app/layout/` will automatically be reflected in CLI templates
- Generated projects will correctly use `useAppDispatch` (from @hai3/react) not `useDispatch` (from react-redux)

**Files affected:**
- `/packages/cli/template-sources/layout/` - Remove from git, add to .gitignore
- `/packages/cli/scripts/copy-templates.ts` - Update to copy from `/src/app/layout/`
- `/packages/cli/template-sources/manifest.yaml` - Update layout source path
- `/packages/cli/.gitignore` or root `.gitignore` - Add template-sources/layout/

### Issue 12: ESLint Layer Rules Not Catching TypeScript Imports

The current ESLint configuration uses standard `no-restricted-imports` rule which does NOT catch TypeScript-specific import syntax.

**Problem discovered:**
The layer enforcement rules fail to detect:
1. `import type { X } from '@hai3/i18n'` - TypeScript type-only imports
2. `import '@hai3/state'` - side-effect imports (due to rule override)

**Files with undetected violations:**
- `/src/app/events/bootstrapEvents.ts` line 6: `import '@hai3/state';`
- `/src/app/api/types.ts` line 9: `import type { Language } from '@hai3/i18n';`

**Root cause:**
Standard `no-restricted-imports` doesn't handle TypeScript-specific import syntax. Need to use `@typescript-eslint/no-restricted-imports` instead.

**Required changes:**

1. **Update `/eslint.config.js` (monorepo)**:
   - Lines 110-147: Change `'no-restricted-imports'` to `'@typescript-eslint/no-restricted-imports'`
   - This applies to the `src/app/**/*.{ts,tsx}` layer enforcement block

2. **Update `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone)**:
   - Lines 99-132: Change `'no-restricted-imports'` to `'@typescript-eslint/no-restricted-imports'`
   - This is in the L0 Base rules block for `**/*.{ts,tsx}`

3. **Fix the violations after rules are updated:**
   - `/src/app/events/bootstrapEvents.ts`: Change `import '@hai3/state'` to `import '@hai3/react'` (verify @hai3/react re-exports the module augmentation capability)
   - `/src/app/api/types.ts`: Change `import type { Language } from '@hai3/i18n'` to `import type { Language } from '@hai3/react'`

**Files affected:**
- `/eslint.config.js` (monorepo ESLint config)
- `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone ESLint config)
- `/src/app/events/bootstrapEvents.ts` (violation fix)
- `/src/app/api/types.ts` (violation fix)

### Issue 13: Module Augmentation Architecture Gap

**Problem discovered during implementation:**
The current implementation of Issue 12 added an eslint-disable comment as a hack:
```typescript
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Module augmentation...
import '@hai3/state';
```

This violates the proposal's own specification which said to change `import '@hai3/state'` to `import '@hai3/react'`.

**Root cause:**
TypeScript module augmentation (`declare module 'X'`) requires importing the module where the interface is ORIGINALLY defined. `EventPayloadMap` is defined in `@hai3/state` (packages/state/src/types.ts:69), so:
- `declare module '@hai3/state'` requires `import '@hai3/state'`
- Simply changing to `import '@hai3/react'` won't work

**Required architectural fix:**
`@hai3/react` needs to provide a mechanism for app-layer code to do module augmentation without importing L1. Options:
1. Re-export pattern that allows augmentation targeting `@hai3/react`
2. Alternative type-safe event payload mechanism that doesn't require L1 module augmentation
3. Document this as an architectural exception with proper ESLint configuration (not inline disable comments)

The fix must be in the framework/react layer, NOT using eslint-disable hacks in app code.

**Files affected:**
- `/packages/react/src/index.ts` - Add module augmentation re-export pattern
- `/packages/state/src/types.ts` - EventPayloadMap original definition
- `/src/app/events/bootstrapEvents.ts` - Remove eslint-disable hack after fix

### Issue 14: TypeScript Errors in Generated Projects and `--uikit none` Vision

**Problem discovered during testing:**
Generated CLI projects have TypeScript compilation errors:

1. `registerPlugin` API mismatch - template calls with 2 args, actual API expects 1
2. Missing `@/app/layout` module when `--uikit none`
3. References to `@hai3/uikit` in files that should work without uikit (themes, TextLoader, main.tsx)

**Files affected:**
- `src/app/api/AccountsApiService.ts` - registerPlugin signature
- `src/app/main.tsx` - HAI3Config type mismatch, @hai3/uikit import
- `src/app/effects/bootstrapEffects.ts` - apiRegistry type issues
- `src/app/themes/*.ts` - @hai3/uikit imports
- `src/app/components/TextLoader.tsx` - @hai3/uikit import
- `src/app/App.tsx` and `src/app/App.no-studio.tsx` - missing @/app/layout

---

## Vision for `--uikit none` Projects

**Purpose:** Allow companies with their own UI kit/design system to use HAI3's core architecture (screensets, state management, event-driven patterns) while bringing their own UI components.

**Core principle:** Screensets are HAI3's most essential feature. A `--uikit none` project must be able to render screens on routes - that's the minimum viable functionality.

### What `--uikit none` generates:

```
my-app/
├── src/
│   ├── app/
│   │   ├── main.tsx          # Bootstrap HAI3 (NO Toaster, NO applyTheme)
│   │   ├── App.tsx           # Minimal shell - just renders router/outlet
│   │   ├── actions/          # Empty, ready for user
│   │   ├── effects/          # Empty, ready for user
│   │   ├── events/           # bootstrapEvents.ts (event type augmentation)
│   │   └── api/              # API service structure
│   └── screensets/
│       ├── screensetRegistry.tsx  # Empty registry
│       └── (no demo/)             # User creates their own
├── package.json              # @hai3/react only, NO @hai3/uikit
└── ...configs
```

### What works out of the box:
- HAI3 boots up and runs
- Routing works (screensets can register routes)
- User creates a screenset - it renders on its route
- State management, events, effects all function
- User brings their own components to render inside screens

### What is NOT included (no @hai3/uikit dependencies):
- No Layout wrapper (no Header/Footer/Sidebar/Menu)
- No Toaster notifications
- No TextLoader/Skeleton components
- No themes directory (or minimal CSS variables only)
- No demo screenset

### File-by-file specification for `--uikit none`:

| File | With `--uikit hai3` | With `--uikit none` |
|------|---------------------|---------------------|
| `main.tsx` | Imports Toaster, applyTheme from @hai3/uikit | Just `createHAI3App()`, no @hai3/uikit imports |
| `App.tsx` | Imports and uses Layout from @/app/layout | Minimal shell - renders `<Outlet />` or HAI3 router only |
| `layout/` | Full layout components (8 files) | Directory NOT included |
| `themes/` | Theme files importing from @hai3/uikit | Directory NOT included (or generic CSS variables) |
| `components/TextLoader.tsx` | Imports Skeleton from @hai3/uikit | File NOT included |
| `screensets/demo/` | Full demo screenset | Directory NOT included |

### Expected user workflow after `hai3 create my-app --uikit none`:
1. Project compiles and runs immediately (shows minimal/empty app)
2. User adds their UI kit: `npm install @chakra-ui/react` (or Material UI, etc.)
3. User creates their first screenset: `hai3 screenset create dashboard`
4. User builds screens using their own UI components
5. User optionally adds their own layout wrapper, notifications, etc.

### Acceptance criteria for `--uikit none`:
1. `npm install` succeeds
2. `npm run type-check` passes with zero errors
3. `npm run build` succeeds
4. `npm run dev` starts the app
5. No file in the generated project imports from `@hai3/uikit`
6. `@hai3/uikit` is NOT in package.json dependencies
7. User can create and render a screenset on a route

---

**Required fix (implementation):**
1. Audit template files against published `@hai3/react` API signatures
2. Ensure `--uikit none` projects don't have uikit dependencies in any files
3. Provide fallback layout or conditional imports for non-uikit projects

### Implementation approach for `--uikit none` conditional files:

**Option A: Separate template files (RECOMMENDED)**

Create alternative template files for `--uikit none`:
- `main.tsx` vs `main.no-uikit.tsx`
- `App.tsx` vs `App.no-uikit.tsx`

Generator selects appropriate template based on `--uikit` option.

**Option B: Conditional copying**

Exclude files that require @hai3/uikit when `--uikit none`:
- Skip `themes/` directory entirely
- Skip `components/TextLoader.tsx`
- Use alternative `main.tsx` and `App.tsx` that don't import @hai3/uikit

**Files requiring conditional handling:**

| File | Action for `--uikit none` |
|------|--------------------------|
| `main.tsx` | Use alternative template without Toaster/applyTheme |
| `App.tsx` | Use alternative template without Layout import |
| `App.no-studio.tsx` | Use alternative template without Layout import |
| `themes/` | Skip entire directory |
| `components/TextLoader.tsx` | Skip file |
| `layout/` | Already skipped (working) |
| `screensets/demo/` | Already skipped (working) |

### Issue 15: ESLint Domain Rules Not Extended to /src/app/

**Problem discovered during verification:**
The proposal's Issue 10 specified extending ESLint rules to `/src/app/`, but the implementation only added generic flux rules. The domain-specific local/* rules are still only applied to `src/screensets/**/*`.

**Rules currently ONLY applied to screensets:**
1. `local/no-barrel-exports-events-effects` - Prevents barrel exports of events/effects
2. `local/no-coordinator-effects` - Prevents coordinator effect pattern
3. `local/no-missing-domain-id` - Requires domain ID in files
4. `local/domain-event-format` - Enforces event naming format (domain/entity/action)
5. `local/uikit-no-business-logic` - UIKit components must be presentational only
6. `local/screen-inline-components` - No inline component definitions in screens

**Required changes to `/eslint.config.js` and `/packages/cli/template-sources/project/configs/eslint.config.js`:**

1. **For `src/app/actions/` and `src/app/effects/`:**
   - Apply `local/no-barrel-exports-events-effects`: 'error'
   - File pattern: `src/app/actions/**/*`, `src/app/effects/**/*`

2. **For `src/app/events/`:**
   - Apply `local/domain-event-format`: 'error'
   - Events must follow `domain/entity/action` format (e.g., `app/user/fetch`)
   - File pattern: `src/app/events/**/*`

3. **For `src/app/uikit/` (if exists):**
   - Apply `local/uikit-no-business-logic`: 'error'
   - File pattern: `src/app/uikit/**/*.{ts,tsx}`

4. **For `src/app/components/`:**
   - Apply `local/no-inline-styles`: 'error' (already applied globally)
   - Consider if `local/uikit-no-business-logic` should apply

**Rationale:**
- `src/app/` serves as the template for generated projects
- If rules don't apply to `src/app/`, violations can slip into templates
- The monorepo should be the strictest environment, not more lenient than generated projects

**Files affected:**
- `/eslint.config.js` (monorepo)
- `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone)

### Issue 16: Prohibit In-Place ESLint Disabling (CRITICAL)

**Problem:** The current implementation uses inline eslint-disable comments as workarounds instead of fixing root causes. This is unacceptable.

**Required changes:**
1. Update ESLint config to set `noInlineConfig: true` for ALL files without exceptions
2. Remove the current exception for `src/app/events/**/*.ts` that allows inline config
3. Any ESLint exceptions must be configured at the config level, never inline
4. All existing inline eslint-disable comments must be removed after root causes are fixed

**Files affected:**
- `/eslint.config.js` - Remove noInlineConfig: false exception
- `/packages/cli/template-sources/project/configs/eslint.config.js` - Same
- `/src/app/events/bootstrapEvents.ts` - Remove eslint-disable comment after Issue 17 is fixed

### Issue 17: Proper Module Augmentation on Corresponding Layers (CRITICAL)

**Problem:** App-layer code currently imports `@hai3/state` for module augmentation of `EventPayloadMap`. This violates layer architecture.

**Root cause:** TypeScript module augmentation works on the original declaring module. `EventPayloadMap` is defined in `@hai3/state`, so `declare module '@hai3/react'` won't work with a simple re-export.

**Solution: Re-declare the interface in `@hai3/react` (Option C)**

This approach creates a new declaration site in `@hai3/react` that TypeScript can augment:

1. **Update `/packages/state/src/types.ts`:**
   - Keep `EventPayloadMap` as-is (or optionally rename to `BaseEventPayloadMap` for clarity)
   - Export it for use by `@hai3/react`

2. **Update `/packages/react/src/index.ts`:**
   - Instead of just re-exporting `EventPayloadMap`, RE-DECLARE it as its own interface:
   ```typescript
   import type { EventPayloadMap as StateEventPayloadMap } from '@hai3/state';

   // Re-declare EventPayloadMap to allow module augmentation on @hai3/react
   // This creates a new declaration site that TypeScript can augment
   export interface EventPayloadMap extends StateEventPayloadMap {}
   ```

3. **Update `/src/app/events/bootstrapEvents.ts`:**
   - Change `import '@hai3/state'` to `import '@hai3/react'`
   - Change `declare module '@hai3/state'` to `declare module '@hai3/react'`
   - Remove the eslint-disable comment (no longer needed)
   ```typescript
   import '@hai3/react';

   declare module '@hai3/react' {
     interface EventPayloadMap {
       'app/user/fetch': void;
       // ... other app events
     }
   }
   ```

4. **This works because:**
   - `@hai3/react` now has its own DECLARATION of `EventPayloadMap` (not just a re-export)
   - TypeScript module augmentation targets declaration sites
   - App code can augment `@hai3/react` without importing L1 packages

**Files affected:**
- `/packages/state/src/types.ts` - May need to rename or keep as base
- `/packages/react/src/index.ts` - Re-declare (not just re-export) EventPayloadMap
- `/src/app/events/bootstrapEvents.ts` - Change to use `@hai3/react` for augmentation
- All CLI template event files - Update to use `@hai3/react` pattern

### Issue 18: Add HAI3 State Flow Protection Rules for /src/app/ (CRITICAL)

**Problem:** `/src/app/` lacks the same data flow protections that exist for `/src/screensets/`. App-layer code must follow ALL HAI3 state patterns - both domain-based rules (local/* plugins) and Flux architecture rules.

**Complete List of HAI3 State Data Flow Rules:**

#### Domain-Based Rules (local/* plugin)

| # | Rule | Screensets | App | Required Action |
|---|------|------------|-----|-----------------|
| 1 | `local/no-barrel-exports-events-effects` | `src/screensets/**/*` | `src/app/actions/**/*`, `src/app/effects/**/*` | PARTIALLY DONE in Issue 15 |
| 2 | `local/no-coordinator-effects` | `src/screensets/**/*` | **NOT APPLIED** | MUST ADD for `src/app/effects/**/*` |
| 3 | `local/no-missing-domain-id` | `src/screensets/**/*` | N/A | Evaluate if applicable |
| 4 | `local/domain-event-format` | `src/screensets/**/*` | `src/app/events/**/*` | DONE in Issue 15 |
| 5 | `local/uikit-no-business-logic` | `src/screensets/*/uikit/**/*` | **NOT APPLIED** | MUST ADD for `src/app/uikit/**/*` if exists |
| 6 | `local/screen-inline-components` | `src/screensets/**/screens/**/*Screen.tsx` | N/A | Not applicable (app has no screens) |

#### Flux Architecture Rules (no-restricted-imports, no-restricted-syntax)

| # | Rule | Pattern | Current State | Required Action |
|---|------|---------|---------------|-----------------|
| 7 | Effects cannot import actions | `**/effects/**/*` | Applied to `src/app/effects/**/*` | VERIFY works |
| 8 | Actions cannot import slices | `**/actions/**/*` | Applied to `src/app/actions/**/*` | VERIFY works |
| 9 | Actions must be sync (no async, no Promise return) | `**/actions/**/*` | Applied to `src/app/actions/**/*` | VERIFY works |
| 10 | Actions cannot use getState() | `**/actions/**/*` | Applied to `src/app/actions/**/*` | VERIFY works |
| 11 | Components cannot dispatch slice actions directly | `src/screensets/**/*.tsx`, `src/components/**/*.tsx`, `src/app/**/*.tsx` | VERIFY includes all patterns | VERIFY coverage |
| 12 | Components cannot import stores directly | Same as #11 | VERIFY includes all patterns | VERIFY coverage |
| 13 | Effects cannot emit events | `**/effects/**/*` | Applied to `src/app/effects/**/*` | VERIFY works |

**Required ESLint Configuration Changes:**

1. **Add `local/no-coordinator-effects` for `src/app/effects/**/*`:**
   - Prevents the coordinator effect anti-pattern
   - Effects should be focused, not orchestrate multiple operations

2. **Add `local/uikit-no-business-logic` for `src/app/uikit/**/*` (if directory exists):**
   - UIKit components must be presentational only
   - No state management or business logic

3. **Verify Flux rules apply to ALL component patterns:**
   - Ensure `src/app/**/*.tsx` (excluding actions/effects) is covered by:
     - Rule #11: No direct slice action dispatch
     - Rule #12: No direct store imports

4. **Component rules for `src/app/**/*.tsx` (except actions/effects):**
   - Cannot dispatch slice actions directly (`dispatch(xxxActions.yyy())`)
   - Cannot import slices
   - Cannot call store methods directly
   - Must use actions that emit events

5. **Action rules for `src/app/actions/**/*`:**
   - Cannot be async (no async keyword, no Promise return)
   - Cannot use getState
   - Cannot import slices
   - Must emit events via eventBus

6. **Effect rules for `src/app/effects/**/*`:**
   - Cannot emit events (only listen via eventBus.on)
   - Cannot import actions
   - Can dispatch to slices (this is their job)

7. **Event rules for `src/app/events/**/*`:**
   - Must follow domain-event-format: `domain/entity/action`
   - Event names must match pattern (e.g., `app/user/fetch`, `app/menu/toggle`)

**Verification Steps:**

After implementation, verify ALL rules apply to `/src/app/`:

```bash
# 1. Verify domain rules are configured for src/app/
grep -A 5 "src/app/effects" eslint.config.js | grep "no-coordinator-effects"
grep -A 5 "src/app/uikit" eslint.config.js | grep "uikit-no-business-logic"

# 2. Verify Flux rules catch violations in src/app/
# Create test file with violation:
echo "import { testActions } from './slices/testSlice';" > /tmp/test-violation.tsx
echo "dispatch(testActions.test());" >> /tmp/test-violation.tsx
# Run ESLint - should report errors

# 3. Verify action async rules
grep -A 10 "src/app/actions" eslint.config.js | grep "async"

# 4. Verify effect rules
grep -A 10 "src/app/effects" eslint.config.js | grep -E "(emit|actions)"

# 5. Run full lint check
npm run lint
```

**Implementation:**
- Extend existing screenset rules to cover `src/app/` patterns
- Add new rule blocks in ESLint config for each subdirectory
- Update both `/eslint.config.js` (monorepo) and `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone)

### Issue 19: Refactor /src/app/ to Address Architecture Violations (CRITICAL)

**Problem:** After adding new ESLint rules (Issue 18), existing `/src/app/` files will have violations that must be fixed.

**Required refactoring:**
1. Audit all files in `/src/app/` for violations of new rules
2. Fix each violation properly (no eslint-disable workarounds)
3. Ensure data flow follows: Component -> Action -> Event -> Effect -> Slice
4. Remove any direct slice dispatches from components
5. Remove any async actions
6. Remove any event emissions from effects

**Verification:**
- `npm run lint` must pass with zero errors and zero warnings
- `npm run arch:check` must pass
- No inline eslint-disable comments allowed

### Issue 20: Prohibit Redux Terms, Enforce HAI3 State Terms (CRITICAL)

**Problem:** Code uses raw Redux imports (`useDispatch`, `useSelector` from react-redux) instead of HAI3's typed hooks.

**Required changes:**

1. **Ban Redux hook imports from react-redux:**
   - Ban: `useDispatch` import from 'react-redux' (use `useAppDispatch` from '@hai3/react')
   - Ban: `useSelector` import from 'react-redux' (use `useAppSelector` from '@hai3/react')

2. **Ban user-defined identifiers with 'reducer' in the name:**
   - Ban: Variable/function declarations containing 'reducer' (e.g., `const myReducer = ...`, `function createReducer()`)
   - **ALLOW:** Property access like `.reducer` (REQUIRED for Redux Toolkit's `createSlice().reducer`)
   - ESLint selector that excludes property access:
     ```
     Identifier[name=/[Rr]educer/]:not(MemberExpression > Identifier):not(Property > Identifier)
     ```
     Or use `no-restricted-syntax` targeting only VariableDeclarator and FunctionDeclaration nodes.

3. **IMPORTANT - `dispatch` variable name is ALLOWED:**
   - `const dispatch = useAppDispatch()` is the CORRECT HAI3 pattern
   - The existing ESLint rules already catch problematic patterns like `dispatch(xxxActions.yyy())`
   - Do NOT ban 'dispatch' as a variable name

4. **Allowed HAI3 terms:**
   - `useAppDispatch` - HAI3's typed dispatch hook (returns typed dispatch function)
   - `useAppSelector` - HAI3's typed selector hook
   - `dispatch` - Variable holding the result of `useAppDispatch()` (ALLOWED)
   - `eventBus.emit` - Event emission
   - `eventBus.on` - Event listening
   - `.reducer` - Property access on slice (ALLOWED, required for Redux Toolkit)
   - `slice` - State slice terminology (internal only)

5. **Add ESLint rules to enforce these patterns in:**
   - `/src/app/**/*`
   - `/src/screensets/**/*`
   - Generated CLI project templates

**Strict validation after implementation:**
- Search entire codebase for banned terms
- Verify no `useDispatch` or `useSelector` IMPORTS from 'react-redux' in app/screenset code
- Verify no user-defined variables/functions with 'reducer' in the name

**Files affected:**
- `/eslint.config.js`
- `/packages/cli/template-sources/project/configs/eslint.config.js`
- All files in `/src/app/` that use raw Redux imports
- All template files
