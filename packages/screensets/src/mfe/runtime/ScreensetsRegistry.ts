/**
 * ScreensetsRegistry - Core MFE Runtime
 *
 * Central registry for managing MFE extensions, domains, and lifecycle.
 * Each MFE instance has its own ScreensetsRegistry for instance-level isolation.
 *
 * Key Responsibilities:
 * - Type validation via TypeSystemPlugin
 * - Extension and domain registration
 * - Action chain mediation (Phase 9)
 * - MFE loading and mounting (Phase 11+)
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { ScreensetsRegistryConfig } from './config';
import type { MfeHandler } from '../handler/types';
import type {
  ExtensionDomain,
  Extension,
  Action,
  ActionsChain,
} from '../types';

/**
 * State for a registered extension domain.
 */
interface ExtensionDomainState {
  domain: ExtensionDomain;
  properties: Map<string, unknown>;
  extensions: Set<string>;
  propertySubscribers: Map<string, Set<(value: unknown) => void>>;
}

/**
 * State for a registered extension.
 */
interface ExtensionState {
  extension: Extension;
  entry: unknown;
  bridge: unknown | null;
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  mountState: 'unmounted' | 'mounting' | 'mounted' | 'error';
  error?: Error;
}

/**
 * Result of action chain execution.
 */
interface ChainResult {
  completed: boolean;
  path: string[];
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
      'gts.hai3.screensets.mfe.entry.v1~',
      'gts.hai3.screensets.ext.domain.v1~',
      'gts.hai3.screensets.ext.extension.v1~',
      'gts.hai3.screensets.ext.shared_property.v1~',
      'gts.hai3.screensets.ext.action.v1~',
      'gts.hai3.screensets.ext.actions_chain.v1~',
      'gts.hai3.screensets.ext.lifecycle_stage.v1~',
      'gts.hai3.screensets.ext.lifecycle_hook.v1~',
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
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.domain.v1~',
      domain
    );

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
   * Validate type ID format via plugin.
   *
   * @param typeId - Type ID to validate
   * @param context - Context for error message
   * @throws Error if type ID is invalid
   */
  private validateTypeId(typeId: string, context: string): void {
    if (!this.typeSystem.isValidTypeId(typeId)) {
      throw new Error(
        `Invalid type ID in ${context}: "${typeId}". ` +
        `Type IDs must conform to the format expected by the ${this.typeSystem.name} plugin.`
      );
    }
  }

  /**
   * Validate action payload via plugin.
   *
   * @param action - Action to validate
   * @returns Validation result
   */
  private validateActionPayload(action: Action): { valid: boolean; errors: string[] } {
    // Validate action type ID
    this.validateTypeId(action.type, 'action.type');

    // Validate target type ID
    this.validateTypeId(action.target, 'action.target');

    // If payload is present, validate it against action schema
    if (action.payload !== undefined) {
      const validation = this.typeSystem.validateInstance(
        action.type,
        action.payload
      );

      if (!validation.valid) {
        return {
          valid: false,
          errors: validation.errors.map(e => e.message),
        };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Execute an actions chain.
   * This is a placeholder for Phase 9 (ActionsChainsMediator implementation).
   *
   * @param chain - Actions chain to execute
   * @returns Promise resolving to chain result
   */
  async executeActionsChain(chain: ActionsChain): Promise<ChainResult> {
    // Validate action
    const validation = this.validateActionPayload(chain.action);
    if (!validation.valid) {
      return {
        completed: false,
        path: [chain.action.type],
        error: new Error(`Action validation failed: ${validation.errors.join(', ')}`),
      };
    }

    // TODO: Full implementation in Phase 9
    this.log('Actions chain execution (placeholder)', {
      actionType: chain.action.type,
      target: chain.action.target,
    });

    return {
      completed: true,
      path: [chain.action.type],
    };
  }

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
          this.handleError(error as Error, { event, data });
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
   * Dispose the registry and clean up resources.
   */
  dispose(): void {
    this.domains.clear();
    this.extensions.clear();
    this.handlers.length = 0;
    this.eventListeners.clear();
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
