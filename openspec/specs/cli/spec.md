# cli Specification

## Purpose
TBD - created by archiving change add-hai3-cli. Update Purpose after archive.
## Requirements
### Requirement: CLI Package Structure

The CLI SHALL be implemented as a workspace package `@hai3/cli` with a globally installable binary named `hai3` and a programmatic API for AI agent integration.

#### Scenario: Package installation

**Given** a developer installing the CLI globally
**When** running `npm install -g @hai3/cli`
**Then** the system SHALL:
- Install the `@hai3/cli` package
- Make `hai3` command available in PATH
- Support ESM environments (Node.js 18+)
- Support both ESM `import` and CommonJS `require()` for programmatic API

#### Scenario: Package structure

```
packages/cli/
├── package.json          # name: @hai3/cli, type: module, bin: { hai3: ./dist/index.js }
├── tsup.config.ts        # Bundle config (ESM primary, dual exports for API)
├── scripts/
│   └── copy-templates.ts # Build-time template copying
├── templates/            # Gitignored - generated at build
│   ├── manifest.json
│   ├── screenset-template/
│   └── ...
├── src/
│   ├── index.ts          # CLI entry point (Commander setup)
│   ├── api.ts            # Programmatic API exports
│   │
│   ├── core/
│   │   ├── command.ts    # CommandDefinition interface
│   │   ├── registry.ts   # CommandRegistry class
│   │   ├── executor.ts   # executeCommand() function
│   │   ├── types.ts      # Shared types
│   │   ├── logger.ts     # Colored output (silenceable)
│   │   └── prompt.ts     # Prompt abstraction
│   │
│   ├── commands/
│   │   ├── create/       # Project creation command
│   │   ├── update/       # Update command
│   │   └── screenset/    # Screenset subcommands
│   │
│   ├── generators/
│   │   ├── project.ts          # Template-based project generation
│   │   ├── screensetFromTemplate.ts  # Template-based screenset generation
│   │   ├── screenset.ts        # Legacy programmatic (reference)
│   │   ├── i18n.ts             # Translation utilities
│   │   ├── transform.ts        # ID transformation for copy
│   │   └── utils.ts            # toPascalCase, toScreamingSnake, etc.
│   │
│   └── utils/
│       ├── project.ts    # findProjectRoot(), loadConfig()
│       ├── fs.ts         # writeGeneratedFiles()
│       └── validation.ts # Name validation utilities
```

**Given** the package structure above
**When** tsup builds the package
**Then** the output SHALL include:
- ESM CLI binary (`dist/index.js`)
- Dual-format API exports (`dist/api.js` for ESM, `dist/api.cjs` for CommonJS)
- Type declarations (`dist/api.d.ts`)

#### Scenario: Package.json exports configuration

**Given** the package.json configuration
**When** consumers import the package
**Then** the exports field SHALL provide:
```json
{
  "type": "module",
  "bin": {
    "hai3": "./dist/index.js"
  },
  "main": "./dist/api.cjs",
  "module": "./dist/api.js",
  "types": "./dist/api.d.ts",
  "exports": {
    ".": {
      "types": "./dist/api.d.ts",
      "import": "./dist/api.js",
      "require": "./dist/api.cjs"
    }
  }
}
```

#### Scenario: ESM dependencies compatibility

**Given** ESM-only dependencies (`inquirer@9+`, `chalk@5+`)
**When** bundling the CLI
**Then** the system SHALL:
- Use native ESM imports for all dependencies
- Bundle dependencies appropriately for each output format
- Provide `import.meta.url` based path resolution instead of `__dirname`

### Requirement: Template-Based Code Generation

The CLI SHALL use a 3-stage template pipeline: copy from presets → generate pointers/adapters → use templates.

#### Scenario: Template source structure

**Given** the presets directory structure
**When** building CLI templates
**Then** the system SHALL use:
```
.ai/
├── standalone-overrides/          # @standalone:override files (used during .ai/ assembly)

presets/
├── standalone/                    # Base files for standalone projects
│   ├── eslint-plugin-local/       # ESLint rules (monorepo references from here)
│   ├── configs/                   # Build configs
│   ├── scripts/                   # Utility scripts
│   └── README.md                  # Root files auto-copied (extensible)
│
└── monorepo/                      # Monorepo EXTENDS standalone
    ├── configs/                   # Additional monorepo configs (if any)
    └── scripts/                   # Additional monorepo scripts (if any)
```

**AND** root project files copied at build time:
- `index.html`, `postcss.config.ts`, `tailwind.config.ts`, `tsconfig.node.json`, `vite.config.ts`, `.gitignore`
- `src/vite-env.d.ts`, `src/main.tsx`, `src/App.tsx`, `src/screensets/screensetRegistry.tsx`
- `src/themes/`, `src/uikit/`, `src/icons/`, `src/screensets/demo/`

**AND** generated at build time:
- `.ai/` (assembled from markers + ai-overrides/)
- `CLAUDE.md`, `.claude/`, `.cursor/`, `.windsurf/` (IDE rules, command adapters, openspec commands)

**AND** NOT included in templates:
- `openspec/` (users initialize separately via `openspec init`)

#### Scenario: Build pipeline stages

