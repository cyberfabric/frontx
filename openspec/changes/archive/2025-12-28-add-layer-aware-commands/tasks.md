# Tasks: Add Layer-Aware AI Configuration

## 1. Core Infrastructure

- [x] 1.1 Add `TARGET_LAYERS` mapping constant to `copy-templates.ts`
- [x] 1.2 Add `selectCommandVariant()` function with fallback chain logic
- [x] 1.3 Update `bundlePackageCommands()` to accept `layer` parameter
- [x] 1.4 Implement variant selection: react → framework → sdk → base
- [x] 1.5 Update `generateCommandAdapters()` to accept `layer` parameter

## 2. Layer-Filtered Targets

- [x] 2.1 Add `filterTargetsByLayer()` function using TARGET_LAYERS mapping
- [x] 2.2 Update `scanForMarkedFiles()` to filter targets based on layer
- [x] 2.3 Create layer-specific GUIDELINES.md variants in `ai-overrides/`
  - [x] 2.3.1 `GUIDELINES.sdk.md` - SDK routing only
  - [x] 2.3.2 `GUIDELINES.framework.md` - SDK + Framework routing
  - [x] 2.3.3 `GUIDELINES.md` - Full routing (React/App, default)
- [x] 2.4 Update Stage 1c to select GUIDELINES variant based on layer

## 3. Project Generation Integration

- [x] 3.1 Pass layer from `generateProject()` to template bundling
- [x] 3.2 Pass layer from `generateLayerPackage()` to template bundling
- [x] 3.3 Update CLI build to accept layer parameter for testing

## 4. Command Layer Variants

- [x] 4.1 Create `hai3-new-api-service.framework.md` with action/store guidance
- [x] 4.2 Create `hai3-new-api-service.react.md` with hooks/component guidance
- [x] 4.3 Update base `hai3-new-api-service.md` to focus on SDK patterns
- [x] 4.4 Review `hai3-new-action.md` - verify framework-appropriate (may need variants)
- [x] 4.5 Verify React package commands are react-layer specific (no variants needed)

## 5. Build Pipeline Updates

- [x] 5.1 Add logging for layer-based filtering during `copy-templates.ts`
- [x] 5.2 Update manifest.json output to include layer info
- [x] 5.3 Add layer to runtime manifest for debugging

## 6. Documentation Updates

- [x] 6.1 Update `.ai/targets/AI_COMMANDS.md` with layer variant rules:
  - Add LAYER VARIANTS section with naming convention
  - Document fallback chain (react → framework → sdk → base)
  - Add guidance for creating layer-specific variants
- [x] 6.2 Update `.ai/targets/AI.md` KEYWORDS section:
  - Expand LAYER keyword to reference layer variants

## 7. Validation

- [x] 7.1 Run `npm run build:packages:cli` to rebuild CLI
- [x] 7.2 Test: `hai3 create test-sdk --layer sdk`
  - Verify only SDK targets present in `.ai/targets/`
  - Verify GUIDELINES.md routing matches available targets
  - Verify no React-specific commands present
- [x] 7.3 Test: `hai3 create test-framework --layer framework`
  - Verify SDK + Framework targets present
  - Verify Framework-appropriate GUIDELINES.md routing
  - Verify no React-specific commands present
- [x] 7.4 Test: `hai3 create test-app`
  - Verify all targets present (backward compatibility)
  - Verify all commands present
- [x] 7.5 Run `npm run arch:check` to ensure no regressions
