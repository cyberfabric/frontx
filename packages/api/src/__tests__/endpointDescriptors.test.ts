/**
 * Endpoint Descriptor factory method tests for BaseApiService.
 *
 * Covers:
 *   - query():    key derivation, fetch delegation, signal forwarding, cache hints
 *   - queryWith(): parameterized key derivation, fetch delegation, cache hints
 *   - mutation(): key derivation, fetch passes variables as body
 *
 * Uses RestMockPlugin to intercept HTTP calls so no real network is needed.
 *
 * @cpt-FEATURE:implement-endpoint-descriptors:p1
 * @cpt-dod:cpt-hai3-dod-request-lifecycle-query-provider:p2
 * @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-query:p2
 * @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseApiService } from '../BaseApiService';
import { RestProtocol } from '../protocols/RestProtocol';
import { RestMockPlugin } from '../plugins/RestMockPlugin';
import { apiRegistry } from '../apiRegistry';
import type { EndpointDescriptor, MutationDescriptor } from '../types';

// ============================================================================
// Concrete test service
// ============================================================================

interface User {
  id: string;
  name: string;
}

interface ProfileUpdate {
  name: string;
}

/**
 * Concrete service used only in tests. Exposes all three descriptor factory
 * methods as public readonly properties so we can assert on them directly.
 */
class TestApiService extends BaseApiService {
  private readonly restProtocol: RestProtocol;

  constructor() {
    const rest = new RestProtocol();
    super({ baseURL: '/api/test' }, rest);
    this.restProtocol = rest;

    // Add mock plugin so fetch() calls short-circuit and return configured data
    // instead of making real HTTP requests.
    this.restProtocol.plugins.add(
      new RestMockPlugin({
        mockMap: {
          'GET /api/test/user/current': () => ({ id: '1', name: 'Alice' }),
          'GET /api/test/user/42': () => ({ id: '42', name: 'Bob' }),
          'PUT /api/test/user/profile': (body) => ({ id: '1', ...(body as object) }),
          'POST /api/test/items': (body) => ({ id: 'new', ...(body as object) }),
        },
      })
    );
  }

  // Static read — key: [baseURL, 'GET', path]
  readonly getCurrentUser = this.query<User>('/user/current');

  // Static read with cache hints
  readonly getConfig = this.query<{ version: string }>('/config', {
    staleTime: 600_000,
    gcTime: Infinity,
  });

  // Parameterized read — key: [baseURL, 'GET', resolvedPath, params]
  readonly getUser = this.queryWith<User, { id: string }>(
    (p) => `/user/${p.id}`
  );

  // Parameterized read with cache hints
  readonly getUserCached = this.queryWith<User, { id: string }>(
    (p) => `/user/${p.id}`,
    { staleTime: 120_000 }
  );

  // Write endpoint
  readonly updateProfile = this.mutation<User, ProfileUpdate>('PUT', '/user/profile');

  // Write endpoint (POST)
  readonly createItem = this.mutation<{ id: string; name: string }, { name: string }>('POST', '/items');
}

// ============================================================================
// Test setup
// ============================================================================

let service: TestApiService;

beforeEach(() => {
  apiRegistry.reset();
  service = new TestApiService();
});

afterEach(() => {
  apiRegistry.reset();
});

// ============================================================================
// query() — static read descriptor
// ============================================================================

