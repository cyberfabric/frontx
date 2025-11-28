# Design: AI Commands Refactoring Architecture

## Context

HAI3 supports AI-assisted development through slash commands, rules, and workflows. The framework follows a three-stage workflow (drafts -> mockups -> production) optimized for AI-human collaboration. Currently AI configuration is scattered across IDE-specific folders with no separation between framework development (monorepo) and application development (standalone).

### HAI3 Mission Alignment
From MANIFEST.md: "The main HAI3 UI-Core objective is to achieve the max possible efficiency of the application screens generation by AI."

This refactoring directly supports this mission by ensuring AI assistants receive only relevant, actionable rules for their context.

### Stakeholders
- HAI3 framework developers (monorepo) - Need full rules including package internals
- HAI3-based application developers (standalone) - Need screenset/app rules only
- AI IDEs: Claude Code, Cursor, Windsurf, Cline, Aider

### Constraints
- CLI already uses template-based approach via `copy-templates.ts`
- All AI docs MUST comply with `.ai/targets/AI.md` format rules
- OpenSpec commands MUST remain prefixed with `openspec:` for CLI updates
- Standalone projects MUST NOT receive framework-internal rules

## Goals / Non-Goals

### Goals
- Single source of truth for AI rules per context
- Clear separation: standalone vs monorepo rules
- AI-optimized format (under 100 lines, keyword-driven, ASCII only)
- Consistent `hai3:` prefix for standalone commands
- CLI-driven AI config updates via `hai3 update`
- Template-based (no inline modifications in scripts)

### Non-Goals
- Runtime AI command execution
- Custom per-project command extensions (future scope)
- Merging/diffing AI configs (full replacement on update)

## Decisions

### Decision 1: Rule Classification by File

| File | Standalone | Monorepo | Rationale |
|------|-----------|----------|-----------|
| **GUIDELINES.md** | Subset | Full | Routing differs by context |
| **SCREENSETS.md** | YES | YES | Core pattern for app development |
| **EVENTS.md** | YES | YES | Core architecture pattern |
| **API.md** | Modified | Full | Remove package scope for standalone |
| **STYLING.md** | YES | YES | Applies to all styling |
| **THEMES.md** | Modified | Full | Remove package references |
| **UICORE.md** | NO | YES | Framework internals only |
| **UIKIT.md** | NO | YES | Framework internals only |
| **UIKIT_CONTRACTS.md** | NO | YES | Framework internals only |
| **STUDIO.md** | NO | YES | Framework internals only |
| **CLI.md** | NO | YES | Framework internals only |
| **AI.md** | NO | YES | Meta-rules for AI doc format |
| **MCP_TROUBLESHOOTING.md** | YES | YES | Browser testing applies to all |

### Decision 2: GUIDELINES.md Modifications for Standalone

**Remove from ROUTING:**
```
- API base classes (uicore) -> .ai/targets/API.md
- packages/uicore -> .ai/targets/UICORE.md
- packages/uikit -> .ai/targets/UIKIT.md
- packages/uikit-contracts -> .ai/targets/UIKIT_CONTRACTS.md
- packages/studio -> .ai/targets/STUDIO.md
- packages/cli -> .ai/targets/CLI.md
- presets/standalone, presets/monorepo -> .ai/targets/CLI.md
- .ai documentation -> .ai/targets/AI.md
```

**Remove from STOP CONDITIONS:**
```
- Editing /core/runtime or /sdk.
- Changing contracts in @hai3/uikit-contracts.
```

**Keep unchanged:**
```
- Modifying registry root files.
- Adding new top-level dependencies.
- Bypassing rules in EVENTS.md.
- Killing MCP server processes.
```

### Decision 3: API.md Modifications for Standalone

