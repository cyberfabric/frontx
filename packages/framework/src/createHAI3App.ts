/**
 * createHAI3App - Convenience function for full HAI3 application
 *
 * Creates a fully configured HAI3 application using the full preset.
 *
 * Framework Layer: L2
 */

// @cpt-flow:cpt-hai3-flow-framework-composition-full-preset:p1
// @cpt-dod:cpt-hai3-dod-framework-composition-builder:p1

import { createHAI3 } from './createHAI3';
import { full, type FullPresetConfig } from './presets';
import type { HAI3Config, HAI3App } from './types';

/**
 * Combined configuration for createHAI3App.
 * Includes both HAI3 core config and full preset config.
 */
export interface HAI3AppConfig extends HAI3Config, FullPresetConfig {}

/**
 * Create a fully configured HAI3 application.
 *
 * This is a convenience function that uses the full preset.
 * For custom plugin composition, use `createHAI3()` instead.
 *
 * @param config - Optional application configuration
 * @returns The built HAI3 application
 *
 * @example
 * ```typescript
 * // Default - uses full() preset
 * const app = createHAI3App();
 *
 * // With configuration
 * const app = createHAI3App({ devMode: true });
 * ```
 */
// @cpt-begin:cpt-hai3-flow-framework-composition-full-preset:p1:inst-1
export function createHAI3App(config?: HAI3AppConfig): HAI3App {
  return createHAI3(config)
    .useAll(full({
      microfrontends: config?.microfrontends,
      telemetry: config?.telemetry,
    }))
    .build();
}
// @cpt-end:cpt-hai3-flow-framework-composition-full-preset:p1:inst-1
