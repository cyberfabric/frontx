/**
 * Tests for useActivePackage hook - Phase 39.6
 *
 * Tests active GTS package observation via store subscription.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { HAI3Provider } from '../../../src/HAI3Provider';
import { useActivePackage } from '../../../src/mfe/hooks/useActivePackage';
import { createHAI3 } from '@hai3/framework';
import { screensets } from '@hai3/framework';
import { effects } from '@hai3/framework';
import { microfrontends } from '@hai3/framework';
import { HAI3_SCREEN_DOMAIN } from '@hai3/framework';
import type { Extension, ExtensionDomain } from '@hai3/framework';
import { ContainerProvider } from '@hai3/framework';
import type { HAI3App } from '@hai3/framework';

// Mock Container Provider for React tests
class TestContainerProvider extends ContainerProvider {
  private mockContainer: Element;

  constructor() {
    super();
    this.mockContainer = document.createElement('div');
  }

  getContainer(_extensionId: string): Element {
    return this.mockContainer;
  }

  releaseContainer(_extensionId: string): void {
    // no-op
  }
}

describe('useActivePackage hook - Phase 39.6', () => {
  // Track app instances for cleanup
  const apps: HAI3App[] = [];
  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps.length = 0;
  });

  const mockScreenDomain: ExtensionDomain = {
    id: HAI3_SCREEN_DOMAIN,
    sharedProperties: [],
    actions: [
      'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1',
      'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
      'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1',
    ],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [],
    extensionsLifecycleStages: [],
  };

  const demoExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.home.v1',
    domain: HAI3_SCREEN_DOMAIN,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.active.package.entry.v1',
  };

  const otherExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.other.screens.profile.v1',
    domain: HAI3_SCREEN_DOMAIN,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.active.package.entry.v1',
  };

  /**
   * Helper: build app and mock mount-related methods to bypass
   * GTS validation while still dispatching store actions and tracking mount state.
   * The hook subscribes to store changes and calls getMountedExtension(HAI3_SCREEN_DOMAIN).
   */
  function buildApp(): HAI3App {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(microfrontends())
      .build();
    apps.push(app);

    // Track mounted extension for screen domain
    let mountedExtensionId: string | undefined;

    // Mock registerExtension to bypass validation
    const origRegisterDomain = app.screensetsRegistry.registerDomain.bind(app.screensetsRegistry);
    app.screensetsRegistry.registerDomain = (domain: ExtensionDomain) => {
      origRegisterDomain(domain);
    };

    app.screensetsRegistry.registerExtension = vi.fn(async (_ext: Extension) => {
      // No-op for this test, just need to bypass validation
    });

    // Mock mount/unmount to track state and dispatch
    app.screensetsRegistry.executeActionsChain = vi.fn(async (chain) => {
      const action = chain.action;
      if (action.type === 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1') {
        const payload = action.payload as { extensionId: string };
        if (action.target === HAI3_SCREEN_DOMAIN) {
          mountedExtensionId = payload.extensionId;
          app.store.dispatch({ type: 'mfe/setExtensionMounted', payload: { extensionId: payload.extensionId, domainId: HAI3_SCREEN_DOMAIN } });
        }
      } else if (action.type === 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1') {
        if (action.target === HAI3_SCREEN_DOMAIN) {
          mountedExtensionId = undefined;
          app.store.dispatch({ type: 'mfe/setExtensionUnmounted', payload: { domainId: HAI3_SCREEN_DOMAIN } });
        }
      }
    });

    // Mock getMountedExtension to return from our tracked state
    app.screensetsRegistry.getMountedExtension = vi.fn((domainId: string) => {
      if (domainId === HAI3_SCREEN_DOMAIN) {
        return mountedExtensionId;
      }
      return undefined;
    });

    return app;
  }

  function buildWrapper(app: HAI3App) {
    return ({ children }: { children: React.ReactNode }) => (
      <HAI3Provider app={app}>{children}</HAI3Provider>
    );
  }

  describe('Active package tracking', () => {
    it('39.6.14 should return GTS package of mounted screen extension', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.screensetsRegistry.registerDomain(mockScreenDomain, testContainerProvider);

      // Mount demo extension
      await app.screensetsRegistry.executeActionsChain({
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
          target: HAI3_SCREEN_DOMAIN,
          payload: { extensionId: demoExtension.id },
        },
      });

      const { result } = renderHook(() => useActivePackage(), { wrapper: buildWrapper(app) });

      expect(result.current).toBe('hai3.demo');
    });

    it('39.6.14 should return undefined when no screen extension is mounted', () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.screensetsRegistry.registerDomain(mockScreenDomain, testContainerProvider);

      const { result } = renderHook(() => useActivePackage(), { wrapper: buildWrapper(app) });

      expect(result.current).toBeUndefined();
    });

    it('should update when screen extension is mounted', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.screensetsRegistry.registerDomain(mockScreenDomain, testContainerProvider);

      const { result } = renderHook(() => useActivePackage(), { wrapper: buildWrapper(app) });

      expect(result.current).toBeUndefined();

      await act(async () => {
        await app.screensetsRegistry.executeActionsChain({
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
            target: HAI3_SCREEN_DOMAIN,
            payload: { extensionId: demoExtension.id },
          },
        });
      });

      await waitFor(() => {
        expect(result.current).toBe('hai3.demo');
      });
    });

    it('should update when screen extension is unmounted', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.screensetsRegistry.registerDomain(mockScreenDomain, testContainerProvider);

      // Mount demo extension
      await app.screensetsRegistry.executeActionsChain({
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
          target: HAI3_SCREEN_DOMAIN,
          payload: { extensionId: demoExtension.id },
        },
      });

      const { result } = renderHook(() => useActivePackage(), { wrapper: buildWrapper(app) });

      expect(result.current).toBe('hai3.demo');

      await act(async () => {
        await app.screensetsRegistry.executeActionsChain({
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1',
            target: HAI3_SCREEN_DOMAIN,
            payload: { extensionId: demoExtension.id },
          },
        });
      });

      await waitFor(() => {
        expect(result.current).toBeUndefined();
      });
    });

    it('should update when different screen extension is mounted', async () => {
      const app = buildApp();
      const testContainerProvider = new TestContainerProvider();
      app.screensetsRegistry.registerDomain(mockScreenDomain, testContainerProvider);

      // Mount demo extension
      await app.screensetsRegistry.executeActionsChain({
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
          target: HAI3_SCREEN_DOMAIN,
          payload: { extensionId: demoExtension.id },
        },
      });

      const { result } = renderHook(() => useActivePackage(), { wrapper: buildWrapper(app) });

      expect(result.current).toBe('hai3.demo');

      await act(async () => {
        // Unmount demo
        await app.screensetsRegistry.executeActionsChain({
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1',
            target: HAI3_SCREEN_DOMAIN,
            payload: { extensionId: demoExtension.id },
          },
        });

        // Mount other
        await app.screensetsRegistry.executeActionsChain({
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1',
            target: HAI3_SCREEN_DOMAIN,
            payload: { extensionId: otherExtension.id },
          },
        });
      });

      await waitFor(() => {
        expect(result.current).toBe('hai3.other');
      });
    });
  });
});