**Given** running `npm run build:packages`
**When** copy-templates.ts executes
**Then** the system SHALL:
1. Copy `presets/standalone/` to `templates/` (excluding ai-overrides/, flattening configs/ and scripts/)
2. Copy root project files to `templates/`
3. Assemble `.ai/` from marker-based scanning of root `.ai/` (using .ai/standalone-overrides/ for @standalone:override files)
4. Generate IDE rules (CLAUDE.md, .cursor/rules/, .windsurf/rules/) as pointers to .ai/GUIDELINES.md
5. Generate command adapters from @standalone marked commands
6. Copy openspec commands from root to all IDE directories

### Requirement: Blank Screenset Template

The CLI SHALL include a minimal `_blank` screenset template with correct structure but no business logic.

#### Scenario: Template structure

```
src/screensets/_blank/
├── ids.ts                    # Centralized IDs
├── types/index.ts            # Type definitions (empty)
├── events/_blankEvents.ts    # Events enum (empty, with examples)
├── slices/_blankSlice.ts     # Redux slice (empty state)
├── effects/_blankEffects.ts  # Effect listeners (empty)
├── actions/_blankActions.ts  # Action creators (empty)
├── api/
│   ├── _blankApiService.ts   # API service class (base only)
│   └── mocks.ts              # Mock map (empty)
├── uikit/icons/HomeIcon.tsx  # Custom icon
├── i18n/                     # 36 language files
├── screens/home/
│   ├── HomeScreen.tsx        # Simple screen (title + description)
│   └── i18n/                 # 36 language files
└── _blankScreenset.tsx       # Screenset config with self-registration
```

**Given** the _blank screenset template
**When** developers review the structure
**Then** they SHALL find:
- Empty placeholder files with commented examples
- No business logic to remove
- Correct HAI3 architectural patterns

#### Scenario: Template validation

**Given** the _blank screenset in src/screensets/_blank/
**When** running validation commands
**Then** `npm run type-check` and `npm run arch:check` SHALL pass

### Requirement: Scalable Command Architecture

The CLI SHALL use a plugin-based command registry with standardized interfaces to enable future extensibility and AI agent integration.

#### Scenario: CommandDefinition interface

```typescript
export interface CommandContext {
  cwd: string;
  projectRoot: string | null;
  config: Hai3Config | null;
  logger: Logger;
  prompt: PromptFn;
}

export interface CommandDefinition<TArgs = unknown, TResult = void> {
  name: string;
  description: string;
  args: ArgDefinition[];
  options: OptionDefinition[];
  validate(args: TArgs, ctx: CommandContext): ValidationResult;
  execute(args: TArgs, ctx: CommandContext): Promise<TResult>;
}
```

**Given** the `CommandDefinition` interface
**When** implementing a new command
**Then** the command SHALL:
- Define typed arguments and result
- Provide validation logic separate from execution
- Return structured results for programmatic consumption

#### Scenario: Command registration

```typescript
const registry = new CommandRegistry();
registry.register(createCommand);
registry.register(updateCommand);
registry.register(screensetCreateCommand);
registry.register(screensetCopyCommand);
```

**Given** a `CommandRegistry` instance
**When** commands are registered
**Then** they SHALL be discoverable by name for both CLI and programmatic use

### Requirement: Programmatic API for AI Agents

The CLI SHALL expose a programmatic API enabling AI agents to execute commands non-interactively with typed inputs and outputs.

#### Scenario: Programmatic execution

```typescript
import { executeCommand, commands } from '@hai3/cli';

const result = await executeCommand(
  commands.screensetCreate,
  { name: 'billing', category: 'drafts' },
  { interactive: false }
);

if (result.success) {
  console.log('Created files:', result.data.files);
}
```

**Given** an AI agent importing `@hai3/cli`
**When** calling `executeCommand()` with `interactive: false`
**Then** the system SHALL:
- Skip all interactive prompts
- Use provided arguments directly
- Return typed `CommandResult<T>` with success/failure and data

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

### Requirement: Update Command

The CLI SHALL provide a `hai3 update` command that syncs ALL templates to existing projects.

#### Scenario: Full template sync

**Given** running `hai3 update` inside a HAI3 project
**When** the command executes
**Then** the system SHALL:
- Copy entire templates/ directory to project root
- Overwrite existing template files
- Preserve user files not in templates
- Skip internal files (manifest.json)
- Report sync completion

#### Scenario: Templates-only update

**Given** running `hai3 update --templates-only` inside a HAI3 project
**When** the flag is provided
**Then** the system SHALL:
- Skip CLI update
- Skip NPM package updates
- Copy entire templates/ directory to project

### Requirement: Screenset Create Command

The CLI SHALL provide a `hai3 screenset create <name>` command that scaffolds a new screenset using template-based generation from the _blank template.

#### Scenario: Create screenset

**Given** running `hai3 screenset create billing` inside a HAI3 project
**When** the command executes
**Then** the system SHALL create:
```
src/screensets/billing/
├── ids.ts
├── types/index.ts
├── events/billingEvents.ts
├── slices/billingSlice.ts
├── effects/billingEffects.ts
├── actions/billingActions.ts
├── api/
│   ├── billingApiService.ts
│   └── mocks.ts
├── uikit/icons/HomeIcon.tsx
├── billingScreenset.tsx
├── i18n/                 # 36 language files
└── screens/home/
    ├── HomeScreen.tsx
    └── i18n/             # 36 language files
```

