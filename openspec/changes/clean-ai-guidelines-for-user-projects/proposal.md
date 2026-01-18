# Proposal: Clean AI Guidelines for User Projects

## Summary

Clean up the AI guidelines (`.ai/` directory) shipped to HAI3 user projects via the CLI. Currently, user projects receive SDK-development-focused content that is irrelevant or confusing when their goal is to **consume HAI3 packages** and **build applications**, not develop the HAI3 SDK itself.

Additionally, introduce a **three-level guidelines hierarchy** that allows companies and projects to extend the base HAI3 guidelines with their own rules, targets, and commands. This hierarchy uses a simple folder-based structure that is preserved during `hai3 update`.

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

### Issue 2: Unrouted Target Files Are Useless Context

The GUIDELINES.md ROUTING section for user projects routes to only 8 target files:

**Application Layer:**
- `src/screensets -> .ai/targets/SCREENSETS.md`
- `src/themes -> .ai/targets/THEMES.md`
- `Styling anywhere -> .ai/targets/STYLING.md`
- `Layout patterns -> .ai/targets/LAYOUT.md`
- `Event patterns -> .ai/targets/EVENTS.md`

**Tooling:**
- `.ai documentation -> .ai/targets/AI.md`
- `.ai/commands -> .ai/targets/AI_COMMANDS.md`
- `CLI usage -> .ai/targets/CLI.md`

The following target files have NO routing entries in user projects:
- FRAMEWORK.md - never referenced by AI workflow
- STORE.md - never referenced by AI workflow
- REACT.md - never referenced by AI workflow
- UIKIT.md - never referenced by AI workflow
- I18N.md - never referenced by AI workflow

**Key insight**: If a target file has no routing, it should not exist in user projects at all. Creating "user-focused versions" of unrouted files is still useless context that enlarges token count without providing value.

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

### Issue 6: Hardcoded @hai3/uikit References

GUIDELINES.md and other files contain hardcoded `@hai3/uikit` references. However, users can replace the HAI3 uikit with their own UI kit. These references should use "the configured UI kit" instead.

### Issue 7: No Extensibility for Company or Project-Specific Guidelines

Currently, user projects receive only HAI3 base guidelines with no mechanism to:
- Add company-wide coding standards, patterns, or rules
- Add project-specific guidelines that apply only to that project
- Preserve custom guidelines when running `hai3 update`

This forces users to either:
- Manually re-add their customizations after every update
- Never run `hai3 update` to preserve their changes
- Mix their custom guidelines into HAI3 files (which get overwritten)

### Issue 8: No Extensibility for Custom AI Commands

Similar to guidelines, there is no mechanism for users to:
- Add company-wide AI commands (e.g., company-specific code review, deployment commands)
- Add project-specific commands (e.g., project-specific testing, migration commands)
- Have these commands discovered and available alongside HAI3 commands
- Preserve custom commands when running `hai3 update`

### Issue 9: No Guidelines Update Workflow for User Projects

The `hai3dev-update-guidelines` command is monorepo-only. User projects have no equivalent command to:
- Update their company-level guidelines following a structured workflow
- Update their project-level guidelines with proper correction policy
- Get the same guided update experience available in the monorepo

## Existing Overrides Analysis

The following override files ALREADY EXIST in `packages/cli/template-sources/ai-overrides/`:

| File | Status | Action Needed |
|------|--------|---------------|
| `GUIDELINES.md` | EXISTS but contains `packages/` routing and hardcoded @hai3/uikit | MODIFY: Remove SDK routing, replace @hai3/uikit references |
| `GUIDELINES.sdk.md` | EXISTS | No changes needed (SDK layer variant) |
| `GUIDELINES.framework.md` | EXISTS | No changes needed (Framework layer variant) |
| `targets/API.md` | EXISTS and user-focused | No changes needed (referenced from SCREENSETS.md for API patterns) |
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
- [P1-R7] REQUIRED: Replace hardcoded `@hai3/uikit` references with "the configured UI kit"

