# Design: Layer-Aware AI Configuration

## Context

HAI3 uses a four-layer SDK architecture:
- **L1 (SDK)**: `@hai3/state`, `@hai3/api`, `@hai3/i18n`, etc. - Zero @hai3 dependencies
- **L2 (Framework)**: `@hai3/framework` - Plugin-based composition
- **L3 (React)**: `@hai3/react` - React bindings
- **App**: Full application with all layers

When creating projects with `hai3 create --layer`, both AI commands AND rules/guidelines should match the layer's capabilities.

## Goals

- Commands provide layer-appropriate guidance
- Rules/targets filtered to layer-relevant content
- GUIDELINES.md routing matches available targets
- No irrelevant AI configuration for simpler layers
- Seamless inheritance (React gets Framework + SDK)
- Minimal maintenance overhead

## Non-Goals

- Runtime command/rule discovery (requires npm install)
- Template preprocessing (adds complexity)
- Dynamic content generation

## Decisions

### 1. Layer Variant Naming Convention

**Decision**: Use dot-suffixed variants: `<command>.<layer>.md`

```
packages/api/commands/
  hai3-new-api-service.md        # Base (SDK layer)
  hai3-new-api-service.framework.md  # Framework layer variant
  hai3-new-api-service.react.md      # React/App layer variant
```

**Rationale**:
- Clear association with base command
- Easy glob matching (`hai3-*.{layer}.md`)
- Alphabetically groups variants

**Alternatives considered**:
- Subdirectories (`sdk/hai3-new-api-service.md`) - Harder to discover related variants
- Prefixes (`sdk.hai3-new-api-service.md`) - Breaks alphabetical grouping by command name

### 2. Variant Selection Logic (Cascade)

**Decision**: Most-specific-first with fallback chain

```
Layer       | Priority Order
------------|---------------------------
sdk         | .sdk.md → .md
framework   | .framework.md → .sdk.md → .md
react       | .react.md → .framework.md → .sdk.md → .md
app         | .react.md → .framework.md → .sdk.md → .md
```

**Rationale**:
- Inherits from simpler layers (DRY)
- Only override when layer needs different guidance
- `.md` (no suffix) serves as SDK default

**Command Exclusion Mechanism**:
When `selectVariant()` returns `null`, the command is excluded entirely. This happens when:
- A command has NO base `.md` file AND no layer-specific variant matching the fallback chain
- Example: `packages/react/commands/hai3-new-screenset.md` (React-only, no .sdk.md or .framework.md)
  - For SDK layer: fallback tries `.sdk.md` → `.md`, neither exists → returns `null` → excluded
  - For React/App layer: fallback tries `.react.md` → `.framework.md` → `.sdk.md` → `.md`, finds `.md` → included

**Package-Origin Layer Tagging**:
Commands are NOT implicitly tagged by package location. A command in `packages/react/commands/` CAN be available to SDK layers IF it has a `.sdk.md` variant or base `.md` file. The exclusion is based purely on variant availability, not package origin.

**Implementation**:
```typescript
function selectVariant(baseName: string, layer: LayerType, variants: string[]): string | null {
  const priorities: Record<LayerType, string[]> = {
    sdk: ['.sdk.md', '.md'],
    framework: ['.framework.md', '.sdk.md', '.md'],
    react: ['.react.md', '.framework.md', '.sdk.md', '.md'],
    app: ['.react.md', '.framework.md', '.sdk.md', '.md'],
  };

  for (const suffix of priorities[layer]) {
    const candidate = baseName.replace('.md', suffix);
    if (variants.includes(candidate)) return candidate;
  }
  return null; // Command excluded - no applicable variant
}
```

### 3. Command Content Differences

**Decision**: Layer variants focus on what's available at that layer

| Layer | API Service Command Guidance |
|-------|------------------------------|
| SDK | Create `BaseApiService` subclass, register with `apiRegistry` |
| Framework | + Action integration, store bindings |
| React | + React hooks (`useApi`), component integration |

### 4. Two-Stage Template Pipeline

**Decision**: Bundle ALL variants at CLI build time, select at project creation time

**Stage 1: CLI Package Build (`copy-templates.ts`)**
- Runs when publishing `@hai3/cli` to npm
- Bundles ALL command variants (.md, .sdk.md, .framework.md, .react.md) into `templates/`
- Bundles ALL target files into `templates/.ai/targets/`
- Bundles ALL GUIDELINES.md variants into `templates/.ai/`
- No layer filtering at this stage

**Stage 2: Project Creation (`generateProject()` / `generateLayerPackage()`)**
- Runs when user executes `hai3 create my-project --layer sdk`
- Reads bundled templates from CLI package
- Applies `selectVariant()` to pick appropriate command variant per layer
- Applies `filterTargetsByLayer()` to select appropriate targets
- Copies selected GUIDELINES.md variant based on layer
- Writes filtered results to new project

