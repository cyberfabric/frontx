/**
 * DefaultScreensetsRegistryFactory - Concrete Factory Implementation
 *
 * Factory-with-cache implementation for creating ScreensetsRegistry instances.
 * This class is NOT exported from the public barrel - it's an internal
 * implementation detail.
 *
 * @packageDocumentation
 * @internal
 */

import { ScreensetsRegistryFactory } from './ScreensetsRegistryFactory';
import { DefaultScreensetsRegistry } from './DefaultScreensetsRegistry';
import type { ScreensetsRegistry } from './ScreensetsRegistry';
import type { ScreensetsRegistryConfig } from './config';

/**
 * Concrete factory that implements factory-with-cache pattern.
 *
 * After the first build() call, the instance is cached and returned
 * on subsequent calls. If a different config is provided after the
 * first build, an error is thrown (config mismatch detection).
 *
 * This is the ONLY code (besides test files) that imports DefaultScreensetsRegistry.
 *
 * @internal - Not exported from public barrel
 */
export class DefaultScreensetsRegistryFactory extends ScreensetsRegistryFactory {
  private instance: ScreensetsRegistry | null = null;
  private cachedConfig: ScreensetsRegistryConfig | null = null;

  /**
   * Build a ScreensetsRegistry instance with the provided configuration.
   *
   * On first call: creates a new DefaultScreensetsRegistry, caches it, returns it.
   * On subsequent calls: validates config matches cached config, returns cached instance.
   *
   * @param config - Registry configuration (must include typeSystem)
   * @returns The ScreensetsRegistry singleton instance
   * @throws Error if called with different config after first build
   */
  build(config: ScreensetsRegistryConfig): ScreensetsRegistry {
    if (this.instance) {
      // Instance exists - validate config matches
      if (config.typeSystem !== this.cachedConfig!.typeSystem) {
        throw new Error(
          'ScreensetsRegistry already built with a different TypeSystemPlugin. ' +
          'Cannot rebuild with a different configuration. ' +
          `Expected: ${this.cachedConfig!.typeSystem.name}, ` +
          `Got: ${config.typeSystem.name}`
        );
      }
      // Config matches - return cached instance
      return this.instance;
    }

    // No instance yet - create, cache, return
    this.cachedConfig = config;
    this.instance = new DefaultScreensetsRegistry(config);
    return this.instance;
  }
}