### Priority 2: Exclude Unrouted Target Files from User Projects

Target files with no routing in GUIDELINES.md should be EXCLUDED entirely (not given user-focused overrides):

- [P2-R1] REQUIRED: Remove `<!-- @standalone -->` or `<!-- @standalone:override -->` marker from `.ai/targets/FRAMEWORK.md` (no routing = exclude)
- [P2-R2] REQUIRED: Remove marker from `.ai/targets/STORE.md` (no routing = exclude)
- [P2-R3] REQUIRED: Remove marker from `.ai/targets/REACT.md` (no routing = exclude)
- [P2-R4] REQUIRED: Remove marker from `.ai/targets/UIKIT.md` (no routing = exclude)
- [P2-R5] REQUIRED: Remove marker from `.ai/targets/I18N.md` (no routing = exclude)
- [P2-R6] REQUIRED: Delete any override files created for these targets in `packages/cli/template-sources/ai-overrides/targets/`

**Rationale**: If a target file has no routing entry, the AI workflow never references it. Shipping it (even a "user-focused" version) only adds context noise and token overhead.

### Priority 3: Exclude STUDIO.md from User Projects

STUDIO.md exclusion via source file marker removal (simplest approach):

- [P3-R1] REQUIRED: Remove `<!-- @standalone -->` marker from `.ai/targets/STUDIO.md` source file
- [P3-R2] REQUIRED: This automatically excludes STUDIO.md from user projects (no marker = not copied)
- [P3-R3] REQUIRED: STUDIO.md remains available in monorepo for SDK developers

Note: Layer filtering (`TARGET_LAYERS` in layers.ts) handles per-layer target inclusion. This proposal uses marker removal for complete exclusion from all standalone projects, which is simpler than adding layer-based exclusion logic.

### Priority 4: Create Overrides for ROUTED Target Files

Create overrides ONLY for target files that ARE routed in user project GUIDELINES.md:

- [P4-R1] REQUIRED: Create `targets/CLI.md` override (CLI usage, not CLI development) - routed via "CLI usage"
- [P4-R2] REQUIRED: Create `targets/AI.md` override without `hai3dev-*` and `UPDATE_GUIDELINES.md` references - routed via ".ai documentation"
- [P4-R3] REQUIRED: Create `targets/AI_COMMANDS.md` override without SDK development sections - routed via ".ai/commands"

Note: SCREENSETS.md, THEMES.md, STYLING.md, LAYOUT.md, EVENTS.md are already user-focused (no override needed).

### Priority 5: Source File Marker Updates for Routed Files

For each new override of a ROUTED file, the corresponding source file needs marker update:

- [P5-R1] REQUIRED: Change marker in `.ai/targets/CLI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
- [P5-R2] REQUIRED: Change marker in `.ai/targets/AI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
- [P5-R3] REQUIRED: Change marker in `.ai/targets/AI_COMMANDS.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
- [P5-R4] REQUIRED: Verify `copy-templates.ts` correctly processes the override mechanism

### Priority 6: Three-Level Guidelines Hierarchy

Implement a folder-based hierarchy for extending guidelines at company and project levels:

```
.ai/
├── GUIDELINES.md           # Level 1 - HAI3 (managed by CLI)
├── targets/                # Level 1 - HAI3 targets (managed)
├── commands/               # Level 1 - HAI3 commands (managed)
│
├── company/                # Level 2 - Company (preserved on update)
│   ├── GUIDELINES.md       # Company entry point
│   └── targets/            # Company-specific targets (optional)
│
└── project/                # Level 3 - Project (preserved on update)
    ├── GUIDELINES.md       # Project entry point
    └── targets/            # Project-specific targets (optional)
