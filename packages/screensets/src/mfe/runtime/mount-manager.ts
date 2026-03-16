/**
 * Mount Manager
 *
 * Abstract mount manager interface and callback type definitions.
 * Manages MFE loading, mounting, and unmounting operations.
 *
 * @packageDocumentation
 * @internal
 */

import type { ParentMfeBridge } from '../handler/types';

/**
 * Action chain executor function type.
 */
export type ActionChainExecutor = (
  chain: import('../types').ActionsChain,
  options?: import('../mediator').ChainExecutionOptions
) => Promise<void>;

/**
 * Lifecycle trigger function type.
 */
export type LifecycleTrigger = (extensionId: string, stageId: string) => Promise<void>;

/**
 * Abstract mount manager for MFE loading and mounting operations.
 *
 * This is the exportable abstraction that defines the contract for
 * mount management. Concrete implementations encapsulate the loading,
 * mounting, and unmounting logic.
 *
 * Key Responsibilities:
 * - Load MFE bundles
 * - Mount MFEs to containers
 * - Unmount MFEs from containers
 * - Manage bridges and coordinator registration
 *
 * Key Benefits:
 * - Dependency Inversion: ScreensetsRegistry depends on abstraction
 * - Testability: Can inject mock managers for testing
 * - Encapsulation: Mounting logic is hidden in concrete class
 */
export abstract class MountManager {
  /**
   * Load an extension bundle.
   * Finds appropriate MfeHandler and loads the bundle.
   * The loaded lifecycle is cached for mounting.
   *
   * @param extensionId - ID of the extension to load
   * @returns Promise resolving when bundle is loaded
   */
  abstract loadExtension(extensionId: string): Promise<void>;

  /**
   * Preload an extension bundle without mounting.
   * Delegates to loadExtension to fetch the bundle ahead of time.
   *
   * @param extensionId - ID of the extension to preload
   * @returns Promise resolving when bundle is preloaded
   */
  abstract preloadExtension(extensionId: string): Promise<void>;

  /**
   * Mount an extension into a container element.
   * Auto-loads the bundle if not already loaded.
   * Creates bridge, registers with coordinator, mounts to DOM, triggers lifecycle.
   *
   * @param extensionId - ID of the extension to mount
   * @param container - DOM element to mount into
   * @returns Promise resolving to the parent bridge
   */
  abstract mountExtension(extensionId: string, container: Element): Promise<ParentMfeBridge>;

  /**
   * Unmount an extension from its container.
   * Calls lifecycle.unmount(), disposes bridge, unregisters from coordinator.
   * The extension remains registered and bundle remains loaded after unmount.
   *
   * @param extensionId - ID of the extension to unmount
   * @returns Promise resolving when unmount is complete
   */
  abstract unmountExtension(extensionId: string): Promise<void>;
}
