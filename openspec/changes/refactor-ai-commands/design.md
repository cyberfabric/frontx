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
- Single source of truth for AI rules (root `.ai/`)
- Clear separation: standalone vs monorepo rules via markers
- AI-optimized format (under 100 lines, keyword-driven, ASCII only)
- Consistent `hai3-` prefix for standalone commands
- CLI-driven AI config updates via `hai3 update`
- Marker-based generation (no duplication)

### Non-Goals
- Runtime AI command execution
- Custom per-project command extensions (future scope)
- Merging/diffing AI configs (full replacement on update)

## Decisions

### Decision 1: Marker-Based Architecture

**Root `.ai/` is the single source of truth for ALL rules.**

Files use HTML comment markers at the top:
- `<!-- @standalone -->` - Copy verbatim to standalone projects
- `<!-- @standalone:override -->` - Standalone has a different version in `presets/standalone/ai/.ai/`
- No marker - Monorepo-only (not copied to standalone)

This eliminates duplication and ensures a single place to edit rules.

### Decision 2: File Classification

| File | Marker | Rationale |
|------|--------|-----------|
| **GUIDELINES.md** | `@standalone:override` | Routing differs by context |
| **SCREENSETS.md** | `@standalone` | Core pattern for app development |
| **EVENTS.md** | `@standalone` | Core architecture pattern |
| **API.md** | `@standalone:override` | Standalone has simplified version |
| **STYLING.md** | `@standalone` | Applies to all styling |
| **THEMES.md** | `@standalone:override` | Standalone has simplified version |
| **MCP_TROUBLESHOOTING.md** | `@standalone` | Browser testing applies to all |
| **UICORE.md** | (none) | Framework internals only |
| **UIKIT.md** | (none) | Framework internals only |
| **UIKIT_CONTRACTS.md** | (none) | Framework internals only |
| **STUDIO.md** | (none) | Framework internals only |
| **CLI.md** | (none) | Framework internals only |
| **AI.md** | (none) | Meta-rules for AI doc format |

### Decision 3: Command Classification

| Command | Marker | Rationale |
|---------|--------|-----------|
| hai3-validate.md | `@standalone` | App development |
| hai3-fix-violation.md | `@standalone` | App development |
| hai3-new-screenset.md | `@standalone` | App development |
| hai3-new-screen.md | `@standalone` | App development |
| hai3-new-component.md | `@standalone` | App development |
| hai3-new-action.md | `@standalone` | App development |
| hai3-new-api-service.md | `@standalone` | App development |
| hai3-quick-ref.md | `@standalone` | App development |
| hai3-duplicate-screenset.md | `@standalone` | App development |
| hai3-update-guidelines.md | `@standalone` | App development |
| hai3-arch-explain.md | (none) | References monorepo concepts |
| hai3-review-pr.md | (none) | References monorepo targets |
| hai3-rules.md | (none) | References monorepo targets |
| hai3dev-publish.md | (none) | Framework development |
| hai3dev-test-packages.md | (none) | Framework development |
| hai3dev-release.md | (none) | Framework development |

### Decision 4: Directory Structure

```
HAI3/
├── .ai/                              # Canonical source (with markers)
│   ├── GUIDELINES.md                 # <!-- @standalone:override -->
│   ├── MCP_TROUBLESHOOTING.md        # <!-- @standalone -->
│   ├── targets/
│   │   ├── SCREENSETS.md             # <!-- @standalone -->
│   │   ├── EVENTS.md                 # <!-- @standalone -->
│   │   ├── API.md                    # <!-- @standalone:override -->
│   │   ├── STYLING.md                # <!-- @standalone -->
│   │   ├── THEMES.md                 # <!-- @standalone:override -->
│   │   ├── UICORE.md                 # (no marker - monorepo only)
│   │   ├── UIKIT.md                  # (no marker)
│   │   ├── UIKIT_CONTRACTS.md        # (no marker)
│   │   ├── STUDIO.md                 # (no marker)
│   │   ├── CLI.md                    # (no marker)
│   │   ├── AI.md                     # (no marker)
│   │   └── AI_COMMANDS.md            # (no marker)
│   └── commands/
│       ├── hai3-*.md                 # <!-- @standalone --> (most)
│       └── hai3dev-*.md              # (no marker - monorepo only)
│
├── presets/
│   └── standalone/
│       └── ai/                       # Override files + IDE global configs
│           ├── .ai/                  # 3 override files only
│           │   ├── GUIDELINES.md     # Standalone version
│           │   └── targets/
│           │       ├── API.md        # Standalone version
│           │       └── THEMES.md     # Standalone version
│           ├── .claude/commands/     # OpenSpec adapters only (hai3-* GENERATED)
│           │   └── openspec/         # Copied as-is
│           ├── .cursor/rules/        # IDE global rules (stored)
│           ├── .windsurf/rules/      # IDE global rules (stored)
│           ├── .cline/               # IDE config (stored)
│           ├── .aider/               # IDE config (stored)
│           └── openspec/             # OpenSpec template
│
├── packages/cli/templates/           # Generated output
│   ├── .ai/                          # 14 standalone + 3 override files
│   └── .claude/commands/             # 10 GENERATED adapters + openspec/
```

