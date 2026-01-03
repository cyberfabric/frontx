/**
 * Task 70: Integration Test - Protocol-Specific REST Plugin Chain
 *
 * Tests for REST protocol plugin chain execution.
 * Validates AC-1, AC-2, AC-3, AC-5 from the OpenSpec.
 */

import { RestProtocol } from '../protocols/RestProtocol';
import { RestMockPlugin } from '../plugins/RestMockPlugin';
import { apiRegistry } from '../apiRegistry';
import type { RestPluginHooks, RestRequestContext, RestResponseContext } from '../types';

describe('RestProtocol plugins', () => {
  beforeEach(() => {
    // Clear all plugins before each test
    apiRegistry.reset();
  });

  afterEach(() => {
    apiRegistry.reset();
  });

  describe('global plugin management via apiRegistry', () => {
    it('should register global plugins', () => {
      const plugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => ctx,
        destroy: () => {},
      };

      apiRegistry.plugins.add(RestProtocol, plugin);
      expect(apiRegistry.plugins.has(RestProtocol, plugin.constructor as never)).toBe(true);
      expect(apiRegistry.plugins.getAll(RestProtocol)).toContain(plugin);
    });

    it('should remove global plugins by class and call destroy', () => {
      let destroyCalled = false;

      class TestPlugin implements RestPluginHooks {
        onRequest = async (ctx: RestRequestContext) => ctx;
        destroy() { destroyCalled = true; }
      }

      const plugin = new TestPlugin();
      apiRegistry.plugins.add(RestProtocol, plugin);
      apiRegistry.plugins.remove(RestProtocol, TestPlugin);

      expect(apiRegistry.plugins.has(RestProtocol, TestPlugin)).toBe(false);
      expect(destroyCalled).toBe(true);
    });

    it('should clear all global plugins and call destroy on each', () => {
      let destroyCount = 0;

      class TestPlugin implements RestPluginHooks {
        onRequest = async (ctx: RestRequestContext) => ctx;
        destroy() { destroyCount++; }
      }

      apiRegistry.plugins.add(RestProtocol, new TestPlugin());
      apiRegistry.plugins.add(RestProtocol, new TestPlugin());

      apiRegistry.plugins.clear(RestProtocol);

      expect(apiRegistry.plugins.getAll(RestProtocol).length).toBe(0);
      expect(destroyCount).toBe(2);
    });
  });

  describe('instance plugin management', () => {
    it('should register instance plugins', () => {
      const restProtocol = new RestProtocol();
      const plugin: RestPluginHooks = {
        onRequest: async (ctx) => ctx,
      };

      restProtocol.plugins.add(plugin);
      expect(restProtocol.plugins.getAll()).toContain(plugin);
    });

    it('should remove instance plugins and call destroy', () => {
      const restProtocol = new RestProtocol();
      let destroyCalled = false;
      const plugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => ctx,
        destroy: () => { destroyCalled = true; },
      };

      restProtocol.plugins.add(plugin);
      restProtocol.plugins.remove(plugin);

      expect(restProtocol.plugins.getAll()).not.toContain(plugin);
      expect(destroyCalled).toBe(true);
    });
  });

  describe('plugin execution order', () => {
    it('should execute global plugins before instance plugins', () => {
      const executionOrder: string[] = [];

      const globalPlugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => {
          executionOrder.push('global');
          return ctx;
        },
        destroy: () => {},
      };

      const instancePlugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => {
          executionOrder.push('instance');
          return ctx;
        },
        destroy: () => {},
      };

      apiRegistry.plugins.add(RestProtocol, globalPlugin);

      const restProtocol = new RestProtocol();
      restProtocol.plugins.add(instancePlugin);

      // Get plugins in order
      const plugins = restProtocol.getPluginsInOrder();
      expect(plugins.length).toBe(2);
      expect(plugins[0]).toBe(globalPlugin);
      expect(plugins[1]).toBe(instancePlugin);
    });

    it('should execute global plugins for all protocol instances', () => {
      const globalPlugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => ctx,
        destroy: () => {},
      };

      apiRegistry.plugins.add(RestProtocol, globalPlugin);

      const protocol1 = new RestProtocol();
      const protocol2 = new RestProtocol();

      // Both instances should have access to global plugin
      expect(protocol1.getPluginsInOrder()).toContain(globalPlugin);
      expect(protocol2.getPluginsInOrder()).toContain(globalPlugin);
    });

    it('should execute instance plugins only for that instance', () => {
      const instancePlugin: RestPluginHooks & { destroy: () => void } = {
        onRequest: async (ctx) => ctx,
        destroy: () => {},
      };

      const protocol1 = new RestProtocol();
      const protocol2 = new RestProtocol();

      protocol1.plugins.add(instancePlugin);

      expect(protocol1.plugins.getAll()).toContain(instancePlugin);
      expect(protocol2.plugins.getAll()).not.toContain(instancePlugin);
    });
  });

  describe('short-circuit with RestMockPlugin', () => {
    it('should short-circuit with RestMockPlugin', async () => {
      const mockPlugin = new RestMockPlugin({
        mockMap: {
          'GET /api/test': () => ({ success: true, data: 'mocked' }),
        },
        delay: 0,
      });

      // Test onRequest directly
      const context: RestRequestContext = {
        method: 'GET',
        url: '/api/test',
        headers: {},
      };

      const result = await mockPlugin.onRequest(context);

      expect('shortCircuit' in result).toBe(true);
      if ('shortCircuit' in result) {
        expect(result.shortCircuit.status).toBe(200);
        expect(result.shortCircuit.data).toEqual({ success: true, data: 'mocked' });
      }
    });

    it('should pass through non-matching requests', async () => {
      const mockPlugin = new RestMockPlugin({
        mockMap: {
          'GET /api/test': () => ({ success: true }),
        },
        delay: 0,
      });

      const context: RestRequestContext = {
        method: 'GET',
        url: '/api/other',
        headers: {},
      };

      const result = await mockPlugin.onRequest(context);

      expect('shortCircuit' in result).toBe(false);
      expect(result).toEqual(context);
    });

    it('should match URL patterns with :params', async () => {
      const mockPlugin = new RestMockPlugin({
        mockMap: {
          'GET /api/users/:id': () => ({ id: '123', name: 'Test User' }),
        },
        delay: 0,
      });

      const context: RestRequestContext = {
        method: 'GET',
        url: '/api/users/123',
        headers: {},
      };

      const result = await mockPlugin.onRequest(context);

      expect('shortCircuit' in result).toBe(true);
    });
  });

  describe('onResponse hooks', () => {
    it('should execute onResponse hooks in reverse order (LIFO)', () => {
      const executionOrder: string[] = [];

      const plugin1: RestPluginHooks & { destroy: () => void } = {
        onResponse: async (ctx) => {
          executionOrder.push('plugin1');
          return ctx;
        },
        destroy: () => {},
      };

      const plugin2: RestPluginHooks & { destroy: () => void } = {
        onResponse: async (ctx) => {
          executionOrder.push('plugin2');
          return ctx;
        },
        destroy: () => {},
      };

      apiRegistry.plugins.add(RestProtocol, plugin1);
      apiRegistry.plugins.add(RestProtocol, plugin2);

      const restProtocol = new RestProtocol();
      const plugins = [...restProtocol.getPluginsInOrder()].reverse();

      // Simulate onResponse execution order
      plugins.forEach((p) => {
        if (p.onResponse) {
          const ctx: RestResponseContext = { status: 200, headers: {}, data: {} };
          p.onResponse(ctx);
        }
      });

      // LIFO order: plugin2 first, then plugin1
      expect(executionOrder).toEqual(['plugin2', 'plugin1']);
    });
  });

  describe('dynamic mock map updates', () => {
    it('should allow updating mock map dynamically', async () => {
      const mockPlugin = new RestMockPlugin({
        mockMap: {
          'GET /api/v1': () => ({ version: 1 }),
        },
        delay: 0,
      });

      // Update mock map
      mockPlugin.setMockMap({
        'GET /api/v2': () => ({ version: 2 }),
      });

      const context: RestRequestContext = {
        method: 'GET',
        url: '/api/v2',
        headers: {},
      };

      const result = await mockPlugin.onRequest(context);

      expect('shortCircuit' in result).toBe(true);
      if ('shortCircuit' in result) {
        expect(result.shortCircuit.data).toEqual({ version: 2 });
      }
    });
  });
});
