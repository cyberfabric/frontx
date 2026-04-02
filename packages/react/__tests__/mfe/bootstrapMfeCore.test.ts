/**
 * bootstrapMfeDomains tests
 *
 * Verifies repeated bootstrap calls only register domains/shared properties and
 * never patch registry execution behavior.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { HAI3App, ActionsChain, ScreensetsRegistry } from '@cyberfabric/framework';
import { bootstrapMfeDomains } from '../../src/mfe/bootstrapMfeCore';

describe('bootstrapMfeDomains', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not wrap executeActionsChain during bootstrap', async () => {
    const screenContainerRef = {
      current: document.createElement('div'),
    } as RefObject<HTMLDivElement | null>;

    const originalExecuteActionsChain = vi.fn<(chain: ActionsChain) => Promise<void>>()
      .mockResolvedValue(undefined);
    const registry = {
      registerDomain: vi.fn(),
      updateSharedProperty: vi.fn(),
      executeActionsChain: originalExecuteActionsChain,
    } satisfies Pick<
      ScreensetsRegistry,
      'registerDomain' | 'updateSharedProperty' | 'executeActionsChain'
    >;
    const app = {
      screensetsRegistry: registry,
      themeRegistry: {
        getCurrent: vi.fn().mockReturnValue({ id: 'default' }),
      },
      i18nRegistry: {
        getLanguage: vi.fn().mockReturnValue('en'),
      },
    } as unknown as HAI3App;

    await bootstrapMfeDomains(app, screenContainerRef);
    await bootstrapMfeDomains(app, screenContainerRef);

    expect(registry.executeActionsChain).toBe(originalExecuteActionsChain);

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
