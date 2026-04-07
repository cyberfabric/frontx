// @cpt-FEATURE:implement-endpoint-descriptors:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-flux-escape-hatch:p2
// @cpt-algo:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2

/**
 * QueryCache Plugin - server-state runtime lifecycle management
 *
 * Framework Layer: L2
 *
 * Owns the server-state runtime lifecycle: creation, cache invalidation via Flux
 * events, cache clearing on mock toggle, and cleanup on destroy.
 * Zero React imports — this plugin is headless.
 */

import {
  peekSharedFetchCache,
  releaseSharedFetchCache,
  retainSharedFetchCache,
} from '@cyberfabric/api';
import { eventBus } from '@cyberfabric/state';
import type { HAI3Plugin } from '../types';
import {
  SERVER_STATE_BROADCAST_TARGET,
  type ServerStateInvalidateFilters,
  type ServerStateKey,
  type ServerStateRuntime,
  type ServerStateUpdater,
} from '../serverState';
import { createTanStackServerStateRuntime } from '../serverState/tanstackRuntime';
import { MockEvents } from '../effects/mockEffects';

// ============================================================================
// Module Augmentation for Type-Safe Cache Events
// ============================================================================

declare module '@cyberfabric/state' {
  interface EventPayloadMap {
    'cache/invalidate': CacheInvalidatePayload;
    'cache/set': CacheSetPayload;
    'cache/remove': CacheRemovePayload;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Payload for cache invalidation events emitted by Flux effects.
 * Consumers dispatch these via eventBus.emit('cache/invalidate', { queryKey }).
 */
interface CacheEventBase {
  source?: string;
}

interface CacheInvalidatePayload extends ServerStateInvalidateFilters, CacheEventBase {}

interface CacheSetPayload extends CacheEventBase {
  queryKey: ServerStateKey;
  dataOrUpdater: ServerStateUpdater<unknown>;
}

interface CacheRemovePayload extends CacheEventBase {
  queryKey: ServerStateKey;
}

type SharedFetchCacheInvalidator = {
  invalidate(key: readonly unknown[]): void;
  invalidateMany?: (filters?: { key?: readonly unknown[]; exact?: boolean }) => void;
  clear(): void;
};

type InvalidatePayloadInput = {
  queryKey?: unknown;
  exact?: boolean;
  refetchType?: ServerStateInvalidateFilters['refetchType'];
};

type CacheSetPayloadInput = {
  queryKey?: unknown;
  dataOrUpdater?: unknown;
  source?: unknown;
};

type CacheRemovePayloadInput = {
  queryKey?: unknown;
  source?: unknown;
};

function isNonEmptyServerStateKey(queryKey: unknown): queryKey is ServerStateKey {
  return Array.isArray(queryKey) && queryKey.length > 0;
}

function isLocalBroadcast(
  serverState: ServerStateRuntime,
  payload: unknown
): boolean {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as CacheEventBase;
  return candidate.source === serverState[SERVER_STATE_BROADCAST_TARGET];
}

function invalidateSharedFetchCache(
  cache: SharedFetchCacheInvalidator | undefined,
  filters: ServerStateInvalidateFilters
): void {
  if (!cache) {
    return;
  }

  if (filters.exact === false) {
    cache.invalidateMany?.({
      key: filters.queryKey,
      exact: false,
    });

    // Fall back to a full clear if a stale package boundary exposes only exact invalidation.
    if (!cache.invalidateMany) {
      cache.clear();
    }
    return;
  }

  cache.invalidate(filters.queryKey);
}

function toScopedInvalidateFilters(payload: unknown): ServerStateInvalidateFilters | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as InvalidatePayloadInput;
  if (!isNonEmptyServerStateKey(candidate.queryKey)) {
    return null;
  }

  return {
    queryKey: candidate.queryKey,
    ...(candidate.exact !== undefined ? { exact: candidate.exact } : {}),
    ...(candidate.refetchType !== undefined ? { refetchType: candidate.refetchType } : {}),
  };
}

function toScopedCacheSetPayload(payload: unknown): CacheSetPayload | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as CacheSetPayloadInput;
  if (!isNonEmptyServerStateKey(candidate.queryKey)) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(candidate, 'dataOrUpdater')) {
    return null;
  }

  return {
    queryKey: candidate.queryKey,
    dataOrUpdater: candidate.dataOrUpdater as ServerStateUpdater<unknown>,
    ...(typeof candidate.source === 'string' ? { source: candidate.source } : {}),
  };
}

function toScopedCacheRemovePayload(payload: unknown): CacheRemovePayload | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as CacheRemovePayloadInput;
  if (!isNonEmptyServerStateKey(candidate.queryKey)) {
    return null;
  }

  return {
    queryKey: candidate.queryKey,
    ...(typeof candidate.source === 'string' ? { source: candidate.source } : {}),
  };
}

/**
 * queryCache() plugin configuration.
 */
export interface QueryCacheConfig {
  /**
   * Time in ms before a query is considered stale and eligible for background refetch.
   * @default 30_000
   */
  staleTime?: number;

  /**
   * Time in ms that unused/inactive query cache entries are kept in memory.
   * @default 300_000
   */
  gcTime?: number;

  /**
   * Whether to refetch queries when the window regains focus.
   * @default true
   */
  refetchOnWindowFocus?: boolean;
}

// ============================================================================
// Cache Effects
// ============================================================================

// @cpt-begin:implement-endpoint-descriptors:p2:inst-1
// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mock-cache-clear
// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-flux-cache-invalidate
// @cpt-begin:cpt-frontx-flow-request-lifecycle-flux-escape-hatch:p2:inst-invalidate-after-flux
/**
 * Abort in-flight fetches, then drop all cached query data.
 * Returns a promise so callers can preserve cancel -> clear ordering.
 */