### Decision 5: Template Integration (copy-templates.ts)

```typescript
// Marker-based AI config generation
async function scanForMarkedFiles(dir: string): Promise<MarkedFile[]> {
  // Scan .md files for markers
  // Return files with 'standalone' or 'override' markers
}

async function generateCommandAdapters(commands: string[], dest: string) {
  // Generate .claude/commands/hai3-*.md from @standalone commands
  // Extract description from command file's H1 header
  // Create thin adapter referencing .ai/commands/
}

// Build process:
// 1. Scan root .ai/ for @standalone markers -> copy verbatim
// 2. For @standalone:override markers -> copy from presets/standalone/ai/.ai/
// 3. Skip files without markers (monorepo-only)
// 4. Copy IDE global configs from presets/standalone/ai/ (.cursor/, .cline/, etc.)
// 5. GENERATE command adapters (.claude/commands/hai3-*.md) from marker list
// 6. Copy OpenSpec adapters from presets/standalone/ai/.claude/commands/openspec/
```

### Decision 6: Commands-Only Approach (No Workflows)

**Problem solved:**
- Eliminated `.ai/workflows/` directory
- Commands in `.ai/commands/` are self-contained with full procedural steps
- IDE folders contain thin adapters only

**IDE Adapter Pattern:**
```markdown
# .claude/commands/hai3-validate.md
---
description: Validate changes before commit following HAI3 guidelines
---
Use `.ai/commands/hai3-validate.md` as the single source of truth.
```

### Decision 7: Command Naming Convention

| Context | Prefix | Example | Updated By |
|---------|--------|---------|------------|
| Standalone commands | `hai3-` | `hai3-new-screenset` | `hai3 update` |
| OpenSpec commands | `openspec:` | `openspec:proposal` | `openspec update` |
| Monorepo-only | `hai3dev-` | `hai3dev-publish` | Manual |

### Decision 8: No Separate Monorepo Preset

**Eliminated `presets/monorepo/ai/`** - it was redundant because:
- HAI3 is the only monorepo using these rules
- Root `.ai/` IS the monorepo configuration
- No need for a "monorepo template"

### Decision 9: Maintenance Model

```
Editing rules:
1. Edit root .ai/ (canonical source)
2. If file has @standalone marker, changes propagate automatically
3. If file has @standalone:override marker, edit presets/standalone/ai/.ai/ too
4. Files without markers are monorepo-only

Building templates:
1. npm run build:packages triggers copy-templates.ts
2. Script scans root .ai/ for markers
3. Copies @standalone files verbatim to templates/.ai/
4. Copies override versions for @standalone:override files
5. Copies IDE global configs from presets/standalone/ai/
6. GENERATES .claude/commands/hai3-*.md adapters from @standalone commands
7. Copies OpenSpec adapters from presets/standalone/ai/.claude/commands/openspec/
```

### Decision 10: Update Command AI Sync

```typescript
// hai3 update behavior
interface UpdateCommandResult {
  cliUpdated: boolean;
  projectUpdated: boolean;
  updatedPackages: string[];
  aiConfigsUpdated: boolean;
  aiConfigFiles: string[];
  channel: 'alpha' | 'stable';
}

// AI config sync:
// 1. Read AI configs from @hai3/cli package (bundled templates)
// 2. Copy to project root (.ai/, .claude/, etc.)
// 3. Preserve openspec/ (managed by openspec update separately)
// 4. Report which files were updated
```

### Decision 11: Generated vs Stored Adapters

**Command adapters are GENERATED, not stored.**

| Type | Source | Approach |
|------|--------|----------|
| hai3-* command adapters | Root .ai/commands/ | Generated from @standalone markers |
| OpenSpec command adapters | presets/standalone/ai/.claude/commands/openspec/ | Stored (managed by openspec) |
| IDE global configs | presets/standalone/ai/.cursor/, .cline/, etc. | Stored (IDE-specific formats) |

**Benefits:**
- Zero duplication for hai3-* commands
- Single edit point for command descriptions
- Automatic sync on build

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Override drift | Clear documentation, minimal override files |
| Marker maintenance | Only 3 override files to maintain |
| IDE format incompatibility | Testing across all supported IDEs |
| Template sync issues | Version tracking in hai3.config.json |
| Generated adapter format | Simple pattern, extracted from H1 header |

## Summary

The marker-based architecture provides:
1. **Single source of truth** - Root `.ai/` is canonical
2. **No duplication** - Standalone .ai/ generated, command adapters generated
3. **Clear overrides** - Only 3 files need standalone-specific versions
4. **Automatic propagation** - Changes to root propagate to templates on build
5. **Generated adapters** - .claude/commands/hai3-*.md generated from markers
