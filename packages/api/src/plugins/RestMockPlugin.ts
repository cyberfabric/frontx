/**
 * RestMockPlugin - REST-specific mock plugin
 *
 * Intercepts REST requests and returns mock data via short-circuit.
 * Protocol-specific replacement for generic MockPlugin.
 *
 * SDK Layer: L1 (Zero dependencies)
 */

import {
  RestPluginWithConfig,
  type RestRequestContext,
  type RestShortCircuitResponse,
  type JsonValue,
  type JsonCompatible,
  type MockResponseFactory,
  MOCK_PLUGIN,
} from '../types';

/**
 * REST Mock Configuration
 */
export interface RestMockConfig {
  /**
   * Optional mock response map: 'METHOD /path' -> response factory
   * If not provided, plugin will use mock maps registered on the protocol instance
   */
  mockMap?: Readonly<Record<string, MockResponseFactory<JsonValue, JsonCompatible>>>;
  /** Simulated network delay in ms */
  delay?: number;
}

/**
 * RestMockPlugin Implementation
 *
 * Intercepts REST requests and returns mock data via short-circuit.
 * Supports exact matches and URL patterns with :params.
 *
 * @example
 * ```typescript
 * const mockPlugin = new RestMockPlugin({
 *   mockMap: {
 *     'GET /users': () => [{ id: '1', name: 'John' }],
 *     'GET /users/:id': () => ({ id: '1', name: 'John' }),
 *     'POST /users': (body) => ({ id: '2', ...body }),
 *   },
 *   delay: 100,
 * });
 *
 * // Register globally
 * apiRegistry.plugins.add(RestProtocol, mockPlugin);
 *
 * // Or per-instance
 * restProtocol.plugins.add(mockPlugin);
 * ```
 */
export class RestMockPlugin extends RestPluginWithConfig<RestMockConfig> {
  /** Mock plugin marker - identifies this as a mock plugin for framework management */
  static readonly [MOCK_PLUGIN] = true;
  /** Current mock map (can be updated via setMockMap) */
  private currentMockMap?: Readonly<Record<string, MockResponseFactory<JsonValue, JsonCompatible>>>;

  constructor(config: RestMockConfig = {}) {
    super(config);
    this.currentMockMap = config.mockMap;
  }

  /**
   * Update mock map dynamically.
   */
  setMockMap(mockMap: Readonly<Record<string, MockResponseFactory<JsonValue, JsonCompatible>>>): void {
    this.currentMockMap = mockMap;
  }

  /**
   * Intercept REST request and return mock if available.
   * Returns RestShortCircuitResponse to skip HTTP request.
   */
  async onRequest(
    context: RestRequestContext
  ): Promise<RestRequestContext | RestShortCircuitResponse> {
    const mockFactory = this.findMockFactory(context.method, context.url);

    if (mockFactory) {
      // Simulate network delay
      if (this.config.delay && this.config.delay > 0) {
        await this.simulateDelay();
      }

      // Get mock data from factory
      const mockData = mockFactory(context.body as JsonValue);

      // Return REST short-circuit response (skips HTTP request)
      return {
        shortCircuit: {
          status: 200,
          headers: { 'x-hai3-short-circuit': 'true' },
          data: mockData,
        },
      };
    }

    // No mock found, pass through
    return context;
  }

  /**
   * Find a mock factory for the given method and URL.
   */
  private findMockFactory(
    method: string,
    url: string
  ): MockResponseFactory<unknown, unknown> | undefined {
    const mockKey = `${method.toUpperCase()} ${url}`;

    // Use config mockMap
    const mockMap = this.currentMockMap ?? {};

    // Try exact match first
    const exactMatch = mockMap[mockKey];
    if (exactMatch) {
      return exactMatch as MockResponseFactory<unknown, unknown>;
    }

    // Try pattern matching (:param replacement)
    for (const [key, factory] of Object.entries(mockMap)) {
      const [keyMethod, keyUrl] = key.split(' ', 2);

      if (
        keyMethod.toUpperCase() === method.toUpperCase() &&
        this.matchUrlPattern(keyUrl, url)
      ) {
        return factory as MockResponseFactory<unknown, unknown>;
      }
    }

    return undefined;
  }

  /**
   * Match URL against pattern with :params.
   */
  private matchUrlPattern(pattern: string, url: string): boolean {
    if (!pattern.includes(':')) {
      return pattern === url;
    }

    // Convert pattern to regex
    const regexPattern = pattern
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          return '[^/]+'; // Match any segment
        }
        return segment;
      })
      .join('/');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  /**
   * Simulate network delay.
   */
  private simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.config.delay ?? 0));
  }

  /**
   * Cleanup plugin resources.
   */
  destroy(): void {
    // Nothing to cleanup
  }
}
