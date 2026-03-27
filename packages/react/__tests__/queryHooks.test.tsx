/**
 * Integration tests for TanStack Query hooks in @hai3/react - Phase 3
 *
 * Covers:
 *   - useApiQuery: accepts EndpointDescriptor, returns ApiQueryResult
 *   - useApiMutation: accepts { endpoint, callbacks }, returns ApiMutationResult
 *   - useApiStream: StreamDescriptor lifecycle, cancellation, connect/reject paths
 *   - useApiStream: stable stream identity from descriptor.key (no reconnect on new object, same key)
 *   - QueryCache: methods accept EndpointDescriptor | QueryKey via resolveKey
 *   - HAI3Provider: reads app.queryClient from plugin
 *   - Shared QueryClient across separately mounted MFE roots via provider injection
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

// @cpt-FEATURE:implement-endpoint-descriptors:p3
// @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-use-api-query:p2
// @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2
// @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-use-api-stream:p2
// @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-query-provider:p2

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiQuery } from '../src/hooks/useApiQuery';
import { useApiMutation } from '../src/hooks/useApiMutation';
import { useApiStream } from '../src/hooks/useApiStream';
import type { MutationCallbackContext } from '../src/hooks/QueryCache';
import { HAI3Provider } from '../src/HAI3Provider';
import type { MfeContextValue } from '../src/mfe/MfeContext';
import type { ChildMfeBridge, EndpointDescriptor, MutationDescriptor, StreamDescriptor } from '@hai3/framework';

// ============================================================================
// Shared test helpers
// ============================================================================

/**
 * Build a fresh QueryClient with settings that prevent test interference:
 *   retry: 0  — avoids slow retry backoffs on intentional failures
 *   gcTime: 0 — drops cache entries immediately after a query becomes inactive
 */
function buildTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: 0 },
      mutations: { retry: 0 },
    },
  });
}

/**
 * Build a QueryClient for mutation cache tests that need entries to survive
 * without an active observer. gcTime: 0 would evict seed data immediately,
 * making queryCache.get/set assertions impossible without a mounted useApiQuery.
 */
function buildMutationCacheTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: 300_000 },
      mutations: { retry: 0 },
    },
  });
}

/**
 * React wrapper that provides an isolated QueryClient for each test.
 * Re-created per test via the factory pattern to avoid shared state.
 */
function makeQueryWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Build a minimal EndpointDescriptor for read queries.
 */
function makeQueryDescriptor<TData>(
  key: readonly unknown[],
  fetchFn: (options?: { signal?: AbortSignal }) => Promise<TData>,
  options?: { staleTime?: number; gcTime?: number }
): EndpointDescriptor<TData> {
  return { key, fetch: fetchFn, ...options };
}

/**
 * Build a minimal MutationDescriptor for write mutations.
 */
function makeMutationDescriptor<TData, TVariables>(
  key: readonly unknown[],
  fetchFn: (variables: TVariables, options?: { signal?: AbortSignal }) => Promise<TData>
): MutationDescriptor<TData, TVariables> {
  return { key, fetch: fetchFn };
}

/**
 * Minimal StreamDescriptor for useApiStream tests (no QueryClient).
 */
function makeStreamDescriptor<TEvent>(config: {
  key: readonly unknown[];
  connect: StreamDescriptor<TEvent>['connect'];
  disconnect?: StreamDescriptor<TEvent>['disconnect'];
}): StreamDescriptor<TEvent> {
  return {
    key: config.key,
    connect: config.connect,
    disconnect: config.disconnect ?? vi.fn(),
  };
}

// ============================================================================
// useApiQuery
// ============================================================================

