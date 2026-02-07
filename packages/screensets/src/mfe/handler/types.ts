/**
 * MFE Handler Types
 *
 * Defines the abstract handler interface and related types for loading MFEs.
 * Handlers are responsible for loading MFE bundles and creating bridges.
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeEntry } from '../types';

/**
 * Parent MFE Bridge interface.
 * Used by the parent runtime to manage child MFE instances.
 * Full implementation will come in Phase 15.
 */
export interface ParentMfeBridge {
  dispose(): void;
}

/**
 * MFE lifecycle interface.
 * All MFE entries must implement this interface.
 */
export interface MfeEntryLifecycle<TBridge = ParentMfeBridge> {
  /**
   * Mount the MFE to a DOM container.
   *
   * @param container - DOM element to mount into
   * @param bridge - Bridge instance for communication with host
   */
  mount(container: Element, bridge: TBridge): void | Promise<void>;

  /**
   * Unmount the MFE from its container.
   *
   * @param container - DOM element to unmount from
   */
  unmount(container: Element): void | Promise<void>;
}

/**
 * Result of loading an MFE bundle.
 */
export interface LoadedMfe {
  /** The lifecycle interface for the loaded MFE */
  lifecycle: MfeEntryLifecycle;

  /** The entry that was loaded */
  entry: MfeEntry;

  /** Unload the MFE bundle (cleanup) */
  unload(): void | Promise<void>;
}

/**
 * Abstract factory for creating bridge instances.
 * Different handlers can provide different bridge implementations.
 */
export abstract class MfeBridgeFactory<TBridge = unknown> {
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
}

/**
 * Abstract MFE handler class.
 *
 * Handlers are responsible for:
 * - Determining if they can handle a specific entry type
 * - Loading MFE bundles
 * - Creating bridge instances
 * - Optionally preloading bundles
 */
export abstract class MfeHandler<TEntry extends MfeEntry = MfeEntry, TBridge = unknown> {
  /**
   * Bridge factory for creating bridge instances.
   */
  abstract readonly bridgeFactory: MfeBridgeFactory<TBridge>;

  /**
   * Base type ID that this handler can handle.
   * Handlers match entries using type hierarchy (isTypeOf).
   */
  abstract readonly handledBaseTypeId: string;

  /**
   * Priority for handler selection.
   * Higher priority handlers are tried first.
   * Default: 0
   */
  readonly priority?: number;

  /**
   * Type system plugin instance.
   * Injected at construction for type hierarchy checks.
   */
  protected readonly typeSystem: TypeSystemPlugin;

  constructor(typeSystem: TypeSystemPlugin) {
    this.typeSystem = typeSystem;
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
   * @returns Promise resolving to loaded MFE
   */
  abstract load(entry: TEntry): Promise<LoadedMfe>;

  /**
   * Optional preload method for batch optimization.
   * If not implemented, preload falls back to load.
   *
   * @param entry - The entry to preload
   * @returns Promise resolving when preload is complete
   */
  preload?(entry: TEntry): Promise<void>;
}
