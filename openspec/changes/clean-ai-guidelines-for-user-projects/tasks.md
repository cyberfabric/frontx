# Tasks: Clean AI Guidelines for User Projects

## Phase 1: Modify Existing Override Files (COMPLETE)

### 1.1 Modify GUIDELINES.md Override
- [x] **1.1.1** Modify `packages/cli/template-sources/ai-overrides/GUIDELINES.md`:
  - Remove SDK Layer (L1) section: lines with `packages/state`, `packages/api`, `packages/i18n`
  - Remove Framework Layer (L2) section header and `packages/framework` route (keep Layout/Theme patterns under Application section)
  - Remove React Layer (L3) section: lines with `packages/react`
  - Remove UI and Dev Packages section: lines with `packages/uikit`, `packages/studio`
  - Keep Application Layer section (`src/screensets`, `src/themes`, Styling anywhere)
  - Keep Tooling section (`.ai documentation`, `.ai/commands`, `CLI usage`)
  - Replace hardcoded `@hai3/uikit` references with "the configured UI kit"
  - Traces to: [P1-R1], [P1-R2], [P1-R3], [P1-R4], [P1-R5], [P1-R6], [P1-R7]

## Phase 2: Exclude Unrouted Target Files (COMPLETE)

### 2.1 Remove Markers from Unrouted Source Files
- [x] **2.1.1** Remove `<!-- @standalone -->` or `<!-- @standalone:override -->` marker from `.ai/targets/FRAMEWORK.md`
  - Traces to: [P2-R1], [AC3.2]
- [x] **2.1.2** Remove marker from `.ai/targets/STORE.md`
  - Traces to: [P2-R2], [AC3.3]
- [x] **2.1.3** Remove marker from `.ai/targets/REACT.md`
  - Traces to: [P2-R3], [AC3.4]
- [x] **2.1.4** Remove marker from `.ai/targets/UIKIT.md`
  - Traces to: [P2-R4], [AC3.5]
- [x] **2.1.5** Remove marker from `.ai/targets/I18N.md`
  - Traces to: [P2-R5], [AC3.6]

### 2.2 Delete Unused Override Files
- [x] **2.2.1** Delete `packages/cli/template-sources/ai-overrides/targets/FRAMEWORK.md` if exists
  - Traces to: [P2-R6]
- [x] **2.2.2** Delete `packages/cli/template-sources/ai-overrides/targets/STORE.md` if exists
  - Traces to: [P2-R6]
- [x] **2.2.3** Delete `packages/cli/template-sources/ai-overrides/targets/REACT.md` if exists
  - Traces to: [P2-R6]
- [x] **2.2.4** Delete `packages/cli/template-sources/ai-overrides/targets/UIKIT.md` if exists
  - Traces to: [P2-R6]
- [x] **2.2.5** Delete `packages/cli/template-sources/ai-overrides/targets/I18N.md` if exists
  - Traces to: [P2-R6]

## Phase 3: Exclude STUDIO.md from User Projects (COMPLETE)

### 3.1 STUDIO.md Exclusion
- [x] **3.1.1** Remove `<!-- @standalone -->` marker from `.ai/targets/STUDIO.md`
  - Traces to: [P3-R1], [P3-R2], [P3-R3], [AC3.7]

## Phase 4: Create Overrides for Routed Target Files (COMPLETE)

### 4.1 Create Target File Overrides
- [x] **4.1.1** Create `targets/CLI.md` override - CLI usage focus
  - Traces to: [P4-R1], Scenario 2, [AC3.1]

### 4.2 Create AI Documentation Overrides
- [x] **4.2.1** Create `targets/AI.md` override - User project focus
  - Traces to: [P4-R2], [AC4.1], [AC4.2]
- [x] **4.2.2** Create `targets/AI_COMMANDS.md` override - User commands focus
  - Traces to: [P4-R3], [AC4.3], [AC4.4], [AC4.5]

## Phase 5: Update Source File Markers for Routed Files (COMPLETE)

