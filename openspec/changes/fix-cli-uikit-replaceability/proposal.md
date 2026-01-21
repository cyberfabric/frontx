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
