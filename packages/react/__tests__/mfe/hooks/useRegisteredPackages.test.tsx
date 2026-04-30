/**
 * Tests for useRegisteredPackages hook - Phase 39.6
 *
 * Tests registered packages observation via store subscription.
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { HAI3Provider, useRegisteredPackages } from '@cyberfabric/react';
import {
  createHAI3,
  effects,
  gtsPlugin,
  microfrontends,
  queryCache,
  screensets,
  TestContainerProvider,
  type ContainerProvider,
  type Extension,
  type ExtensionDomain,
  type HAI3App,
} from '@cyberfabric/framework';

describe('useRegisteredPackages hook - Phase 39.6', () => {
  const testDomainId = 'gts.hai3.mfes.ext.domain.v1~test.package.hooks.domain.v1';

  // Track app instances for cleanup
  const apps: HAI3App[] = [];
  afterEach(() => {
    apps.forEach((app) => {
      app.destroy();
    });
    apps.length = 0;
  });

  const mockDomain: ExtensionDomain = {
    id: testDomainId,
    sharedProperties: [],
    actions: [
      'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1~',
      'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1~',
    ],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [],
    extensionsLifecycleStages: [],
  };

  const demoExtension1: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.package.hooks.domain.v1~hai3.demo.ext1.v1',
    domain: testDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.package.hooks.entry.v1',
  };

  const demoExtension2: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.package.hooks.domain.v1~hai3.demo.ext2.v1',
    domain: testDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.package.hooks.entry.v1',
  };

  const otherExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.package.hooks.domain.v1~hai3.other.ext1.v1',
    domain: testDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.package.hooks.entry.v1',
  };

  /**
   * Helper: build app and mock registerExtension/unregisterExtension to bypass
   * GTS validation while still dispatching store actions and tracking packages.
   * The hook subscribes to store changes and calls getRegisteredPackages(),
   * so we mock the registration methods to populate package tracking and dispatch
   * an action to trigger store subscribers.
   */
  function buildApp(): HAI3App {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(queryCache())
      .use(microfrontends({ typeSystem: gtsPlugin }))
      .build();
    apps.push(app);

    if (!app.mfeRegistry) {
      throw new Error('Expected mfeRegistry');
    }
    const mfeRegistry = app.mfeRegistry;

    // Track packages for mock
    const packageMap = new Map<string, Set<string>>();

    // Mock registerExtension to bypass validation, dispatch action, and track packages
    const origRegisterDomain = mfeRegistry.registerDomain.bind(mfeRegistry);
    mfeRegistry.registerDomain = ((
      domain: ExtensionDomain,
      containerProvider: ContainerProvider,
      options?: Parameters<typeof mfeRegistry.registerDomain>[2]
    ) => {
      origRegisterDomain(domain, containerProvider, options);
    }) as typeof mfeRegistry.registerDomain;

    mfeRegistry.registerExtension = vi.fn(async (ext: Extension) => {
      // Extract package (simplified extraction for test)
      const instancePortion = ext.id.split('~')[ext.id.split('~').length - 1];
      const dotSegments = instancePortion.split('.');
      const packageId = `${dotSegments[0]}.${dotSegments[1]}`;

      if (!packageMap.has(packageId)) {
        packageMap.set(packageId, new Set());
      }
      packageMap.get(packageId)!.add(ext.id);

      // Dispatch any action to trigger store subscribers
      app.store.dispatch({ type: 'mfe/setExtensionRegistered', payload: { extensionId: ext.id } });
    });

    mfeRegistry.unregisterExtension = vi.fn(async (extId: string) => {
      // Remove from packages
      for (const [packageId, extensions] of packageMap.entries()) {
        if (extensions.has(extId)) {
          extensions.delete(extId);
          if (extensions.size === 0) {
            packageMap.delete(packageId);
          }
          break;
        }
      }

      // Dispatch any action to trigger store subscribers
      app.store.dispatch({ type: 'mfe/setExtensionUnregistered', payload: { extensionId: extId } });
    });

    // Mock getRegisteredPackages to return from our tracked map
    mfeRegistry.getRegisteredPackages = vi.fn(() => {
      return Array.from(packageMap.keys());
    });

    return app;
  }

  function buildWrapper(app: HAI3App) {
    return ({ children }: { children: React.ReactNode }) => (
      <HAI3Provider app={app}>{children}</HAI3Provider>
    );
  }

  describe('Store subscription', () => {
    it('39.6.13 should return registered packages from the registry', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);
      await app.mfeRegistry!.registerExtension(demoExtension1);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(1);
      expect(result.current).toContain('hai3.demo');
    });

    it('should return empty array when no extensions registered', () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toEqual([]);
    });

    it('should update when extension is registered', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(0);

      await act(async () => {
        await app.mfeRegistry!.registerExtension(demoExtension1);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
      });

      expect(result.current).toContain('hai3.demo');
    });

    it('should deduplicate packages from same package', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);

      await app.mfeRegistry!.registerExtension(demoExtension1);
      await app.mfeRegistry!.registerExtension(demoExtension2);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(1);
      expect(result.current).toEqual(['hai3.demo']);
    });

    it('should return multiple packages from different packages', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);

      await app.mfeRegistry!.registerExtension(demoExtension1);
      await app.mfeRegistry!.registerExtension(otherExtension);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(2);
      expect(result.current).toContain('hai3.demo');
      expect(result.current).toContain('hai3.other');
    });

    it('should update when extension is unregistered', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.mfeRegistry!.registerDomain(mockDomain, testContainerProvider);

      await app.mfeRegistry!.registerExtension(demoExtension1);
      await app.mfeRegistry!.registerExtension(demoExtension2);

      const { result } = renderHook(() => useRegisteredPackages(), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(1);

      await act(async () => {
        await app.mfeRegistry!.unregisterExtension(demoExtension1.id);
      });

      // Package still exists (demoExtension2 still registered)
      await waitFor(() => {
        expect(result.current).toHaveLength(1);
      });

      await act(async () => {
        await app.mfeRegistry!.unregisterExtension(demoExtension2.id);
      });

      // Package removed (last extension unregistered)
      await waitFor(() => {
        expect(result.current).toHaveLength(0);
      });
    });
  });
});
