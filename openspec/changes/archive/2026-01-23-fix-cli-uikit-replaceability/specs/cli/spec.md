## ADDED Requirements

### Requirement: UIKit Option for Project Creation

The CLI SHALL provide a `--uikit` option for the `hai3 create` command that controls whether @hai3/uikit is included in generated projects.

#### Scenario: UIKit option definition

**Given** the `hai3 create` command definition
**When** examining available options
**Then** the system SHALL provide:
- Option name: `uikit`
- Type: string
- Choices: `['hai3', 'none']`
- Default: `'hai3'`
- Description: "UI kit to use ('hai3' for @hai3/uikit, 'none' for no UI kit)"

#### Scenario: Default behavior

**Given** a developer running `hai3 create my-app` without `--uikit` flag
**When** the command executes
**Then** the system SHALL:
- Use default value `'hai3'`
- Include `@hai3/uikit` in package.json dependencies
- Copy layout templates from `layout/hai3-uikit/` to `src/app/layout/`

#### Scenario: UIKit excluded

**Given** a developer running `hai3 create my-app --uikit none`
**When** the command executes
**Then** the system SHALL:
- NOT include `@hai3/uikit` in package.json dependencies
- NOT copy layout templates from `layout/hai3-uikit/`
- Display info message: "UIKit excluded. You will need to implement your own layout components."

#### Scenario: Interactive UIKit selection

**Given** a developer running `hai3 create my-app` in interactive mode without `--uikit` flag
**When** prompting for configuration
**Then** the system SHALL prompt:
- Question: "Select UI kit:"
- Type: select
- Choices:
  - `{ value: 'hai3', label: 'HAI3 UIKit (@hai3/uikit)' }`
  - `{ value: 'none', label: 'None (implement your own)' }`
- Default: `'hai3'`

**Note**: Interactive prompt uses select (not boolean confirm) for consistency with CLI option and future extensibility.

#### Scenario: UIKit dependency inclusion

**Given** the `generateProject()` function
**When** generating package.json with `uikit: 'hai3'`
**Then** dependencies SHALL include:
```json
{
  "@hai3/uikit": "alpha"
}
```

**And Given** generating package.json with `uikit: 'none'`
**Then** dependencies SHALL NOT include `@hai3/uikit`

#### Scenario: Layout template conditional copying

**Given** the `generateProject()` function
**When** `uikit` parameter is `'hai3'`
**Then** the system SHALL copy files from `templates/layout/hai3-uikit/` to `src/app/layout/`

**And Given** `uikit` parameter is `'none'`
**Then** the system SHALL NOT copy any files from `templates/layout/hai3-uikit/`

### Requirement: Demo Screenset Conditional Inclusion

The demo screenset SHALL be excluded when `--uikit none` is selected, as it requires @hai3/uikit components.

#### Scenario: Demo screenset included with UIKit

**Given** a developer running `hai3 create my-app` or `hai3 create my-app --uikit hai3`
**When** the project is created
**Then** the system SHALL copy demo screenset from `templates/screensets/demo/` to `src/screensets/demo/`
**And** the screensetRegistry.tsx SHALL include demo screenset registration

#### Scenario: Demo screenset excluded without UIKit

**Given** a developer running `hai3 create my-app --uikit none`
**When** the project is created
**Then** the system SHALL NOT copy demo screenset to `src/screensets/`
**And** the system SHALL display message: "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."
**And** the screensetRegistry.tsx SHALL be generated without demo screenset imports

#### Scenario: Project without demo compiles successfully

**Given** a developer running `hai3 create my-app --uikit none`
**When** the project is created without demo screenset
**Then** the generated project SHALL compile without errors
**And** `npm run type-check` SHALL succeed
**And** `npm run build` SHALL succeed

### Requirement: Generated Package.json Layer Enforcement

The CLI-generated project's package.json MUST NOT have dependencies on Layer 1 (L1) or Layer 2 (L2) packages. Only Layer 3 (L3) and UI Layer packages are allowed.

#### Scenario: Allowed HAI3 dependencies