```

- [P6-R1] REQUIRED: Add routing entries to main GUIDELINES.md override pointing to company/ and project/ entry points:
  - `Company guidelines -> .ai/company/GUIDELINES.md`
  - `Project guidelines -> .ai/project/GUIDELINES.md`
- [P6-R2] REQUIRED: Create template placeholder files for `company/GUIDELINES.md` with basic structure and instructions
- [P6-R3] REQUIRED: Create template placeholder files for `project/GUIDELINES.md` with basic structure and instructions
- [P6-R4] REQUIRED: Modify `hai3 update` to preserve `.ai/company/` directory (skip during sync)
- [P6-R5] REQUIRED: Modify `hai3 update` to preserve `.ai/project/` directory (skip during sync)
- [P6-R6] REQUIRED: Create empty `company/targets/` directory placeholder (with .gitkeep)
- [P6-R7] REQUIRED: Create empty `project/targets/` directory placeholder (with .gitkeep)

**Implementation Notes:**
- No new config fields needed
- AI naturally follows routing when context is relevant
- Routing entries are conditional hints, not mandatory reads

### Priority 7: Update AI.md Target for Hierarchy Documentation

The `.ai/targets/AI.md` override must document the three-level hierarchy:

- [P7-R1] REQUIRED: Document the 3-level guidelines hierarchy structure in AI.md override
- [P7-R2] REQUIRED: Document how to add company-level guidelines (create files in `.ai/company/`)
- [P7-R3] REQUIRED: Document how to add project-level guidelines (create files in `.ai/project/`)
- [P7-R4] REQUIRED: Document the routing mechanism (how AI discovers and uses guidelines at each level)
- [P7-R5] REQUIRED: Document that company/ and project/ directories are preserved on `hai3 update`

### Priority 8: Three-Level Commands Hierarchy

Extend the existing HAI3 commands system to support company and project level commands.

**Background: Current HAI3 Commands System**

The HAI3 monorepo has a sophisticated commands system:
- **HAI3 user commands**: `.ai/commands/user/*.md` with `@standalone` marker - shipped to all projects
- **HAI3 internal commands**: `.ai/commands/internal/*.md` (no marker) - monorepo only
- **Package commands**: `packages/*/commands/*.md` - shipped based on installed packages
- **Layer variants**: `.sdk.md`, `.framework.md`, `.react.md` with fallback chain via `selectCommandVariant()`
- **Discovery**: `ai:sync` scans `node_modules/@hai3/*/commands/` and generates IDE adapters

**Extended Hierarchy for User Projects:**

```
.ai/
├── commands/               # L1 - HAI3 commands (managed, synced from node_modules)
│
├── company/
│   └── commands/           # L2 - Company commands (preserved on update)
│
└── project/
    └── commands/           # L3 - Project commands (preserved on update)