### 5.1 Change Markers to Override
- [x] **5.1.1** Update marker in `.ai/targets/CLI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]
- [x] **5.1.2** Update marker in `.ai/targets/AI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R2]
- [x] **5.1.3** Update marker in `.ai/targets/AI_COMMANDS.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R3]

## Phase 6: Three-Level Guidelines Hierarchy (COMPLETE)

### 6.1 Create Hierarchy Directory Structure
- [x] **6.1.1** Create `packages/cli/template-sources/ai-overrides/company/GUIDELINES.md` placeholder template
  - Content: Basic structure with instructions for adding company-level guidelines
  - Traces to: [P6-R2], [AC7.1], Scenario 5
- [x] **6.1.2** Create `packages/cli/template-sources/ai-overrides/company/targets/.gitkeep`
  - Traces to: [P6-R6], [AC7.2], Scenario 5
- [x] **6.1.3** Create `packages/cli/template-sources/ai-overrides/project/GUIDELINES.md` placeholder template
  - Content: Basic structure with instructions for adding project-level guidelines
  - Traces to: [P6-R3], [AC7.3], Scenario 5
- [x] **6.1.4** Create `packages/cli/template-sources/ai-overrides/project/targets/.gitkeep`
  - Traces to: [P6-R7], [AC7.4], Scenario 5

### 6.2 Update GUIDELINES.md Override with Hierarchy Routing
- [x] **6.2.1** Add routing entries to `packages/cli/template-sources/ai-overrides/GUIDELINES.md`:
  - `Company guidelines -> .ai/company/GUIDELINES.md`
  - `Project guidelines -> .ai/project/GUIDELINES.md`
  - Traces to: [P6-R1], [AC7.5], [AC7.6], Scenario 5

### 6.3 Modify hai3 update to Preserve Hierarchy Directories
- [x] **6.3.1** Modify `packages/cli/src/core/templates.ts` to skip `.ai/company/` directory during sync
  - Traces to: [P6-R4], [AC8.1], Scenario 6
- [x] **6.3.2** Modify `packages/cli/src/core/templates.ts` to skip `.ai/project/` directory during sync
  - Traces to: [P6-R5], [AC8.2], Scenario 7

## Phase 7: Update AI.md for Hierarchy Documentation (COMPLETE)

### 7.1 Update AI.md Override
- [x] **7.1.1** Update `packages/cli/template-sources/ai-overrides/targets/AI.md` to document:
  - Three-level guidelines hierarchy structure
  - How to add company-level guidelines (create files in `.ai/company/`)
  - How to add project-level guidelines (create files in `.ai/project/`)
  - The routing mechanism (how AI discovers guidelines)
  - That company/ and project/ are preserved on `hai3 update`
  - Traces to: [P7-R1], [P7-R2], [P7-R3], [P7-R4], [P7-R5], [AC10.1], [AC10.2], [AC10.3], [AC10.4]

## Phase 8: Three-Level Commands Hierarchy (COMPLETE)

### 8.1 Create Command Directory Structure
- [x] **8.1.1** Create `packages/cli/template-sources/ai-overrides/company/commands/.gitkeep`
  - Traces to: [P8-R1], [AC9.1], Scenario 5
- [x] **8.1.2** Create `packages/cli/template-sources/ai-overrides/project/commands/.gitkeep`
  - Traces to: [P8-R2], [AC9.2], Scenario 5

### 8.2 Modify ai:sync Command Discovery
- [x] **8.2.1** Modify `ai:sync` command to scan `.ai/company/commands/` directory
  - Location: `packages/cli/src/commands/ai/sync.ts`
  - Traces to: [P8-R3], [AC9.3], [AC13.1], Scenario 9
- [x] **8.2.2** Modify `ai:sync` command to scan `.ai/project/commands/` directory
  - Traces to: [P8-R4], [AC9.3], [AC13.2], Scenario 9
- [x] **8.2.3** Implement command precedence: project > company > hai3 for name conflicts
  - Traces to: [P8-R5], [AC13.3], Scenario 10, Edge Case 5

### 8.3 Modify IDE Adapter Generation
- [x] **8.3.1** Update IDE adapter generation to include company commands
  - Generates to: `.claude/commands/`, `.cursor/commands/`, `.windsurf/workflows/`
  - Traces to: [P8-R6], [AC9.4], [AC13.4], [AC13.5], [AC13.6], Edge Case 8
- [x] **8.3.2** Update IDE adapter generation to include project commands
  - Traces to: [P8-R6], [AC9.4], [AC13.4], [AC13.5], [AC13.6], Edge Case 8
- [x] **8.3.3** Ensure precedence is respected in generated adapters
  - Traces to: [P8-R5], [AC13.3], Scenario 10

## Phase 9: Guidelines Update Command for User Projects (COMPLETE)

### 9.1 Create hai3-update-guidelines Command
- [x] **9.1.1** Create `.ai/commands/user/hai3-update-guidelines.md` command file
  - Adapted from `hai3dev-update-guidelines` for user projects
  - Traces to: [P9-R1], [AC11.1]
- [x] **9.1.2** Command targets `.ai/company/` and `.ai/project/` directories only
  - Not HAI3 base guidelines (those are managed by CLI)
  - Traces to: [P9-R2], [AC11.2], Edge Case 7
- [x] **9.1.3** Command follows correction policy workflow
  - Same workflow: identify violation, propose fix, apply fix
  - Traces to: [P9-R3], [AC11.3], Scenario 10

### 9.2 Update Documentation
- [x] **9.2.1** Document `hai3-update-guidelines` command in AI.md override
  - Traces to: [P9-R5]
- [x] **9.2.2** Document `hai3-update-guidelines` command in AI_COMMANDS.md override
  - Traces to: [P9-R5]

## Phase 9A: Update AI_COMMANDS.md Override for Hierarchy Documentation (COMPLETE)

### 9A.1 Update AI_COMMANDS.md Override Content
- [x] **9A.1.1** Add COMMAND HIERARCHY section explaining 3-level structure:
  - Level 1: HAI3 commands in `.ai/commands/` (managed by `ai:sync`)
  - Level 2: Company commands in `.ai/company/commands/` (preserved on update)
  - Level 3: Project commands in `.ai/project/commands/` (preserved on update)
  - Traces to: [P10-R1], [AC12.1]
- [x] **9A.1.2** Add CREATING COMMANDS section with instructions:
  - How to create company commands in `.ai/company/commands/`
  - How to create project commands in `.ai/project/commands/`
  - Traces to: [P10-R2], [P10-R3], [AC12.2]
- [x] **9A.1.3** Add COMMAND FORMAT section describing README.md structure
  - Traces to: [P10-R6], [AC12.3]
- [x] **9A.1.4** Add COMMAND DISCOVERY section explaining `ai:sync`:
  - How `ai:sync` scans all three directories
  - IDE adapter generation for all levels
  - Traces to: [P10-R8], [AC12.4]
- [x] **9A.1.5** Add PRECEDENCE RULES section explaining conflict resolution:
  - project > company > hai3 (most specific wins)
  - Traces to: [P10-R5], [AC12.5]
- [x] **9A.1.6** Add COMMAND NAMING section with conventions for each level
  - Traces to: [P10-R4]
- [x] **9A.1.7** Document preservation on `hai3 update`
  - Traces to: [P10-R7]

### 9A.2 Remove Monorepo-Specific Content
- [x] **9A.2.1** Remove references to `.ai/commands/internal/` from AI_COMMANDS.md override
  - Traces to: [AC12.6]
- [x] **9A.2.2** Remove references to `packages/*/commands/` from AI_COMMANDS.md override
  - Traces to: [AC12.7]

## Phase 10: Validation - Previous Requirements (COMPLETE)

### 10A: Override File Validation
- [x] **10A.1** Verify all override files are under 100 lines (AI.md format rule)
- [x] **10A.2** Verify all override files use ASCII only (no unicode)
- [x] **10A.3** Verify override files follow keyword conventions (MUST, REQUIRED, FORBIDDEN, etc.)

### 10B: Template Build Validation
- [x] **10B.1** Run `npm run build:packages` - must succeed
  - Traces to: [AC5.1]
- [x] **10B.2** Verify templates/ contains expected structure after build
- [x] **10B.3** Verify templates/.ai/targets/ does NOT contain STUDIO.md
  - Traces to: [AC3.7]
- [x] **10B.4** Verify templates/.ai/targets/ does NOT contain FRAMEWORK.md, STORE.md, REACT.md, UIKIT.md, I18N.md
  - Traces to: [AC3.2], [AC3.3], [AC3.4], [AC3.5], [AC3.6]
- [x] **10B.5** Verify templates/.ai/targets/ contains exactly 9 files
  - Traces to: [AC3.9]

### 10C: Content Validation (grep checks)
- [x] **10C.1** `grep -rn "packages/" packages/cli/templates/.ai/` returns 0 matches
  - Traces to: [AC1.1]
- [x] **10C.2** `grep -rn "@hai3/uikit" packages/cli/templates/.ai/` returns 0 matches
  - Traces to: [AC2.1]
- [x] **10C.3** `grep -rn "packages/cli/" packages/cli/templates/.ai/targets/CLI.md` returns 0 matches
  - Traces to: [AC3.1]
- [x] **10C.4** `grep -rn "hai3dev-" packages/cli/templates/.ai/targets/AI.md` returns 0 matches
  - Traces to: [AC4.1]
- [x] **10C.5** `grep -rn "UPDATE_GUIDELINES.md" packages/cli/templates/.ai/targets/AI.md` returns 0 matches
  - Traces to: [AC4.2]
- [x] **10C.6** `grep -rn "commands/internal" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC4.3]
- [x] **10C.7** `grep -rn "packages/.*/commands" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC4.4]
- [x] **10C.8** `grep -rn "copy-templates.ts" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC4.5]

### 10D: New Project Validation
- [x] **10D.1** Run `hai3 create test-clean-guidelines`
  - Traces to: [AC5.2], Scenario 1
- [x] **10D.2** Verify GUIDELINES.md does not contain "SDK Layer", "Framework Layer", etc.
  - Traces to: [AC1.2]
- [x] **10D.3** Verify GUIDELINES.md does not contain `@hai3/uikit` references
  - Traces to: [AC2.2]
- [x] **10D.4** Verify .ai/targets/ contains exactly 9 files
  - Traces to: [AC3.9]
- [x] **10D.5** Verify excluded target files do NOT exist
  - Traces to: [AC3.2], [AC3.3], [AC3.4], [AC3.5], [AC3.6], [AC3.7]

### 10E: Monorepo Validation
- [x] **10E.1** Verify monorepo .ai/targets/ still contains all original SDK-focused files
  - Traces to: [AC6.1]
- [x] **10E.2** Verify hai3dev-* commands are available in monorepo
  - Traces to: [AC6.2]
- [x] **10E.3** Verify STUDIO.md exists in monorepo .ai/targets/
  - Traces to: [AC6.3]

## Phase 11: Validation - New Requirements (COMPLETE)

### 11A: Hierarchy Structure Validation
- [x] **11A.1** Verify `.ai/company/GUIDELINES.md` exists in newly created projects
  - Traces to: [AC7.1]
- [x] **11A.2** Verify `.ai/company/targets/.gitkeep` exists in newly created projects
  - Traces to: [AC7.2]
- [x] **11A.3** Verify `.ai/company/commands/.gitkeep` exists in newly created projects
  - Traces to: [AC9.1]
- [x] **11A.4** Verify `.ai/project/GUIDELINES.md` exists in newly created projects
  - Traces to: [AC7.3]
- [x] **11A.5** Verify `.ai/project/targets/.gitkeep` exists in newly created projects
  - Traces to: [AC7.4]
- [x] **11A.6** Verify `.ai/project/commands/.gitkeep` exists in newly created projects
  - Traces to: [AC9.2]

### 11B: Hierarchy Routing Validation
- [x] **11B.1** Verify GUIDELINES.md contains `Company guidelines -> .ai/company/GUIDELINES.md`
  - Traces to: [AC7.5]
- [x] **11B.2** Verify GUIDELINES.md contains `Project guidelines -> .ai/project/GUIDELINES.md`
  - Traces to: [AC7.6]

### 11C: Preservation Validation
- [x] **11C.1** Test: Create project, add content to `.ai/company/`, run `hai3 update`, verify content preserved
  - Traces to: [AC8.1], Scenario 6
- [x] **11C.2** Test: Create project, add content to `.ai/project/`, run `hai3 update`, verify content preserved
  - Traces to: [AC8.2], Scenario 7
- [x] **11C.3** Test: Verify `.ai/GUIDELINES.md` and `.ai/targets/` ARE updated by `hai3 update`
  - Traces to: [AC8.3]

### 11D: Command Discovery Validation (ai:sync)
- [x] **11D.1** Test: Create command in `.ai/company/commands/test-cmd/`, run `ai:sync`, verify it is discovered
  - Traces to: [AC9.3], [AC13.1], Scenario 9
- [x] **11D.2** Test: Create command in `.ai/project/commands/test-cmd/`, run `ai:sync`, verify it is discovered
  - Traces to: [AC9.3], [AC13.2], Scenario 9
- [x] **11D.3** Test: Create conflicting command names, run `ai:sync`, verify project > company > hai3 precedence
  - Traces to: [AC13.3], Scenario 10, Edge Case 5
- [x] **11D.4** Verify `.claude/commands/` adapters include commands from all three directories
  - Traces to: [AC9.4], [AC13.4], Edge Case 8
- [x] **11D.5** Verify `.cursor/commands/` adapters include commands from all three directories
  - Traces to: [AC9.4], [AC13.5], Edge Case 8
- [x] **11D.6** Verify `.windsurf/workflows/` adapters include commands from all three directories
  - Traces to: [AC9.4], [AC13.6], Edge Case 8

### 11E: AI.md Documentation Validation
- [x] **11E.1** Verify AI.md contains three-level hierarchy documentation
  - Traces to: [AC10.1]
- [x] **11E.2** Verify AI.md explains how to add company-level guidelines
  - Traces to: [AC10.2]
- [x] **11E.3** Verify AI.md explains how to add project-level guidelines
  - Traces to: [AC10.3]
- [x] **11E.4** Verify AI.md documents preservation on update
  - Traces to: [AC10.4]

### 11F: Update Guidelines Command Validation
- [x] **11F.1** Verify `hai3-update-guidelines` command exists in user projects
  - Traces to: [AC11.1]
- [x] **11F.2** Test: Command targets only `.ai/company/` and `.ai/project/` directories
  - Traces to: [AC11.2]
- [x] **11F.3** Test: Command follows correction policy workflow
  - Traces to: [AC11.3]
- [x] **11F.4** Verify command appears in IDE adapter files
  - Traces to: [AC11.4]

### 11G: AI_COMMANDS.md Documentation Validation
- [x] **11G.1** Verify AI_COMMANDS.md contains COMMAND HIERARCHY section
  - Traces to: [AC12.1]
- [x] **11G.2** Verify AI_COMMANDS.md contains CREATING COMMANDS section
  - Traces to: [AC12.2]
- [x] **11G.3** Verify AI_COMMANDS.md contains COMMAND FORMAT section
  - Traces to: [AC12.3]
- [x] **11G.4** Verify AI_COMMANDS.md contains COMMAND DISCOVERY section explaining ai:sync
  - Traces to: [AC12.4]
- [x] **11G.5** Verify AI_COMMANDS.md contains PRECEDENCE RULES section
  - Traces to: [AC12.5]
- [x] **11G.6** Verify AI_COMMANDS.md does NOT contain `.ai/commands/internal/` references
  - Traces to: [AC12.6]
- [x] **11G.7** Verify AI_COMMANDS.md does NOT contain `packages/*/commands/` references
  - Traces to: [AC12.7]

## Dependencies

**Phase 1-5 Dependencies (existing, all complete):**
- Phase 1 must complete before Phase 10 (GUIDELINES.md override must be modified before validation)
- Phase 2 must complete before Phase 10B/10C (markers must be removed before build validation)
- Phase 3 must complete before Phase 10B/10C (STUDIO.md marker must be removed before build validation)
- Phase 4 must complete before Phase 5 (overrides must exist before changing markers)
- Phase 5 must complete before Phase 10B/10C (markers must be updated before build validation)

**Phase 6-11 Dependencies (new):**
- Phase 6.1 must complete before Phase 6.2 (directories must exist before routing)
- Phase 6.1 must complete before Phase 8.1 (company/project dirs must exist before commands dirs)
- Phase 6.2 must complete before Phase 11B (routing must exist before validation)
- Phase 6.3 must complete before Phase 11C (preservation logic must exist before testing)
- Phase 7 must complete before Phase 11E (AI.md must be updated before validation)
- Phase 8.2 must complete before Phase 11D (ai:sync discovery must work before validation)
- Phase 8.3 must complete before Phase 11D.4-11D.6 (IDE adapter sync must work before validation)
- Phase 9.1 must complete before Phase 9.2 (command must exist before documentation)
- Phase 9 must complete before Phase 11F (command must exist before validation)
- Phase 9A must complete before Phase 11G (AI_COMMANDS.md must be updated before validation)

## Summary

**Total Tasks: 91**
- **Completed: 91** - All phases complete

**Phase 1-5: Original Cleanup (39 tasks)** ✅
- Remove SDK-focused content from user projects
- Create overrides for user-focused target files
- Update markers for standalone distribution

**Phase 6: Three-Level Guidelines Hierarchy (7 tasks)** ✅
- 6.1.1-6.1.4: Create directory structure (4 tasks)
- 6.2.1: Update GUIDELINES.md routing (1 task)
- 6.3.1-6.3.2: Modify hai3 update preservation (2 tasks)

**Phase 7: Update AI.md for Hierarchy Documentation (1 task)** ✅
- 7.1.1: Update AI.md override

**Phase 8: Three-Level Commands Hierarchy (8 tasks)** ✅
- 8.1.1-8.1.2: Create command directories (2 tasks)
- 8.2.1-8.2.3: Modify ai:sync command discovery (3 tasks)
- 8.3.1-8.3.3: Modify IDE adapter generation (3 tasks)

**Phase 9: Guidelines Update Command (5 tasks)** ✅
- 9.1.1-9.1.3: Create hai3-update-guidelines command (3 tasks)
- 9.2.1-9.2.2: Update documentation (2 tasks)

**Phase 9A: Update AI_COMMANDS.md Override (9 tasks)** ✅
- 9A.1.1-9A.1.7: Add hierarchy documentation sections (7 tasks)
- 9A.2.1-9A.2.2: Remove monorepo-specific content (2 tasks)

**Phase 10: Validation - Previous Requirements (18 tasks)** ✅
- Override file validation, template build, content validation, new project validation, monorepo validation

**Phase 11: Validation - New Requirements (31 tasks)** ✅
- 11A: Hierarchy structure validation (6 tasks)
- 11B: Hierarchy routing validation (2 tasks)
- 11C: Preservation validation (3 tasks)
- 11D: Command discovery validation via ai:sync (6 tasks)
- 11E: AI.md documentation validation (4 tasks)
- 11F: Update guidelines command validation (4 tasks)
- 11G: AI_COMMANDS.md documentation validation (7 tasks)

## Key Design Decisions

1. **Folder-based hierarchy**: No config, no NPM packages - just directories
2. **Preservation over sync**: company/ and project/ are never modified by `hai3 update`
3. **Command precedence**: project > company > hai3 (most specific wins)
4. **ai:sync-based discovery**: `ai:sync` scans all command directories and generates IDE adapters
5. **Same command format**: company/project commands use same README.md-based format as HAI3 commands
6. **IDE adapter generation**: `.claude/commands/`, `.cursor/commands/`, `.windsurf/workflows/`