**Given** the `generateProject()` function generating package.json
**When** adding HAI3 dependencies
**Then** the system SHALL ONLY include:
- `@hai3/react` (L3) - REQUIRED for all generated projects
- `@hai3/uikit` (L3+/UI) - CONDITIONAL, only when `--uikit hai3`
- `@hai3/studio` (L3+) - CONDITIONAL, only when `--studio` is enabled

#### Scenario: Forbidden HAI3 dependencies

**Given** the `generateProject()` function generating package.json
**When** adding dependencies
**Then** the system SHALL NOT include:
- `@hai3/framework` (L2)
- `@hai3/state` (L1)
- `@hai3/api` (L1)
- `@hai3/i18n` (L1)
- `@hai3/screensets` (L1)

### Requirement: ESLint Layer Enforcement in Generated Projects

The CLI SHALL configure ESLint in generated projects to enforce layer boundaries at lint-time, preventing imports from L1/L2 packages.

#### Scenario: ESLint configuration includes layer enforcement rules

**Given** the `generateProject()` function generating ESLint configuration
**When** creating the ESLint config file (eslint.config.js or .eslintrc)
**Then** the configuration SHALL include `no-restricted-imports` rule configured to disallow:
- `@hai3/framework` and `@hai3/framework/*`
- `@hai3/state` and `@hai3/state/*`
- `@hai3/api` and `@hai3/api/*`
- `@hai3/i18n` and `@hai3/i18n/*`
- `@hai3/screensets` and `@hai3/screensets/*`

**And** each pattern SHALL have a custom message explaining:
- "App-layer code must import from @hai3/react, not directly from L1/L2 packages"

#### Scenario: Lint error on L1/L2 import

**Given** a generated project with ESLint layer enforcement
**When** a developer writes code that imports from `@hai3/framework`
```typescript
import { menuActions } from '@hai3/framework';
```
**Then** running `npm run lint` SHALL produce an error:
- Rule: `no-restricted-imports`
- Message: Contains "App-layer code must import from @hai3/react"
**And** the lint command SHALL exit with non-zero status

#### Scenario: Allowed imports pass lint

**Given** a generated project with ESLint layer enforcement
**When** a developer writes code that imports from allowed packages
```typescript
import { menuActions } from '@hai3/react';
import { Button } from '@hai3/uikit';
```
**Then** running `npm run lint` SHALL NOT produce errors for these imports
**And** the lint command SHALL succeed (exit code 0)

### Requirement: Monorepo Source Files Layer Compliance

The monorepo source files in `/src/app/` MUST follow the same layer architecture rules as generated projects. App-layer code SHALL only import from `@hai3/react` (L3), not directly from L1/L2 packages.

#### Scenario: Monorepo Menu.tsx layer compliance

**Given** the monorepo source file `/src/app/layout/Menu.tsx`
**When** examining the import statements
**Then** the `menuActions` import SHALL be:
```typescript
import { menuActions } from '@hai3/react';
```
**And** SHALL NOT be:
```typescript
import { menuActions } from '@hai3/framework';
```

#### Scenario: Monorepo mocks.ts layer compliance

**Given** the monorepo source file `/src/app/api/mocks.ts`
**When** examining the import statements
**Then** the `MockMap` import SHALL be:
```typescript
import type { MockMap } from '@hai3/react';
```
**And** the `Language` import SHALL be:
```typescript
import { Language } from '@hai3/react';
```
**And** SHALL NOT import from `@hai3/api` or `@hai3/i18n`

#### Scenario: Monorepo AccountsApiService.ts layer compliance

**Given** the monorepo source file `/src/app/api/AccountsApiService.ts`
**When** examining the import statements
**Then** the API imports SHALL be:
```typescript
import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
```
**And** SHALL NOT be:
```typescript
import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/api';
```

### Requirement: Monorepo ESLint Layer Enforcement

The monorepo's `/eslint.config.js` SHALL enforce layer boundaries for `src/app/**` files, preventing imports from L1/L2 packages.

#### Scenario: Monorepo ESLint configuration includes layer rules