async function cancelQueriesThenClear(serverState: ServerStateRuntime): Promise<void> {
  let cancelError: unknown;

  try {
    await serverState.cache.cancelAll();
  } catch (error: unknown) {
    cancelError = error;
  }

  serverState.cache.clear();

  if (cancelError) {
    throw cancelError;
  }
}

type QueryTeardownCallbacks = {
  onSettled?: () => void;
  onFailure?: () => void;
  onSuccess?: () => void;
};

function runQueryTeardown(
  serverState: ServerStateRuntime,
  callbacks: QueryTeardownCallbacks,
  failureMessage: string
): void {
  void cancelQueriesThenClear(serverState)
    .then(() => {
      callbacks.onSuccess?.();
    })
    .catch((error: unknown) => {
      callbacks.onFailure?.();
      console.error(failureMessage, error);
    })
    .finally(() => {
      callbacks.onSettled?.();
    });
}

/**
 * Initialize cache event listeners and return a cleanup function.
 *
 * Subscribes to:
 * - MockEvents.Toggle → clears the entire cache (mock data is structurally
 *   different from real API data; stale mock responses must not survive the toggle)
 * - 'cache/invalidate' → invalidates specific query keys (L2 Flux effects use
 *   this as an escape hatch when they know server state has changed)
 */
function initCacheEffects(serverState: ServerStateRuntime): () => void {
  retainSharedFetchCache();

  const mockToggleSub = eventBus.on(MockEvents.Toggle, () => {
    runQueryTeardown(
      serverState,
      {
        onSettled: () => {
          peekSharedFetchCache()?.clear();
        },
      },
      '[HAI3] Failed to clear query cache after mock toggle'
    );
  });

  const invalidateSub = eventBus.on('cache/invalidate', (payload: unknown) => {
    const filters = toScopedInvalidateFilters(payload);
    if (!filters) {
      return;
    }

    if (!isLocalBroadcast(serverState, payload)) {
      void serverState.cache.invalidateMany(filters);
    }

    invalidateSharedFetchCache(peekSharedFetchCache(), filters);
  });

  const setSub = eventBus.on('cache/set', (payload: unknown) => {
    const cacheSetPayload = toScopedCacheSetPayload(payload);
    if (!cacheSetPayload) {
      return;
    }

    if (!isLocalBroadcast(serverState, cacheSetPayload)) {
      serverState.cache.set(cacheSetPayload.queryKey, cacheSetPayload.dataOrUpdater);
    }

    peekSharedFetchCache()?.invalidate(cacheSetPayload.queryKey);
  });

  const removeSub = eventBus.on('cache/remove', (payload: unknown) => {
    const cacheRemovePayload = toScopedCacheRemovePayload(payload);
    if (!cacheRemovePayload) {
      return;
    }

    if (!isLocalBroadcast(serverState, cacheRemovePayload)) {
      serverState.cache.remove(cacheRemovePayload.queryKey);
    }

    peekSharedFetchCache()?.invalidate(cacheRemovePayload.queryKey);
  });

  return () => {
    mockToggleSub.unsubscribe();
    invalidateSub.unsubscribe();
    setSub.unsubscribe();
    removeSub.unsubscribe();
  };
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mock-cache-clear
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-flux-cache-invalidate
// @cpt-end:cpt-frontx-flow-request-lifecycle-flux-escape-hatch:p2:inst-invalidate-after-flux
// @cpt-end:implement-endpoint-descriptors:p2:inst-1

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * QueryCache plugin factory.
 *
 * Creates and manages a server-state runtime with configurable defaults.
 * Integrates with the HAI3 event bus to clear/invalidate cache entries
 * driven by mock mode changes and Flux effects.
 *
 * Exposed as `app.serverState` for provider wiring and non-React cache access.
 *
 * @param config - Optional cache configuration
 * @returns QueryCache plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(queryCache({ staleTime: 60_000 }))
 *   .build();
 *
 * // Access the server-state cache directly (useful in tests or SSR)
 * app.serverState?.cache.get(['users']);
 *
 * // Invalidate from a Flux effect
 * eventBus.emit('cache/invalidate', { queryKey: ['users'] });
 * ```
 */
// @cpt-begin:implement-endpoint-descriptors:p2:inst-2
// @cpt-begin:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-create-in-plugin
// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
// @cpt-begin:cpt-frontx-dod-request-lifecycle-query-provider:p2:inst-plugin-factory
export function queryCache(config?: QueryCacheConfig): HAI3Plugin {
  const serverState = createTanStackServerStateRuntime(config);

  // Closure-scoped so each plugin instance owns its own cleanup reference.
  // Module-level would cause the second instance to overwrite the first's
  // cleanup, leading to subscription leaks on destroy.
  let cleanup: (() => void) | null = null;

  return {
    name: 'queryCache',

    provides: {
      registries: { serverState },
    },

    onInit() {
      cleanup = initCacheEffects(serverState);
    },

    onDestroy() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      runQueryTeardown(
        serverState,
        {
          // Always balance init-time retain, even if cancelAll rejects during destroy.
          onSettled: () => {
            releaseSharedFetchCache();
          },
        },
        '[HAI3] Failed to destroy query cache runtime'
      );
    },
  };
}
// @cpt-end:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2:inst-create-in-plugin
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
// @cpt-end:cpt-frontx-dod-request-lifecycle-query-provider:p2:inst-plugin-factory
// @cpt-end:implement-endpoint-descriptors:p2:inst-2