#### Scenario: ID transformation patterns

**Given** the _blank template with identifiers like `_BLANK_SCREENSET_ID`, `_blankSlice`, `_BlankState`
**When** creating screenset named `billing`
**Then** the system SHALL transform:
- `_BLANK_SCREENSET_ID` → `BILLING_SCREENSET_ID`
- `_BLANK_DOMAIN` → `BILLING_DOMAIN`
- `'_blank'` → `'billing'`
- `_blankSlice` → `billingSlice`
- `_blankEffects` → `billingEffects`
- `_blankEvents` → `billingEvents`
- `_BlankEvents` → `BillingEvents`
- `_BlankState` → `BillingState`
- `initialize_BlankEffects` → `initializeBillingEffects`
- `select_BlankState` → `selectBillingState`
- `_blank` → `billing`
- `_Blank` → `Billing`

#### Scenario: Generated screenset file count

**Given** a successful screenset creation
**When** counting generated files
**Then** 84 files SHALL be created

#### Scenario: Name validation

**Given** invalid name `My-Screenset`
**When** validation runs
**Then** the system SHALL display: "Screenset name must be camelCase"

#### Scenario: Reserved name validation

**Given** reserved name `_blank`
**When** validation runs
**Then** the system SHALL display error about reserved name

#### Scenario: Category flag

**Given** running `hai3 screenset create billing --category=production`
**When** generating screenset config
**Then** the config SHALL have `category: ScreensetCategory.Production`

#### Scenario: Home screen ID uses screenset name

**Given** the _blank template with `HOME_SCREEN_ID = '_blank'`
**When** creating screenset named `billing`
**Then** the system SHALL transform:
- `HOME_SCREEN_ID = '_blank'` → `HOME_SCREEN_ID = 'billing'`
- Translation key `menu_items._blank.label` → `menu_items.billing.label`

This ensures unique routes when multiple screensets are created.

### Requirement: Screenset Copy Command

The CLI SHALL provide a `hai3 screenset copy <source> <target>` command that duplicates an existing screenset with transformed IDs.

#### Scenario: Copy with ID transformation

**Given** running `hai3 screenset copy chat chatCopy`
**When** `src/screensets/chat/` exists
**Then** the system SHALL:
- Copy to `src/screensets/chatCopy/`
- Parse `chat/ids.ts` to find all ID constants
- Transform constant names: `CHAT_SCREENSET_ID` → `CHAT_COPY_SCREENSET_ID`
- Transform screenset ID values: `'chat'` → `'chatCopy'`
- Transform screen ID values using suffix: `'helloworld'` → `'helloworldCopy'`
- Transform translation key paths: `.chat.` → `.chatCopy.` in template literals
- Update screenset display name: `name: 'Chat'` → `name: 'ChatCopy'`
- Rename files: `chatScreenset.tsx` → `chatCopyScreenset.tsx`
- Default category to `ScreensetCategory.Drafts` unless `--category` specified

#### Scenario: Source not found

**Given** running `hai3 screenset copy nonexistent target`
**When** source doesn't exist
**Then** the system SHALL display error and exit with code 1

#### Scenario: Target exists

**Given** running `hai3 screenset copy chat demo`
**When** `src/screensets/demo/` exists
**Then** the system SHALL display error and exit with code 1

#### Scenario: Template literal preservation

**Given** source event definition:
```typescript
export enum ChatEvents {
  Selected = `${CHAT_SCREENSET_ID}/threads/selected`,
}
```
**When** copying to `chatCopy`
**Then** the result SHALL be:
```typescript
export enum ChatCopyEvents {
  Selected = `${CHAT_COPY_SCREENSET_ID}/threads/selected`,
}
```

#### Scenario: Screen ID suffix transformation

**Given** source screen IDs that don't contain the screenset ID:
```typescript
export const HELLO_WORLD_SCREEN_ID = 'helloworld';
export const PROFILE_SCREEN_ID = 'profile';
```
**When** copying from `demo` to `demoCopy`
**Then** the system SHALL derive suffix `'Copy'` and transform:
```typescript
export const HELLO_WORLD_SCREEN_ID = 'helloworldCopy';
export const PROFILE_SCREEN_ID = 'profileCopy';
```

#### Scenario: Translation key path transformation

**Given** source menu item label:
```typescript
label: `screenset.${CHAT_SCREENSET_ID}:menu_items.chat.label`
```
**When** copying to `chatCopy`
**Then** the result SHALL be:
```typescript
label: `screenset.${CHAT_COPY_SCREENSET_ID}:menu_items.chatCopy.label`
```

#### Scenario: Default category to drafts

**Given** running `hai3 screenset copy chat chatCopy` without `--category` flag
**When** the source screenset has `category: ScreensetCategory.Mockups`
**Then** the copied screenset SHALL have `category: ScreensetCategory.Drafts`

#### Scenario: Screenset display name transformation

**Given** source screenset with `name: 'Chat'`
**When** copying to `chatCopy`
**Then** the result SHALL have `name: 'ChatCopy'`

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

### Requirement: Project Configuration File

Projects created or managed by CLI SHALL have a `hai3.config.json` marker file at the project root.

#### Scenario: Config file structure

```json
{
  "hai3": true
}
```

