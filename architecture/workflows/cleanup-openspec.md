---
type: workflow
name: cleanup-openspec
version: 1.0
purpose: Fully remove all OpenSpec artifacts, skills, commands, and configuration references from the project
system: hai3
---

# Cleanup OpenSpec


<!-- toc -->

- [Preconditions](#preconditions)
- [Variables](#variables)
- [Phase 1: Inventory (read-only)](#phase-1-inventory-read-only)
  - [Step 1.1: Scan OpenSpec data directory](#step-11-scan-openspec-data-directory)
  - [Step 1.2: Scan agent integration files](#step-12-scan-agent-integration-files)
  - [Step 1.3: Scan configuration references](#step-13-scan-configuration-references)
  - [Step 1.4: Scan architecture documents](#step-14-scan-architecture-documents)
  - [Step 1.5: Report inventory](#step-15-report-inventory)
- [Phase 2: Confirm Scope](#phase-2-confirm-scope)
- [Phase 3: Remove OpenSpec Data](#phase-3-remove-openspec-data)
  - [Step 3.1: Remove entire openspec/ directory](#step-31-remove-entire-openspec-directory)
  - [Step 3.2: Verify removal](#step-32-verify-removal)
- [Phase 4: Remove Agent Integration Files](#phase-4-remove-agent-integration-files)
  - [Step 4.1: Claude Code](#step-41-claude-code)
  - [Step 4.2: Windsurf](#step-42-windsurf)
  - [Step 4.3: Cursor](#step-43-cursor)
  - [Step 4.4: GitHub Copilot](#step-44-github-copilot)
  - [Step 4.5: Verify agent file removal](#step-45-verify-agent-file-removal)
- [Phase 5: Clean Configuration References](#phase-5-clean-configuration-references)
  - [Step 5.1: Clean CLAUDE.md](#step-51-clean-claudemd)
  - [Step 5.2: Clean AGENTS.md](#step-52-clean-agentsmd)
  - [Step 5.3: Verify config cleanup](#step-53-verify-config-cleanup)
- [Phase 6: Remove Architecture Documents](#phase-6-remove-architecture-documents)
  - [Step 6.1: Remove OpenSpec exploration document](#step-61-remove-openspec-exploration-document)
  - [Step 6.2: Remove OpenSpec migration workflow](#step-62-remove-openspec-migration-workflow)
  - [Step 6.3: Verify architecture cleanup](#step-63-verify-architecture-cleanup)
- [Phase 7: Remove Self](#phase-7-remove-self)
- [Phase 8: Verify](#phase-8-verify)
  - [Step 8.1: File system scan](#step-81-file-system-scan)
  - [Step 8.2: Evaluate results](#step-82-evaluate-results)
- [Phase 9: Summary](#phase-9-summary)
- [Error Handling](#error-handling)
  - [Dirty working tree](#dirty-working-tree)
  - [Permission denied](#permission-denied)
  - [Unexpected files found](#unexpected-files-found)
  - [Phase failure](#phase-failure)
- [Rollback](#rollback)

<!-- /toc -->

Remove every OpenSpec footprint from the project. This workflow is destructive and irreversible (except via git). Every deletion phase requires explicit user confirmation before executing.

---
---

## Preconditions

STOP if ANY precondition fails. Do NOT proceed with partial state.

- [ ] Working directory is the project root
- [ ] Git working tree is clean (`git status --porcelain` returns empty). If not, STOP and ask user to commit or stash first
- [ ] User has confirmed they want to remove OpenSpec (do NOT auto-proceed)

---

## Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `{PROJECT}` | Repository root | Base path for all operations |
| `{OPENSPEC}` | `openspec/` | OpenSpec data directory |
| `{CLAUDE_SKILLS}` | `.claude/skills/` | Claude Code skills directory |
| `{CLAUDE_CMDS}` | `.claude/commands/opsx/` | Claude Code opsx commands directory |
| `{WINDSURF_SKILLS}` | `.windsurf/skills/` | Windsurf skills directory |
| `{WINDSURF_WF}` | `.windsurf/workflows/` | Windsurf workflows directory |
| `{CURSOR_SKILLS}` | `.cursor/skills/` | Cursor skills directory |
| `{CURSOR_CMDS}` | `.cursor/commands/` | Cursor commands directory |
| `{COPILOT_CMDS}` | `.github/copilot-commands/` | GitHub Copilot commands directory |

---

## Phase 1: Inventory (read-only)

Scan and report all OpenSpec footprints. Do NOT modify any files.

### Step 1.1: Scan OpenSpec data directory

List contents of `{OPENSPEC}`:

```bash
echo "=== Main Specs ===" && ls openspec/specs/ 2>/dev/null | wc -l
echo "=== Active Changes ===" && ls openspec/changes/ 2>/dev/null | grep -v '^archive$' | wc -l
echo "=== Archived Changes ===" && ls openspec/changes/archive/ 2>/dev/null | wc -l
echo "=== Config ===" && ls openspec/config.yaml 2>/dev/null
```

Record counts: `{SPEC_COUNT}`, `{ACTIVE_COUNT}`, `{ARCHIVED_COUNT}`.

### Step 1.2: Scan agent integration files

For each IDE, count OpenSpec-related entries:

**Claude Code:**
```bash
ls -d .claude/skills/openspec-*/ 2>/dev/null | wc -l
ls .claude/commands/opsx/*.md 2>/dev/null | wc -l
```

**Windsurf:**
```bash
ls -d .windsurf/skills/openspec-*/ 2>/dev/null | wc -l
ls .windsurf/workflows/opsx-*.md 2>/dev/null | wc -l
```

**Cursor:**
```bash
ls -d .cursor/skills/openspec-*/ 2>/dev/null | wc -l
ls .cursor/commands/opsx-*.md 2>/dev/null | wc -l
```

**GitHub Copilot:**
```bash
ls .github/copilot-commands/opsx-*.md 2>/dev/null | wc -l
```

### Step 1.3: Scan configuration references

Search for OpenSpec mentions in config files:

```bash
grep -rn -i "openspec\|opsx" CLAUDE.md AGENTS.md .claude/settings.json 2>/dev/null
```

### Step 1.4: Scan architecture documents

```bash
find architecture/ -name "*.md" | xargs grep -li -i "openspec" 2>/dev/null
```

### Step 1.5: Report inventory

Present a single summary table to the user:

```
## OpenSpec Inventory

| Category               | Path                              | Items |
|------------------------|-----------------------------------|-------|
| Main specs             | openspec/specs/                   | {N}   |
| Active changes         | openspec/changes/ (non-archive)   | {N}   |
| Archived changes       | openspec/changes/archive/         | {N}   |
| Config                 | openspec/config.yaml              | 1     |
| Claude skills          | .claude/skills/openspec-*/        | {N}   |
| Claude commands         | .claude/commands/opsx/            | {N}   |
| Windsurf skills        | .windsurf/skills/openspec-*/      | {N}   |
| Windsurf workflows     | .windsurf/workflows/opsx-*        | {N}   |
| Cursor skills          | .cursor/skills/openspec-*/        | {N}   |
| Cursor commands         | .cursor/commands/opsx-*           | {N}   |
| Copilot commands        | .github/copilot-commands/opsx-*   | {N}   |
| Config references      | CLAUDE.md, AGENTS.md              | {N}   |
| Architecture docs       | architecture/**                   | {N}   |
| **Total items**        |                                   | {SUM} |
```

**Verification**: Inventory count matches expected footprint. If any category returns 0 when non-zero was expected, warn the user — files may have already been removed.

---

## Phase 2: Confirm Scope

Present the inventory from Phase 1 and ask:

```
This workflow will permanently delete all {SUM} OpenSpec items listed above.

Recovery is possible ONLY via `git checkout` (all changes are local, uncommitted).

Options:
1. Proceed with full cleanup
2. Exclude archived changes (keep openspec/changes/archive/)
3. Exclude architecture docs (keep exploration/migration references)
4. Cancel
```

STOP if user chooses "Cancel". Record user's exclusions in `{EXCLUSIONS}`.

---

## Phase 3: Remove OpenSpec Data

**Requires**: User confirmed in Phase 2.

### Step 3.1: Remove entire openspec/ directory

```bash
rm -rf openspec/
```

**If user excluded archived changes** (option 2 in Phase 2):
```bash
# Preserve archive, remove everything else
mv openspec/changes/archive /tmp/_openspec_archive_backup
rm -rf openspec/
mkdir -p openspec/changes
mv /tmp/_openspec_archive_backup openspec/changes/archive
```

### Step 3.2: Verify removal

```bash
test -d openspec/specs && echo "FAIL: specs still exist" || echo "PASS: specs removed"
test -f openspec/config.yaml && echo "FAIL: config still exists" || echo "PASS: config removed"
```

STOP if any check returns FAIL. Report the failure and ask user how to proceed.

---

## Phase 4: Remove Agent Integration Files

Remove OpenSpec skills, commands, and workflows from ALL IDE integrations.

### Step 4.1: Claude Code

```bash
# Skills (10 directories)
rm -rf .claude/skills/openspec-apply-change
rm -rf .claude/skills/openspec-archive-change
rm -rf .claude/skills/openspec-bulk-archive-change
rm -rf .claude/skills/openspec-continue-change
rm -rf .claude/skills/openspec-explore
rm -rf .claude/skills/openspec-ff-change
rm -rf .claude/skills/openspec-new-change
rm -rf .claude/skills/openspec-onboard
rm -rf .claude/skills/openspec-sync-specs
rm -rf .claude/skills/openspec-verify-change

# Commands (entire opsx/ directory)
rm -rf .claude/commands/opsx
```

### Step 4.2: Windsurf

```bash
# Skills (10 directories)
rm -rf .windsurf/skills/openspec-apply-change
rm -rf .windsurf/skills/openspec-archive-change
rm -rf .windsurf/skills/openspec-bulk-archive-change
rm -rf .windsurf/skills/openspec-continue-change
rm -rf .windsurf/skills/openspec-explore
rm -rf .windsurf/skills/openspec-ff-change
rm -rf .windsurf/skills/openspec-new-change
rm -rf .windsurf/skills/openspec-onboard
rm -rf .windsurf/skills/openspec-sync-specs
rm -rf .windsurf/skills/openspec-verify-change

# Workflows (opsx-prefixed files only)
find .windsurf/workflows/ -name "opsx-*.md" -delete 2>/dev/null
```

### Step 4.3: Cursor

```bash
# Skills (10 directories)
rm -rf .cursor/skills/openspec-apply-change
rm -rf .cursor/skills/openspec-archive-change
rm -rf .cursor/skills/openspec-bulk-archive-change
rm -rf .cursor/skills/openspec-continue-change
rm -rf .cursor/skills/openspec-explore
rm -rf .cursor/skills/openspec-ff-change
rm -rf .cursor/skills/openspec-new-change
rm -rf .cursor/skills/openspec-onboard
rm -rf .cursor/skills/openspec-sync-specs
rm -rf .cursor/skills/openspec-verify-change

# Commands (opsx-prefixed files only)
find .cursor/commands/ -name "opsx-*.md" -delete 2>/dev/null
```

### Step 4.4: GitHub Copilot

```bash
find .github/copilot-commands/ -name "opsx-*.md" -delete 2>/dev/null
```

### Step 4.5: Verify agent file removal

```bash
echo "=== Remaining OpenSpec files ==="
find .claude/skills .claude/commands .windsurf/skills .windsurf/workflows .cursor/skills .cursor/commands .github/copilot-commands -iname "*openspec*" -o -iname "*opsx*" 2>/dev/null
```

**Expected output**: Empty (no matches). If any files remain, list them and ask user whether to delete.

---

## Phase 5: Clean Configuration References

Edit configuration files to remove OpenSpec mentions. Do NOT delete these files — only remove the OpenSpec-specific lines.

### Step 5.1: Clean CLAUDE.md

Remove these lines (or equivalent) from `CLAUDE.md`:

```
If a request implies implementation, execution, modification, or validation of an OpenSpec feature:
- The Orchestrator MUST take control
- No other agent may act unless delegated by the Orchestrator
```

**Method**: Read the file, identify the OpenSpec paragraph, remove it. Preserve all other content exactly.

### Step 5.2: Clean AGENTS.md

Remove the same OpenSpec paragraph from `AGENTS.md`:

```
If a request implies implementation, execution, modification, or validation of an OpenSpec feature:
- The Orchestrator MUST take control
- No other agent may act unless delegated by the Orchestrator
```

**Method**: Read the file, identify the OpenSpec paragraph, remove it. Preserve all other content exactly.

### Step 5.3: Verify config cleanup

```bash
grep -rn -i "openspec\|opsx" CLAUDE.md AGENTS.md 2>/dev/null
```

**Expected output**: Empty (no matches). If matches remain, show them and ask user whether they are intentional (e.g., migration history references).

---

## Phase 6: Remove Architecture Documents

Remove OpenSpec-related architecture documents. Skip this phase if user excluded it in Phase 2.

### Step 6.1: Remove OpenSpec exploration document

```bash
rm -f architecture/explorations/2026-03-10-openspec-document-format.md
```

### Step 6.2: Remove OpenSpec migration workflow

```bash
rm -f architecture/workflows/migrate-openspec.md
```

### Step 6.3: Verify architecture cleanup

```bash
grep -rli -i "openspec" architecture/ 2>/dev/null
```

Review any remaining matches. Architecture artifacts (PRD, DESIGN, FEATURE, ADR, DECOMPOSITION) that mention OpenSpec as historical context are NOT targets for removal — they are Cypilot SDLC documents that may reference OpenSpec as a predecessor system. Only remove dedicated OpenSpec documents.

---

## Phase 7: Remove Self

After all other cleanup is complete, remove this workflow and its command entry point.

```bash
rm -f architecture/workflows/cleanup-openspec.md
rm -rf .claude/commands/opsx  # Already removed in Phase 4, but verify
```

**Note**: The agent executing this workflow will have already loaded its instructions, so removing the file does not interrupt execution.

---

## Phase 8: Verify

Run a comprehensive verification scan across the entire project.

### Step 8.1: File system scan

```bash
echo "=== Directory check ==="
test -d openspec && echo "FAIL: openspec/ still exists" || echo "PASS: openspec/ removed"

echo "=== Skill/command check ==="
find . -path ./.git -prune -o \( -iname "*openspec*" -o -iname "opsx-*" \) -print 2>/dev/null | grep -v node_modules | grep -v '.git/'

echo "=== Content reference check ==="
grep -rli --include="*.md" --include="*.yaml" --include="*.yml" --include="*.json" --include="*.toml" -i "openspec" . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'architecture/ADR' | grep -v 'architecture/features' | grep -v 'architecture/PRD' | grep -v 'architecture/DESIGN' | grep -v 'architecture/DECOMPOSITION'
```

### Step 8.2: Evaluate results

For each remaining match from Step 8.1:

| Match Type | Action |
|------------|--------|
| Cypilot SDLC artifact mentioning OpenSpec as history | KEEP — historical reference, not a footprint |
| Skill/command/workflow file | FAIL — should have been removed |
| Config file with OpenSpec routing | FAIL — should have been cleaned |
| Node modules / git objects | IGNORE — not project files |

**Verdict**:
- **PASS**: No FAIL items found
- **FAIL**: List remaining items and ask user for each: remove or keep

---

## Phase 9: Summary

Present final cleanup report:

```
## OpenSpec Cleanup Complete

| Category               | Before | After | Status |
|------------------------|--------|-------|--------|
| openspec/ directory    | {N}    | 0     | Removed |
| Claude skills/commands | {N}    | 0     | Removed |
| Windsurf skills/wf     | {N}    | 0     | Removed |
| Cursor skills/commands | {N}    | 0     | Removed |
| Copilot commands        | {N}    | 0     | Removed |
| Config references      | {N}    | 0     | Cleaned |
| Architecture docs       | {N}    | 0     | Removed |

**Verification**: {PASS|FAIL}
**Exclusions**: {list or "none"}

All changes are uncommitted. Run `git diff --stat` to review, then commit when ready.
```

---

## Error Handling

### Dirty working tree

```
STOP: Working tree has uncommitted changes.
Commit or stash changes first, then re-run this workflow.
```

### Permission denied

```
STOP: Cannot delete {path}: permission denied.
Check file permissions and retry.
```

### Unexpected files found

If a scan finds OpenSpec files not listed in the inventory:

1. Show the unexpected files
2. Ask user: "These files were not in the original inventory. Delete them too? [yes/no/inspect]"
3. If "inspect": show file contents, then re-ask

### Phase failure

If any verification check in a phase returns FAIL:

1. Show what failed
2. Ask user: "Fix manually and re-verify, or skip and continue?"
3. Record skipped items in the final summary

---

## Rollback

All changes are local and uncommitted. To undo the entire cleanup:

```bash
git checkout -- .
git clean -fd
```

To undo a specific phase, use `git checkout` on the affected paths:

```bash
# Restore openspec/ directory
git checkout -- openspec/

# Restore agent files
git checkout -- .claude/skills/openspec-* .claude/commands/opsx/
git checkout -- .windsurf/skills/openspec-* .windsurf/workflows/opsx-*
git checkout -- .cursor/skills/openspec-* .cursor/commands/opsx-*
git checkout -- .github/copilot-commands/opsx-*

# Restore config references
git checkout -- CLAUDE.md AGENTS.md
```