```

**Command Precedence**: project > company > hai3 (most specific wins)

- [P8-R1] REQUIRED: Create empty `company/commands/` directory placeholder (with .gitkeep)
- [P8-R2] REQUIRED: Create empty `project/commands/` directory placeholder (with .gitkeep)
- [P8-R3] REQUIRED: Modify `ai:sync` command discovery to scan `.ai/company/commands/`
- [P8-R4] REQUIRED: Modify `ai:sync` command discovery to scan `.ai/project/commands/`
- [P8-R5] REQUIRED: Implement command precedence: project > company > hai3 for name conflicts
- [P8-R6] REQUIRED: Modify IDE adapter generation to include company and project commands
- [P8-R7] REQUIRED: `hai3 update` preserves company/ and project/ directories (covered by P6-R4 and P6-R5)

**Implementation Notes:**
- `ai:sync` already scans `node_modules/@hai3/*/commands/` for package commands
- Extend scanning to include `.ai/company/commands/` and `.ai/project/commands/`
- Layer variant selection (`selectCommandVariant()`) applies to package commands only
- Company/project commands do not use layer variants (they are project-specific)
- Commands at all levels use the same format (README.md-based skill definitions)

### Priority 9: Guidelines Update Command for User Projects

Make the guidelines update workflow available to user projects:

- [P9-R1] REQUIRED: Create `hai3-update-guidelines` command (copy of `hai3dev-update-guidelines` adapted for user projects)
- [P9-R2] REQUIRED: The command targets `.ai/company/` and `.ai/project/` directories (not HAI3 base guidelines)
- [P9-R3] REQUIRED: The command follows the same correction policy workflow as the monorepo version
- [P9-R4] REQUIRED: Add `hai3-update-guidelines` to command discovery and IDE adapter sync
- [P9-R5] REQUIRED: Document the command in AI.md and AI_COMMANDS.md overrides

**Implementation Notes:**
- Users should not modify HAI3 base guidelines (those are managed by CLI)
- The command helps users maintain their company and project level guidelines
- Same workflow: identify violation, propose fix, apply fix

### Priority 10: Update AI_COMMANDS.md Override for Hierarchy Documentation

The AI_COMMANDS.md override must document the complete 3-level commands hierarchy for user projects.

- [P10-R1] REQUIRED: Document the 3-level command hierarchy structure:
  - Level 1: HAI3 commands in `.ai/commands/` (managed by `ai:sync`)
  - Level 2: Company commands in `.ai/company/commands/` (preserved on update)
  - Level 3: Project commands in `.ai/project/commands/` (preserved on update)
- [P10-R2] REQUIRED: Document how to create company commands in `.ai/company/commands/`
- [P10-R3] REQUIRED: Document how to create project commands in `.ai/project/commands/`
- [P10-R4] REQUIRED: Document command naming conventions for each level
- [P10-R5] REQUIRED: Document command precedence rules (project > company > hai3)
- [P10-R6] REQUIRED: Document the README.md-based command format
- [P10-R7] REQUIRED: Document that company/ and project/ commands are preserved on `hai3 update`
- [P10-R8] REQUIRED: Document that `ai:sync` discovers and generates IDE adapters for all levels

**AI_COMMANDS.md Override Content Requirements:**

The override file SHALL include:
1. **COMMAND HIERARCHY** section explaining the 3 levels
2. **CREATING COMMANDS** section with instructions for company and project commands
3. **COMMAND FORMAT** section describing the README.md structure
4. **COMMAND DISCOVERY** section explaining how `ai:sync` works
5. **PRECEDENCE RULES** section explaining conflict resolution

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
**And** GUIDELINES.md does NOT contain hardcoded `@hai3/uikit` references
**And** only 9 target files exist in `.ai/targets/`:
  - AI.md, AI_COMMANDS.md, CLI.md (Tooling)
  - SCREENSETS.md, THEMES.md, STYLING.md, LAYOUT.md, EVENTS.md (Application Layer)
  - API.md (referenced from SCREENSETS.md for API service patterns)
**And** the following files do NOT exist in `.ai/targets/`:
  - FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md (no routing)
  - STUDIO.md (SDK development only)

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

### Scenario 3: AI Assistant Cannot Find Unrouted Files

**Given** a user project with cleaned AI guidelines
**When** an AI assistant tries to find `.ai/targets/STORE.md` or `.ai/targets/REACT.md`
**Then** these files do NOT exist
**And** the assistant uses SCREENSETS.md for state and component patterns instead
**Because** state management and React hooks are documented in context of screenset development

### Scenario 4: Monorepo Development Unaffected

**Given** the HAI3 monorepo (not a user project)
**When** a developer works on SDK packages
**Then** the original SDK-focused target files remain available
**And** hai3dev-* commands are available
**And** STUDIO.md is available for Studio development
**And** `packages/*` routing is available

### Scenario 5: New Project with Three-Level Hierarchy

**Given** a developer runs `hai3 create my-project`
**When** the CLI generates the `.ai/` directory
**Then** the following hierarchy exists:
  - `.ai/GUIDELINES.md` (HAI3 base guidelines)
  - `.ai/targets/` (HAI3 targets)
  - `.ai/commands/` (HAI3 commands)
  - `.ai/company/GUIDELINES.md` (placeholder with instructions)
  - `.ai/company/targets/.gitkeep` (empty directory)
  - `.ai/company/commands/.gitkeep` (empty directory)
  - `.ai/project/GUIDELINES.md` (placeholder with instructions)
  - `.ai/project/targets/.gitkeep` (empty directory)
  - `.ai/project/commands/.gitkeep` (empty directory)
**And** GUIDELINES.md routing includes:
  - `Company guidelines -> .ai/company/GUIDELINES.md`
  - `Project guidelines -> .ai/project/GUIDELINES.md`

### Scenario 6: Company Guidelines Preserved on Update

**Given** a user project with customized `.ai/company/GUIDELINES.md`
**And** custom targets in `.ai/company/targets/CODE_STYLE.md`
**And** custom commands in `.ai/company/commands/review/`
**When** the developer runs `hai3 update`
**Then** all files in `.ai/company/` are preserved unchanged
**And** HAI3 base guidelines in `.ai/GUIDELINES.md` are updated
**And** HAI3 targets in `.ai/targets/` are updated
**And** HAI3 commands in `.ai/commands/` are updated

### Scenario 7: Project Guidelines Preserved on Update

**Given** a user project with customized `.ai/project/GUIDELINES.md`
**And** custom targets in `.ai/project/targets/MIGRATIONS.md`
**And** custom commands in `.ai/project/commands/deploy/`
**When** the developer runs `hai3 update`
**Then** all files in `.ai/project/` are preserved unchanged
**And** HAI3 base guidelines are updated

### Scenario 8: AI Follows Company Guidelines

**Given** a user project with `.ai/company/GUIDELINES.md` containing code review rules
**When** an AI assistant is asked to review code
**Then** the assistant reads `.ai/GUIDELINES.md` first
**And** follows routing to `.ai/company/GUIDELINES.md` when relevant
**And** applies company-specific rules during the review

### Scenario 9: Custom Commands Are Discovered by ai:sync

**Given** a user project with:
  - `.ai/commands/validate/` (HAI3 command from node_modules)
  - `.ai/company/commands/review/` (company command)
  - `.ai/project/commands/deploy/` (project command)
**When** the developer runs `npx hai3 ai:sync`
**Then** the command scans all three directories
**And** generates IDE adapters in `.claude/commands/`, `.cursor/commands/`, `.windsurf/workflows/`
**And** all three commands (validate, review, deploy) are available in IDE command palettes
**And** generated adapters respect precedence: project > company > hai3

### Scenario 10: Command Precedence on Conflict

**Given** a user project with:
  - `.ai/commands/validate/` (HAI3 command)
  - `.ai/project/commands/validate/` (project override)
**When** the developer runs `npx hai3 ai:sync`
**Then** the project-level validate command takes precedence
**And** the IDE adapter points to `.ai/project/commands/validate/`
**And** the HAI3 validate command is shadowed

### Scenario 11: AI_COMMANDS.md Documents Hierarchy

**Given** a HAI3 project created by CLI
**When** examining `.ai/targets/AI_COMMANDS.md`
**Then** the file SHALL contain:
  - COMMAND HIERARCHY section explaining 3 levels
  - CREATING COMMANDS section for company/project commands
  - COMMAND FORMAT section for README.md structure
  - COMMAND DISCOVERY section explaining ai:sync
  - PRECEDENCE RULES section for conflict resolution
**And** the file SHALL NOT contain monorepo-specific content:
  - References to `.ai/commands/internal/`
  - References to `packages/*/commands/`
  - References to `copy-templates.ts`

### Scenario 12: User Updates Company Guidelines

**Given** a user project with company guidelines containing a rule violation
**When** the developer runs `/hai3-update-guidelines`
**Then** the command guides through:
  - Identifying the violation
  - Proposing a fix
  - Applying the fix to `.ai/company/` or `.ai/project/` files
**And** HAI3 base guidelines remain unchanged

## Edge Cases

### Edge Case 1: User Needs to Understand SDK Architecture

**Scenario**: A user wants to understand how @hai3/framework works internally
**Expected**: User project guidelines focus on consumption patterns; for SDK internals, users should consult HAI3 documentation or source code
**Rationale**: Mixing SDK development guidance with consumption guidance leads to confusion and inappropriate code patterns

### Edge Case 2: User Creates Custom UI Kit Components

**Scenario**: A user creates custom components in `src/screensets/*/uikit/`
**Expected**: SCREENSETS.md and STYLING.md guide local component customization patterns
**Rationale**: UI kit customization is documented in the context of screenset development, not as separate UIKIT.md file

### Edge Case 3: User Runs hai3 update

**Scenario**: A user updates an existing project with `hai3 update --templates-only`
**Expected**: Updated guidelines replace old monorepo-focused content with user-focused content
**Rationale**: Existing projects should benefit from cleaner guidelines

### Edge Case 4: User Looks for State or React Documentation

**Scenario**: A user expects to find STORE.md or REACT.md for state/React patterns
**Expected**: These files do not exist; state management and React patterns are documented in SCREENSETS.md where they are actually used
**Rationale**: Standalone target files for STORE and REACT were SDK development guides; usage patterns belong in screenset context

### Edge Case 5: Command Name Conflict Between Levels

**Scenario**: User creates `.ai/project/commands/validate/` which conflicts with HAI3's `.ai/commands/validate/`
**Expected**: Project-level command takes precedence (most specific wins)
**Rationale**: Users should be able to override HAI3 commands with project-specific versions

### Edge Case 6: Empty Company/Project Directories

**Scenario**: User never adds any company or project guidelines
**Expected**: Empty placeholder files remain; AI sees routing but finds only placeholders; no errors
**Rationale**: The hierarchy is optional; users adopt it when they need it

### Edge Case 7: User Tries to Update HAI3 Base Guidelines

**Scenario**: User runs `/hai3-update-guidelines` and tries to modify `.ai/GUIDELINES.md`
**Expected**: Command only allows modifications to `.ai/company/` and `.ai/project/` directories
**Rationale**: HAI3 base guidelines are managed by CLI; users should not modify them

### Edge Case 8: IDE Adapter Generation with Custom Commands

**Scenario**: User has custom commands in company/ and project/ directories
**Expected**: IDE adapters (VS Code, JetBrains) include all commands from all three levels
**Rationale**: Custom commands should be as discoverable as HAI3 commands

## Acceptance Criteria

### AC1: No packages/* References in User Projects
- [AC1.1] VERIFY: `grep -rn "packages/" project/.ai/` returns 0 matches in a newly created project
- [AC1.2] VERIFY: GUIDELINES.md does not contain "SDK Layer", "Framework Layer", "React Layer", "UI and Dev Packages" sections

### AC2: No Hardcoded @hai3/uikit References
- [AC2.1] VERIFY: `grep -rn "@hai3/uikit" project/.ai/` returns 0 matches in a newly created project
- [AC2.2] VERIFY: GUIDELINES.md uses "the configured UI kit" instead of hardcoded package names

### AC3: Only Routed Target Files Exist
- [AC3.1] VERIFY: CLI.md exists in user projects and does NOT contain "packages/cli/" scope reference
- [AC3.2] VERIFY: FRAMEWORK.md does NOT exist in user projects `.ai/targets/`
- [AC3.3] VERIFY: STORE.md does NOT exist in user projects `.ai/targets/`
- [AC3.4] VERIFY: REACT.md does NOT exist in user projects `.ai/targets/`
- [AC3.5] VERIFY: UIKIT.md does NOT exist in user projects `.ai/targets/`
- [AC3.6] VERIFY: I18N.md does NOT exist in user projects `.ai/targets/`
- [AC3.7] VERIFY: STUDIO.md does NOT exist in user projects `.ai/targets/`
- [AC3.8] VERIFY: API.md exists in user projects (referenced from SCREENSETS.md)
- [AC3.9] VERIFY: Exactly 9 target files exist: AI.md, AI_COMMANDS.md, API.md, CLI.md, EVENTS.md, LAYOUT.md, SCREENSETS.md, STYLING.md, THEMES.md

### AC4: Cleaned AI.md and AI_COMMANDS.md (Phase 1-5 Scope)
- [AC4.1] VERIFY: AI.md in user projects does NOT contain "hai3dev-" references
- [AC4.2] VERIFY: AI.md in user projects does NOT contain "UPDATE_GUIDELINES.md" references
- [AC4.3] VERIFY: AI_COMMANDS.md in user projects does NOT contain ".ai/commands/internal/" references (monorepo-only)
- [AC4.4] VERIFY: AI_COMMANDS.md in user projects does NOT contain "packages/*/commands/" references (monorepo-only)
- [AC4.5] VERIFY: AI_COMMANDS.md in user projects does NOT contain "copy-templates.ts" references
- Note: CREATING COMMANDS section for company/project commands is validated in AC12.2 (Phase 9A scope)

