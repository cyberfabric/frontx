/**
 * Default Mount Manager Implementation
 *
 * Concrete mount manager that handles MFE loading, mounting, and unmounting
 * with full lifecycle support.
 *
 * @packageDocumentation
 * @internal
 */

import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type { RuntimeCoordinator } from '../coordination/types';
import { DefaultExtensionManager } from './default-extension-manager';
import type { ScreensetsRegistry } from './ScreensetsRegistry';
import { MountManager } from './mount-manager';
import type { Logger, ActionChainExecutor, LifecycleTrigger } from './mount-manager';

/**
 * Default mount manager implementation.
 *
 * Handles MFE loading, mounting, and unmounting with full lifecycle support.
 *
 * @internal
 */
export class DefaultMountManager extends MountManager {
  /**
   * Extension manager for accessing extension and domain state.
   */
  private readonly extensionManager: DefaultExtensionManager;

  /**
   * Registered MFE handlers.
   */
  private readonly handlers: MfeHandler[];

  /**
   * Runtime coordinator for managing runtime connections.
   */
  private readonly coordinator: RuntimeCoordinator;

  /**
   * Lifecycle trigger callback for triggering lifecycle stages.
   */
  private readonly triggerLifecycle: LifecycleTrigger;

  /**
   * Action chain executor for connecting parent bridge.
   */
  private readonly executeActionsChain: ActionChainExecutor;

  /**
   * Logger for debug messages.
   */
  private readonly log: Logger;

  /**
   * Host runtime for RuntimeConnection registration.
   */
  private readonly hostRuntime: ScreensetsRegistry;

  constructor(config: {
    extensionManager: DefaultExtensionManager;
    handlers: MfeHandler[];
    coordinator: RuntimeCoordinator;
    triggerLifecycle: LifecycleTrigger;
    executeActionsChain: ActionChainExecutor;
    log: Logger;
    hostRuntime: ScreensetsRegistry;
  }) {
    super();
    this.extensionManager = config.extensionManager;
    this.handlers = config.handlers;
    this.coordinator = config.coordinator;
    this.triggerLifecycle = config.triggerLifecycle;
    this.executeActionsChain = config.executeActionsChain;
    this.log = config.log;
    this.hostRuntime = config.hostRuntime;
  }

