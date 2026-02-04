# Change: CLI OpenSpec Skills Template Assembly

## Why

The HAI3 CLI package scaffolds new projects via `hai3 create <project-name>`. The CLI templates must include OpenSpec 1.1.1 skills so that newly created projects have access to the complete OpenSpec workflow system. The HAI3 repository itself has been upgraded to OpenSpec 1.1.1 (commit e45dc61), but the CLI build pipeline was missing the skill copying step.

**Problem:**
The `copy-templates.ts` script already copies OpenSpec commands from `.claude/commands/opsx/` (lines 189-219), but it did not copy the corresponding skill directories from `.claude/skills/openspec-*/`, `.cursor/skills/openspec-*/`, `.windsurf/skills/openspec-*/`, and `.github/copilot-commands/opsx-*.md`.

**Impact:**
Without the skills, newly created HAI3 projects would have OPSX commands that fail because they reference non-existent skill files.

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Claude Code skills | **IMPLEMENTED** | Skills copied from `.claude/skills/openspec-*/` |
| Cursor skills | **IMPLEMENTED** | Skills copied from `.cursor/skills/openspec-*/` |
| Windsurf skills | **IMPLEMENTED** | Skills copied from `.windsurf/skills/openspec-*/` |
| GitHub Copilot commands | **TO BE IMPLEMENTED** | OPSX command files need to be created and copy logic added |

## Multi-Editor Support

HAI3 supports 4 AI development tools, each with different directory structures:

| Editor | Skills Location | Commands Location | Architecture |
|--------|-----------------|-------------------|--------------|
| Claude Code | `.claude/skills/openspec-*/` | `.claude/commands/opsx/` | Skills + Commands |
| Cursor | `.cursor/skills/openspec-*/` | `.cursor/commands/opsx-*.md` | Skills + Commands |
| Windsurf | `.windsurf/skills/openspec-*/` | `.windsurf/workflows/opsx-*.md` | Skills + Workflows |
| GitHub Copilot | N/A (no skills) | `.github/copilot-commands/opsx-*.md` | Commands only |

**Note:** GitHub Copilot uses a different architecture where commands are self-contained markdown files without a separate skills directory. OPSX commands for Copilot are stored directly in `.github/copilot-commands/`.

## What Changes

### CLI Template Assembly Pipeline Extension

A `copyOpenSpecSkills()` function has been added to `packages/cli/scripts/copy-templates.ts` that:

1. Scans the monorepo root for `openspec-*` skill directories in each editor's skills folder
2. Copies entire skill directories (including SKILL.md files) to CLI templates
3. **(TO BE IMPLEMENTED)** Copies GitHub Copilot OPSX commands from `.github/copilot-commands/opsx-*.md`
4. Logs the count of copied skills/commands for each editor
5. Integrates into the existing `copyTemplates()` pipeline

### Function Implementation (Current State)

**File:** `packages/cli/scripts/copy-templates.ts`

**Function:** `copyOpenSpecSkills(templatesDir: string)` at lines 231-286

The function currently:
- Creates destination skills directories for each editor (lines 234-240)
- Copies Claude skills from `.claude/skills/openspec-*` (lines 246-258)
- Copies Cursor skills from `.cursor/skills/openspec-*` (lines 260-272)
- Copies Windsurf skills from `.windsurf/skills/openspec-*` (lines 274-286)
- Returns counts for Claude, Cursor, and Windsurf

**Call site:** Line 823 in `copyTemplates()` function

**Logging:** Lines 824-826 output skill counts for Claude, Cursor, and Windsurf

### Function Implementation (Planned for GitHub Copilot)

The following changes are **planned but not yet implemented**:

- Add GitHub Copilot OPSX commands copying logic (planned lines ~288-300)
- Extend return type to include `copilot: number`
- Add logging for Copilot command count (planned line ~827)

**Prerequisite:** The GitHub Copilot OPSX command files must be created in `.github/copilot-commands/` before the copy logic can be implemented.

### Skill Directories (IMPLEMENTED - 10 per editor with skills support)

The following skill directories are copied for Claude, Cursor, and Windsurf:

```
openspec-new-change/
openspec-continue-change/
openspec-ff-change/
openspec-apply-change/
openspec-archive-change/
openspec-bulk-archive-change/
openspec-explore/
openspec-verify-change/
openspec-sync-specs/
openspec-onboard/
```

### GitHub Copilot OPSX Commands (TO BE IMPLEMENTED - 10 commands)

The following command files need to be created in `.github/copilot-commands/`:

```
opsx-new.md
opsx-continue.md
opsx-ff.md
opsx-apply.md
opsx-archive.md
opsx-bulk-archive.md
opsx-explore.md
opsx-verify.md
opsx-sync.md
opsx-onboard.md
```

### Template Output Structure