**Rationale**:
- CLI package contains all possibilities; user chooses at creation time
- No npm install required for commands (bundled in CLI)
- Layer selection is user-driven, not fixed at CLI publish time
- Same CLI package works for all layer types

**File Flow**:
```
CLI Build Time (npm run build:packages:cli):
  packages/*/commands/*.md → templates/commands-bundle/
  .ai/targets/*.md → templates/.ai/targets/
  ai-overrides/GUIDELINES.*.md → templates/.ai/

Project Creation Time (hai3 create --layer X):
  templates/commands-bundle/ → selectVariant(layer) → project/.claude/commands/
  templates/.ai/targets/ → filterTargetsByLayer(layer) → project/.ai/targets/
  templates/.ai/GUIDELINES.{layer}.md → project/.ai/GUIDELINES.md
```

### 5. Layer-Aware Targets

**Decision**: Filter `.ai/targets/` files based on layer, with explicit mapping

```typescript
const TARGET_LAYERS: Record<string, LayerType[]> = {
  // SDK layer targets (available to all)
  'API.md': ['sdk', 'framework', 'react', 'app'],
  'STORE.md': ['sdk', 'framework', 'react', 'app'],
  'EVENTS.md': ['sdk', 'framework', 'react', 'app'],
  'I18N.md': ['sdk', 'framework', 'react', 'app'],

  // Framework layer targets
  'FRAMEWORK.md': ['framework', 'react', 'app'],
  'LAYOUT.md': ['framework', 'react', 'app'],
  'THEMES.md': ['framework', 'react', 'app'],

  // React/App layer targets
  'REACT.md': ['react', 'app'],
  'SCREENSETS.md': ['react', 'app'],
  'STYLING.md': ['react', 'app'],
  'UIKIT.md': ['react', 'app'],
  'STUDIO.md': ['react', 'app'],

  // Always included (meta/tooling)
  'AI.md': ['sdk', 'framework', 'react', 'app'],
  'AI_COMMANDS.md': ['sdk', 'framework', 'react', 'app'],
  'CLI.md': ['sdk', 'framework', 'react', 'app'],
};
```

**Rationale**:
- Explicit mapping is clear and maintainable
- Easy to add new targets
- No complex inheritance logic needed for targets

### 6. Layer-Aware GUIDELINES.md

**Decision**: Store pre-built layer variants in `ai-overrides/`, select at project creation time

**Variant Files**:
- `GUIDELINES.sdk.md` - SDK layer routing only
- `GUIDELINES.framework.md` - SDK + Framework routing
- `GUIDELINES.md` - Full routing (React/App, default)

**Content Structure** (identical across all variants EXCEPT routing):
```markdown
# HAI3 AI Guidelines (Canonical)

## AI WORKFLOW (REQUIRED)          ← IDENTICAL
## CRITICAL RULE                   ← IDENTICAL
## ROUTING                         ← DIFFERS BY LAYER
## REPO INVARIANTS                 ← IDENTICAL
## IMPORT RULES                    ← IDENTICAL
## TYPE RULES                      ← IDENTICAL
## STOP CONDITIONS                 ← IDENTICAL (references available targets only)
## PRE-DIFF CHECKLIST              ← IDENTICAL
## BLOCKLIST                       ← IDENTICAL
## DOC STYLE                       ← IDENTICAL
## CORRECTION POLICY               ← IDENTICAL
```

**ROUTING Section Differences**:

SDK layer (`GUIDELINES.sdk.md`):
```markdown
## ROUTING
### SDK Layer (L1)
- packages/state -> .ai/targets/STORE.md
- packages/api -> .ai/targets/API.md
- packages/i18n -> .ai/targets/I18N.md
- Event patterns -> .ai/targets/EVENTS.md
### Tooling
- .ai documentation -> .ai/targets/AI.md
- .ai/commands -> .ai/targets/AI_COMMANDS.md
```

Framework layer (`GUIDELINES.framework.md`):
```markdown
## ROUTING
### SDK Layer (L1)
- packages/state -> .ai/targets/STORE.md
- packages/api -> .ai/targets/API.md
- packages/i18n -> .ai/targets/I18N.md
### Framework Layer (L2)
- packages/framework -> .ai/targets/FRAMEWORK.md
- Layout patterns -> .ai/targets/LAYOUT.md
- Theme patterns -> .ai/targets/THEMES.md
### Tooling
- .ai documentation -> .ai/targets/AI.md
- .ai/commands -> .ai/targets/AI_COMMANDS.md
```

React/App layer (`GUIDELINES.md` - full):
```markdown
## ROUTING
### SDK Layer (L1) - Zero @hai3 dependencies
... (all SDK routes)
### Framework Layer (L2) - Depends on SDK packages
... (all Framework routes)
### React Layer (L3) - Depends on Framework
- packages/react -> .ai/targets/REACT.md
### UI and Dev Packages
- packages/uikit -> .ai/targets/UIKIT.md
- packages/studio -> .ai/targets/STUDIO.md
### Other
- src/screensets -> .ai/targets/SCREENSETS.md
- src/themes -> .ai/targets/THEMES.md
- Styling anywhere -> .ai/targets/STYLING.md
... (all routes)
```

