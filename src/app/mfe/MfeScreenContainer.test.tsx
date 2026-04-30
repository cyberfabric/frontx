import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HAI3App, ScreenExtension } from '@cyberfabric/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { RefObject } from 'react';

const mockBootstrapMFE = vi.fn();
const mockUseHAI3 = vi.fn();
const mockScreenDomain = { id: 'screen-domain' };

vi.mock('./bootstrap', () => ({
  bootstrapMFE: (app: HAI3App, screenContainerRef: RefObject<HTMLDivElement | null>) =>
    mockBootstrapMFE(app, screenContainerRef),
}));

vi.mock('@cyberfabric/react', async (importOriginal) => ({
  ...(await importOriginal()),
  useHAI3: () => mockUseHAI3(),
  screenDomain: mockScreenDomain,
  ExtensionDomainSlot: ({
    domainId,
    extensionId,
    className,
  }: {
    domainId: string;
    extensionId: string;
    className?: string;
  }) => (
    <div
      data-testid="extension-domain-slot"
      data-domain-id={domainId}
      data-extension-id={extensionId}
      data-class-name={className}
    />
  ),
}));

describe('MfeScreenContainer', () => {
  let mountedExtensionId: string | null | undefined;
  let notifyStoreChange: (() => void) | undefined;
  let registeredScreenExtensions: ScreenExtension[];
  let app: {
    store: { subscribe: ReturnType<typeof vi.fn> };
    mfeRegistry: {
      getMountedExtension: ReturnType<typeof vi.fn>;
      getExtensionsForDomain: ReturnType<typeof vi.fn>;
    };
  };

  const setScreenExtensions = (extensions: ScreenExtension[]) => {
    registeredScreenExtensions = extensions;
    mockBootstrapMFE.mockResolvedValue(extensions);
  };

  beforeEach(() => {
    mountedExtensionId = undefined;
    notifyStoreChange = undefined;
    registeredScreenExtensions = [];
    app = {
      store: {
        subscribe: vi.fn((listener: () => void) => {
          notifyStoreChange = listener;
          return vi.fn();
        }),
      },
      mfeRegistry: {
        getMountedExtension: vi.fn(() => mountedExtensionId),
        getExtensionsForDomain: vi.fn(
          (domainId: string) =>
            domainId === mockScreenDomain.id ? registeredScreenExtensions : [],
        ),
      },
    };
    mockUseHAI3.mockReturnValue(app);
    mockBootstrapMFE.mockReset();
    globalThis.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.history.pushState({}, '', '/');
  });

  it('bootstraps the MFE runtime only once', async () => {
    setScreenExtensions([]);
    const { MfeScreenContainer } = await import('./MfeScreenContainer');

    const { rerender } = render(<MfeScreenContainer />);
    rerender(<MfeScreenContainer />);

    await waitFor(() => {
      expect(mockBootstrapMFE).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the active mounted extension when one exists', async () => {
    setScreenExtensions([
      { id: 'screen.home', presentation: { route: '/home' } } as ScreenExtension,
      { id: 'screen.profile', presentation: { route: '/profile' } } as ScreenExtension,
    ]);
    const { MfeScreenContainer } = await import('./MfeScreenContainer');

    render(<MfeScreenContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('extension-domain-slot').dataset.extensionId).toBe(
        'screen.home',
      );
    });

    await act(async () => {
      mountedExtensionId = 'screen.profile';
      notifyStoreChange?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId('extension-domain-slot').dataset.extensionId).toBe(
        'screen.profile',
      );
    });
  });

  it('falls back to the URL-matched screen before anything is mounted', async () => {
    globalThis.history.pushState({}, '', '/profile');
    setScreenExtensions([
      { id: 'screen.home', presentation: { route: '/home' } } as ScreenExtension,
      { id: 'screen.profile', presentation: { route: '/profile' } } as ScreenExtension,
    ]);
    const { MfeScreenContainer } = await import('./MfeScreenContainer');

    render(<MfeScreenContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('extension-domain-slot').dataset.extensionId).toBe(
        'screen.profile',
      );
    });
  });

  it('falls back to the first registered screen when nothing is mounted or URL-matched', async () => {
    globalThis.history.pushState({}, '', '/missing');
    setScreenExtensions([
      { id: 'screen.home', presentation: { route: '/home' } } as ScreenExtension,
      { id: 'screen.profile', presentation: { route: '/profile' } } as ScreenExtension,
    ]);
    const { MfeScreenContainer } = await import('./MfeScreenContainer');

    render(<MfeScreenContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('extension-domain-slot').dataset.extensionId).toBe(
        'screen.home',
      );
    });
  });
});
