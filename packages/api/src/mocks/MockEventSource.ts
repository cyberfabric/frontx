/**
 * MockEventSource - Mock implementation of EventSource for SSE testing
 *
 * Implements EventSourceLike interface to allow SSE mocking in tests and development.
 *
 * SDK Layer: L1 (Zero dependencies)
 */

// @cpt-dod:cpt-frontx-dod-api-communication-sse-mock-plugin:p2
// @cpt-algo:cpt-frontx-algo-api-communication-mock-event-source:p2
// @cpt-state:cpt-frontx-state-api-communication-mock-event-source:p2

import type { EventSourceLike } from '../types';

/**
 * SSE Mock Event
 * Represents a single SSE event to emit
 */
export interface SseMockEvent {
  /** Event type (e.g., 'message', 'done') */
  event?: string;
  /** Event data */
  data: string;
}

/**
 * MockEventSource Implementation
 *
 * Simulates EventSource behavior by emitting events asynchronously.
 * Supports abort via close() and proper readyState management.
 *
 * @example
 * ```typescript
 * const mockSource = new MockEventSource([
 *   { data: '{"delta": {"content": "Hello"}}' },
 *   { data: '{"delta": {"content": " World"}}' },
 *   { event: 'done', data: '' }
 * ], 50);
 *
 * mockSource.onmessage = (e) => console.log(e.data);
 * mockSource.addEventListener('done', () => console.log('Complete'));
 * ```
 */
export class MockEventSource implements EventSourceLike {
  /** Current ready state */
  public readyState: number = 0; // CONNECTING

  /** Event handler for open event */
  public onopen: ((this: EventSource, ev: Event) => void) | null = null;

  /** Event handler for message event */
  public onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null;

  /** Event handler for error event */
  public onerror: ((this: EventSource, ev: Event) => void) | null = null;

  /** Event listeners map */
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  /** Abort controller for event emission */
  private abortController: AbortController | null = null;

  /** Events to emit */
  private events: readonly SseMockEvent[];

  /** Delay between events in milliseconds */
  private delay: number;

  constructor(events: readonly SseMockEvent[], delay = 50) {
    this.events = events;
    this.delay = delay;

    // Start emitting events asynchronously
    this.startEmitting();
  }

  /**
   * Add event listener
   */
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Close the connection
   */
  // @cpt-begin:cpt-frontx-state-api-communication-mock-event-source:p2:inst-1
  close(): void {
    if (this.readyState === 2) return; // Already closed

    this.readyState = 2; // CLOSED

    // Abort event emission
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  // @cpt-end:cpt-frontx-state-api-communication-mock-event-source:p2:inst-1

  /**
   * Start emitting events asynchronously
   */
  // @cpt-begin:cpt-frontx-algo-api-communication-mock-event-source:p2:inst-1
  private async startEmitting(): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Transition to OPEN
    this.readyState = 1; // OPEN

    // Emit open event
    this.emitEvent('open', new Event('open'));

    // Emit events with delay
    for (const mockEvent of this.events) {
      // Check if aborted
      if (signal.aborted) {
        return;
      }

      // Wait for delay
      await this.sleep(this.delay, signal);

      // Check if aborted after delay
      if (signal.aborted) {
        return;
      }

      // Emit the event
      const eventType = mockEvent.event || 'message';
      const messageEvent = new MessageEvent(eventType, {
        data: mockEvent.data,
      });

      if (eventType === 'message') {
        // Call onmessage handler
        if (this.onmessage) {
          this.onmessage.call(this as unknown as EventSource, messageEvent);
        }
      }

      // Call registered event listeners
      this.emitEvent(eventType, messageEvent);
    }

    // All events emitted - close connection
    this.readyState = 2; // CLOSED
  }
  // @cpt-end:cpt-frontx-algo-api-communication-mock-event-source:p2:inst-1

  /**
   * Emit an event to registered listeners
   */
  private emitEvent(type: string, event: Event | MessageEvent): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    }

    // Call handler property if it exists
    if (type === 'open' && this.onopen) {
      this.onopen.call(this as unknown as EventSource, event);
    } else if (type === 'error' && this.onerror) {
      this.onerror.call(this as unknown as EventSource, event);
    }
  }

  /**
   * Sleep with abort signal support
   */
  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);

      // Handle abort
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      });
    });
  }
}
