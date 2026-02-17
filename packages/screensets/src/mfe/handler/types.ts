/**
 * MFE Handler Types
 *
 * Defines the abstract handler interface and related types for loading MFEs.
 * Handlers are responsible for loading MFE bundles and creating bridges.
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeEntry, ActionsChain, SharedProperty } from '../types';

/**
 * Parent MFE Bridge interface.
 * Used by the parent runtime to manage child MFE instances.
 */
export interface ParentMfeBridge {
  /**
   * Unique instance ID for the child MFE.
   */
  readonly instanceId: string;

  /**
   * Dispose the bridge and clean up resources.
   */
  dispose(): void;
}

/**
 * Child MFE Bridge interface.
 * Provided to child MFEs for communication with the host.
 */
export interface ChildMfeBridge {
  readonly domainId: string;
  readonly instanceId: string;

  /**
   * Execute an actions chain via the registry.
   * This is a capability pass-through -- the bridge delegates directly to
   * the registry's executeActionsChain(). This is the ONLY public API for
   * actions chain execution from child MFEs.
   *
   * Child MFEs should use this method to execute actions chains in the host
   * domain or target other domains.
   *
   * @param chain - Actions chain to execute
   * @returns Promise resolving when execution is complete
   */
  executeActionsChain(chain: ActionsChain): Promise<void>;

  /**
   * Subscribe to a specific property's updates.
   *
   * @param propertyTypeId - Type ID of the property to subscribe to
   * @param callback - Callback invoked when property updates
   * @returns Unsubscribe function
   */
  subscribeToProperty(propertyTypeId: string, callback: (value: SharedProperty) => void): () => void;

  /**
   * Get a property's current value synchronously.
   *
   * @param propertyTypeId - Type ID of the property to get
   * @returns Current property value, or undefined if not set
   */
  getProperty(propertyTypeId: string): SharedProperty | undefined;
}

/**
 * MFE lifecycle interface.
 * All MFE entries must implement this interface.
 */
export interface MfeEntryLifecycle<TBridge = ChildMfeBridge> {
  /**
   * Mount the MFE to a DOM container.
   *
   * With the default handler (`MfeHandlerMF`), the `container` parameter will be
   * a `ShadowRoot` created by `DefaultMountManager`. With custom handlers, it may
   * be a plain `Element`. React's `createRoot()` accepts both types.
   *
   * @param container - DOM element or shadow root to mount into
   * @param bridge - Bridge instance for communication with host
   */
  mount(container: Element | ShadowRoot, bridge: TBridge): void | Promise<void>;

  /**
   * Unmount the MFE from its container.
   *
   * With the default handler (`MfeHandlerMF`), the `container` parameter will be
   * a `ShadowRoot`. With custom handlers, it may be a plain `Element`.
   *
   * @param container - DOM element or shadow root to unmount from
   */
  unmount(container: Element | ShadowRoot): void | Promise<void>;
}

/**
 * Abstract factory for creating bridge instances.
 * Different handlers can provide different bridge implementations.
 */
export abstract class MfeBridgeFactory<TBridge extends ChildMfeBridge = ChildMfeBridge> {
  /**
   * Create a bridge instance for an MFE.
   *
   * @param domainId - ID of the domain the MFE is mounted in
   * @param entryTypeId - Type ID of the MFE entry
   * @param instanceId - Unique instance ID for this MFE
   * @returns Bridge instance
   */
  abstract create(
    domainId: string,
    entryTypeId: string,
    instanceId: string
  ): TBridge;

  /**
   * Dispose a bridge and clean up resources.
   *
   * @param bridge - Bridge instance to dispose
   */
  abstract dispose(bridge: TBridge): void;
}

/**
 * Abstract MFE handler class.
 *
 * Handlers are responsible for:
 * - Determining if they can handle a specific entry type
 * - Loading MFE bundles
 * - Creating bridge instances
 */
export abstract class MfeHandler<TEntry extends MfeEntry = MfeEntry, TBridge extends ChildMfeBridge = ChildMfeBridge> {
  /**
   * Bridge factory for creating bridge instances.
   */
  abstract readonly bridgeFactory: MfeBridgeFactory<TBridge>;

  /**
   * Base type ID that this handler can handle.
   * Handlers match entries using type hierarchy (isTypeOf).
   */
  readonly handledBaseTypeId: string;

  /**
   * Priority for handler selection.
   * Higher priority handlers are tried first.
   * Default: 0
   */
  readonly priority: number;

  /**
   * Type system plugin instance.
   * Injected at construction for type hierarchy checks.
   */
  protected readonly typeSystem: TypeSystemPlugin;

  constructor(
    typeSystem: TypeSystemPlugin,
    handledBaseTypeId: string,
    priority: number = 0
  ) {
    this.typeSystem = typeSystem;
    this.handledBaseTypeId = handledBaseTypeId;
    this.priority = priority;
  }

  /**
   * Check if this handler can handle a specific entry type.
   *
   * @param entryTypeId - Type ID of the entry to check
   * @returns true if this handler can handle the entry type
   */
  canHandle(entryTypeId: string): boolean {
    return this.typeSystem.isTypeOf(entryTypeId, this.handledBaseTypeId);
  }

  /**
   * Load an MFE bundle.
   *
   * @param entry - The entry to load
   * @returns Promise resolving to MFE lifecycle interface with ChildMfeBridge
   */
  abstract load(entry: TEntry): Promise<MfeEntryLifecycle<ChildMfeBridge>>;
}