**Given** the monorepo ESLint configuration at `/eslint.config.js`
**When** examining the configuration
**Then** there SHALL be a rule block for `src/app/**/*.ts` and `src/app/**/*.tsx` files
**And** the rule block SHALL configure `no-restricted-imports` to disallow:
- `@hai3/framework` and `@hai3/framework/*`
- `@hai3/state` and `@hai3/state/*`
- `@hai3/api` and `@hai3/api/*`
- `@hai3/i18n` and `@hai3/i18n/*`
- `@hai3/screensets` and `@hai3/screensets/*`

#### Scenario: Monorepo lint passes after fixes

**Given** the monorepo with all layer violations fixed and ESLint rules added
**When** running `npm run lint`
**Then** the command SHALL succeed with exit code 0
**And** no layer violation errors SHALL be reported for `src/app/**` files

### Requirement: Flux Architecture Compliance in App Layer

The monorepo source files in `/src/app/` MUST follow the Flux architecture rules documented in EVENTS.md. Components SHALL NOT dispatch slice actions directly.

#### Scenario: Menu.tsx Flux compliance

**Given** the monorepo source file `/src/app/layout/Menu.tsx`
**When** examining the menu toggle implementation
**Then** the component SHALL NOT contain direct slice dispatch:
```typescript
// FORBIDDEN - Direct slice dispatch
dispatch(menuActions.toggleMenu());
```
**And** SHALL use event-based action pattern:
```typescript
// CORRECT - Call action that emits event
toggleMenu();
```

#### Scenario: No direct slice dispatch in layout components

**Given** all layout components in `/src/app/layout/`
**When** examining dispatch calls
**Then** NONE of the components SHALL contain patterns like:
- `dispatch(xxxActions.yyy())` - slice actions object member call
- `dispatch(menuActions.*)` - menu slice actions
- `dispatch(layoutActions.*)` - layout slice actions
**And** all state updates SHALL go through event-based actions

### Requirement: Layout Templates Single Source of Truth

The CLI SHALL use `/src/app/layout/` as the single source of truth for layout templates. The duplicated `template-sources/layout/` directory SHALL be eliminated.

#### Scenario: Layout source is monorepo app directory

**Given** the CLI template build process (`copy-templates.ts`)
**When** copying layout templates
**Then** the system SHALL copy files from `/src/app/layout/` (monorepo source)
**And** SHALL NOT maintain a separate `template-sources/layout/` directory
**And** the destination SHALL be `templates/layout/hai3-uikit/`

#### Scenario: template-sources/layout not tracked in git

**Given** the repository git configuration
**When** checking tracked files
**Then** `packages/cli/template-sources/layout/` SHALL NOT be tracked in git
**And** the path SHALL be listed in `.gitignore`

#### Scenario: Layout fixes propagate automatically

**Given** a fix applied to `/src/app/layout/Menu.tsx`
**When** running the CLI build (`npm run build` in packages/cli)
**Then** the fix SHALL automatically appear in `templates/layout/hai3-uikit/Menu.tsx`
**And** no manual synchronization SHALL be required

#### Scenario: Manifest references correct layout source

**Given** the manifest file at `packages/cli/template-sources/manifest.yaml`
**When** examining the layout section
**Then** the source SHALL reference the monorepo app layout directory
```yaml
layout:
  source: ../../src/app/layout/  # Relative to template-sources, resolves to /src/app/layout/
  description: "Layout component templates using @hai3/uikit (from monorepo source)"
```

## MODIFIED Requirements

### Requirement: Project Creation Command

The CLI SHALL provide a `hai3 create <project-name>` command that scaffolds a new HAI3 project using template-based generation with optional UIKit inclusion.

#### Scenario: Project creation with AI configs

