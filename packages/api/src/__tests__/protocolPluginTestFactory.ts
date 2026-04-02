/**
 * Shared test factory for protocol plugin integration tests.
 *
 * Both RestProtocol and SseProtocol share the same plugin management contract
 * (global registry, instance plugins, ordering). This factory captures that
 * structural identity once so the two test files can stay thin.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiRegistry } from '../apiRegistry';
import type { ApiProtocol, BasePluginHooks } from '../types';

/**
 * Protocol instance surface used by the shared tests, aligned with {@link ApiProtocol}
 * and concrete protocols (e.g. readonly plugin lists from {@link RestProtocol}).
 */
type ProtocolTestInstance<TPlugin extends BasePluginHooks> = ApiProtocol<TPlugin> & {
  plugins: {
    add(plugin: TPlugin): void;
    remove(plugin: TPlugin): void;
    getAll(): readonly TPlugin[];
  };
  /** Returns the combined global + instance plugin list in execution order. */
  getPluginsInOrder(): readonly TPlugin[];
};

export interface ProtocolPluginTestConfig<
  TProtocol extends new (...args: never[]) => ProtocolTestInstance<TPlugin>,
  TPlugin extends BasePluginHooks,
> {
  /** Human-readable label used in describe block names. */
  protocolName: string;

  /** The protocol constructor (e.g. RestProtocol, SseProtocol). */
  ProtocolClass: TProtocol;

  /**
   * Factory that produces a minimal valid plugin (no destroy) for testing
   * registration and ordering.
   */
  makePlugin(): TPlugin;

  /**
   * Factory that produces a plugin with a destroy spy.
   * `onDestroy` will be called when the plugin's destroy() is invoked.
   */
  makePluginWithDestroy(onDestroy: () => void): TPlugin;
}

/**
 * Registers the structural plugin management tests shared by every protocol.
 *
 * Call this inside a describe block (or at the module top level) for each
 * protocol under test. Protocol-specific tests (mock short-circuit, onResponse
 * LIFO, retry) live in the individual test files.
 */
export function createProtocolPluginTests<
  TProtocol extends new (...args: never[]) => ProtocolTestInstance<TPlugin>,
  TPlugin extends BasePluginHooks,
>(config: ProtocolPluginTestConfig<TProtocol, TPlugin>): void {
  const { protocolName, ProtocolClass, makePlugin, makePluginWithDestroy } = config;

  describe(`${protocolName} plugins`, () => {
    beforeEach(() => {
      apiRegistry.reset();
    });

    afterEach(() => {
      apiRegistry.reset();
    });

    // -------------------------------------------------------------------------
    // Global plugin management via apiRegistry
    // -------------------------------------------------------------------------

    describe('global plugin management via apiRegistry', () => {
      it('should register global plugins', () => {
        const plugin = makePlugin();

        apiRegistry.plugins.add(ProtocolClass, plugin);
        expect(apiRegistry.plugins.has(ProtocolClass, plugin.constructor as never)).toBe(true);
        expect(apiRegistry.plugins.getAll(ProtocolClass)).toContain(plugin);
      });

      it('should remove global plugins by class and call destroy', () => {
        let destroyCalled = false;
        const plugin = makePluginWithDestroy(() => { destroyCalled = true; });

        // Use an explicit named class so the registry can remove by constructor.
        // We register the plugin instance itself and remove by its constructor.
        apiRegistry.plugins.add(ProtocolClass, plugin);
        apiRegistry.plugins.remove(ProtocolClass, plugin.constructor as never);

        expect(apiRegistry.plugins.has(ProtocolClass, plugin.constructor as never)).toBe(false);
        expect(destroyCalled).toBe(true);
      });

      it('should clear all global plugins and call destroy on each', () => {
        let destroyCount = 0;

        apiRegistry.plugins.add(ProtocolClass, makePluginWithDestroy(() => { destroyCount++; }));
        apiRegistry.plugins.add(ProtocolClass, makePluginWithDestroy(() => { destroyCount++; }));

        apiRegistry.plugins.clear(ProtocolClass);

        expect(apiRegistry.plugins.getAll(ProtocolClass).length).toBe(0);
        expect(destroyCount).toBe(2);
      });
    });

    // -------------------------------------------------------------------------
    // Instance plugin management
    // -------------------------------------------------------------------------

    describe('instance plugin management', () => {
      it('should register instance plugins', () => {
        const protocol = new ProtocolClass();
        const plugin = makePlugin();

        protocol.plugins.add(plugin);
        expect(protocol.plugins.getAll()).toContain(plugin);
      });

      it('should remove instance plugins and call destroy', () => {
        const protocol = new ProtocolClass();
        let destroyCalled = false;
        const plugin = makePluginWithDestroy(() => { destroyCalled = true; });

        protocol.plugins.add(plugin);
        protocol.plugins.remove(plugin);

        expect(protocol.plugins.getAll()).not.toContain(plugin);
        expect(destroyCalled).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Plugin execution order
    // -------------------------------------------------------------------------

    describe('plugin execution order', () => {
      it('should execute global plugins before instance plugins', () => {
        const globalPlugin = makePlugin();
        const instancePlugin = makePlugin();

        apiRegistry.plugins.add(ProtocolClass, globalPlugin);

        const protocol = new ProtocolClass();
        protocol.plugins.add(instancePlugin);

        const plugins = protocol.getPluginsInOrder();
        expect(plugins.length).toBe(2);
        expect(plugins[0]).toBe(globalPlugin);
        expect(plugins[1]).toBe(instancePlugin);
      });

      it('should execute global plugins for all protocol instances', () => {
        const globalPlugin = makePlugin();
        apiRegistry.plugins.add(ProtocolClass, globalPlugin);

        const protocol1 = new ProtocolClass();
        const protocol2 = new ProtocolClass();

        expect(protocol1.getPluginsInOrder()).toContain(globalPlugin);
        expect(protocol2.getPluginsInOrder()).toContain(globalPlugin);
      });

      it('should execute instance plugins only for that instance', () => {
        const instancePlugin = makePlugin();

        const protocol1 = new ProtocolClass();
        const protocol2 = new ProtocolClass();

        protocol1.plugins.add(instancePlugin);

        expect(protocol1.plugins.getAll()).toContain(instancePlugin);
        expect(protocol2.plugins.getAll()).not.toContain(instancePlugin);
      });
    });
  });
}
