/**
 * ScreensetsRegistry Configuration
 *
 * Configuration interface for creating a ScreensetsRegistry instance.
 * The TypeSystemPlugin is required at initialization.
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeHandler } from '../handler/types';

/**
 * Configuration for creating a ScreensetsRegistry instance.
 *
 * The TypeSystemPlugin is REQUIRED at initialization - the registry cannot
 * function without it. All type validation, schema operations, and contract
 * matching depend on the plugin.
 */
export interface ScreensetsRegistryConfig {
  /**
   * Type System plugin instance (REQUIRED).
   *
   * This plugin handles all type operations:
   * - Type ID validation and parsing
   * - Schema registration and retrieval
   * - Instance validation
   * - Type hierarchy checks
   * - Compatibility checks
   *
   * @example
   * ```typescript
   * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
   * import { createScreensetsRegistry } from '@hai3/screensets';
   *
   * const registry = createScreensetsRegistry({
   *   typeSystem: gtsPlugin
   * });
   * ```
   */
  typeSystem: TypeSystemPlugin;

  /**
   * Optional error handler callback.
   * Called when errors occur during MFE operations.
   *
   * @param error - The error that occurred
   * @param context - Additional context about where the error occurred
   */
  onError?: (error: Error, context: Record<string, unknown>) => void;

  /**
   * Optional loading component to display while MFE bundle is loading.
   * If not provided, a default loading indicator will be used.
   */
  loadingComponent?: unknown;

  /**
   * Optional error fallback component to display when MFE fails to load.
   * If not provided, a default error display will be used.
   */
  errorFallbackComponent?: unknown;

  /**
   * Enable debug logging.
   * Logs all MFE lifecycle events, action chains, and validation results.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Optional custom MFE handler.
   * If provided, this handler will be registered with the registry.
   *
   * Note: The default MfeHandlerMF is NOT automatically registered.
   * Applications must explicitly provide handlers they want to use.
   */
  mfeHandler?: MfeHandler;

  /**
   * Optional parent bridge connection.
   * Used when creating a nested ScreensetsRegistry within an MFE.
   * Enables hierarchical domain composition.
   */
  parentBridge?: unknown;
}
