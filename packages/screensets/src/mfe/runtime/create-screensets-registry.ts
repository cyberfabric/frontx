/**
 * Factory function for creating ScreensetsRegistry instances.
 *
 * This is the ONLY file that imports the concrete DefaultScreensetsRegistry class.
 * External consumers obtain ScreensetsRegistry instances exclusively through this factory.
 *
 * @packageDocumentation
 */

import type { ScreensetsRegistryConfig } from './config';
import { ScreensetsRegistry } from './ScreensetsRegistry';
import { DefaultScreensetsRegistry } from './DefaultScreensetsRegistry';

/**
 * Create a ScreensetsRegistry instance.
 *
 * This factory function is the single entry point for creating ScreensetsRegistry instances.
 * It returns the abstract ScreensetsRegistry type -- consumers never see the concrete class.
 *
 * @param config - Registry configuration (must include typeSystem plugin)
 * @returns ScreensetsRegistry instance (abstract type)
 *
 * @example
 * ```typescript
 * import { createScreensetsRegistry } from '@hai3/screensets';
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const registry = createScreensetsRegistry({
 *   typeSystem: gtsPlugin,
 *   debug: true
 * });
 * ```
 */
export function createScreensetsRegistry(
  config: ScreensetsRegistryConfig
): ScreensetsRegistry {
  return new DefaultScreensetsRegistry(config);
}