**Given** a project created with HAI3 CLI
**When** `hai3.config.json` is generated
**Then** the file SHALL contain only the `hai3: true` marker

#### Scenario: Config for project detection

**Given** any `hai3` command execution
**When** determining if inside HAI3 project
**Then** the system SHALL search for `hai3.config.json` in current and parent directories

### Requirement: Standalone AI Configuration Content

The CLI SHALL ship AI configuration files that contain only user-project-applicable rules, excluding SDK package development rules.

#### Scenario: User-focused GUIDELINES.md routing

**Given** a HAI3 project created by CLI
**When** examining `.ai/GUIDELINES.md`
**Then** the ROUTING section SHALL contain Application Layer routes:
```
- src/screensets -> .ai/targets/SCREENSETS.md
- src/themes -> .ai/targets/THEMES.md
- Styling anywhere -> .ai/targets/STYLING.md
- Event patterns -> .ai/targets/EVENTS.md
- Layout patterns -> .ai/targets/LAYOUT.md
- Theme patterns -> .ai/targets/THEMES.md
```
**And** SHALL contain Tooling routes for consumption:
```
- .ai documentation -> .ai/targets/AI.md
- .ai/commands -> .ai/targets/AI_COMMANDS.md
- CLI usage -> .ai/targets/CLI.md
```
**And** SHALL NOT contain SDK Layer routes:
```
- packages/state -> .ai/targets/STORE.md
- packages/api -> .ai/targets/API.md
- packages/i18n -> .ai/targets/I18N.md
```
**And** SHALL NOT contain Framework Layer package routes:
```
- packages/framework -> .ai/targets/FRAMEWORK.md
```
**And** SHALL NOT contain React Layer routes:
```
- packages/react -> .ai/targets/REACT.md
```
**And** SHALL NOT contain UI and Dev Packages routes:
```
- packages/uikit -> .ai/targets/UIKIT.md
- packages/studio -> .ai/targets/STUDIO.md
```

#### Scenario: User-focused target file content

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/` files
**Then** each file SHALL focus on CONSUMING HAI3 packages, NOT developing them:
- CLI.md: Using hai3 commands (create, update, screenset), NOT CLI package development
- API.md: Using API services in screensets, NOT developing @hai3/api package
- THEMES.md: Theme configuration in src/themes/, NOT developing theme infrastructure
- AI.md: Documentation format guidelines for user projects
- AI_COMMANDS.md: Command usage documentation for user projects
**And** the following SDK-focused files SHALL NOT exist (excluded via marker removal):
- FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md (no routing in GUIDELINES.md)

#### Scenario: SDK-focused targets excluded from user projects

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/`
**Then** the directory SHALL NOT contain:
- STUDIO.md (Studio is SDK dev-only tooling, not used by app developers)
**And** all included target files SHALL have SCOPE sections referencing `src/` paths only, NOT `packages/` paths

#### Scenario: Cleaned AI.md content

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/AI.md`
**Then** the file SHALL NOT contain:
- References to `hai3dev-*` command namespace (monorepo-only)
- References to `UPDATE_GUIDELINES.md` (monorepo-only)
- References to `internal/` or `user/` command locations (outdated structure)
**And** SHALL contain user-relevant rules only:
- Documentation format guidelines
- Keyword conventions (MUST, REQUIRED, FORBIDDEN, etc.)
- CLI delegation rules for user commands

#### Scenario: Cleaned AI_COMMANDS.md content (Phase 1-5)

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/AI_COMMANDS.md`
**Then** the file SHALL NOT contain:
- References to `.ai/commands/internal/` (monorepo-only)
- References to `packages/*/commands/` (monorepo-only)
- References to `copy-templates.ts` (monorepo build internals)
- References to `hai3dev-*` command namespace (monorepo-only)
**And** SHALL contain user-relevant content:
- Command categories (hai3-*, openspec:*)
- How to use OpenSpec workflow commands

Note: Three-level hierarchy documentation (CREATING COMMANDS, ai:sync discovery, precedence rules) is added in Phase 9A - see "AI_COMMANDS.md contains hierarchy documentation" scenario below.

#### Scenario: No packages/ references in user projects

**Given** a HAI3 project created by CLI
**When** running `grep -rn "packages/" .ai/`
**Then** the search SHALL return 0 matches
**And** all target file SCOPE sections SHALL reference `src/` paths only

### Requirement: Command Naming Convention

The CLI SHALL use consistent command prefixes to identify command ownership and update mechanism.

#### Scenario: hai3: prefix for standalone commands

**Given** a standalone HAI3 project
**When** listing available AI commands in `.claude/commands/`
**Then** HAI3 framework commands SHALL use `hai3-` filename prefix:
- `hai3-new-screenset.md` -> `/hai3:new-screenset`
- `hai3-validate.md` -> `/hai3:validate`
- `hai3-new-screen.md` -> `/hai3:new-screen`
- `hai3-new-component.md` -> `/hai3:new-component`
- `hai3-new-action.md` -> `/hai3:new-action`
- `hai3-new-api-service.md` -> `/hai3:new-api-service`
- `hai3-quick-ref.md` -> `/hai3:quick-ref`
- `hai3-fix-violation.md` -> `/hai3:fix-violation`
- `hai3-duplicate-screenset.md` -> `/hai3:duplicate-screenset`

#### Scenario: openspec: prefix preserved

