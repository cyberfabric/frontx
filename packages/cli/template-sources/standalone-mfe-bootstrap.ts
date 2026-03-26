/**
 * MFE Bootstrap (standalone project template)
 *
 * Registers MFE domains and shared properties. No mfe_packages or extensions
 * are registered. Initial screen mounting is owned by ExtensionDomainSlot once
 * its container ref is attached.
 * This file is imported in main.tsx via MfeScreenContainer.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { HAI3App, ScreenExtension } from '@hai3/react';
import {
  executeActionsChainWithMountContext,
  screenDomain,
  sidebarDomain,
  popupDomain,
  overlayDomain,
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
  RefContainerProvider,
} from '@hai3/react';

/**
 * DetachedContainerProvider for domains without a visible host element.
 */
class DetachedContainerProvider extends RefContainerProvider {
  constructor() {
    const detachedElement = document.createElement('div');
    super({ current: detachedElement });
  }
}

/**
 * Bootstrap MFE system for the host application.
 * Registers the four extension domains. Add your own manifest/extension
 * registration after this, then return screen extensions so
 * MfeScreenContainer can drive routing and mounting.
 *
 * @param app - HAI3 application instance
 * @param screenContainerRef - React ref for the screen domain container element
 */
export async function bootstrapMFE(
  app: HAI3App,
  screenContainerRef: React.RefObject<HTMLDivElement>,
  queryClient?: QueryClient
): Promise<ScreenExtension[]> {
  const screensetsRegistry = app.screensetsRegistry;
  if (!screensetsRegistry) {
    throw new Error('[MFE Bootstrap] screensetsRegistry is not available on app instance');
  }

  const screenContainerProvider = new RefContainerProvider(screenContainerRef);
  screensetsRegistry.registerDomain(screenDomain, screenContainerProvider);
  screensetsRegistry.registerDomain(sidebarDomain, new DetachedContainerProvider());
  screensetsRegistry.registerDomain(popupDomain, new DetachedContainerProvider());
  screensetsRegistry.registerDomain(overlayDomain, new DetachedContainerProvider());

  const currentThemeId = app.themeRegistry?.getCurrent()?.id ?? 'default';
  screensetsRegistry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, currentThemeId);
  screensetsRegistry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'en');

  if (queryClient) {
    // Ensure any later mount_ext action receives the host-owned QueryClient so
    // separate MFE React roots can share one cache.
    const origExecuteActionsChain = screensetsRegistry.executeActionsChain.bind(screensetsRegistry);
    screensetsRegistry.executeActionsChain = (async (chain: Parameters<typeof origExecuteActionsChain>[0]) => {
      await executeActionsChainWithMountContext(
        screensetsRegistry,
        chain,
        queryClient,
        origExecuteActionsChain,
      );
    }) as typeof screensetsRegistry.executeActionsChain;
  }

  // Standalone: no extensions registered by default.
  // Register your MFE manifests and extensions, then return the screen extensions
  // so MfeScreenContainer can handle URL routing.
  return [];
}
