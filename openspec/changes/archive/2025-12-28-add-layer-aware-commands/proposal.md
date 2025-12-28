# Change: Add Layer-Aware AI Configuration

## Why

Currently, all AI commands AND rules/guidelines from all packages are bundled into every project regardless of layer type. This creates problems:

1. **Irrelevant commands** - SDK-layer projects see React-specific commands like `hai3-new-screenset`
2. **Incorrect guidance** - Commands give React/Framework guidance even for SDK-layer projects
3. **Irrelevant rules** - SDK projects get SCREENSETS.md, REACT.md targets they can't use
4. **Confusing routing** - GUIDELINES.md routes to targets that don't exist at that layer

Both commands and rules should vary based on project layer (sdk, framework, react, app).

## What Changes

### Commands
- **Layer variants** - Commands stored with layer suffixes (e.g., `hai3-new-api-service.framework.md`)
- **Variant selection** - `bundlePackageCommands()` picks most specific variant for target layer
- **Inheritance chain** - React inherits from Framework, Framework inherits from SDK

### Rules/Guidelines
- **Layer-filtered targets** - Only copy applicable `.ai/targets/` files per layer
- **Layer-specific GUIDELINES.md** - Generate routing section based on included targets
- **Same inheritance** - React gets all targets, SDK gets only SDK targets

### Target → Layer Mapping
| Target | SDK | Framework | React/App |
|--------|-----|-----------|-----------|
| API.md | ✓ | ✓ | ✓ |
| STORE.md | ✓ | ✓ | ✓ |
| EVENTS.md | ✓ | ✓ | ✓ |
| I18N.md | ✓ | ✓ | ✓ |
| FRAMEWORK.md | | ✓ | ✓ |
| LAYOUT.md | | ✓ | ✓ |
| THEMES.md | | ✓ | ✓ |
| REACT.md | | | ✓ |
| SCREENSETS.md | | | ✓ |
| STYLING.md | | | ✓ |
| UIKIT.md | | | ✓ |
| STUDIO.md | | | ✓ |

- **Affected specs**: cli

## Impact

- **Affected code**:
  - `packages/cli/scripts/copy-templates.ts` - Layer-aware command and target bundling
  - `packages/cli/src/generators/project.ts` - Pass layer through generation
  - `packages/cli/template-sources/ai-overrides/` - Layer-specific GUIDELINES.md variants
  - `packages/*/commands/*.md` - Add layer-specific variants where needed
- **Affected docs**:
  - `.ai/targets/AI_COMMANDS.md` - Add layer variant naming conventions and fallback chain
  - `.ai/targets/AI.md` - Expand LAYER keyword to reference variants
- **User-facing**: `hai3 create --layer sdk` projects get only SDK-appropriate commands and rules
- **Backward compatible**: Default layer is `app` which gets everything (current behavior)

## Research Basis

Based on industry research:
- [.NET templating](https://github.com/dotnet/templating/wiki/Conditional-processing-and-comment-syntax) - Preprocessor-style conditional content
- [Vue CLI plugins](https://cli.vuejs.org/guide/) - Plugin-based optional features per project type
- [Cursor Rules](https://docs.cursor.com/context/rules) - Glob-based rule scoping
- [Cookiecutter](https://cookiecutter.readthedocs.io/) - Template variants with Jinja2 conditionals

The layer-variant pattern was chosen for:
- No template processing needed (pure file selection)
- Easy to maintain (each layer's content is explicit)
- Clear inheritance (React → Framework → SDK)
