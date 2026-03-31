/**
 * RestProtocol - REST API communication protocol
 *
 * Implements REST API calls using axios.
 * Supports plugin chain for request/response interception.
 *
 * SDK Layer: L1 (Only peer dependency on axios)
 */

// @cpt-dod:cpt-hai3-dod-api-communication-rest-protocol:p1
// @cpt-flow:cpt-hai3-flow-api-communication-rest-request:p1
// @cpt-algo:cpt-hai3-algo-api-communication-rest-plugin-chain-request:p1
// @cpt-algo:cpt-hai3-algo-api-communication-rest-plugin-chain-response:p1
// @cpt-algo:cpt-hai3-algo-api-communication-plugin-ordering:p1
// @cpt-state:cpt-hai3-state-api-communication-rest-connection:p1

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  ApiProtocol,
  type ApiServiceConfig,
  type RestProtocolConfig,
  type RestPluginHooks,
  type HttpMethod,
  type PluginClass,
  type ApiPluginErrorContext,
  type RestResponseContext,
  type RestRequestContext,
  type RestShortCircuitResponse,
  type RestRequestOptions,
} from '../types';
import { isRestShortCircuit } from '../types';
import { apiRegistry } from '../apiRegistry';

function isAbortSignalLike(value: unknown): value is AbortSignal {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { aborted?: unknown; addEventListener?: unknown };
  return typeof candidate.aborted === 'boolean' && typeof candidate.addEventListener === 'function';
}

/**
 * Detects RestRequestOptions by presence of known option keys.
 * A plain query-params dict has arbitrary string keys with string values.
 * @internal
 */
function isRestRequestOptions(value: Record<string, unknown>): value is RestRequestOptions {
  if ('params' in value || 'withCredentials' in value) return true;
  if (!('signal' in value)) return false;
  return isAbortSignalLike(value.signal);
}

function normalizeGetRequestOptions(
  paramsOrOptions?: Record<string, string> | RestRequestOptions,
  signal?: AbortSignal
): RestRequestOptions {
  if (!paramsOrOptions) {
    return signal ? { signal } : {};
  }
  if (isRestRequestOptions(paramsOrOptions)) {
    return {
      ...paramsOrOptions,
      signal: paramsOrOptions.signal ?? signal,
    };
  }
  return {
    params: paramsOrOptions,
    signal,
  };
}

