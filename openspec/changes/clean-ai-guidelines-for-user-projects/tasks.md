# Tasks: Clean AI Guidelines for User Projects

## Phase 1: Modify Existing Override Files

### 1.1 Modify GUIDELINES.md Override
- [ ] **1.1.1** Modify `packages/cli/template-sources/ai-overrides/GUIDELINES.md`:
  - Remove SDK Layer (L1) section: lines with `packages/state`, `packages/api`, `packages/i18n`
  - Remove Framework Layer (L2) section header and `packages/framework` route (keep Layout/Theme patterns under Application section)
  - Remove React Layer (L3) section: lines with `packages/react`
  - Remove UI and Dev Packages section: lines with `packages/uikit`, `packages/studio`
  - Keep Application Layer section (`src/screensets`, `src/themes`, Styling anywhere)
  - Keep Tooling section (`.ai documentation`, `.ai/commands`, `CLI usage`)
  - Traces to: [P1-R1], [P1-R2], [P1-R3], [P1-R4], [P1-R5], [P1-R6]

## Phase 2: Create New Target File Overrides

All new overrides are created in `packages/cli/template-sources/ai-overrides/targets/`.

### 2.1 Create Target File Overrides
- [ ] **2.1.1** Create `targets/CLI.md` override - CLI usage focus
  - Document hai3 CLI commands (create, update, screenset)
  - Document validation commands
  - Remove CLI package development content (presets, copy-templates.ts)
  - SCOPE must reference user project structure, NOT `packages/cli/`
  - Traces to: [P2-R1], Scenario 2

- [ ] **2.1.2** Create `targets/FRAMEWORK.md` override - Plugin composition focus
  - Document using createHAI3() and plugin composition
  - Document available plugins and presets
  - Remove plugin development content
  - SCOPE must reference `src/` paths only, NOT `packages/framework/`
  - Traces to: [P2-R2]

- [ ] **2.1.3** Create `targets/STORE.md` override - State usage focus
  - Document registerSlice() usage in screensets
  - Document slice naming conventions with screenset ID
  - Document module augmentation patterns
  - Remove @hai3/state package development content
  - SCOPE must reference `src/screensets/*/state/`, NOT `packages/state/`
  - Traces to: [P2-R3], Scenario 3

- [ ] **2.1.4** Create `targets/REACT.md` override - Hooks usage focus
  - Document HAI3Provider usage
  - Document available hooks and their usage
  - Document screen translations pattern
  - Remove @hai3/react package development content
  - SCOPE must reference `src/` paths, NOT `packages/react/`
  - Traces to: [P2-R4], Scenario 4

- [ ] **2.1.5** Create `targets/UIKIT.md` override - Local customization focus
  - Document screenset-local UI kit customization in `src/screensets/*/uikit/`
  - Document base vs composite component placement
  - Document theme token usage
  - Remove @hai3/uikit package development content
  - SCOPE must reference `src/screensets/*/uikit/`, NOT `packages/uikit/`
  - Traces to: [P2-R5], Edge Case 2

- [ ] **2.1.6** Create `targets/I18N.md` override - i18n configuration focus
  - Document translation namespace conventions
  - Document lazy loading patterns with registerLoader
  - Document RTL support usage
  - Remove @hai3/i18n package development content
  - SCOPE must reference `src/` paths, NOT `packages/i18n/`
  - Traces to: [P2-R6]

### 2.2 Create AI Documentation Overrides
- [ ] **2.2.1** Create `targets/AI.md` override - User project focus
  - Remove hai3dev-* command namespace references
  - Remove UPDATE_GUIDELINES.md references
  - Remove outdated internal/user location references
  - Keep user-relevant documentation rules
  - Traces to: [P4-R1], [P4-R2]

- [ ] **2.2.2** Create `targets/AI_COMMANDS.md` override - User commands focus
  - Remove "ADDING A NEW COMMAND" section
  - Remove "MODIFYING EXISTING COMMANDS" section
  - Remove copy-templates.ts references
  - Keep command usage documentation
  - Traces to: [P4-R3], [P4-R4], [P4-R5]

## Phase 3: Update Source File Markers

### 3.1 STUDIO.md Exclusion
- [ ] **3.1.1** Remove `<!-- @standalone -->` marker from `.ai/targets/STUDIO.md`
  - This excludes STUDIO.md from all user projects (no marker = not copied)
  - STUDIO.md remains available in monorepo for SDK developers
  - Traces to: [P3-R1], [P3-R2], [P3-R3], [AC2.7]

