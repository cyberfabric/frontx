# Tasks: Refactor AI Commands

## Phase 1: Create Standalone AI Preset

### 1.1 Create Directory Structure
- [ ] Create `presets/standalone/ai/` directory
- [ ] Create `presets/standalone/ai/.ai/` directory
- [ ] Create `presets/standalone/ai/.ai/targets/` directory
- [ ] Create `presets/standalone/ai/.ai/commands/` directory (NO workflows/ - commands-only)

### 1.2 Create Standalone GUIDELINES.md
- [ ] Copy GUIDELINES.md to standalone
- [ ] Remove monorepo-only ROUTING entries:
  - `API base classes (uicore) -> .ai/targets/API.md`
  - `packages/uicore -> .ai/targets/UICORE.md`
  - `packages/uikit -> .ai/targets/UIKIT.md`
  - `packages/uikit-contracts -> .ai/targets/UIKIT_CONTRACTS.md`
  - `packages/studio -> .ai/targets/STUDIO.md`
  - `packages/cli -> .ai/targets/CLI.md`
  - `presets/* -> .ai/targets/CLI.md`
  - `.ai documentation -> .ai/targets/AI.md`
- [ ] Remove monorepo-only STOP CONDITIONS:
  - `Editing /core/runtime or /sdk`
  - `Changing contracts in @hai3/uikit-contracts`
- [ ] Verify file under 100 lines

### 1.3 Create Standalone Targets
- [ ] Copy SCREENSETS.md to standalone (no modifications needed)
- [ ] Copy EVENTS.md to standalone (no modifications needed)
- [ ] Create standalone API.md:
  - Remove SCOPE section (packages/uicore references)
  - Remove STOP CONDITIONS about BaseApiService
  - Keep usage rules and mock data rules
- [ ] Copy STYLING.md to standalone (no modifications needed)
- [ ] Create standalone THEMES.md:
  - Remove "packages and app code" -> "app code"
  - Keep all other rules
- [ ] Copy MCP_TROUBLESHOOTING.md to standalone

### 1.4 Create hai3-Prefixed Commands (Merge Workflows Into Commands)

Commands replace workflows - each command contains full procedural steps.

- [ ] Create hai3-validate.md (merge VALIDATE_CHANGES.md + validate.md content)
- [ ] Create hai3-fix-violation.md (merge FIX_RULE_VIOLATION.md + fix-violation.md)
- [ ] Create hai3-update-guidelines.md (from UPDATE_GUIDELINES.md)
- [ ] Create hai3-new-screenset.md (from new-screenset.md)
- [ ] Create hai3-new-screen.md (from new-screen.md)
- [ ] Create hai3-new-component.md (from new-component.md)
- [ ] Create hai3-new-action.md (from new-action.md)
- [ ] Create hai3-new-api-service.md (from new-api-service.md)
- [ ] Create hai3-quick-ref.md (from quick-ref.md)
- [ ] Create hai3-duplicate-screenset.md (from duplicate-screenset.md)
- [ ] Ensure each command is self-contained (no references to workflows/)

## Phase 2: Setup OpenSpec for Standalone

- [ ] Create `presets/standalone/ai/openspec/` directory
- [ ] Create standalone project.md template
- [ ] Copy AGENTS.md from openspec (unchanged)
- [ ] Keep openspec: prefix (NOT hai3:openspec:)

## Phase 3: Create IDE Adapters for Standalone

### 3.1 Claude Code Adapters
- [ ] Create `presets/standalone/ai/.claude/commands/` directory
- [ ] Create adapter for each hai3-*.md command
- [ ] Each adapter references canonical `.ai/` source

### 3.2 Cursor Adapters
- [ ] Create `presets/standalone/ai/.cursor/rules/global.mdc`
- [ ] Create `presets/standalone/ai/.cursor/commands/` directory

### 3.3 Windsurf Adapters
- [ ] Create `presets/standalone/ai/.windsurf/rules/global.md`
- [ ] Create `presets/standalone/ai/.windsurf/commands/` directory (no workflows/)

### 3.4 Cline Configuration
- [ ] Create `presets/standalone/ai/.cline/` directory
- [ ] Create settings.json pointing to `.ai/`

### 3.5 Aider Configuration
- [ ] Create `presets/standalone/ai/.aider/` directory
- [ ] Create .aider.conf.yml with read directive for `.ai/`

## Phase 4: Verify AI.md Compliance (CRITICAL)

### 4.1 File Length Verification
- [ ] Verify all standalone .ai files under 100 lines
- [ ] Create script to automate line count check

### 4.2 ASCII Compliance
- [ ] Verify ASCII only (no unicode, emojis, smart quotes)
- [ ] Create script to detect non-ASCII characters

### 4.3 Content Compliance
- [ ] Verify keyword usage: MUST, REQUIRED, FORBIDDEN, STOP, DETECT
- [ ] Verify one concern per file
- [ ] Verify no duplicated rules across files
- [ ] Verify section structure starts with AI WORKFLOW or CRITICAL RULES

