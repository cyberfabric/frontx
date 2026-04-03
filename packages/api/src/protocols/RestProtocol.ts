/**
 * RestProtocol - REST API communication protocol
 *
 * Implements REST API calls using axios.
 * Supports plugin chain for request/response interception.
 *
 * SDK Layer: L1 (Only peer dependency on axios)
 */

// @cpt-dod:cpt-frontx-dod-api-communication-rest-protocol:p1
// @cpt-flow:cpt-frontx-flow-api-communication-rest-request:p1
// @cpt-algo:cpt-frontx-algo-api-communication-rest-plugin-chain-request:p1
// @cpt-algo:cpt-frontx-algo-api-communication-rest-plugin-chain-response:p1
// @cpt-algo:cpt-frontx-algo-api-communication-plugin-ordering:p1
// @cpt-state:cpt-frontx-state-api-communication-rest-connection:p1
// @cpt-dod:cpt-frontx-dod-request-lifecycle-abort-signal:p1
// @cpt-flow:cpt-frontx-flow-request-lifecycle-rest-abort:p1
// @cpt-algo:cpt-frontx-algo-request-lifecycle-signal-threading:p1
// @cpt-algo:cpt-frontx-algo-request-lifecycle-cancel-detection:p1
// @cpt-algo:cpt-frontx-algo-request-lifecycle-request-options:p1

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
  type RestRequestOptions,
} from '../types';
import { isRestShortCircuit } from '../types';
import { protocolPluginRegistry } from '../protocolPluginRegistry';

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
  // @cpt-begin:cpt-frontx-algo-api-communication-plugin-ordering:p1:inst-rest-instance-plugins
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
  // @cpt-end:cpt-frontx-algo-api-communication-plugin-ordering:p1:inst-rest-instance-plugins

  // @cpt-begin:cpt-frontx-dod-api-communication-rest-protocol:p1:inst-constructor
  constructor(restConfig: RestProtocolConfig = {}) {
    super();
    this.restConfig = { ...DEFAULT_REST_CONFIG, ...restConfig };
  }
  // @cpt-end:cpt-frontx-dod-api-communication-rest-protocol:p1:inst-constructor

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the protocol with service configuration.
   */
  // @cpt-begin:cpt-frontx-state-api-communication-rest-connection:p1:inst-1
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
  // @cpt-end:cpt-frontx-state-api-communication-rest-connection:p1:inst-1

  /**
   * Cleanup protocol resources.
   */
  // @cpt-begin:cpt-frontx-state-api-communication-rest-connection:p1:inst-2
  cleanup(): void {
    // Cleanup instance plugins
    this._instancePlugins.forEach((plugin) => plugin.destroy());
    this._instancePlugins.clear();

    this.client = null;
    this.config = null;
  }
  // @cpt-end:cpt-frontx-state-api-communication-rest-connection:p1:inst-2

  /**
   * Get global plugins from apiRegistry, filtering out excluded classes.
   * @internal
   */
  // @cpt-begin:cpt-frontx-algo-api-communication-plugin-ordering:p1:inst-1
  private getGlobalPlugins(): readonly RestPluginHooks[] {
    const allGlobalPlugins = protocolPluginRegistry.getAll(RestProtocol);
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
  // @cpt-end:cpt-frontx-algo-api-communication-plugin-ordering:p1:inst-1

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  // @cpt-begin:cpt-frontx-algo-request-lifecycle-request-options:p1:inst-update-signatures
  /**
   * Perform GET request.
   * @template TResponse - Response type
   */
  async get<TResponse>(url: string, options?: RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('GET', url, undefined, options);
  }

  /**
   * Perform POST request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async post<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('POST', url, data, options);
  }

  /**
   * Perform PUT request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async put<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('PUT', url, data, options);
  }

  /**
   * Perform PATCH request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('PATCH', url, data, options);
  }

  /**
   * Perform DELETE request.
   * Omit `data` when the endpoint has no body; pass `undefined` explicitly when combining with `options`
   * (e.g. `delete(url, undefined, { signal })`), same pattern as POST/PUT/PATCH.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional)
   */
  async delete<TResponse, TRequest = unknown>(
    url: string,
    data?: TRequest,
    options?: RestRequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse>('DELETE', url, data, options);
  }
  // @cpt-end:cpt-frontx-algo-request-lifecycle-request-options:p1:inst-update-signatures

  // ============================================================================
  // Request Execution
  // ============================================================================

  /**
   * Execute an HTTP request with plugin chain.
   * Public entry point - delegates to requestInternal with retryCount: 0.
   */
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-request-options:p1:inst-forward-to-internal
  private async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: RestRequestOptions
  ): Promise<T> {
    return this.requestInternal<T>(method, url, data, options?.params, options?.signal, 0);
  }
  // @cpt-end:cpt-frontx-algo-request-lifecycle-request-options:p1:inst-forward-to-internal

  /**
   * Internal request execution with retry support.
   * Can be called for initial request or retry.
   */
  // @cpt-begin:cpt-frontx-flow-api-communication-rest-request:p1:inst-1
  // @cpt-begin:cpt-frontx-algo-api-communication-rest-plugin-chain-request:p1:inst-1
  // @cpt-begin:cpt-frontx-algo-api-communication-rest-plugin-chain-response:p1:inst-1
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-signal-threading:p1:inst-receive-signal
  // @cpt-begin:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-build-context-signal
  private async requestInternal<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    params?: Record<string, string>,
    signal?: AbortSignal,
    retryCount: number = 0,
    /** Merged request headers from plugin retry() — must be applied before onRequest, not rebuilt from config only */
    retryHeaders?: Record<string, string>
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

    // Build request context for plugins (pure request data - no serviceName).
    // Signal is included so plugins can observe it, but MUST NOT replace it.
    const requestContext: ApiRequestContext = {
      method,
      url: fullUrl,
      headers: retryHeaders
        ? { ...this.config?.headers, ...retryHeaders }
        : { ...this.config?.headers },
      body: data,
      signal,
    };
    // @cpt-end:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-build-context-signal

    try {
      // Execute onRequest plugin chain — plugins receive context with signal
      // @cpt-begin:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-plugin-chain-signal
      const pluginResult = await this.executePluginOnRequest(requestContext);
      // @cpt-end:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-plugin-chain-signal

      // Check if a plugin short-circuited (signal is irrelevant when no HTTP call is made)
      // @cpt-begin:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-short-circuit-bypass
      if (isRestShortCircuit(pluginResult)) {
        const shortCircuitResponse = pluginResult.shortCircuit;

        // Execute onResponse for plugins in reverse order
        const processedShortCircuit = await this.executePluginOnResponse(
          shortCircuitResponse,
          requestContext
        );

        return processedShortCircuit.data as T;
      }
      // @cpt-end:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-short-circuit-bypass

      // Use processed context from plugins
      const processedContext = pluginResult;

      // Build axios config.
      // IMPORTANT: Use the original relative URL for axios since it already has baseURL configured.
      // Plugin chain receives full URL for mock matching, but axios needs relative URL.
      // @cpt-begin:cpt-frontx-algo-request-lifecycle-signal-threading:p1:inst-copy-to-axios
      // @cpt-begin:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-axios-signal
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,  // Use original relative URL, not processedContext.url which includes baseURL
        headers: processedContext.headers,
        data: processedContext.body,
        params,
        signal,
      };
      // @cpt-end:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-axios-signal
      // @cpt-end:cpt-frontx-algo-request-lifecycle-signal-threading:p1:inst-copy-to-axios

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
      // @cpt-begin:cpt-frontx-algo-request-lifecycle-cancel-detection:p1:inst-check-is-cancel
      // @cpt-begin:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-cancel-skip-plugins
      // Canceled requests bypass the error plugin chain entirely — they are not retryable
      // and the caller (e.g., TanStack Query on unmount) expects the raw CanceledError.
      if (axios.isCancel(error)) {
        throw error;
      }
      // @cpt-end:cpt-frontx-flow-request-lifecycle-rest-abort:p1:inst-cancel-skip-plugins
      // @cpt-end:cpt-frontx-algo-request-lifecycle-cancel-detection:p1:inst-check-is-cancel

      const err = error instanceof Error ? error : new Error(String(error));

      // Execute onError plugin chain with retry support
      const finalResult = await this.executePluginOnError(
        err,
        requestContext,
        url,
        params,
        signal,
        retryCount
      );

      // Check if error was recovered (plugin returned ApiResponseContext)
      if (finalResult && typeof finalResult === 'object' && 'status' in finalResult && 'data' in finalResult) {
        return (finalResult as ApiResponseContext).data as T;
      }

      throw finalResult;
    }
  }
  // @cpt-end:cpt-frontx-algo-request-lifecycle-signal-threading:p1:inst-receive-signal
  // @cpt-end:cpt-frontx-flow-api-communication-rest-request:p1:inst-1
  // @cpt-end:cpt-frontx-algo-api-communication-rest-plugin-chain-request:p1:inst-1
  // @cpt-end:cpt-frontx-algo-api-communication-rest-plugin-chain-response:p1:inst-1

  // ============================================================================
  // Plugin Chain Execution
  // ============================================================================

  /**
   * Execute onRequest plugin chain.
   * Plugins execute in FIFO order (global first, then instance).
   * Any plugin can short-circuit by returning { shortCircuit: response }.
   */
  // @cpt-begin:cpt-frontx-algo-api-communication-rest-plugin-chain-request:p1:inst-execute-on-request
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
  // @cpt-end:cpt-frontx-algo-api-communication-rest-plugin-chain-request:p1:inst-execute-on-request

  /**
   * Execute onResponse plugin chain.
   * Plugins execute in reverse order (LIFO - onion model).
   */
  // @cpt-begin:cpt-frontx-algo-api-communication-rest-plugin-chain-response:p1:inst-execute-on-response
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
  // @cpt-end:cpt-frontx-algo-api-communication-rest-plugin-chain-response:p1:inst-execute-on-response

  /**
   * Execute onError plugin chain with retry support.
   * Plugins execute in reverse order (LIFO).
   * Plugins can transform error, recover with ApiResponseContext, or retry the request.
   */
  // @cpt-begin:cpt-frontx-flow-api-communication-rest-request:p1:inst-execute-on-error
  private async executePluginOnError(
    error: Error,
    context: ApiRequestContext,
    originalUrl: string,
    params: Record<string, string> | undefined,
    signal: AbortSignal | undefined,
    retryCount: number
  ): Promise<Error | ApiResponseContext> {
    // Create retry function that calls requestInternal with incremented retryCount
    const retry = async (modifiedRequest?: Partial<RestRequestContext>): Promise<RestResponseContext> => {
      const retryContext: RestRequestContext = {
        ...context,
        ...modifiedRequest,
        headers: { ...context.headers, ...modifiedRequest?.headers },
      };

      // Re-execute through requestInternal with incremented retryCount.
      // Signal is forwarded so aborted retries also cancel correctly.
      const result = await this.requestInternal(
        retryContext.method,
        originalUrl,
        retryContext.body,
        params,
        signal,
        retryCount + 1,
        retryContext.headers
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
  // @cpt-end:cpt-frontx-flow-api-communication-rest-request:p1:inst-execute-on-error

}