### 3.2 Change Markers to Override
- [ ] **3.2.1** Update marker in `.ai/targets/CLI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.2** Update marker in `.ai/targets/FRAMEWORK.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.3** Update marker in `.ai/targets/STORE.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.4** Update marker in `.ai/targets/REACT.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.5** Update marker in `.ai/targets/UIKIT.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.6** Update marker in `.ai/targets/I18N.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.7** Update marker in `.ai/targets/AI.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

- [ ] **3.2.8** Update marker in `.ai/targets/AI_COMMANDS.md` from `<!-- @standalone -->` to `<!-- @standalone:override -->`
  - Traces to: [P5-R1]

## Phase 4: Validation

### 4A: Override File Validation
- [ ] **4A.1** Verify all override files are under 100 lines (AI.md format rule)
- [ ] **4A.2** Verify all override files use ASCII only (no unicode)
- [ ] **4A.3** Verify override files follow keyword conventions (MUST, REQUIRED, FORBIDDEN, etc.)

### 4B: Template Build Validation
- [ ] **4B.1** Run `npm run build:packages` - must succeed
  - Traces to: [AC4.1]
- [ ] **4B.2** Verify templates/ contains expected structure after build
- [ ] **4B.3** Verify templates/.ai/targets/ does NOT contain STUDIO.md
  - Traces to: [AC2.7]

### 4C: Content Validation (grep checks)
- [ ] **4C.1** `grep -rn "packages/" packages/cli/templates/.ai/` returns 0 matches
  - Traces to: [AC1.1]
- [ ] **4C.2** `grep -rn "packages/cli/" packages/cli/templates/.ai/targets/CLI.md` returns 0 matches
  - Traces to: [AC2.1]
- [ ] **4C.3** `grep -rn "packages/framework/" packages/cli/templates/.ai/targets/FRAMEWORK.md` returns 0 matches
  - Traces to: [AC2.2]
- [ ] **4C.4** `grep -rn "packages/state/" packages/cli/templates/.ai/targets/STORE.md` returns 0 matches
  - Traces to: [AC2.3]
- [ ] **4C.5** `grep -rn "packages/react/" packages/cli/templates/.ai/targets/REACT.md` returns 0 matches
  - Traces to: [AC2.4]
- [ ] **4C.6** `grep -rn "packages/uikit/" packages/cli/templates/.ai/targets/UIKIT.md` returns 0 matches
  - Traces to: [AC2.5]
- [ ] **4C.7** `grep -rn "packages/i18n/" packages/cli/templates/.ai/targets/I18N.md` returns 0 matches
  - Traces to: [AC2.6]
- [ ] **4C.8** `grep -rn "hai3dev-" packages/cli/templates/.ai/targets/AI.md` returns 0 matches
  - Traces to: [AC3.1]
- [ ] **4C.9** `grep -rn "UPDATE_GUIDELINES.md" packages/cli/templates/.ai/targets/AI.md` returns 0 matches
  - Traces to: [AC3.2]
- [ ] **4C.10** `grep -rn "ADDING A NEW COMMAND" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC3.3]
- [ ] **4C.11** `grep -rn "MODIFYING EXISTING COMMANDS" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC3.4]
- [ ] **4C.12** `grep -rn "copy-templates.ts" packages/cli/templates/.ai/targets/AI_COMMANDS.md` returns 0 matches
  - Traces to: [AC3.5]

### 4D: New Project Validation
- [ ] **4D.1** Run `hai3 create test-clean-guidelines`
  - Traces to: [AC4.2], Scenario 1
- [ ] **4D.2** `cd test-clean-guidelines && npm install`
- [ ] **4D.3** `npm run lint` passes
  - Traces to: [AC4.3]
- [ ] **4D.4** `npm run type-check` passes
  - Traces to: [AC4.3]
- [ ] **4D.5** Verify GUIDELINES.md does not contain "SDK Layer", "Framework Layer", "React Layer", "UI and Dev Packages" sections
  - Traces to: [AC1.2]
- [ ] **4D.6** Verify .ai/targets/STUDIO.md does NOT exist
  - Traces to: [AC2.7]
- [ ] **4D.7** Clean up test project: `rm -rf test-clean-guidelines`

### 4E: Monorepo Validation (no regression)
- [ ] **4E.1** Verify monorepo .ai/targets/ still contains all original SDK-focused files
  - Traces to: [AC5.1]
- [ ] **4E.2** Verify hai3dev-* commands are available in monorepo
  - Traces to: [AC5.2]
- [ ] **4E.3** Verify STUDIO.md exists in monorepo .ai/targets/
  - Traces to: [AC5.3]
- [ ] **4E.4** `npm run lint` passes in monorepo
- [ ] **4E.5** `npm run type-check` passes in monorepo
- [ ] **4E.6** `npm run arch:check` passes in monorepo

## Dependencies

- Phase 1 must complete before Phase 4 (GUIDELINES.md override must be modified before validation)
- Phase 2 must complete before Phase 3.2 (overrides must exist before changing markers)
- Phase 3 must complete before Phase 4B/4C (markers must be updated before build validation)
- Phase 4A can run in parallel with Phase 2 (validating override file format)

## Parallelizable

- All Phase 2.1 tasks (target file overrides) can run in parallel
- All Phase 3.2 tasks (marker updates) can run in parallel
- Phase 4C tasks (grep checks) can run in parallel
- Phase 4E tasks (monorepo validation) can run in parallel with Phase 4D (new project validation)

## Summary

**Total Tasks: 40**

**Phase 1: Modify Existing Override Files (1 task)**
- 1.1.1: Modify GUIDELINES.md override

**Phase 2: Create New Target File Overrides (8 tasks)**
- 2.1.1-2.1.6: Target file overrides (CLI, FRAMEWORK, STORE, REACT, UIKIT, I18N)
- 2.2.1-2.2.2: AI documentation overrides (AI.md, AI_COMMANDS.md)

**Phase 3: Update Source File Markers (9 tasks)**
- 3.1.1: STUDIO.md marker removal
- 3.2.1-3.2.8: Change markers to override for 8 target files

**Phase 4: Validation (22 tasks)**
- 4A: Override file validation (3 tasks)
- 4B: Template build validation (3 tasks)
- 4C: Content validation with grep (12 tasks)
- 4D: New project validation (7 tasks)
- 4E: Monorepo validation (6 tasks)
