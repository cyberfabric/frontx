/**
 * Tests for queryCache() plugin lifecycle — Phase 5 (implement-endpoint-descriptors)
 *
 * Covers:
 *   - Plugin shape: name and shared QueryClient lifecycle
 *   - Runtime default options (staleTime, gcTime, retry, refetchOnWindowFocus)
 *   - Custom config overrides defaults
 *   - onInit subscribes to MockEvents.Toggle and cache/invalidate events
 *   - onDestroy clears the runtime and unsubscribes from events
 *   - MockEvents.Toggle clears the cache
 *   - cache/invalidate marks specific query keys stale
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 *
 * @cpt-FEATURE:implement-endpoint-descriptors:p2
 * @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
 * @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
 * @cpt-flow:cpt-frontx-flow-request-lifecycle-flux-escape-hatch:p2
 * @cpt-algo:cpt-frontx-algo-request-lifecycle-query-client-defaults:p2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import {
  BaseApiService,
  getSharedFetchCache,
  resetSharedFetchCache,
  RestEndpointProtocol,
  RestProtocol,
  type ApiRequestContext,
  type ApiResponseContext,
} from '@cyberfabric/api';
import { createHAI3 } from '../src/createHAI3';
import { queryCache, queryCacheShared } from '../src/plugins/queryCache';
import { resetSharedQueryClient } from '../src/testing';
import { eventBus, resetStore } from '@cyberfabric/state';
import { MockEvents } from '../src/effects/mockEffects';
import type { HAI3App, HAI3Plugin } from '../src/types';

const SHARED_QUERY_CLIENT_SYMBOL = Symbol.for('hai3:query-cache:shared-client');
const SHARED_QUERY_CLIENT_RETAINERS_SYMBOL = Symbol.for('hai3:query-cache:shared-client-retainers');
const QUERY_CLIENT_BROADCAST_TARGET = Symbol.for('hai3:query-cache:broadcast-target');
const APP_QUERY_CLIENT_SYMBOL = Symbol.for('hai3:query-cache:app-client');
const APP_QUERY_CLIENT_RESOLVER_SYMBOL = Symbol.for('hai3:query-cache:app-client-resolver');
const APP_QUERY_CLIENT_ACTIVATOR_SYMBOL = Symbol.for('hai3:query-cache:app-client-activator');

type SharedQueryClientHost = typeof globalThis & {
  [SHARED_QUERY_CLIENT_SYMBOL]?: QueryClient;
  [SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]?: number;
};

type QueryClientWithMetadata = QueryClient & {
  [QUERY_CLIENT_BROADCAST_TARGET]?: string;
};

type QueryClientApp = HAI3App & {
  [APP_QUERY_CLIENT_SYMBOL]?: QueryClient;
  [APP_QUERY_CLIENT_RESOLVER_SYMBOL]?: () => QueryClient | undefined;
  [APP_QUERY_CLIENT_ACTIVATOR_SYMBOL]?: () => QueryClient | undefined;
};

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Minimal stub for the HAI3App parameter consumed by onInit/onDestroy.
 * queryCache's lifecycle hooks don't read app properties — they only subscribe
 * to the event bus, so a cast is safe here.
 */
function stubApp() {
  return {} as HAI3App;
}

