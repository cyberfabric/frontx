# Proposal: Clean AI Guidelines for User Projects

## Summary

Clean up the AI guidelines (`.ai/` directory) shipped to HAI3 user projects via the CLI. Currently, user projects receive SDK-development-focused content that is irrelevant or confusing when their goal is to **consume HAI3 packages** and **build applications**, not develop the HAI3 SDK itself.

## Background: Template Assembly System

The CLI uses a marker-based system for assembling `.ai/` content:

**Marker Types:**
- `<!-- @standalone -->` - File is copied verbatim to user projects
- `<!-- @standalone:override -->` - File is replaced with version from `packages/cli/template-sources/ai-overrides/`
- No marker - File is monorepo-only, not copied

**Override Location:**
- Override files are stored in `packages/cli/template-sources/ai-overrides/`
- The `copy-templates.ts` script replaces marked source files with their override counterparts

**Layer Filtering System:**
- `packages/cli/src/core/layers.ts` defines `TARGET_LAYERS` mapping for layer-aware filtering
- Layers: sdk, framework, react, app
- This proposal works alongside (not replaces) the layer system

## Problem

The HAI3 CLI ships AI guidelines to user projects, but several categories of issues make these guidelines inappropriate for their audience:

### Issue 1: Monorepo-Specific Routing in GUIDELINES.md

The existing `packages/cli/template-sources/ai-overrides/GUIDELINES.md` contains routing entries for `packages/` paths that do not exist in user projects:

**SDK Layer routing (packages that do not exist in user projects):**
- `packages/state -> .ai/targets/STORE.md`
- `packages/api -> .ai/targets/API.md`
- `packages/i18n -> .ai/targets/I18N.md`

**Framework Layer routing:**
- `packages/framework -> .ai/targets/FRAMEWORK.md`

**React Layer routing:**
- `packages/react -> .ai/targets/REACT.md`

**UI and Dev Packages routing:**
- `packages/uikit -> .ai/targets/UIKIT.md`
- `packages/studio -> .ai/targets/STUDIO.md`

User projects have only `src/` structure (screensets, themes, uikit customizations), not `packages/` structure.

### Issue 2: SDK-Development-Focused Target Files

Several target files describe **developing HAI3 packages**, not **using them**:

| Target File | Current Focus | Problem for Users |
|-------------|---------------|-------------------|
| CLI.md | CLI package development (presets, copy-templates.ts, template assembly) | Users run CLI commands, they do not develop the CLI package |
| FRAMEWORK.md | Developing @hai3/framework package with `packages/framework/` scope | Users consume the framework, they do not develop it |
| STORE.md | Developing @hai3/state package with `packages/state/` scope | Users use state patterns, they do not develop the state package |
| REACT.md | Developing @hai3/react package with `packages/react/` scope | Users use React hooks, they do not develop the react package |
| UIKIT.md | Developing @hai3/uikit package with `packages/uikit/**` scope | Users customize UI kit, they do not develop base components |
| STUDIO.md | Developing @hai3/studio package with `packages/studio/**` scope | Users do not develop Studio; it is dev-only tooling |
| I18N.md | Developing @hai3/i18n package with `packages/i18n/` scope | Users configure i18n, they do not develop the i18n package |

### Issue 3: AI Command Documentation Contains Monorepo-Specific Content

**AI.md target:**
- References `hai3dev-*` command namespace (monorepo-only commands)
- References `UPDATE_GUIDELINES.md` which is monorepo-only
- `internal/` and `user/` location references are outdated

**AI_COMMANDS.md target:**
- Note: `.ai/commands/` IS the correct canonical location in the monorepo
- However, the "ADDING A NEW COMMAND" and "MODIFYING EXISTING COMMANDS" sections reference monorepo development workflows
- References `copy-templates.ts` and IDE adapter generation (monorepo development)
- The issue is the SDK development content, not the command location itself

### Issue 4: STUDIO.md Should Not Ship to User Projects

