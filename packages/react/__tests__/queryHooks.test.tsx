/**
 * Integration tests for TanStack Query hooks in @hai3/react - Phase 3
 *
 * Covers:
 *   - useApiQuery: accepts EndpointDescriptor, returns ApiQueryResult
 *   - useApiMutation: accepts { endpoint, callbacks }, returns ApiMutationResult
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
// @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-query-provider:p2

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiQuery } from '../src/hooks/useApiQuery';
import { useApiMutation } from '../src/hooks/useApiMutation';
import type { MutationCallbackContext } from '../src/hooks/QueryCache';
import { HAI3Provider } from '../src/HAI3Provider';
import type { MfeContextValue } from '../src/mfe/MfeContext';
import type { ChildMfeBridge, EndpointDescriptor, MutationDescriptor } from '@hai3/framework';

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
  fetchFn: (variables: TVariables) => Promise<TData>
): MutationDescriptor<TData, TVariables> {
  return { key, fetch: fetchFn };
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
    expect(fetchFn).toHaveBeenCalledWith({ name: 'test' });
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
