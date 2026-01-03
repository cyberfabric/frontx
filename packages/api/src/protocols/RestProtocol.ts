/**
 * RestProtocol - REST API communication protocol
 *
 * Implements REST API calls using axios.
 * Supports plugin chain for request/response interception.
 *
 * SDK Layer: L1 (Only peer dependency on axios)
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  ApiProtocol,
  type ApiServiceConfig,
  type RestProtocolConfig,
  type ApiPluginBase,
  type ApiRequestContext,
  type ApiResponseContext,
  type ShortCircuitResponse,
  type RestPluginHooks,
  type HttpMethod,
  type PluginClass,
} from '../types';
import { isShortCircuit } from '../types';
import { apiRegistry } from '../apiRegistry';

/**
 * Default REST protocol configuration.
 */
const DEFAULT_REST_CONFIG: RestProtocolConfig = {
  withCredentials: false,
  contentType: 'application/json',
};

/**
 * RestProtocol Implementation
 *
 * Handles REST API communication with plugin support.
 *
 * @example
 * ```typescript
 * const restProtocol = new RestProtocol({ timeout: 30000 });
 *
 * // Use in a service
 * const data = await restProtocol.get('/users');
 * ```
 */
export class RestProtocol extends ApiProtocol<RestPluginHooks> {
  /** Axios instance */
  private client: AxiosInstance | null = null;

  /** Base service config */
  private config: Readonly<ApiServiceConfig> | null = null;

  /** REST-specific config */
  private restConfig: RestProtocolConfig;

  /** Callback to get service-level plugins from BaseApiService for backward compatibility with function-based plugin API */
  private getPlugins: () => ReadonlyArray<ApiPluginBase> = () => [];

  /** Callback to get excluded plugin classes from service */
  private getExcludedClasses: () => ReadonlySet<PluginClass> = () => new Set();

  /** Instance-specific plugins */
  private _instancePlugins: Set<RestPluginHooks> = new Set();

  /**
   * Instance plugin management namespace
   * Plugins registered here apply only to this RestProtocol instance
   */
  public readonly plugins = {
    /**
     * Add an instance REST plugin
     * @param plugin - Plugin instance implementing RestPluginHooks
     */
    add: (plugin: RestPluginHooks): void => {
      this._instancePlugins.add(plugin);
    },

    /**
     * Remove an instance REST plugin
     * Calls destroy() if available
     * @param plugin - Plugin instance to remove
     */
    remove: (plugin: RestPluginHooks): void => {
      if (this._instancePlugins.has(plugin)) {
        this._instancePlugins.delete(plugin);
        plugin.destroy();
      }
    },

    /**
     * Get all instance plugins
     */
    getAll: (): readonly RestPluginHooks[] => {
      return Array.from(this._instancePlugins);
    },
  };

