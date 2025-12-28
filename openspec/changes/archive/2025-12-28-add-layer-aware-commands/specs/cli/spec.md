## ADDED Requirements

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
