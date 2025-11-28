# Tasks: Refactor AI Commands

## Implementation Summary

This change implements a marker-based architecture where root `.ai/` is the single source of truth for all AI rules and commands. Files are marked with HTML comments to indicate whether they should be included in standalone projects.

## Completed Tasks

### Phase 1: Add Markers to Root .ai/ Files

- [x] Add `<!-- @standalone -->` marker to verbatim files:
  - MCP_TROUBLESHOOTING.md
  - targets/SCREENSETS.md
  - targets/EVENTS.md
  - targets/STYLING.md
  - commands/hai3-validate.md
  - commands/hai3-fix-violation.md
  - commands/hai3-new-screenset.md
  - commands/hai3-new-screen.md
  - commands/hai3-new-component.md
  - commands/hai3-new-action.md
  - commands/hai3-new-api-service.md
  - commands/hai3-quick-ref.md
  - commands/hai3-duplicate-screenset.md
  - commands/hai3-update-guidelines.md

- [x] Add `<!-- @standalone:override -->` marker to files with standalone versions:
  - GUIDELINES.md
  - targets/API.md
  - targets/THEMES.md

### Phase 2: Clean Up presets/standalone/ai/.ai/

- [x] Keep only override files:
  - .ai/GUIDELINES.md (standalone version)
  - .ai/targets/API.md (standalone version)
  - .ai/targets/THEMES.md (standalone version)

- [x] Delete files now generated from root:
  - .ai/MCP_TROUBLESHOOTING.md
  - .ai/targets/SCREENSETS.md
  - .ai/targets/EVENTS.md
  - .ai/targets/STYLING.md
  - .ai/commands/ (entire directory)

### Phase 3: Delete Redundant Monorepo Preset

- [x] Delete presets/monorepo/ai/ directory
  - Root .ai/ is the canonical source for monorepo
  - No need for a separate monorepo template

### Phase 4: Update copy-templates.ts

- [x] Add `getStandaloneMarker()` function to detect markers
- [x] Add `scanForMarkedFiles()` function to recursively scan .ai/
- [x] Update build process:
  - Scan root .ai/ for @standalone markers -> copy verbatim
  - For @standalone:override markers -> copy from presets/standalone/ai/.ai/
  - Skip files without markers (monorepo-only)
  - Copy IDE configs from presets/standalone/ai/
- [x] Update manifest.json to include marker information

### Phase 5: Verification

- [x] Run npm run build:packages - SUCCESS
- [x] Verify templates/.ai/ contains correct files:
  - 14 standalone files (from root)
  - 3 override files (from presets/standalone/ai/)
- [x] Run npm run type-check - SUCCESS
- [x] Run npm run lint - SUCCESS

### Phase 6: Update OpenSpec Documents

- [x] Update design.md with marker-based architecture
- [x] Update tasks.md with implementation summary

### Phase 7: Generate Command Adapters (Option C)

- [x] Delete hai3-* command adapters from presets/standalone/ai/.claude/commands/
  - Kept openspec/ subdirectory (managed by openspec)
- [x] Add `extractCommandDescription()` function to copy-templates.ts
  - Extracts description from H1 header: `# hai3:cmd-name - Description`
- [x] Add `generateCommandAdapters()` function to copy-templates.ts
  - Generates .claude/commands/hai3-*.md from @standalone markers
  - Creates thin adapters with description + reference
- [x] Update manifest.json to track generated adapters
- [x] Verification:
  - Build passes: 10 generated adapters
  - type-check passes
  - lint passes

## Architecture After Implementation

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
│   │   ├── UICORE.md                 # (monorepo only)
│   │   ├── UIKIT.md                  # (monorepo only)
│   │   └── ...
│   └── commands/
│       ├── hai3-*.md                 # <!-- @standalone --> (10 commands)
│       └── hai3dev-*.md              # (monorepo only, 3 commands)
│
├── presets/standalone/ai/            # Override files + IDE global configs
│   ├── .ai/                          # Only 3 override files
│   │   ├── GUIDELINES.md
│   │   └── targets/
│   │       ├── API.md
│   │       └── THEMES.md
│   ├── .claude/commands/openspec/    # OpenSpec adapters only (stored)
│   ├── .cursor/rules/                # IDE global rules (stored)
│   ├── .windsurf/rules/              # IDE global rules (stored)
│   ├── .cline/                       # IDE config (stored)
│   ├── .aider/                       # IDE config (stored)
│   └── openspec/

├── packages/cli/templates/           # Generated output
│   ├── .ai/                          # 14 standalone + 3 override files
│   ├── .claude/commands/             # 10 GENERATED + openspec/ copied
│   └── ...
```

## Maintenance Guide

### To edit a shared rule (e.g., SCREENSETS.md):
1. Edit root `.ai/targets/SCREENSETS.md`
2. Run `npm run build:packages`
3. Changes automatically propagate to templates

### To edit an override file (e.g., API.md):
1. Edit root `.ai/targets/API.md` (if monorepo behavior changes)
2. Edit `presets/standalone/ai/.ai/targets/API.md` (if standalone behavior changes)
3. Run `npm run build:packages`

### To add a new standalone command:
1. Create `.ai/commands/hai3-newcmd.md` with `<!-- @standalone -->` marker
2. Include H1 header: `# hai3:newcmd - Description Here`
3. Run `npm run build:packages`
4. Adapter is AUTOMATICALLY GENERATED in templates/.claude/commands/

### To add a monorepo-only command:
1. Create `.ai/commands/hai3dev-newcmd.md` (no marker)
2. Create adapter in `.claude/commands/hai3dev-newcmd.md`
3. No template changes needed

## File Counts

| Location | Files | Description |
|----------|-------|-------------|
| Root .ai/ | 24 | All rules and commands |
| presets/standalone/ai/.ai/ | 3 | Override files only |
| presets/standalone/ai/.claude/commands/ | 3 | OpenSpec adapters only |
| templates/.ai/ | 17 | 14 standalone + 3 override |
| templates/.claude/commands/ | 13 | 10 generated + 3 openspec |