  constructor(restConfig: RestProtocolConfig = {}) {
    super();
    this.restConfig = { ...DEFAULT_REST_CONFIG, ...restConfig };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the protocol with service configuration.
   */
  initialize(
    config: Readonly<ApiServiceConfig>,
    getPlugins: () => ReadonlyArray<ApiPluginBase>,
    _getClassPlugins: () => ReadonlyArray<ApiPluginBase>,
    getExcludedClasses?: () => ReadonlySet<PluginClass>
  ): void {
    this.config = config;
    this.getPlugins = getPlugins;
    if (getExcludedClasses) {
      this.getExcludedClasses = getExcludedClasses;
    }
    // _getClassPlugins parameter exists for interface compatibility but is not used by RestProtocol.
    // RestProtocol uses class-based plugin system via getPluginsInOrder() (global + instance plugins)
    // instead of the service-level class plugins callback.

    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': this.restConfig.contentType,
        ...config.headers,
      },
      timeout: this.restConfig.timeout ?? config.timeout,
      withCredentials: this.restConfig.withCredentials,
    });
  }

  /**
   * Cleanup protocol resources.
   */
  cleanup(): void {
    // Cleanup instance plugins
    this._instancePlugins.forEach((plugin) => plugin.destroy());
    this._instancePlugins.clear();

    this.client = null;
    this.config = null;
  }

  /**
   * Get global plugins from apiRegistry, filtering out excluded classes.
   * @internal
   */
  private getGlobalPlugins(): readonly RestPluginHooks[] {
    const allGlobalPlugins = apiRegistry.plugins.getAll(RestProtocol);
    const excludedClasses = this.getExcludedClasses();

    if (excludedClasses.size === 0) {
      return allGlobalPlugins;
    }

    // Filter out excluded plugin classes
    return allGlobalPlugins.filter((plugin) => {
      for (const excludedClass of excludedClasses) {
        if ((plugin as object) instanceof excludedClass) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get all plugins in execution order (global first, then instance).
   * Used by plugin chain execution to get ordered list of plugins.
   * @internal
   */
  getPluginsInOrder(): RestPluginHooks[] {
    return [
      ...this.getGlobalPlugins(),
      ...Array.from(this._instancePlugins),
    ];
  }

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  /**
   * Perform GET request.
   * @template TResponse - Response type
   */
  async get<TResponse>(url: string, params?: Record<string, string>): Promise<TResponse> {
    return this.request<TResponse>('GET', url, undefined, params);
  }

  /**
   * Perform POST request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async post<TResponse, TRequest = unknown>(url: string, data?: TRequest): Promise<TResponse> {
    return this.request<TResponse>('POST', url, data);
  }

  /**
   * Perform PUT request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async put<TResponse, TRequest = unknown>(url: string, data?: TRequest): Promise<TResponse> {
    return this.request<TResponse>('PUT', url, data);
  }

  /**
   * Perform PATCH request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest): Promise<TResponse> {
    return this.request<TResponse>('PATCH', url, data);
  }

  /**
   * Perform DELETE request.
   * @template TResponse - Response type
   */
  async delete<TResponse>(url: string): Promise<TResponse> {
    return this.request<TResponse>('DELETE', url);
  }

  // ============================================================================
  // Request Execution
  // ============================================================================

  /**
   * Execute an HTTP request with plugin chain.
   */
  private async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    if (!this.client) {
      throw new Error('RestProtocol not initialized. Call initialize() first.');
    }

    // Build full URL for plugins (baseURL + relative url)
    const fullUrl = this.config?.baseURL
      ? `${this.config.baseURL}${url}`.replace(/\/+/g, '/').replace(':/', '://')
      : url;

    // Build request context for plugins (pure request data - no serviceName)
    const requestContext: ApiRequestContext = {
      method,
      url: fullUrl,
      headers: { ...this.config?.headers },
      body: data,
    };

    try {
      // Execute NEW class-based onRequest plugin chain
      const classPluginResult = await this.executeClassPluginOnRequest(requestContext);

      // Check if a class-based plugin short-circuited
      if (isShortCircuit(classPluginResult)) {
        const shortCircuitResponse = classPluginResult.shortCircuit;

        // Execute onResponse for class-based plugins in reverse order
        const processedShortCircuit = await this.executeClassPluginOnResponse(
          shortCircuitResponse,
          requestContext
        );

        return processedShortCircuit.data as T;
      }

      // Use processed context from class-based plugins
      const processedContext = classPluginResult;

      // Execute onRequest plugin chain
      const pluginProcessedContext = await this.executeOnRequest(processedContext);

      // Check if a plugin short-circuited with mock response
      if ('__mockResponse' in pluginProcessedContext) {
        const mockData = (pluginProcessedContext as { __mockResponse: T }).__mockResponse;
        return mockData;
      }

      // Build axios config
      // IMPORTANT: Use the original relative URL for axios since it already has baseURL configured.
      // Plugin chain receives full URL for mock matching, but axios needs relative URL.
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,  // Use original relative URL, not processedContext.url which includes baseURL
        headers: pluginProcessedContext.headers,
        data: pluginProcessedContext.body,
        params,
      };

      // Execute actual HTTP request
      const response = await this.client.request(axiosConfig);

      // Build response context
      const responseContext: ApiResponseContext = {
        status: response.status,
        headers: response.headers as Record<string, string>,
        data: response.data,
      };

      // Execute onResponse plugin chain (reverse order)
      const pluginProcessedResponse = await this.executeOnResponse(
        responseContext,
        pluginProcessedContext
      );

      // Execute NEW class-based onResponse plugin chain (reverse order)
      const finalResponse = await this.executeClassPluginOnResponse(
        pluginProcessedResponse,
        requestContext
      );

      return finalResponse.data as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Execute onError plugin chain
      const pluginProcessedError = await this.executeOnError(err, requestContext);

      // Execute NEW class-based onError plugin chain
      const finalResult = await this.executeClassPluginOnError(pluginProcessedError, requestContext);

      // Check if error was recovered (plugin returned ApiResponseContext)
      if (finalResult && typeof finalResult === 'object' && 'status' in finalResult && 'data' in finalResult) {
        return (finalResult as ApiResponseContext).data as T;
      }

      throw finalResult;
    }
  }

  // ============================================================================
  // Plugin Chain Execution - Class-Based (New)
  // ============================================================================

  /**
   * Execute class-based onRequest plugin chain.
   * Plugins execute in FIFO order (global first, then instance).
   * Any plugin can short-circuit by returning { shortCircuit: response }.
   */
  private async executeClassPluginOnRequest(
    context: ApiRequestContext
  ): Promise<ApiRequestContext | ShortCircuitResponse> {
    let currentContext: ApiRequestContext = { ...context };

    // Use protocol-level plugins (global + instance)
    for (const plugin of this.getPluginsInOrder()) {
      // Set protocol reference for plugins that need it (e.g., RestMockPlugin)
      if ('_protocol' in plugin) {
        (plugin as { _protocol?: unknown })._protocol = this;
      }

      if (plugin.onRequest) {
        const result = await plugin.onRequest(currentContext);

        // Check if plugin short-circuited
        if (isShortCircuit(result)) {
          return result; // Stop chain and return short-circuit response
        }

        // Update context
        currentContext = result;
      }
    }

    return currentContext;
  }

  /**
   * Execute class-based onResponse plugin chain.
   * Plugins execute in reverse order (LIFO - onion model).
   */
  private async executeClassPluginOnResponse(
    context: ApiResponseContext,
    _requestContext: ApiRequestContext
  ): Promise<ApiResponseContext> {
    let currentContext: ApiResponseContext = { ...context };
    // Use protocol-level plugins (global + instance) in reverse order
    const plugins = [...this.getPluginsInOrder()].reverse();

    for (const plugin of plugins) {
      if (plugin.onResponse) {
        currentContext = await plugin.onResponse(currentContext);
      }
    }

    return currentContext;
  }

  /**
   * Execute class-based onError plugin chain.
   * Plugins execute in reverse order (LIFO).
   * Plugins can transform error or recover with ApiResponseContext.
   */
  private async executeClassPluginOnError(
    error: Error,
    context: ApiRequestContext
  ): Promise<Error | ApiResponseContext> {
    let currentResult: Error | ApiResponseContext = error;
    // Use protocol-level plugins (global + instance) in reverse order
    const plugins = [...this.getPluginsInOrder()].reverse();

    for (const plugin of plugins) {
      if (plugin.onError) {
        const result = await plugin.onError(
          currentResult instanceof Error ? currentResult : new Error('Recovery response converted to error'),
          context
        );

        // If plugin returns ApiResponseContext, it's a recovery - stop chain
        if (result && typeof result === 'object' && 'status' in result && 'data' in result) {
          return result as ApiResponseContext;
        }

        // If plugin returns Error, continue chain
        if (result instanceof Error) {
          currentResult = result;
        }
      }
    }

    return currentResult;
  }

  // ============================================================================
  // Plugin Chain Execution
  // ============================================================================

  /**
   * Execute onRequest plugin chain.
   * High priority plugins execute first.
   * Any plugin can short-circuit by adding __mockResponse.
   */
  private async executeOnRequest(
    context: ApiRequestContext
  ): Promise<ApiRequestContext & { __mockResponse?: unknown }> {
    let currentContext: ApiRequestContext & { __mockResponse?: unknown } = { ...context };

    for (const plugin of this.getPlugins()) {
      if (plugin.onRequest) {
        const result = await plugin.onRequest(currentContext);
        currentContext = result as typeof currentContext;

        // Check if plugin short-circuited
        if ('__mockResponse' in currentContext) {
          break;
        }
      }
    }

    return currentContext;
  }

  /**
   * Execute onResponse plugin chain.
   * Low priority plugins execute first (reverse order).
   */
  private async executeOnResponse(
    context: ApiResponseContext,
    _requestContext: ApiRequestContext
  ): Promise<ApiResponseContext> {
    let currentContext = { ...context };
    const plugins = [...this.getPlugins()].reverse();

    for (const plugin of plugins) {
      if (plugin.onResponse) {
        currentContext = await plugin.onResponse(currentContext) as ApiResponseContext;
      }
    }

    return currentContext;
  }

  /**
   * Execute onError plugin chain.
   */
  private async executeOnError(
    error: Error,
    context: ApiRequestContext
  ): Promise<Error> {
    let currentError = error;
    const plugins = [...this.getPlugins()].reverse();

    for (const plugin of plugins) {
      if (plugin.onError) {
        const result = await plugin.onError(currentError, context);
        // Plugins only support Error return
        if (result instanceof Error) {
          currentError = result;
        }
      }
    }

    return currentError;
  }
}