/** Mock toggle / destroy clear the cache after await cancelQueries(); flush before asserting. */
async function flushQueryCacheClear(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

class SharedFetchCountPlugin {
  calls = 0;

  destroy(): void {
    return;
  }

  async onRequest(context: ApiRequestContext): Promise<ApiRequestContext> {
    this.calls += 1;
    return context;
  }
}

class SharedFetchResponderPlugin {
  constructor(private readonly counter: SharedFetchCountPlugin) {}

  destroy(): void {
    return;
  }

  async onRequest(): Promise<{ shortCircuit: ApiResponseContext }> {
    return {
      shortCircuit: {
        status: 200,
        headers: {},
        data: {
          calls: this.counter.calls,
        },
      },
    };
  }
}

class SharedFetchDescriptorService extends BaseApiService {
  constructor(counter: SharedFetchCountPlugin) {
    const rest = new RestProtocol();
    const endpoints = new RestEndpointProtocol(rest);
    super({ baseURL: '/api/query-cache' }, rest, endpoints);

    rest.plugins.add(counter);
    rest.plugins.add(new SharedFetchResponderPlugin(counter));
  }

  readonly entity = this.protocol(RestEndpointProtocol).query<{ calls: number }>('/entity/42');
}

function getQueryClient(plugin: HAI3Plugin): QueryClient {
  void plugin;
  const queryClient = (globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL];
  if (!queryClient) {
    throw new Error('expected shared query client');
  }

  return queryClient;
}

function getBroadcastTarget(queryClient: QueryClient): string {
  const broadcastTarget = (queryClient as QueryClientWithMetadata)[QUERY_CLIENT_BROADCAST_TARGET];
  if (!broadcastTarget) {
    throw new Error('expected query client broadcast target');
  }

  return broadcastTarget;
}

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  resetStore();
  resetSharedFetchCache();
  resetSharedQueryClient();
});

afterEach(() => {
  // Clear listeners accumulated by tested plugins so they don't bleed across tests.
  eventBus.clearAll();
  resetSharedFetchCache();
  resetSharedQueryClient();
  resetStore();
});

// ============================================================================
// Plugin shape
// ============================================================================

describe('queryCache() — plugin shape', () => {
  it('returns an object with name "queryCache"', () => {
    const plugin: HAI3Plugin = queryCache();
    expect(plugin.name).toBe('queryCache');
  });

  it('does not retain the shared QueryClient until onInit', () => {
    queryCache();
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL] ?? 0).toBe(0);
  });

  it('onDestroy without onInit does not retain the shared QueryClient', () => {
    const plugin = queryCache();
    plugin.onDestroy!(stubApp());
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL] ?? 0).toBe(0);
  });

  it('creates a shared QueryClient on onInit', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    expect(getQueryClient(plugin)).toBeInstanceOf(QueryClient);
  });

  it('exposes a broadcast target token for local cache event fan-out', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());

    expect(getBroadcastTarget(getQueryClient(plugin))).toMatch(/^query-cache-/);
  });

  it('assigns a fresh broadcast target after the shared client is reset', () => {
    const firstPlugin = queryCache();
    firstPlugin.onInit!(stubApp());
    const firstTarget = getBroadcastTarget(getQueryClient(firstPlugin));

    resetSharedQueryClient();

    const secondPlugin = queryCache();
    secondPlugin.onInit!(stubApp());
    const secondTarget = getBroadcastTarget(getQueryClient(secondPlugin));

    expect(firstTarget).not.toBe(secondTarget);
  });

  it('has onInit and onDestroy lifecycle hooks', () => {
    const plugin = queryCache();
    expect(typeof plugin.onInit).toBe('function');
    expect(typeof plugin.onDestroy).toBe('function');
  });

  it('queryCacheShared() joins the shared QueryClient', () => {
    const hostPlugin = queryCache();
    const sharedPlugin: HAI3Plugin = queryCacheShared();

    expect(sharedPlugin.name).toBe('queryCacheShared');

    hostPlugin.onInit?.(stubApp());
    sharedPlugin.onInit?.(stubApp());

    expect(getQueryClient(sharedPlugin)).toBe(getQueryClient(hostPlugin));
    expect(getBroadcastTarget(getQueryClient(sharedPlugin))).toBe(
      getBroadcastTarget(getQueryClient(hostPlugin))
    );

    sharedPlugin.onDestroy?.(stubApp());
    hostPlugin.onDestroy?.(stubApp());
  });

  it('queryCacheShared() joins a host QueryClient created with custom config', () => {
    const hostPlugin = queryCache({ staleTime: 60_000 });
    const sharedPlugin: HAI3Plugin = queryCacheShared();

    hostPlugin.onInit?.(stubApp());
    sharedPlugin.onInit?.(stubApp());

    expect(getQueryClient(sharedPlugin)).toBe(getQueryClient(hostPlugin));
    expect(getQueryClient(sharedPlugin).getDefaultOptions().queries?.staleTime).toBe(60_000);

    sharedPlugin.onDestroy?.(stubApp());
    hostPlugin.onDestroy?.(stubApp());
  });

  it('queryCacheShared() can build before the host runtime and join later', async () => {
    const childApp = createHAI3().use(queryCacheShared()).build() as QueryClientApp;

    expect(childApp[APP_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    expect(childApp[APP_QUERY_CLIENT_RESOLVER_SYMBOL]?.()).toBeUndefined();
    expect(typeof childApp[APP_QUERY_CLIENT_ACTIVATOR_SYMBOL]).toBe('function');

    const hostApp = createHAI3().use(queryCache()).build() as QueryClientApp;
    const sharedClient = childApp[APP_QUERY_CLIENT_ACTIVATOR_SYMBOL]?.();

    expect(sharedClient).toBe(hostApp[APP_QUERY_CLIENT_SYMBOL]);
    expect(childApp[APP_QUERY_CLIENT_SYMBOL]).toBe(hostApp[APP_QUERY_CLIENT_SYMBOL]);
    expect(childApp[APP_QUERY_CLIENT_RESOLVER_SYMBOL]?.()).toBe(hostApp[APP_QUERY_CLIENT_SYMBOL]);

    childApp.destroy();
    hostApp.destroy();
    await flushQueryCacheClear();
  });

  it('reuses the same QueryClient across host plugins with matching config', () => {
    const hostPlugin = queryCache();
    const siblingHostPlugin = queryCache();

    siblingHostPlugin.onInit?.(stubApp());
    hostPlugin.onInit?.(stubApp());

    expect(getQueryClient(siblingHostPlugin)).toBe(getQueryClient(hostPlugin));

    siblingHostPlugin.onDestroy?.(stubApp());
    hostPlugin.onDestroy?.(stubApp());
  });

  it('rejects conflicting queryCache() configs once the shared client exists', () => {
    const hostPlugin = queryCache({ staleTime: 60_000 });
    hostPlugin.onInit?.(stubApp());

    const conflicting = queryCache({ staleTime: 30_000 });
    expect(() => conflicting.onInit?.(stubApp())).toThrow(
      '[HAI3] queryCache() received a config that conflicts with the existing shared QueryClient.'
    );

    hostPlugin.onDestroy?.(stubApp());
  });

  it('builder skips duplicate queryCache() registrations without leaking shared retainers', async () => {
    const firstCache = getSharedFetchCache();
    const app = createHAI3().use(queryCache()).use(queryCache()).build();

    app.destroy();
    await flushQueryCacheClear();

    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    expect(getSharedFetchCache()).not.toBe(firstCache);
  });

  it('builder skips duplicate queryCacheShared() registrations without leaking shared retainers', async () => {
    const firstCache = getSharedFetchCache();
    const app = createHAI3()
      .use(queryCache())
      .use(queryCacheShared())
      .use(queryCacheShared())
      .build();

    app.destroy();
    await flushQueryCacheClear();

    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    expect(getSharedFetchCache()).not.toBe(firstCache);
  });
});