### AC5: Template Assembly Validation
- [AC5.1] VERIFY: `npm run build:packages` succeeds
- [AC5.2] VERIFY: `hai3 create test-project` creates project with cleaned guidelines
- [AC5.3] VERIFY: Created project passes `npm run lint` and `npm run type-check`

### AC6: Monorepo Development Unaffected
- [AC6.1] VERIFY: Original SDK-focused target files remain in monorepo `.ai/targets/`
- [AC6.2] VERIFY: hai3dev-* commands remain available in monorepo
- [AC6.3] VERIFY: STUDIO.md remains available in monorepo `.ai/targets/`

### AC7: Three-Level Guidelines Hierarchy Structure
- [AC7.1] VERIFY: `.ai/company/GUIDELINES.md` exists in newly created projects with placeholder content
- [AC7.2] VERIFY: `.ai/company/targets/.gitkeep` exists in newly created projects
- [AC7.3] VERIFY: `.ai/project/GUIDELINES.md` exists in newly created projects with placeholder content
- [AC7.4] VERIFY: `.ai/project/targets/.gitkeep` exists in newly created projects
- [AC7.5] VERIFY: GUIDELINES.md contains routing to `Company guidelines -> .ai/company/GUIDELINES.md`
- [AC7.6] VERIFY: GUIDELINES.md contains routing to `Project guidelines -> .ai/project/GUIDELINES.md`