STUDIO.md currently has `<!-- @standalone -->` marker, meaning it IS being shipped to user projects. However:
- Studio is SDK development tooling, not for application developers
- User projects do not have `packages/studio/` directory
- The SCOPE section references `packages/studio/**` which does not exist in user projects

### Issue 5: Confusing Mixed Audience

Users receive guidance that mixes:
- How to use HAI3 (what they need)
- How to develop HAI3 SDK packages (what they do not need)

This creates confusion and leads AI assistants to suggest inappropriate patterns (e.g., modifying core registries, creating new plugins, editing package internals).

## Existing Overrides Analysis

The following override files ALREADY EXIST in `packages/cli/template-sources/ai-overrides/`:

| File | Status | Action Needed |
|------|--------|---------------|
| `GUIDELINES.md` | EXISTS but contains `packages/` routing | MODIFY: Remove SDK/Framework/React/UI routing sections |
| `GUIDELINES.sdk.md` | EXISTS | No changes needed (SDK layer variant) |
| `GUIDELINES.framework.md` | EXISTS | No changes needed (Framework layer variant) |
| `targets/API.md` | EXISTS and user-focused | No changes needed (already standalone-appropriate) |
| `targets/THEMES.md` | EXISTS and user-focused | No changes needed (already standalone-appropriate) |

## Requirements

### Priority 1: Modify Existing GUIDELINES.md Override

The existing `packages/cli/template-sources/ai-overrides/GUIDELINES.md` needs MODIFICATION (not replacement):

- [P1-R1] REQUIRED: Remove SDK Layer (L1) section with `packages/state`, `packages/api`, `packages/i18n` routes
- [P1-R2] REQUIRED: Remove Framework Layer (L2) section with `packages/framework` route (keep Layout/Theme patterns)
- [P1-R3] REQUIRED: Remove React Layer (L3) section with `packages/react` route
- [P1-R4] REQUIRED: Remove UI and Dev Packages section with `packages/uikit`, `packages/studio` routes
- [P1-R5] REQUIRED: Keep Application Layer section (`src/screensets`, `src/themes`, styling)
- [P1-R6] REQUIRED: Keep Tooling section with CLI usage routes

### Priority 2: Create Missing User-Focused Target File Overrides

Create new override files in `packages/cli/template-sources/ai-overrides/targets/` for files that currently have no user-focused version:

- [P2-R1] REQUIRED: Create `targets/CLI.md` override (CLI usage, not CLI development)
- [P2-R2] REQUIRED: Create `targets/FRAMEWORK.md` override (plugin composition for apps, not plugin development)
- [P2-R3] REQUIRED: Create `targets/STORE.md` override (using state patterns in screensets, not developing @hai3/state)
- [P2-R4] REQUIRED: Create `targets/REACT.md` override (using hooks in components, not developing @hai3/react)
- [P2-R5] REQUIRED: Create `targets/UIKIT.md` override (customizing UI kit locally, not developing @hai3/uikit)
- [P2-R6] REQUIRED: Create `targets/I18N.md` override (configuring i18n in screensets, not developing @hai3/i18n)

### Priority 3: Exclude STUDIO.md from User Projects

STUDIO.md exclusion via source file marker removal (simplest approach):

- [P3-R1] REQUIRED: Remove `<!-- @standalone -->` marker from `.ai/targets/STUDIO.md` source file
- [P3-R2] REQUIRED: This automatically excludes STUDIO.md from user projects (no marker = not copied)
- [P3-R3] REQUIRED: STUDIO.md remains available in monorepo for SDK developers

Note: Layer filtering (`TARGET_LAYERS` in layers.ts) handles per-layer target inclusion. This proposal uses marker removal for complete exclusion from all standalone projects, which is simpler than adding layer-based exclusion logic.

### Priority 4: Create AI.md and AI_COMMANDS.md Overrides

