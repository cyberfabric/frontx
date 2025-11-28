## MODIFIED Requirements

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

## ADDED Requirements

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
