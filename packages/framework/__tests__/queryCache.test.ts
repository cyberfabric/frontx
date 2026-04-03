/**
 * Tests for queryCache() plugin lifecycle — Phase 5 (implement-endpoint-descriptors)
 *
 * Covers:
 *   - Plugin shape: name, provides.registries.queryClient
 *   - QueryClient default options (staleTime, gcTime, retry, refetchOnWindowFocus)
 *   - Custom config overrides defaults
 *   - onInit subscribes to MockEvents.Toggle and cache/invalidate events
 *   - onDestroy clears QueryClient and unsubscribes from events
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { queryCache } from '../src/plugins/queryCache';
import { eventBus, resetStore } from '@cyberfabric/state';
import { MockEvents } from '../src/effects/mockEffects';
import type { HAI3App, HAI3Plugin } from '../src/types';

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

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  // Clear listeners accumulated by tested plugins so they don't bleed across tests.
  eventBus.clearAll();
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

  it('provides.registries.queryClient is a QueryClient instance', () => {
    const plugin = queryCache();
    const registries = plugin.provides?.registries;

    expect(registries).toBeDefined();
    expect(registries!['queryClient']).toBeInstanceOf(QueryClient);
  });

  it('has onInit and onDestroy lifecycle hooks', () => {
    const plugin = queryCache();
    expect(typeof plugin.onInit).toBe('function');
    expect(typeof plugin.onDestroy).toBe('function');
  });
});

// ============================================================================
// QueryClient default options
// ============================================================================

describe('queryCache() — QueryClient default options', () => {
  it('creates QueryClient with staleTime 30_000 by default', () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it('creates QueryClient with gcTime 300_000 by default', () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(300_000);
  });

  it('creates QueryClient with retry 0 by default', () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(0);
  });

  it('creates QueryClient with refetchOnWindowFocus true by default', () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

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
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it('custom gcTime overrides default', () => {
    const plugin = queryCache({ gcTime: 600_000 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    expect(client.getDefaultOptions().queries?.gcTime).toBe(600_000);
  });

  it('refetchOnWindowFocus: false overrides default', () => {
    const plugin = queryCache({ refetchOnWindowFocus: false });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('partial config leaves unspecified options at their defaults', () => {
    const plugin = queryCache({ staleTime: 0 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;
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
});

// ============================================================================
// MockEvents.Toggle — clears cache
// ============================================================================

describe('queryCache() — MockEvents.Toggle clears the cache', () => {
  it('clears all cached data when MockEvents.Toggle fires', async () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    // Seed data into the QueryClient's cache
    client.setQueryData(['users'], [{ id: 1 }]);
    client.setQueryData(['profile'], { name: 'Alice' });

    expect(client.getQueryData(['users'])).toBeDefined();
    expect(client.getQueryData(['profile'])).toBeDefined();

    // Init to subscribe event listeners
    plugin.onInit!(stubApp());

    // Fire the toggle event — should wipe the cache
    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();

    expect(client.getQueryData(['users'])).toBeUndefined();
    expect(client.getQueryData(['profile'])).toBeUndefined();
  });

  it('clears cache on toggle regardless of enabled flag value', async () => {
    const plugin = queryCache();
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    client.setQueryData(['key'], 'value');
    plugin.onInit!(stubApp());

    // Toggle to false should also clear (mock data vs real data must not mix)
    eventBus.emit(MockEvents.Toggle, { enabled: false });
    await flushQueryCacheClear();

    expect(client.getQueryData(['key'])).toBeUndefined();
  });
});

// ============================================================================
// cache/invalidate event — marks queries stale
// ============================================================================

describe('queryCache() — cache/invalidate invalidates query keys', () => {
  it('marks the specified query key as invalidated', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    // Seed a cache entry — uses gcTime > 0 so the entry survives without an observer
    client.setQueryData(['entity', 42], { value: 'original' });

    plugin.onInit!(stubApp());

    // Emit invalidation event
    eventBus.emit('cache/invalidate', { queryKey: ['entity', 42] });

    // After invalidation the query is marked stale
    const state = client.getQueryState(['entity', 42]);
    expect(state?.isInvalidated).toBe(true);
  });

  it('does not affect unrelated cache keys', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    client.setQueryData(['target'], 'will be invalidated');
    client.setQueryData(['unrelated'], 'should stay fresh');

    plugin.onInit!(stubApp());

    eventBus.emit('cache/invalidate', { queryKey: ['target'] });

    const targetState = client.getQueryState(['target']);
    const unrelatedState = client.getQueryState(['unrelated']);

    expect(targetState?.isInvalidated).toBe(true);
    // unrelated key was not invalidated
    expect(unrelatedState?.isInvalidated).toBeFalsy();
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
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    client.setQueryData(['key'], 'value');
    plugin.onInit!(stubApp());

    plugin.onDestroy!(stubApp());
    await flushQueryCacheClear();

    expect(client.getQueryData(['key'])).toBeUndefined();
  });

  it('after onDestroy, MockEvents.Toggle no longer clears cache (unsubscribed)', () => {
    const plugin = queryCache({ gcTime: 300_000 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    plugin.onInit!(stubApp());
    plugin.onDestroy!(stubApp());

    // Seed data after destroy — the event listener is gone
    client.setQueryData(['key'], 'fresh');

    eventBus.emit(MockEvents.Toggle, { enabled: true });

    // The listener was removed on destroy, so data remains
    expect(client.getQueryData(['key'])).toBe('fresh');
  });

  it('after onDestroy, cache/invalidate no longer invalidates queries (unsubscribed)', async () => {
    const plugin = queryCache({ gcTime: 300_000 });
    const client = plugin.provides!.registries!['queryClient'] as QueryClient;

    plugin.onInit!(stubApp());
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
    const clientA = (pluginA.provides!.registries as { queryClient: QueryClient }).queryClient;
    const clientB = (pluginB.provides!.registries as { queryClient: QueryClient }).queryClient;

    pluginA.onInit!(stubApp());
    pluginB.onInit!(stubApp());

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

    // Plugin A's cache should have been cleared by its own destroy
    expect(clientA.getQueryData(['a'])).toBeUndefined();

    // Plugin B's MockEvents.Toggle listener should still work
    eventBus.emit(MockEvents.Toggle, { enabled: true });
    await flushQueryCacheClear();
    expect(clientB.getQueryData(['b'])).toBeUndefined();

    // Clean up plugin B
    pluginB.onDestroy!(stubApp());
  });
});
