# Design: CLI OpenSpec Skills Template Assembly

## Implementation Status

| Component | Status |
|-----------|--------|
| Claude Code skills copying | **IMPLEMENTED** |
| Cursor skills copying | **IMPLEMENTED** |
| Windsurf skills copying | **IMPLEMENTED** |
| GitHub Copilot commands copying | **IMPLEMENTED** |

## Context

The HAI3 CLI uses a build-time template assembly process defined in `packages/cli/scripts/copy-templates.ts`. This script copies various files from the monorepo root into `packages/cli/templates/`, which are then used when creating new projects via `hai3 create`.

OpenSpec 1.1.1 introduced a skill-based architecture where each OPSX command references a corresponding skill file. The existing script copied OPSX commands but not the skill files they depend on.

## Goals / Non-Goals

### Goals

1. **Complete template assembly**: Include all OpenSpec skill files in CLI templates
2. **Multi-editor support**: Copy skills for Claude Code, Cursor, Windsurf, and GitHub Copilot
3. **Consistent pattern**: Follow existing code patterns in `copy-templates.ts`
4. **Observable builds**: Log skill counts during build for traceability
5. **Handle architectural differences**: Support Copilot's command-only structure (no separate skills)

### Non-Goals

1. **Runtime skill loading**: Skills are copied at build time, not loaded dynamically
2. **Skill validation**: No validation of skill file contents during copy
3. **Selective copying**: All `openspec-*` skills and `opsx-*` commands are copied, no filtering

## Decisions

### Decision 1: Separate Function for Skill Copying

**Context**: We could either:
1. Inline the skill copying logic in `copyTemplates()`
2. Create a dedicated function `copyOpenSpecSkills()`

**Decision**: Create a dedicated function `copyOpenSpecSkills()`.

**Rationale**:
- Follows the existing pattern of dedicated functions for each copy operation (e.g., `copyOpenSpecCommands()`, `bundlePackageCommands()`)
- Easier to test and maintain in isolation
- Clear responsibility boundary
- Consistent with the codebase style

**Trade-offs**:
- (+) Better code organization
- (+) Easier to modify skill copying logic independently
- (+) Consistent with existing patterns
- (-) Slightly more function calls in the pipeline

### Decision 2: Copy Entire Directories (Not Individual Files)

**Context**: Skills are organized as directories containing `SKILL.md` files. We could:
1. Copy only `SKILL.md` files
2. Copy entire skill directories

**Decision**: Copy entire skill directories using `fs.copy()`.

**Rationale**:
- Future-proofs for additional files in skill directories
- Simpler implementation (one copy per skill)
- Preserves directory structure exactly

**Trade-offs**:
- (+) Simpler code
- (+) Future-proof for new files in skill directories
- (-) May copy unexpected files if skill directories grow

### Decision 3: Pattern-Based Selection

**Context**: Need to identify which directories are OpenSpec skills.

**Decision**: Use `openspec-*` prefix pattern matching.

**Rationale**:
- All OpenSpec skills follow the `openspec-*` naming convention
- Pattern is specific enough to avoid false positives
- Matches the naming convention documented in OpenSpec 1.1.1

**Trade-offs**:
- (+) Simple and clear pattern
- (+) Self-documenting code
- (-) Relies on naming convention being followed

### Decision 4: Count-Based Logging

**Context**: Need visibility into build results.

**Decision**: Return and log counts of copied skills per editor.

**Rationale**:
- Provides immediate feedback during build
- Easy to verify expected counts (10 per editor)
- Consistent with existing logging patterns in the script

**Trade-offs**:
- (+) Easy verification
- (+) Consistent with existing patterns
- (-) Count alone doesn't verify content correctness

### Decision 5: GitHub Copilot Command-Only Support

**Context**: GitHub Copilot uses a different architecture than other editors:
- Other editors: Separate skills directories (`.*/skills/openspec-*/SKILL.md`)
- GitHub Copilot: Self-contained commands (`.github/copilot-commands/opsx-*.md`)

**Decision**: Copy GitHub Copilot OPSX commands as individual files, not directories.

