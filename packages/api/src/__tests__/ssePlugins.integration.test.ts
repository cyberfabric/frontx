/**
 * Task 71: Integration Test - Protocol-Specific SSE Plugin Chain
 *
 * Tests for SSE protocol plugin chain execution.
 * Validates AC-1, AC-2, AC-4, AC-5 from the OpenSpec.
 */

import { SseProtocol } from '../protocols/SseProtocol';
import { SseMockPlugin } from '../plugins/SseMockPlugin';
import { MockEventSource } from '../mocks/MockEventSource';
import { apiRegistry } from '../apiRegistry';
import type { SsePluginHooks, SseConnectContext } from '../types';

describe('SseProtocol plugins', () => {
  beforeEach(() => {
    // Clear all plugins before each test
    apiRegistry.reset();
  });

  afterEach(() => {
    apiRegistry.reset();
  });

  describe('global plugin management', () => {
    it('should register global plugins', () => {
      const plugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      apiRegistry.plugins.add(SseProtocol,plugin);
      expect(apiRegistry.plugins.has(SseProtocol, plugin.constructor as never)).toBe(true);
      expect(apiRegistry.plugins.getAll(SseProtocol)).toContain(plugin);
    });

    it('should remove global plugins and call destroy', () => {
      let destroyCalled = false;
      const plugin: SsePluginHooks & { destroy: () => void } = {
        onConnect: async (ctx) => ctx,
        destroy: () => { destroyCalled = true; },
      };

      apiRegistry.plugins.add(SseProtocol,plugin);
      apiRegistry.plugins.remove(SseProtocol, plugin.constructor as never);

      expect(apiRegistry.plugins.has(SseProtocol, plugin.constructor as never)).toBe(false);
      expect(destroyCalled).toBe(true);
    });

    it('should clear all global plugins and call destroy on each', () => {
      let destroyCount = 0;
      const createPlugin = (): SsePluginHooks & { destroy: () => void } => ({
        onConnect: async (ctx) => ctx,
        destroy: () => { destroyCount++; },
      });

      apiRegistry.plugins.add(SseProtocol,createPlugin());
      apiRegistry.plugins.add(SseProtocol,createPlugin());

      apiRegistry.plugins.clear(SseProtocol);

      expect(apiRegistry.plugins.getAll(SseProtocol).length).toBe(0);
      expect(destroyCount).toBe(2);
    });
  });

  describe('instance plugin management', () => {
    it('should register instance plugins', () => {
      const sseProtocol = new SseProtocol();
      const plugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      sseProtocol.plugins.add(plugin);
      expect(sseProtocol.plugins.getAll()).toContain(plugin);
    });

    it('should remove instance plugins and call destroy', () => {
      const sseProtocol = new SseProtocol();
      let destroyCalled = false;
      const plugin: SsePluginHooks & { destroy: () => void } = {
        onConnect: async (ctx) => ctx,
        destroy: () => { destroyCalled = true; },
      };

      sseProtocol.plugins.add(plugin);
      sseProtocol.plugins.remove(plugin);

      expect(sseProtocol.plugins.getAll()).not.toContain(plugin);
      expect(destroyCalled).toBe(true);
    });
  });

  describe('plugin execution order', () => {
    it('should execute global plugins before instance plugins', () => {
      const globalPlugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      const instancePlugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      apiRegistry.plugins.add(SseProtocol,globalPlugin);

      const sseProtocol = new SseProtocol();
      sseProtocol.plugins.add(instancePlugin);

      // Access private method via type assertion for testing
      const plugins = (sseProtocol as unknown as { getPluginsInOrder: () => SsePluginHooks[] }).getPluginsInOrder();
      expect(plugins.length).toBe(2);
      expect(plugins[0]).toBe(globalPlugin);
      expect(plugins[1]).toBe(instancePlugin);
    });

    it('should execute global plugins for all protocol instances', () => {
      const globalPlugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      apiRegistry.plugins.add(SseProtocol,globalPlugin);

      const protocol1 = new SseProtocol();
      const protocol2 = new SseProtocol();

      // Both instances should have access to global plugin
      const getPlugins = (p: SseProtocol) =>
        (p as unknown as { getPluginsInOrder: () => SsePluginHooks[] }).getPluginsInOrder();

      expect(getPlugins(protocol1)).toContain(globalPlugin);
      expect(getPlugins(protocol2)).toContain(globalPlugin);
    });

    it('should execute instance plugins only for that instance', () => {
      const instancePlugin: SsePluginHooks = {
        onConnect: async (ctx) => ctx,
      };

      const protocol1 = new SseProtocol();
      const protocol2 = new SseProtocol();

      protocol1.plugins.add(instancePlugin);

      expect(protocol1.plugins.getAll()).toContain(instancePlugin);
      expect(protocol2.plugins.getAll()).not.toContain(instancePlugin);
    });
  });

  describe('short-circuit with SseMockPlugin', () => {
    it('should short-circuit with SseMockPlugin returning MockEventSource', async () => {
      const mockPlugin = new SseMockPlugin({
        mockStreams: {
          '/api/stream': [
            { data: '{"message": "hello"}' },
            { event: 'done', data: '' },
          ],
        },
        delay: 0,
      });

      const context: SseConnectContext = {
        url: '/api/stream',
        headers: {},
      };

      const result = await mockPlugin.onConnect(context);

      expect('shortCircuit' in result).toBe(true);
      if ('shortCircuit' in result) {
        expect(result.shortCircuit).toBeDefined();
        expect(typeof result.shortCircuit.close).toBe('function');
      }
    });

    it('should pass through non-matching connections', async () => {
      const mockPlugin = new SseMockPlugin({
        mockStreams: {
          '/api/stream': [{ data: 'test' }],
        },
        delay: 0,
      });

      const context: SseConnectContext = {
        url: '/api/other',
        headers: {},
      };

      const result = await mockPlugin.onConnect(context);

      expect('shortCircuit' in result).toBe(false);
      expect(result).toEqual(context);
    });
  });

  describe('MockEventSource', () => {
    it('should emit events from MockEventSource', async () => {
      const events = [
        { data: '{"chunk": 1}' },
        { data: '{"chunk": 2}' },
        { event: 'done', data: '' },
      ];

      const mockSource = new MockEventSource(events, 10);
      const receivedMessages: string[] = [];

      mockSource.onmessage = (event) => {
        receivedMessages.push(event.data);
      };

      // Wait for events to be emitted
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBe(2);
      expect(receivedMessages[0]).toBe('{"chunk": 1}');
      expect(receivedMessages[1]).toBe('{"chunk": 2}');
    });

    it('should transition readyState correctly', async () => {
      const events = [{ data: 'test' }, { event: 'done', data: '' }];
      const mockSource = new MockEventSource(events, 10);

      // Initially CONNECTING
      expect(mockSource.readyState).toBe(0);

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 100));

      // After completion, should be CLOSED
      expect(mockSource.readyState).toBe(2);
    });

    it('should call onopen handler', async () => {
      const events = [{ data: 'test' }];
      const mockSource = new MockEventSource(events, 10);

      let openCalled = false;
      mockSource.onopen = () => { openCalled = true; };

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(openCalled).toBe(true);
    });

    it('should support addEventListener for done event', async () => {
      const events = [
        { data: 'test' },
        { event: 'done', data: '' },
      ];
      const mockSource = new MockEventSource(events, 10);

      let doneCalled = false;
      mockSource.addEventListener('done', () => {
        doneCalled = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(doneCalled).toBe(true);
    });

    it('should stop emitting events when closed', async () => {
      const events = [
        { data: '{"chunk": 1}' },
        { data: '{"chunk": 2}' },
        { data: '{"chunk": 3}' },
      ];

      const mockSource = new MockEventSource(events, 50);
      const receivedMessages: string[] = [];

      mockSource.onmessage = (event) => {
        receivedMessages.push(event.data);
      };

      // Close after first event
      await new Promise((resolve) => setTimeout(resolve, 70));
      mockSource.close();

      // Wait to ensure no more events
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have received only 1-2 events before close
      expect(receivedMessages.length).toBeLessThan(3);
    });
  });

  describe('dynamic mock streams updates', () => {
    it('should allow updating mock streams dynamically', async () => {
      const mockPlugin = new SseMockPlugin({
        mockStreams: {
          '/api/v1': [{ data: 'v1' }],
        },
        delay: 0,
      });

      // Update mock streams
      mockPlugin.setMockStreams({
        '/api/v2': [{ data: 'v2' }],
      });

      const context: SseConnectContext = {
        url: '/api/v2',
        headers: {},
      };

      const result = await mockPlugin.onConnect(context);

      expect('shortCircuit' in result).toBe(true);
    });
  });
});