### AC8: Hierarchy Preserved on Update
- [AC8.1] VERIFY: Running `hai3 update` preserves all content in `.ai/company/`
- [AC8.2] VERIFY: Running `hai3 update` preserves all content in `.ai/project/`
- [AC8.3] VERIFY: Running `hai3 update` updates `.ai/GUIDELINES.md`, `.ai/targets/`, `.ai/commands/`

### AC9: Three-Level Commands Hierarchy
- [AC9.1] VERIFY: `.ai/company/commands/.gitkeep` exists in newly created projects
- [AC9.2] VERIFY: `.ai/project/commands/.gitkeep` exists in newly created projects
- [AC9.3] VERIFY: Command discovery finds commands in `.ai/commands/`, `.ai/company/commands/`, `.ai/project/commands/`
- [AC9.4] VERIFY: IDE adapters include commands from all three directories

### AC10: AI.md Documents Hierarchy
- [AC10.1] VERIFY: AI.md override contains documentation for three-level guidelines hierarchy
- [AC10.2] VERIFY: AI.md override explains how to add company-level guidelines
- [AC10.3] VERIFY: AI.md override explains how to add project-level guidelines
- [AC10.4] VERIFY: AI.md override documents that company/ and project/ are preserved on update

### AC11: Guidelines Update Command for User Projects
- [AC11.1] VERIFY: `hai3-update-guidelines` command exists in user project commands
- [AC11.2] VERIFY: Command targets `.ai/company/` and `.ai/project/` directories only
- [AC11.3] VERIFY: Command follows correction policy workflow
- [AC11.4] VERIFY: Command appears in IDE adapter generated files