**Rationale**:
- Respects Copilot's existing architecture
- Commands are self-contained markdown files
- No separate skills directory to create
- Consistent with how other Copilot commands are organized

**Trade-offs**:
- (+) Maintains consistency with Copilot's existing structure
- (+) No need to create a new skills directory pattern for Copilot
- (-) Different copy logic than other editors (files vs directories)
- (-) Copilot commands may need more self-contained content

## Architecture

### Function Placement

```
packages/cli/scripts/copy-templates.ts
  |
  +-- copyOpenSpecCommands()      (lines 189-221) - existing
  +-- copyOpenSpecSkills()        (lines 233-307) - IMPLEMENTED (all 4 editors)
  +-- bundlePackageCommands()     (lines ~315-...)
  +-- ...
  +-- copyTemplates()             (main function)
        |
        +-- ... existing operations ...
        +-- copyOpenSpecSkills()  (line 842)
        +-- console.log(...)      (lines 843-846) - 4 editors
```

### Data Flow

```
Source (monorepo root):
  .claude/skills/openspec-*/SKILL.md
  .cursor/skills/openspec-*/SKILL.md
  .windsurf/skills/openspec-*/SKILL.md
  .github/copilot-commands/opsx-*.md
         |
         | copyOpenSpecSkills()
         v
Destination (CLI templates):
  packages/cli/templates/.claude/skills/openspec-*/SKILL.md
  packages/cli/templates/.cursor/skills/openspec-*/SKILL.md
  packages/cli/templates/.windsurf/skills/openspec-*/SKILL.md
  packages/cli/templates/.github/copilot-commands/opsx-*.md
         |
         | hai3 create
         v
New project:
  my-project/.claude/skills/openspec-*/SKILL.md
  my-project/.cursor/skills/openspec-*/SKILL.md
  my-project/.windsurf/skills/openspec-*/SKILL.md
  my-project/.github/copilot-commands/opsx-*.md
```

### Function Signature

```typescript
async function copyOpenSpecSkills(
  templatesDir: string
): Promise<{ claude: number; cursor: number; windsurf: number; copilot: number }>
```

**Input**: `templatesDir` - Destination templates directory (typically `packages/cli/templates`)

**Output**: Object with skill/command counts for each editor

### Implementation Pattern

The function follows this pattern for each editor with skills (Claude, Cursor, Windsurf):
1. Ensure destination skills directory exists
2. Read source skills directory
3. Filter for entries matching `openspec-*` pattern
4. Copy each matching directory to destination
5. Increment counter
6. Return counts

For GitHub Copilot (commands only):
1. Ensure destination copilot-commands directory exists
2. Read source copilot-commands directory (`.github/copilot-commands/`)
3. Filter for entries matching `opsx-*` pattern
4. Copy each matching file to destination
5. Increment counter
6. Return counts

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Source skills missing | Low | High | Build will still succeed but with 0 counts; log output makes this visible |
| Destination permissions | Very Low | Medium | Uses `fs.ensureDir()` which handles most cases |
| Partial copy failure | Very Low | Medium | `fs.copy()` is atomic per directory/file |
| Pattern matches non-skills | Very Low | Low | `openspec-*` prefix is specific to skills |
| Copilot commands missing | Low | Medium | Build continues with 0 count; visible in logs |
| `opsx-*` pattern collision | Very Low | Low | Pattern is specific to OPSX commands |

## Alternatives Considered

### Alternative 1: Modify Existing copyOpenSpecCommands()

**Rejected because**:
- Mixing commands and skills copying violates single responsibility
- Would make the function too complex
- Harder to maintain and test

### Alternative 2: Use Glob Pattern Instead of Directory Iteration

**Rejected because**:
- Directory iteration is more explicit
- Glob patterns can have edge cases with special characters
- Current approach matches existing codebase patterns

### Alternative 3: Symlinks Instead of Copies

**Rejected because**:
- Cross-platform compatibility issues (Windows)
- Some editors don't follow symlinks properly
- CLI templates should be self-contained
