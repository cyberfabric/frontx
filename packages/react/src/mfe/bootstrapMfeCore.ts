/**
 * Shared MFE bootstrap core utilities.
 *
 * Contains the domain registration, shared property setup, and QueryClient
 * chain patching that every host application needs. Callers (demo app,
 * CLI-scaffolded projects, standalone templates) use `bootstrapMfeDomains`
 * as a thin foundation and layer their own manifest/extension registration on top.
 */

import type { RefObject } from 'react';
import type { QueryClient } from '@tanstack/query-core';
import type { HAI3App, ScreensetsRegistry } from '@cyberfabric/framework';
import {
  screenDomain,
  sidebarDomain,
  popupDomain,
  overlayDomain,
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
} from '@cyberfabric/framework';
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
 * language), and optionally register a mount-context resolver so separately
 * mounted MFE roots reuse the host-owned `QueryClient`.
 *
 * @param app - HAI3 application instance
 * @param screenContainerRef - React ref pointing at the screen domain's DOM container
 * @param queryClient - optional host-owned QueryClient; when this or
 *   `app.queryClient` (from `queryCache()`) is set, the registry receives a
 *   mount-context resolver so all mount paths use the same shared cache
 * @returns the `screensetsRegistry` instance, ready for caller-specific
 *   manifest and extension registration
 */
export async function bootstrapMfeDomains(
  app: HAI3App,
  screenContainerRef: RefObject<HTMLDivElement | null>,
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
  const derivedLanguage = app.i18nRegistry.getLanguage();
  screensetsRegistry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, derivedLanguage ?? 'en');

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-shared-cache-bootstrap
  const sharedQueryClient = queryClient ?? app.queryClient;

  if (sharedQueryClient) {
    screensetsRegistry.setMountContextResolver(() => ({ queryClient: sharedQueryClient }));
  }
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-shared-cache-bootstrap

  return screensetsRegistry;
}
