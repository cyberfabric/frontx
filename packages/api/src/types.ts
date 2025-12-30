/**
 * @hai3/api - Type Definitions
 *
 * Core types for HAI3 API communication.
 * Supports REST, SSE, and mock protocols.
 */

import type { BaseApiService } from './BaseApiService';

// ============================================================================
// JSON Types
// ============================================================================

/**
 * JSON-serializable primitive value
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-serializable value (recursive)
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * JSON object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * JSON-compatible type
 * Broader than JsonValue to accept objects without index signatures.
 * Intentionally permissive to avoid type errors while maintaining runtime JSON-serializability.
 */
export type JsonCompatible = JsonValue | object;

// ============================================================================
// Mock Types
// ============================================================================

/**
 * Mock Response Factory Function
 * Generic function that accepts a request and returns a response.
 *
 * @template TRequest - The request data type
 * @template TResponse - The response data type
 */
export type MockResponseFactory<TRequest = JsonValue, TResponse = JsonValue> = (
  requestData?: TRequest
) => TResponse;

/**
 * Mock Map
 * Maps endpoint keys to response factories.
 *
 * @example
 * ```typescript
 * const mockMap: MockMap = {
 *   'GET /users': () => [{ id: '1', name: 'John' }],
 *   'POST /users': (data) => ({ id: '2', ...data }),
 * };
 * ```
 */
export type MockMap = Record<string, MockResponseFactory<JsonValue, JsonCompatible>>;

// ============================================================================
// API Service Configuration
// ============================================================================

/**
 * API Service Configuration
 * Configuration options for an API service.
 */
export interface ApiServiceConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Default headers for all requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * API Services Global Configuration
 * Global configuration for all API services.
 */
export interface ApiServicesConfig {
  // Empty - mock config removed (OCP/DIP - now in MockPluginConfig)
}

// ============================================================================
// API Protocol Interface
// ============================================================================

/**
 * API Protocol Interface
 * Base interface for all API communication protocols.
 */
export interface ApiProtocol {
  /**
   * Initialize the protocol with configuration.
   *
   * @param config - Base service configuration
   * @param getMockMap - Function to access mock response map
   * @param getPlugins - Function to access registered plugins
   * @param getClassPlugins - Function to access class-based plugins (merged global + service)
   */
  initialize(
    config: Readonly<ApiServiceConfig>,
    getMockMap: () => Readonly<MockMap>,
    getPlugins: () => ReadonlyArray<ApiPluginBase>,
    getClassPlugins: () => ReadonlyArray<ApiPluginBase>
  ): void;

  /**
   * Cleanup protocol resources.
   */
  cleanup(): void;
}

/**
 * REST Protocol Configuration
 * Configuration options for REST protocol.
 */
