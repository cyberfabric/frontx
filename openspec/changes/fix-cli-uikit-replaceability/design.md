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
