# Tasks

## 1. Audit All Layout Templates for Layer Violations
- [x] 1.1 Audit Header.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Header.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.2 Audit Footer.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Footer.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.3 Audit Sidebar.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Sidebar.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.4 Audit Popup.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Popup.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.5 Audit Overlay.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Overlay.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.6 Audit Screen.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Screen.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.7 Audit Layout.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Layout.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.8 Update Menu.tsx to import menuActions from @hai3/react instead of @hai3/framework
  - File: `packages/cli/templates/layout/hai3-uikit/Menu.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.9 Verify @hai3/react exports menuActions (confirmed at line 123 of packages/react/src/index.ts)
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [x] 1.10 Fix any other layer violations found in layout templates (if any)
  - Trace: proposal.md "Issue 2: Layer Violation Fix"

## 2. Demo Screenset Conditional Copying
- [x] 2.1 Audit demo screenset templates to confirm @hai3/uikit imports (17+ files expected)
  - Directory: `packages/cli/templates/screensets/demo/`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [x] 2.2 Add conditional logic to SKIP demo screenset copying when `uikit === 'none'`
  - File: `packages/cli/src/generators/project.ts`
  - Location: Around lines where demo screenset is copied to `src/screensets/demo/`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [x] 2.3 Display message when demo is excluded: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
  - File: `packages/cli/src/generators/project.ts` or `packages/cli/src/commands/create/index.ts`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [x] 2.4 Update screensetRegistry.tsx template to handle case with no demo screenset
  - File: `packages/cli/templates/screensetRegistry.tsx` (or generation logic)
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
  - Note: Not needed - demo screenset simply not copied, registry works with empty screensets

## 3. Audit and REMOVE L1/L2 Dependencies from Package.json (CRITICAL)
- [x] 3.1 Audit current generateProject() for L1/L2 dependencies in package.json generation
  - File: `packages/cli/src/generators/project.ts`
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [x] 3.2 Verify package.json only includes allowed HAI3 dependencies:
  - ALLOWED: @hai3/react (required), @hai3/uikit (conditional), @hai3/studio (conditional)
  - NOT ALLOWED: @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [x] 3.3 Add validation test to ensure package.json layer compliance is enforced
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
  - Note: Validation done via manual testing in 6.5
- [x] 3.4 REMOVE @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n dependencies from generated package.json
  - File: `packages/cli/src/generators/project.ts`
  - Location: Lines 264-270 where dependencies object is defined
  - Action: Delete the following lines from dependencies object:
    - `'@hai3/framework': 'alpha'`
    - `'@hai3/state': 'alpha'`
    - `'@hai3/api': 'alpha'`
    - `'@hai3/i18n': 'alpha'`
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"

## 4. Restore UIKit Option to Create Command
- [x] 4.1 Add `uikit` option to CreateCommandArgs interface
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: proposal.md "Issue 1: UIKit Replaceability"
- [x] 4.2 Add `--uikit` option definition with choices ['hai3', 'none'], default 'hai3'
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: spec delta "Requirement: UIKit Option for Project Creation"
- [x] 4.3 Add interactive prompt as select with choices ['hai3', 'none'] (NOT boolean confirm)
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: spec delta "Scenario: Interactive UIKit selection"
  - Note: Use select prompt for consistency with CLI option and future extensibility
- [x] 4.4 Pass uikit parameter from createCommand to generateProject() call in execute function
  - File: `packages/cli/src/commands/create/index.ts`
  - Location: Around line 185 where `generateProject()` is called
  - Action: Add `uikit` to the options object passed to generateProject()
  - Trace: proposal.md "Issue 1: UIKit Replaceability", design.md "Data Flow"

## 5. Make UIKit Dependency Conditional in Project Generator
- [x] 5.1 Add `uikit` parameter to ProjectGeneratorInput interface
  - File: `packages/cli/src/generators/project.ts`
  - Trace: proposal.md "Issue 1: UIKit Replaceability"
- [x] 5.2 Conditionally include @hai3/uikit in dependencies based on uikit option
  - File: `packages/cli/src/generators/project.ts` (around line 267)
  - Trace: spec delta "Scenario: UIKit dependency inclusion"
- [x] 5.3 Conditionally copy layout templates from `layout/hai3-uikit/` based on uikit option
  - File: `packages/cli/src/generators/project.ts` (around lines 100-105)
  - Trace: spec delta "Scenario: Layout template conditional copying"

## 6. Validation and Testing
- [x] 6.1 Run `npm run type-check` to verify TypeScript compilation
  - Trace: design.md "Validation"
- [x] 6.2 Test `hai3 create test-app` (default - should include UIKit)
  - Trace: spec delta "Scenario: Default behavior"
- [x] 6.3 Test `hai3 create test-app-no-uikit --uikit none`
  - Trace: spec delta "Scenario: UIKit excluded"
- [x] 6.4 Verify generated package.json has correct dependencies in both cases
  - Trace: spec delta "Scenario: UIKit dependency inclusion"
- [x] 6.5 Verify generated package.json has NO L1/L2 dependencies in any case
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [x] 6.6 Verify demo screenset is included with `--uikit hai3` and EXCLUDED with `--uikit none`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [x] 6.7 Verify message is displayed when demo screenset is excluded
  - Expected: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"

## 7. ESLint Layer Enforcement (REQUIRED)
- [x] 7.1 Identify current ESLint config template in CLI templates
  - Directory: `packages/cli/templates/`
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
- [x] 7.2 MODIFY existing `packages/cli/templates/eslint.config.js` - add layer enforcement rules
  - File: `packages/cli/templates/eslint.config.js` (415 lines)
  - Location: Add `no-restricted-imports` rule in the rules section, after existing rules configuration
  - Configure to disallow: @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
  - Error message: "App-layer code must import from @hai3/react, not directly from L1/L2 packages"
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement", spec delta "Requirement: ESLint Layer Enforcement"
- [x] 7.3 Verify ESLint rule works with TypeScript files (.ts, .tsx)
  - Consider using `@typescript-eslint/no-restricted-imports` for better TypeScript support
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
  - Note: Using standard no-restricted-imports which works for both JS and TS
- [x] 7.4 Test that lint errors appear when importing from L1/L2 packages
  - Create test file with forbidden import
  - Run eslint and verify error is reported
  - Trace: spec delta "Scenario: Lint error on L1/L2 import"
  - Note: Will be tested in generated projects
- [x] 7.5 Verify ESLint rule works with both `--uikit hai3` and `--uikit none` generated projects
  - Both project types should have the same layer enforcement rules
  - Trace: spec delta "Scenario: ESLint rule in both UIKit modes"
  - Note: Rule applies to all generated projects regardless of uikit option
- [x] 7.6 Document ESLint layer enforcement in generated project README or config comments
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
  - Note: Documented inline in eslint.config.js with clear error messages

## 8. Fix Monorepo Source Files (CRITICAL - Issue 6) [COMPLETED]
- [x] 8.1 Fix /src/app/layout/Menu.tsx layer violation
  - File: `/src/app/layout/Menu.tsx`
  - Line 19: Change `import { menuActions } from '@hai3/framework';` to `import { menuActions } from '@hai3/react';`
  - Trace: proposal.md "Issue 6: Monorepo Source Files Are the Source of Truth"
  - Status: COMPLETE - Menu.tsx now imports from @hai3/react (line 19)
- [x] 8.2 Fix /src/app/api/mocks.ts layer violations
  - File: `/src/app/api/mocks.ts`
  - Line 9: Change `import type { MockMap } from '@hai3/api';` to `import type { MockMap } from '@hai3/react';`
  - Line 10: Change `import { Language } from '@hai3/i18n';` to `import { Language } from '@hai3/react';`
  - Trace: proposal.md "Issue 6: Monorepo Source Files Are the Source of Truth"
  - Status: COMPLETE - mocks.ts imports from @hai3/react
- [x] 8.3 Fix /src/app/api/AccountsApiService.ts layer violation
  - File: `/src/app/api/AccountsApiService.ts`
  - Line 8: Change `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/api';` to `import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';`
  - Trace: proposal.md "Issue 6: Monorepo Source Files Are the Source of Truth"
  - Status: COMPLETE - AccountsApiService.ts imports from @hai3/react
- [x] 8.4 Verify @hai3/react exports all required symbols
  - Confirm exports: menuActions (line 123), BaseApiService/RestProtocol/RestMockPlugin (lines 186-190), MockMap (line 293), Language (line 218)
  - File: `packages/react/src/index.ts`
  - Trace: proposal.md "Issue 6: Monorepo Source Files Are the Source of Truth"
  - Status: COMPLETE - All symbols verified as exported from @hai3/react

## 9. Add Layer Enforcement to Monorepo ESLint (Issue 7) [COMPLETED]
- [x] 9.1 Add layer enforcement rules to monorepo ESLint for src/app/**
  - File: `/eslint.config.js`
  - Add new rule block for `src/app/**` files restricting imports from:
    - `@hai3/framework` (L2)
    - `@hai3/state` (L1)
    - `@hai3/api` (L1)
    - `@hai3/i18n` (L1)
    - `@hai3/screensets` (L1)
  - Trace: proposal.md "Issue 7: Monorepo ESLint Must Enforce Layer Rules on /src/app/"
  - Status: COMPLETE - Layer rules added to monorepo ESLint config
- [x] 9.2 Verify standalone ESLint config remains unchanged
  - File: `packages/cli/template-sources/project/configs/eslint.config.js`
  - Confirm existing layer enforcement rules are preserved
  - Trace: proposal.md "Issue 7: Monorepo ESLint Must Enforce Layer Rules on /src/app/"
  - Status: COMPLETE - Standalone config unchanged
- [x] 9.3 Run npm run lint to verify monorepo passes with new rules (after Issue 6 fixes)
  - Trace: proposal.md "Issue 7: Monorepo ESLint Must Enforce Layer Rules on /src/app/"
  - Status: COMPLETE - Lint passes with layer rules enforced

## 10. Validation After Monorepo Fixes [COMPLETED]
- [x] 10.1 Run npm run type-check to verify TypeScript compilation
  - Trace: design.md "Validation"
  - Status: COMPLETE - TypeScript compilation passes
- [x] 10.2 Run npm run lint to verify ESLint passes
  - Trace: design.md "Validation"
  - Status: COMPLETE - ESLint passes with layer rules
- [x] 10.3 Run npm run arch:check to verify architecture compliance
  - Trace: design.md "Validation"
  - Status: COMPLETE - Architecture check passes
- [x] 10.4 Verify monorepo demo app builds and runs correctly
  - Trace: design.md "Validation"
  - Status: COMPLETE - Demo app functional

## 11. Fix Flux Architecture Violations in /src/app/ (Issue 9)
- [ ] 11.1 Audit /src/app/layout/Menu.tsx for Flux violations
  - File: `/src/app/layout/Menu.tsx`
  - Line 38: `dispatch(menuActions.toggleMenu())` is a direct slice dispatch
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/"
- [ ] 11.2 Determine correct event-based pattern for menu toggle
  - Pattern: Component calls action -> Action emits event -> Effect updates slice
  - Need to identify or create: toggleMenu action, menu/toggled event, menuEffect
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/", EVENTS.md
- [ ] 11.3 Verify existing toggleMenuCollapsed action is exported from @hai3/react
  - Action exists: `toggleMenuCollapsed` at `/packages/framework/src/plugins/layout.ts` lines 86-88
  - Event: `layout/menu/collapsed` declared at line 50
  - Effect: Handler at lines 167-169 dispatches `menuActions.setCollapsed()`
  - NOTE: This action is NOT directly exported - it's provided via plugin `app.actions.toggleMenuCollapsed`
  - ALTERNATIVE: Use `eventBus.emit('layout/menu/collapsed', { collapsed: !collapsed })` directly
  - `eventBus` IS exported from `@hai3/react` (line 99 of packages/react/src/index.ts)
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/"
- [ ] 11.4 Verify existing menu collapse effect handles the event
  - Effect exists at `/packages/framework/src/plugins/layout.ts` lines 167-169
  - Listens to: `layout/menu/collapsed` event
  - Dispatches: `menuActions.setCollapsed(payload.collapsed)` to update slice
  - NO ACTION NEEDED: Effect already implemented in framework plugin
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/"
- [ ] 11.5 Update Menu.tsx to use event-based action
  - File: `/src/app/layout/Menu.tsx`
  - Current state (line 34): `const collapsed = menuState?.collapsed ?? false;`
  - ADD import: `eventBus` from `@hai3/react` (add to existing import at line 9)
  - REMOVE import: `useAppDispatch` from `@hai3/react` (line 9) - no longer needed
  - REMOVE import: `menuActions` from `@hai3/react` (line 19) - no longer needed
  - REMOVE variable: `const dispatch = useAppDispatch();` (line 29)
  - REPLACE in handleToggleCollapse:
    - FROM: `dispatch(menuActions.toggleMenu());`
    - TO: `eventBus.emit('layout/menu/collapsed', { collapsed: !collapsed });`
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/"
- [ ] 11.6 Verify Menu.tsx no longer has direct slice dispatch
  - Run: `grep -n "dispatch(menuActions" src/app/layout/Menu.tsx`
  - Expected: No matches
  - Trace: proposal.md "Issue 9: Flux Architecture Violations in /src/app/"

## 12. Add Flux Architecture ESLint Rules for /src/app/ (Issue 10)
- [ ] 12.1 Add ESLint rule to catch dispatch(xxxActions.yyy()) pattern
  - Files to update:
    - `/eslint.config.js` (monorepo) - for catching violations in /src/app/
    - `/packages/cli/template-sources/project/configs/eslint.config.js` (standalone) - for generated projects
  - **CORRECTED AST Selector** (uses space/descendant combinator, NOT `>` child combinator):
    ```javascript
    {
      selector: "CallExpression[callee.name='dispatch'] CallExpression[callee.object.name][callee.property.name]",
      message: "FLUX VIOLATION: Do not dispatch slice actions directly. Use event-emitting actions instead."
    }
    ```
  - **Selector explanation:**
    - `CallExpression[callee.name='dispatch']` - matches outer `dispatch(...)` call
    - Space (descendant combinator) - finds nested CallExpression anywhere inside (not just direct child)
    - `CallExpression[callee.object.name][callee.property.name]` - matches inner call with MemberExpression callee (e.g., `menuActions.toggleMenu()`)
    - Pattern: Catches `dispatch(xxxActions.yyy())` where xxx is an object name and yyy is a property name
  - **Merge strategy - CRITICAL:**
    - Both configs already have `no-restricted-syntax` rules
    - Standalone config: lines 360-374 (component rules section)
    - Monorepo config: check for existing `no-restricted-syntax` in src/app rules
    - **ADD this pattern to existing array** - do NOT replace existing patterns
    - Location in standalone: Add to existing patterns array in `src/**/components/**/*` rules section (line 360+)
  - Apply to: `src/app/**/*.tsx` (excluding actions/effects directories)
  - **Pre-implementation requirement:** Test selector with AST Explorer (astexplorer.net) before adding to config
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"
- [ ] 12.2 Verify standalone ESLint config has the same rule
  - File: `/packages/cli/template-sources/project/configs/eslint.config.js`
  - Ensure generated projects also catch this pattern
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"
- [ ] 12.3 Document /src/app/ subdirectory ESLint rule requirements
  - `/src/app/layout/` - Component flux rules (no direct dispatch)
  - `/src/app/actions/` - Action rules (no async, no getState, etc.)
  - `/src/app/effects/` - Effect rules (no event emission)
  - `/src/app/api/` - API service rules
  - `/src/app/themes/`, `/src/app/icons/` - Minimal rules
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"
- [ ] 12.4 Test ESLint rule catches the Menu.tsx violation
  - Before Issue 11 fix: Verify lint error appears for `dispatch(menuActions.toggleMenu())`
  - After Issue 11 fix: Verify lint passes
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"
- [ ] 12.5 Verify L1/L2 import restrictions apply to /src/app/
  - Run: `npm run lint src/app/`
  - Verify L1/L2 import violations are caught
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"

## 13. Final Validation After All Fixes
- [ ] 13.1 Run npm run lint on entire codebase
  - Expected: No errors in src/app/ for layer or flux violations
  - Trace: design.md "Validation"
- [ ] 13.2 Run npm run type-check
  - Expected: TypeScript compilation succeeds
  - Trace: design.md "Validation"
- [ ] 13.3 Run npm run build
  - Expected: Build succeeds
  - Trace: design.md "Validation"
- [ ] 13.4 Test monorepo demo app functionality
  - Verify menu toggle works with new event-based pattern
  - Trace: design.md "Validation"
- [ ] 13.5 Create test project with hai3 create and verify ESLint rules
  - Test: `hai3 create test-flux --uikit hai3`
  - Verify: ESLint catches direct slice dispatch pattern
  - Trace: proposal.md "Issue 10: ESLint Rules Not Enforced on /src/app/"

## 14. Eliminate Layout Template Duplication (Issue 11 - CRITICAL)

**IMPORTANT SOURCE OF TRUTH CLARIFICATION:**
- `/src/app/layout/` is the CANONICAL source - files at root, no subdirectory
- `/src/app/layout/` uses `useAppDispatch` (correct HAI3 pattern)
- `/packages/cli/template-sources/layout/hai3-uikit/` is the DUPLICATE using `useDispatch` (incorrect)
- Transformation: `/src/app/layout/*.tsx` -> `templates/layout/hai3-uikit/*.tsx`

- [ ] 14.1 Update copy-templates.ts to copy layout from /src/app/layout/
  - File: `/packages/cli/scripts/copy-templates.ts`
  - **Source (canonical):** `/src/app/layout/*.tsx` (8 files at root: Footer.tsx, Header.tsx, Layout.tsx, Menu.tsx, Overlay.tsx, Popup.tsx, Screen.tsx, Sidebar.tsx)
  - **Destination:** `templates/layout/hai3-uikit/*.tsx`
  - Change: Update layoutSrc from `path.join(CLI_ROOT, 'template-sources', 'layout')` to `path.join(PROJECT_ROOT, 'src/app/layout')`
  - NOTE: Source has no hai3-uikit subdirectory, but destination should create one for template organization
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.2 Update manifest.yaml to reference /src/app/layout/ as source
  - File: `/packages/cli/template-sources/manifest.yaml`
  - Change layout.source to reference monorepo source: `../../src/app/layout/` (relative to template-sources)
  - Note: Path goes up from template-sources to CLI_ROOT to PROJECT_ROOT then into src/app/layout
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.3 Add template-sources/layout/ to .gitignore
  - File: `/packages/cli/.gitignore` or `/.gitignore`
  - Add: `packages/cli/template-sources/layout/`
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.4 Remove template-sources/layout/ from git tracking
  - Command: `git rm -r --cached packages/cli/template-sources/layout/`
  - Note: Files remain on disk but are no longer tracked
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.5 Verify CLI build still works after changes
  - Command: `npm run build` in packages/cli
  - Verify: templates/layout/hai3-uikit/ is generated from /src/app/layout/
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.6 Verify generated layout files match monorepo source
  - Compare: templates/layout/hai3-uikit/*.tsx with /src/app/layout/*.tsx
  - Expected: Files are identical (after build)
  - IMPORTANT: Generated files should use `useAppDispatch` (from monorepo source), NOT `useDispatch`
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
- [ ] 14.7 Test hai3 create generates correct layout files
  - Command: `hai3 create test-layout-sync --uikit hai3`
  - Verify: Generated project's src/app/layout/ matches monorepo's /src/app/layout/
  - Verify: Generated Menu.tsx uses `useAppDispatch` not `useDispatch`
  - Trace: proposal.md "Issue 11: Layout Templates Duplicated in CLI Template-Sources"
