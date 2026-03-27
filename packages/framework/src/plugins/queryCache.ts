// @cpt-FEATURE:implement-endpoint-descriptors:p2
// @cpt-dod:cpt-hai3-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-flux-escape-hatch:p2
// @cpt-algo:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2

/**
 * QueryCache Plugin - QueryClient lifecycle management
 *
 * Framework Layer: L2
 *
 * Owns the QueryClient lifecycle: creation, cache invalidation via Flux events,
 * cache clearing on mock toggle, and cleanup on destroy.
 * Zero React imports — this plugin is headless.
 */

import { QueryClient } from '@tanstack/query-core';
import { eventBus } from '@hai3/state';
import type { HAI3Plugin } from '../types';
import { MockEvents } from '../effects/mockEffects';

// ============================================================================
// Module Augmentation for Type-Safe Cache Events
// ============================================================================

declare module '@hai3/state' {
  interface EventPayloadMap {
    'cache/invalidate': CacheInvalidatePayload;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Payload for cache invalidation events emitted by Flux effects.
 * Consumers dispatch these via eventBus.emit('cache/invalidate', { queryKey }).
 */
interface CacheInvalidatePayload {
  queryKey: readonly unknown[];
}

/**
 * QueryCache plugin configuration.
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
// @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mock-cache-clear
// @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-flux-cache-invalidate
// @cpt-begin:cpt-hai3-flow-request-lifecycle-flux-escape-hatch:p2:inst-invalidate-after-flux
/**
 * Initialize cache event listeners and return a cleanup function.
 *
 * Subscribes to:
 * - MockEvents.Toggle → clears the entire cache (mock data is structurally
 *   different from real API data; stale mock responses must not survive the toggle)
 * - 'cache/invalidate' → invalidates specific query keys (L2 Flux effects use
 *   this as an escape hatch when they know server state has changed)
 */
function initCacheEffects(queryClient: QueryClient): () => void {
  const mockToggleSub = eventBus.on(MockEvents.Toggle, () => {
    queryClient.clear();
  });

  const invalidateSub = eventBus.on('cache/invalidate', (payload) => {
    queryClient.invalidateQueries({ queryKey: payload.queryKey });
  });

  return () => {
    mockToggleSub.unsubscribe();
    invalidateSub.unsubscribe();
  };
}
// @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mock-cache-clear
// @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-flux-cache-invalidate
// @cpt-end:cpt-hai3-flow-request-lifecycle-flux-escape-hatch:p2:inst-invalidate-after-flux
// @cpt-end:implement-endpoint-descriptors:p2:inst-1

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * QueryCache plugin factory.
 *
 * Creates and manages a QueryClient with configurable defaults.
 * Integrates with the HAI3 event bus to clear/invalidate cache entries
 * driven by mock mode changes and Flux effects.
 *
 * Exposed as `app.queryClient` for HAI3Provider and non-React access.
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
 * // Access QueryClient directly (useful in tests or SSR)
 * app.queryClient.getQueryData(['users']);
 *
 * // Invalidate from a Flux effect
 * eventBus.emit('cache/invalidate', { queryKey: ['users'] });
 * ```
 */
// @cpt-begin:implement-endpoint-descriptors:p2:inst-2
// @cpt-begin:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2:inst-create-in-plugin
// @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
// @cpt-begin:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-plugin-factory
export function queryCache(config?: QueryCacheConfig): HAI3Plugin {
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

  // Closure-scoped so each plugin instance owns its own cleanup reference.
  // Module-level would cause the second instance to overwrite the first's
  // cleanup, leading to subscription leaks on destroy.
  let cleanup: (() => void) | null = null;

  return {
    name: 'queryCache',

    provides: {
      registries: { queryClient },
    },

    onInit() {
      cleanup = initCacheEffects(queryClient);
    },

    onDestroy() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      queryClient.clear();
    },
  };
}
// @cpt-end:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2:inst-create-in-plugin
// @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
// @cpt-end:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-plugin-factory
// @cpt-end:implement-endpoint-descriptors:p2:inst-2
