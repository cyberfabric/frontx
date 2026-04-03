/**
 * bootstrapMfeDomains tests
 *
 * Verifies repeated bootstrap calls do not re-wrap the registry action chain.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { QueryClient } from '@tanstack/react-query';
import type { HAI3App, ActionsChain, ScreensetsRegistry } from '@cyberfabric/framework';
import { bootstrapMfeDomains } from '../../src/mfe/bootstrapMfeCore';

describe('bootstrapMfeDomains', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a shared mount-context resolver without wrapping executeActionsChain', async () => {
    const screenContainerRef = {
      current: document.createElement('div'),
    } as RefObject<HTMLDivElement | null>;

    const originalExecuteActionsChain = vi.fn<(chain: ActionsChain) => Promise<void>>()
      .mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const registry = {
      registerDomain: vi.fn(),
      updateSharedProperty: vi.fn(),
      setMountContextResolver: vi.fn(),
      executeActionsChain: originalExecuteActionsChain,
    } as ScreensetsRegistry;
    const app = {
      screensetsRegistry: registry,
      queryClient,
      themeRegistry: {
        getCurrent: vi.fn().mockReturnValue({ id: 'default' }),
      },
      i18nRegistry: {
        getLanguage: vi.fn().mockReturnValue('en'),
      },
    } as HAI3App;

    await bootstrapMfeDomains(app, screenContainerRef);
    await bootstrapMfeDomains(app, screenContainerRef);

    expect(registry.executeActionsChain).toBe(originalExecuteActionsChain);
    expect(registry.setMountContextResolver).toHaveBeenCalledTimes(2);

    // Resolver return type is MfeMountValues; DefaultMountManager wraps it as mountContext.values.
    const resolver = vi.mocked(registry.setMountContextResolver).mock.calls[1]?.[0];
    expect(resolver?.('test-extension', 'screen')).toEqual({
      queryClient: app.queryClient,
    });

    await registry.executeActionsChain({
      action: {
        type: 'test.action',
        target: 'screen',
        payload: { extensionId: 'test-extension' },
      },
    });

    expect(originalExecuteActionsChain).toHaveBeenCalledTimes(1);
  });
});
