/**
 * Extension Manager - Abstract Interface
 *
 * Abstract extension manager interface defining the contract for extension
 * and domain state management.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  ExtensionDomain,
  Extension,
  MfeEntry,
  SharedProperty,
} from '../types';
import type { ParentMfeBridge } from '../handler/types';

/**
 * State for a registered extension domain.
 * INTERNAL: Used by ActionsChainsMediator for domain resolution.
 */
export interface ExtensionDomainState {
  domain: ExtensionDomain;
  properties: Map<string, SharedProperty>;
  extensions: Set<string>;
  propertySubscribers: Map<string, Set<(value: SharedProperty) => void>>;
  /** Currently mounted extension ID (single extension per domain invariant) */
  mountedExtension: string | undefined;
}

/**
 * State for a registered extension.
 */
export interface ExtensionState {
  extension: Extension;
  entry: MfeEntry;
  bridge: ParentMfeBridge | null;
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  mountState: 'unmounted' | 'mounting' | 'mounted' | 'error';
  container: Element | null;
  lifecycle: import('../handler/types').MfeEntryLifecycle<import('../handler/types').ChildMfeBridge> | null;
  error?: Error;
  /** Shadow root created during mount (default handler flow) */
  shadowRoot?: ShadowRoot;
}

/**
 * Lifecycle trigger callback type.
 */
export type LifecycleTriggerCallback = (extensionId: string, stageId: string) => Promise<void>;

/**
 * Domain lifecycle trigger callback type.
 */
export type DomainLifecycleTriggerCallback = (domainId: string, stageId: string) => Promise<void>;

/**
 * Abstract extension manager for extension and domain state management.
 *
 * This is the exportable abstraction that defines the contract for
 * extension and domain registration and storage. Concrete implementations
 * encapsulate the actual storage mechanism.
 *
 * Key Responsibilities:
 * - Register and unregister domains (with full validation and lifecycle)
 * - Register and unregister extensions (with full validation and lifecycle)
 * - Domain property management
 * - Query methods for domains and extensions
 *
 * Key Benefits:
 * - Dependency Inversion: ScreensetsRegistry depends on abstraction
 * - Testability: Can inject mock managers for testing
 * - Encapsulation: Storage mechanism is hidden in concrete class
 */
export abstract class ExtensionManager {
  /**
   * Register a domain.
   * Performs validation, stores state, and triggers init lifecycle.
   *
   * @param domain - Domain to register
   * @param onInitError - Optional callback for handling fire-and-forget init lifecycle errors
   */
  abstract registerDomain(domain: ExtensionDomain, onInitError?: (error: Error) => void): void;

  /**
   * Unregister a domain.
   * Cascade-unregisters all extensions and triggers destroyed lifecycle.
   *
   * @param domainId - ID of the domain to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterDomain(domainId: string): Promise<void>;

  /**
   * Register an extension.
   * Performs validation, stores state, and triggers init lifecycle.
   *
   * @param extension - Extension to register
   * @returns Promise resolving when registration is complete
   */
  abstract registerExtension(extension: Extension): Promise<void>;

  /**
   * Unregister an extension.
   * Auto-unmounts if mounted and triggers destroyed lifecycle.
   *
   * @param extensionId - ID of the extension to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterExtension(extensionId: string): Promise<void>;

  /**
   * Update a single domain property.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to update
   * @param value - New property value
   */
  abstract updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void;

  /**
   * Get a domain property value.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to get
   * @returns Property value, or undefined if not set
   */
  abstract getDomainProperty(domainId: string, propertyTypeId: string): unknown;

  /**
   * Get the currently mounted extension in a domain.
   * Each domain supports at most one mounted extension at a time.
   *
   * @param domainId - ID of the domain
   * @returns Extension ID if mounted, undefined otherwise
   */
  abstract getMountedExtension(domainId: string): string | undefined;

  /**
   * Set the mounted extension for a domain.
   * Called by MountManager when an extension is mounted.
   *
   * @param domainId - ID of the domain
   * @param extensionId - ID of the mounted extension, or undefined to clear
   */
  abstract setMountedExtension(domainId: string, extensionId: string | undefined): void;
}