- [P4-R1] REQUIRED: Create `targets/AI.md` override without `hai3dev-*` command references
- [P4-R2] REQUIRED: Create `targets/AI.md` override without `UPDATE_GUIDELINES.md` references
- [P4-R3] REQUIRED: Create `targets/AI_COMMANDS.md` override without "ADDING A NEW COMMAND" section
- [P4-R4] REQUIRED: Create `targets/AI_COMMANDS.md` override without "MODIFYING EXISTING COMMANDS" section
- [P4-R5] REQUIRED: Create `targets/AI_COMMANDS.md` override without `copy-templates.ts` references

### Priority 5: Source File Marker Updates

For each new override, the corresponding source file in `.ai/targets/` needs marker update:

- [P5-R1] REQUIRED: Change marker in source files from `<!-- @standalone -->` to `<!-- @standalone:override -->` for files getting new overrides
- [P5-R2] REQUIRED: Verify `copy-templates.ts` correctly processes the override mechanism

## Scenarios

### Scenario 1: New HAI3 Project Creation

**Given** a developer runs `hai3 create my-project`
**When** the CLI generates the `.ai/` directory
**Then** GUIDELINES.md routing contains only:
  - `src/screensets -> .ai/targets/SCREENSETS.md`
  - `src/themes -> .ai/targets/THEMES.md`
  - `Styling anywhere -> .ai/targets/STYLING.md`
  - `.ai documentation -> .ai/targets/AI.md`
  - `.ai/commands -> .ai/targets/AI_COMMANDS.md`
  - `CLI usage -> .ai/targets/CLI.md`
  - `Event patterns -> .ai/targets/EVENTS.md`
  - `Layout patterns -> .ai/targets/LAYOUT.md`
**And** GUIDELINES.md does NOT contain `packages/*` references
**And** STUDIO.md is NOT present in `.ai/targets/`

### Scenario 2: AI Assistant Guidance in User Project

**Given** a user project with cleaned AI guidelines
**When** an AI assistant reads `.ai/targets/CLI.md`
**Then** the assistant learns about:
  - Using `hai3` CLI commands (create, update, screenset)
  - Running validation commands
  - Understanding project structure
**And** the assistant does NOT see:
  - CLI package development (presets hierarchy, copy-templates.ts)
  - Template assembly logic
  - `packages/cli/` scope references

### Scenario 3: AI Assistant Helping with State Management

**Given** a user project with cleaned AI guidelines
**When** an AI assistant reads `.ai/targets/STORE.md`
**Then** the assistant learns about:
  - Using `registerSlice()` in screensets
  - Slice naming conventions with screenset ID
  - Module augmentation for type safety
  - Effects initialization
**And** the assistant does NOT see:
  - `packages/state/` scope references
  - SDK package development rules
  - Internal store implementation details

### Scenario 4: AI Assistant Helping with React Components

**Given** a user project with cleaned AI guidelines
**When** an AI assistant reads `.ai/targets/REACT.md`
**Then** the assistant learns about:
  - Using `HAI3Provider` wrapper
  - Available hooks (useHAI3, useAppDispatch, useAppSelector, useTranslation, etc.)
  - Screen translations with `useScreenTranslations()`
  - TextLoader usage
**And** the assistant does NOT see:
  - `packages/react/` scope references
  - L3 React layer development rules
  - Peer dependency management

### Scenario 5: Monorepo Development Unaffected

**Given** the HAI3 monorepo (not a user project)
**When** a developer works on SDK packages
**Then** the original SDK-focused target files remain available
**And** hai3dev-* commands are available
**And** STUDIO.md is available for Studio development
**And** `packages/*` routing is available

## Edge Cases

### Edge Case 1: User Needs to Understand SDK Architecture

**Scenario**: A user wants to understand how @hai3/framework works internally
**Expected**: User project guidelines focus on consumption patterns; for SDK internals, users should consult HAI3 documentation or source code
**Rationale**: Mixing SDK development guidance with consumption guidance leads to confusion and inappropriate code patterns

