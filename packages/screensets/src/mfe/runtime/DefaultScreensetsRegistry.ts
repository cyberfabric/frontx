/**
 * DefaultScreensetsRegistry - Concrete MFE Runtime Implementation
 *
 * This is the DEFAULT concrete implementation of ScreensetsRegistry.
 * It wires all collaborators together and implements the facade API.
 *
 * INTERNAL: This class is NOT exported from the public barrel.
 * External consumers obtain instances via screensetsRegistryFactory.build(config).
 *
 * @packageDocumentation
 * @internal
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { ScreensetsRegistryConfig } from './config';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type {
  ExtensionDomain,
  Extension,
  ActionsChain,
} from '../types';
import { ScreensetsRegistry } from './ScreensetsRegistry';
import { WeakMapRuntimeCoordinator } from '../coordination/weak-map-runtime-coordinator';
import { RuntimeCoordinator } from '../coordination/types';
import { type ChainResult, type ChainExecutionOptions, ActionsChainsMediator } from '../mediator';
import { DefaultActionsChainsMediator } from '../mediator/actions-chains-mediator';
import { type ExtensionDomainState } from './extension-manager';
import { DefaultExtensionManager } from './default-extension-manager';
import { DefaultLifecycleManager } from './default-lifecycle-manager';
import { MountManager } from './mount-manager';
import { DefaultMountManager } from './default-mount-manager';
import { OperationSerializer } from './operation-serializer';
import { RuntimeBridgeFactory } from './runtime-bridge-factory';
import { DefaultRuntimeBridgeFactory } from './default-runtime-bridge-factory';
import { ExtensionLifecycleActionHandler, type ExtensionLifecycleCallbacks } from './extension-lifecycle-action-handler';
import type { ContainerProvider } from './container-provider';
import { HAI3_ACTION_UNMOUNT_EXT } from '../constants';

/**
 * Default concrete implementation of ScreensetsRegistry.
 *
 * This class extends the abstract ScreensetsRegistry and provides the full
 * implementation by wiring together all collaborator classes.
 *
 * Key Responsibilities:
 * - Collaborator initialization and wiring
 * - Delegation to collaborators for specialized logic
 * - Concurrency control via OperationSerializer
 * - Error handling and logging
 *
 * @internal
 */
export class DefaultScreensetsRegistry extends ScreensetsRegistry {
  /**
   * Type System plugin instance.
   * All type validation and schema operations go through this plugin.
   */
  public readonly typeSystem: TypeSystemPlugin;


  /**
   * Extension manager for managing extension and domain state.
   * INTERNAL: Delegates extension/domain registration and query operations.
   */
  private readonly extensionManager: DefaultExtensionManager;

  /**
   * Lifecycle manager for triggering lifecycle stages.
   * INTERNAL: Delegates lifecycle hook execution.
   */
  private readonly lifecycleManager: DefaultLifecycleManager;

  /**
   * Mount manager for loading and mounting MFEs.
   * INTERNAL: Delegates loading and mounting operations.
   */
  private readonly mountManager: MountManager;

  /**
   * Runtime bridge factory for creating bridge connections.
   * INTERNAL: Always constructed internally.
   */
  private readonly bridgeFactory: RuntimeBridgeFactory;

  /**
   * Runtime coordinator for managing runtime connections.
   * INTERNAL: Always constructed internally.
   */
  private readonly coordinator: RuntimeCoordinator;

  /**
   * Actions chains mediator for action chain execution.
   * INTERNAL: Always constructed internally.
   */
  private readonly mediator: ActionsChainsMediator;

  /**
   * Operation serializer for per-entity concurrency control.
   * INTERNAL: Ensures operations on the same entity are serialized.
   */
  private readonly operationSerializer: OperationSerializer;

  /**
   * Registered MFE handlers.
   */
  private readonly handlers: MfeHandler[] = [];

  /**
   * Child MFE bridges (parent -> child communication).
   * INTERNAL: Bridge lifecycle is managed by the registry.
   */
  private readonly childBridges = new Map<string, ParentMfeBridge>();

  /**
   * Parent MFE bridge (child -> parent communication).
   * INTERNAL: Set when this registry is mounted as a child MFE.
   */
  private parentBridge: ParentMfeBridge | null = null;