**Given** a HAI3 project with OpenSpec integration
**When** listing OpenSpec commands
**Then** OpenSpec commands SHALL keep `openspec:` prefix:
- `openspec:proposal`
- `openspec:apply`
- `openspec:archive`

**Rationale**: OpenSpec commands use `openspec:` prefix so they can be updated by `openspec update` command independently from `hai3 update`.

### Requirement: AI.md Compliance

All AI documentation files shipped by CLI SHALL comply with the AI.md format rules for optimal AI agent consumption.

#### Scenario: File length compliance

**Given** any AI documentation file in standalone `.ai/`
**When** counting lines
**Then** the file SHALL have fewer than 100 lines

#### Scenario: ASCII-only compliance

**Given** any AI documentation file in standalone `.ai/`
**When** scanning for non-ASCII characters
**Then** the file SHALL contain only ASCII characters (no unicode, emojis, smart quotes)

#### Scenario: Keyword compliance

**Given** any AI documentation file in standalone `.ai/`
**When** scanning for rule keywords
**Then** rules SHALL use keywords: MUST, REQUIRED, FORBIDDEN, STOP, DETECT, BAD, GOOD

### Requirement: Multi-IDE Support Matrix

The CLI SHALL generate appropriate configuration files for each supported AI IDE.

#### Scenario: Claude Code support

**Given** a HAI3 project created by CLI
**When** using Claude Code
**Then** the system SHALL provide:
- `.claude/commands/hai3-*.md` - Slash commands with hai3: prefix
- Each command file references canonical `.ai/` source

#### Scenario: Cursor support

**Given** a HAI3 project created by CLI
**When** using Cursor
**Then** the system SHALL provide:
- `.cursor/rules/global.mdc` - Always-on rules pointing to `.ai/GUIDELINES.md`
- `.cursor/commands/` - Command files

#### Scenario: Windsurf support

**Given** a HAI3 project created by CLI
**When** using Windsurf
**Then** the system SHALL provide:
- `.windsurf/rules/global.md` - Always-on rules
- `.windsurf/workflows/` - Workflow files

#### Scenario: Cline support

**Given** a HAI3 project created by CLI
**When** using Cline
**Then** the system SHALL provide:
- `.cline/settings.json` - Configuration pointing to `.ai/`

#### Scenario: Aider support

**Given** a HAI3 project created by CLI
**When** using Aider
**Then** the system SHALL provide:
- `.aider/.aider.conf.yml` - Configuration with read directive for `.ai/`

### Requirement: AI Command Maintenance Documentation

The CLI SHALL ship AI.md (monorepo) with command maintenance rules to guide future AI command creation and modification.

#### Scenario: Command location rules documented

**Given** the monorepo AI.md file
**When** examining command maintenance rules
**Then** the file SHALL document:
- REQUIRED: Canonical command content in `.ai/commands/`
- REQUIRED: IDE folders contain thin adapters only
- FORBIDDEN: Command logic in IDE-specific folders

#### Scenario: Naming conventions documented

**Given** the monorepo AI.md file
**When** examining naming conventions
**Then** the file SHALL document:
- `hai3-` prefix for standalone commands
- `hai3dev-` prefix for monorepo-only commands
- `openspec:` prefix unchanged (managed by openspec update)

#### Scenario: Command structure rules documented

**Given** the monorepo AI.md file
**When** examining command structure rules
**Then** the file SHALL document:
- Commands are self-contained with full procedural steps
- No references to external workflow files
- No duplicating GUIDELINES.md routing table in commands
- Commands follow AI.md format rules

#### Scenario: Adding new command checklist documented

**Given** the monorepo AI.md file
**When** examining command creation guidance
**Then** the file SHALL document steps:
1. Create canonical file in `.ai/commands/hai3-<name>.md`
2. Follow AI.md format rules
3. Create adapter in each IDE folder
4. Add to copy-templates.ts standaloneAiConfig (if standalone)
5. Verify with `npm run arch:check`

### Requirement: OpenSpec Integration for Standalone

The CLI SHALL include OpenSpec configuration for standalone projects to enable spec-driven development.

#### Scenario: OpenSpec directory structure

**Given** a HAI3 project created by CLI
**When** examining `openspec/` directory
**Then** the directory SHALL contain:
- `project.md` - Template project context (to be customized by user)
- `AGENTS.md` - OpenSpec instructions for AI agents (unchanged from openspec)

#### Scenario: OpenSpec commands available

**Given** a HAI3 project created by CLI
**When** listing available commands
**Then** OpenSpec commands SHALL be available:
- `/openspec:proposal` - Create an OpenSpec proposal
- `/openspec:apply` - Apply an OpenSpec change
- `/openspec:archive` - Archive an OpenSpec change

### Requirement: ESLint Plugin Location

The ESLint plugin SHALL live in `presets/standalone/` and be referenced by the monorepo.

#### Scenario: Standalone ESLint rules

**Given** a standalone HAI3 project
**When** linting with ESLint
**Then** the system SHALL use rules from `eslint-plugin-local/` containing:
- domain-event-format
- no-barrel-exports-events-effects
- no-coordinator-effects
- no-missing-domain-id

#### Scenario: Monorepo ESLint reference

**Given** the HAI3 monorepo
**When** linting with ESLint
**Then** the system SHALL reference `./presets/standalone/eslint-plugin-local` in eslint.config.js

