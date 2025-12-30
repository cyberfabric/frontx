/**
 * RestProtocol - REST API communication protocol
 *
 * Implements REST API calls using axios.
 * Supports plugin chain for request/response interception.
 *
 * SDK Layer: L1 (Only peer dependency on axios)
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  ApiProtocol,
  ApiServiceConfig,
  MockMap,
  RestProtocolConfig,
  ApiPluginBase,
  ApiRequestContext,
  ApiResponseContext,
  ShortCircuitResponse,
} from '../types';
import { isShortCircuit } from '../types';

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
export class RestProtocol implements ApiProtocol {
  /** Axios instance */
  private client: AxiosInstance | null = null;

  /** Base service config */
  private config: Readonly<ApiServiceConfig> | null = null;

  /** REST-specific config */
  private restConfig: RestProtocolConfig;

  /** Callback to get plugins */
  private getPlugins: () => ReadonlyArray<ApiPluginBase> = () => [];

  /** Callback to get class-based plugins */
  private getClassPlugins: () => ReadonlyArray<ApiPluginBase> = () => [];

  constructor(restConfig: RestProtocolConfig = {}) {
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
    _getMockMap: () => Readonly<MockMap>,
    getPlugins: () => ReadonlyArray<ApiPluginBase>,
    getClassPlugins: () => ReadonlyArray<ApiPluginBase>
  ): void {
    this.config = config;
    // _getMockMap is part of the interface but not used by RestProtocol
    // MockPlugin handles its own mock map via constructor
    this.getPlugins = getPlugins;
    this.getClassPlugins = getClassPlugins;

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
    this.client = null;
    this.config = null;
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
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    if (!this.client) {
      throw new Error('RestProtocol not initialized. Call initialize() first.');
    }

    // Build request context for plugins (pure request data - no serviceName)
    const requestContext: ApiRequestContext = {
      method,
      url,
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
      const axiosConfig: AxiosRequestConfig = {
        method,
        url: pluginProcessedContext.url,
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
   * Plugins execute in FIFO order (global first, then service-specific).
   * Any plugin can short-circuit by returning { shortCircuit: response }.
   */
  private async executeClassPluginOnRequest(
    context: ApiRequestContext
  ): Promise<ApiRequestContext | ShortCircuitResponse> {
    let currentContext: ApiRequestContext = { ...context };

    for (const plugin of this.getClassPlugins()) {
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
    const plugins = [...this.getClassPlugins()].reverse();

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
    const plugins = [...this.getClassPlugins()].reverse();

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