  constructor(config: ScreensetsRegistryConfig) {
    super();

    // Validate required plugin
    if (!config.typeSystem) {
      throw new Error(
        'ScreensetsRegistry requires a TypeSystemPlugin. ' +
        'Provide it via config.typeSystem parameter. ' +
        'Use screensetsRegistryFactory.build({ typeSystem: gtsPlugin }) to create an instance.'
      );
    }

    this.typeSystem = config.typeSystem;

    // Initialize operation serializer
    this.operationSerializer = new OperationSerializer();

    // Initialize coordinator (always construct internally)
    this.coordinator = new WeakMapRuntimeCoordinator();

    // Initialize runtime bridge factory
    this.bridgeFactory = new DefaultRuntimeBridgeFactory();

    // Initialize mediator (always construct internally)
    // Note: mediator needs getDomainState callback, which delegates to extensionManager
    // that is initialized later, but this callback is only invoked after construction
    this.mediator = new DefaultActionsChainsMediator({
      typeSystem: this.typeSystem,
      getDomainState: (domainId) => this.extensionManager.getDomainState(domainId),
    });

    // Initialize extension manager (needs dependencies for business logic)
    this.extensionManager = new DefaultExtensionManager({
      typeSystem: this.typeSystem,
      triggerLifecycle: (extensionId, stageId) => this.triggerLifecycleStage(extensionId, stageId),
      triggerDomainOwnLifecycle: (domainId, stageId) => this.triggerDomainOwnLifecycleStage(domainId, stageId),
      // Bypass OperationSerializer: the parent operation (unregisterExtension)
      // already holds the serializer lock for this entity ID, so calling
      // registry.unmountExtension would deadlock. Go directly to MountManager.
      unmountExtension: (extensionId) => this.mountManager.unmountExtension(extensionId),
    });

    // Initialize lifecycle manager (needs extension manager)
    this.lifecycleManager = new DefaultLifecycleManager(
      this.extensionManager,
      async (chain) => { await this.executeActionsChain(chain); }
    );

    // Initialize mount manager (needs all collaborators)
    this.mountManager = new DefaultMountManager({
      extensionManager: this.extensionManager,
      handlers: this.handlers,
      coordinator: this.coordinator,
      triggerLifecycle: (extensionId, stageId) => this.triggerLifecycleStage(extensionId, stageId),
      executeActionsChain: (chain, options) => this.executeActionsChain(chain, options),
      hostRuntime: this,
      registerDomainActionHandler: (domainId, handler) => this.registerDomainActionHandler(domainId, handler),
      unregisterDomainActionHandler: (domainId) => this.unregisterDomainActionHandler(domainId),
      bridgeFactory: this.bridgeFactory,
    });

    // Verify first-class schemas are available
    this.verifyFirstClassSchemas();

    // Register custom handler if provided
    if (config.mfeHandler) {
      this.registerHandler(config.mfeHandler);
    }
  }

  /**
   * Verify that first-class citizen schemas are available in the plugin.
   * First-class schemas are built into the GTS plugin during construction.
   */
  private verifyFirstClassSchemas(): void {
    const coreTypeIds = [
      'gts.hai3.mfes.mfe.entry.v1~',
      'gts.hai3.mfes.ext.domain.v1~',
      'gts.hai3.mfes.ext.extension.v1~',
      'gts.hai3.mfes.comm.shared_property.v1~',
      'gts.hai3.mfes.comm.action.v1~',
      'gts.hai3.mfes.comm.actions_chain.v1~',
      'gts.hai3.mfes.lifecycle.stage.v1~',
      'gts.hai3.mfes.lifecycle.hook.v1~',
    ];

    const missingSchemas: string[] = [];

    for (const typeId of coreTypeIds) {
      const schema = this.typeSystem.getSchema(typeId);
      if (!schema) {
        missingSchemas.push(typeId);
      }
    }

    if (missingSchemas.length > 0) {
      throw new Error(
        `TypeSystemPlugin is missing first-class citizen schemas. ` +
        `The following schemas are required but not found: ${missingSchemas.join(', ')}. ` +
        `Ensure the plugin has all built-in schemas registered during construction.`
      );
    }
  }

