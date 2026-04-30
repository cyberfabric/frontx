import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  eventBus,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_SCREEN_DOMAIN,
  type Extension,
  type ScreenExtension,
  type MfeRegistry,
} from '@cyberfabric/react';
import { STORAGE_KEYS } from '../types';
import { useRestoreGtsPackage, useRestoreStudioSettings } from './useRestoreStudioSettings';

const typeSystemStub = {
  name: 'test-type-system',
  version: '1.0.0',
  registerSchema: vi.fn(),
  getSchema: vi.fn(),
  register: vi.fn(),
  validateInstance: vi.fn(() => ({ valid: true, errors: [] })),
  isTypeOf: vi.fn(() => false),
};

function createMfeRegistryStub(
  overrides: Partial<MfeRegistry> = {}
) {
  return {
    typeSystem: typeSystemStub,
    registerDomain: vi.fn(),
    unregisterDomain: vi.fn(async () => undefined),
    registerExtension: vi.fn(async () => undefined),
    unregisterExtension: vi.fn(async () => undefined),
    updateSharedProperty: vi.fn(),
    getDomainProperty: vi.fn(),
    executeActionsChain: vi.fn(async () => undefined),
    triggerLifecycleStage: vi.fn(async () => undefined),
    triggerDomainLifecycleStage: vi.fn(async () => undefined),
    triggerDomainOwnLifecycleStage: vi.fn(async () => undefined),
    getExtension: vi.fn(),
    getDomain: vi.fn(),
    getExtensionsForDomain: vi.fn(() => []),
    getMountedExtension: vi.fn(),
    getRegisteredPackages: vi.fn(() => []),
    getExtensionsForPackage: vi.fn(() => []),
    getParentBridge: vi.fn(() => null),
    setTheme: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  } satisfies MfeRegistry;
}

vi.mock('@cyberfabric/react', () => ({
  eventBus: {
    emit: vi.fn(),
  },
  HAI3_ACTION_MOUNT_EXT: 'test/mount-ext',
  HAI3_SCREEN_DOMAIN: 'screen',
}));

describe('useRestoreStudioSettings', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('re-emits persisted theme, language, and mock settings once', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify('midnight'));
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('fr'));
    localStorage.setItem(STORAGE_KEYS.MOCK_ENABLED, JSON.stringify(true));

    const { rerender } = renderHook(() => useRestoreStudioSettings());

    rerender();

    expect(eventBus.emit).toHaveBeenCalledTimes(3);
    expect(eventBus.emit).toHaveBeenNthCalledWith(1, 'theme/changed', { themeId: 'midnight' });
    expect(eventBus.emit).toHaveBeenNthCalledWith(2, 'i18n/language/changed', { language: 'fr' });
    expect(eventBus.emit).toHaveBeenNthCalledWith(3, 'mock/toggle', { enabled: true });
  });

  it('skips empty persisted values', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(''));
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify(''));
    localStorage.setItem(STORAGE_KEYS.MOCK_ENABLED, JSON.stringify(null));

    renderHook(() => useRestoreStudioSettings());

    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

describe('useRestoreGtsPackage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('mounts the first available screen extension for the persisted package', async () => {
    expect.assertions(2);

    localStorage.setItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID, JSON.stringify('hai3.demo'));
    const executeActionsChain = vi.fn(async () => undefined);
    const secondScreenExtension: ScreenExtension = {
      id: 'extension:second',
      domain: HAI3_SCREEN_DOMAIN,
      entry: 'entry:second',
      presentation: {
        label: 'Second',
        route: '/second',
        order: 2,
      },
    };
    const firstScreenExtension: ScreenExtension = {
      id: 'extension:first',
      domain: HAI3_SCREEN_DOMAIN,
      entry: 'entry:first',
      presentation: {
        label: 'First',
        route: '/first',
        order: 1,
      },
    };
    const extensions: Extension[] = [
      {
        id: 'extension:non-screen',
        domain: 'not-screen',
        entry: 'entry:non-screen',
      },
      secondScreenExtension,
      firstScreenExtension,
    ];
    const registry = createMfeRegistryStub({
      getExtensionsForPackage: vi.fn(() => extensions),
      executeActionsChain,
    });
    const initialProps: { currentRegistry: MfeRegistry | null } = {
      currentRegistry: null,
    };

    const { rerender } = renderHook(
      ({ currentRegistry }: { currentRegistry: MfeRegistry | null }) => {
        useRestoreGtsPackage(currentRegistry);
      },
      {
        initialProps,
      }
    );

    rerender({ currentRegistry: registry });

    await waitFor(() => {
      expect(executeActionsChain).toHaveBeenCalledWith({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: HAI3_SCREEN_DOMAIN,
          payload: { subject: 'extension:first' },
        },
      });
    });

    rerender({ currentRegistry: registry });
    expect(executeActionsChain).toHaveBeenCalledTimes(1);
  });

  it('swallows registry restore failures', async () => {
    expect.assertions(2);

    localStorage.setItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID, JSON.stringify('hai3.demo'));
    const registry = createMfeRegistryStub({
      getExtensionsForPackage: vi.fn(() => {
        throw new Error('boom');
      }),
    });

    renderHook(() => useRestoreGtsPackage(registry));

    await waitFor(() => {
      expect(registry.getExtensionsForPackage).toHaveBeenCalledWith('hai3.demo');
    });

    expect(registry.executeActionsChain).not.toHaveBeenCalled();
  });
});
