/**
 * BaseApiService - Abstract base class for API services
 *
 * Manages protocol registration and plugin lifecycle.
 * Services extend this class to implement domain-specific API methods.
 *
 * SDK Layer: L1 (Only peer dependency on axios)
 */

import type {
  ApiServiceConfig,
  ApiProtocol,
  ApiPluginBase,
  PluginClass,
} from './types';

/**
 * BaseApiService Implementation
 *
 * Abstract base class for all API services.
 * Manages protocols and plugins with priority-based execution.
 *
 * @example
 * ```typescript
 * class AccountsApiService extends BaseApiService {
 *   constructor() {
 *     super(
 *       { baseURL: '/api/accounts' },
 *       new RestProtocol()
 *     );
 *   }
 *
 *   async getCurrentUser(): Promise<User> {
 *     return this.protocol(RestProtocol).get('/user/current');
 *   }
 * }
 * ```
 */
export abstract class BaseApiService {
  /** Base configuration for all requests */
  protected readonly config: Readonly<ApiServiceConfig>;

  /** Registered protocols by constructor name */
  protected readonly protocols: Map<string, ApiProtocol> = new Map();

  /** Registered plugins sorted by priority */
  protected registeredPlugins: ApiPluginBase[] = [];

  /** Service-specific plugins (new class-based system) */
  private servicePlugins: ApiPluginBase[] = [];

  /** Excluded global plugin classes */
  private excludedPluginClasses: Set<PluginClass> = new Set();

  constructor(config: ApiServiceConfig, ...protocols: ApiProtocol[]) {
    this.config = Object.freeze({ ...config });

    // Initialize each protocol with callbacks
    protocols.forEach((protocol) => {
      protocol.initialize(
        this.config,
        () => this.getPluginsInOrder(), // Plugins
        () => this.getMergedPluginsInOrder(), // Class-based plugins (service-level)
        () => this.getExcludedPluginClasses() // Excluded global plugin classes
      );
      this.protocols.set(protocol.constructor.name, protocol);
    });
  }

  // ============================================================================
  // Namespaced Plugin API (Service-Level)
  // ============================================================================

  /**
   * Namespaced plugin API for service-level plugin management.
   * Provides methods to add service-specific plugins, exclude global plugins,
   * and query plugin state.
   */
  readonly plugins = {
    /**
     * Add one or more service-specific plugins.
     * Plugins are executed in FIFO order (first added executes first).
     * Duplicates of the same class ARE allowed (for different configurations).
     *
     * @param plugins - Plugin instances to add
     *
     * @example
     * ```typescript
     * class MyService extends BaseApiService {
     *   constructor() {
     *     super({ baseURL: '/api' }, new RestProtocol());
     *     this.plugins.add(
     *       new RateLimitPlugin({ limit: 100 }),
     *       new RetryPlugin({ maxRetries: 3 })
     *     );
     *   }
     * }
     * ```
     */
    add: (...plugins: ApiPluginBase[]): void => {
      this.servicePlugins.push(...plugins);
    },

    /**
     * Exclude global plugin classes from this service.
     * Excluded plugins will not be applied to requests through this service.
     *
     * @param pluginClasses - Plugin classes to exclude
     *
     * @example
     * ```typescript
     * class HealthCheckService extends BaseApiService {
     *   constructor() {
     *     super({ baseURL: '/health' }, new RestProtocol());
     *     // Don't apply authentication to health checks
     *     this.plugins.exclude(AuthPlugin);
     *   }
     * }
     * ```
     */
    exclude: (...pluginClasses: PluginClass[]): void => {
      pluginClasses.forEach((cls) => this.excludedPluginClasses.add(cls));
    },

    /**
     * Get all excluded plugin classes.
     *
     * @returns Readonly array of excluded plugin classes
     *
     * @example
     * ```typescript
     * const excluded = service.plugins.getExcluded();
     * console.log(`${excluded.length} plugin classes excluded`);
     * ```
     */
    getExcluded: (): readonly PluginClass[] => {
      return Array.from(this.excludedPluginClasses);
    },

    /**
     * Get all service-specific plugins.
     * Does NOT include global plugins.
     *
     * @returns Readonly array of service plugins in FIFO order
     *
     * @example
     * ```typescript
     * const plugins = service.plugins.getAll();
     * console.log(`${plugins.length} service plugins registered`);
     * ```
     */
    getAll: (): readonly ApiPluginBase[] => {
      return [...this.servicePlugins];
    },

    /**
     * Get a plugin instance by class reference.
     * Searches service-specific plugins first, then global plugins.
     * Returns undefined if plugin is not found.
     *
     * @template T - Plugin type
     * @param pluginClass - Plugin class to retrieve
     * @returns Plugin instance or undefined
     *
     * @example
     * ```typescript
     * const rateLimit = service.plugins.getPlugin(RateLimitPlugin);
     * if (rateLimit) {
     *   console.log('Rate limit plugin found');
     * }
     *
     * // Can also find global plugins
     * const auth = service.plugins.getPlugin(AuthPlugin);
     * ```
     */
    getPlugin: <T extends ApiPluginBase>(
      pluginClass: new (...args: never[]) => T
    ): T | undefined => {
      // Search service plugins only
      // Note: Protocol-level global plugins are now managed by apiRegistry.plugins
      // and are not accessible through service.plugins.getPlugin()
      const servicePlugin = this.servicePlugins.find(
        (p) => p instanceof pluginClass
      );
      return servicePlugin as T | undefined;
    },
  };

