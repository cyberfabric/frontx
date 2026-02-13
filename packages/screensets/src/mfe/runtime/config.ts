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
import type { RuntimeCoordinator } from '../coordination/types';
import type { ActionsChainsMediator } from '../mediator/types';

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
   * import { screensetsRegistryFactory, gtsPlugin } from '@hai3/screensets';
   *
   * // Build the registry with GTS plugin at application wiring time
   * const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
   *
   * // Use the registry with container provider
   * registry.registerDomain(myDomain, containerProvider);
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
   * Optional runtime coordinator.
   * Used for managing runtime connections between parent and MFE runtimes.
   *
   * If not provided, defaults to WeakMapRuntimeCoordinator.
   * Custom coordinators can be provided for testing or specialized behavior.
   *
   * @default WeakMapRuntimeCoordinator
   *
   * @example
   * ```typescript
   * import { DefaultScreensetsRegistry } from '@hai3/screensets/runtime/DefaultScreensetsRegistry';
   * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
   *
   * // For testing: create custom registry with custom coordinator
   * const registry = new DefaultScreensetsRegistry({
   *   typeSystem: gtsPlugin,
   *   coordinator: new MyCustomCoordinator()
   * });
   * ```
   */
  coordinator?: RuntimeCoordinator;

  /**
   * Optional actions chains mediator.
   * Used for executing action chains with success/failure branching.
   *
   * If not provided, defaults to DefaultActionsChainsMediator.
   * Custom mediators can be provided for testing or specialized behavior.
   *
   * @default DefaultActionsChainsMediator
   *
   * @example
   * ```typescript
   * import { DefaultScreensetsRegistry } from '@hai3/screensets/runtime/DefaultScreensetsRegistry';
   * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
   *
   * // For testing: create custom registry with custom mediator
   * const registry = new DefaultScreensetsRegistry({
   *   typeSystem: gtsPlugin,
   *   mediator: new MyCustomMediator(gtsPlugin, registry)
   * });
   * ```
   */
  mediator?: ActionsChainsMediator;
}
