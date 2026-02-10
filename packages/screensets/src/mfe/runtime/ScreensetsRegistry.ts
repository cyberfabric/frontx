/**
 * ScreensetsRegistry - Abstract MFE Runtime Interface
 *
 * Abstract class defining the public API contract for the MFE runtime.
 * External consumers ALWAYS depend on this abstraction, never on concrete implementations.
 *
 * Create instances via createScreensetsRegistry() factory.
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type {
  ExtensionDomain,
  Extension,
  ActionsChain,
} from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator';
import type { ExtensionDomainState } from './extension-manager';

// Re-export ExtensionDomainState for external consumers (e.g., ActionsChainsMediator)
export type { ExtensionDomainState } from './extension-manager';

/**
 * Abstract ScreensetsRegistry - public contract for the MFE runtime facade.
 *
 * This is the ONLY type external consumers should depend on.
 * Create instances via createScreensetsRegistry() factory.
 *
 * Key Responsibilities:
 * - Type validation via TypeSystemPlugin
 * - Extension and domain registration
 * - Domain property management
 * - Bridge lifecycle management
 * - Runtime coordination (internal)
 * - Action chain mediation
 * - MFE loading and mounting
 *
 * @example
 * ```typescript
 * import { createScreensetsRegistry } from '@hai3/screensets';
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const registry = createScreensetsRegistry({
 *   typeSystem: gtsPlugin
 * });
 *
 * // Register a domain
 * registry.registerDomain(myDomain);
 *
 * // Register an extension
 * await registry.registerExtension(myExtension);
 * ```
 */
export abstract class ScreensetsRegistry {
  /**
   * Type System plugin instance.
   * All type validation and schema operations go through this plugin.
   */
  abstract readonly typeSystem: TypeSystemPlugin;

  // --- Registration ---

  /**
   * Register an extension domain.
   * Domains must be registered before extensions can mount into them.
   * NOTE: registerDomain is synchronous, but lifecycle triggering happens fire-and-forget.
   *
   * @param domain - Domain to register
   * @throws {DomainValidationError} if GTS validation fails
   * @throws {UnsupportedLifecycleStageError} if lifecycle hooks reference unsupported stages
   */
  abstract registerDomain(domain: ExtensionDomain): void;

  /**
   * Unregister a domain from the registry.
   * All extensions in the domain are cascade-unregistered first.
   * The domain is removed from the registry.
   *
   * @param domainId - ID of the domain to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterDomain(domainId: string): Promise<void>;

  /**
   * Register an extension dynamically at runtime.
   * Extensions can be registered at ANY time during the application lifecycle.
   *
   * Validation steps:
   * 1. Validate extension against GTS schema
   * 2. Check domain exists
   * 3. Validate contract (entry vs domain)
   * 4. Validate extension type (if domain specifies extensionsTypeId)
   * 5. Register in internal state
   * 6. Trigger 'init' lifecycle stage
   * 7. Emit 'extensionRegistered' event
   *
   * @param extension - Extension to register
   * @returns Promise resolving when registration is complete
   * @throws {ExtensionValidationError} if GTS validation fails
   * @throws {Error} if domain not registered
   * @throws {ContractValidationError} if contract validation fails
   * @throws {ExtensionTypeError} if extension type validation fails
   */
  abstract registerExtension(extension: Extension): Promise<void>;

  /**
   * Unregister an extension from the registry.
   * If the extension is currently mounted, it will be unmounted first.
   * The extension is removed from the registry and its domain.
   *
   * @param extensionId - ID of the extension to unregister
   * @returns Promise resolving when unregistration is complete
   */
  abstract unregisterExtension(extensionId: string): Promise<void>;

  // --- Loading ---

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
   * Semantically same as loadExtension, but may use handler.preload() for batch optimization.
   *
   * @param extensionId - ID of the extension to preload
   * @returns Promise resolving when bundle is preloaded
   */
  abstract preloadExtension(extensionId: string): Promise<void>;

