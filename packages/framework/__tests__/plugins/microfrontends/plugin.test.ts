/**
 * Tests for microfrontends plugin - Phase 13
 *
 * Tests Flux integration: actions, effects, slice, components, navigation.
 * Phase 7.9 tests (plugin propagation, JSON loading) are in microfrontends.test.ts.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHAI3 } from '../../../src/createHAI3';
import { screensets } from '../../../src/plugins/screensets';
import { effects } from '../../../src/plugins/effects';
import {
  microfrontends,
  loadExtension,
  unmountExtension,
  MfeEvents,
  selectExtensionState,
  selectExtensionError,
  selectMountedExtension,
} from '../../../src/plugins/microfrontends';
import { eventBus, resetStore } from '@cyberfabric/state';
import { HAI3_ACTION_MOUNT_EXT, screensetsRegistryFactory, type Extension } from '@cyberfabric/screensets';
import { gtsPlugin } from '@cyberfabric/screensets/plugins/gts';
import type { HAI3App } from '../../../src/types';

describe('microfrontends plugin - Phase 13', () => {
  let apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps = [];
    vi.restoreAllMocks();
    resetStore();
  });
  describe('13.8.1 - plugin registration', () => {
    it('should register plugin with Flux wiring', () => {
      const plugin = microfrontends({ typeSystem: gtsPlugin });

      expect(plugin.name).toBe('microfrontends');
      expect(plugin.dependencies).toContain('screensets');
      expect(plugin.provides).toBeDefined();
      expect(plugin.provides?.registries).toBeDefined();
      expect(plugin.provides?.slices).toBeDefined();
      expect(plugin.provides?.slices?.length).toBeGreaterThan(0);
      // NOTE: Effects are NOT in provides.effects - they are initialized in onInit
      // to avoid duplicate event listeners (framework calls provides.effects at step 5,
      // then onInit at step 7). We need cleanup references, so only init in onInit.
      expect(plugin.provides?.actions).toBeDefined();
    });

    it('should provide MFE actions', () => {
      const plugin = microfrontends({ typeSystem: gtsPlugin });

      expect(plugin.provides?.actions).toHaveProperty('loadExtension');
      expect(plugin.provides?.actions).toHaveProperty('mountExtension');
      expect(plugin.provides?.actions).toHaveProperty('unmountExtension');
      expect(plugin.provides?.actions).not.toHaveProperty('handleMfeHostAction');
    });

    it('should make MFE actions available on app.actions', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      expect(typeof app.actions.loadExtension).toBe('function');
      expect(typeof app.actions.mountExtension).toBe('function');
      expect(typeof app.actions.unmountExtension).toBe('function');
      expect(app.actions).not.toHaveProperty('handleMfeHostAction');
    });
  });

  describe('13.8.2 - MFE lifecycle actions call executeActionsChain', () => {
    it('should call executeActionsChain for loadExtension', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      // Mock getExtension to return extension (avoids GTS validation)
      const testDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1';
      const testExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext.v1';
      const testExtension: Extension = {
        id: testExtensionId,
        domain: testDomainId,
        entry: 'gts.hai3.mfes.mfe.entry.v1~test.app.test.entry.v1',
      };

      const registry = app.screensetsRegistry;
      if (!registry) throw new Error('expected screensetsRegistry');
      vi.spyOn(registry, 'getExtension').mockReturnValue(testExtension);
      const spy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue(undefined);

      // Call loadExtension - should call executeActionsChain fire-and-forget
      loadExtension(testExtensionId);

      expect(spy).toHaveBeenCalledWith({
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1~',
          target: testDomainId,
          payload: { subject: testExtensionId },
        },
      });
    });

    it('should throw when unmountExtension resolves a domain that is not registered on the registry', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const testDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1';
      const testExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext.v1';
      const testExtension: Extension = {
        id: testExtensionId,
        domain: testDomainId,
        entry: 'gts.hai3.mfes.mfe.entry.v1~test.app.test.entry.v1',
      };

      const registry = app.screensetsRegistry;
      if (!registry) throw new Error('expected screensetsRegistry');
      vi.spyOn(registry, 'getExtension').mockReturnValue(testExtension);
      vi.spyOn(registry, 'getDomain').mockReturnValue(undefined);
      const chainSpy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue(undefined);

      expect(() => unmountExtension(testExtensionId)).toThrow(
        /domain 'gts\.hai3\.mfes\.ext\.domain\.v1~test\.app\.test\.domain\.v1' is not registered.*extension 'gts\.hai3\.mfes\.ext\.extension\.v1~test\.app\.test\.ext\.v1'/
      );
      expect(chainSpy).not.toHaveBeenCalled();
    });

    it('should verify registration events still work', () => {
      const eventSpy = vi.fn();
      const unsub = eventBus.on(MfeEvents.RegisterExtensionRequested, eventSpy);

      const testExtension: Extension = {
        id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
        domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
      };

      // Use event bus directly (not the action, which is async)
      eventBus.emit(MfeEvents.RegisterExtensionRequested, { extension: testExtension });

      expect(eventSpy).toHaveBeenCalledWith({ extension: testExtension });

      unsub.unsubscribe();
    });
  });

  describe('13.8.3 - MFE slice (registration only)', () => {
    it('should initialize MFE slice in store', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const state = app.store.getState();
      expect(state).toHaveProperty('mfe');
      expect(state.mfe).toHaveProperty('registrationStates');
      expect(state.mfe).toHaveProperty('errors');
    });

    it('should track registration state via selectors', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const state = app.store.getState();

      // Initial state should be 'unregistered' for extensions not registered yet
      const uniqueExtId = 'test.unique.extension.v1';
      const registrationState = selectExtensionState(state, uniqueExtId);
      expect(registrationState).toBe('unregistered');

      const error = selectExtensionError(state, uniqueExtId);
      expect(error).toBeUndefined();
    });
  });

  describe('13.8.4 - mount state sync follows registry state', () => {
    it('does not mark the requested extension mounted when the chain resolves without mounting it', async () => {
      const fakeRegistry = {
        typeSystem: gtsPlugin,
        executeActionsChain: vi.fn().mockResolvedValue(undefined),
        getMountedExtension: vi.fn().mockReturnValue(undefined),
        registerExtension: vi.fn().mockResolvedValue(undefined),
        unregisterExtension: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(screensetsRegistryFactory, 'build').mockReturnValue(fakeRegistry as never);

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const domainId = 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1';
      const requestedExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.requested.ext.v1';

      await app.screensetsRegistry?.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: domainId,
          payload: { subject: requestedExtensionId },
        },
      });

      expect(selectMountedExtension(app.store.getState(), domainId)).toBeUndefined();
    });

    it('mirrors the registry mounted extension when a fallback path leaves a different extension mounted', async () => {
      const mountedByDomain = new Map<string, string | undefined>();
      const fakeRegistry = {
        typeSystem: gtsPlugin,
        executeActionsChain: vi.fn().mockImplementation(async (chain: { action: { target: string } }) => {
          mountedByDomain.set(
            chain.action.target,
            'gts.hai3.mfes.ext.extension.v1~test.app.fallback.ext.v1'
          );
        }),
        getMountedExtension: vi.fn((domainId: string) => mountedByDomain.get(domainId)),
        registerExtension: vi.fn().mockResolvedValue(undefined),
        unregisterExtension: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(screensetsRegistryFactory, 'build').mockReturnValue(fakeRegistry as never);

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const domainId = 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1';
      const requestedExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.requested.ext.v1';
      const fallbackExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.fallback.ext.v1';

      await app.screensetsRegistry?.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: domainId,
          payload: { subject: requestedExtensionId },
        },
      });

      expect(selectMountedExtension(app.store.getState(), domainId)).toBe(fallbackExtensionId);
    });

    it('syncs every domain touched by a chained mount/unmount sequence', async () => {
      const mountedByDomain = new Map<string, string | undefined>();
      const fakeRegistry = {
        typeSystem: gtsPlugin,
        executeActionsChain: vi.fn().mockImplementation(async (chain: {
          action: { target: string };
          next?: { action: { target: string } };
        }) => {
          mountedByDomain.set(
            chain.action.target,
            'gts.hai3.mfes.ext.extension.v1~test.app.root.ext.v1'
          );
          if (chain.next) {
            mountedByDomain.set(
              chain.next.action.target,
              'gts.hai3.mfes.ext.extension.v1~test.app.next.ext.v1'
            );
          }
        }),
        getMountedExtension: vi.fn((domainId: string) => mountedByDomain.get(domainId)),
        registerExtension: vi.fn().mockResolvedValue(undefined),
        unregisterExtension: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(screensetsRegistryFactory, 'build').mockReturnValue(fakeRegistry as never);

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const rootDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.root.domain.v1';
      const nextDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.next.domain.v1';
      const rootExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.requested.root.v1';
      const nextExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.requested.next.v1';

      await app.screensetsRegistry?.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: rootDomainId,
          payload: { subject: rootExtensionId },
        },
        next: {
          action: {
            type: HAI3_ACTION_MOUNT_EXT,
            target: nextDomainId,
            payload: { subject: nextExtensionId },
          },
        },
      });

      expect(selectMountedExtension(app.store.getState(), rootDomainId)).toBe(
        'gts.hai3.mfes.ext.extension.v1~test.app.root.ext.v1'
      );
      expect(selectMountedExtension(app.store.getState(), nextDomainId)).toBe(
        'gts.hai3.mfes.ext.extension.v1~test.app.next.ext.v1'
      );
    });

    it('does not dispatch mount sync for fallback-only domains that were never executed', async () => {
      const mountedByDomain = new Map<string, string | undefined>();
      const fakeRegistry = {
        typeSystem: gtsPlugin,
        executeActionsChain: vi.fn().mockImplementation(async (chain: { action: { target: string } }) => {
          mountedByDomain.set(
            chain.action.target,
            'gts.hai3.mfes.ext.extension.v1~test.app.root.ext.v1'
          );
        }),
        getMountedExtension: vi.fn((domainId: string) => mountedByDomain.get(domainId)),
        registerExtension: vi.fn().mockResolvedValue(undefined),
        unregisterExtension: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(screensetsRegistryFactory, 'build').mockReturnValue(fakeRegistry as never);

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      const rootDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.root.domain.v1';
      const fallbackDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.fallback.domain.v1';
      const rootExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.requested.root.v1';
      let notificationCount = 0;
      const unsubscribe = app.store.subscribe(() => {
        notificationCount += 1;
      });

      await app.screensetsRegistry?.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: rootDomainId,
          payload: { subject: rootExtensionId },
        },
        fallback: {
          action: {
            type: HAI3_ACTION_MOUNT_EXT,
            target: fallbackDomainId,
            payload: { subject: 'gts.hai3.mfes.ext.extension.v1~test.app.requested.fallback.v1' },
          },
        },
      });
      unsubscribe();

      expect(selectMountedExtension(app.store.getState(), rootDomainId)).toBe(
        'gts.hai3.mfes.ext.extension.v1~test.app.root.ext.v1'
      );
      expect(selectMountedExtension(app.store.getState(), fallbackDomainId)).toBeUndefined();
      expect(notificationCount).toBe(1);
    });
  });

  describe('13.8.8 - Navigation integration', () => {
    it('should initialize navigation integration', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      // Plugin should initialize navigation integration
      // This is tested indirectly via plugin onInit
      expect(app).toBeDefined();
    });

    it('should handle plugin cleanup', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ typeSystem: gtsPlugin }))
        .build();
      apps.push(app);

      // Should not throw on destroy (afterEach handles actual cleanup)
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
