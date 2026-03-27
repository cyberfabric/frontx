/**
 * ExtensionDomainSlot tests
 *
 * Covers mount path when the host app has no QueryClient (no queryCache() plugin):
 * HAI3Provider omits QueryClientProvider, app.queryClient is undefined, and the slot
 * must still mount via registry.executeActionsChain without mount-context wrapping.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HAI3Provider } from '../../src/HAI3Provider';
import { ExtensionDomainSlot } from '../../src/mfe/components/ExtensionDomainSlot';
import * as mountContext from '../../src/mfe/executeActionsChainWithMountContext';
import {
  createHAI3,
  screensets,
  effects,
  microfrontends,
  screenDomain,
  HAI3_SCREEN_DOMAIN,
  HAI3_ACTION_MOUNT_EXT,
  gtsPlugin,
} from '@hai3/framework';
import type { HAI3App, ParentMfeBridge } from '@hai3/framework';

describe('ExtensionDomainSlot', () => {
  const apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps.length = 0;
    vi.restoreAllMocks();
  });

  function buildAppWithoutQueryClient(): HAI3App {
    const app = createHAI3()
      .use(screensets())
      .use(effects())
      .use(microfrontends({ typeSystem: gtsPlugin }))
      .build();
    apps.push(app);
    return app;
  }

  it('mounts via registry.executeActionsChain when app has no QueryClient (no QueryClientProvider)', async () => {
    const app = buildAppWithoutQueryClient();
    expect(app.queryClient).toBeUndefined();

    const registry = app.screensetsRegistry;
    if (!registry) {
      throw new Error('expected screensetsRegistry');
    }

    const extensionId = 'gts.hai3.mfes.ext.extension.v1~hai3.test.extension_domain_slot.ext.v1';
    const parentBridge: ParentMfeBridge = {
      instanceId: 'test-bridge',
      dispose: vi.fn(),
    };

    const mountCtxSpy = vi.spyOn(mountContext, 'executeActionsChainWithMountContext');
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
      expect(slot?.getAttribute('data-bridge-active')).toBe('true');
    });

    expect(mountCtxSpy).not.toHaveBeenCalled();
    expect(execSpy).toHaveBeenCalledWith({
      action: {
        type: HAI3_ACTION_MOUNT_EXT,
        target: HAI3_SCREEN_DOMAIN,
        payload: { extensionId },
      },
    });
  });
});
