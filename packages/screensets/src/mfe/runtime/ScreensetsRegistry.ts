/**
 * ScreensetsRegistry - Core MFE Runtime
 *
 * Central registry for managing MFE extensions, domains, and lifecycle.
 * Each MFE instance has its own ScreensetsRegistry for instance-level isolation.
 *
 * Key Responsibilities:
 * - Type validation via TypeSystemPlugin
 * - Extension and domain registration
 * - Domain property management
 * - Bridge lifecycle management
 * - Runtime coordination (internal)
 * - Action chain mediation (Phase 9)
 * - MFE loading and mounting (Phase 11+)
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { ScreensetsRegistryConfig } from './config';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type {
  ExtensionDomain,
  Extension,
  ActionsChain,
  MfeEntry,
  SharedProperty,
} from '../types';
import { RuntimeCoordinator } from '../coordination/types';
import { WeakMapRuntimeCoordinator } from '../coordination/weak-map-runtime-coordinator';
import { ActionsChainsMediator, type ChainResult, type ChainExecutionOptions } from '../mediator';
import { DefaultActionsChainsMediator } from '../mediator/actions-chains-mediator';

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
interface ExtensionState {
  extension: Extension;
  entry: MfeEntry;
  bridge: ParentMfeBridge | null;
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  mountState: 'unmounted' | 'mounting' | 'mounted' | 'error';
  error?: Error;
}


/**
 * Central registry for MFE screensets.
 *
 * This is the core runtime that manages:
 * - Extension domains (extension points)
 * - Extensions (MFE instances)
 * - Type System plugin integration
 * - Action chain mediation
 * - MFE loading and lifecycle
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
 * registry.registerExtension(myExtension);
 * ```
 */
export class ScreensetsRegistry {
  /**
   * Type System plugin instance.
   * All type validation and schema operations go through this plugin.
   */
  public readonly typeSystem: TypeSystemPlugin;

  /**
   * Configuration options.
   */
  private readonly config: ScreensetsRegistryConfig;

  /**
   * Registered extension domains.
   */
  private readonly domains = new Map<string, ExtensionDomainState>();

  /**
   * Registered extensions.
   */
  private readonly extensions = new Map<string, ExtensionState>();

  /**
   * Registered MFE handlers.
   */
  private readonly handlers: MfeHandler[] = [];

  /**
   * Event listeners.
   */
  private readonly eventListeners = new Map<string, Set<(data: Record<string, unknown>) => void>>();

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

  /**
   * Runtime coordinator for managing runtime connections.
   * INTERNAL: Uses Dependency Inversion Principle - depends on abstract RuntimeCoordinator.
   * Defaults to WeakMapRuntimeCoordinator if not provided in config.
   * Maps container elements to runtime connections for MFE coordination.
   *
   * NOTE: This replaces the previous _runtimeConnections WeakMap (Phase 8.4).
   */
  private readonly coordinator: RuntimeCoordinator;

  /**
   * Actions chains mediator for action chain execution.
   * INTERNAL: Uses Dependency Inversion Principle - depends on abstract ActionsChainsMediator.
   * Handles action routing, validation, and success/failure branching.
   *
   * NOTE: Introduced in Phase 9.
   */
  private readonly mediator: ActionsChainsMediator;

  constructor(config: ScreensetsRegistryConfig) {
    // Validate required plugin
    if (!config.typeSystem) {
      throw new Error(
        'ScreensetsRegistry requires a TypeSystemPlugin. ' +
        'Provide it via config.typeSystem parameter. ' +
        'Example: createScreensetsRegistry({ typeSystem: gtsPlugin })'
      );
    }

    this.config = config;
    this.typeSystem = config.typeSystem;

    // Initialize coordinator (Dependency Inversion: use provided or default to WeakMapRuntimeCoordinator)
    this.coordinator = config.coordinator ?? new WeakMapRuntimeCoordinator();

    // Initialize mediator (Dependency Inversion: use provided or default to DefaultActionsChainsMediator)
    this.mediator = config.mediator ?? new DefaultActionsChainsMediator(this.typeSystem, this);

    // Verify first-class schemas are available
    this.verifyFirstClassSchemas();

    // Register custom handler if provided
    if (config.mfeHandler) {
      this.registerHandler(config.mfeHandler);
    }

    this.log('ScreensetsRegistry initialized', {
      plugin: this.typeSystem.name,
      pluginVersion: this.typeSystem.version,
    });
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

    this.log('First-class schemas verified', { count: coreTypeIds.length });
  }

