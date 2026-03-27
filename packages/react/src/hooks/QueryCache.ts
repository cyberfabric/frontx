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
 *
 * All methods accept either an EndpointDescriptor (from @hai3/api) or a raw
 * QueryKey. resolveKey() extracts .key from a descriptor or passes raw keys
 * through unchanged, so callers can write queryCache.get(service.endpoint)
 * rather than queryCache.get(service.endpoint.key).
 */
// @cpt-dod:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2:inst-create-query-cache
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import type { QueryClient, QueryKey, QueryState } from '@tanstack/react-query';
import type { EndpointDescriptor } from '@hai3/framework';

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

// @cpt-begin:implement-endpoint-descriptors:p3:inst-resolve-key
/**
 * Extract the raw QueryKey from either an EndpointDescriptor or a plain QueryKey.
 * This lets callers pass service.endpoint directly instead of service.endpoint.key.
 */
export function resolveKey(target: EndpointDescriptor<unknown> | QueryKey): readonly unknown[] {
  if (
    target !== null &&
    typeof target === 'object' &&
    !Array.isArray(target) &&
    'key' in target &&
    'fetch' in target &&
    Array.isArray((target as EndpointDescriptor<unknown>).key) &&
    typeof (target as EndpointDescriptor<unknown>).fetch === 'function'
  ) {
    return (target as EndpointDescriptor<unknown>).key;
  }

  return target as readonly unknown[];
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-resolve-key

// @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-query-cache-interface
/**
 * Restricted public cache accessor used by useApiMutation callbacks and
 * useQueryCache().
 *
 * Every method accepts EndpointDescriptor | QueryKey. resolveKey() extracts the
 * stable cache key from descriptors so callers never touch .key directly.
 *
 * set() accepts both a plain value and an updater function. The updater receives
 * the current cached value (or undefined on first write) and returns the new value.
 * Returning undefined from the updater cancels the update — matching TanStack semantics.
 */
export interface QueryCache {
  get<T>(queryKey: EndpointDescriptor<unknown> | QueryKey): T | undefined;
  getState<TData = unknown, TError = Error>(
    queryKey: EndpointDescriptor<unknown> | QueryKey
  ): QueryCacheState<TData, TError> | undefined;
  set<T>(queryKey: EndpointDescriptor<unknown> | QueryKey, dataOrUpdater: T | ((old: T | undefined) => T | undefined)): void;
  cancel(queryKey: EndpointDescriptor<unknown> | QueryKey): Promise<void>;
  invalidate(queryKey: EndpointDescriptor<unknown> | QueryKey): Promise<void>;
  invalidateMany(filters: QueryCacheInvalidateFilters): Promise<void>;
  remove(queryKey: EndpointDescriptor<unknown> | QueryKey): void;
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

// @cpt-begin:implement-endpoint-descriptors:p3:inst-to-query-updater
function toQueryUpdater<T>(
  dataOrUpdater: QueryCacheUpdater<T>
): (old: T | undefined) => T | undefined {
  if (typeof dataOrUpdater === 'function') {
    return dataOrUpdater as (old: T | undefined) => T | undefined;
  }

  return () => dataOrUpdater;
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-to-query-updater

/**
 * Build a restricted QueryCache facade from the internal TanStack QueryClient.
 */
// @cpt-begin:implement-endpoint-descriptors:p3:inst-create-query-cache
export function createQueryCache(queryClient: QueryClient): QueryCache {
  return {
    get: <T,>(key: EndpointDescriptor<unknown> | QueryKey): T | undefined => {
      return queryClient.getQueryData<T>(resolveKey(key) as QueryKey);
    },
    getState: <TData = unknown, TError = Error>(key: EndpointDescriptor<unknown> | QueryKey) => {
      return queryClient.getQueryState<TData, TError>(resolveKey(key) as QueryKey);
    },
    set: <T,>(key: EndpointDescriptor<unknown> | QueryKey, dataOrUpdater: QueryCacheUpdater<T>): void => {
      queryClient.setQueryData<T>(resolveKey(key) as QueryKey, toQueryUpdater(dataOrUpdater));
    },
    cancel: (key: EndpointDescriptor<unknown> | QueryKey): Promise<void> => {
      return queryClient.cancelQueries({ queryKey: resolveKey(key) as QueryKey });
    },
    invalidate: (key: EndpointDescriptor<unknown> | QueryKey): Promise<void> => {
      return queryClient.invalidateQueries({ queryKey: resolveKey(key) as QueryKey });
    },
    invalidateMany: (filters): Promise<void> => {
      return queryClient.invalidateQueries(filters);
    },
    remove: (key: EndpointDescriptor<unknown> | QueryKey): void => {
      queryClient.removeQueries({ queryKey: resolveKey(key) as QueryKey });
    },
  };
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-create-query-cache