### Requirement: Generated IDE Rules

All IDE rules SHALL be generated as pointers to `.ai/GUIDELINES.md`.

#### Scenario: CLAUDE.md generation

**Given** building CLI templates
**When** generating IDE rules
**Then** the system SHALL create `CLAUDE.md` containing:
```markdown
# CLAUDE.md

Use `.ai/GUIDELINES.md` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.
```

#### Scenario: Cursor rules generation

**Given** building CLI templates
**When** generating IDE rules
**Then** the system SHALL create `.cursor/rules/hai3.mdc` containing a pointer to `.ai/GUIDELINES.md`

#### Scenario: Windsurf rules generation

**Given** building CLI templates
**When** generating IDE rules
**Then** the system SHALL create `.windsurf/rules/hai3.md` containing a pointer to `.ai/GUIDELINES.md`

### Requirement: Layer-Aware Command Bundling

The CLI SHALL bundle AI commands based on the target project layer, selecting the most specific variant for each command using a fallback chain.

#### Scenario: Variant naming convention

**Given** an AI command with layer-specific content
**When** creating layer variants
**Then** files SHALL be named with dot-suffixed layer indicators:
- Base command: `hai3-{name}.md` (serves as SDK default)
- SDK variant: `hai3-{name}.sdk.md`
- Framework variant: `hai3-{name}.framework.md`
- React variant: `hai3-{name}.react.md`

#### Scenario: SDK layer project commands

**Given** a project created with `hai3 create my-sdk --layer sdk`
**When** bundling commands from `packages/*/commands/`
**Then** for each command, the system SHALL:
1. Look for `.sdk.md` variant first
2. Fall back to `.md` (base) if no `.sdk.md` exists
3. Skip commands that have no applicable variant

#### Scenario: Framework layer project commands

**Given** a project created with `hai3 create my-framework --layer framework`
**When** bundling commands from `packages/*/commands/`
**Then** for each command, the system SHALL select variants in priority order:
1. `.framework.md` (most specific)
2. `.sdk.md` (inherited)
3. `.md` (base fallback)

#### Scenario: React and App layer project commands

**Given** a project created with `hai3 create my-app` or `hai3 create my-app --layer react`
**When** bundling commands from `packages/*/commands/`
**Then** for each command, the system SHALL select variants in priority order:
1. `.react.md` (most specific)
2. `.framework.md` (inherited)
3. `.sdk.md` (inherited)
4. `.md` (base fallback)

#### Scenario: Backward compatibility for commands

**Given** an existing command with no layer variants (only `hai3-{name}.md`)
**When** creating any layer project
**Then** the base `.md` file SHALL be bundled (current behavior preserved)

#### Scenario: Command exclusion by layer

**Given** a React-specific command (e.g., `hai3-new-screenset.md` in `packages/react/commands/`)
**When** creating an SDK layer project
**Then** the command SHALL NOT be bundled (no applicable variant in fallback chain)

### Requirement: Layer-Aware Target Bundling

The CLI SHALL bundle `.ai/targets/` files based on the target project layer, using an explicit layer mapping.

#### Scenario: Target layer mapping

**Given** the target-to-layer mapping configuration
**When** determining which targets to include
**Then** the system SHALL use the following mapping:
- SDK layer: API.md, STORE.md, EVENTS.md, I18N.md, AI.md, AI_COMMANDS.md, CLI.md
- Framework layer: SDK targets + FRAMEWORK.md, LAYOUT.md, THEMES.md
- React/App layer: Framework targets + REACT.md, SCREENSETS.md, STYLING.md, UIKIT.md, STUDIO.md

#### Scenario: SDK layer project targets

**Given** a project created with `hai3 create my-sdk --layer sdk`
**When** copying `.ai/targets/` files
**Then** the system SHALL:
- Include: API.md, STORE.md, EVENTS.md, I18N.md, AI.md, AI_COMMANDS.md, CLI.md
- Exclude: FRAMEWORK.md, LAYOUT.md, THEMES.md, REACT.md, SCREENSETS.md, STYLING.md, UIKIT.md, STUDIO.md

#### Scenario: Framework layer project targets

**Given** a project created with `hai3 create my-framework --layer framework`
**When** copying `.ai/targets/` files
**Then** the system SHALL:
- Include: All SDK targets + FRAMEWORK.md, LAYOUT.md, THEMES.md
- Exclude: REACT.md, SCREENSETS.md, STYLING.md, UIKIT.md, STUDIO.md

#### Scenario: React and App layer project targets

**Given** a project created with `hai3 create my-app` or `hai3 create my-app --layer react`
**When** copying `.ai/targets/` files
**Then** the system SHALL include all targets (current behavior preserved)

### Requirement: Layer-Aware GUIDELINES.md

The CLI SHALL generate a GUIDELINES.md file with routing appropriate to the project layer.

#### Scenario: SDK layer GUIDELINES routing

**Given** a project created with `hai3 create my-sdk --layer sdk`
**When** generating `.ai/GUIDELINES.md`
**Then** the ROUTING section SHALL only include routes to SDK-layer targets:
- packages/state -> .ai/targets/STORE.md
- packages/api -> .ai/targets/API.md
- packages/i18n -> .ai/targets/I18N.md
- Event patterns -> .ai/targets/EVENTS.md

