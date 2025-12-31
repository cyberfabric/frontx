/**
 * Task 92: Integration Test - Mock Self-Registration
 *
 * Tests for mock self-registration pattern.
 * Validates AC14 from the OpenSpec.
 */

import { RestProtocol } from '../protocols/RestProtocol';
import { RestMockPlugin } from '../plugins/RestMockPlugin';
import type { MockMap } from '../types';

/**
 * Helper to set protocol reference on plugin (needed for testing)
 * In production, RestProtocol sets this automatically during plugin chain execution
 */
function setProtocolOnPlugin(plugin: RestMockPlugin, protocol: RestProtocol): void {
  // Access internal _protocol property for testing
  Object.defineProperty(plugin, '_protocol', {
    value: protocol,
    writable: true,
    configurable: true,
  });
}

describe('Mock self-registration', () => {
  beforeEach(() => {
    // Clear global plugins before each test
    RestProtocol.globalPlugins.clear();
  });

  afterEach(() => {
    RestProtocol.globalPlugins.clear();
  });

  it('should allow service to register its own mock map', () => {
    const restProtocol = new RestProtocol();

    const mockMap: MockMap = {
      'GET /api/users': () => [{ id: '1', name: 'John' }],
      'POST /api/users': (body) => ({ id: '2', ...body }),
    };

    // Service registers its own mock map
    restProtocol.registerMockMap(mockMap);

    // Verify mock map was registered
    const registeredMap = restProtocol.getMockMap();
    expect(registeredMap).toEqual(mockMap);
  });

  it('should use registered mock map when RestMockPlugin is enabled', async () => {
    const restProtocol = new RestProtocol();

    // Service registers its own mock map
    restProtocol.registerMockMap({
      'GET /api/users': () => [{ id: '1', name: 'John' }],
    });

    // Create RestMockPlugin without mockMap config (uses protocol's map)
    const mockPlugin = new RestMockPlugin();

    // Mock plugin should use protocol's registered mock map
    const context = {
      method: 'GET' as const,
      url: '/api/users',
      headers: {},
    };

    // Set protocol on plugin so it can access registered mocks
    setProtocolOnPlugin(mockPlugin, restProtocol);

    const result = await mockPlugin.onRequest(context);

    expect('shortCircuit' in result).toBe(true);
    if ('shortCircuit' in result) {
      expect(result.shortCircuit.status).toBe(200);
      expect(result.shortCircuit.data).toEqual([{ id: '1', name: 'John' }]);
    }
  });

  it('should merge multiple mock maps from different services', () => {
    const restProtocol = new RestProtocol();

    // First service registers its mocks
    restProtocol.registerMockMap({
      'GET /api/users': () => [{ id: '1', name: 'John' }],
    });

    // Second service registers additional mocks
    restProtocol.registerMockMap({
      'GET /api/posts': () => [{ id: '1', title: 'Hello' }],
    });

    // Both mock maps should be merged
    const registeredMap = restProtocol.getMockMap();
    expect(registeredMap['GET /api/users']).toBeDefined();
    expect(registeredMap['GET /api/posts']).toBeDefined();
  });

  it('should work when RestMockPlugin has no mockMap config', async () => {
    const restProtocol = new RestProtocol();

    // Service registers its own mock map
    restProtocol.registerMockMap({
      'GET /api/data': () => ({ success: true }),
    });

    // Create plugin without mockMap config
    const mockPlugin = new RestMockPlugin();
    setProtocolOnPlugin(mockPlugin, restProtocol);

    const context = {
      method: 'GET' as const,
      url: '/api/data',
      headers: {},
    };

    const result = await mockPlugin.onRequest(context);

    // Should use protocol's registered map
    expect('shortCircuit' in result).toBe(true);
    if ('shortCircuit' in result) {
      expect(result.shortCircuit.data).toEqual({ success: true });
    }
  });

  it('should still allow explicit mockMap in RestMockPlugin config', async () => {
    const restProtocol = new RestProtocol();

    // Service registers its own mock map
    restProtocol.registerMockMap({
      'GET /api/users': () => [{ id: '1', name: 'John' }],
    });

    // Plugin has explicit mockMap (should take precedence)
    const mockPlugin = new RestMockPlugin({
      mockMap: {
        'GET /api/users': () => [{ id: '2', name: 'Jane' }],
      },
    });
    setProtocolOnPlugin(mockPlugin, restProtocol);

    const context = {
      method: 'GET' as const,
      url: '/api/users',
      headers: {},
    };

    const result = await mockPlugin.onRequest(context);

    // Should use explicit mockMap from plugin config
    expect('shortCircuit' in result).toBe(true);
    if ('shortCircuit' in result) {
      expect(result.shortCircuit.data).toEqual([{ id: '2', name: 'Jane' }]);
    }
  });

  it('should isolate mock maps between protocol instances', () => {
    const protocol1 = new RestProtocol();
    const protocol2 = new RestProtocol();

    // Each service instance registers its own mocks
    protocol1.registerMockMap({
      'GET /api/users': () => [{ id: '1', name: 'John' }],
    });

    protocol2.registerMockMap({
      'GET /api/posts': () => [{ id: '1', title: 'Hello' }],
    });

    // Mock maps should be isolated
    const map1 = protocol1.getMockMap();
    const map2 = protocol2.getMockMap();

    expect(map1['GET /api/users']).toBeDefined();
    expect(map1['GET /api/posts']).toBeUndefined();

    expect(map2['GET /api/posts']).toBeDefined();
    expect(map2['GET /api/users']).toBeUndefined();
  });
});