  // --- Mounting ---

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

  // --- Domain Properties ---

  /**
   * Update a single domain property.
   * Notifies all subscribers (bridges) of the update.
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
   * Update multiple domain properties at once.
   * More efficient than calling updateDomainProperty multiple times.
   *
   * @param domainId - ID of the domain
   * @param properties - Map of property type IDs to values
   */
  abstract updateDomainProperties(domainId: string, properties: Map<string, unknown>): void;

  // --- Action Chains ---

  /**
   * Execute an actions chain.
   * Delegates to the ActionsChainsMediator for chain execution.
   *
   * @param chain - Actions chain to execute
   * @param options - Optional execution options
   * @returns Promise resolving to chain result
   */
  abstract executeActionsChain(
    chain: ActionsChain,
    options?: ChainExecutionOptions
  ): Promise<ChainResult>;

  // --- Lifecycle Triggering ---

  /**
   * Trigger a lifecycle stage for a specific extension.
   * Executes all lifecycle hooks registered for the given stage.
   *
   * @param extensionId - ID of the extension
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerLifecycleStage(extensionId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Useful for custom stages like "refresh" that affect all widgets.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for a domain itself.
   * Executes hooks registered on the domain entity.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void>;

  // --- Query ---

  /**
   * Get a registered extension by its ID.
   *
   * @param extensionId - ID of the extension to get
   * @returns Extension if registered, undefined otherwise
   */
  abstract getExtension(extensionId: string): Extension | undefined;

  /**
   * Get a registered domain by its ID.
   *
   * @param domainId - ID of the domain to get
   * @returns ExtensionDomain if registered, undefined otherwise
   */
  abstract getDomain(domainId: string): ExtensionDomain | undefined;

  /**
   * Get all extensions registered for a specific domain.
   *
   * @param domainId - ID of the domain
   * @returns Array of extensions in the domain (empty if domain not found or has no extensions)
   */
  abstract getExtensionsForDomain(domainId: string): Extension[];

  /**
   * Get domain state for a registered domain.
   * INTERNAL: Used by ActionsChainsMediator for domain resolution.
   *
   * @param domainId - ID of the domain
   * @returns Domain state, or undefined if not found
   */
  abstract getDomainState(domainId: string): ExtensionDomainState | undefined;

  // --- Action Handlers (mediator-facing) ---

  /**
   * Register an extension's action handler.
   *
   * @param extensionId - ID of the extension
   * @param domainId - ID of the domain
   * @param entryId - ID of the MFE entry
   * @param handler - The action handler
   */
  abstract registerExtensionActionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: ActionHandler
  ): void;

  /**
   * Unregister an extension's action handler.
   *
   * @param extensionId - ID of the extension
   */
  abstract unregisterExtensionActionHandler(extensionId: string): void;

  /**
   * Register a domain's action handler.
   *
   * @param domainId - ID of the domain
   * @param handler - The action handler
   */
  abstract registerDomainActionHandler(
    domainId: string,
    handler: ActionHandler
  ): void;

  /**
   * Unregister a domain's action handler.
   *
   * @param domainId - ID of the domain
   */
  abstract unregisterDomainActionHandler(domainId: string): void;

  // --- Events ---

  /**
   * Subscribe to registry events.
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  abstract on(event: string, callback: (data: Record<string, unknown>) => void): void;

  /**
   * Unsubscribe from registry events.
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  abstract off(event: string, callback: (data: Record<string, unknown>) => void): void;

  // --- Handlers ---

  /**
   * Register an MFE handler.
   *
   * @param handler - Handler instance to register
   */
  abstract registerHandler(handler: MfeHandler): void;

  // --- Lifecycle ---

  /**
   * Dispose the registry and clean up resources.
   * Cleans up all bridges, runtime connections, and internal state.
   */
  abstract dispose(): void;
}
