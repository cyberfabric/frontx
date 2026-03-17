/**
 * Integration tests for TanStack Query hooks in @hai3/react - Phase 2
 *
 * Covers:
 *   - useApiQuery: data, loading, and error states
 *   - useApiMutation: mutationFn invocation, callback lifecycle, QueryCache injection
 *   - QueryClientProvider availability inside HAI3Provider
 *   - Shared QueryClient across separately mounted MFE roots via provider injection
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

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
import type { ChildMfeBridge } from '@hai3/framework';

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

// ============================================================================
// useApiQuery
// ============================================================================

describe('useApiQuery', () => {
  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-data
  it('returns data from a successful queryFn', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const { result } = renderHook(
      () =>
        useApiQuery<{ id: number }>({
          queryKey: ['item', 1],
          queryFn: () => Promise.resolve({ id: 1 }),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1 });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-data

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-loading
  it('reports isLoading true before the queryFn resolves', () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    // A promise that never settles keeps the hook in loading state.
    const { result } = renderHook(
      () =>
        useApiQuery<string>({
          queryKey: ['slow'],
          queryFn: () => new Promise(() => undefined),
        }),
      { wrapper }
    );

    // isLoading is true before any response arrives.
    expect(result.current.isLoading).toBe(true);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-loading

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-error
  it('reports isError true and exposes error when queryFn rejects', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const boom = new Error('network failure');

    const { result } = renderHook(
      () =>
        useApiQuery<never, Error>({
          queryKey: ['bad'],
          queryFn: () => Promise.reject(boom),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(boom);
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-test-error
});

// ============================================================================
// useApiMutation
// ============================================================================

describe('useApiMutation', () => {
  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-calls-fn
  it('calls mutationFn with the variables passed to mutate()', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const mutationFn = vi.fn(async (vars: { name: string }) => vars.name);

    const { result } = renderHook(
      () => useApiMutation<string, Error, { name: string }>({ mutationFn }),
      { wrapper }
    );

    result.current.mutate({ name: 'test' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledOnce();
    // TanStack Query v5 passes (variables, mutationContext) to mutationFn
    expect(mutationFn).toHaveBeenCalledWith({ name: 'test' }, expect.anything());
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-calls-fn

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-success
  it('calls onSuccess callback with { queryCache } injected as final argument', async () => {
    const client = buildTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useApiMutation<string, Error, string>({
          mutationFn: async (value) => value.toUpperCase(),
          onSuccess,
        }),
      { wrapper }
    );

    result.current.mutate('hello');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
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

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          mutationFn: async () => undefined,
          onMutate: async (_variables, { queryCache }) => {
            // Read the seeded value via queryCache.get
            capturedGet = queryCache.get<{ count: number }>(QUERY_KEY);
            // Write an optimistic update via queryCache.set (plain value)
            queryCache.set(QUERY_KEY, { count: 99 });
            capturedSet = queryCache.get<{ count: number }>(QUERY_KEY);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // get() returned the seeded value
    expect(capturedGet).toEqual({ count: 0 });
    // set() wrote the optimistic value and get() reflects it immediately
    expect(capturedSet).toEqual({ count: 99 });
    // The underlying QueryClient also holds the updated value
    expect(client.getQueryData(QUERY_KEY)).toEqual({ count: 99 });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-query-cache-get-set

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-set-updater
  it('queryCache.set supports an updater function for atomic read-modify-write', async () => {
    const client = buildMutationCacheTestQueryClient();
    const wrapper = makeQueryWrapper(client);

    const QUERY_KEY = ['@test', 'list'];
    client.setQueryData(QUERY_KEY, ['a', 'b']);

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          mutationFn: async () => undefined,
          onMutate: async (_variables, { queryCache }) => {
            // Updater function receives the current value; return appended list.
            queryCache.set<string[]>(QUERY_KEY, (old) => [...(old ?? []), 'c']);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
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

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void>({
          mutationFn: async () => undefined,
          onSettled: async (_data, _error, _variables, _context, { queryCache }) => {
            await queryCache.invalidate(QUERY_KEY);
          },
        }),
      { wrapper }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
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

    const { result } = renderHook(
      () =>
        useApiMutation<void, Error, void, { snapshot: unknown }>({
          mutationFn: async () => { throw new Error('server error'); },
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

    await waitFor(() => expect(result.current.isError).toBe(true));
    // After rollback, the original value is restored.
    expect(client.getQueryData(QUERY_KEY)).toEqual({ value: 'original' });
  });
  // @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-test-on-error-rollback
});

// ============================================================================
// QueryClientProvider inside HAI3Provider
// ============================================================================

describe('HAI3Provider provides QueryClient to descendants', () => {
  // Track app instances so we can call destroy() in afterEach.
  // HAI3Provider creates a HAI3App internally; we let it manage its lifecycle
  // but skip providing one so we exercise the default code path.
  afterEach(() => {
    // Nothing to clean up — each renderHook unmounts automatically.
  });

  // @cpt-begin:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-test-hai3-provider
  it('useApiQuery resolves inside HAI3Provider without a standalone QueryClientProvider', async () => {
    // HAI3Provider internally wraps children with QueryClientProvider.
    // If the query works, the provider wiring is correct.
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <HAI3Provider>{children}</HAI3Provider>;
    }

    const { result } = renderHook(
      () =>
        useApiQuery<number>({
          queryKey: ['answer'],
          queryFn: () => Promise.resolve(42),
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(42);
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
  it('two HAI3Providers using the same injected QueryClient return the same cached value for the same queryKey', async () => {
    // Separate MFE roots each render their own HAI3Provider. Shared cache only
    // happens when the same QueryClient instance is injected into both roots.
    // The first queryFn populates the cache; the second MFE receives the cached result.
    //
    // gcTime must be > 0 so the cache entry survives between the two
    // independent renderHook calls (the first observer unmounts before
    // the second mounts).
    const sharedClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 0, gcTime: 300_000, staleTime: 300_000 },
      },
    });
    const queryFnAlpha = vi.fn(() => Promise.resolve('data-from-alpha'));
    const queryFnBeta = vi.fn(() => Promise.resolve('data-from-beta'));

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
      () =>
        useApiQuery<string>({
          queryKey: ['shared-key'],
          queryFn: queryFnAlpha,
        }),
      { wrapper: makeMfeWrapper(mfe1Value) }
    );

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe('data-from-alpha');
    expect(queryFnAlpha).toHaveBeenCalledOnce();

    // MFE beta uses the same queryKey — gets the cached result from alpha.
    const { result: result2 } = renderHook(
      () =>
        useApiQuery<string>({
          queryKey: ['shared-key'],
          queryFn: queryFnBeta,
        }),
      { wrapper: makeMfeWrapper(mfe2Value) }
    );

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    // Both MFEs see the same data — cache is shared.
    expect(result2.current.data).toBe('data-from-alpha');
    // Beta's queryFn was NOT called because the cache was already populated.
    expect(queryFnBeta).not.toHaveBeenCalled();
  });
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mfe-shared-cache
});
