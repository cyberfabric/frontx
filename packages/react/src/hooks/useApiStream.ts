/**
 * useApiStream - Declarative SSE streaming hook
 *
 * Accepts a StreamDescriptor from @hai3/api and manages the EventSource
 * lifecycle: connects on mount, disconnects on unmount/descriptor change.
 * Returns the latest event, accumulated events, connection status, and
 * a manual disconnect function.
 *
 * @example
 * ```tsx
 * const { data, events, status, error } = useApiStream(
 *   service.messageStream,
 *   { mode: 'latest' }   // default — data holds last event
 * );
 *
 * // Accumulate all events
 * const { events, status } = useApiStream(service.messageStream, { mode: 'accumulate' });
 * ```
 */

// @cpt-dod:cpt-hai3-dod-request-lifecycle-use-api-stream:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-stream:p2
// @cpt-FEATURE:cpt-hai3-fr-sse-stream-descriptors:p3

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { StreamDescriptor, StreamStatus } from '@hai3/framework';

/** Configuration options for useApiStream. */
export interface ApiStreamOptions {
  /**
   * `'latest'` (default) — `data` holds the most recent event.
   * `'accumulate'` — `events` holds all received events in order.
   */
  mode?: 'latest' | 'accumulate';
  /** When false the connection is deferred (no connect on mount). Default true. */
  enabled?: boolean;
}

/** Return type of useApiStream. */
export interface ApiStreamResult<TEvent> {
  /** Latest event payload (always set in both modes). */
  data: TEvent | undefined;
  /** All received events when `mode: 'accumulate'`; empty array in `'latest'` mode. */
  events: TEvent[];
  /** Connection lifecycle status. */
  status: StreamStatus;
  /** Error if the connection failed. */
  error: Error | null;
  /** Manually close the connection. */
  disconnect: () => void;
}

// @cpt-begin:cpt-hai3-flow-request-lifecycle-use-api-stream:p2:inst-use-api-stream
export function useApiStream<TEvent>(
  descriptor: StreamDescriptor<TEvent>,
  options?: ApiStreamOptions,
): ApiStreamResult<TEvent> {
  const mode = options?.mode ?? 'latest';
  const enabled = options?.enabled ?? true;

  const [data, setData] = useState<TEvent | undefined>(undefined);
  const [events, setEvents] = useState<TEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Track connectionId across renders for cleanup.
  const connectionIdRef = useRef<string | null>(null);

  // Stable identity derived from descriptor key — used as effect dependency.
  const descriptorKey = useMemo(() => descriptor.key.join('/'), [descriptor.key]);

  const disconnect = useCallback(() => {
    if (connectionIdRef.current) {
      descriptor.disconnect(connectionIdRef.current);
      connectionIdRef.current = null;
      setStatus('disconnected');
    }
  }, [descriptor]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let cancelled = false;

    setStatus('connecting');
    setError(null);

    descriptor
      .connect(
        (event) => {
          if (cancelled) return;
          setData(event);
          setStatus('connected');
          if (mode === 'accumulate') {
            setEvents((prev) => [...prev, event]);
          }
        },
        () => {
          if (cancelled) return;
          setStatus('disconnected');
          connectionIdRef.current = null;
        },
      )
      .then((id) => {
        if (cancelled) {
          // Component unmounted before connect resolved — tear down immediately.
          descriptor.disconnect(id);
          return;
        }
        connectionIdRef.current = id;
        setStatus('connected');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (connectionIdRef.current) {
        descriptor.disconnect(connectionIdRef.current);
        connectionIdRef.current = null;
      }
    };
  }, [descriptor, descriptorKey, enabled, mode]);

  return { data, events, status, error, disconnect };
}
// @cpt-end:cpt-hai3-flow-request-lifecycle-use-api-stream:p2:inst-use-api-stream