#### Scenario: Framework layer GUIDELINES routing

**Given** a project created with `hai3 create my-framework --layer framework`
**When** generating `.ai/GUIDELINES.md`
**Then** the ROUTING section SHALL include SDK and Framework routes:
- All SDK routes
- packages/framework -> .ai/targets/FRAMEWORK.md
- Layout patterns -> .ai/targets/LAYOUT.md
- Theme patterns -> .ai/targets/THEMES.md

#### Scenario: React and App layer GUIDELINES routing

**Given** a project created with `hai3 create my-app`
**When** generating `.ai/GUIDELINES.md`
**Then** the ROUTING section SHALL include all routes (current behavior preserved)

### Requirement: Layer Parameter Propagation

The CLI build pipeline SHALL propagate the target layer through the template generation process.

#### Scenario: Build-time variant selection

**Given** the CLI build runs `copy-templates.ts`
**When** bundling package commands and targets
**Then** the system SHALL:
1. Accept a `layer` parameter (default: 'app')
2. Pass layer to `bundlePackageCommands()` function
3. Pass layer to target filtering functions
4. Apply appropriate selection logic before copying

#### Scenario: Project generation layer awareness

**Given** a project created with `hai3 create my-project --layer framework`
**When** generating project files via `generateProject()`
**Then** the layer SHALL be passed to all template bundling functions

### Requirement: Command Variant Content Guidelines

Layer variant commands SHALL provide layer-appropriate guidance that reflects available APIs and patterns.

#### Scenario: SDK layer command content

**Given** an SDK layer variant of a command
**When** providing implementation guidance
**Then** the command SHALL:
- Reference only SDK-layer packages (`@hai3/api`, `@hai3/state`, etc.)
- NOT reference Framework or React patterns
- Focus on direct registry usage and base class patterns

#### Scenario: Framework layer command content

**Given** a Framework layer variant of a command
**When** providing implementation guidance
**Then** the command SHALL:
- Include SDK-layer patterns
- Add action creation and event-driven patterns
- Reference plugin system and store integration
- NOT reference React hooks or components

#### Scenario: React layer command content

**Given** a React layer variant of a command
**When** providing implementation guidance
**Then** the command SHALL:
- Include Framework-layer patterns
- Add React hook usage (`useHAI3`, custom hooks)
- Include component integration patterns
- Reference screenset architecture

### Requirement: Layer Parameter Validation

The CLI SHALL validate the layer parameter and handle errors gracefully during project creation.

#### Scenario: Invalid layer parameter

**Given** a user runs `hai3 create my-project --layer invalid`
**When** the CLI parses the layer parameter
**Then** the system SHALL:
- Reject the command with a non-zero exit code
- Display error: `Error: Invalid layer 'invalid'. Valid options: sdk, framework, react`
- NOT create any project files

#### Scenario: Missing command variant file

**Given** a command variant is expected but the file is missing from templates
**When** bundling commands for a layer project
**Then** the system SHALL:
- Log warning: `Warning: Command variant 'hai3-x.framework.md' not found, skipping`
- Continue processing other commands
- NOT fail project creation

#### Scenario: Missing target file

**Given** a target is listed in TARGET_LAYERS but the file doesn't exist
**When** copying targets for a layer project
**Then** the system SHALL:
- Log warning: `Warning: Target 'EVENTS.md' not found in templates, skipping`
- Continue processing other targets
- NOT fail project creation

#### Scenario: Missing GUIDELINES.md variant

**Given** a layer-specific GUIDELINES variant is not found (e.g., `GUIDELINES.sdk.md`)
**When** generating `.ai/GUIDELINES.md` for that layer
**Then** the system SHALL:
- Fall back to base `GUIDELINES.md`
- Log warning: `Warning: GUIDELINES.sdk.md not found, using default GUIDELINES.md`

### Requirement: Layer Persistence for Updates

The CLI SHALL persist the project layer and use it for subsequent updates.

#### Scenario: Layer stored in hai3.config.json

**Given** a project created with `hai3 create my-project --layer framework`
**When** project generation completes
**Then** the `hai3.config.json` file SHALL contain:
```json
{
  "hai3": true,
  "layer": "framework"
}
```

#### Scenario: hai3 update uses stored layer

**Given** a project with `hai3.config.json` containing `"layer": "sdk"`
**When** the user runs `hai3 update`
**Then** the system SHALL:
- Read layer from `hai3.config.json`
- Resync commands and targets based on the SDK layer
- Preserve layer-appropriate filtering

#### Scenario: Missing hai3.config.json on update

**Given** a project without `hai3.config.json`
**When** the user runs `hai3 update`
**Then** the system SHALL:
- Assume layer is `app` (full content, backward compatible)
- Log info: `Info: No hai3.config.json found, assuming 'app' layer`
- Proceed with full command and target bundling

### Requirement: Layer-Aware Documentation

The `.ai/targets/` documentation SHALL describe layer variant conventions for command authors.

#### Scenario: AI_COMMANDS.md layer variant section

**Given** the `.ai/targets/AI_COMMANDS.md` file
**When** documenting command structure
**Then** the file SHALL include:
- LAYER VARIANTS section with naming convention (`.sdk.md`, `.framework.md`, `.react.md`)
- Fallback chain description (react -> framework -> sdk -> base)
- Guidance for when to create layer-specific variants