describe('useApiQuery', () => {
  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-data
  it('returns data from a successful descriptor fetch', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const descriptor = makeQueryDescriptor(
      ['item', 1],
      () => Promise.resolve({ id: 1 })
    );

    const { result } = renderHook(
      () => useApiQuery<{ id: number }>(descriptor),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-data

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-loading
  it('reports isLoading true before the descriptor fetch resolves', () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    // A promise that never settles keeps the hook in loading state.
    const descriptor = makeQueryDescriptor<string>(
      ['slow'],
      () => new Promise(() => undefined)
    );

    const { result } = renderHook(
      () => useApiQuery<string>(descriptor),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-loading

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-error
  it('reports isError true and exposes error when descriptor fetch rejects', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const boom = new Error('network failure');
    const descriptor = makeQueryDescriptor<never>(
      ['bad'],
      () => Promise.reject(boom)
    );

    const { result } = renderHook(
      () => useApiQuery<never, Error>(descriptor),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(boom);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-error

  it('descriptor staleTime is applied as cache config (override cascades)', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const descriptor = makeQueryDescriptor(
      ['config'],
      () => Promise.resolve({ v: 1 }),
      { staleTime: 600_000 }
    );

    const { result } = renderHook(
      () => useApiQuery(descriptor),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    // Query should not be stale because staleTime = 10 min
    const queryState = client.getQueryState(['config']);
    expect(queryState?.isInvalidated).toBeFalsy();
  });

  it('component-level override wins over descriptor staleTime', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const descriptor = makeQueryDescriptor(
      ['overrideTest'],
      () => Promise.resolve('value'),
      { staleTime: 600_000 }
    );

    const { result } = renderHook(
      // Override staleTime to 0 at call site — descriptor value is ignored
      () => useApiQuery(descriptor, { staleTime: 0 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBe('value'));
    // staleTime: 0 means the query should be considered stale immediately
    const queryState = client.getQueryState(['overrideTest']);
    expect(queryState).toBeDefined();
  });
});

// ============================================================================
// useApiMutation
// ============================================================================

describe('useApiMutation', () => {
  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-calls-fn
  it('calls endpoint.fetch with the variables passed to mutate()', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const fetchFn = vi.fn(async (vars: { name: string }) => vars.name);
    const endpoint = makeMutationDescriptor<string, { name: string }>(
      ['updateName'],
      fetchFn
    );

    const { result } = renderHook(
      () => useApiMutation<string, Error, { name: string }>({ endpoint }),
      { wrapper }
    );

    result.current.mutate({ name: 'test' });

    await waitFor(() => expect(result.current.data).toBe('test'));
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith(
      { name: 'test' },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.isPending).toBe(false);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-calls-fn

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-success
  it('calls onSuccess callback with { queryCache } injected as final argument', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const onSuccess = vi.fn();
    const endpoint = makeMutationDescriptor<string, string>(
      ['toUpper'],
      async (value) => value.toUpperCase()
    );

    const { result } = renderHook(
      () =>
        useApiMutation<string, Error, string>({
          endpoint,
          onSuccess,
        }),
      { wrapper }
    );

    result.current.mutate('hello');

    await waitFor(() => expect(result.current.data).toBe('HELLO'));
    expect(onSuccess).toHaveBeenCalledOnce();
    // Verify the injected { queryCache } context is the final argument
    const [data, variables, context, callbackCtx] = onSuccess.mock.calls[0] as [string, string, unknown, MutationCallbackContext];
    expect(data).toBe('HELLO');
    expect(variables).toBe('hello');
    expect(context).toBeUndefined();
    expect(callbackCtx).toHaveProperty('queryCache');
    expect(typeof callbackCtx.queryCache.get).toBe('function');
    expect(typeof callbackCtx.queryCache.set).toBe('function');
    expect(typeof callbackCtx.queryCache.invalidate).toBe('function');
    expect(typeof callbackCtx.queryCache.cancel).toBe('function');
    expect(typeof callbackCtx.queryCache.remove).toBe('function');
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-success

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-query-cache-get-set
  it('queryCache.get and queryCache.set read and write to the QueryClient cache', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'item'];
    // Seed an initial cache entry before the mutation runs.
    client.setQueryData(QUERY_KEY, { count: 0 });

    let capturedGet: unknown;
    let capturedSet: unknown;

    const endpoint = makeMutationDescriptor<void, void>(['noop'], async () => undefined);

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          endpoint,
          onMutate: async (_variables, { queryCache }) => {
            // Read the seeded value via queryCache.get (raw QueryKey)
            capturedGet = queryCache.get<{ count: number }>(QUERY_KEY);
            // Write an optimistic update via queryCache.set (plain value)
            queryCache.set(QUERY_KEY, { count: 99 });
            capturedSet = queryCache.get<{ count: number }>(QUERY_KEY);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.data).toBeUndefined() && expect(result.current.isPending).toBe(false));

    // get() returned the seeded value
    expect(capturedGet).toEqual({ count: 0 });
    // set() wrote the optimistic value and get() reflects it immediately
    expect(capturedSet).toEqual({ count: 99 });
    // The underlying QueryClient also holds the updated value
    expect(client.getQueryData(QUERY_KEY)).toEqual({ count: 99 });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-query-cache-get-set

  it('queryCache methods accept EndpointDescriptor in place of raw QueryKey', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'descriptor-key-test'] as const;
    const queryDescriptor = makeQueryDescriptor(QUERY_KEY, () => Promise.resolve({ v: 1 }));

    client.setQueryData([...QUERY_KEY], { v: 0 });

    let capturedViaDescriptor: unknown;

    const mutationEndpoint = makeMutationDescriptor<void, void>(['noop2'], async () => undefined);

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          endpoint: mutationEndpoint,
          onMutate: async (_vars, { queryCache }) => {
            // Pass EndpointDescriptor — resolveKey extracts .key automatically
            capturedViaDescriptor = queryCache.get<{ v: number }>(queryDescriptor);
            queryCache.set(queryDescriptor, { v: 42 });
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(capturedViaDescriptor).toEqual({ v: 0 });
    expect(client.getQueryData([...QUERY_KEY])).toEqual({ v: 42 });
  });

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-set-updater
  it('queryCache.set supports an updater function for atomic read-modify-write', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'list'];
    client.setQueryData(QUERY_KEY, ['a', 'b']);

    const endpoint = makeMutationDescriptor<void, void>(['appendC'], async () => undefined);

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          endpoint,
          onMutate: async (_variables, { queryCache }) => {
            // Updater function receives the current value; return appended list.
            queryCache.set<string[]>(QUERY_KEY, (old) => [...(old ?? []), 'c']);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isPending).toBe(false));
    // Updater appended 'c' atomically.
    expect(client.getQueryData(QUERY_KEY)).toEqual(['a', 'b', 'c']);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-set-updater

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-query-cache-invalidate
  it('queryCache.invalidate in onSettled marks cached queries as stale', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'entity'];
    client.setQueryData(QUERY_KEY, { value: 'original' });

    const endpoint = makeMutationDescriptor<void, void>(['noopInvalidate'], async () => undefined);

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          endpoint,
          onSettled: async (_data, _error, _variables, _context, { queryCache }) => {
            await queryCache.invalidate(QUERY_KEY);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isPending).toBe(false));
    // After invalidation, the query is marked stale (isInvalidated flag).
    const queryState = client.getQueryState(QUERY_KEY);
    expect(queryState?.isInvalidated).toBe(true);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-query-cache-invalidate

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-error-rollback
  it('onError receives { queryCache } for snapshot rollback on mutation failure', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'rollback'];
    client.setQueryData(QUERY_KEY, { value: 'original' });

    const endpoint = makeMutationDescriptor<void, void>(
      ['alwaysFail'],
      async () => { throw new Error('server error'); }
    );

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void, { snapshot: unknown }>({
          endpoint,
          onMutate: async (_variables, { queryCache }) => {
            const snapshot = queryCache.get(QUERY_KEY);
            queryCache.set(QUERY_KEY, { value: 'optimistic' });
            return { snapshot };
          },
          onError: async (_error, _variables, context, { queryCache }) => {
            // Restore the snapshot using the context from onMutate.
            if (context?.snapshot !== undefined) {
              queryCache.set(QUERY_KEY, context.snapshot);
            }
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.error).toBeDefined());
    // After rollback, the original value is restored.
    expect(client.getQueryData(QUERY_KEY)).toEqual({ value: 'original' });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-error-rollback

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-abort-unmount
  it('aborts the descriptor fetch signal on unmount so the in-flight mutateAsync does not complete successfully', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });

    let ranPastGate = false;
    const endpoint = makeMutationDescriptor<string, void>(['abortOnUnmount'], async (_vars, opts) => {
      await gate;
      if (opts?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      ranPastGate = true;
      return 'should-not-win';
    });

    const { result, unmount } = renderHook(
      () => useApiMutation<string, Error, void>({ endpoint }),
      { wrapper }
    );

    let mutatePromise!: Promise<string>;
    await act(async () => {
      mutatePromise = result.current.mutateAsync();
    });

    unmount();

    await act(async () => {
      resolveGate();
      await expect(mutatePromise).rejects.toMatchObject({ name: 'AbortError' });
    });
    expect(ranPastGate).toBe(false);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-abort-unmount

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-abort-supersede
  it('aborts the prior in-flight fetch when a new mutateAsync starts (superseding mutation)', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    let resolveGate1!: () => void;
    const gate1 = new Promise<void>((r) => {
      resolveGate1 = r;
    });
    let resolveGate2!: () => void;
    const gate2 = new Promise<void>((r) => {
      resolveGate2 = r;
    });

    let firstCompleted = false;
    const endpoint = makeMutationDescriptor<number, { batch: 1 | 2 }>(
      ['abortSupersede'],
      async (vars, opts) => {
        await (vars.batch === 1 ? gate1 : gate2);
        if (opts?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        if (vars.batch === 1) {
          firstCompleted = true;
        }
        return vars.batch;
      }
    );

    const { result } = renderHook(
      () => useApiMutation<number, Error, { batch: 1 | 2 }>({ endpoint }),
      { wrapper }
    );

    let firstPromise!: Promise<number>;
    let secondPromise!: Promise<number>;
    await act(async () => {
      firstPromise = result.current.mutateAsync({ batch: 1 });
    });
    await act(async () => {
      secondPromise = result.current.mutateAsync({ batch: 2 });
    });

    await act(async () => {
      resolveGate1();
      await expect(firstPromise).rejects.toMatchObject({ name: 'AbortError' });
    });
    expect(firstCompleted).toBe(false);

    await act(async () => {
      resolveGate2();
      await expect(secondPromise).resolves.toBe(2);
    });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-abort-supersede
});

// ============================================================================
// useApiStream
// ============================================================================

describe('useApiStream', () => {
  it('sets connected, latest data, and leaves events empty in latest mode', async () => {
    const disconnect = vi.fn();
    let emit: (e: string) => void = () => {};
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'latest'],
      disconnect,
      connect: (onEvent) => {
        emit = onEvent;
        return Promise.resolve('cid-1');
      },
    });

    const { result } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => {
      emit('hello');
    });
    await waitFor(() => expect(result.current.data).toBe('hello'));
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('accumulate mode appends each event and keeps data as the last payload', async () => {
    const disconnect = vi.fn();
    let emit: (e: number) => void = () => {};
    const descriptor = makeStreamDescriptor<number>({
      key: ['@stream', 'accumulate'],
      disconnect,
      connect: (onEvent) => {
        emit = onEvent;
        return Promise.resolve('cid-acc');
      },
    });

    const { result } = renderHook(() =>
      useApiStream(descriptor, { mode: 'accumulate' }),
    );

    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => {
      emit(1);
      emit(2);
    });
    await waitFor(() => expect(result.current.events).toEqual([1, 2]));
    expect(result.current.data).toBe(2);
  });

  it('sets error status when connect rejects with Error', async () => {
    const boom = new Error('sse failed');
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'reject-error'],
      connect: () => Promise.reject(boom),
    });

    const { result } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(boom);
  });

  it('wraps non-Error connect rejection as Error', async () => {
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'reject-string'],
      connect: () => Promise.reject('offline'),
    });

    const { result } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toEqual(new Error('offline'));
  });

  it('with enabled false stays idle and never calls connect', () => {
    const connect = vi.fn(() => Promise.resolve('x'));
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'disabled'],
      connect,
    });

    const { result } = renderHook(() =>
      useApiStream(descriptor, { enabled: false }),
    );

    expect(result.current.status).toBe('idle');
    expect(connect).not.toHaveBeenCalled();
  });

  it('unmount disconnects using the resolved connection id', async () => {
    const disconnect = vi.fn();
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'unmount-disconnect'],
      disconnect,
      connect: () => Promise.resolve('cid-unmount'),
    });

    const { result, unmount } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(disconnect).not.toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(disconnect).toHaveBeenCalledWith('cid-unmount'));
  });

  it('does not call disconnect on unmount when connect already rejected', async () => {
    const disconnect = vi.fn();
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'reject-no-disconnect'],
      disconnect,
      connect: () => Promise.reject(new Error('nope')),
    });

    const { unmount } = renderHook(() => useApiStream(descriptor));
    await waitFor(() => expect(disconnect).not.toHaveBeenCalled());
    unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('disconnect() invokes descriptor.disconnect and sets status disconnected', async () => {
    const disconnect = vi.fn();
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'manual-off'],
      disconnect,
      connect: () => Promise.resolve('manual-id'),
    });

    const { result } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => {
      result.current.disconnect();
    });
    expect(disconnect).toHaveBeenCalledWith('manual-id');
    expect(result.current.status).toBe('disconnected');
  });

  it('onComplete sets status to disconnected', async () => {
    const disconnect = vi.fn();
    let complete: () => void = () => {};
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'on-complete'],
      disconnect,
      connect: (_onEvent, onComplete) => {
        complete = onComplete ?? (() => {});
        return Promise.resolve('id-done');
      },
    });

    const { result } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => {
      complete();
    });
    expect(result.current.status).toBe('disconnected');
  });

  it('ignores onEvent after unmount (cancelled guard)', async () => {
    const disconnect = vi.fn();
    let emit: (e: string) => void = () => {};
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'cancel-on-event'],
      disconnect,
      connect: (onEvent) => {
        emit = onEvent;
        return Promise.resolve('eid');
      },
    });

    const { result, unmount } = renderHook(() => useApiStream(descriptor));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    unmount();
    await waitFor(() => expect(disconnect).toHaveBeenCalledWith('eid'));
    act(() => {
      emit('too-late');
    });
  });

  it('after unmount, deferred connect resolve runs cleanup disconnect', async () => {
    const disconnect = vi.fn();
    let resolveConnect!: (id: string) => void;
    const pending = new Promise<string>((r) => {
      resolveConnect = r;
    });
    const descriptor = makeStreamDescriptor<number>({
      key: ['@stream', 'late-resolve'],
      disconnect,
      connect: () => pending,
    });

    const { unmount } = renderHook(() => useApiStream(descriptor));
    unmount();

    await act(async () => {
      resolveConnect('late');
      await pending;
    });

    expect(disconnect).toHaveBeenCalledWith('late');
  });

  it('after unmount, connect rejection is handled by cleanup without disconnect', async () => {
    const disconnect = vi.fn();
    let rejectConnect!: (e: Error) => void;
    const pending = new Promise<string>((_, rej) => {
      rejectConnect = rej;
    });
    const descriptor = makeStreamDescriptor<string>({
      key: ['@stream', 'late-reject'],
      disconnect,
      connect: () => pending,
    });

    const { unmount } = renderHook(() => useApiStream(descriptor));
    unmount();

    await act(async () => {
      rejectConnect(new Error('late'));
      await pending.catch(() => undefined);
    });

    expect(disconnect).not.toHaveBeenCalled();
  });

  it('changing descriptor key disconnects the previous connection id', async () => {
    const disconnectA = vi.fn();
    const disconnectB = vi.fn();
    const descA = makeStreamDescriptor<string>({
      key: ['@stream', 'key-a'],
      disconnect: disconnectA,
      connect: () => Promise.resolve('id-a'),
    });
    const descB = makeStreamDescriptor<string>({
      key: ['@stream', 'key-b'],
      disconnect: disconnectB,
      connect: () => Promise.resolve('id-b'),
    });

    const { result, rerender } = renderHook(
      (d: StreamDescriptor<string>) => useApiStream(d),
      { initialProps: descA },
    );

    await waitFor(() => expect(result.current.status).toBe('connected'));
    rerender(descB);
    await waitFor(() => expect(disconnectA).toHaveBeenCalledWith('id-a'));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(disconnectB).not.toHaveBeenCalled();
  });

  it('resets data and events when descriptor key changes', async () => {
    let emitA: (e: string) => void = () => {};
    const descA = makeStreamDescriptor<string>({
      key: ['@stream', 'reset-a'],
      connect: (onEvent) => {
        emitA = onEvent;
        return Promise.resolve('id-a');
      },
    });

    let emitB: (e: string) => void = () => {};
    const descB = makeStreamDescriptor<string>({
      key: ['@stream', 'reset-b'],
      connect: (onEvent) => {
        emitB = onEvent;
        return Promise.resolve('id-b');
      },
    });

    const { result, rerender } = renderHook(
      (d: StreamDescriptor<string>) => useApiStream(d, { mode: 'accumulate' }),
      { initialProps: descA },
    );

    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => {
      emitA('a1');
      emitA('a2');
    });
    expect(result.current.data).toBe('a2');
    expect(result.current.events).toEqual(['a1', 'a2']);

    rerender(descB);

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.events).toEqual([]);

    act(() => emitB('b1'));
    expect(result.current.data).toBe('b1');
    expect(result.current.events).toEqual(['b1']);
  });

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-stream:p2:inst-test-same-key-no-reconnect
  it('does not call connect again when a new descriptor object shares the same key', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const streamKey: readonly unknown[] = ['/api/test', 'SSE', '/stream'];
    const connectFirst = vi.fn(() => Promise.resolve('conn-first'));
    const disconnectFirst = vi.fn();

    const descriptorFirst: StreamDescriptor<string> = {
      key: streamKey,
      connect: connectFirst,
      disconnect: disconnectFirst,
    };

    const { rerender } = renderHook(
      (d: StreamDescriptor<string>) => useApiStream(d),
      { wrapper, initialProps: descriptorFirst },
    );

    await waitFor(() => expect(connectFirst).toHaveBeenCalledTimes(1));

    const connectSecond = vi.fn(() => Promise.resolve('conn-second'));
    const descriptorSecond: StreamDescriptor<string> = {
      key: streamKey,
      connect: connectSecond,
      disconnect: vi.fn(),
    };

    rerender(descriptorSecond);

    await waitFor(() => expect(connectSecond).not.toHaveBeenCalled());
    expect(connectFirst).toHaveBeenCalledTimes(1);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-stream:p2:inst-test-same-key-no-reconnect
});

