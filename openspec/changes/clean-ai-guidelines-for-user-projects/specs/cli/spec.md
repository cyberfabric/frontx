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
- FRAMEWORK.md: Using plugin composition in apps, NOT plugin development for @hai3/framework
- STORE.md: Using state patterns in screensets, NOT developing @hai3/state package
- REACT.md: Using hooks in components, NOT developing @hai3/react package
- UIKIT.md: Local UI kit customization in screensets, NOT developing @hai3/uikit package
- I18N.md: Configuring i18n in screensets, NOT developing @hai3/i18n package
- API.md: Using API services in screensets, NOT developing @hai3/api package
- THEMES.md: Theme configuration in src/themes/, NOT developing theme infrastructure

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

#### Scenario: Cleaned AI_COMMANDS.md content

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/AI_COMMANDS.md`
**Then** the file SHALL NOT contain:
- "ADDING A NEW COMMAND" section (users do not add AI commands)
- "MODIFYING EXISTING COMMANDS" section (users do not modify AI commands)
- References to `copy-templates.ts` (monorepo build internals)
**And** SHALL contain user-relevant content only:
- Command categories (hai3-*, openspec:*)
- How to use OpenSpec workflow commands
- How to run hai3 validation commands

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
- Apply override for: GUIDELINES.md, CLI.md, FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md, AI.md, AI_COMMANDS.md
- Exclude STUDIO.md entirely from user projects (marker removed from source, so not copied)

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