#### Scenario: AI.md layer keyword expansion

**Given** the `.ai/targets/AI.md` file
**When** documenting the LAYER keyword
**Then** the keyword description SHALL reference layer variants and the variant selection mechanism

### Requirement: Standalone Override Files

The CLI SHALL use override files from `packages/cli/template-sources/ai-overrides/` for target files that have different content for user projects vs monorepo development.

#### Scenario: Override mechanism for target files

**Given** source files in `.ai/targets/` with `<!-- @standalone:override -->` marker
**When** running copy-templates.ts
**Then** the system SHALL:
- Read the marker from source files
- For `@standalone:override` markers, copy from `packages/cli/template-sources/ai-overrides/` instead of the source file
- Apply override for: GUIDELINES.md, CLI.md, AI.md, AI_COMMANDS.md
- Exclude entirely via marker removal: FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md, STUDIO.md (no marker = not copied)

#### Scenario: Existing overrides preserved

**Given** the `packages/cli/template-sources/ai-overrides/` directory
**When** building templates
**Then** the following existing override files SHALL be preserved and used:
- `targets/API.md` (already user-focused)
- `targets/THEMES.md` (already user-focused)
- `GUIDELINES.sdk.md` (SDK layer variant)
- `GUIDELINES.framework.md` (Framework layer variant)

#### Scenario: Override content validation

**Given** any standalone override file
**When** validating against AI.md format rules
**Then** the file SHALL:
- Be under 100 lines
- Use ASCII only (no unicode)
- Use standard keywords (MUST, REQUIRED, FORBIDDEN, STOP, DETECT, BAD, GOOD)
- Focus on consumption patterns, not SDK development patterns

### Requirement: STUDIO.md Exclusion

The CLI SHALL NOT include STUDIO.md in user project templates.

#### Scenario: STUDIO.md marker removal

**Given** the source file `.ai/targets/STUDIO.md`
**When** the `<!-- @standalone -->` marker is removed
**Then** copy-templates.ts SHALL NOT copy STUDIO.md to templates
**And** STUDIO.md SHALL remain available in the monorepo `.ai/targets/` for SDK developers
**And** STUDIO.md SHALL NOT exist in `packages/cli/templates/.ai/targets/`

### Requirement: Three-Level Commands Hierarchy

The CLI SHALL support a three-level command hierarchy with company and project-level extensions.

#### Scenario: Command directory structure in user projects

**Given** a HAI3 project created by CLI
**When** examining the `.ai/` directory structure
**Then** the following command directories SHALL exist:
```
.ai/
├── commands/               # L1 - HAI3 commands (managed by ai:sync)
├── company/
│   └── commands/           # L2 - Company commands (preserved on update)
└── project/
    └── commands/           # L3 - Project commands (preserved on update)
```
**And** `.ai/company/commands/.gitkeep` SHALL exist as placeholder
**And** `.ai/project/commands/.gitkeep` SHALL exist as placeholder

#### Scenario: ai:sync discovers commands from all levels

**Given** a user project with commands in:
  - `.ai/commands/` (HAI3 commands from node_modules)
  - `.ai/company/commands/review/` (company command)
  - `.ai/project/commands/deploy/` (project command)
**When** running `npx hai3 ai:sync`
**Then** the command SHALL scan all three directories
**And** SHALL generate IDE adapters in:
  - `.claude/commands/` for Claude Code
  - `.cursor/commands/` for Cursor
  - `.windsurf/workflows/` for Windsurf
**And** all discovered commands SHALL be included in generated adapters

#### Scenario: Command precedence on conflict

**Given** a user project with:
  - `.ai/commands/validate/` (HAI3 command)
  - `.ai/company/commands/validate/` (company override)
  - `.ai/project/commands/validate/` (project override)
**When** running `npx hai3 ai:sync`
**Then** the project-level command SHALL take precedence
**And** the generated IDE adapter for `validate` SHALL point to `.ai/project/commands/validate/`
**And** the precedence order SHALL be: project > company > hai3

#### Scenario: Company and project commands preserved on update

**Given** a user project with:
  - Custom command in `.ai/company/commands/review/`
  - Custom command in `.ai/project/commands/deploy/`
**When** running `hai3 update`
**Then** all files in `.ai/company/` SHALL be preserved unchanged
**And** all files in `.ai/project/` SHALL be preserved unchanged
**And** HAI3 commands in `.ai/commands/` SHALL be updated from node_modules

### Requirement: AI_COMMANDS.md Override for Hierarchy Documentation

The AI_COMMANDS.md override SHALL document the three-level commands hierarchy for user projects.

#### Scenario: AI_COMMANDS.md contains hierarchy documentation

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/AI_COMMANDS.md`
**Then** the file SHALL contain:
  - COMMAND HIERARCHY section explaining 3 levels (HAI3, company, project)
  - CREATING COMMANDS section with instructions for company/project commands
  - COMMAND FORMAT section describing README.md structure
  - COMMAND DISCOVERY section explaining ai:sync
  - PRECEDENCE RULES section (project > company > hai3)
**And** the file SHALL NOT contain:
  - References to `.ai/commands/internal/` (monorepo-only)
  - References to `packages/*/commands/` (monorepo-only)
  - References to `copy-templates.ts` (monorepo-only)

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