**Given** a developer running `hai3 create my-app`
**When** the command executes
**Then** the system SHALL create:
- Directory `my-app/`
- All root config files from templates
- `hai3.config.json` with project configuration
- `package.json` with HAI3 dependencies (UIKit included by default)
- `.ai/` folder with standalone-only AI guidelines
- `.claude/commands/` with hai3-prefixed command adapters
- `.cursor/rules/` and `.cursor/commands/` with adapters
- `.windsurf/rules/` and `.windsurf/commands/` with adapters (no workflows/)
- `.cline/` configuration folder
- `.aider/` configuration folder
- `openspec/` directory with project.md and AGENTS.md
- `src/app/themes/`, `src/app/uikit/`, `src/app/icons/`, `src/app/api/` from templates
- `src/app/layout/` from templates (when UIKit is included)
- `src/app/App.tsx` and `src/app/main.tsx` application entry points
- `src/screensets/demo/` screenset from templates
- `src/screensets/screensetRegistry.tsx` for screenset registration

#### Scenario: Project creation without UIKit

**Given** a developer running `hai3 create my-app --uikit none`
**When** the command executes
**Then** the system SHALL create:
- Directory `my-app/`
- All root config files from templates
- `hai3.config.json` with project configuration
- `package.json` WITHOUT @hai3/uikit dependency
- `.ai/` folder with standalone-only AI guidelines
- `.claude/commands/` with hai3-prefixed command adapters
- `.cursor/rules/` and `.cursor/commands/` with adapters
- `.windsurf/rules/` and `.windsurf/commands/` with adapters
- `.cline/` configuration folder
- `.aider/` configuration folder
- `openspec/` directory with project.md and AGENTS.md
- `src/app/themes/`, `src/app/uikit/`, `src/app/icons/`, `src/app/api/` from templates
- NO `src/app/layout/` directory (user must implement)
- `src/app/App.tsx` and `src/app/main.tsx` application entry points
- NO `src/screensets/demo/` directory (requires @hai3/uikit)
- `src/screensets/screensetRegistry.tsx` for screenset registration (empty or minimal)

**And** the system SHALL display message:
- "Demo screenset excluded (requires @hai3/uikit). Create your own screenset with `hai3 screenset create`."

### Requirement: Generated Code Quality

All code generated by CLI commands SHALL pass HAI3 architectural validation without modification, including layer dependency rules.

#### Scenario: Created screenset passes validation

**Given** running `hai3 screenset create billing`
**When** screenset is created
**Then** `npm run arch:check` SHALL succeed

#### Scenario: Copied screenset passes validation

**Given** running `hai3 screenset copy chat chatCopy`
**When** screenset is copied
**Then**:
- `npm run arch:check` SHALL succeed
- No ID collisions SHALL occur
- New screenset SHALL be accessible in UI

#### Scenario: Layout templates follow layer rules

**Given** the layout templates in `templates/layout/hai3-uikit/`
**When** examining import statements
**Then** all imports SHALL follow layer architecture rules:
- App layer code SHALL import from @hai3/react (Layer 3)
- App layer code SHALL import from @hai3/uikit (UI Layer)
- App layer code SHALL NOT import directly from @hai3/framework (Layer 2)
- App layer code SHALL NOT import directly from @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets (Layer 1)

#### Scenario: Menu.tsx correct layer imports

**Given** the Menu.tsx template at `templates/layout/hai3-uikit/Menu.tsx`
**When** examining the menuActions import
**Then** the import SHALL be:
```typescript
import { menuActions } from '@hai3/react';
```
**And** SHALL NOT be:
```typescript
import { menuActions } from '@hai3/framework';
```

#### Scenario: All layout templates follow layer rules

**Given** the layout templates in `templates/layout/hai3-uikit/`
**When** examining all template files:
- Header.tsx
- Footer.tsx
- Sidebar.tsx
- Popup.tsx
- Overlay.tsx
- Screen.tsx
- Layout.tsx
- Menu.tsx
**Then** NONE of the templates SHALL contain imports from:
- `@hai3/framework` (Layer 2)
- `@hai3/state` (Layer 1)
- `@hai3/api` (Layer 1)
- `@hai3/i18n` (Layer 1)
- `@hai3/screensets` (Layer 1)
**And** any HAI3 imports SHALL be from:
- `@hai3/react` (Layer 3)
- `@hai3/uikit` (UI Layer - allowed for layout templates)
