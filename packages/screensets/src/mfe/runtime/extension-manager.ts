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
}

/**
 * Event emitter callback type.
 */
export type EventEmitCallback = (
  event: string,
  data: Record<string, unknown>,
  errorHandler: (error: Error, context: Record<string, unknown>) => void
) => void;

/**
 * Lifecycle trigger callback type.
 */
export type LifecycleTriggerCallback = (extensionId: string, stageId: string) => Promise<void>;

/**
 * Domain lifecycle trigger callback type.
 */
export type DomainLifecycleTriggerCallback = (domainId: string, stageId: string) => Promise<void>;

/**
 * Logger callback type.
 */
export type LoggerCallback = (message: string, context?: Record<string, unknown>) => void;

/**
 * Error handler callback type.
 */
export type ErrorHandlerCallback = (error: Error, context: Record<string, unknown>) => void;

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
   * Performs validation, stores state, triggers init lifecycle, and emits event.
   *
   * @param domain - Domain to register
   */
  abstract registerDomain(domain: ExtensionDomain): void;

  /**
   * Unregister a domain.
   * Cascade-unregisters all extensions, triggers destroyed lifecycle, and emits event.
   *
   * @param domainId - ID of the domain to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterDomain(domainId: string): Promise<void>;

  /**
   * Register an extension.
   * Performs validation, stores state, triggers init lifecycle, and emits event.
   *
   * @param extension - Extension to register
   * @returns Promise resolving when registration is complete
   */
  abstract registerExtension(extension: Extension): Promise<void>;

  /**
   * Unregister an extension.
   * Auto-unmounts if mounted, triggers destroyed lifecycle, and emits event.
   *
   * @param extensionId - ID of the extension to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterExtension(extensionId: string): Promise<void>;

  /**
   * Get domain state by ID.
   *
   * @param domainId - Domain ID
   * @returns Domain state, or undefined if not found
   */
  abstract getDomainState(domainId: string): ExtensionDomainState | undefined;

  /**
   * Get extension state by ID.
   *
   * @param extensionId - Extension ID
   * @returns Extension state, or undefined if not found
   */
  abstract getExtensionState(extensionId: string): ExtensionState | undefined;

  /**
   * Get all extension states for a domain.
   *
   * @param domainId - Domain ID
   * @returns Array of extension states
   */
  abstract getExtensionStatesForDomain(domainId: string): ExtensionState[];

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
   * Resolve an MfeEntry from its ID by looking up in extension states.
   *
   * @param entryId - Entry ID to resolve
   * @returns The MfeEntry, or undefined if not found
   */
  abstract resolveEntry(entryId: string): MfeEntry | undefined;

  /**
   * Clear all state.
   * Called during disposal to cleanup internal state.
   */
  abstract clear(): void;

  /**
   * Get the domains map for direct access.
   * INTERNAL: Used by ScreensetsRegistry for test compatibility.
   * @internal
   */
  abstract getDomainsMap(): Map<string, ExtensionDomainState>;

  /**
   * Get the extensions map for direct access.
   * INTERNAL: Used by ScreensetsRegistry for test compatibility.
   * @internal
   */
  abstract getExtensionsMap(): Map<string, ExtensionState>;
}