### Edge Case 2: User Creates Custom UI Kit Components

**Scenario**: A user creates custom components in `src/screensets/*/uikit/`
**Expected**: UIKIT.md override guides local customization patterns, not @hai3/uikit package development
**Rationale**: User-created components follow different rules than SDK base components

### Edge Case 3: User Runs hai3 update

**Scenario**: A user updates an existing project with `hai3 update --templates-only`
**Expected**: Updated guidelines replace old monorepo-focused content with user-focused content
**Rationale**: Existing projects should benefit from cleaner guidelines

## Acceptance Criteria

### AC1: No packages/* References in User Projects
- [AC1.1] VERIFY: `grep -rn "packages/" project/.ai/` returns 0 matches in a newly created project
- [AC1.2] VERIFY: GUIDELINES.md does not contain "SDK Layer", "Framework Layer", "React Layer", "UI and Dev Packages" sections

### AC2: User-Focused Target Files
- [AC2.1] VERIFY: CLI.md in user projects does NOT contain "packages/cli/" scope reference
- [AC2.2] VERIFY: FRAMEWORK.md in user projects does NOT contain "packages/framework/" scope reference
- [AC2.3] VERIFY: STORE.md in user projects does NOT contain "packages/state/" scope reference
- [AC2.4] VERIFY: REACT.md in user projects does NOT contain "packages/react/" scope reference
- [AC2.5] VERIFY: UIKIT.md in user projects does NOT contain "packages/uikit/" scope reference
- [AC2.6] VERIFY: I18N.md in user projects does NOT contain "packages/i18n/" scope reference
- [AC2.7] VERIFY: STUDIO.md does NOT exist in user projects `.ai/targets/`

### AC3: Cleaned AI.md and AI_COMMANDS.md
- [AC3.1] VERIFY: AI.md in user projects does NOT contain "hai3dev-" references
- [AC3.2] VERIFY: AI.md in user projects does NOT contain "UPDATE_GUIDELINES.md" references
- [AC3.3] VERIFY: AI_COMMANDS.md in user projects does NOT contain "ADDING A NEW COMMAND" section
- [AC3.4] VERIFY: AI_COMMANDS.md in user projects does NOT contain "MODIFYING EXISTING COMMANDS" section
- [AC3.5] VERIFY: AI_COMMANDS.md in user projects does NOT contain "copy-templates.ts" references

### AC4: Template Assembly Validation
- [AC4.1] VERIFY: `npm run build:packages` succeeds
- [AC4.2] VERIFY: `hai3 create test-project` creates project with cleaned guidelines
- [AC4.3] VERIFY: Created project passes `npm run lint` and `npm run type-check`

### AC5: Monorepo Development Unaffected
- [AC5.1] VERIFY: Original SDK-focused target files remain in monorepo `.ai/targets/`
- [AC5.2] VERIFY: hai3dev-* commands remain available in monorepo
- [AC5.3] VERIFY: STUDIO.md remains available in monorepo `.ai/targets/`

## Out of Scope

- Changes to actual CLI functionality (only changing documentation/guidelines)
- Changes to SDK package implementations
- Changes to SCREENSETS.md, STYLING.md, EVENTS.md, LAYOUT.md (already user-focused)
- Changes to MCP_TROUBLESHOOTING.md
- Adding new features to the CLI or templates
- Modifying `packages/cli/src/core/layers.ts` (layer filtering works alongside this proposal)
- Changes to `packages/cli/template-sources/ai-overrides/targets/API.md` (already user-focused, no `packages/` references)
- Changes to `packages/cli/template-sources/ai-overrides/targets/THEMES.md` (already user-focused, no `packages/` references)
- Changes to `packages/cli/template-sources/ai-overrides/GUIDELINES.sdk.md` (SDK layer variant, not for app users)
- Changes to `packages/cli/template-sources/ai-overrides/GUIDELINES.framework.md` (Framework layer variant, not for app users)
