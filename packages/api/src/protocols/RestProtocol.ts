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
  type ApiRequestContext,
  type ApiResponseContext,
  type ShortCircuitResponse,
  type RestPluginHooks,
  type HttpMethod,
  type PluginClass,
  type ApiPluginErrorContext,
  type RestResponseContext,
  type RestRequestContext,
} from '../types';
import { isRestShortCircuit } from '../types';
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
    getExcludedClasses?: () => ReadonlySet<PluginClass>
  ): void {
    this.config = config;
    if (getExcludedClasses) {
      this.getExcludedClasses = getExcludedClasses;
    }

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
   * Public entry point - delegates to requestInternal with retryCount: 0.
   */
  private async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    return this.requestInternal<T>(method, url, data, params, 0);
  }

  /**
   * Internal request execution with retry support.
   * Can be called for initial request or retry.
   */
  private async requestInternal<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    params?: Record<string, string>,
    retryCount: number = 0
  ): Promise<T> {
    if (!this.client) {
      throw new Error('RestProtocol not initialized. Call initialize() first.');
    }

    // Check max retry depth safety net
    const maxDepth = this.restConfig.maxRetryDepth ?? 10;
    if (retryCount >= maxDepth) {
      throw new Error(`Max retry depth (${maxDepth}) exceeded`);
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
      // Execute onRequest plugin chain
      const pluginResult = await this.executePluginOnRequest(requestContext);

      // Check if a plugin short-circuited
      if (isRestShortCircuit(pluginResult)) {
        const shortCircuitResponse = pluginResult.shortCircuit;

        // Execute onResponse for plugins in reverse order
        const processedShortCircuit = await this.executePluginOnResponse(
          shortCircuitResponse,
          requestContext
        );

        return processedShortCircuit.data as T;
      }

      // Use processed context from plugins
      const processedContext = pluginResult;

      // Build axios config
      // IMPORTANT: Use the original relative URL for axios since it already has baseURL configured.
      // Plugin chain receives full URL for mock matching, but axios needs relative URL.
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,  // Use original relative URL, not processedContext.url which includes baseURL
        headers: processedContext.headers,
        data: processedContext.body,
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
      const finalResponse = await this.executePluginOnResponse(
        responseContext,
        requestContext
      );

      return finalResponse.data as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Execute onError plugin chain with retry support
      const finalResult = await this.executePluginOnError(
        err,
        requestContext,
        url,
        params,
        retryCount
      );

      // Check if error was recovered (plugin returned ApiResponseContext)
      if (finalResult && typeof finalResult === 'object' && 'status' in finalResult && 'data' in finalResult) {
        return (finalResult as ApiResponseContext).data as T;
      }

      throw finalResult;
    }
  }

  // ============================================================================
  // Plugin Chain Execution
  // ============================================================================

  /**
   * Execute onRequest plugin chain.
   * Plugins execute in FIFO order (global first, then instance).
   * Any plugin can short-circuit by returning { shortCircuit: response }.
   */
  private async executePluginOnRequest(
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
        if (isRestShortCircuit(result)) {
          return result; // Stop chain and return short-circuit response
        }

        // Update context
        currentContext = result;
      }
    }

    return currentContext;
  }

  /**
   * Execute onResponse plugin chain.
   * Plugins execute in reverse order (LIFO - onion model).
   */
  private async executePluginOnResponse(
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
   * Execute onError plugin chain with retry support.
   * Plugins execute in reverse order (LIFO).
   * Plugins can transform error, recover with ApiResponseContext, or retry the request.
   */
  private async executePluginOnError(
    error: Error,
    context: ApiRequestContext,
    originalUrl: string,
    params: Record<string, string> | undefined,
    retryCount: number
  ): Promise<Error | ApiResponseContext> {
    // Create retry function that calls requestInternal with incremented retryCount
    const retry = async (modifiedRequest?: Partial<RestRequestContext>): Promise<RestResponseContext> => {
      const retryContext: RestRequestContext = {
        ...context,
        ...modifiedRequest,
        headers: { ...context.headers, ...modifiedRequest?.headers },
      };

      // Re-execute through requestInternal with incremented retryCount
      const result = await this.requestInternal(
        retryContext.method,
        originalUrl,
        retryContext.body,
        params,
        retryCount + 1
      );

      // Wrap result in response context format
      return {
        status: 200,
        headers: {},
        data: result,
      };
    };

    const errorContext: ApiPluginErrorContext = {
      error,
      request: context as RestRequestContext,
      retryCount,
      retry,
    };

    let currentResult: Error | ApiResponseContext = error;
    // Use protocol-level plugins (global + instance) in reverse order
    const plugins = [...this.getPluginsInOrder()].reverse();

    for (const plugin of plugins) {
      if (plugin.onError) {
        const result = await plugin.onError(errorContext);

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

}
