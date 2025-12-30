/**
 * SSE Protocol
 * Handles Server-Sent Events communication using EventSource API
 *
 * SDK Layer: L1 (Zero @hai3 dependencies)
 */

import { assign } from 'lodash';
import type {
  ApiProtocol,
  ApiServiceConfig,
  MockMap,
  SseProtocolConfig,
  ApiPluginBase,
  ApiRequestContext,
  ShortCircuitResponse,
  ApiResponseContext,
} from '../types';
import { isShortCircuit } from '../types';

/**
 * SSE Protocol Implementation
 * Manages Server-Sent Events connections using EventSource API
 */
export class SseProtocol implements ApiProtocol {
  private baseConfig!: Readonly<ApiServiceConfig>;
  private connections: Map<string, EventSource | 'short-circuit'> = new Map();
  private readonly config: SseProtocolConfig;
  private _getPlugins!: () => ReadonlyArray<ApiPluginBase>;
  // Class-based plugins used for generic plugin chain execution
  private _getClassPlugins!: () => ReadonlyArray<ApiPluginBase>;

  constructor(config: Readonly<SseProtocolConfig> = {}) {
    this.config = assign({}, config);
  }

  /**
   * Initialize protocol with base config and plugin accessor
   */
  initialize(
    baseConfig: Readonly<ApiServiceConfig>,
    _getMockMap: () => Readonly<MockMap>,
    getPlugins: () => ReadonlyArray<ApiPluginBase>,
    _getClassPlugins: () => ReadonlyArray<ApiPluginBase>
  ): void {
    this.baseConfig = baseConfig;
    this._getPlugins = getPlugins;
    // Class-based plugins not yet used in SSE - will be implemented when needed
    this._getClassPlugins = _getClassPlugins;
  }

  /**
   * Get plugins (for future use).
   * @internal
   */
  getPlugins(): ReadonlyArray<ApiPluginBase> {
    return this._getPlugins?.() ?? [];
  }

  /**
   * Get class-based plugins (for future use).
   * @internal
   */
  getClassBasedPlugins(): ReadonlyArray<ApiPluginBase> {
    return this._getClassPlugins?.() ?? [];
  }

  /**
   * Cleanup protocol resources
   */
  cleanup(): void {
    // Close all active connections (skip 'short-circuit' entries)
    this.connections.forEach((conn) => {
      if (conn !== 'short-circuit') {
        conn.close();
      }
    });
    this.connections.clear();
  }

  /**
   * Execute plugin chain for request lifecycle
   * Iterates through all class-based plugins and calls onRequest hooks
   *
   * @param context - Request context
   * @returns Modified context or short-circuit response
   */
  private async executePluginChainAsync(
    context: ApiRequestContext
  ): Promise<ApiRequestContext | ShortCircuitResponse> {
    let currentContext = context;

    for (const plugin of this.getClassBasedPlugins()) {
      if (plugin.onRequest) {
        const result = await plugin.onRequest(currentContext);

        if (isShortCircuit(result)) {
          return result;
        }

        currentContext = result;
      }
    }

    return currentContext;
  }

  /**
   * Connect to SSE stream
   * Returns connection ID for cleanup
   *
   * @param url - SSE endpoint URL (relative to baseURL)
   * @param onMessage - Callback for each SSE message
   * @param onComplete - Optional callback when stream completes
   * @returns Connection ID for disconnecting
   */
  async connect(
    url: string,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): Promise<string> {
    const connectionId = this.generateId();

    // Build request context for plugin chain
    const context: ApiRequestContext = {
      method: 'GET',
      url,
      headers: {},
      body: undefined,
    };

    // Execute plugin chain - allows any plugin to short-circuit
    const result = await this.executePluginChainAsync(context);

    // Check if any plugin short-circuited the request
    if (isShortCircuit(result)) {
      // Simulate streaming from short-circuit response
      await this.simulateStreamFromShortCircuit(
        connectionId,
        result.shortCircuit,
        onMessage,
        onComplete
      );
      return connectionId;
    }

    // Establish real SSE connection
    this.establishRealConnection(connectionId, url, onMessage, onComplete);
    return connectionId;
  }