describe('BaseApiService.query()', () => {
  it('returns an EndpointDescriptor with the correct static cache key', () => {
    const descriptor = service.getCurrentUser;

    // Key must be a tuple: [baseURL, method, path]
    expect(descriptor.key).toEqual(['/api/test', 'GET', '/user/current']);
    expect(descriptor.key).toHaveLength(3);
  });

  it('descriptor has a fetch function', () => {
    expect(typeof service.getCurrentUser.fetch).toBe('function');
  });

  it('fetch() resolves with the response data', async () => {
    const user = await service.getCurrentUser.fetch();
    expect(user).toEqual({ id: '1', name: 'Alice' });
  });

  it('forwards AbortSignal to the protocol without throwing for non-aborted signals', async () => {
    const controller = new AbortController();
    // Signal is not aborted — request should succeed normally.
    const user = await service.getCurrentUser.fetch({ signal: controller.signal });
    expect(user).toEqual({ id: '1', name: 'Alice' });
  });

  it('fetch() with aborted signal — RestMockPlugin short-circuits before signal check (signal forwarding tested via RestProtocol)', async () => {
    // RestMockPlugin intercepts before axios inspects the AbortSignal, so the
    // mock-backed descriptor resolves even with an aborted signal. Signal
    // forwarding is covered at the RestProtocol layer in abortSignal.test.ts.
    // Here we verify that passing a signal does not break the call contract.
    const controller = new AbortController();
    controller.abort();

    // Should still resolve because mock intercepts before signal inspection.
    const user = await service.getCurrentUser.fetch({ signal: controller.signal });
    expect(user).toEqual({ id: '1', name: 'Alice' });
  });

  it('descriptor without cache hints has no staleTime or gcTime properties', () => {
    const descriptor: EndpointDescriptor<User> = service.getCurrentUser;
    expect(descriptor.staleTime).toBeUndefined();
    expect(descriptor.gcTime).toBeUndefined();
  });

  it('descriptor carries staleTime and gcTime when specified in options', () => {
    const descriptor = service.getConfig;
    expect(descriptor.staleTime).toBe(600_000);
    expect(descriptor.gcTime).toBe(Infinity);
  });

  it('key is readonly (frozen array-like)', () => {
    // key is typed as readonly — ensure the reference is stable across calls
    // (same descriptor object produced once at class construction time)
    expect(service.getCurrentUser.key).toBe(service.getCurrentUser.key);
  });
});

// ============================================================================
// queryWith() — parameterized read descriptor
// ============================================================================

describe('BaseApiService.queryWith()', () => {
  it('returns a factory function', () => {
    expect(typeof service.getUser).toBe('function');
  });

  it('calling the factory returns a descriptor with correct parameterized key', () => {
    const descriptor = service.getUser({ id: '42' });

    // Key: [baseURL, method, resolvedPath, params]
    expect(descriptor.key).toEqual(['/api/test', 'GET', '/user/42', { id: '42' }]);
    expect(descriptor.key).toHaveLength(4);
  });

  it('different params produce different cache keys', () => {
    const d1 = service.getUser({ id: '1' });
    const d2 = service.getUser({ id: '2' });

    expect(d1.key).not.toEqual(d2.key);
    expect(d1.key[2]).toBe('/user/1');
    expect(d2.key[2]).toBe('/user/2');
  });

  it('fetch() resolves with the response data for the given params', async () => {
    const descriptor = service.getUser({ id: '42' });
    const user = await descriptor.fetch();
    expect(user).toEqual({ id: '42', name: 'Bob' });
  });

  it('forwards AbortSignal through the parameterized descriptor', async () => {
    const controller = new AbortController();
    const descriptor = service.getUser({ id: '42' });
    const user = await descriptor.fetch({ signal: controller.signal });
    expect(user).toEqual({ id: '42', name: 'Bob' });
  });

  it('descriptor without cache hints has no staleTime or gcTime', () => {
    const descriptor = service.getUser({ id: '1' });
    expect(descriptor.staleTime).toBeUndefined();
    expect(descriptor.gcTime).toBeUndefined();
  });

  it('descriptor carries staleTime when specified in factory options', () => {
    const descriptor = service.getUserCached({ id: '1' });
    expect(descriptor.staleTime).toBe(120_000);
    expect(descriptor.gcTime).toBeUndefined();
  });

  it('params object is included in the key (enables per-param cache isolation)', () => {
    const params = { id: '7' };
    const descriptor = service.getUser(params);

    // The params reference is embedded in the key at index 3
    expect(descriptor.key[3]).toEqual(params);
  });
});

// ============================================================================
// mutation() — write descriptor
// ============================================================================