### AC12: AI_COMMANDS.md Documents Commands Hierarchy
- [AC12.1] VERIFY: AI_COMMANDS.md override contains COMMAND HIERARCHY section
- [AC12.2] VERIFY: AI_COMMANDS.md override contains CREATING COMMANDS section
- [AC12.3] VERIFY: AI_COMMANDS.md override contains COMMAND FORMAT section
- [AC12.4] VERIFY: AI_COMMANDS.md override contains COMMAND DISCOVERY section explaining ai:sync
- [AC12.5] VERIFY: AI_COMMANDS.md override contains PRECEDENCE RULES section
- [AC12.6] VERIFY: AI_COMMANDS.md override does NOT contain references to `.ai/commands/internal/`
- [AC12.7] VERIFY: AI_COMMANDS.md override does NOT contain references to `packages/*/commands/`

### AC13: ai:sync Command Discovery Enhancement
- [AC13.1] VERIFY: `ai:sync` scans `.ai/company/commands/` directory
- [AC13.2] VERIFY: `ai:sync` scans `.ai/project/commands/` directory
- [AC13.3] VERIFY: `ai:sync` implements precedence: project > company > hai3
- [AC13.4] VERIFY: Generated IDE adapters in `.claude/commands/` include all discovered commands
- [AC13.5] VERIFY: Generated IDE adapters in `.cursor/commands/` include all discovered commands
- [AC13.6] VERIFY: Generated IDE adapters in `.windsurf/workflows/` include all discovered commands