**Remove SCOPE section** (references packages/uicore/src/api/**)

**Remove STOP CONDITIONS:**
- Editing BaseApiService or apiRegistry.ts (standalone can't edit these)

**Keep:**
- Usage rules about apiRegistry.getService()
- Mock data rules
- Service creation patterns (reference SCREENSETS.md)

### Decision 4: Commands-Only Approach (No Workflows)

**Current problem:**
- `.ai/workflows/VALIDATE_CHANGES.md` - 24 lines, declarative (WHEN/GOAL/CHECKS)
- `.claude/commands/validate.md` - 25 lines, procedural steps
- Both describe the same thing in different formats
- Commands duplicate workflow content + add own details
- `fix-violation.md` duplicates GUIDELINES.md routing table

**Solution: Eliminate workflows, use commands as single source**
- `.ai/commands/` contains the canonical command content
- IDE folders (`.claude/`, `.cursor/`, etc.) contain thin adapters
- No separate "workflows" concept - commands ARE the workflows

**Benefits:**
- Single source of truth for each operation
- No duplication between workflow and command files
- Clearer mental model: everything is a "command"
- DRY across IDEs: one content file, multiple adapters

### Decision 5: Directory Structure

```
presets/
  standalone/
    ai/                           # NEW: Standalone AI preset
      .ai/
        GUIDELINES.md             # Standalone routing (subset)
        MCP_TROUBLESHOOTING.md
        targets/
          SCREENSETS.md           # Full copy
          EVENTS.md               # Full copy
          API.md                  # Modified (no package scope)
          STYLING.md              # Full copy
          THEMES.md               # Modified (app scope only)
        commands/                 # Canonical command content (replaces workflows/)
          hai3-validate.md        # Full validation steps (was VALIDATE_CHANGES.md)
          hai3-fix-violation.md   # Full fix steps (was FIX_RULE_VIOLATION.md)
          hai3-new-screenset.md
          hai3-new-screen.md
          hai3-new-component.md
          hai3-new-action.md
          hai3-new-api-service.md
          hai3-quick-ref.md
          hai3-duplicate-screenset.md
          hai3-update-guidelines.md
      .claude/commands/           # Claude adapters (thin wrappers)
      .cursor/rules/, commands/   # Cursor adapters
      .windsurf/rules/            # Windsurf adapters (no workflows/ subfolder)
      .cline/                     # Cline config
      .aider/                     # Aider config
      openspec/                   # OpenSpec for standalone
        project.md                # Template project context
        AGENTS.md                 # OpenSpec instructions

  monorepo/
    ai/                           # Extends standalone conceptually
      .ai/
        GUIDELINES.md             # Full routing table
        targets/
          UICORE.md
          UIKIT.md
          UIKIT_CONTRACTS.md
          STUDIO.md
          CLI.md
          AI.md
        commands/
          hai3dev-publish.md
          hai3dev-test-packages.md
          hai3dev-release.md
```

### Decision 6: Template Integration in copy-templates.ts

```typescript
const config = {
  // Existing directories (REMOVE .ai, .cursor, .windsurf)
  directories: [
    'src/themes',
    'src/uikit',
    'src/icons',
    'eslint-plugin-local',
    'presets/standalone',  // Already includes configs/, scripts/
  ],

  // NEW: AI configuration from standalone preset
  standaloneAiConfig: [
    { src: 'presets/standalone/ai/.ai', dest: '.ai' },
    { src: 'presets/standalone/ai/.claude', dest: '.claude' },
    { src: 'presets/standalone/ai/.cursor', dest: '.cursor' },
    { src: 'presets/standalone/ai/.windsurf', dest: '.windsurf' },
    { src: 'presets/standalone/ai/.cline', dest: '.cline' },
    { src: 'presets/standalone/ai/.aider', dest: '.aider' },
    { src: 'presets/standalone/ai/openspec', dest: 'openspec' },
  ],
};
```

### Decision 7: Command Naming Convention

| Context | Prefix | Example | Updated By |
|---------|--------|---------|------------|
| Standalone commands | `hai3:` | `hai3:new-screenset` | `hai3 update` |
| OpenSpec commands | `openspec:` | `openspec:proposal` | `openspec update` |
| Monorepo-only | `hai3dev:` | `hai3dev:publish` | Manual |

**Rationale:**
- `hai3:` clearly identifies HAI3 framework commands, updated by CLI
- `openspec:` stays unchanged so `openspec update` can manage them
- `hai3dev:` indicates framework development commands (not shipped to standalone)

### Decision 8: AI.md Compliance Requirements

All AI documentation files MUST comply with:
- Under 100 lines per file
- ASCII only (no unicode, emojis, smart quotes)
- One concern per file
- Keywords: MUST, REQUIRED, FORBIDDEN, STOP, DETECT, BAD, GOOD
- Rule format: single-line bullets, no multi-line examples
- No duplicated rules across files
- Section structure starts with AI WORKFLOW or CRITICAL RULES

### Decision 9: IDE Adapter Pattern

Each IDE folder contains minimal adapters that reference canonical `.ai/commands/`:

```markdown
# .claude/commands/hai3-validate.md
---
description: Validate changes before commit following HAI3 guidelines
---
Use `.ai/commands/hai3-validate.md` as the single source of truth.
```

### Decision 10: AI Command Maintenance Rules (for AI.md)

The following rules SHALL be added to `.ai/targets/AI.md` to guide future command creation/modification:

**COMMAND LOCATION**
- REQUIRED: All canonical command content in `.ai/commands/` (not IDE folders)
- REQUIRED: IDE folders (`.claude/`, `.cursor/`, etc.) contain thin adapters only
- FORBIDDEN: Command logic in IDE-specific folders

**NAMING CONVENTIONS**
- REQUIRED: Standalone commands use `hai3-` filename prefix (e.g., `hai3-validate.md`)
- REQUIRED: Monorepo-only commands use `hai3dev-` prefix (e.g., `hai3dev-publish.md`)
- FORBIDDEN: Unprefixed command files (except openspec: commands)
- FORBIDDEN: Changing openspec: prefix (managed by openspec update)

**COMMAND STRUCTURE**
- REQUIRED: Commands are self-contained with full procedural steps
- FORBIDDEN: References to external workflow files
- FORBIDDEN: Duplicating GUIDELINES.md routing table in commands
- REQUIRED: Commands follow AI.md format rules (under 100 lines, ASCII, keywords)

**STANDALONE VS MONOREPO**
- Standalone commands: Operations for HAI3-based app development
  - Screenset creation, validation, component creation, API services
- Monorepo commands: Operations for HAI3 framework development
  - Publishing, package testing, release management
- REQUIRED: Standalone commands must not reference packages/* paths

**IDE ADAPTER PATTERN**
```markdown
# .claude/commands/hai3-example.md
---
description: Short description for IDE autocomplete
---
Use `.ai/commands/hai3-example.md` as the single source of truth.
```

**UPDATE MECHANISM**
- `hai3:` commands → Updated by `hai3 update`
- `openspec:` commands → Updated by `openspec update`
- `hai3dev:` commands → Manual updates (not shipped to standalone)

**ADDING A NEW COMMAND**
1. Create canonical file in `.ai/commands/hai3-<name>.md`
2. Follow AI.md format rules
3. Create adapter in each IDE folder
4. Add to copy-templates.ts standaloneAiConfig (if standalone)
5. Verify with `npm run arch:check`

**MODIFYING EXISTING COMMANDS**
1. Edit ONLY the canonical file in `.ai/commands/`
2. IDE adapters auto-update (they just reference canonical)
3. Changes propagate via `hai3 update` to standalone projects

### Decision 11: Update Command AI Sync

```typescript
// hai3 update behavior
interface UpdateCommandResult {
  cliUpdated: boolean;
  projectUpdated: boolean;
  updatedPackages: string[];
  aiConfigsUpdated: boolean;  // NEW
  channel: 'alpha' | 'stable';
}

// AI config sync:
// 1. Read AI configs from @hai3/cli package (bundled templates)
// 2. Copy to project root (.ai/, .claude/, etc.)
// 3. Preserve openspec/ (managed by openspec update separately)
// 4. Report which files were updated
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | Gradual migration with deprecation warnings |
| Rules drift between contexts | Automated compliance verification script |
| IDE format incompatibility | Testing across all supported IDEs |
| Template sync issues | Version tracking in hai3.config.json |

## Migration Plan

### Phase 1: Create Standalone AI Preset
1. Create `presets/standalone/ai/` directory structure
2. Create standalone GUIDELINES.md with subset routing
3. Modify API.md and THEMES.md for standalone context
4. Copy applicable targets: SCREENSETS.md, EVENTS.md, STYLING.md
5. Create hai3-prefixed commands
6. Verify AI.md compliance for all files

### Phase 2: Create IDE Adapters
1. Create Claude Code adapters in `.claude/commands/`
2. Create Cursor adapters in `.cursor/`
3. Create Windsurf adapters in `.windsurf/`
4. Create Cline configuration
5. Create Aider configuration

### Phase 3: Update CLI
1. Modify copy-templates.ts to use standalone AI preset
2. Update project.ts if needed for new structure
3. Add AI config sync to `hai3 update`
4. Test project creation and update flows

### Phase 4: Create Monorepo AI Preset
1. Create `presets/monorepo/ai/` with framework-specific targets
2. Create hai3dev-prefixed commands
3. Update HAI3 repo to use monorepo preset

### Phase 5: Migrate HAI3 Repo
1. Update root `.claude/`, `.cursor/`, `.windsurf/` to reference presets
2. Rename commands with new prefixes
3. Remove deprecated files
4. Verify all IDEs work correctly

## Open Questions

1. Should we version AI configs independently from CLI version?
   - Current decision: No, tightly coupled for simplicity

2. Should standalone projects get openspec integration by default?
   - Decision: YES, shipped with openspec: prefix unchanged
