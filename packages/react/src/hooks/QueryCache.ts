/**
 * QueryCache — restricted interface for interacting with the TanStack QueryClient.
 *
 * MFEs and screen-set components access the shared cache through this sanctioned
 * public interface. It is injected as { queryCache } into useApiMutation callbacks
 * and also returned by useQueryCache() for controlled imperative cache access.
 * The underlying QueryClient is never exposed directly, preventing one MFE from
 * depending on raw TanStack internals.
 *
 * Surface area mirrors the mutation callback use cases documented in FEATURE.md:
 *   - get/getState/set: optimistic snapshot + restore + state inspection
 *   - cancel: race condition prevention before optimistic apply
 *   - invalidate/invalidateMany: post-mutation authoritative refetch
 *   - remove: cache eviction for targeted session cleanup
 */
// @cpt-dod:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2:inst-create-query-cache

import type { QueryClient, QueryKey, QueryState } from '@tanstack/react-query';

export type QueryCacheState<TData = unknown, TError = Error> = Pick<
  QueryState<TData, TError>,
  | 'data'
  | 'dataUpdatedAt'
  | 'error'
  | 'errorUpdatedAt'
  | 'fetchFailureCount'
  | 'fetchFailureReason'
  | 'fetchStatus'
  | 'isInvalidated'
  | 'status'
>;

export type QueryCacheInvalidateFilters = {
  queryKey?: QueryKey;
  exact?: boolean;
  refetchType?: 'active' | 'inactive' | 'all' | 'none';
};

// @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-query-cache-interface
/**
 * Restricted public cache accessor used by useApiMutation callbacks and
 * useQueryCache().
 *
 * set() accepts both a plain value and an updater function. The updater receives
 * the current cached value (or undefined on first write) and returns the new value.
 * Returning undefined from the updater cancels the update — matching TanStack semantics.
 */
export interface QueryCache {
  get<T>(queryKey: QueryKey): T | undefined;
  getState<TData = unknown, TError = Error>(
    queryKey: QueryKey
  ): QueryCacheState<TData, TError> | undefined;
  set<T>(queryKey: QueryKey, dataOrUpdater: T | ((old: T | undefined) => T | undefined)): void;
  cancel(queryKey: QueryKey): Promise<void>;
  invalidate(queryKey: QueryKey): Promise<void>;
  invalidateMany(filters: QueryCacheInvalidateFilters): Promise<void>;
  remove(queryKey: QueryKey): void;
}
// @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-query-cache-interface

// @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-mutation-callback-context
/**
 * Additional context parameter injected as the final argument into each
 * useApiMutation callback (onMutate, onSuccess, onError, onSettled).
 */
export interface MutationCallbackContext {
  queryCache: QueryCache;
}
// @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-mutation-callback-context

type QueryCacheUpdater<T> = T | ((old: T | undefined) => T | undefined);

function toQueryUpdater<T>(
  dataOrUpdater: QueryCacheUpdater<T>
): (old: T | undefined) => T | undefined {
  if (typeof dataOrUpdater === 'function') {
    return dataOrUpdater as (old: T | undefined) => T | undefined;
  }

  return () => dataOrUpdater;
}

/**
 * Build a restricted QueryCache facade from the internal TanStack QueryClient.
 */
export function createQueryCache(queryClient: QueryClient): QueryCache {
  return {
    get: <T,>(key: QueryKey): T | undefined => {
      return queryClient.getQueryData<T>(key);
    },
    getState: <TData = unknown, TError = Error>(key: QueryKey) => {
      return queryClient.getQueryState<TData, TError>(key);
    },
    set: <T,>(key: QueryKey, dataOrUpdater: QueryCacheUpdater<T>): void => {
      queryClient.setQueryData<T>(key, toQueryUpdater(dataOrUpdater));
    },
    cancel: (key: QueryKey): Promise<void> => {
      return queryClient.cancelQueries({ queryKey: key });
    },
    invalidate: (key: QueryKey): Promise<void> => {
      return queryClient.invalidateQueries({ queryKey: key });
    },
    invalidateMany: (filters): Promise<void> => {
      return queryClient.invalidateQueries(filters);
    },
    remove: (key: QueryKey): void => {
      queryClient.removeQueries({ queryKey: key });
    },
  };
}