// ============================================================================
// Runtime default options
// ============================================================================

describe('queryCache() — runtime default options', () => {
  it('creates runtime with staleTime 30_000 by default', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it('creates runtime with gcTime 300_000 by default', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(300_000);
  });

  it('creates runtime with retry 0 by default', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(0);
  });

  it('creates runtime with refetchOnWindowFocus true by default', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
  });
});

// ============================================================================
// Custom config overrides
// ============================================================================

describe('queryCache(config) — custom config overrides', () => {
  it('custom staleTime overrides default', () => {
    const plugin = queryCache({ staleTime: 60_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it('custom gcTime overrides default', () => {
    const plugin = queryCache({ gcTime: 600_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    expect(client.getDefaultOptions().queries?.gcTime).toBe(600_000);
  });

  it('refetchOnWindowFocus: false overrides default', () => {
    const plugin = queryCache({ refetchOnWindowFocus: false });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('partial config leaves unspecified options at their defaults', () => {
    const plugin = queryCache({ staleTime: 0 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(0);
    expect(defaults.queries?.gcTime).toBe(300_000);   // unchanged default
    expect(defaults.queries?.retry).toBe(0);           // unchanged default
  });
});

// ============================================================================
// onInit — event subscriptions
// ============================================================================

describe('queryCache() — onInit subscribes to events', () => {
  it('onInit does not throw', () => {
    const plugin = queryCache();
    expect(() => plugin.onInit!(stubApp())).not.toThrow();
  });

  it('clearing cache on MockEvents.Toggle does not throw when no data is cached', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());

    // Fire toggle — should not throw even with an empty cache
    expect(() =>
      eventBus.emit(MockEvents.Toggle, { enabled: true })
    ).not.toThrow();
  });

  it('firing cache/invalidate does not throw when no data is cached', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());

    expect(() =>
      eventBus.emit('cache/invalidate', { queryKey: ['someKey'] })
    ).not.toThrow();
  });

  it('onInit creates the shared fetch cache', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());

    expect(getSharedFetchCache()).toBeDefined();
  });
});

// ============================================================================
// MockEvents.Toggle — clears cache
// ============================================================================

describe('queryCache() — MockEvents.Toggle clears the cache', () => {
  it('clears all cached data when MockEvents.Toggle fires', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    // Seed data into the runtime cache
    client.setQueryData(['users'], [{ id: 1 }]);
    client.setQueryData(['profile'], { name: 'Alice' });

    expect(client.getQueryData(['users'])).toBeDefined();
    expect(client.getQueryData(['profile'])).toBeDefined();

    // Fire the toggle event — should wipe the cache
    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();

    expect(client.getQueryData(['users'])).toBeUndefined();
    expect(client.getQueryData(['profile'])).toBeUndefined();
  });

  it('clears cache on toggle regardless of enabled flag value', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    client.setQueryData(['key'], 'value');

    // Toggle to false should also clear (mock data vs real data must not mix)
    eventBus.emit(MockEvents.Toggle, { enabled: false });
    await flushQueryCacheClear();

    expect(client.getQueryData(['key'])).toBeUndefined();
  });

  it('clears the shared fetch cache on mock toggle', async () => {
    const plugin = queryCache();
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('first');

    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    plugin.onInit!(stubApp());

    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();

    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('waits for cancellation before clearing runtime and shared fetch cache', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const deferred = createDeferred();
    const sharedFetchCache = getSharedFetchCache();
    const clearSpy = vi.spyOn(client, 'clear');
    const sharedClearSpy = vi.spyOn(sharedFetchCache, 'clear');

    const cancelQueriesSpy = vi.spyOn(client, 'cancelQueries').mockImplementation(() => deferred.promise);

    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();

    expect(cancelQueriesSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).not.toHaveBeenCalled();
    expect(sharedClearSpy).not.toHaveBeenCalled();

    deferred.resolve();
    await flushQueryCacheClear();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(sharedClearSpy).toHaveBeenCalledTimes(1);
  });

  it('still clears runtime and shared fetch cache when cancellation fails', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('first');
    const clearSpy = vi.spyOn(client, 'clear');
    const sharedClearSpy = vi.spyOn(sharedFetchCache, 'clear');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cancelQueriesSpy = vi.spyOn(client, 'cancelQueries').mockRejectedValue(new Error('cancel failed'));
    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();

    expect(cancelQueriesSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(sharedClearSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[HAI3] Failed to clear query cache after mock toggle',
      expect.any(Error)
    );

    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// cache/invalidate event — marks queries stale
// ============================================================================

describe('queryCache() — cache/invalidate invalidates query keys', () => {
  it('marks the specified query key as invalidated', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    // Seed a cache entry — uses gcTime > 0 so the entry survives without an observer
    client.setQueryData(['entity', 42], { value: 'original' });

    // Emit invalidation event
    eventBus.emit('cache/invalidate', { queryKey: ['entity', 42] });

    // After invalidation the query is marked stale
    const state = client.getQueryState(['entity', 42]);
    expect(state?.isInvalidated).toBe(true);
  });

  it('does not affect unrelated cache keys', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    client.setQueryData(['target'], 'will be invalidated');
    client.setQueryData(['unrelated'], 'should stay fresh');

    eventBus.emit('cache/invalidate', { queryKey: ['target'] });

    const targetState = client.getQueryState(['target']);
    const unrelatedState = client.getQueryState(['unrelated']);

    expect(targetState?.isInvalidated).toBe(true);
    // unrelated key was not invalidated
    expect(unrelatedState?.isInvalidated).toBeFalsy();
  });

  it('invalidates a RestEndpointProtocol shared fetch entry for the same query key', async () => {
    const plugin = queryCache();
    const counter = new SharedFetchCountPlugin();
    const service = new SharedFetchDescriptorService(counter);

    plugin.onInit!(stubApp());

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 1 });

    eventBus.emit('cache/invalidate', { queryKey: service.entity.key });

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 2 });
    expect(counter.calls).toBe(2);
  });

  it('invalidates descendant shared fetch cache entries when exact is false', async () => {
    const plugin = queryCache();
    const sharedFetchCache = getSharedFetchCache();
    const parentFetcher = vi.fn().mockResolvedValueOnce('parent-first').mockResolvedValueOnce('parent-second');
    const childFetcher = vi.fn().mockResolvedValueOnce('child-first').mockResolvedValueOnce('child-second');

    await sharedFetchCache.getOrFetch(['entity'], parentFetcher, { staleTime: 1_000 });
    await sharedFetchCache.getOrFetch(['entity', { page: 1 }], childFetcher, {
      staleTime: 1_000,
    });
    plugin.onInit!(stubApp());

    eventBus.emit('cache/invalidate', { queryKey: ['entity'], exact: false });

    await sharedFetchCache.getOrFetch(['entity'], parentFetcher, { staleTime: 1_000 });
    await sharedFetchCache.getOrFetch(['entity', { page: 1 }], childFetcher, {
      staleTime: 1_000,
    });

    expect(parentFetcher).toHaveBeenCalledTimes(2);
    expect(childFetcher).toHaveBeenCalledTimes(2);
  });

  it('ignores malformed cache/invalidate events that omit queryKey', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    client.setQueryData(['target'], 'target');
    client.setQueryData(['unrelated'], 'unrelated');
    await sharedFetchCache.getOrFetch(['target'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/invalidate', {});

    expect(client.getQueryState(['target'])?.isInvalidated).toBeFalsy();
    expect(client.getQueryState(['unrelated'])?.isInvalidated).toBeFalsy();

    await sharedFetchCache.getOrFetch(['target'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('ignores broad cache/invalidate events with an empty queryKey', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    client.setQueryData(['target'], 'target');
    client.setQueryData(['unrelated'], 'unrelated');
    await sharedFetchCache.getOrFetch(['target'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/invalidate', {
      queryKey: [],
      exact: false,
    });

    expect(client.getQueryState(['target'])?.isInvalidated).toBeFalsy();
    expect(client.getQueryState(['unrelated'])?.isInvalidated).toBeFalsy();

    await sharedFetchCache.getOrFetch(['target'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidates the same key in two separate plugin runtimes', () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);

    clientA.setQueryData(['shared'], 'a');
    clientB.setQueryData(['shared'], 'b');

    eventBus.emit('cache/invalidate', { queryKey: ['shared'] });

    expect(clientA.getQueryState(['shared'])?.isInvalidated).toBe(true);
    expect(clientB.getQueryState(['shared'])?.isInvalidated).toBe(true);
  });
});

// ============================================================================
// cache/set and cache/remove events — sync sibling runtimes
// ============================================================================

describe('queryCache() — cache/set and cache/remove synchronize runtimes', () => {
  it('cache/set updates the shared QueryClient once and invalidates shared fetch cache', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    clientA.setQueryData(['entity', 'shared'], { value: 'seed' });
    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });

    eventBus.emit('cache/set', {
      queryKey: ['entity', 'shared'],
      dataOrUpdater: { value: 'optimistic' },
    });

    expect(clientA.getQueryData(['entity', 'shared'])).toEqual({ value: 'optimistic' });
    expect(clientB.getQueryData(['entity', 'shared'])).toEqual({ value: 'optimistic' });

    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('cache/set invalidates a RestEndpointProtocol shared fetch entry for the same query key', async () => {
    const plugin = queryCache();
    const counter = new SharedFetchCountPlugin();
    const service = new SharedFetchDescriptorService(counter);

    plugin.onInit!(stubApp());

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 1 });

    eventBus.emit('cache/set', {
      queryKey: service.entity.key,
      dataOrUpdater: { optimistic: true },
    });

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 2 });
    expect(counter.calls).toBe(2);
  });

  it('ignores malformed cache/set events without a queryKey', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    clientA.setQueryData(['entity', 'shared'], { value: 'seed' });
    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/set', {
      dataOrUpdater: { value: 'optimistic' },
    });

    expect(clientA.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });
    expect(clientB.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });

    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed cache/set events without dataOrUpdater', () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);

    clientA.setQueryData(['entity', 'shared'], { value: 'seed' });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/set', {
      queryKey: ['entity', 'shared'],
    });

    expect(clientA.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });
    expect(clientB.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });
  });

  it('ignores broad cache/set events with an empty queryKey', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    clientA.setQueryData(['entity', 'shared'], { value: 'seed' });
    clientA.setQueryData(['entity', 'other'], { value: 'other-seed' });
    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/set', {
      queryKey: [],
      dataOrUpdater: { value: 'optimistic' },
    });

    expect(clientA.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });
    expect(clientB.getQueryData(['entity', 'shared'])).toEqual({ value: 'seed' });
    expect(clientA.getQueryData(['entity', 'other'])).toEqual({ value: 'other-seed' });
    expect(clientB.getQueryData(['entity', 'other'])).toEqual({ value: 'other-seed' });

    await sharedFetchCache.getOrFetch(['entity', 'shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cache/remove evicts the shared QueryClient and invalidates shared fetch cache', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    clientA.setQueryData(['entity', 'remove'], { value: 'seed' });
    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });

    eventBus.emit('cache/remove', {
      queryKey: ['entity', 'remove'],
    });

    expect(clientA.getQueryData(['entity', 'remove'])).toBeUndefined();
    expect(clientB.getQueryData(['entity', 'remove'])).toBeUndefined();

    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('cache/remove invalidates a RestEndpointProtocol shared fetch entry for the same query key', async () => {
    const plugin = queryCache();
    const counter = new SharedFetchCountPlugin();
    const service = new SharedFetchDescriptorService(counter);

    plugin.onInit!(stubApp());

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 1 });

    eventBus.emit('cache/remove', { queryKey: service.entity.key });

    await expect(service.entity.fetch({ staleTime: 1_000 })).resolves.toEqual({ calls: 2 });
    expect(counter.calls).toBe(2);
  });

  it('ignores malformed cache/remove events without a queryKey', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    clientA.setQueryData(['entity', 'remove'], { value: 'seed' });
    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/remove', {});

    expect(clientA.getQueryData(['entity', 'remove'])).toEqual({ value: 'seed' });
    expect(clientB.getQueryData(['entity', 'remove'])).toEqual({ value: 'seed' });

    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('ignores broad cache/remove events with an empty queryKey', async () => {
    const pluginA = queryCache({ gcTime: 300_000 });
    const pluginB = queryCache({ gcTime: 300_000 });
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('cached');

    clientA.setQueryData(['entity', 'remove'], { value: 'seed' });
    clientA.setQueryData(['entity', 'keep'], { value: 'keep-seed' });
    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });

    (eventBus.emit as (eventType: string, payload: unknown) => void)('cache/remove', {
      queryKey: [],
    });

    expect(clientA.getQueryData(['entity', 'remove'])).toEqual({ value: 'seed' });
    expect(clientB.getQueryData(['entity', 'remove'])).toEqual({ value: 'seed' });
    expect(clientA.getQueryData(['entity', 'keep'])).toEqual({ value: 'keep-seed' });
    expect(clientB.getQueryData(['entity', 'keep'])).toEqual({ value: 'keep-seed' });

    await sharedFetchCache.getOrFetch(['entity', 'remove'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// onDestroy — cleanup
// ============================================================================

describe('queryCache() — onDestroy cleanup', () => {
  it('onDestroy does not throw', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    expect(() => plugin.onDestroy!(stubApp())).not.toThrow();
  });

  it('clears cached data on destroy', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    client.setQueryData(['key'], 'value');

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    expect(client.getQueryData(['key'])).toBeUndefined();
  });

  it('resets the shared fetch cache after the last plugin runtime is destroyed', async () => {
    const plugin = queryCache();
    const firstCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    plugin.onInit!(stubApp());
    await firstCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondCache = getSharedFetchCache();
    await secondCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    expect(secondCache).not.toBe(firstCache);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('clears retained shared fetch cache entries on destroy', async () => {
    const plugin = queryCache();
    const sharedFetchCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    plugin.onInit!(stubApp());
    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    await sharedFetchCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('after onDestroy, MockEvents.Toggle no longer clears cache (unsubscribed)', () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    plugin.onDestroy!(stubApp());

    // Seed data after destroy — the event listener is gone
    client.setQueryData(['key'], 'fresh');

    eventBus.emit(MockEvents.Toggle, { enabled: true });

    // The listener was removed on destroy, so data remains
    expect(client.getQueryData(['key'])).toBe('fresh');
  });

  it('after onDestroy, cache/invalidate no longer invalidates queries (unsubscribed)', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);

    plugin.onDestroy!(stubApp());

    client.setQueryData(['key'], 'fresh');

    eventBus.emit('cache/invalidate', { queryKey: ['key'] });

    const state = client.getQueryState(['key']);
    // Listener was removed — query is not invalidated
    expect(state?.isInvalidated).toBeFalsy();
  });

  it('calling onDestroy multiple times does not throw', () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    plugin.onDestroy!(stubApp());
    expect(() => plugin.onDestroy!(stubApp())).not.toThrow();
  });

  it('two plugin instances have independent cleanup — destroying one does not break the other', async () => {
    const pluginA = queryCache();
    const pluginB = queryCache();
    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());
    const clientA = getQueryClient(pluginA);
    const clientB = getQueryClient(pluginB);

    // Seed both caches
    clientA.setQueryData(['a'], 'dataA');
    clientB.setQueryData(['b'], 'dataB');

    // Destroy plugin A — should NOT affect plugin B's listeners
    pluginA.onDestroy!(stubApp());
    await flushQueryCacheClear();

    // Plugin B's cache/invalidate listener should still work
    clientB.setQueryData(['b'], 'dataB-fresh');
    eventBus.emit('cache/invalidate', { queryKey: ['b'] });

    const stateB = clientB.getQueryState(['b']);
    expect(stateB?.isInvalidated).toBe(true);

    // Shared client state stays alive until the last retainer is destroyed.
    expect(clientA.getQueryData(['a'])).toBe('dataA');

    // Plugin B's MockEvents.Toggle listener should still work
    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();
    expect(clientB.getQueryData(['b'])).toBeUndefined();

    // Clean up plugin B
    pluginB.onDestroy!(stubApp());
  });

  it('does not reset the shared fetch cache while another plugin runtime is still active', async () => {
    const pluginA = queryCache();
    const pluginB = queryCache();
    const fetcher = vi.fn().mockResolvedValue('shared');

    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());

    const firstCache = getSharedFetchCache();
    await firstCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    pluginA.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondCache = getSharedFetchCache();
    await secondCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    expect(secondCache).toBe(firstCache);
    expect(fetcher).toHaveBeenCalledTimes(1);

    pluginB.onDestroy!(stubApp());
  });

  it('waits for cancellation before clearing runtime and releasing shared fetch cache', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const deferred = createDeferred();
    const firstCache = getSharedFetchCache();
    const clearSpy = vi.spyOn(client, 'clear');

    const cancelQueriesSpy = vi.spyOn(client, 'cancelQueries').mockImplementation(() => deferred.promise);

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    expect(cancelQueriesSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).not.toHaveBeenCalled();
    expect(getSharedFetchCache()).toBe(firstCache);

    deferred.resolve();
    await flushQueryCacheClear();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(getSharedFetchCache()).not.toBe(firstCache);
  });

  it('reuses the same shared QueryClient if a new host plugin starts before destroy teardown settles', async () => {
    const firstPlugin = queryCache();
    firstPlugin.onInit!(stubApp());
    const firstClient = getQueryClient(firstPlugin);
    const deferred = createDeferred();
    const clearSpy = vi.spyOn(firstClient, 'clear');

    vi.spyOn(firstClient, 'cancelQueries').mockImplementation(() => deferred.promise);

    firstPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBe(firstClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]).toBe(0);

    const secondPlugin = queryCache();
    secondPlugin.onInit!(stubApp());
    const secondClient = getQueryClient(secondPlugin);

    expect(secondClient).toBe(firstClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBe(firstClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]).toBe(1);

    deferred.resolve();
    await flushQueryCacheClear();

    expect(clearSpy).not.toHaveBeenCalled();
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBe(firstClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]).toBe(1);

    secondPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();
  });

  it('releases the original shared fetch cache retain when host teardown is superseded', async () => {
    const firstPlugin = queryCache();
    firstPlugin.onInit!(stubApp());
    const firstClient = getQueryClient(firstPlugin);
    const firstCache = getSharedFetchCache();
    const deferred = createDeferred();
    const fetcher = vi.fn().mockResolvedValue('shared');

    vi.spyOn(firstClient, 'cancelQueries')
      .mockImplementationOnce(() => deferred.promise)
      .mockResolvedValue(undefined);

    await firstCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    firstPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondPlugin = queryCache();
    secondPlugin.onInit!(stubApp());

    deferred.resolve();
    await flushQueryCacheClear();

    secondPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondCache = getSharedFetchCache();
    await secondCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    expect(secondCache).not.toBe(firstCache);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lets queryCacheShared() join the pending shared runtime before destroy teardown settles', async () => {
    const hostPlugin = queryCache();
    const sharedPlugin = queryCacheShared();
    hostPlugin.onInit!(stubApp());
    const hostClient = getQueryClient(hostPlugin);
    const deferred = createDeferred();
    const clearSpy = vi.spyOn(hostClient, 'clear');

    vi.spyOn(hostClient, 'cancelQueries').mockImplementation(() => deferred.promise);

    hostPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    sharedPlugin.onInit!(stubApp());

    expect(getQueryClient(sharedPlugin)).toBe(hostClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBe(hostClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]).toBe(1);

    deferred.resolve();
    await flushQueryCacheClear();

    expect(clearSpy).not.toHaveBeenCalled();
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBe(hostClient);
    expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_RETAINERS_SYMBOL]).toBe(1);

    sharedPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();
  });

  it('releases the original shared fetch cache retain when shared teardown is superseded', async () => {
    const hostPlugin = queryCache();
    const firstSharedPlugin = queryCacheShared();
    hostPlugin.onInit!(stubApp());
    firstSharedPlugin.onInit!(stubApp());
    const hostClient = getQueryClient(hostPlugin);
    const firstCache = getSharedFetchCache();
    const deferred = createDeferred();
    const fetcher = vi.fn().mockResolvedValue('shared');

    vi.spyOn(hostClient, 'cancelQueries')
      .mockImplementationOnce(() => deferred.promise)
      .mockResolvedValue(undefined);

    await firstCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    hostPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    firstSharedPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondSharedPlugin = queryCacheShared();
    secondSharedPlugin.onInit!(stubApp());

    deferred.resolve();
    await flushQueryCacheClear();

    secondSharedPlugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    const secondCache = getSharedFetchCache();
    await secondCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    expect(secondCache).not.toBe(firstCache);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('still releases the shared fetch cache when runtime cancellation fails on destroy', async () => {
    const plugin = queryCache();
    plugin.onInit!(stubApp());
    const client = getQueryClient(plugin);
    const firstCache = getSharedFetchCache();
    const fetcher = vi.fn().mockResolvedValue('shared');
    const clearSpy = vi.spyOn(client, 'clear');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cancelQueriesSpy = vi.spyOn(client, 'cancelQueries').mockRejectedValue(new Error('cancel failed'));
    client.setQueryData(['stale'], 'value');
    await firstCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    expect(cancelQueriesSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[HAI3] Failed to destroy query cache runtime',
      expect.any(Error)
    );
    expect(client.getQueryData(['stale'])).toBeUndefined();

    const secondCache = getSharedFetchCache();
    await secondCache.getOrFetch(['shared'], fetcher, { staleTime: 1_000 });

    expect(secondCache).not.toBe(firstCache);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
