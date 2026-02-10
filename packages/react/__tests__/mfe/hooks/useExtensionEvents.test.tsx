/**
 * Tests for useExtensionEvents hook - Phase 20.4
 *
 * Tests extension registration event subscription and filtering by domain.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { HAI3Provider } from '../../../src/HAI3Provider';
import { useExtensionEvents } from '../../../src/mfe/hooks/useExtensionEvents';
import { createHAI3 } from '@hai3/framework';
import { screensets } from '@hai3/framework';
import { effects } from '@hai3/framework';
import { microfrontends } from '@hai3/framework';
import type { Extension, ExtensionDomain } from '@hai3/screensets';
import type { HAI3App } from '@hai3/framework';

describe('useExtensionEvents hook - Phase 20.4', () => {
  const sidebarDomainId = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1';
  const popupDomainId = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1';

  // Track app instances for cleanup
  const apps: HAI3App[] = [];
  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps.length = 0;
  });

  const mockSidebarDomain: ExtensionDomain = {
    id: sidebarDomainId,
    sharedProperties: [],
    actions: ['gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1'],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [],
    extensionsLifecycleStages: [],
  };

  const mockPopupDomain: ExtensionDomain = {
    id: popupDomainId,
    sharedProperties: [],
    actions: ['gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1'],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [],
    extensionsLifecycleStages: [],
  };

  const sidebarExtension1: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.sidebar.reg.ext1.v1',
    domain: sidebarDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.sidebar.reg.entry.v1',
  };

  const sidebarExtension2: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.sidebar.reg.ext2.v1',
    domain: sidebarDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.sidebar.reg.entry.v1',
  };

  const popupExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.popup.reg.ext1.v1',
    domain: popupDomainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.sidebar.reg.entry.v1',
  };

  /**
   * Helper: build app and mock registerExtension/unregisterExtension to bypass
   * GTS validation while still emitting events and tracking extensions.
   * The hook under test relies on events + getExtensionsForDomain(), so we mock
   * the registration methods to populate the registry's query results.
   */
  function buildApp(): HAI3App {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(microfrontends())
      .build();
    apps.push(app);

    // Store registered extensions for getExtensionsForDomain mock
    const registeredExtensions = new Map<string, Extension>();

    // Mock registerExtension to bypass validation, emit event, and track
    const origRegisterDomain = app.screensetsRegistry.registerDomain.bind(app.screensetsRegistry);
    app.screensetsRegistry.registerDomain = (domain: ExtensionDomain) => {
      origRegisterDomain(domain);
    };

    // Access internal eventEmitter for test event emission
    const eventEmitter = (app.screensetsRegistry as unknown as { eventEmitter: { emit: (event: string, data: Record<string, unknown>) => void } }).eventEmitter;

    app.screensetsRegistry.registerExtension = vi.fn(async (ext: Extension) => {
      registeredExtensions.set(ext.id, ext);
      eventEmitter.emit('extensionRegistered', { extensionId: ext.id });
    });

    app.screensetsRegistry.unregisterExtension = vi.fn(async (extId: string) => {
      registeredExtensions.delete(extId);
      eventEmitter.emit('extensionUnregistered', { extensionId: extId });
    });

    // Mock getExtensionsForDomain to return from our tracked map
    app.screensetsRegistry.getExtensionsForDomain = vi.fn((domainId: string) => {
      return Array.from(registeredExtensions.values()).filter(e => e.domain === domainId);
    });

    return app;
  }

  function buildWrapper(app: HAI3App) {
    return ({ children }: { children: React.ReactNode }) => (
      <HAI3Provider app={app}>{children}</HAI3Provider>
    );
  }

  describe('20.4.2 - Subscribe to extensionRegistered event', () => {
    it('should return extensions for the specified domain', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);
      app.screensetsRegistry.registerDomain(mockPopupDomain);
      await app.screensetsRegistry.registerExtension(sidebarExtension1);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(sidebarExtension1.id);
    });

    it('should update when extension is registered', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(0);

      await act(async () => {
        await app.screensetsRegistry.registerExtension(sidebarExtension1);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
      });

      expect(result.current[0].id).toBe(sidebarExtension1.id);
    });
  });

  describe('20.4.3 - Subscribe to extensionUnregistered event', () => {
    it('should update when extension is unregistered', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);
      await app.screensetsRegistry.registerExtension(sidebarExtension1);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(1);

      await act(async () => {
        await app.screensetsRegistry.unregisterExtension(sidebarExtension1.id);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(0);
      });
    });
  });

  describe('20.4.4 - Filter events by domainId', () => {
    it('should only return extensions for the specified domain', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);
      app.screensetsRegistry.registerDomain(mockPopupDomain);

      await app.screensetsRegistry.registerExtension(sidebarExtension1);
      await app.screensetsRegistry.registerExtension(sidebarExtension2);
      await app.screensetsRegistry.registerExtension(popupExtension);

      const { result: sidebarResult } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });
      const { result: popupResult } = renderHook(() => useExtensionEvents(popupDomainId), { wrapper: buildWrapper(app) });

      expect(sidebarResult.current).toHaveLength(2);
      expect(sidebarResult.current.map(e => e.id)).toContain(sidebarExtension1.id);
      expect(sidebarResult.current.map(e => e.id)).toContain(sidebarExtension2.id);

      expect(popupResult.current).toHaveLength(1);
      expect(popupResult.current[0].id).toBe(popupExtension.id);
    });

    it('should not trigger re-render for extensions in other domains', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);
      app.screensetsRegistry.registerDomain(mockPopupDomain);

      await app.screensetsRegistry.registerExtension(sidebarExtension1);

      const renderSpy = vi.fn();
      const { result } = renderHook(
        () => {
          renderSpy();
          return useExtensionEvents(sidebarDomainId);
        },
        { wrapper: buildWrapper(app) }
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      await act(async () => {
        await app.screensetsRegistry.registerExtension(popupExtension);
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      // Sidebar hook should not have re-rendered (popup extension doesn't belong to sidebar)
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(sidebarExtension1.id);
    });
  });

  describe('20.4.5 - Return current extensions for domain', () => {
    it('should return all current extensions for domain', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);

      await app.screensetsRegistry.registerExtension(sidebarExtension1);
      await app.screensetsRegistry.registerExtension(sidebarExtension2);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(2);
      expect(result.current.map(e => e.id)).toContain(sidebarExtension1.id);
      expect(result.current.map(e => e.id)).toContain(sidebarExtension2.id);
    });

    it('should return empty array for domain with no extensions', () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toEqual([]);
    });
  });

  describe('20.4.6 - Trigger re-render on changes', () => {
    it('should re-render when extensions change', async () => {
      const app = buildApp();
      app.screensetsRegistry.registerDomain(mockSidebarDomain);

      const { result } = renderHook(() => useExtensionEvents(sidebarDomainId), { wrapper: buildWrapper(app) });

      expect(result.current).toHaveLength(0);

      await act(async () => {
        await app.screensetsRegistry.registerExtension(sidebarExtension1);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
      });

      await act(async () => {
        await app.screensetsRegistry.registerExtension(sidebarExtension2);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(2);
      });

      await act(async () => {
        await app.screensetsRegistry.unregisterExtension(sidebarExtension1.id);
      });

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe(sidebarExtension2.id);
      });
    });
  });
});
