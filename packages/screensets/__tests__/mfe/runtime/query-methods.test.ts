/**
 * Query Methods Tests (Phase 19.1b)
 *
 * Tests for ScreensetsRegistry query methods:
 * - getExtension
 * - getDomain
 * - getExtensionsForDomain
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ExtensionDomain, Extension, MfeEntry } from '../../../src/mfe/types';
import type { MfeEntryLifecycle, ChildMfeBridge } from '../../../src/mfe/handler/types';

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

describe('ScreensetsRegistry Query Methods', () => {
  let registry: DefaultScreensetsRegistry;

  const testDomain: ExtensionDomain = {
    id: 'gts.hai3.mfes.ext.domain.v1~test.testorg.query.domain.v1',
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

  const testEntry = {
    id: 'gts.hai3.mfes.mfe.entry.v1~test.testorg.query.entry.v1',
    requiredProperties: [],
    optionalProperties: [],
    actions: [],
    domainActions: [],
  };

  const testExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.testorg.query.extension.v1',
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

  describe('getExtension', () => {
    it('should return registered extension', async () => {
      // Register domain and extension
      registry.registerDomain(testDomain);

      // Mock resolveEntry by pre-caching
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

      const result = registry.getExtension(testExtension.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(testExtension.id);
      expect(result?.domain).toBe(testDomain.id);
    });

    it('should return undefined for unregistered extension', () => {
      const result = registry.getExtension('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getDomain', () => {
    it('should return registered domain', () => {
      registry.registerDomain(testDomain);

      const result = registry.getDomain(testDomain.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(testDomain.id);
    });

    it('should return undefined for unregistered domain', () => {
      const result = registry.getDomain('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getExtensionsForDomain', () => {
    it('should return all extensions for a domain', async () => {
      const testExtension2: Extension = {
        id: 'gts.hai3.mfes.ext.extension.v1~test.testorg.query.extension2.v1',
        domain: testDomain.id,
        entry: testEntry.id,
      };

      // Register domain
      registry.registerDomain(testDomain);

      // Mock resolveEntry by pre-caching both extensions
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
      internals.extensions.set(testExtension2.id, {
        extension: testExtension2,
        entry: testEntry,
        bridge: null,
        loadState: 'idle',
        mountState: 'unmounted',
        container: null,
        lifecycle: null,
      });

      // Register extensions
      await registry.registerExtension(testExtension);
      await registry.registerExtension(testExtension2);

      const result = registry.getExtensionsForDomain(testDomain.id);
      expect(result).toHaveLength(2);
      expect(result.some(ext => ext.id === testExtension.id)).toBe(true);
      expect(result.some(ext => ext.id === testExtension2.id)).toBe(true);
    });

    it('should return empty array for domain with no extensions', () => {
      registry.registerDomain(testDomain);

      const result = registry.getExtensionsForDomain(testDomain.id);
      expect(result).toEqual([]);
    });

    it('should return empty array for unregistered domain', () => {
      const result = registry.getExtensionsForDomain('nonexistent');
      expect(result).toEqual([]);
    });
  });
});
