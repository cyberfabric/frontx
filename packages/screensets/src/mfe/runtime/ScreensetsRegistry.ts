/**
 * ScreensetsRegistry - Abstract MFE Runtime Interface
 *
 * Abstract class defining the public API contract for the MFE runtime.
 * External consumers ALWAYS depend on this abstraction, never on concrete implementations.
 *
 * Obtain instances via screensetsRegistryFactory.build(config).
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
import type { ContainerProvider } from './container-provider';

/**
 * Abstract ScreensetsRegistry - public contract for the MFE runtime facade.
 *
 * This is the ONLY type external consumers should depend on.
 * Obtain instances via screensetsRegistryFactory.build(config).
 *
 * Key Responsibilities:
 * - Type validation via TypeSystemPlugin
 * - Extension and domain registration
 * - Domain property management
 * - Runtime coordination (internal)
 * - Action chain mediation and execution
 *
 * @example
 * ```typescript
 * import { screensetsRegistryFactory, gtsPlugin } from '@hai3/screensets';
 *
 * const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
 * registry.registerDomain(myDomain, containerProvider);
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
   * @param containerProvider - Container provider for the domain
   * @throws {DomainValidationError} if GTS validation fails
   * @throws {UnsupportedLifecycleStageError} if lifecycle hooks reference unsupported stages
   */
  abstract registerDomain(domain: ExtensionDomain, containerProvider: ContainerProvider): void;

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
   * Get the currently mounted extension in a domain.
   * Each domain supports at most one mounted extension at a time.
   *
   * @param domainId - ID of the domain
   * @returns Extension ID if mounted, undefined otherwise
   */
  abstract getMountedExtension(domainId: string): string | undefined;

  /**
   * Returns the ParentMfeBridge for the given extension, or null if the extension
   * is not mounted or does not exist. This is a query method (same category as
   * getMountedExtension) -- it reads from ExtensionState.bridge, which is set
   * by MountManager.mountExtension() during mount and cleared during unmount.
   *
   * Usage pattern: mount via executeActionsChain(), then query the bridge:
   *
   *   await registry.executeActionsChain({ action: { type: HAI3_ACTION_MOUNT_EXT, ... } });
   *   const bridge = registry.getParentBridge(extensionId);
   *
   * @param extensionId - ID of the extension
   * @returns ParentMfeBridge if extension is mounted, null otherwise
   */
  abstract getParentBridge(extensionId: string): ParentMfeBridge | null;

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