  /**
   * Establish real SSE connection to server
   * Extracted for clarity and separation from plugin-based short-circuit flow
   *
   * @param connectionId - Generated connection ID
   * @param url - SSE endpoint URL (relative to baseURL)
   * @param onMessage - Callback for each SSE message
   * @param onComplete - Optional callback when stream completes
   */
  private establishRealConnection(
    connectionId: string,
    url: string,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): void {
    const withCredentials = this.config.withCredentials ?? true;
    const fullUrl = `${this.baseConfig.baseURL}${url}`;

    const eventSource = new EventSource(fullUrl, {
      withCredentials,
    });

    eventSource.onmessage = onMessage;

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.disconnect(connectionId);
    };

    // Listen for completion signal
    eventSource.addEventListener('done', () => {
      if (onComplete) onComplete();
      this.disconnect(connectionId);
    });

    this.connections.set(connectionId, eventSource);
  }

  /**
   * Simulate SSE streaming from short-circuit response
   * Works with any plugin's short-circuit response, not just MockPlugin
   * Breaks response content into word-by-word chunks
   */
  private async simulateStreamFromShortCircuit(
    connectionId: string,
    response: ApiResponseContext,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): Promise<void> {
    // Mark as short-circuit connection
    this.connections.set(connectionId, 'short-circuit');

    // Extract content using generic extraction (no plugin knowledge)
    const content = this.extractStreamContent(response.data);

    // Stream the content word by word
    await this.streamContent(connectionId, content, onMessage, onComplete);
  }

  /**
   * Stream content word by word with SSE-style chunks
   * Used by simulateStreamFromShortCircuit to simulate realistic streaming
   */
  private async streamContent(
    connectionId: string,
    content: string,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): Promise<void> {
    // Split content into words for streaming simulation
    const words = content.split(' ');

    // Stream word by word with delays
    for (let i = 0; i < words.length; i++) {
      // Check if connection was disconnected
      if (!this.connections.has(connectionId)) {
        return;
      }

      // Create SSE-style chunk
      const chunk = {
        id: `chatcmpl-short-circuit-${Date.now()}-${i}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: {
              content: words[i] + (i < words.length - 1 ? ' ' : ''),
            },
            finish_reason: i === words.length - 1 ? 'stop' : null,
          },
        ],
      };

      // Create MessageEvent
      const event = new MessageEvent('message', {
        data: JSON.stringify(chunk),
      });

      onMessage(event);

      // Add delay between chunks (50ms per word)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Stream complete
    if (onComplete) onComplete();
    this.disconnect(connectionId);
  }

  /**
   * Disconnect SSE stream
   *
   * @param connectionId - Connection ID returned from connect()
   */
  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Only close if it's a real EventSource (not 'short-circuit')
      if (connection !== 'short-circuit') {
        connection.close();
      }
      this.connections.delete(connectionId);
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateId(): string {
    return `sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Extract streamable content from short-circuit response data.
   * Handles multiple response formats without knowledge of which plugin produced it.
   *
   * @param data - Response data from short-circuit
   * @returns Streamable content as string
   */
  private extractStreamContent(data: unknown): string {
    // Handle null/undefined
    if (data == null) {
      return '';
    }

    // Case 1: Plain string - stream directly
    if (typeof data === 'string') {
      return data;
    }

    // Case 2: Binary data - not supported for SSE
    if (data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob) {
      return '[Binary data not supported for SSE streaming]';
    }

    // Case 3: OpenAI-style chat completion (common mock format)
    if (this.isChatCompletion(data)) {
      return data.choices?.[0]?.message?.content ?? '';
    }

    // Case 4: SSE content wrapper { content: string }
    if (this.isSseContent(data)) {
      return data.content;
    }

    // Case 5: Fallback - JSON serialize with circular reference protection
    try {
      return JSON.stringify(data);
    } catch {
      return '[Unserializable data]';
    }
  }

  /**
   * Type guard for OpenAI chat completion format
   */
  private isChatCompletion(data: unknown): data is { choices?: Array<{ message?: { content?: string } }> } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'choices' in data &&
      Array.isArray((data as { choices: unknown }).choices)
    );
  }

  /**
   * Type guard for SSE content wrapper format
   */
  private isSseContent(data: unknown): data is { content: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'content' in data &&
      typeof (data as { content: unknown }).content === 'string'
    );
  }
}