function normalizeSignalOrOptions(signalOrOptions?: AbortSignal | RestRequestOptions): RestRequestOptions {
  if (!signalOrOptions) return {};
  if (isAbortSignalLike(signalOrOptions)) {
    return { signal: signalOrOptions };
  }
  return signalOrOptions;
}

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
  // @cpt-begin:cpt-hai3-state-api-communication-rest-connection:p1:inst-1
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
  // @cpt-end:cpt-hai3-state-api-communication-rest-connection:p1:inst-1

  /**
   * Cleanup protocol resources.
   */
  // @cpt-begin:cpt-hai3-state-api-communication-rest-connection:p1:inst-2
  cleanup(): void {
    // Cleanup instance plugins
    this._instancePlugins.forEach((plugin) => plugin.destroy());
    this._instancePlugins.clear();

    this.client = null;
    this.config = null;
  }
  // @cpt-end:cpt-hai3-state-api-communication-rest-connection:p1:inst-2

  /**
   * Get global plugins from apiRegistry, filtering out excluded classes.
   * @internal
   */
  // @cpt-begin:cpt-hai3-algo-api-communication-plugin-ordering:p1:inst-1
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
  // @cpt-end:cpt-hai3-algo-api-communication-plugin-ordering:p1:inst-1

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  /**
   * Perform GET request.
   * @template TResponse - Response type
   */
  async get<TResponse>(url: string, params?: Record<string, string>, signal?: AbortSignal): Promise<TResponse>;
  async get<TResponse>(url: string, options?: RestRequestOptions): Promise<TResponse>;
  async get<TResponse>(url: string, paramsOrOptions?: Record<string, string> | RestRequestOptions, signal?: AbortSignal): Promise<TResponse> {
    return this.request<TResponse>('GET', url, undefined, normalizeGetRequestOptions(paramsOrOptions, signal));
  }

  /**
   * Perform POST request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async post<TResponse, TRequest = unknown>(url: string, data?: TRequest, signal?: AbortSignal): Promise<TResponse>;
  async post<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse>;
  async post<TResponse, TRequest = unknown>(url: string, data?: TRequest, signalOrOptions?: AbortSignal | RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('POST', url, data, normalizeSignalOrOptions(signalOrOptions));
  }

  /**
   * Perform PUT request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async put<TResponse, TRequest = unknown>(url: string, data?: TRequest, signal?: AbortSignal): Promise<TResponse>;
  async put<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse>;
  async put<TResponse, TRequest = unknown>(url: string, data?: TRequest, signalOrOptions?: AbortSignal | RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('PUT', url, data, normalizeSignalOrOptions(signalOrOptions));
  }

  /**
   * Perform PATCH request.
   * @template TResponse - Response type
   * @template TRequest - Request body type (optional, for type-safe requests)
   */
  async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, signal?: AbortSignal): Promise<TResponse>;
  async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, options?: RestRequestOptions): Promise<TResponse>;
  async patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, signalOrOptions?: AbortSignal | RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('PATCH', url, data, normalizeSignalOrOptions(signalOrOptions));
  }

  /**
   * Perform DELETE request.
   * @template TResponse - Response type
   */
  async delete<TResponse>(url: string, signal?: AbortSignal): Promise<TResponse>;
  async delete<TResponse>(url: string, options?: RestRequestOptions): Promise<TResponse>;
  async delete<TResponse>(url: string, signalOrOptions?: AbortSignal | RestRequestOptions): Promise<TResponse> {
    return this.request<TResponse>('DELETE', url, undefined, normalizeSignalOrOptions(signalOrOptions));
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
    options?: RestRequestOptions
  ): Promise<T> {
    return this.requestInternal<T>(method, url, data, 0, options);
  }

  /**
   * Internal request execution with retry support.
   * Can be called for initial request or retry.
   *
   * @param contextOverride - When retrying with modified context, pass the full merged
   *   RestRequestContext here so plugin-supplied headers/body/signal are preserved.
   *   On the initial call this is undefined and the context is built from method+url+data.
   */
  // @cpt-begin:cpt-hai3-flow-api-communication-rest-request:p1:inst-1
  // @cpt-begin:cpt-hai3-algo-api-communication-rest-plugin-chain-request:p1:inst-1
  // @cpt-begin:cpt-hai3-algo-api-communication-rest-plugin-chain-response:p1:inst-1
  private async requestInternal<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    retryCount: number = 0,
    options?: RestRequestOptions,
    contextOverride?: RestRequestContext
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

    // When retrying with a modified context (e.g. refreshed auth headers), use it directly
    // so that plugin-supplied modifications are not discarded by rebuilding from scratch.
    const requestContext: RestRequestContext = contextOverride ?? {
      method,
      url: fullUrl,
      headers: { ...this.config?.headers },
      body: data,
      withCredentials: options?.withCredentials ?? this.restConfig.withCredentials,
      signal: options?.signal,
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
        params: options?.params,
        withCredentials: processedContext.withCredentials,
        signal: processedContext.signal,
      };

      // Execute actual HTTP request
      const response = await this.client.request(axiosConfig);

      // Build response context
      const responseContext: RestResponseContext = {
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
      // Bypass plugin onError chain for axios cancellations - rethrow directly
      if (axios.isCancel(error)) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));

      const responseContext: RestResponseContext | undefined =
        axios.isAxiosError(error) && error.response
          ? {
              status: error.response.status,
              headers: error.response.headers as Record<string, string>,
              data: error.response.data,
            }
          : undefined;

      // Execute onError plugin chain with retry support
      const finalResult = await this.executePluginOnError(
        err,
        requestContext,
        url,
        retryCount,
        options,
        responseContext
      );

      // Check if error was recovered (plugin returned RestResponseContext)
      if (finalResult && typeof finalResult === 'object' && 'status' in finalResult && 'data' in finalResult) {
        return (finalResult as RestResponseContext).data as T;
      }

      throw finalResult;
    }
  }
  // @cpt-end:cpt-hai3-flow-api-communication-rest-request:p1:inst-1
  // @cpt-end:cpt-hai3-algo-api-communication-rest-plugin-chain-request:p1:inst-1
  // @cpt-end:cpt-hai3-algo-api-communication-rest-plugin-chain-response:p1:inst-1

  // ============================================================================
  // Plugin Chain Execution
  // ============================================================================

  /**
   * Execute onRequest plugin chain.
   * Plugins execute in FIFO order (global first, then instance).
   * Any plugin can short-circuit by returning { shortCircuit: response }.
   */
  private async executePluginOnRequest(
    context: RestRequestContext
  ): Promise<RestRequestContext | RestShortCircuitResponse> {
    let currentContext: RestRequestContext = { ...context };

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
    context: RestResponseContext,
    _requestContext: RestRequestContext
  ): Promise<RestResponseContext> {
    let currentContext: RestResponseContext = { ...context };
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
    context: RestRequestContext,
    originalUrl: string,
    retryCount: number,
    options: RestRequestOptions | undefined,
    responseContext?: RestResponseContext
  ): Promise<Error | RestResponseContext> {
    // Create retry function that calls requestInternal with incremented retryCount.
    // The merged retryContext is passed as contextOverride so that header/body/signal
    // modifications supplied by the plugin are not thrown away when requestInternal
    // rebuilds its base context from method+url+data.
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
        retryCount + 1,
        {
          params: options?.params,
          signal: retryContext.signal,
          withCredentials: retryContext.withCredentials,
        },
        retryContext
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
      request: context,
      response: responseContext,
      retryCount,
      retry,
    };

    let currentResult: Error | RestResponseContext = error;
    // Use protocol-level plugins (global + instance) in reverse order
    const plugins = [...this.getPluginsInOrder()].reverse();

    for (const plugin of plugins) {
      if (plugin.onError) {
        const result = await plugin.onError(errorContext);

        // If plugin returns RestResponseContext, it's a recovery - stop chain
        if (result && typeof result === 'object' && 'status' in result && 'data' in result) {
          return result as RestResponseContext;
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
