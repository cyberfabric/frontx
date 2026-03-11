/**
 * Layer-aware filtering utilities for SDK architecture
 *
 * Provides shared constants and functions for layer-based filtering of:
 * - .ai/targets/ files
 * - Command variants
 * - GUIDELINES.md variants
 */
// @cpt-algo:cpt-hai3-algo-cli-tooling-select-command-variant:p1
// @cpt-dod:cpt-hai3-dod-cli-tooling-layer-variants:p1

/**
 * Layer types for SDK architecture
 */
export type LayerType = 'sdk' | 'framework' | 'react' | 'app';

/**
 * Mapping of .ai/targets/ files to their applicable layers
 *
 * SDK layer targets are available to all layers (inheritance)
 * Framework adds to SDK, React/App adds to Framework
 */
export const TARGET_LAYERS: Record<string, LayerType[]> = {
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

/**
 * Check if a target file should be included for the given layer
 *
 * @param targetFileName - Target filename (e.g., "REACT.md")
 * @param layer - Target layer
 * @returns true if target should be included for this layer
 */
export function isTargetApplicableToLayer(targetFileName: string, layer: LayerType): boolean {
  const applicableLayers = TARGET_LAYERS[targetFileName];
  if (!applicableLayers) {
    // Not in mapping - include by default for backward compatibility
    return true;
  }
  return applicableLayers.includes(layer);
}

/**
 * Select the most specific command variant for the given layer
 *
 * Implements fallback chain:
 * - sdk: .sdk.md → .md
 * - framework: .framework.md → .sdk.md → .md
 * - react: .react.md → .framework.md → .sdk.md → .md
 * - app: .react.md → .framework.md → .sdk.md → .md
 *
 * @param baseName - Base command filename (e.g., "hai3-validate.md")
 * @param layer - Target layer
 * @param availableFiles - List of available command files
 * @returns Selected variant filename or null if command should be excluded
 */
export function selectCommandVariant(
  baseName: string,
  layer: LayerType,
  availableFiles: string[]
): string | null {
  // @cpt-begin:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-build-priority-chain
  const priorities: Record<LayerType, string[]> = {
    sdk: ['.sdk.md', '.md'],
    framework: ['.framework.md', '.sdk.md', '.md'],
    react: ['.react.md', '.framework.md', '.sdk.md', '.md'],
    app: ['.react.md', '.framework.md', '.sdk.md', '.md'],
  };
  // @cpt-end:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-build-priority-chain

  // @cpt-begin:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-strip-ext
  const baseWithoutExt = baseName.replace('.md', '');
  // @cpt-end:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-strip-ext

  // @cpt-begin:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-iterate-suffixes
  for (const suffix of priorities[layer]) {
    const candidate = baseWithoutExt + suffix;
    // @cpt-begin:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-return-matched-variant
    if (availableFiles.includes(candidate)) {
      return candidate;
    }
    // @cpt-end:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-return-matched-variant
  }
  // @cpt-end:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-iterate-suffixes

  // @cpt-begin:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-return-excluded
  return null; // Command excluded for this layer
  // @cpt-end:cpt-hai3-algo-cli-tooling-select-command-variant:p1:inst-return-excluded
}