  /**
   * Register an MFE handler.
   *
   * @param handler - Handler instance to register
   */
  registerHandler(handler: MfeHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Register an extension domain.
   * Domains must be registered before extensions can mount into them.
   * NOTE: registerDomain is synchronous, but lifecycle triggering happens fire-and-forget.
   *
   * @param domain - Domain to register
   * @param containerProvider - Container provider for the domain
   * @param onInitError - Optional callback for handling fire-and-forget init lifecycle errors
   * @throws {DomainValidationError} if GTS validation fails
   * @throws {UnsupportedLifecycleStageError} if lifecycle hooks reference unsupported stages
   */
  registerDomain(
    domain: ExtensionDomain,
    containerProvider: ContainerProvider,
    onInitError?: (error: Error) => void
  ): void {
    // Step 1: Register domain state (with onInitError callback)
    this.extensionManager.registerDomain(domain, onInitError);

    // Step 2: Determine domain semantics based on actions array
    // If unmount_ext is NOT supported, use 'swap' semantics (screen domain)
    // If unmount_ext IS supported, use 'toggle' semantics (sidebar/popup/overlay)
    const supportsUnmount = domain.actions.includes(HAI3_ACTION_UNMOUNT_EXT);
    const domainSemantics = supportsUnmount ? 'toggle' : 'swap';

    // Step 3: Create lifecycle callbacks that route through OperationSerializer to MountManager
    const lifecycleCallbacks: ExtensionLifecycleCallbacks = {
      loadExtension: (id) =>
        this.operationSerializer.serializeOperation(id, () => this.mountManager.loadExtension(id)),
      mountExtension: (id, container) =>
        this.operationSerializer.serializeOperation(id, () => this.mountManager.mountExtension(id, container)),
      unmountExtension: (id) =>
        this.operationSerializer.serializeOperation(id, () => this.mountManager.unmountExtension(id)),
      getMountedExtension: (domainId) =>
        this.extensionManager.getMountedExtension(domainId),
    };

    // Step 4: Create and register extension lifecycle action handler for this domain
    const actionHandler = new ExtensionLifecycleActionHandler(
      domain.id,
      lifecycleCallbacks,
      domainSemantics,
      containerProvider
    );
    this.registerDomainActionHandler(domain.id, actionHandler);
  }

  /**
   * Execute an actions chain.
   * Delegates to the ActionsChainsMediator for chain execution.
   *
   * @param chain - Actions chain to execute
   * @param options - Optional execution options
   * @returns Promise resolving to chain result
   */
  async executeActionsChain(
    chain: ActionsChain,
    options?: ChainExecutionOptions
  ): Promise<ChainResult> {
    return this.mediator.executeActionsChain(chain, options);
  }

  /**
   * Register an extension's action handler.
   *
   * @param extensionId - ID of the extension
   * @param domainId - ID of the domain
   * @param entryId - ID of the MFE entry
   * @param handler - The action handler
   */
  registerExtensionActionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: import('../mediator').ActionHandler
  ): void {
    this.mediator.registerExtensionHandler(extensionId, domainId, entryId, handler);
  }

  /**
   * Unregister an extension's action handler.
   *
   * @param extensionId - ID of the extension
   */
  unregisterExtensionActionHandler(extensionId: string): void {
    this.mediator.unregisterExtensionHandler(extensionId);
  }

  /**
   * Register a domain's action handler.
   *
   * @param domainId - ID of the domain
   * @param handler - The action handler
   */
  registerDomainActionHandler(
    domainId: string,
    handler: import('../mediator').ActionHandler
  ): void {
    this.mediator.registerDomainHandler(domainId, handler);
  }

  /**
   * Unregister a domain's action handler.
   *
   * @param domainId - ID of the domain
   */
  unregisterDomainActionHandler(domainId: string): void {
    this.mediator.unregisterDomainHandler(domainId);
  }

  /**
   * Update a single domain property.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to update
   * @param value - New property value
   */
  updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void {
    this.extensionManager.updateDomainProperty(domainId, propertyTypeId, value);
  }

  /**
   * Get a domain property value.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to get
   * @returns Property value, or undefined if not set
   */
  getDomainProperty(domainId: string, propertyTypeId: string): unknown {
    return this.extensionManager.getDomainProperty(domainId, propertyTypeId);
  }

  /**
   * Get the currently mounted extension in a domain.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain
   * @returns Extension ID if mounted, undefined otherwise
   */
  getMountedExtension(domainId: string): string | undefined {
    return this.extensionManager.getMountedExtension(domainId);
  }

  /**
   * Returns the ParentMfeBridge for the given extension, or null if the extension
   * is not mounted or does not exist. This is a query method -- it reads from
   * ExtensionState.bridge, which is set by MountManager.mountExtension() during
   * mount and cleared during unmount.
   *
   * @param extensionId - ID of the extension
   * @returns ParentMfeBridge if extension is mounted, null otherwise
   */
  getParentBridge(extensionId: string): ParentMfeBridge | null {
    return this.extensionManager.getExtensionState(extensionId)?.bridge ?? null;
  }

