/**
 * Lifecycle Stage Triggering Tests (Phase 19.6)
 *
 * Tests for lifecycle stage triggering on extensions and domains.
 *
 * NOTE: Lifecycle hooks contain actions chains with `action.target` fields that
 * reference domain/extension GTS IDs. GTS validates these via x-gts-ref.
 * To avoid deep GTS validation of nested lifecycle structures, tests that need
 * extensions with lifecycle hooks register the extension WITHOUT hooks first
 * (passes GTS validation), then directly test triggerLifecycleStage methods
 * using manually set internal state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createScreensetsRegistry, ScreensetsRegistry } from '../../../src/mfe/runtime';
import { createGtsPlugin } from '../../../src/mfe/plugins/gts';
import type { TypeSystemPlugin } from '../../../src/mfe/plugins/types';
import type { ExtensionDomain, Extension, MfeEntry, ActionsChain } from '../../../src/mfe/types';
import type { MfeEntryLifecycle, ChildMfeBridge } from '../../../src/mfe/handler/types';

// Helper to access private members for testing (replaces 'as any' with proper typing)
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

interface DomainStateShape {
  domain: ExtensionDomain;
  properties: Map<string, unknown>;
  extensions: Set<string>;
  propertySubscribers: Map<string, Set<(value: unknown) => void>>;
}

interface RegistryInternals {
  extensions: Map<string, ExtensionStateShape>;
  domains: Map<string, DomainStateShape>;
  triggerLifecycleStageInternal(entity: Extension | ExtensionDomain, stageId: string): Promise<void>;
}

function getRegistryInternals(registry: ScreensetsRegistry): RegistryInternals {
  return registry as unknown as RegistryInternals;
}

describe('Lifecycle Stage Triggering', () => {
  let registry: ScreensetsRegistry;
  let plugin: TypeSystemPlugin;

  const customStageId = 'gts.hai3.mfes.lifecycle.stage.v1~test.lifecycle.trigger.custom_stage.v1';
  const initStageId = 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1';

  const testDomain: ExtensionDomain = {
    id: 'gts.hai3.mfes.ext.domain.v1~test.lifecycle.trigger.domain.v1',
    sharedProperties: [],
    actions: [],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [
      initStageId,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      customStageId,
    ],
    extensionsLifecycleStages: [
      initStageId,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      customStageId,
    ],
  };

  const testEntry: MfeEntry = {
    id: 'gts.hai3.mfes.mfe.entry.v1~test.lifecycle.trigger.entry.v1',
    requiredProperties: [],
    optionalProperties: [],
    actions: [],
    domainActions: [],
  };

  const testExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.lifecycle.trigger.extension.v1',
    domain: testDomain.id,
    entry: testEntry.id,
  };

  /**
   * Pre-cache entry in the extensions map so resolveEntry() can find it.
   * This mirrors the pattern used in dynamic-registration.test.ts and query-methods.test.ts.
   */
  function preCacheEntry(): void {
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
  }

  beforeEach(() => {
    // Create fresh plugin and registry for each test
    plugin = createGtsPlugin();
    registry = createScreensetsRegistry({
      typeSystem: plugin,
      debug: false,
    });

    // Pre-register test entities with GTS
    plugin.register(testEntry);
    plugin.register({
      id: customStageId,
    });
  });

  describe('triggerLifecycleStage', () => {
    it('should execute hooks for a specific extension and stage', async () => {
      // Register domain and extension without hooks (passes GTS validation)
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Now add lifecycle hooks to the internal extension state
      const internals = getRegistryInternals(registry);
      const extensionState = internals.extensions.get(testExtension.id);
      if (!extensionState) throw new Error('Extension state not found');
      extensionState.extension = {
        ...testExtension,
        lifecycle: [
          {
            stage: customStageId,
            actions_chain: {
              action: {
                type: 'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action.v1',
                target: testDomain.id,
              },
            },
          },
        ],
      };

      // Spy on executeActionsChain to verify it gets called
      const spy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue({
        completed: true,
        path: [],
      });

      await registry.triggerLifecycleStage(testExtension.id, customStageId);

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it('should throw if extension not registered', async () => {
      await expect(
        registry.triggerLifecycleStage('nonexistent', customStageId)
      ).rejects.toThrow(/extension.*not registered/i);
    });
  });

  describe('triggerDomainLifecycleStage', () => {
    it('should execute hooks for all extensions in a domain', async () => {
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Add lifecycle hooks to the internal extension state
      const internals = getRegistryInternals(registry);
      const extensionState = internals.extensions.get(testExtension.id);
      if (!extensionState) throw new Error('Extension state not found');
      extensionState.extension = {
        ...testExtension,
        lifecycle: [
          {
            stage: customStageId,
            actions_chain: {
              action: {
                type: 'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action.v1',
                target: testDomain.id,
              },
            },
          },
        ],
      };

      const spy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue({
        completed: true,
        path: [],
      });

      await registry.triggerDomainLifecycleStage(testDomain.id, customStageId);

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it('should throw if domain not registered', async () => {
      await expect(
        registry.triggerDomainLifecycleStage('nonexistent', customStageId)
      ).rejects.toThrow(/domain.*not registered/i);
    });
  });

  describe('triggerDomainOwnLifecycleStage', () => {
    it('should execute hooks on the domain itself', async () => {
      // Register domain without hooks first (passes GTS validation)
      registry.registerDomain(testDomain);

      // Add lifecycle hooks to the internal domain state
      const internals = getRegistryInternals(registry);
      const domainState = internals.domains.get(testDomain.id);
      if (!domainState) throw new Error('Domain state not found');
      domainState.domain = {
        ...testDomain,
        lifecycle: [
          {
            stage: customStageId,
            actions_chain: {
              action: {
                type: 'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action.v1',
                target: testDomain.id,
              },
            },
          },
        ],
      };

      const spy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue({
        completed: true,
        path: [],
      });

      await registry.triggerDomainOwnLifecycleStage(testDomain.id, customStageId);

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it('should throw if domain not registered', async () => {
      await expect(
        registry.triggerDomainOwnLifecycleStage('nonexistent', customStageId)
      ).rejects.toThrow(/domain.*not registered/i);
    });
  });

  describe('automatic lifecycle integration', () => {
    it('should trigger init stage during registerExtension', async () => {
      // Spy on triggerLifecycleStageInternal to verify init is triggered
      const internals = getRegistryInternals(registry);
      const spy = vi.spyOn(internals, 'triggerLifecycleStageInternal').mockResolvedValue(undefined);

      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // registerExtension should trigger init lifecycle stage
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: testExtension.id }),
        initStageId
      );

      spy.mockRestore();
    });

    it('should trigger init stage during registerDomain', () => {
      const internals = getRegistryInternals(registry);
      const spy = vi.spyOn(internals, 'triggerLifecycleStageInternal').mockResolvedValue(undefined);

      registry.registerDomain(testDomain);

      // registerDomain should trigger init lifecycle stage (fire-and-forget)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: testDomain.id }),
        initStageId
      );

      spy.mockRestore();
    });

    it('should trigger activated stage during mountExtension', async () => {
      // Register domain and extension first
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Mock the handler to provide a lifecycle with mount/unmount methods
      const mockLifecycle = {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
      };

      // Set the lifecycle on the extension state
      const internals = getRegistryInternals(registry);
      const extensionState = internals.extensions.get(testExtension.id);
      if (!extensionState) throw new Error('Extension state not found');
      extensionState.lifecycle = mockLifecycle;
      extensionState.loadState = 'loaded';

      // Spy on triggerLifecycleStage to verify activated is triggered
      const spy = vi.spyOn(registry, 'triggerLifecycleStage').mockResolvedValue(undefined);

      // Mount the extension
      const container = document.createElement('div');
      await registry.mountExtension(testExtension.id, container);

      // mountExtension should trigger activated lifecycle stage
      expect(spy).toHaveBeenCalledWith(
        testExtension.id,
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1'
      );

      spy.mockRestore();
    });

    it('should trigger deactivated stage during unmountExtension', async () => {
      // Register domain and extension first
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Mock the handler and lifecycle
      const mockLifecycle = {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined),
      };

      const internals = getRegistryInternals(registry);
      const extensionState = internals.extensions.get(testExtension.id);
      if (!extensionState) throw new Error('Extension state not found');
      extensionState.lifecycle = mockLifecycle;
      extensionState.loadState = 'loaded';

      // Mount the extension first
      const container = document.createElement('div');
      await registry.mountExtension(testExtension.id, container);

      // Spy on triggerLifecycleStage to verify deactivated is triggered
      const spy = vi.spyOn(registry, 'triggerLifecycleStage').mockResolvedValue(undefined);

      // Unmount the extension
      await registry.unmountExtension(testExtension.id);

      // unmountExtension should trigger deactivated lifecycle stage
      expect(spy).toHaveBeenCalledWith(
        testExtension.id,
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1'
      );

      spy.mockRestore();
    });

    it('should trigger destroyed stage during unregisterExtension', async () => {
      // Register domain and extension first
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Spy on triggerLifecycleStage to verify destroyed is triggered
      const spy = vi.spyOn(registry, 'triggerLifecycleStage').mockResolvedValue(undefined);

      // Unregister the extension
      await registry.unregisterExtension(testExtension.id);

      // unregisterExtension should trigger destroyed lifecycle stage
      expect(spy).toHaveBeenCalledWith(
        testExtension.id,
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1'
      );

      spy.mockRestore();
    });
  });

  describe('hook execution order', () => {
    it('should execute hooks in declaration order', async () => {
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension);

      // Add multiple hooks for the same stage
      const internals = getRegistryInternals(registry);
      const extensionState = internals.extensions.get(testExtension.id);
      if (!extensionState) throw new Error('Extension state not found');
      extensionState.extension = {
        ...testExtension,
        lifecycle: [
          {
            stage: customStageId,
            actions_chain: {
              action: {
                type: 'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action1.v1',
                target: testDomain.id,
              },
            },
          },
          {
            stage: customStageId,
            actions_chain: {
              action: {
                type: 'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action2.v1',
                target: testDomain.id,
              },
            },
          },
        ],
      };

      const callOrder: string[] = [];
      vi.spyOn(registry, 'executeActionsChain').mockImplementation(async (chain: ActionsChain) => {
        callOrder.push(chain.action.type);
        return { completed: true, path: [chain.action.type] };
      });

      await registry.triggerLifecycleStage(testExtension.id, customStageId);

      expect(callOrder).toEqual([
        'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action1.v1',
        'gts.hai3.mfes.comm.action.v1~test.lifecycle.trigger.action2.v1',
      ]);
    });
  });

  describe('entity with no lifecycle hooks', () => {
    it('should skip triggering gracefully', async () => {
      registry.registerDomain(testDomain);
      preCacheEntry();
      await registry.registerExtension(testExtension); // no lifecycle hooks

      await expect(
        registry.triggerLifecycleStage(testExtension.id, customStageId)
      ).resolves.not.toThrow();
    });
  });
});