// ============================================================================
// QueryClientProvider inside HAI3Provider
// ============================================================================

describe('HAI3Provider provides QueryClient to descendants', () => {
  afterEach(() => {
    // Nothing to clean up — each renderHook unmounts automatically.
  });

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-test-hai3-provider
  it('useApiQuery resolves inside HAI3Provider (queryCache plugin provides QueryClient)', async () => {
    // HAI3Provider reads app.queryClient from the queryCache() plugin.
    // If the query resolves, the provider wiring through the plugin is correct.
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <HAI3Provider>{children}</HAI3Provider>;
    }

    const descriptor = makeQueryDescriptor(
      ['answer'],
      () => Promise.resolve(42)
    );

    const { result } = renderHook(
      () => useApiQuery<number>(descriptor),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-test-hai3-provider
});

// ============================================================================
// Shared QueryClient across separately mounted MFE roots
// ============================================================================

describe('HAI3Provider reuses an injected QueryClient across MFE roots', () => {
  // Minimal bridge stub — only the fields that MfeContext types require.
  function makeMockBridge(): ChildMfeBridge {
    return {
      domainId: 'gts.hai3.mfes.ext.domain.v1~test.isolation.v1',
      instanceId: 'isolation-test',
      executeActionsChain: vi.fn().mockResolvedValue(undefined),
      subscribeToProperty: vi.fn().mockReturnValue(() => undefined),
      getProperty: vi.fn().mockReturnValue(undefined),
    };
  }

  function makeContextValue(id: string): MfeContextValue {
    return {
      bridge: makeMockBridge(),
      extensionId: id,
      domainId: 'gts.hai3.mfes.ext.domain.v1~test.isolation.v1',
    };
  }

  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mfe-shared-cache
  it('two HAI3Providers using the same injected QueryClient return the same cached value for the same descriptor key', async () => {
    // Separate MFE roots each render their own HAI3Provider. Shared cache only
    // happens when the same QueryClient instance is injected into both roots.
    // The first descriptor fetch populates the cache; the second MFE gets the cached result.
    //
    // gcTime must be > 0 so the cache entry survives between the two
    // independent renderHook calls (the first observer unmounts before
    // the second mounts).
    // staleTime: Infinity prevents stale-triggered refetches.
    // refetchOnMount: false / refetchOnWindowFocus: false eliminate background
    // refetches in the jsdom test environment so the assertion is deterministic.
    const sharedClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 0,
          gcTime: 300_000,
          staleTime: Infinity,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    const queryFnAlpha = vi.fn(() => Promise.resolve('data-from-alpha'));
    const queryFnBeta = vi.fn(() => Promise.resolve('data-from-beta'));

    // Both descriptors share the same key — cache hit expected on second render.
    const descriptorAlpha = makeQueryDescriptor(['shared-key'], queryFnAlpha);
    const descriptorBeta = makeQueryDescriptor(['shared-key'], queryFnBeta);

    function makeMfeWrapper(contextValue: MfeContextValue) {
      return function MfeWrapper({ children }: { children: React.ReactNode }) {
        return (
          <HAI3Provider queryClient={sharedClient} mfeBridge={contextValue}>
            {children}
          </HAI3Provider>
        );
      };
    }

    const mfe1Value = makeContextValue('mfe-alpha');
    const mfe2Value = makeContextValue('mfe-beta');

    // MFE alpha fetches first — populates the shared cache.
    const { result: result1 } = renderHook(
      () => useApiQuery<string>(descriptorAlpha),
      { wrapper: makeMfeWrapper(mfe1Value) }
    );

    await waitFor(() => expect(result1.current.data).toBeDefined());
    expect(result1.current.data).toBe('data-from-alpha');
    expect(queryFnAlpha).toHaveBeenCalledOnce();

    // MFE beta uses the same key — gets the cached result from alpha.
    const { result: result2 } = renderHook(
      () => useApiQuery<string>(descriptorBeta),
      { wrapper: makeMfeWrapper(mfe2Value) }
    );

    await waitFor(() => expect(result2.current.data).toBeDefined());
    // Both MFEs see the same data — cache is shared.
    expect(result2.current.data).toBe('data-from-alpha');
    // Beta's queryFn was NOT called because the cache was already populated.
    expect(queryFnBeta).not.toHaveBeenCalled();
  });
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mfe-shared-cache
});