## Out of Scope

- Changes to SDK package implementations
- Changes to SCREENSETS.md, STYLING.md, EVENTS.md, LAYOUT.md (already user-focused)
- Changes to MCP_TROUBLESHOOTING.md
- Modifying `packages/cli/src/core/layers.ts` (layer filtering works alongside this proposal)
- Changes to `packages/cli/template-sources/ai-overrides/targets/API.md` (already user-focused, referenced from SCREENSETS.md for API service patterns)
- Changes to `packages/cli/template-sources/ai-overrides/targets/THEMES.md` (already user-focused, no `packages/` references)
- Changes to `packages/cli/template-sources/ai-overrides/GUIDELINES.sdk.md` (SDK layer variant, not for app users)
- Changes to `packages/cli/template-sources/ai-overrides/GUIDELINES.framework.md` (Framework layer variant, not for app users)
- New configuration fields in hai3.config.ts
- NPM package support for guidelines or commands
- Complex scripts or automation (just folder structure and preservation rules)

## Notes

### Why API.md is Kept Despite No Direct Routing

API.md has no direct routing entry in GUIDELINES.md, but it IS referenced from SCREENSETS.md for API service patterns. It provides guidance on:
- Creating API services in `src/screensets/*/api/`
- Domain-based service architecture
- Error handling patterns

This makes API.md useful context when working on screensets, unlike FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md which have no references from any routed file.

### Three-Level Hierarchy Design Principles

The hierarchy follows these principles:

1. **Simplicity over configuration**: No new config fields; just folders that exist or do not
2. **Preservation over sync**: company/ and project/ directories are never touched by `hai3 update`
3. **Routing over scanning**: AI follows explicit routing entries, not directory scanning
4. **Override over merge**: At command level, project > company > hai3 (most specific wins)

### Why Separate company/ and project/ Directories

- **Company guidelines** are shared across multiple projects in an organization (coding standards, review rules, etc.)
- **Project guidelines** are specific to one project (domain conventions, migration guides, etc.)
- Keeping them separate allows:
  - Copying company/ directory to new projects
  - Different teams using same company/ but different project/ guidelines
  - Clear ownership: company/ is managed by platform team, project/ by project team

### Command Discovery Order

When discovering commands, the CLI walks directories in this order:
1. `.ai/commands/` (HAI3 base commands)
2. `.ai/company/commands/` (company commands)
3. `.ai/project/commands/` (project commands)

If the same command name exists at multiple levels, the most specific version (project > company > hai3) is used.