export interface RestProtocolConfig {
  /** Whether to include credentials */
  withCredentials?: boolean;
  /** Content type header */
  contentType?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * SSE Protocol Configuration
 * Configuration options for Server-Sent Events protocol.
 */
export interface SseProtocolConfig {
  /** Whether to include credentials */
  withCredentials?: boolean;
  /** Number of reconnect attempts */
  reconnectAttempts?: number;
}

// ============================================================================
// API Plugin Interface
// ============================================================================

/**
 * API Request Context
 * Pure request data passed to plugins during request lifecycle.
 * Contains only request information - no service-specific metadata.
 * Plugins use dependency injection for service-specific behavior.
 */
export interface ApiRequestContext {
  /** HTTP method */
  readonly method: string;
  /** Request URL */
  readonly url: string;
  /** Request headers */
  readonly headers: Record<string, string>;
  /** Request body */
  readonly body?: unknown;
}

/**
 * API Response Context
 * Response data passed to plugins during response lifecycle.
 */
export interface ApiResponseContext {
  /** HTTP status code */
  readonly status: number;
  /** Response headers */
  readonly headers: Record<string, string>;
  /** Response data */
  readonly data: unknown;
}

/**
 * Short Circuit Response
 * Returned by plugins to skip HTTP request and provide immediate response.
 *
 * @example
 * ```typescript
 * class MockPlugin extends ApiPlugin<MockPluginConfig> {
 *   async onRequest(ctx: ApiRequestContext): Promise<ApiRequestContext | ShortCircuitResponse> {
 *     const mockData = this.findMock(ctx.url);
 *     if (mockData) {
 *       return {
 *         shortCircuit: {
 *           status: 200,
 *           headers: { 'x-hai3-short-circuit': 'true' },
 *           data: mockData
 *         }
 *       };
 *     }
 *     return ctx;
 *   }
 * }
 * ```
 */
export interface ShortCircuitResponse {
  /** Response to return immediately, skipping HTTP request */
  readonly shortCircuit: ApiResponseContext;
}

/**
 * API Plugin Base Class
 * Abstract base class for all API plugins.
 * Non-generic class used for storage in arrays and maps.
 *
 * @example
 * ```typescript
 * class LoggingPlugin extends ApiPluginBase {
 *   onRequest(ctx) {
 *     console.log(`Request: ${ctx.method} ${ctx.url}`);
 *     return ctx;
 *   }
 *
 *   onResponse(ctx) {
 *     console.log(`Response: ${ctx.status}`);
 *     return ctx;
 *   }
 * }
 * ```
 */
export abstract class ApiPluginBase {
  /**
   * Called before request is sent.
   * Can modify the request context or short-circuit with immediate response.
   *
   * @param context - Request context
   * @returns Modified request context, short-circuit response, or Promise
   */
  onRequest?(
    context: ApiRequestContext
  ): ApiRequestContext | ShortCircuitResponse | Promise<ApiRequestContext | ShortCircuitResponse>;

  /**
   * Called after response is received.
   * Can modify the response context.
   *
   * @param context - Response context
   * @returns Modified response context (or Promise)
   */
  onResponse?(
    context: ApiResponseContext
  ): ApiResponseContext | Promise<ApiResponseContext>;

  /**
   * Called when an error occurs.
   * Can transform the error or provide a recovery response.
   *
   * @param error - The error that occurred
   * @param context - Request context at time of error
   * @returns Modified error, recovery response, or Promise
   */
  onError?(
    error: Error,
    context: ApiRequestContext
  ): Error | ApiResponseContext | Promise<Error | ApiResponseContext>;

  /**
   * Called when plugin is removed or registry is reset.
   * Use for cleanup of resources.
   */
  destroy?(): void;
}

/**
 * API Plugin Generic Class
 * Generic abstract class extending ApiPluginBase with typed configuration.
 * Use this when your plugin needs configuration passed via constructor.
 *
 * @template TConfig - Configuration type (defaults to void for no config)
 *
 * @example
 * ```typescript
 * interface AuthConfig {
 *   getToken: () => string;
 * }
 *
 * class AuthPlugin extends ApiPlugin<AuthConfig> {
 *   onRequest(ctx) {
 *     ctx.headers['Authorization'] = `Bearer ${this.config.getToken()}`;
 *     return ctx;
 *   }
 * }
 *
 * // With config
 * apiRegistry.plugins.add(new AuthPlugin({ getToken: () => 'token' }));
 *
 * // Without config (void)
 * class LoggingPlugin extends ApiPlugin<void> {
 *   constructor() { super(void 0); }
 *   onRequest(ctx) { console.log('Request'); return ctx; }
 * }
 * ```
 */
export abstract class ApiPlugin<TConfig = void> extends ApiPluginBase {
  constructor(protected readonly config: TConfig) {
    super();
  }
}

/**
 * Plugin Class Type
 * Type for plugin class references (abstract constructors).
 * Used for plugin identification and storage.
 *
 * @template T - Plugin type (defaults to ApiPluginBase)
 *
 * @example
 * ```typescript
 * const pluginClass: PluginClass<AuthPlugin> = AuthPlugin;
 * apiRegistry.plugins.has(pluginClass);
 * ```
 */
export type PluginClass<T extends ApiPluginBase = ApiPluginBase> = abstract new (...args: never[]) => T;

/**
 * Short Circuit Type Guard
 * Checks if a plugin result is a short-circuit response.
 *
 * @param result - Plugin onRequest result
 * @returns True if result is a short-circuit response
 *
 * @example
 * ```typescript
 * const result = await plugin.onRequest?.(ctx);
 * if (isShortCircuit(result)) {
 *   return result.shortCircuit;
 * }
 * ```
 */
export function isShortCircuit(
  result: ApiRequestContext | ShortCircuitResponse | undefined
): result is ShortCircuitResponse {
  return result !== undefined && 'shortCircuit' in result;
}

// ============================================================================
// API Service Interface
// ============================================================================

/**
 * API Service Interface
 * Base interface for all API services.
 * Follows Liskov Substitution Principle - any implementation can substitute.
 *
 * @example
 * ```typescript
 * class AccountsApiService implements ApiService {
 *   async get<T>(url: string): Promise<T> { ... }
 *   async post<T>(url: string, data: unknown): Promise<T> { ... }
 * }
 * ```
 */
export interface ApiService {
  /**
   * Perform GET request.
   *
   * @template T - Response type
   * @param url - Request URL
   * @param params - Optional query parameters
   * @returns Promise resolving to response data
   */
  get<T>(url: string, params?: Record<string, string>): Promise<T>;

