/**
 * Dynamic Registration Tests (Phase 19.5)
 *
 * Tests for dynamic registration of extensions and domains at runtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { ScreensetsRegistry } from '../../../src/mfe/runtime/ScreensetsRegistry';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ExtensionDomain, Extension, MfeEntry } from '../../../src/mfe/types';
import type { MfeEntryLifecycle, ChildMfeBridge, MfeHandler } from '../../../src/mfe/handler/types';

// Helper to access private members for testing (replaces 'as never' with proper typing)
interface ExtensionStateShape {
  extension: Extension;
  entry: MfeEntry;
  bridge: unknown;
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  mountState: 'unmounted' | 'mounting' | 'mounted' | 'error';
  container: Element | null;
  lifecycle: MfeEntryLifecycle<ChildMfeBridge> | null;
  error?: Error;
}

interface RegistryInternals {
  extensions: Map<string, ExtensionStateShape>;
}

function getRegistryInternals(registry: DefaultScreensetsRegistry): RegistryInternals {
  return registry as unknown as RegistryInternals;
}

describe('Dynamic Registration', () => {
  let registry: DefaultScreensetsRegistry;

  const testDomain: ExtensionDomain = {
    id: 'gts.hai3.mfes.ext.domain.v1~test.dynamic.reg.domain.v1',
    sharedProperties: [],
    actions: [],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
    ],
    extensionsLifecycleStages: [
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
    ],
  };

  const testEntry: MfeEntry = {
    id: 'gts.hai3.mfes.mfe.entry.v1~test.dynamic.reg.entry.v1',
    requiredProperties: [],
    optionalProperties: [],
    actions: [],
    domainActions: [],
  };

  const testExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.dynamic.reg.extension.v1',
    domain: testDomain.id,
    entry: testEntry.id,
  };

  beforeEach(() => {
    registry = new DefaultScreensetsRegistry({
      typeSystem: gtsPlugin,
      debug: false,
    });

    // Register the entry instance with GTS plugin before using it
    gtsPlugin.register(testEntry);
  });

  describe('factory', () => {
    it('should return an instance of abstract ScreensetsRegistry', () => {
      expect(registry).toBeInstanceOf(ScreensetsRegistry);
    });
  });

  describe('registerExtension', () => {
    it('should register extension after runtime initialization', async () => {
      // Register domain first
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      // Register extension dynamically
      await registry.registerExtension(testExtension);

      // Verify registration
      const result = registry.getExtension(testExtension.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(testExtension.id);
    });

    it('should fail if domain not registered', async () => {
      // Try to register extension without domain
      await expect(registry.registerExtension(testExtension)).rejects.toThrow(
        /domain.*not registered/i
      );
    });
  });

  describe('unregisterExtension', () => {
    it('should unregister extension', async () => {
      // Register domain and extension
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Unregister
      await registry.unregisterExtension(testExtension.id);

      // Verify unregistered
      const result = registry.getExtension(testExtension.id);
      expect(result).toBeUndefined();
    });

    it('should be idempotent', async () => {
      // Unregister non-existent extension should not throw
      await expect(registry.unregisterExtension('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('registerDomain', () => {
    it('should register domain at any time', () => {
      // Register domain
      registry.registerDomain(testDomain);

      // Verify registration
      const result = registry.getDomain(testDomain.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(testDomain.id);
    });
  });

  describe('unregisterDomain', () => {
    it('should cascade unregister extensions in domain', async () => {
      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Unregister domain
      await registry.unregisterDomain(testDomain.id);

      // Verify domain and extension are unregistered
      expect(registry.getDomain(testDomain.id)).toBeUndefined();
      expect(registry.getExtension(testExtension.id)).toBeUndefined();
    });
  });

  describe('loadExtension and preloadExtension', () => {
    let mockLifecycle: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };
    let mockHandler: {
      bridgeFactory: unknown;
      handledBaseTypeId: string;
      canHandle: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      preload: ReturnType<typeof vi.fn>;
      priority: number;
    };

    beforeEach(() => {
      mockLifecycle = {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
      };

      mockHandler = {
        bridgeFactory: {} as unknown,
        handledBaseTypeId: 'gts.hai3.mfes.mfe.entry.v1~',
        canHandle: vi.fn().mockReturnValue(true),
        load: vi.fn().mockResolvedValue(mockLifecycle),
        preload: vi.fn().mockResolvedValue(undefined),
        priority: 0,
      };
    });

    it('should require extension to be registered (19.5.7)', async () => {
      // Try to load non-existent extension
      await expect(registry.loadExtension('nonexistent')).rejects.toThrow(/not registered/i);
    });

    it('should cache bundle for mounting (19.5.8)', async () => {
      // Register handler
      registry.registerHandler(mockHandler as unknown as MfeHandler);

      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Load extension twice
      await registry.loadExtension(testExtension.id);
      await registry.loadExtension(testExtension.id);

      // Verify handler.load was only called once (cached)
      expect(mockHandler.load).toHaveBeenCalledTimes(1);
    });

    it('should have same behavior as loadExtension for preloadExtension (19.5.9)', async () => {
      // Register handler
      registry.registerHandler(mockHandler as unknown as MfeHandler);

      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Preload extension
      await registry.preloadExtension(testExtension.id);

      // Verify loadState becomes 'loaded'
      const state = internals.extensions.get(testExtension.id);
      expect(state?.loadState).toBe('loaded');
    });
  });

  describe('mountExtension and unmountExtension', () => {
    let mockLifecycle: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };
    let mockHandler: {
      bridgeFactory: unknown;
      handledBaseTypeId: string;
      canHandle: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      preload: ReturnType<typeof vi.fn>;
      priority: number;
    };

    beforeEach(() => {
      mockLifecycle = {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
      };

      mockHandler = {
        bridgeFactory: {} as unknown,
        handledBaseTypeId: 'gts.hai3.mfes.mfe.entry.v1~',
        canHandle: vi.fn().mockReturnValue(true),
        load: vi.fn().mockResolvedValue(mockLifecycle),
        preload: vi.fn().mockResolvedValue(undefined),
        priority: 0,
      };
    });

    it('should auto-load if not loaded (19.5.10)', async () => {
      // Register handler
      registry.registerHandler(mockHandler as unknown as MfeHandler);

      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Mount without prior loadExtension
      const container = document.createElement('div');
      await registry.mountExtension(testExtension.id, container);

      // Verify handler.load was called (auto-load)
      expect(mockHandler.load).toHaveBeenCalledTimes(1);

      // Verify mount was called
      expect(mockLifecycle.mount).toHaveBeenCalledWith(container, expect.anything());
    });

    it('should require extension to be registered (19.5.11)', async () => {
      const container = document.createElement('div');

      // Try to mount non-existent extension
      await expect(registry.mountExtension('nonexistent', container)).rejects.toThrow(/not registered/i);
    });

    it('should keep extension registered and bundle loaded after unmount (19.5.12)', async () => {
      // Register handler
      registry.registerHandler(mockHandler as unknown as MfeHandler);

      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Load, mount, then unmount
      await registry.loadExtension(testExtension.id);
      const container = document.createElement('div');
      await registry.mountExtension(testExtension.id, container);
      await registry.unmountExtension(testExtension.id);

      // Verify extension is still registered
      const extension = registry.getExtension(testExtension.id);
      expect(extension).toBeDefined();
      expect(extension?.id).toBe(testExtension.id);

      // Verify loadState is still 'loaded'
      const state = internals.extensions.get(testExtension.id);
      expect(state?.loadState).toBe('loaded');
    });
  });

  describe('unregisterExtension with mounted MFE', () => {
    let mockLifecycle: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };
    let mockHandler: {
      bridgeFactory: unknown;
      handledBaseTypeId: string;
      canHandle: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      preload: ReturnType<typeof vi.fn>;
      priority: number;
    };

    beforeEach(() => {
      mockLifecycle = {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
      };

      mockHandler = {
        bridgeFactory: {} as unknown,
        handledBaseTypeId: 'gts.hai3.mfes.mfe.entry.v1~',
        canHandle: vi.fn().mockReturnValue(true),
        load: vi.fn().mockResolvedValue(mockLifecycle),
        preload: vi.fn().mockResolvedValue(undefined),
        priority: 0,
      };
    });

    it('should unmount MFE if mounted (19.5.3)', async () => {
      // Register handler
      registry.registerHandler(mockHandler as unknown as MfeHandler);

      // Register domain
      registry.registerDomain(testDomain);

      // Pre-cache entry
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Load and mount
      const container = document.createElement('div');
      await registry.loadExtension(testExtension.id);
      await registry.mountExtension(testExtension.id, container);

      // Verify mounted
      expect(mockLifecycle.mount).toHaveBeenCalled();

      // Unregister - should auto-unmount
      await registry.unregisterExtension(testExtension.id);

      // Verify unmount was called
      expect(mockLifecycle.unmount).toHaveBeenCalled();

      // Verify extension is unregistered
      expect(registry.getExtension(testExtension.id)).toBeUndefined();
    });
  });

  describe('hot-swap registration', () => {
    it('should support unregister + register with same ID (19.5.14)', async () => {
      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry for first extension
      const internals = getRegistryInternals(registry);
      internals.extensions.set(testExtension.id, {
        extension: testExtension,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      await registry.registerExtension(testExtension);

      // Verify first registration
      const firstExtension = registry.getExtension(testExtension.id);
      expect(firstExtension).toBeDefined();
      expect(firstExtension?.id).toBe(testExtension.id);

      // Unregister
      await registry.unregisterExtension(testExtension.id);

      // Create new extension with same ID but different entry
      const newEntry: MfeEntry = {
        id: 'gts.hai3.mfes.mfe.entry.v1~test.dynamic.reg.entry.v2',
        requiredProperties: [],
        optionalProperties: [],
        actions: [],
        domainActions: [],
      };
      gtsPlugin.register(newEntry);

      const newExtension: Extension = {
        id: testExtension.id, // Same ID
        domain: testDomain.id,
        entry: newEntry.id, // Different entry
      };

      // Mock resolveEntry for new extension
      internals.extensions.set(newExtension.id, {
        extension: newExtension,
        entry: newEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      // Register again with same ID
      await registry.registerExtension(newExtension);

      // Verify new registration
      const secondExtension = registry.getExtension(newExtension.id);
      expect(secondExtension).toBeDefined();
      expect(secondExtension?.id).toBe(newExtension.id);
      expect(secondExtension?.entry).toBe(newEntry.id);
    });
  });
});