**Current state** - after build, `packages/cli/templates/` contains:
```
.claude/skills/openspec-*/SKILL.md       (10 directories) - IMPLEMENTED
.cursor/skills/openspec-*/SKILL.md       (10 directories) - IMPLEMENTED
.windsurf/skills/openspec-*/SKILL.md     (10 directories) - IMPLEMENTED
```

**Planned state** - after GitHub Copilot implementation:
```
.claude/skills/openspec-*/SKILL.md       (10 directories)
.cursor/skills/openspec-*/SKILL.md       (10 directories)
.windsurf/skills/openspec-*/SKILL.md     (10 directories)
.github/copilot-commands/opsx-*.md       (10 command files)
```

Total (planned): 30 skill directories (10 skills x 3 editors) + 10 Copilot OPSX commands

## Capabilities

### New Capabilities

- `cli-openspec-skills-assembly`: The CLI build pipeline assembles OpenSpec skills into templates
- `cli-copilot-opsx-assembly`: The CLI build pipeline assembles GitHub Copilot OPSX commands into templates

### Modified Capabilities

- None (purely additive change to build pipeline)

## Impact

### Affected Component

- **CLI Package**: `packages/cli/scripts/copy-templates.ts`
  - Lines 231-286 (current implementation for Claude/Cursor/Windsurf)
  - Lines 823-826 (current call site and logging)
  - *Planned*: Lines ~288-300, ~827-828 (GitHub Copilot support)
- **CLI Build Output**:
  - *Current*: `packages/cli/templates/` gains 30 skill directories (10 x 3 editors)
  - *Planned*: Additionally 10 Copilot OPSX commands

### Risk Assessment

- **Low risk**: Purely additive change to build pipeline
- **No breaking changes**: Existing template files are unchanged
- **Build-time only**: No runtime impact on CLI behavior

## User Scenarios

### Scenario: Developer Creates New HAI3 Project

- **GIVEN** the HAI3 CLI has been built with the `copyOpenSpecSkills()` function
- **WHEN** a developer runs `hai3 create my-project`
- **THEN** the new project includes all OpenSpec 1.1.1 skills in `.claude/skills/`, `.cursor/skills/`, and `.windsurf/skills/`
- **AND** the new project includes all OPSX commands in `.github/copilot-commands/`
- **AND** all OPSX commands work correctly because their skill files are present

### Scenario: CLI Build Includes Skills (Current)

- **GIVEN** a developer is building the HAI3 CLI package
- **WHEN** they run `npm run build` in `packages/cli`
- **THEN** the build output includes log lines showing skill counts:
  - `  .claude/skills/ (10 OpenSpec skills)`
  - `  .cursor/skills/ (10 OpenSpec skills)`
  - `  .windsurf/skills/ (10 OpenSpec skills)`
- **AND** the templates directory contains 30 skill directories (10 x 3 editors)

### Scenario: CLI Build Includes Skills (Planned - After Copilot Implementation)

- **GIVEN** a developer is building the HAI3 CLI package with Copilot support
- **WHEN** they run `npm run build` in `packages/cli`
- **THEN** the build output includes log lines showing skill/command counts:
  - `  .claude/skills/ (10 OpenSpec skills)`
  - `  .cursor/skills/ (10 OpenSpec skills)`
  - `  .windsurf/skills/ (10 OpenSpec skills)`
  - `  .github/copilot-commands/ (10 OPSX commands)`
- **AND** the templates directory contains all 30 skill directories and 10 Copilot OPSX commands

### Scenario: Skills Enable OPSX Workflows

- **GIVEN** a project created with the updated CLI
- **WHEN** the developer runs `/opsx:new add-feature`
- **THEN** the command invokes the `openspec-new-change` skill from `.claude/skills/openspec-new-change/SKILL.md`
- **AND** the skill creates a new change directory at `openspec/changes/add-feature/`

## Acceptance Criteria

1. **AC1**: `copyOpenSpecSkills()` function exists at lines 231-305 in `copy-templates.ts`
2. **AC2**: Function is called at line 823 in the `copyTemplates()` pipeline
3. **AC3**: Build logs show skill counts for Claude (10), Cursor (10), Windsurf (10), and GitHub Copilot (10)
4. **AC4**: `packages/cli/templates/.claude/skills/` contains 10 `openspec-*` directories
5. **AC5**: `packages/cli/templates/.cursor/skills/` contains 10 `openspec-*` directories
6. **AC6**: `packages/cli/templates/.windsurf/skills/` contains 10 `openspec-*` directories
7. **AC7**: Each skill directory contains a `SKILL.md` file
8. **AC8**: `packages/cli/templates/.github/copilot-commands/` contains 10 `opsx-*.md` files
9. **AC9**: GitHub Copilot OPSX commands are copied from `.github/copilot-commands/opsx-*.md`
