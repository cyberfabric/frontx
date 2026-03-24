/**
 * MFE Screen Container Component
 *
 * Bootstraps MFE domains and extensions, then declaratively renders the active
 * screen extension via ExtensionDomainSlot. Loading and error states are surfaced
 * automatically by the slot component.
 */

import { useRef, useEffect, useCallback, useSyncExternalStore, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useHAI3,
  ExtensionDomainSlot,
  screenDomain,
  HAI3_ACTION_MOUNT_EXT,
  type ScreenExtension,
} from '@hai3/react';
import { bootstrapMFE } from './bootstrap';

/**
 * Container component for MFE screen domain.
 * Renders the active screen extension via ExtensionDomainSlot.
 */
export function MfeScreenContainer() {
  // containerRef is shared with the screen domain's RefContainerProvider (via bootstrap)
  // AND passed to ExtensionDomainSlot so the MFE mounts into the same DOM element
  // that the slot manages.
  const containerRef = useRef<HTMLDivElement>(null);
  const app = useHAI3();
  const queryClient = useQueryClient();
  const bootstrappedRef = useRef(false);

  // Screen extensions collected after bootstrap, used for URL routing
  const [screenExtensions, setScreenExtensions] = useState<ScreenExtension[]>([]);

  useEffect(() => {
    // Bootstrap MFE system once on mount: register domains and extensions.
    // containerRef.current may be null here (slot not yet rendered), but that's fine —
    // RefContainerProvider only reads ref.current when getContainer() is called (during mount),
    // by which time the slot will have rendered and attached the ref.
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapMFE(app, containerRef as React.RefObject<HTMLDivElement>, queryClient).then((exts) => {
      setScreenExtensions(exts);
    }).catch((error) => {
      console.error('[MFE Bootstrap] Failed to bootstrap MFE:', error);
    });
  }, [app, queryClient]);

  // Reactively track the currently mounted screen extension ID.
  // Any store dispatch (including mount state updates from Menu) triggers a snapshot check.
  const subscribe = useCallback(
    (onStoreChange: () => void) => app.store.subscribe(onStoreChange),
    [app.store]
  );
  const activeExtensionId = useSyncExternalStore(
    subscribe,
    () => app.screensetsRegistry?.getMountedExtension(screenDomain.id),
    () => app.screensetsRegistry?.getMountedExtension(screenDomain.id),
  );

  // Sync URL when the active screen extension changes (triggered by Menu or popstate handler).
  // On initial load, also correct the URL if no route matches (e.g. at "/").
  useEffect(() => {
    if (screenExtensions.length === 0) return;

    if (!activeExtensionId) {
      // No extension mounted yet — correct URL to first extension's route if unmatched
      const hasMatch = screenExtensions.some((e) => e.presentation.route === window.location.pathname);
      if (!hasMatch) {
        window.history.replaceState(null, '', screenExtensions[0].presentation.route);
      }
      return;
    }

    const ext = screenExtensions.find((e) => e.id === activeExtensionId);
    const route = ext?.presentation.route;
    if (route && window.location.pathname !== route) {
      window.history.pushState(null, '', route);
    }
  }, [activeExtensionId, screenExtensions]);

  // Handle browser back/forward navigation: mount the extension matching the URL
  useEffect(() => {
    if (screenExtensions.length === 0) return;

    const { screensetsRegistry } = app;
    if (!screensetsRegistry) return;

    const mountFromUrl = () => {
      const path = window.location.pathname;
      const ext = screenExtensions.find((e) => e.presentation.route === path);
      const targetId = ext?.id ?? screenExtensions[0].id;

      // Update the mounted extension to match the URL — ExtensionDomainSlot will
      // observe the activeExtensionId change and handle the actual swap.
      screensetsRegistry.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: screenDomain.id,
          payload: { extensionId: targetId },
        },
      }).catch((err) => {
        console.error('[MFE] Failed to mount extension from URL:', err);
      });
    };

    window.addEventListener('popstate', mountFromUrl);
    return () => window.removeEventListener('popstate', mountFromUrl);
  }, [app, screenExtensions]);

  // Before the initial mount completes, resolve extension ID from the URL to avoid blank state
  const resolvedExtensionId = activeExtensionId ?? (
    screenExtensions.length > 0
      ? (screenExtensions.find((e) => e.presentation.route === window.location.pathname)?.id
         ?? screenExtensions[0].id)
      : undefined
  );

  return (
    <div className="flex-1 overflow-auto" data-mfe-screen-container>
      {resolvedExtensionId && app.screensetsRegistry ? (
        <ExtensionDomainSlot
          registry={app.screensetsRegistry}
          domainId={screenDomain.id}
          extensionId={resolvedExtensionId}
          containerRef={containerRef}
          className="h-full"
        />
      ) : null}
    </div>
  );
}
