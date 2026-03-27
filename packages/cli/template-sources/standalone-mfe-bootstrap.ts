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
import { bootstrapMfeDomains } from '@hai3/react';

/**
 * Bootstrap MFE system for the host application.
 * Registers the four extension domains. Add your own manifest/extension
 * registration after this, then return the screen extensions so
 * MfeScreenContainer can handle URL routing and mounting.
 *
 * @param app - HAI3 application instance
 * @param screenContainerRef - React ref for the screen domain container element
 * @param queryClient - optional host-owned QueryClient for shared cache across MFE roots
 */
export async function bootstrapMFE(
  app: HAI3App,
  screenContainerRef: React.RefObject<HTMLDivElement>,
  queryClient?: QueryClient
): Promise<ScreenExtension[]> {
  await bootstrapMfeDomains(app, screenContainerRef, queryClient);

  // Standalone: no extensions registered by default.
  // Register your MFE manifests and extensions, then return the screen extensions
  // so MfeScreenContainer can handle URL routing.
  return [];
}