  // ============================================================================
  // Plugin Merging
  // ============================================================================

  /**
   * Get merged plugins in FIFO order.
   * Returns only service plugins (global protocol plugins are managed by protocols directly).
   *
   * @returns Readonly array of service plugins in execution order
   *
   * @internal
   */
  protected getMergedPluginsInOrder(): readonly ApiPluginBase[] {
    // Return only service plugins
    // Protocol-level global plugins are now queried directly by protocols via apiRegistry
    return [...this.servicePlugins];
  }

  /**
   * Get excluded plugin classes.
   * Used by protocols to filter global plugins.
   *
   * @returns Readonly set of excluded plugin classes
   *
   * @internal
   */
  protected getExcludedPluginClasses(): ReadonlySet<PluginClass> {
    return this.excludedPluginClasses;
  }

  /**
   * Get merged plugins in reverse order.
   * Used for response phase processing (onion model).
   *
   * @returns Readonly array of merged plugins in reverse execution order
   *
   * @internal
   */
  protected getMergedPluginsReversed(): readonly ApiPluginBase[] {
    return [...this.getMergedPluginsInOrder()].reverse();
  }

  // ============================================================================
  // Plugin Management
  // ============================================================================

  /**
   * Register a plugin.
   * Plugins are auto-sorted by priority (descending).
   *
   * @param plugin - Plugin instance
   */
  registerPlugin(plugin: ApiPluginBase): void {
    // Check if plugin already registered
    if (this.hasPlugin(plugin.constructor as new (...args: unknown[]) => ApiPluginBase)) {
      console.warn(`Plugin is already registered. Skipping.`);
      return;
    }

    this.registeredPlugins.push(plugin);
    this.sortPluginsByPriority();
  }

  /**
   * Unregister a plugin by class.
   *
   * @param pluginClass - Plugin class (uses name for matching)
   */
  unregisterPlugin<T extends ApiPluginBase>(pluginClass: { readonly name: string; prototype: T }): void {
    const index = this.registeredPlugins.findIndex(
      (p) => p.constructor.name === pluginClass.name
    );

    if (index !== -1) {
      const plugin = this.registeredPlugins[index];
      // Call destroy if available
      if ('destroy' in plugin && typeof plugin.destroy === 'function') {
        (plugin as { destroy: () => void }).destroy();
      }
      this.registeredPlugins.splice(index, 1);
    }
  }

  /**
   * Check if a plugin is registered.
   *
   * @param pluginClass - Plugin class (uses name for matching)
   * @returns True if registered
   */
  hasPlugin<T extends ApiPluginBase>(pluginClass: { readonly name: string; prototype: T }): boolean {
    return this.registeredPlugins.some((p) => p.constructor.name === pluginClass.name);
  }

  /**
   * Get plugins sorted by priority (high to low).
   * Used for request handling.
   */
  getPluginsInOrder(): readonly ApiPluginBase[] {
    return [...this.registeredPlugins];
  }

  /**
   * Get plugins in reverse priority order (low to high).
   * Used for response handling.
   */
  getPluginsReversed(): readonly ApiPluginBase[] {
    return [...this.registeredPlugins].reverse();
  }

  /**
   * Sort plugins by priority (descending).
   */
  private sortPluginsByPriority(): void {
    this.registeredPlugins.sort((a, b) => {
      const priorityA = 'priority' in a ? (a as { priority: number }).priority : 0;
      const priorityB = 'priority' in b ? (b as { priority: number }).priority : 0;
      return priorityB - priorityA;
    });
  }

  // ============================================================================
  // Protocol Access
  // ============================================================================

  /**
   * Get a registered protocol by class.
   * Type-safe: Returns correctly typed protocol.
   *
   * @param type - Protocol class constructor
   * @returns The protocol instance
   * @throws Error if protocol not registered
   */
  protected protocol<T extends ApiProtocol>(
    type: new (...args: never[]) => T
  ): T {
    const protocol = this.protocols.get(type.name);

    if (!protocol) {
      throw new Error(
        `Protocol "${type.name}" is not registered on this service.`
      );
    }

    return protocol as T;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup service resources.
   * Called when service is destroyed.
   */
  cleanup(): void {
    // Cleanup all protocols
    this.protocols.forEach((protocol) => protocol.cleanup());
    this.protocols.clear();

    // Unregister all plugins
    [...this.registeredPlugins].forEach((plugin) => {
      if ('destroy' in plugin && typeof plugin.destroy === 'function') {
        (plugin as { destroy: () => void }).destroy();
      }
    });
    this.registeredPlugins = [];
  }
}
