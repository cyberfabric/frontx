# Tasks: CLI OpenSpec Skills Template Assembly

This task list documents the implementation of OpenSpec 1.1.1 skills copying in the HAI3 CLI package build pipeline.

**Status: COMPLETE** - All tasks implemented and verified.

## Task Dependencies

```
Phase 1 (COMPLETE): Claude/Cursor/Windsurf Skills
  1.1.1 -> 1.1.2 -> 1.1.3/1.1.4/1.1.5 (parallel) -> 1.2.1 -> 1.2.2/1.2.3/1.2.4 (parallel)

Phase 2 (COMPLETE): GitHub Copilot Commands
  1.3.1-1.3.10 (parallel) -> 1.1.6 -> 1.1.7 -> 1.2.5
```

## 1. Implementation

### 1.1 Create copyOpenSpecSkills Function

- [x] 1.1.1 Add function signature at line 233 in `packages/cli/scripts/copy-templates.ts`
  - Traces to: AC1
- [x] 1.1.2 Create destination skills directories for each editor (lines 236-241)
  - Traces to: AC4, AC5, AC6
- [x] 1.1.3 Implement Claude skills copying logic (lines 248-260)
  - Traces to: AC4
- [x] 1.1.4 Implement Cursor skills copying logic (lines 262-274)
  - Traces to: AC5
- [x] 1.1.5 Implement Windsurf skills copying logic (lines 276-288)
  - Traces to: AC6
- [x] 1.1.6 Implement GitHub Copilot OPSX commands copying logic (lines 290-302)
  - Traces to: AC8, AC9
- [x] 1.1.7 Extend return counts object to include copilot (line 304)
  - Traces to: AC3

### 1.2 Integrate into Build Pipeline

- [x] 1.2.1 Add `copyOpenSpecSkills()` call at line 842 in `copyTemplates()`
  - Traces to: AC2
- [x] 1.2.2 Add logging for Claude skill count (line 843)
  - Traces to: AC3
- [x] 1.2.3 Add logging for Cursor skill count (line 844)
  - Traces to: AC3
- [x] 1.2.4 Add logging for Windsurf skill count (line 845)
  - Traces to: AC3
- [x] 1.2.5 Add logging for GitHub Copilot OPSX command count (line 846)
  - Traces to: AC3

### 1.3 Create GitHub Copilot OPSX Commands

- [x] 1.3.1 Create `.github/copilot-commands/opsx-new.md`
  - Traces to: AC8
- [x] 1.3.2 Create `.github/copilot-commands/opsx-continue.md`
  - Traces to: AC8
- [x] 1.3.3 Create `.github/copilot-commands/opsx-ff.md`
  - Traces to: AC8
- [x] 1.3.4 Create `.github/copilot-commands/opsx-apply.md`
  - Traces to: AC8
- [x] 1.3.5 Create `.github/copilot-commands/opsx-archive.md`
  - Traces to: AC8
- [x] 1.3.6 Create `.github/copilot-commands/opsx-bulk-archive.md`
  - Traces to: AC8
- [x] 1.3.7 Create `.github/copilot-commands/opsx-explore.md`
  - Traces to: AC8
- [x] 1.3.8 Create `.github/copilot-commands/opsx-verify.md`
  - Traces to: AC8
- [x] 1.3.9 Create `.github/copilot-commands/opsx-sync.md`
  - Traces to: AC8
- [x] 1.3.10 Create `.github/copilot-commands/opsx-onboard.md`
  - Traces to: AC8

## 2. Verification

### 2.1 Build Verification

- [x] 2.1.1 Run `npm run build` in `packages/cli` - must pass
  - Traces to: Scenario "CLI Build Includes Skills"
- [x] 2.1.2 Verify build logs show 10 skills for Claude, Cursor, Windsurf, and 10 commands for Copilot
  - Traces to: AC3

### 2.2 Template Output Verification

- [x] 2.2.1 Verify `packages/cli/templates/.claude/skills/` contains 10 `openspec-*` directories
  - Traces to: AC4
- [x] 2.2.2 Verify `packages/cli/templates/.cursor/skills/` contains 10 `openspec-*` directories
  - Traces to: AC5
- [x] 2.2.3 Verify `packages/cli/templates/.windsurf/skills/` contains 10 `openspec-*` directories
  - Traces to: AC6
- [x] 2.2.4 Verify each skill directory contains a `SKILL.md` file
  - Traces to: AC7
- [x] 2.2.5 Verify `packages/cli/templates/.github/copilot-commands/` contains 10 `opsx-*.md` files
  - Traces to: AC8
- [x] 2.2.6 Verify each Copilot OPSX command file is valid markdown
  - Traces to: AC8

### 2.3 Code Quality

- [x] 2.3.1 Run `npm run lint` in `packages/cli` - must pass
- [x] 2.3.2 Run `npm run arch:check` - must pass
- [x] 2.3.3 Verify function follows existing code patterns in `copy-templates.ts`
  - Traces to: Design Decision 1

## Implementation Reference

### File Location
`packages/cli/scripts/copy-templates.ts`

### Function Location
- **Definition**: Lines 233-307
- **Call site**: Line 842
- **Logging**: Lines 843-846 (4 editors)

### Skill Directories (10 per editor with skills support)
1. `openspec-new-change/`
2. `openspec-continue-change/`
3. `openspec-ff-change/`
4. `openspec-apply-change/`
5. `openspec-archive-change/`
6. `openspec-bulk-archive-change/`
7. `openspec-explore/`
8. `openspec-verify-change/`
9. `openspec-sync-specs/`
10. `openspec-onboard/`

### GitHub Copilot OPSX Commands (10 files)
1. `opsx-new.md`
2. `opsx-continue.md`
3. `opsx-ff.md`
4. `opsx-apply.md`
5. `opsx-archive.md`
6. `opsx-bulk-archive.md`
7. `opsx-explore.md`
8. `opsx-verify.md`
9. `opsx-sync.md`
10. `opsx-onboard.md`

### Build Log Output
```
  ✓ .claude/skills/ (10 OpenSpec skills)
  ✓ .cursor/skills/ (10 OpenSpec skills)
  ✓ .windsurf/skills/ (10 OpenSpec skills)
  ✓ .github/copilot-commands/ (10 OPSX commands)
```
