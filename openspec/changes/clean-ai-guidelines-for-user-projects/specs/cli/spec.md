# cli Specification Delta

## Background: Template Assembly Mechanism

The CLI uses a marker-based system for assembling `.ai/` content for user projects:

**Marker Types:**
- `<!-- @standalone -->` - File is copied verbatim from `.ai/` to templates
- `<!-- @standalone:override -->` - File is replaced with version from `packages/cli/template-sources/ai-overrides/`
- No marker - File is monorepo-only, not copied to templates

**Override Processing:**
- Source files in `.ai/` have markers indicating their standalone behavior
- Override files exist in `packages/cli/template-sources/ai-overrides/`
- `copy-templates.ts` replaces files marked with `@standalone:override` with their override counterparts from `ai-overrides/`

**Layer Filtering System:**
- `packages/cli/src/core/layers.ts` defines `TARGET_LAYERS` mapping
- Layers: sdk, framework, react, app
- This proposal works alongside (not modifies) the layer filtering system

## MODIFIED Requirements

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