  /**
   * Update multiple domain properties at once.
   * More efficient than calling updateDomainProperty multiple times.
   *
   * @param domainId - ID of the domain
   * @param properties - Map of property type IDs to values
   */
  updateDomainProperties(domainId: string, properties: Map<string, unknown>): void {
    for (const [propertyTypeId, value] of properties) {
      this.updateDomainProperty(domainId, propertyTypeId, value);
    }
  }

  // NOTE: Bridge factory is injected into DefaultMountManager via constructor (used by mountExtension)

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
  async registerExtension(extension: Extension): Promise<void> {
    return this.operationSerializer.serializeOperation(extension.id, async () => {
      return this.extensionManager.registerExtension(extension);
    });
  }

  /**
   * Unregister an extension from the registry.
   * If the extension is currently mounted, it will be unmounted first.
   * The extension is removed from the registry and its domain.
   *
   * @param extensionId - ID of the extension to unregister
   * @returns Promise resolving when unregistration is complete
   */
  async unregisterExtension(extensionId: string): Promise<void> {
    return this.operationSerializer.serializeOperation(extensionId, async () => {
      return this.extensionManager.unregisterExtension(extensionId);
    });
  }

  /**
   * Unregister a domain from the registry.
   * All extensions in the domain are cascade-unregistered first.
   * The domain is removed from the registry.
   *
   * @param domainId - ID of the domain to unregister
   * @returns Promise resolving when unregistration is complete
   */
  async unregisterDomain(domainId: string): Promise<void> {
    return this.operationSerializer.serializeOperation(domainId, async () => {
      // Step 1: Unregister domain action handler
      this.unregisterDomainActionHandler(domainId);

      // Step 2: Unregister domain from extension manager (cascade-unregisters extensions)
      return this.extensionManager.unregisterDomain(domainId);
    });
  }


  /**
   * Get a registered extension by its ID.
   * Delegates to ExtensionManager.
   *
   * @param extensionId - ID of the extension to get
   * @returns Extension if registered, undefined otherwise
   */
  getExtension(extensionId: string): Extension | undefined {
    return this.extensionManager.getExtensionState(extensionId)?.extension;
  }

  /**
   * Get a registered domain by its ID.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain to get
   * @returns ExtensionDomain if registered, undefined otherwise
   */
  getDomain(domainId: string): ExtensionDomain | undefined {
    return this.extensionManager.getDomainState(domainId)?.domain;
  }

  /**
   * Get all extensions registered for a specific domain.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain
   * @returns Array of extensions in the domain (empty if domain not found or has no extensions)
   */
  getExtensionsForDomain(domainId: string): Extension[] {
    const extensionStates = this.extensionManager.getExtensionStatesForDomain(domainId);
    return extensionStates.map(state => state.extension);
  }

  /**
   * Trigger a lifecycle stage for a specific extension.
   * Delegates to LifecycleManager.
   *
   * @param extensionId - ID of the extension
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerLifecycleStage(extensionId: string, stageId: string): Promise<void> {
    return this.lifecycleManager.triggerLifecycleStage(extensionId, stageId);
  }

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Delegates to LifecycleManager.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void> {
    return this.lifecycleManager.triggerDomainLifecycleStage(domainId, stageId);
  }

  /**
   * Trigger a lifecycle stage for a domain itself.
   * Delegates to LifecycleManager.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void> {
    return this.lifecycleManager.triggerDomainOwnLifecycleStage(domainId, stageId);
  }

  /**
   * Get domain state for a registered domain.
   * INTERNAL: Used by ActionsChainsMediator for domain resolution.
   * Delegates to ExtensionManager.
   *
   * @param domainId - ID of the domain
   * @returns Domain state, or undefined if not found
   */
  getDomainState(domainId: string): ExtensionDomainState | undefined {
    return this.extensionManager.getDomainState(domainId);
  }


  /**
   * Dispose the registry and clean up resources.
   * Cleans up all bridges, runtime connections, and internal state.
   */
  dispose(): void {
    // Dispose parent bridge if present
    if (this.parentBridge) {
      this.parentBridge.dispose();
      this.parentBridge = null;
    }

    // Dispose all child bridges
    for (const bridge of this.childBridges.values()) {
      bridge.dispose();
    }
    this.childBridges.clear();

    // Clear collaborator state
    this.extensionManager.clear();
    this.operationSerializer.clear();

    // Clear handlers
    this.handlers.length = 0;

    // Note: RuntimeCoordinator (using internal WeakMap) will be garbage collected automatically.
    // No need to manually clear it. The coordinator is used for bridge coordination.
    // Reference here to avoid TypeScript unused warning:
    void this.coordinator;
  }
}
