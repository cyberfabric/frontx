// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

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
} from '@cyberfabric/react';
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
  const bootstrappedRef = useRef(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    // Bootstrap MFE system once on mount: register domains and extensions.
    // containerRef.current may be null here (slot not yet rendered), but that's fine —
    // RefContainerProvider only reads ref.current when getContainer() is called (during mount),
    // by which time the slot will have rendered and attached the ref.
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapMFE(app, containerRef).then(() => {
      setBootstrapped(true);
    }).catch((error) => {
      console.error('[MFE Bootstrap] Failed to bootstrap MFE:', error);
    });
  }, [app]);

  const screenExtensions = bootstrapped && app.mfeRegistry
    ? (app.mfeRegistry.getExtensionsForDomain(screenDomain.id) as ScreenExtension[])
    : [];

  // Reactively track the currently mounted screen extension ID.
  // Any store dispatch (including mount state updates from Menu) triggers a snapshot check.
  const subscribe = useCallback(
    (onStoreChange: () => void) => app.store.subscribe(onStoreChange),
    [app.store]
  );
  const getMountedScreenExtension = useCallback(
    () => app.mfeRegistry?.getMountedExtension(screenDomain.id),
    [app.mfeRegistry]
  );
  const activeExtensionId = useSyncExternalStore(
    subscribe,
    getMountedScreenExtension,
    getMountedScreenExtension,
  );

  // Drive screen selection from the screen domain state. On the very first load,
  // we still honor the current URL passively so direct links can open a screen
  // without wiring menu selection to browser history updates.
  const initialRouteExtensionId = screenExtensions.find(
    (extension) => extension.presentation.route === globalThis.location?.pathname
  )?.id;
  const resolvedExtensionId = activeExtensionId ?? initialRouteExtensionId ?? screenExtensions[0]?.id;

  return (
    <div className="flex-1 overflow-auto" data-mfe-screen-container>
      {resolvedExtensionId && app.mfeRegistry ? (
        <ExtensionDomainSlot
          registry={app.mfeRegistry}
          domainId={screenDomain.id}
          extensionId={resolvedExtensionId}
          containerRef={containerRef}
          className="h-full"
        />
      ) : null}
    </div>
  );
}