  /**
   * Perform POST request.
   *
   * @template T - Response type
   * @param url - Request URL
   * @param data - Request body
   * @returns Promise resolving to response data
   */
  post<T>(url: string, data?: unknown): Promise<T>;

  /**
   * Perform PUT request.
   *
   * @template T - Response type
   * @param url - Request URL
   * @param data - Request body
   * @returns Promise resolving to response data
   */
  put<T>(url: string, data?: unknown): Promise<T>;

  /**
   * Perform PATCH request.
   *
   * @template T - Response type
   * @param url - Request URL
   * @param data - Request body
   * @returns Promise resolving to response data
   */
  patch<T>(url: string, data?: unknown): Promise<T>;

  /**
   * Perform DELETE request.
   *
   * @template T - Response type
   * @param url - Request URL
   * @returns Promise resolving to response data
   */
  delete<T>(url: string): Promise<T>;
}

// ============================================================================
// API Registry Interface
// ============================================================================

/**
 * Service Constructor Type
 * Constructor for API service classes.
 * All services must extend BaseApiService.
 */
export type ServiceConstructor<T = BaseApiService> = new () => T;

/**
 * API Registry Interface
 * Central registry for all API service instances.
 *
 * @example
 * ```typescript
 * // Register a service
 * apiRegistry.register(AccountsApiService);
 *
 * // Get a service (type-safe)
 * const accounts = apiRegistry.getService(AccountsApiService);
 * const user = await accounts.getCurrentUser();
 * ```
 */
export interface ApiRegistry {
  /**
   * Register an API service by class reference.
   *
   * @template T - Service type extending BaseApiService
   * @param serviceClass - Service constructor (no-arg)
   */
  register<T extends BaseApiService>(serviceClass: new () => T): void;

  /**
   * Get service by class reference.
   * Returns typed service instance.
   *
   * @template T - Service type extending BaseApiService
   * @param serviceClass - Service constructor
   * @returns The service instance
   */
  getService<T extends BaseApiService>(serviceClass: new () => T): T;

  /**
   * Check if service is registered.
   *
   * @template T - Service type extending BaseApiService
   * @param serviceClass - Service constructor
   * @returns True if service exists
   */
  has<T extends BaseApiService>(serviceClass: new () => T): boolean;

  /**
   * Initialize all registered services.
   *
   * @param config - Global API configuration
   */
  initialize(config?: ApiServicesConfig): void;

  /**
   * Get current configuration.
   *
   * @returns Current API configuration
   */
  getConfig(): Readonly<ApiServicesConfig>;