  /**
   * Load an extension bundle.
   *
   * @param extensionId - ID of the extension to load
   * @returns Promise resolving when bundle is loaded
   */
  async loadExtension(extensionId: string): Promise<void> {
    // Verify extension is registered
    const extensionState = this.extensionManager.getExtensionState(extensionId);
    if (!extensionState) {
      throw new Error(
        `Cannot load extension '${extensionId}': extension is not registered. ` +
        `Call registerExtension() first.`
      );
    }

    // Skip if already loaded or loading
    if (extensionState.loadState === 'loaded') {
      return;
    }
    if (extensionState.loadState === 'loading') {
      return;
    }

    // Mark as loading
    extensionState.loadState = 'loading';
    extensionState.error = undefined;

    try {
      // Resolve entry and find handler
      const entry = extensionState.entry;
      const handler = this.handlers.find(h => h.canHandle(entry.id));
      if (!handler) {
        throw new Error(
          `No MFE handler registered that can handle entry type '${entry.id}'. ` +
          `Register a handler using registerHandler().`
        );
      }

      // Load bundle using handler
      const lifecycle = await handler.load(entry);

      // Cache loaded lifecycle for mounting
      extensionState.lifecycle = lifecycle;
      extensionState.loadState = 'loaded';

      this.log('Extension loaded', { extensionId, handlerBaseTypeId: handler.handledBaseTypeId });
    } catch (error) {
      extensionState.loadState = 'error';
      extensionState.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /**
   * Preload an extension bundle without mounting.
   *
   * @param extensionId - ID of the extension to preload
   * @returns Promise resolving when bundle is preloaded
   */
  async preloadExtension(extensionId: string): Promise<void> {
    return this.loadExtension(extensionId);
  }

  /**
   * Mount an extension into a container element.
   *
   * @param extensionId - ID of the extension to mount
   * @param container - DOM element to mount into
   * @returns Promise resolving to the parent bridge
   */
  async mountExtension(extensionId: string, container: Element): Promise<ParentMfeBridge> {
    // Verify extension is registered
    const extensionState = this.extensionManager.getExtensionState(extensionId);
    if (!extensionState) {
      throw new Error(
        `Cannot mount extension '${extensionId}': extension is not registered. ` +
        `Call registerExtension() first.`
      );
    }

    // Check if already mounted
    if (extensionState.mountState === 'mounted') {
      throw new Error(
        `Cannot mount extension '${extensionId}': extension is already mounted. ` +
        `Call unmountExtension() first before remounting.`
      );
    }

    // Auto-load if not loaded
    if (extensionState.loadState !== 'loaded') {
      await this.loadExtension(extensionId);
    }

    // Mark as mounting
    extensionState.mountState = 'mounting';
    extensionState.error = undefined;

    try {
      // Get domain state
      const domainState = this.extensionManager.getDomainState(extensionState.extension.domain);
      if (!domainState) {
        throw new Error(
          `Cannot mount extension '${extensionId}': ` +
          `domain '${extensionState.extension.domain}' is not registered.`
        );
      }

      // Create bridge using bridge factory
      const bridgeFactory = await import('./bridge-factory');
      const { parentBridge, childBridge } = bridgeFactory.createBridge(
        domainState,
        extensionId,
        extensionState.entry.id,
        (chain, options) => this.executeActionsChain(chain, options)
      );

      // Register with RuntimeCoordinator
      const existingConnection = this.coordinator.get(container);
      if (existingConnection) {
        // Add to existing connection
        existingConnection.bridges.set(extensionId, parentBridge);
      } else {
        // Create new connection with proper hostRuntime reference
        this.coordinator.register(container, {
          hostRuntime: this.hostRuntime,
          bridges: new Map([[extensionId, parentBridge]]),
        });
      }

      // Call lifecycle.mount(container, childBridge)
      const lifecycle = extensionState.lifecycle;
      if (!lifecycle) {
        throw new Error(
          `Cannot mount extension '${extensionId}': lifecycle not loaded. ` +
          `This should not happen - loadExtension should have cached the lifecycle.`
        );
      }
      await lifecycle.mount(container, childBridge);

      // Update state
      extensionState.bridge = parentBridge;
      extensionState.container = container;
      extensionState.mountState = 'mounted';

      // Trigger 'activated' lifecycle stage
      await this.triggerLifecycle(
        extensionId,
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1'
      );

      this.log('Extension mounted', { extensionId, domainId: extensionState.extension.domain });

      return parentBridge;
    } catch (error) {
      extensionState.mountState = 'error';
      extensionState.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /**
   * Unmount an extension from its container.
   *
   * @param extensionId - ID of the extension to unmount
   * @returns Promise resolving when unmount is complete
   */
  async unmountExtension(extensionId: string): Promise<void> {
    // Verify extension is registered
    const extensionState = this.extensionManager.getExtensionState(extensionId);
    if (!extensionState) {
      // Idempotent - no-op if extension not registered
      return;
    }

    // Check if mounted
    if (extensionState.mountState !== 'mounted') {
      // Idempotent - no-op if not mounted
      return;
    }

    // Trigger 'deactivated' lifecycle stage
    await this.triggerLifecycle(
      extensionId,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1'
    );

    try {
      // Call lifecycle.unmount(container)
      const lifecycle = extensionState.lifecycle;
      const container = extensionState.container;
      if (lifecycle && container) {
        await lifecycle.unmount(container);
      }

      // Dispose bridge
      if (extensionState.bridge) {
        const domainState = this.extensionManager.getDomainState(extensionState.extension.domain);
        if (domainState) {
          const bridgeFactory = await import('./bridge-factory');
          bridgeFactory.disposeBridge(domainState, extensionState.bridge);
        }
      }

      // Unregister from coordinator
      if (container) {
        const connection = this.coordinator.get(container);
        if (connection) {
          connection.bridges.delete(extensionId);
          // If no more bridges, unregister the container
          if (connection.bridges.size === 0) {
            this.coordinator.unregister(container);
          }
        }
      }

      // Update state (keep extension registered and bundle loaded)
      extensionState.bridge = null;
      extensionState.container = null;
      extensionState.mountState = 'unmounted';
      extensionState.error = undefined;

      this.log('Extension unmounted', { extensionId });
    } catch (error) {
      extensionState.mountState = 'error';
      extensionState.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }
}
