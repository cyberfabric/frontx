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
- Support CommonJS environments (Node.js)

#### Scenario: Package structure

```
packages/cli/
├── package.json          # name: @hai3/cli, bin: { hai3: ./dist/index.cjs }
├── tsup.config.ts        # Bundle config (CJS output)
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
**Then** the output SHALL include both CLI binary and library exports

### Requirement: Template-Based Code Generation

The CLI SHALL use a template-based approach where real project files are copied at build time and transformed at runtime, ensuring templates never drift from framework patterns.

#### Scenario: Template configuration with standalone AI preset

```typescript
const config = {
  // Root-level files to copy
  rootFiles: [
    'index.html',
    'postcss.config.ts',
    'tailwind.config.ts',
    'tsconfig.node.json',
    'vite.config.ts',
    '.gitignore',
    'src/vite-env.d.ts',
    'src/main.tsx',
    'src/App.tsx',
    'src/screensets/screensetRegistry.tsx',
  ],

  // Directories to copy (REMOVED: .ai, .cursor, .windsurf - now in standaloneAiConfig)
  directories: [
    'src/themes',
    'src/uikit',
    'src/icons',
    'eslint-plugin-local',
    'presets/standalone',  // Includes configs/, scripts/
  ],

  // NEW: AI configuration from standalone preset
  standaloneAiConfig: [
    { src: 'presets/standalone/ai/.ai', dest: '.ai' },
    { src: 'presets/standalone/ai/.claude', dest: '.claude' },
    { src: 'presets/standalone/ai/.cursor', dest: '.cursor' },
    { src: 'presets/standalone/ai/.windsurf', dest: '.windsurf' },
    { src: 'presets/standalone/ai/.cline', dest: '.cline' },
    { src: 'presets/standalone/ai/.aider', dest: '.aider' },
    { src: 'presets/standalone/ai/openspec', dest: 'openspec' },
  ],

  screensets: ['demo'],
  screensetTemplate: '_blank',
};
```

**Given** the template configuration above
**When** copy-templates.ts runs during CLI build
**Then** all specified files including standalone AI configs SHALL be copied to packages/cli/templates/
**And** NO inline modifications SHALL be made to AI config content (pure file copy)

#### Scenario: AI configs copied from standalone preset

**Given** the standaloneAiConfig array
**When** copy-templates.ts processes the configuration
**Then** the system SHALL:
- Copy each source directory to its destination in templates/
- Preserve directory structure within each AI config folder
- NOT copy monorepo-only AI configurations

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

The CLI SHALL provide a `hai3 create <project-name>` command that scaffolds a new HAI3 project using template-based generation.

#### Scenario: Project creation with AI configs

**Given** a developer running `hai3 create my-app`
**When** the command executes
**Then** the system SHALL create:
- Directory `my-app/`
- All root config files from templates
- `hai3.config.json` with project configuration
- `package.json` with HAI3 dependencies
- `.ai/` folder with standalone-only AI guidelines
- `.claude/commands/` with hai3-prefixed command adapters
- `.cursor/rules/` and `.cursor/commands/` with adapters
- `.windsurf/rules/` and `.windsurf/commands/` with adapters (no workflows/)
- `.cline/` configuration folder
- `.aider/` configuration folder
- `openspec/` directory with project.md and AGENTS.md
- `src/themes/`, `src/uikit/`, `src/icons/` from templates
- `src/screensets/demo/` screenset from templates

### Requirement: Update Command

The CLI SHALL provide a `hai3 update` command that updates the CLI globally, and when inside a HAI3 project, also updates project dependencies and AI configuration files.

The command SHALL support channel selection:
- `--alpha` (`-a`): Force update to alpha/prerelease versions
- `--stable` (`-s`): Force update to stable versions
- `--ai-only`: Only sync AI configuration files (skip package updates)
- Default: Auto-detect channel based on currently installed version

#### Scenario: AI configuration sync

**Given** running `hai3 update` inside a HAI3 project
**When** the project has existing AI configuration folders
**Then** the system SHALL:
- Copy latest AI rules from CLI bundled templates to project `.ai/`
- Copy IDE adapter files to `.claude/`, `.cursor/`, `.windsurf/`, `.cline/`, `.aider/`
- Preserve `openspec/` directory (managed by `openspec update` separately)
- Report which AI config files were updated

#### Scenario: AI-only update

**Given** running `hai3 update --ai-only` inside a HAI3 project
**When** the flag is provided
**Then** the system SHALL:
- Skip CLI update
- Skip NPM package updates
- Only sync AI configuration files from bundled templates

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

All code generated by CLI commands SHALL pass HAI3 architectural validation without modification.

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

The CLI SHALL ship AI configuration files that contain only standalone-applicable rules, excluding framework-internal rules.

#### Scenario: Standalone GUIDELINES.md routing

**Given** a HAI3 project created by CLI
**When** examining `.ai/GUIDELINES.md`
**Then** the ROUTING section SHALL contain only:
```
- Data flow / events -> .ai/targets/EVENTS.md
- API services (screenset-owned) -> .ai/targets/SCREENSETS.md
- src/screensets -> .ai/targets/SCREENSETS.md
- src/themes -> .ai/targets/THEMES.md
- Styling anywhere -> .ai/targets/STYLING.md
```
**And** SHALL NOT contain:
```
- packages/uicore -> .ai/targets/UICORE.md
- packages/uikit -> .ai/targets/UIKIT.md
- packages/uikit-contracts -> .ai/targets/UIKIT_CONTRACTS.md
- packages/studio -> .ai/targets/STUDIO.md
- packages/cli -> .ai/targets/CLI.md
- .ai documentation -> .ai/targets/AI.md
```

#### Scenario: Commands-only structure (no workflows)

**Given** a HAI3 project created by CLI
**When** examining `.ai/` directory structure
**Then** the directory SHALL contain:
- `.ai/commands/` with canonical hai3-prefixed command files
- `.ai/targets/` with rule files
- NO `.ai/workflows/` directory
**And** each command file SHALL be self-contained with full procedural steps
**And** commands SHALL NOT reference external workflow files

#### Scenario: Standalone targets included

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/`
**Then** the directory SHALL contain:
- SCREENSETS.md (full copy)
- EVENTS.md (full copy)
- API.md (modified - no package scope)
- STYLING.md (full copy)
- THEMES.md (modified - app scope only)
**And** SHALL NOT contain:
- UICORE.md
- UIKIT.md
- UIKIT_CONTRACTS.md
- STUDIO.md
- CLI.md
- AI.md

#### Scenario: Standalone API.md modifications

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/API.md`
**Then** the file SHALL NOT contain:
- SCOPE section referencing packages/uicore/src/api/**
- STOP CONDITIONS about editing BaseApiService or apiRegistry.ts
**And** SHALL contain:
- Usage rules about apiRegistry.getService()
- Mock data rules with lodash requirement
- Reference to SCREENSETS.md for service creation

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