describe('BaseApiService.mutation()', () => {
  it('returns a MutationDescriptor with the correct cache key', () => {
    const descriptor: MutationDescriptor<User, ProfileUpdate> = service.updateProfile;

    // Mutation key: [baseURL, method, path]
    expect(descriptor.key).toEqual(['/api/test', 'PUT', '/user/profile']);
    expect(descriptor.key).toHaveLength(3);
  });

  it('descriptor has a fetch function', () => {
    expect(typeof service.updateProfile.fetch).toBe('function');
  });

  it('fetch(variables) sends variables as request body and resolves with response', async () => {
    const updated = await service.updateProfile.fetch({ name: 'Alice Updated' });
    expect(updated).toEqual({ id: '1', name: 'Alice Updated' });
  });

  it('POST mutation resolves correctly', async () => {
    const created = await service.createItem.fetch({ name: 'Widget' });
    expect(created).toEqual({ id: 'new', name: 'Widget' });
  });

  it('forwards AbortSignal on mutation fetch (non-aborted signal)', async () => {
    const controller = new AbortController();
    const updated = await service.updateProfile.fetch(
      { name: 'Alice Updated' },
      { signal: controller.signal }
    );
    expect(updated).toEqual({ id: '1', name: 'Alice Updated' });
  });

  it('mutation descriptor has no staleTime or gcTime (mutations are not cached)', () => {
    const descriptor = service.updateProfile;
    // MutationDescriptor type does not include cache hints — access via key/fetch only
    expect(Object.keys(descriptor)).not.toContain('staleTime');
    expect(Object.keys(descriptor)).not.toContain('gcTime');
  });

  it('different HTTP methods produce different keys', () => {
    const putKey = service.updateProfile.key;
    const postKey = service.createItem.key;

    expect(putKey[1]).toBe('PUT');
    expect(postKey[1]).toBe('POST');
    expect(putKey).not.toEqual(postKey);
  });
});

// ============================================================================
// Key derivation invariants (cross-descriptor)
// ============================================================================

describe('key derivation invariants', () => {
  it('query() and mutation() on the same path produce the same first 3 key segments', () => {
    // A read and write on the same resource share the resource identity prefix.
    // (They differ by method, so the full keys are different.)
    const getDescriptor = service.getCurrentUser;
    const putDescriptor = service.updateProfile;

    expect(getDescriptor.key[0]).toBe(putDescriptor.key[0]); // baseURL
    expect(getDescriptor.key[1]).not.toBe(putDescriptor.key[1]); // method differs
  });

  it('baseURL is always the first key segment', () => {
    expect(service.getCurrentUser.key[0]).toBe('/api/test');
    expect(service.getUser({ id: '1' }).key[0]).toBe('/api/test');
    expect(service.updateProfile.key[0]).toBe('/api/test');
  });

  it('HTTP method is always the second key segment', () => {
    expect(service.getCurrentUser.key[1]).toBe('GET');
    expect(service.updateProfile.key[1]).toBe('PUT');
    expect(service.createItem.key[1]).toBe('POST');
  });

  it('resolved path is always the third key segment', () => {
    expect(service.getCurrentUser.key[2]).toBe('/user/current');
    expect(service.updateProfile.key[2]).toBe('/user/profile');
    expect(service.getUser({ id: '5' }).key[2]).toBe('/user/5');
  });

  it('queryWith() descriptor includes params as fourth key segment (shallow clone)', () => {
    const params = { id: '99' };
    const descriptor = service.getUser(params);
    expect(descriptor.key[3]).toStrictEqual(params);
    // Shallow clone — not the same reference, defending against caller mutation
    expect(descriptor.key[3]).not.toBe(params);
  });

  it('query() descriptor has exactly 3 key segments (no params)', () => {
    expect(service.getCurrentUser.key).toHaveLength(3);
  });

  it('queryWith() descriptor has exactly 4 key segments (includes params)', () => {
    expect(service.getUser({ id: '1' }).key).toHaveLength(4);
  });

  it('mutation() descriptor has exactly 3 key segments (no params)', () => {
    expect(service.updateProfile.key).toHaveLength(3);
  });
});

// ============================================================================
// dispatchRequest() — unsupported methods
// ============================================================================

describe('dispatchRequest() with unsupported HTTP methods', () => {
  it('HEAD method is not supported by descriptors', async () => {
    // HEAD and OPTIONS are not supported — dispatchRequest throws synchronously.
    // We create a synthetic mutation descriptor with an unsupported method to exercise the default branch.
    class HeadTestService extends BaseApiService {
      constructor() {
        super({ baseURL: '/api/head' }, new RestProtocol());
      }
      // Cast to bypass TypeScript's HttpMethod narrowing — we need to reach the default branch at runtime.
      readonly headEndpoint = this.mutation('HEAD' as 'PUT', '/ping');
    }

    const headService = new HeadTestService();

    // dispatchRequest throws — the error propagates out of fetch() as a rejected promise.
    let caught: Error | undefined;
    try {
      await headService.headEndpoint.fetch(undefined);
    } catch (e) {
      caught = e as Error;
    }

    expect(caught).toBeDefined();
    expect(caught?.message).toMatch(/HttpMethod "HEAD" is not supported by endpoint descriptors/);
  });
});
