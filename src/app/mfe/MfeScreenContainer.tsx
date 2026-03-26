// @cpt-flow:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2

/**
 * MFE Screen Container Component
 *
 * Bootstraps MFE domains and extensions, then declaratively renders the active
 * screen extension via ExtensionDomainSlot. Loading and error states are surfaced
 * automatically by the slot component.
 */

import { useRef, useEffect, useCallback, useSyncExternalStore, useState } from 'react';
import {
  useHAI3,
  ExtensionDomainSlot,
  screenDomain,
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
  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-extract-query-client
  const queryClient = app.queryClient;
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-extract-query-client
  const bootstrappedRef = useRef(false);

  // Screen extensions collected after bootstrap, used to pick the initial screen
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

  // Drive screen selection from the screen domain state. On the very first load,
  // we still honor the current URL passively so direct links can open a screen
  // without wiring menu selection to browser history updates.
  const initialRouteExtensionId = screenExtensions.find(
    (extension) => extension.presentation.route === window.location.pathname
  )?.id;
  const resolvedExtensionId = activeExtensionId ?? initialRouteExtensionId ?? screenExtensions[0]?.id;

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
