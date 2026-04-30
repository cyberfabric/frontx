/**
 * ExtensionDomainSlot tests
 *
 * Covers mount path when the host app has no queryCache() plugin:
 * HAI3Provider renders without QueryClientProvider, the app has no query cache handle, and the slot
 * must still mount via registry.executeActionsChain without mount-context wrapping.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  ExtensionDomainSlot,
  HAI3Provider,
} from '@cyberfabric/react';
import {
  createHAI3,
  screensets,
  effects,
  microfrontends,
  queryCache,
  screenDomain,
  HAI3_SCREEN_DOMAIN,
  HAI3_ACTION_MOUNT_EXT,
  gtsPlugin,
} from '@cyberfabric/framework';
import type { HAI3App, ParentMfeBridge } from '@cyberfabric/framework';

describe('ExtensionDomainSlot', () => {
  const apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach((app) => {
      app.destroy();
    });
    apps.length = 0;
    vi.restoreAllMocks();
  });

  function buildAppWithoutQueryCache(): HAI3App {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(microfrontends({ typeSystem: gtsPlugin }))
      .build();
    apps.push(app);
    return app;
  }

  it('mounts via registry.executeActionsChain when app has no queryCache plugin', async () => {
    const app = buildAppWithoutQueryCache();

    const registry = app.mfeRegistry;
    if (!registry) {
      throw new Error('expected mfeRegistry');
    }

    const extensionId = 'gts.hai3.mfes.ext.extension.v1~hai3.test.extension_domain_slot.ext.v1';
    const parentBridge: ParentMfeBridge = {
      instanceId: 'test-bridge',
      dispose: vi.fn(),
    };

    const execSpy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue(undefined);
    vi.spyOn(registry, 'getParentBridge').mockReturnValue(parentBridge);
    vi.spyOn(registry, 'getDomain').mockReturnValue(screenDomain);

    const { container } = render(
      <HAI3Provider app={app}>
        <ExtensionDomainSlot
          registry={registry}
          domainId={HAI3_SCREEN_DOMAIN}
          extensionId={extensionId}
        />
      </HAI3Provider>
    );

    await waitFor(() => {
      const slot = container.querySelector('[data-extension-id]');
      expect((slot as HTMLElement | null)?.dataset.bridgeActive).toBe('true');
    });

    expect(execSpy).toHaveBeenCalledWith({
      action: {
        type: HAI3_ACTION_MOUNT_EXT,
        target: HAI3_SCREEN_DOMAIN,
        payload: { subject: extensionId },
      },
    });
  });

  it('does not register mount context when queryCache plugin provides an app QueryClient', async () => {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(queryCache())
      .use(microfrontends({ typeSystem: gtsPlugin }))
      .build();
    apps.push(app);

    const registry = app.mfeRegistry;
    if (!registry) {
      throw new Error('expected mfeRegistry');
    }

    const extensionId = 'gts.hai3.mfes.ext.extension.v1~hai3.test.extension_domain_slot.qc.v1';
    const parentBridge: ParentMfeBridge = {
      instanceId: 'test-bridge-qc',
      dispose: vi.fn(),
    };

    const execSpy = vi.spyOn(registry, 'executeActionsChain').mockResolvedValue(undefined);
    vi.spyOn(registry, 'getParentBridge').mockReturnValue(parentBridge);
    vi.spyOn(registry, 'getDomain').mockReturnValue(screenDomain);

    const { container } = render(
      <HAI3Provider app={app}>
        <ExtensionDomainSlot
          registry={registry}
          domainId={HAI3_SCREEN_DOMAIN}
          extensionId={extensionId}
        />
      </HAI3Provider>
    );

    await waitFor(() => {
      const slot = container.querySelector('[data-extension-id]');
      expect((slot as HTMLElement | null)?.dataset.bridgeActive).toBe('true');
    });
    expect(execSpy).toHaveBeenCalledWith({
      action: {
        type: HAI3_ACTION_MOUNT_EXT,
        target: HAI3_SCREEN_DOMAIN,
        payload: { subject: extensionId },
      },
    });
  });

  it('keeps the mount host rendered while the extension is loading', async () => {
    const app = buildAppWithoutQueryCache();
    const registry = app.mfeRegistry;
    if (!registry) {
      throw new Error('expected mfeRegistry');
    }

    const extensionId = 'gts.hai3.mfes.ext.extension.v1~hai3.test.extension_domain_slot.loading.v1';
    let resolveMount: (() => void) | undefined;
    const mountPromise = new Promise<void>((resolve) => {
      resolveMount = resolve;
    });

    const execSpy = vi.spyOn(registry, 'executeActionsChain').mockImplementation(() => mountPromise);
    vi.spyOn(registry, 'getDomain').mockReturnValue(screenDomain);

    const { container, unmount } = render(
      <HAI3Provider app={app}>
        <ExtensionDomainSlot
          registry={registry}
          domainId={HAI3_SCREEN_DOMAIN}
          extensionId={extensionId}
        />
      </HAI3Provider>
    );

    await waitFor(() => {
      expect(execSpy).toHaveBeenCalled();
    });

    const slot = container.querySelector(`[data-extension-id="${extensionId}"]`);
    expect(slot).not.toBeNull();
    expect(slot?.textContent).toContain('Loading extension...');

    resolveMount?.();
    await waitFor(() => {
      expect(slot?.textContent).not.toContain('Loading extension...');
    });
    unmount();
  });
});
