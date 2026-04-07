/**
 * QueryCache — restricted interface for interacting with the FrontX server-state cache.
 *
 * MFEs and screen-set components access the shared cache through this sanctioned
 * public interface. It is injected as { queryCache } into useApiMutation callbacks
 * and also returned by useQueryCache() for controlled imperative cache access.
 * The underlying engine is never exposed directly, preventing one MFE from
 * depending on implementation-specific internals.
 *
 * Surface area mirrors the mutation callback use cases documented in FEATURE.md:
 *   - get/getState/set: optimistic snapshot + restore + state inspection
 *   - cancel: race condition prevention before optimistic apply
 *   - invalidate/invalidateMany: post-mutation authoritative refetch
 *   - remove: cache eviction for targeted session cleanup
 *
 * All methods accept either an EndpointDescriptor (from @cyberfabric/api) or a raw
 * QueryKey. resolveKey() extracts .key from a descriptor or passes raw keys
 * through unchanged, so callers can write queryCache.get(service.endpoint)
 * rather than queryCache.get(service.endpoint.key).
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-create-query-cache
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import type {
  EndpointDescriptor,
  ServerStateInvalidateFilters,
  ServerStateKey,
  ServerStateQueryState,
  ServerStateRuntime,
  ServerStateUpdater,
} from '@cyberfabric/framework';
import { eventBus } from '@cyberfabric/framework';

export type QueryCacheState<TData = unknown, TError = Error> = ServerStateQueryState<TData, TError>;

export type QueryCacheInvalidateFilters = {
  queryKey: EndpointDescriptor<unknown> | ServerStateKey;
  exact?: boolean;
  refetchType?: ServerStateInvalidateFilters['refetchType'];
};

type CacheInvalidateEvent = ServerStateInvalidateFilters & {
  source?: string;
};

type CacheSetEvent = {
  queryKey: ServerStateKey;
  dataOrUpdater: ServerStateUpdater<unknown>;
  source?: string;
};

type CacheRemoveEvent = {
  queryKey: ServerStateKey;
  source?: string;
};

const SERVER_STATE_BROADCAST_TARGET = Symbol.for('hai3:server-state:broadcast-target');

function emitCacheEvent(event: string, payload: unknown): void {
  (eventBus.emit as (eventType: string, payload: unknown) => void)(event, payload);
}

function getBroadcastSource(runtime: ServerStateRuntime): string {
  return (
    runtime as ServerStateRuntime & Record<typeof SERVER_STATE_BROADCAST_TARGET, string>
  )[SERVER_STATE_BROADCAST_TARGET];
}

// @cpt-begin:implement-endpoint-descriptors:p3:inst-resolve-key
/**
 * Extract the raw QueryKey from either an EndpointDescriptor or a plain QueryKey.
 * This lets callers pass service.endpoint directly instead of service.endpoint.key.
 */
export function resolveKey(target: EndpointDescriptor<unknown> | ServerStateKey): readonly unknown[] {
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

// @cpt-begin:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-query-cache-interface
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
  get<T>(queryKey: EndpointDescriptor<unknown> | ServerStateKey): T | undefined;
  getState<TData = unknown, TError = Error>(
    queryKey: EndpointDescriptor<unknown> | ServerStateKey
  ): QueryCacheState<TData, TError> | undefined;
  set<T>(queryKey: EndpointDescriptor<unknown> | ServerStateKey, dataOrUpdater: T | ((old: T | undefined) => T | undefined)): void;
  cancel(queryKey: EndpointDescriptor<unknown> | ServerStateKey): Promise<void>;
  invalidate(queryKey: EndpointDescriptor<unknown> | ServerStateKey): Promise<void>;
  invalidateMany(filters: QueryCacheInvalidateFilters): Promise<void>;
  remove(queryKey: EndpointDescriptor<unknown> | ServerStateKey): void;
}
// @cpt-end:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-query-cache-interface

// @cpt-begin:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-mutation-callback-context
/**
 * Additional context parameter injected as the final argument into each
 * useApiMutation callback (onMutate, onSuccess, onError, onSettled).
 */
export interface MutationCallbackContext {
  queryCache: QueryCache;
}
// @cpt-end:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-mutation-callback-context

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
 * Build a restricted QueryCache facade from the internal server-state cache.
 */
// @cpt-begin:implement-endpoint-descriptors:p3:inst-create-query-cache
export function createQueryCache(runtime: ServerStateRuntime): QueryCache {
  return {
    get: <T,>(key: EndpointDescriptor<unknown> | ServerStateKey): T | undefined => {
      return runtime.cache.get<T>(resolveKey(key));
    },
    getState: <TData = unknown, TError = Error>(key: EndpointDescriptor<unknown> | ServerStateKey) => {
      return runtime.cache.getState<TData, TError>(resolveKey(key));
    },
    set: <T,>(key: EndpointDescriptor<unknown> | ServerStateKey, dataOrUpdater: QueryCacheUpdater<T>): void => {
      const resolvedKey = resolveKey(key);
      runtime.cache.set<T>(resolvedKey, toQueryUpdater(dataOrUpdater));
      emitCacheEvent('cache/set', {
        queryKey: resolvedKey,
        dataOrUpdater: dataOrUpdater as ServerStateUpdater<unknown>,
        source: getBroadcastSource(runtime),
      } satisfies CacheSetEvent);
    },
    cancel: (key: EndpointDescriptor<unknown> | ServerStateKey): Promise<void> => {
      return runtime.cache.cancel(resolveKey(key));
    },
    invalidate: (key: EndpointDescriptor<unknown> | ServerStateKey): Promise<void> => {
      const resolvedKey = resolveKey(key);
      const result = runtime.cache.invalidate(resolvedKey);
      emitCacheEvent('cache/invalidate', {
        queryKey: resolvedKey,
        source: getBroadcastSource(runtime),
      } satisfies CacheInvalidateEvent);
      return result;
    },
    invalidateMany: (filters): Promise<void> => {
      if (filters.queryKey === undefined) {
        return Promise.resolve();
      }

      const payload = {
        ...filters,
        queryKey: resolveKey(filters.queryKey),
      };
      const result = runtime.cache.invalidateMany(payload);
      emitCacheEvent('cache/invalidate', {
        ...payload,
        source: getBroadcastSource(runtime),
      } satisfies CacheInvalidateEvent);
      return result;
    },
    remove: (key: EndpointDescriptor<unknown> | ServerStateKey): void => {
      const resolvedKey = resolveKey(key);
      runtime.cache.remove(resolvedKey);
      emitCacheEvent('cache/remove', {
        queryKey: resolvedKey,
        source: getBroadcastSource(runtime),
      } satisfies CacheRemoveEvent);
    },
  };
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-create-query-cache