  /**
   * Namespaced plugin API for global plugins.
   * Plugins registered here apply to all services unless excluded.
   */
  readonly plugins: {
    /**
     * Add one or more global plugins.
     * Plugins are executed in FIFO order (first added executes first).
     * Throws if a plugin of the same class is already registered.
     *
     * @param plugins - Plugin instances to add
     * @throws Error if plugin class is already registered
     *
     * @example
     * ```typescript
     * class LoggingPlugin extends ApiPlugin<void> {
     *   constructor() { super(void 0); }
     *   onRequest(ctx) {
     *     console.log(`${ctx.method} ${ctx.url}`);
     *     return ctx;
     *   }
     * }
     *
     * class AuthPlugin extends ApiPlugin<{ getToken: () => string }> {
     *   onRequest(ctx) {
     *     ctx.headers['Authorization'] = `Bearer ${this.config.getToken()}`;
     *     return ctx;
     *   }
     * }
     *
     * // Add plugins in FIFO order
     * apiRegistry.plugins.add(
     *   new LoggingPlugin(),
     *   new AuthPlugin({ getToken: () => 'token' })
     * );
     * ```
     */
    add(...plugins: ApiPluginBase[]): void;

    /**
     * Add a plugin before another plugin by class reference.
     * Throws if target plugin class is not registered.
     * Throws if plugin class is already registered.
     *
     * @template T - Target plugin type
     * @param plugin - Plugin instance to add
     * @param before - Target plugin class to insert before
     * @throws Error if target plugin class not found
     * @throws Error if plugin class already registered
     *
     * @example
     * ```typescript
     * // Add logging plugin
     * apiRegistry.plugins.add(new LoggingPlugin());
     *
     * // Add metrics plugin before logging
     * apiRegistry.plugins.addBefore(new MetricsPlugin(), LoggingPlugin);
     * // Execution order: MetricsPlugin -> LoggingPlugin
     * ```
     */
    addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void;

    /**
     * Add a plugin after another plugin by class reference.
     * Throws if target plugin class is not registered.
     * Throws if plugin class is already registered.
     *
     * @template T - Target plugin type
     * @param plugin - Plugin instance to add
     * @param after - Target plugin class to insert after
     * @throws Error if target plugin class not found
     * @throws Error if plugin class already registered
     *
     * @example
     * ```typescript
     * // Add logging plugin
     * apiRegistry.plugins.add(new LoggingPlugin());
     *
     * // Add auth plugin after logging
     * apiRegistry.plugins.addAfter(new AuthPlugin({ getToken }), LoggingPlugin);
     * // Execution order: LoggingPlugin -> AuthPlugin
     * ```
     */
    addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void;

    /**
     * Remove a plugin by class reference.
     * Calls destroy() on the plugin if available.
     * Throws if plugin class is not registered.
     *
     * @template T - Plugin type
     * @param pluginClass - Plugin class to remove
     * @throws Error if plugin class not registered
     *
     * @example
     * ```typescript
     * // Remove auth plugin
     * apiRegistry.plugins.remove(AuthPlugin);
     * ```
     */
    remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void;

    /**
     * Check if a plugin class is registered.
     *
     * @template T - Plugin type
     * @param pluginClass - Plugin class to check
     * @returns True if plugin class is registered
     *
     * @example
     * ```typescript
     * if (apiRegistry.plugins.has(AuthPlugin)) {
     *   console.log('Auth plugin is active');
     * }
     * ```
     */
    has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean;

    /**
     * Get all registered plugins in execution order.
     *
     * @returns Readonly array of plugins in FIFO order
     *
     * @example
     * ```typescript
     * const plugins = apiRegistry.plugins.getAll();
     * console.log(`${plugins.length} plugins registered`);
     * ```
     */
    getAll(): readonly ApiPluginBase[];

    /**
     * Get a plugin instance by class reference.
     * Returns undefined if plugin is not registered.
     *
     * @template T - Plugin type
     * @param pluginClass - Plugin class to retrieve
     * @returns Plugin instance or undefined
     *
     * @example
     * ```typescript
     * const auth = apiRegistry.plugins.getPlugin(AuthPlugin);
     * if (auth) {
     *   console.log('Auth plugin found');
     * }
     * ```
     */
    getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined;
  };
}