### 7. Layer Taxonomy

**Decision**: Four layers with `app` as default

| Layer | CLI Flag | Description | Content |
|-------|----------|-------------|---------|
| `sdk` | `--layer sdk` | SDK package development | SDK targets + commands only |
| `framework` | `--layer framework` | Framework package development | + Framework targets/commands |
| `react` | `--layer react` | React binding development | + React targets/commands |
| `app` | (default, no flag) | Full application | All targets + commands |

**Clarification**:
- `app` and `react` have IDENTICAL content (all commands, all targets)
- `app` is the user-facing default for application projects
- `react` is explicit for React-layer package development
- Current CLI supports `--layer sdk|framework|react`; `app` is the implicit default when no `--layer` flag is provided

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Maintenance burden of command variants | Only create variants where content differs; base `.md` covers most cases |
| Missing command variant | Fallback chain ensures a command is always found if base exists |
| Stale variants | Part of normal command maintenance; variants tested with layer-specific projects |
| Target mapping out of sync | TARGET_LAYERS constant is single source of truth; add tests |
| GUIDELINES.md routing drift | Generate routing from TARGET_LAYERS, not manually maintained |

## Migration Plan

1. **Phase 1**: Core infrastructure
   - Add TARGET_LAYERS mapping constant
   - Add layer parameter to `bundlePackageCommands()` and `scanForMarkedFiles()`
   - Implement command variant selection with fallback chain

2. **Phase 2**: Layer-filtered targets
   - Filter `.ai/targets/` copying based on TARGET_LAYERS
   - Create layer-specific GUIDELINES.md variants (or generate routing section)

3. **Phase 3**: Command variants
   - Create `hai3-new-api-service.framework.md` and `.react.md`
   - Create other layer variants as needed based on feedback

4. **Phase 4**: Validation
   - Test all layer types with `hai3 create`
   - Verify commands and targets match layer expectations

## Resolved Design Questions

### Q1: Should `hai3 update` resync commands/rules based on current layer?
**Decision**: YES - `hai3 update` SHALL read layer from `hai3.config.json` and resync commands/rules accordingly.

**Rationale**: Without this, users cannot update their project's AI configuration after initial creation. The layer is stable metadata that should drive updates.

### Q2: Should layer be stored in `hai3.config.json` for future reference?
**Decision**: YES - Store layer in `hai3.config.json`:
```json
{
  "hai3": true,
  "layer": "sdk"
}
```

**Rationale**:
- Enables `hai3 update` to know which layer to use
- Documents project's architectural tier
- Standard practice in scaffolding tools (Cookiecutter, Yeoman)

### Q3: Generate GUIDELINES.md at build time vs. store layer variants in `ai-overrides/`?
**Decision**: Store pre-built layer variants in `ai-overrides/`:
- `ai-overrides/GUIDELINES.sdk.md`
- `ai-overrides/GUIDELINES.framework.md`
- `ai-overrides/GUIDELINES.md` (React/App default)

**Rationale**:
- Simpler than build-time generation
- Variants are human-readable and editable
- Easy to diff and review changes
- No template processing complexity

## Error Handling

### Invalid Layer Parameter
**Scenario**: User provides `--layer invalid`
**Behavior**: CLI SHALL reject with error message listing valid options
```
Error: Invalid layer 'invalid'. Valid options: sdk, framework, react
```

### Missing Command Variant File
**Scenario**: Variant file referenced but missing from templates
**Behavior**:
- Log warning: `Warning: Command variant 'hai3-x.framework.md' not found, skipping`
- Continue processing other commands
- Do NOT fail project creation

### Missing Target File
**Scenario**: Target listed in TARGET_LAYERS but file doesn't exist
**Behavior**:
- Log warning: `Warning: Target 'EVENTS.md' not found in templates, skipping`
- Continue processing other targets
- Do NOT fail project creation

### Malformed Variant File
**Scenario**: Variant file exists but has invalid content (empty, no frontmatter, etc.)
**Behavior**:
- Copy file as-is (content validation is not CLI's responsibility)
- AI assistant will handle malformed content at usage time

### Missing GUIDELINES.md Variant
**Scenario**: Layer-specific GUIDELINES variant not found
**Behavior**:
- Fall back to base `GUIDELINES.md`
- Log warning: `Warning: GUIDELINES.sdk.md not found, using default GUIDELINES.md`

### Missing hai3.config.json (for `hai3 update`)
**Scenario**: `hai3 update` run in project without `hai3.config.json`
**Behavior**:
- Assume layer is `app` (full content, backward compatible)
- Log info: `Info: No hai3.config.json found, assuming 'app' layer`
