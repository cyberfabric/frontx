/**
 * MockPlugin - Intercepts API requests and returns mock data
 *
 * Uses short-circuit to skip the actual HTTP request when a matching mock is found.
 *
 * SDK Layer: L1 (Zero dependencies)
 */

import {
  ApiPlugin,
  ApiRequestContext,
  ApiResponseContext,
  ShortCircuitResponse,
} from '../types';
import type {
  JsonValue,
  MockMap,
  MockResponseFactory,
} from '../types';

/**
 * MockPlugin Configuration
 */
export interface MockPluginConfig {
  /** Mock response map */
  mockMap: Readonly<MockMap>;
  /** Simulated network delay in ms */
  delay?: number;
}

/**
 * MockPlugin Implementation
 *
 * Intercepts requests and returns mock data via short-circuit.
 * Supports exact matches and URL patterns with :params.
 *
 * @example
 * ```typescript
 * const mockPlugin = new MockPlugin({
 *   mockMap: {
 *     'GET /users': () => [{ id: '1', name: 'John' }],
 *     'GET /users/:id': () => ({ id: '1', name: 'John' }),
 *   },
 *   delay: 100,
 * });
 * ```
 */
export class MockPlugin extends ApiPlugin<MockPluginConfig> {
  /** Current mock map (can be updated via setMockMap) */
  private currentMockMap: Readonly<MockMap>;

  constructor(config: MockPluginConfig) {
    super(config);
    this.currentMockMap = config.mockMap;
  }

  /**
   * Update mock map dynamically.
   */
  setMockMap(mockMap: Readonly<MockMap>): void {
    this.currentMockMap = mockMap;
  }

  /**
   * Intercept request and return mock if available.
   * Returns ShortCircuitResponse to skip HTTP request.
   */
  async onRequest(
    context: ApiRequestContext
  ): Promise<ApiRequestContext | ShortCircuitResponse> {
    const mockFactory = this.findMockFactory(context.method, context.url);

    if (mockFactory) {
      // Simulate network delay
      if (this.config.delay && this.config.delay > 0) {
        await this.simulateDelay();
      }

      // Get mock data from factory
      const mockData = mockFactory(context.body as JsonValue);

      // Return short-circuit response (skips HTTP request)
      return {
        shortCircuit: {
          status: 200,
          headers: { 'x-hai3-short-circuit': 'true' },
          data: mockData,
        } as ApiResponseContext,
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
    const mockMap = this.currentMockMap;

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