  /**
   * Register an MFE handler.
   *
   * @param handler - Handler instance to register
   */
  registerHandler(handler: MfeHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.log('Handler registered', {
      handledBaseTypeId: handler.handledBaseTypeId,
      priority: handler.priority ?? 0,
    });
  }

  /**
   * Register an extension domain.
   * Domains must be registered before extensions can mount into them.
   *
   * @param domain - Domain to register
   */
  registerDomain(domain: ExtensionDomain): void {
    // GTS-native validation: register then validate by ID
    this.typeSystem.register(domain);
    const validation = this.typeSystem.validateInstance(domain.id);

    if (!validation.valid) {
      throw new Error(
        `Domain validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
      propertySubscribers: new Map(),
    });

    this.emit('domainRegistered', { domainId: domain.id });
    this.log('Domain registered', { domainId: domain.id });
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
   * Notifies all subscribed extensions in the domain.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to update
   * @param value - New property value
   */
  updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      throw new Error(`Domain '${domainId}' not registered`);
    }

    if (!domainState.domain.sharedProperties.includes(propertyTypeId)) {
      throw new Error(`Property '${propertyTypeId}' not declared in domain '${domainId}'`);
    }

    // Update property value
    const sharedProperty: SharedProperty = { id: propertyTypeId, value };
    domainState.properties.set(propertyTypeId, sharedProperty);

    // Notify property subscribers
    const subscribers = domainState.propertySubscribers.get(propertyTypeId);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(sharedProperty);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error(String(error)),
            { domainId, propertyTypeId }
          );
        }
      }
    }

    this.log('Domain property updated', { domainId, propertyTypeId });
  }

  /**
   * Get a domain property value.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to get
   * @returns Property value, or undefined if not set
   */
  getDomainProperty(domainId: string, propertyTypeId: string): unknown {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      throw new Error(`Domain '${domainId}' not registered`);
    }

    const sharedProperty = domainState.properties.get(propertyTypeId);
    return sharedProperty?.value;
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

  // Phase 19.3: mountExtension/unmountExtension will use this.coordinator to manage
  // runtime connections during MFE lifecycle (register/get/unregister).

  /**
   * Subscribe to registry events.
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  on(event: string, callback: (data: Record<string, unknown>) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from registry events.
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  off(event: string, callback: (data: Record<string, unknown>) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit a registry event.
   *
   * @param event - Event name
   * @param data - Event data
   */
  private emit(event: string, data: Record<string, unknown>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error(String(error)), { event, data });
        }
      }
    }
  }

  /**
   * Log a message if debug is enabled.
   *
   * @param message - Message to log
   * @param context - Additional context
   */
  private log(message: string, context?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log('[ScreensetsRegistry]', message, context ?? '');
    }
  }

  /**
   * Handle an error.
   *
   * @param error - Error to handle
   * @param context - Additional context
   */
  private handleError(error: Error, context: Record<string, unknown>): void {
    if (this.config.onError) {
      this.config.onError(error, context);
    } else {
      console.error('[ScreensetsRegistry] Error:', error, context);
    }
  }

  /**
   * Get domain state for a registered domain.
   * INTERNAL: Used by ActionsChainsMediator for domain resolution.
   *
   * @param domainId - ID of the domain
   * @returns Domain state, or undefined if not found
   */
  getDomainState(domainId: string): ExtensionDomainState | undefined {
    return this.domains.get(domainId);
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

    // Clear domains and extensions
    this.domains.clear();
    this.extensions.clear();

    // Clear handlers
    this.handlers.length = 0;

    // Clear event listeners
    this.eventListeners.clear();

    // Note: RuntimeCoordinator (using internal WeakMap) will be garbage collected automatically.
    // No need to manually clear it. The coordinator is used for Phase 11+ bridge coordination.
    // Reference here to avoid TypeScript unused warning:
    void this.coordinator;

    this.log('ScreensetsRegistry disposed');
  }
}

/**
 * Factory function to create a ScreensetsRegistry instance.
 *
 * @param config - Registry configuration
 * @returns ScreensetsRegistry instance
 *
 * @example
 * ```typescript
 * import { createScreensetsRegistry } from '@hai3/screensets';
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const registry = createScreensetsRegistry({
 *   typeSystem: gtsPlugin,
 *   debug: true
 * });
 * ```
 */
export function createScreensetsRegistry(
  config: ScreensetsRegistryConfig
): ScreensetsRegistry {
  return new ScreensetsRegistry(config);
}
