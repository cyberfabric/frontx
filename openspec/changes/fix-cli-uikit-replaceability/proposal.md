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

## Dependencies

- Issue 2 (layer violation) MUST be fixed before Issue 1 is fully usable
- If UIKit is made optional without fixing the layer violation, the Menu.tsx template would still have incorrect imports
- Issue 3 (demo screenset audit) MUST be completed to ensure `--uikit none` doesn't break demo
- Issue 4 (package.json layer enforcement) MUST be verified before any changes are deployed
- Issue 5 (ESLint layer enforcement) provides lint-time safety net and SHOULD be implemented alongside Issue 4
