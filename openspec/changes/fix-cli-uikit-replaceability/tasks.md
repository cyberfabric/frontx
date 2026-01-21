# Tasks

## 1. Audit All Layout Templates for Layer Violations
- [ ] 1.1 Audit Header.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Header.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.2 Audit Footer.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Footer.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.3 Audit Sidebar.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Sidebar.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.4 Audit Popup.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Popup.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.5 Audit Overlay.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Overlay.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.6 Audit Screen.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Screen.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.7 Audit Layout.tsx for imports from @hai3/framework (L2) or L1 packages
  - File: `packages/cli/templates/layout/hai3-uikit/Layout.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.8 Update Menu.tsx to import menuActions from @hai3/react instead of @hai3/framework
  - File: `packages/cli/templates/layout/hai3-uikit/Menu.tsx`
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.9 Verify @hai3/react exports menuActions (confirmed at line 123 of packages/react/src/index.ts)
  - Trace: proposal.md "Issue 2: Layer Violation Fix"
- [ ] 1.10 Fix any other layer violations found in layout templates (if any)
  - Trace: proposal.md "Issue 2: Layer Violation Fix"

## 2. Demo Screenset Conditional Copying
- [ ] 2.1 Audit demo screenset templates to confirm @hai3/uikit imports (17+ files expected)
  - Directory: `packages/cli/templates/screensets/demo/`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [ ] 2.2 Add conditional logic to SKIP demo screenset copying when `uikit === 'none'`
  - File: `packages/cli/src/generators/project.ts`
  - Location: Around lines where demo screenset is copied to `src/screensets/demo/`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [ ] 2.3 Display message when demo is excluded: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
  - File: `packages/cli/src/generators/project.ts` or `packages/cli/src/commands/create/index.ts`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [ ] 2.4 Update screensetRegistry.tsx template to handle case with no demo screenset
  - File: `packages/cli/templates/screensetRegistry.tsx` (or generation logic)
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"

## 3. Audit and REMOVE L1/L2 Dependencies from Package.json (CRITICAL)
- [ ] 3.1 Audit current generateProject() for L1/L2 dependencies in package.json generation
  - File: `packages/cli/src/generators/project.ts`
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [ ] 3.2 Verify package.json only includes allowed HAI3 dependencies:
  - ALLOWED: @hai3/react (required), @hai3/uikit (conditional), @hai3/studio (conditional)
  - NOT ALLOWED: @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [ ] 3.3 Add validation test to ensure package.json layer compliance is enforced
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [ ] 3.4 REMOVE @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n dependencies from generated package.json
  - File: `packages/cli/src/generators/project.ts`
  - Location: Lines 264-270 where dependencies object is defined
  - Action: Delete the following lines from dependencies object:
    - `'@hai3/framework': 'alpha'`
    - `'@hai3/state': 'alpha'`
    - `'@hai3/api': 'alpha'`
    - `'@hai3/i18n': 'alpha'`
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"

## 4. Restore UIKit Option to Create Command
- [ ] 4.1 Add `uikit` option to CreateCommandArgs interface
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: proposal.md "Issue 1: UIKit Replaceability"
- [ ] 4.2 Add `--uikit` option definition with choices ['hai3', 'none'], default 'hai3'
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: spec delta "Requirement: UIKit Option for Project Creation"
- [ ] 4.3 Add interactive prompt as select with choices ['hai3', 'none'] (NOT boolean confirm)
  - File: `packages/cli/src/commands/create/index.ts`
  - Trace: spec delta "Scenario: Interactive UIKit selection"
  - Note: Use select prompt for consistency with CLI option and future extensibility
- [ ] 4.4 Pass uikit parameter from createCommand to generateProject() call in execute function
  - File: `packages/cli/src/commands/create/index.ts`
  - Location: Around line 185 where `generateProject()` is called
  - Action: Add `uikit` to the options object passed to generateProject()
  - Trace: proposal.md "Issue 1: UIKit Replaceability", design.md "Data Flow"

## 5. Make UIKit Dependency Conditional in Project Generator
- [ ] 5.1 Add `uikit` parameter to ProjectGeneratorInput interface
  - File: `packages/cli/src/generators/project.ts`
  - Trace: proposal.md "Issue 1: UIKit Replaceability"
- [ ] 5.2 Conditionally include @hai3/uikit in dependencies based on uikit option
  - File: `packages/cli/src/generators/project.ts` (around line 267)
  - Trace: spec delta "Scenario: UIKit dependency inclusion"
- [ ] 5.3 Conditionally copy layout templates from `layout/hai3-uikit/` based on uikit option
  - File: `packages/cli/src/generators/project.ts` (around lines 100-105)
  - Trace: spec delta "Scenario: Layout template conditional copying"

## 6. Validation and Testing
- [ ] 6.1 Run `npm run type-check` to verify TypeScript compilation
  - Trace: design.md "Validation"
- [ ] 6.2 Test `hai3 create test-app` (default - should include UIKit)
  - Trace: spec delta "Scenario: Default behavior"
- [ ] 6.3 Test `hai3 create test-app-no-uikit --uikit none`
  - Trace: spec delta "Scenario: UIKit excluded"
- [ ] 6.4 Verify generated package.json has correct dependencies in both cases
  - Trace: spec delta "Scenario: UIKit dependency inclusion"
- [ ] 6.5 Verify generated package.json has NO L1/L2 dependencies in any case
  - Trace: proposal.md "Issue 4: Generated Package.json Layer Enforcement"
- [ ] 6.6 Verify demo screenset is included with `--uikit hai3` and EXCLUDED with `--uikit none`
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"
- [ ] 6.7 Verify message is displayed when demo screenset is excluded
  - Expected: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
  - Trace: proposal.md "Issue 3: Demo Screenset UIKit Independence"

## 7. ESLint Layer Enforcement (REQUIRED)
- [ ] 7.1 Identify current ESLint config template in CLI templates
  - Directory: `packages/cli/templates/`
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
- [ ] 7.2 MODIFY existing `packages/cli/templates/eslint.config.js` - add layer enforcement rules
  - File: `packages/cli/templates/eslint.config.js` (415 lines)
  - Location: Add `no-restricted-imports` rule in the rules section, after existing rules configuration
  - Configure to disallow: @hai3/framework, @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
  - Error message: "App-layer code must import from @hai3/react, not directly from L1/L2 packages"
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement", spec delta "Requirement: ESLint Layer Enforcement"
- [ ] 7.3 Verify ESLint rule works with TypeScript files (.ts, .tsx)
  - Consider using `@typescript-eslint/no-restricted-imports` for better TypeScript support
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
- [ ] 7.4 Test that lint errors appear when importing from L1/L2 packages
  - Create test file with forbidden import
  - Run eslint and verify error is reported
  - Trace: spec delta "Scenario: Lint error on L1/L2 import"
- [ ] 7.5 Verify ESLint rule works with both `--uikit hai3` and `--uikit none` generated projects
  - Both project types should have the same layer enforcement rules
  - Trace: spec delta "Scenario: ESLint rule in both UIKit modes"
- [ ] 7.6 Document ESLint layer enforcement in generated project README or config comments
  - Trace: proposal.md "Issue 5: ESLint Layer Enforcement"