### 4.4 Automated Verification Script
- [ ] Create `scripts/verify-ai-docs.ts` for compliance checking
- [ ] Add to npm scripts for CI integration

## Phase 5: Update CLI copy-templates.ts

### 5.1 Modify Template Configuration
- [ ] Remove `.ai`, `.cursor`, `.windsurf` from `directories` array
- [ ] Add `standaloneAiConfig` array with source/dest mappings
- [ ] Update copy logic to handle new AI config structure

### 5.2 Test Template Copying
- [ ] Run copy-templates.ts
- [ ] Verify all AI configs copied to templates/
- [ ] Verify manifest.json updated correctly

## Phase 6: Update CLI Update Command

### 6.1 Add AI Config Sync
- [ ] Add AI config sync to `hai3 update`
- [ ] Read AI configs from bundled templates
- [ ] Copy to project root (.ai/, .claude/, etc.)
- [ ] Preserve openspec/ (managed separately by `openspec update`)

### 6.2 Add --ai-only Flag
- [ ] Implement `--ai-only` flag for AI-config-only updates
- [ ] Skip CLI update when flag is set
- [ ] Skip NPM package updates when flag is set

### 6.3 Report Updates
- [ ] Report which AI config files were updated
- [ ] Add `aiConfigsUpdated` to UpdateCommandResult

## Phase 7: Update AI.md with Command Maintenance Rules

### 7.1 Add Command Architecture Rules to AI.md
- [ ] Add COMMAND LOCATION rules (canonical in .ai/commands/, adapters in IDE folders)
- [ ] Add NAMING CONVENTIONS (hai3-, hai3dev-, openspec: prefixes)
- [ ] Add COMMAND STRUCTURE rules (self-contained, no workflow references)
- [ ] Add STANDALONE VS MONOREPO classification guidance
- [ ] Add IDE ADAPTER PATTERN with example
- [ ] Add UPDATE MECHANISM documentation
- [ ] Add ADDING A NEW COMMAND checklist
- [ ] Add MODIFYING EXISTING COMMANDS guidance
- [ ] Verify AI.md stays under 100 lines (may need to split into AI_COMMANDS.md)

## Phase 8: Create Monorepo AI Preset

### 8.1 Create Directory Structure
- [ ] Create `presets/monorepo/ai/.ai/` directory
- [ ] Create `presets/monorepo/ai/.ai/targets/` directory
- [ ] Create `presets/monorepo/ai/.ai/commands/` directory

### 8.2 Create Monorepo-Only Targets
- [ ] Copy full GUIDELINES.md (with all routing)
- [ ] Copy UICORE.md
- [ ] Copy UIKIT.md
- [ ] Copy UIKIT_CONTRACTS.md
- [ ] Copy STUDIO.md
- [ ] Copy CLI.md
- [ ] Copy AI.md

### 8.3 Create hai3dev-Prefixed Commands
- [ ] Create hai3dev-publish.md
- [ ] Create hai3dev-test-packages.md
- [ ] Create hai3dev-release.md

## Phase 9: Migrate HAI3 Monorepo

### 9.1 Update Root AI Configuration
- [ ] Update root `.claude/commands/` to use new naming
- [ ] Update root `.cursor/` to use new structure
- [ ] Update root `.windsurf/` to use new structure
- [ ] Ensure root configs reference presets/monorepo/ai/

### 9.2 Rename Commands
- [ ] Rename existing commands with hai3: prefix
- [ ] Rename monorepo-only commands with hai3dev: prefix
- [ ] Keep openspec: prefix unchanged

### 9.3 Clean Up
- [ ] Remove duplicate content, keep only adapters
- [ ] Remove deprecated files
- [ ] Update CLAUDE.md with new command structure

## Phase 10: End-to-End Testing

### 10.1 Test Project Creation
- [ ] Run `hai3 create test-project`
- [ ] Verify .ai/ contains standalone-only rules
- [ ] Verify .claude/commands/ has hai3-prefixed commands
- [ ] Verify openspec/ is initialized
- [ ] Verify all IDE adapters present

### 10.2 Test Project Update
- [ ] Create project with old CLI
- [ ] Run `hai3 update` with new CLI
- [ ] Verify AI configs updated correctly
- [ ] Verify openspec/ preserved

### 10.3 Test Commands in Claude Code
- [ ] Test /hai3:new-screenset command
- [ ] Test /hai3:validate command
- [ ] Test /openspec:proposal command
- [ ] Test /hai3dev:publish command (monorepo only)

### 10.4 Test Other IDEs
- [ ] Test Cursor integration with new structure
- [ ] Test Windsurf integration with new structure
- [ ] Document any IDE-specific issues

### 10.5 Verify No Regression
- [ ] Run npm run type-check
- [ ] Run npm run lint
- [ ] Run npm run arch:check
- [ ] Run npm run dev and test manually
