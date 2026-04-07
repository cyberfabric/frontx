import { QueryClient, type QueryState } from '@tanstack/query-core';
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-algo:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2
import {
  DEFAULT_SERVER_STATE_ADAPTER_ID,
  SERVER_STATE_BROADCAST_TARGET,
  SERVER_STATE_NATIVE_HANDLE,
  type ServerStateCache,
  type ServerStateInvalidateFilters,
  type ServerStateKey,
  type ServerStateQueryState,
  type ServerStateRuntime,
  type ServerStateUpdater,
} from '../serverState';
import type { QueryCacheConfig } from '../plugins/queryCache';

const TANSTACK_RUNTIME_COUNTER_KEY = Symbol.for('hai3:server-state:tanstack-runtime-counter');

type GlobalServerStateCounter = typeof globalThis & {
  [TANSTACK_RUNTIME_COUNTER_KEY]?: number;
};

function isNonEmptyServerStateKey(queryKey: unknown): queryKey is ServerStateKey {
  return Array.isArray(queryKey) && queryKey.length > 0;
}

function nextTanStackRuntimeBroadcastTarget(): string {
  const runtimeGlobals = globalThis as GlobalServerStateCounter;
  const nextCounter = (runtimeGlobals[TANSTACK_RUNTIME_COUNTER_KEY] ?? 0) + 1;
  runtimeGlobals[TANSTACK_RUNTIME_COUNTER_KEY] = nextCounter;
  return `tanstack-runtime-${nextCounter}`;
}

function toQueryUpdater<T>(
  dataOrUpdater: ServerStateUpdater<T>
): (old: T | undefined) => T | undefined {
  if (typeof dataOrUpdater === 'function') {
    return dataOrUpdater as (old: T | undefined) => T | undefined;
  }

  return () => dataOrUpdater;
}

function toServerStateQueryState<TData, TError = Error>(
  state: QueryState<TData, TError>
): ServerStateQueryState<TData, TError> {
  return {
    data: state.data,
    dataUpdatedAt: state.dataUpdatedAt,
    error: state.error,
    errorUpdatedAt: state.errorUpdatedAt,
    fetchFailureCount: state.fetchFailureCount,
    fetchFailureReason: state.fetchFailureReason,
    fetchStatus: state.fetchStatus,
    isInvalidated: state.isInvalidated,
    status: state.status,
  };
}

function createTanStackServerStateCache(queryClient: QueryClient): ServerStateCache {
  return {
    get: <T,>(queryKey: ServerStateKey) => queryClient.getQueryData<T>(queryKey),
    getState: <TData = unknown, TError = Error>(queryKey: ServerStateKey) => {
      const state = queryClient.getQueryState<TData, TError>(queryKey);
      return state ? toServerStateQueryState(state) : undefined;
    },
    set: <T,>(queryKey: ServerStateKey, dataOrUpdater: ServerStateUpdater<T>) => {
      queryClient.setQueryData<T>(queryKey, toQueryUpdater(dataOrUpdater));
    },
    cancel: (queryKey: ServerStateKey) => queryClient.cancelQueries({ queryKey }),
    cancelAll: () => queryClient.cancelQueries(),
    invalidate: (queryKey: ServerStateKey) => queryClient.invalidateQueries({ queryKey }),
    invalidateMany: (filters: ServerStateInvalidateFilters) => {
      if (!isNonEmptyServerStateKey((filters as { queryKey?: unknown }).queryKey)) {
        return Promise.resolve();
      }

      return queryClient.invalidateQueries(filters);
    },
    remove: (queryKey: ServerStateKey) => queryClient.removeQueries({ queryKey }),
    clear: () => queryClient.clear(),
  };
}

export function createTanStackServerStateRuntime(
  config?: QueryCacheConfig
): ServerStateRuntime {
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-stale-time
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-gc-time
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-no-retry
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-refetch-focus
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: config?.staleTime ?? 30_000,
        gcTime: config?.gcTime ?? 300_000,
        // Disable retries by default — failed requests should surface errors immediately.
        // Consumers can opt in per-query if they need retry behaviour.
        retry: 0,
        refetchOnWindowFocus: config?.refetchOnWindowFocus ?? true,
      },
    },
  });
  // @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-stale-time
  // @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-gc-time
  // @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-no-retry
  // @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-refetch-focus

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
  // @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-expose-client
  return {
    adapterId: DEFAULT_SERVER_STATE_ADAPTER_ID,
    cache: createTanStackServerStateCache(queryClient),
    [SERVER_STATE_BROADCAST_TARGET]: nextTanStackRuntimeBroadcastTarget(),
    [SERVER_STATE_NATIVE_HANDLE]: queryClient,
  };
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
  // @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-expose-client
}
