/**
 * Shared MFE bootstrap core utilities.
 *
 * Contains the domain registration, shared property setup, and QueryClient
 * chain patching that every host application needs. Callers (demo app,
 * CLI-scaffolded projects, standalone templates) use `bootstrapMfeDomains`
 * as a thin foundation and layer their own manifest/extension registration on top.
 */

import type { QueryClient } from '@tanstack/query-core';
import type { HAI3App, ScreensetsRegistry } from '@hai3/framework';
import {
  screenDomain,
  sidebarDomain,
  popupDomain,
  overlayDomain,
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
} from '@hai3/framework';
import { executeActionsChainWithMountContext } from './executeActionsChainWithMountContext';
import { RefContainerProvider } from './components/RefContainerProvider';

/**
 * DetachedContainerProvider for domains that have no visible host element in
 * the current render tree (sidebar, popup, overlay).
 *
 * Creates an off-document div so the domain has a valid container without
 * requiring a rendered React ref.
 */
export class DetachedContainerProvider extends RefContainerProvider {
  constructor() {
    const detachedElement = document.createElement('div');
    super({ current: detachedElement });
  }
}

/**
 * Register the four standard MFE domains, set shared properties (theme,
 * language), and optionally patch the `executeActionsChain` so that
 * `mount_ext` actions triggered outside `ExtensionDomainSlot` still receive
 * the host-owned `QueryClient`.
 *
 * @param app - HAI3 application instance
 * @param screenContainerRef - React ref pointing at the screen domain's DOM container
 * @param queryClient - optional host-owned QueryClient; when supplied the
 *   registry's `executeActionsChain` is wrapped so separate MFE roots share
 *   one cache
 * @returns the `screensetsRegistry` instance, ready for caller-specific
 *   manifest and extension registration
 */
export async function bootstrapMfeDomains(
  app: HAI3App,
  screenContainerRef: React.RefObject<HTMLDivElement>,
  queryClient?: QueryClient,
): Promise<ScreensetsRegistry> {
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

  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-shared-cache-bootstrap
  if (queryClient) {
    // Ensure mount_ext actions triggered outside ExtensionDomainSlot still receive
    // the host-owned QueryClient and join the shared cache.
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
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-shared-cache-bootstrap

  return screensetsRegistry;
}
