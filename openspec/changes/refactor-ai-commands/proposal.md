# Change: Refactor AI Commands Architecture

## Why

HAI3 AI configuration is scattered across IDE-specific folders with duplicated content and no separation between framework development (monorepo) and application development (standalone). The current `copy-templates.ts` copies the full monorepo `.ai/`, `.cursor/`, `.windsurf/` directories to standalone projects, including rules that only apply to framework internals (packages/*, presets/*).

This causes:
1. AI assistants in standalone projects receive irrelevant rules about framework internals
2. STOP conditions reference packages they cannot edit
3. Routing table includes targets that don't exist in standalone projects
4. No clear command naming convention across different tools

## What Changes

### 1. Commands-Only Approach (Eliminate Workflows)

**Current problem:**
- `.ai/workflows/` contains declarative files (WHEN/GOAL/CHECKS format)
- `.claude/commands/` contains procedural steps for same operations
- Duplication: `fix-violation.md` duplicates GUIDELINES.md routing table
- Confusing terminology: "workflow" vs "command" unclear

**Solution:**
- Eliminate `.ai/workflows/` directory entirely
- `.ai/commands/` contains canonical command content (full procedural steps)
- IDE folders contain thin adapters pointing to `.ai/commands/`
- Single source of truth per operation

### 2. Split AI Rules by Context

**Standalone GUIDELINES.md ROUTING (subset):**
```
- Data flow / events -> .ai/targets/EVENTS.md
- API services (screenset-owned) -> .ai/targets/SCREENSETS.md
- src/screensets -> .ai/targets/SCREENSETS.md
- src/themes -> .ai/targets/THEMES.md
- Styling anywhere -> .ai/targets/STYLING.md
```

**Monorepo-only ROUTING additions:**
```
- API base classes (uicore) -> .ai/targets/API.md
- packages/uicore -> .ai/targets/UICORE.md
- packages/uikit -> .ai/targets/UIKIT.md
- packages/uikit-contracts -> .ai/targets/UIKIT_CONTRACTS.md
- packages/studio -> .ai/targets/STUDIO.md
- packages/cli -> .ai/targets/CLI.md
- presets/* -> .ai/targets/CLI.md
- .ai documentation -> .ai/targets/AI.md
```

### 3. Update copy-templates.ts Structure

**Current (problematic):**
```typescript
directories: [
  '.ai',        // Full monorepo rules
  '.cursor',    // Full monorepo adapters
  '.windsurf',  // Full monorepo adapters
  // ...
]
```

**New (template-based):**
```typescript
directories: [
  // Remove .ai, .cursor, .windsurf from here
  'src/themes',
  'src/uikit',
  'src/icons',
  'eslint-plugin-local',
  'presets/standalone',
],
// NEW: AI configs from standalone preset (already in presets/standalone)
standaloneAiConfig: [
  { src: 'presets/standalone/ai/.ai', dest: '.ai' },
  { src: 'presets/standalone/ai/.claude', dest: '.claude' },
  { src: 'presets/standalone/ai/.cursor', dest: '.cursor' },
  { src: 'presets/standalone/ai/.windsurf', dest: '.windsurf' },
  { src: 'presets/standalone/ai/.cline', dest: '.cline' },
  { src: 'presets/standalone/ai/.aider', dest: '.aider' },
  { src: 'presets/standalone/ai/openspec', dest: 'openspec' },
]
```

### 4. Command Prefixing Strategy

| Context | Prefix | Example | Updated By |
|---------|--------|---------|------------|
| Standalone commands | `hai3:` | `hai3:new-screenset` | `hai3 update` |
| OpenSpec commands | `openspec:` | `openspec:proposal` | `openspec update` |
| Monorepo-only | `hai3dev:` | `hai3dev:publish` | Manual |

### 5. AI-Optimized Documentation Format

All AI docs MUST comply with `.ai/targets/AI.md`:
- Files under 100 lines
- ASCII only (no unicode, emojis, smart quotes)
- Keywords: MUST, REQUIRED, FORBIDDEN, STOP, DETECT
- One concern per file
- No duplicated rules across files

### 6. Multi-IDE Support

Target IDEs: Claude Code, Cursor, Windsurf, Cline, Aider
- DRY principle: Single source in `.ai/`, IDE folders are adapters
- Adapters reference canonical `.ai/` files
- All adapters optimized for AI agent consumption

## Impact

- **Affected specs**: cli (update command, create command, copy-templates)
- **Affected code**:
  - `packages/cli/scripts/copy-templates.ts` - Update to use standalone AI preset
  - `packages/cli/src/commands/update/` - Add AI config sync
  - `packages/cli/src/generators/project.ts` - May need adjustment for new structure
  - `presets/standalone/ai/` - NEW: Standalone AI configuration preset
  - `presets/monorepo/ai/` - NEW: Monorepo-only AI configuration additions

### Breaking Changes
- **BREAKING**: Command names change to include prefixes
- **BREAKING**: Standalone projects will have fewer AI rules (only applicable ones)
- **BREAKING**: AI config directories structure changes
