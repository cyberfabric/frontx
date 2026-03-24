/**
 * Extension Domain Slot Component
 *
 * React component that renders extensions within a domain slot.
 * Manages extension lifecycle (mount/unmount) and provides rendering context.
 *
 * @packageDocumentation
 */
// @cpt-flow:cpt-hai3-flow-react-bindings-extension-domain-slot:p1
// @cpt-state:cpt-hai3-state-react-bindings-extension-slot:p1
// @cpt-dod:cpt-hai3-dod-react-bindings-extension-slot:p1

import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ScreensetsRegistry, ParentMfeBridge } from '@hai3/framework';
import {
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
  screenDomain,
} from '@hai3/framework';
import { executeActionsChainWithMountContext } from '../executeActionsChainWithMountContext';

/**
 * Props for ExtensionDomainSlot component
 */
export interface ExtensionDomainSlotProps {
  /**
   * The screensets registry instance
   */
  registry: ScreensetsRegistry;

  /**
   * The domain ID for this slot
   */
  domainId: string;

  /**
   * The extension ID to render in this slot
   */
  extensionId: string;

  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Optional callback when extension is mounted
   */
  onMounted?: (bridge: ParentMfeBridge) => void;

  /**
   * Optional callback when extension is unmounted
   */
  onUnmounted?: () => void;

  /**
   * Optional error callback
   */
  onError?: (error: Error) => void;

  /**
   * Optional loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Optional error component renderer
   */
  errorComponent?: (error: Error) => React.ReactNode;

  /**
   * Optional external ref for the container div rendered in the success state.
   * Use this when the domain's ContainerProvider needs to reference the same DOM
   * element that this slot renders (e.g. RefContainerProvider wrapping this ref).
   * When omitted, an internal ref is used.
   */
  containerRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Extension Domain Slot Component
 *
 * Renders an extension within a domain slot. Manages the extension lifecycle:
 * - Mounts the extension on component mount
 * - Unmounts the extension on component unmount
 * - Handles loading and error states
 *
 * @example
 * ```tsx
 * <ExtensionDomainSlot
 *   registry={registry}
 *   domainId="gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1"
 *   extensionId="gts.hai3.mfes.ext.extension.v1~myapp.sidebar.widget.v1"
 *   className="sidebar-slot"
 * />
 * ```
 */
// @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-render-slot
// @cpt-begin:cpt-hai3-dod-react-bindings-extension-slot:p1:inst-render-slot
export function ExtensionDomainSlot(props: ExtensionDomainSlotProps): React.ReactElement {
  const {
    registry,
    domainId,
    extensionId,
    className,
    onMounted,
    onUnmounted,
    onError,
    loadingComponent,
    errorComponent,
    containerRef: externalContainerRef,
  } = props;

  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  // Prefer the externally-provided ref so the caller can share it with a ContainerProvider
  const containerRef = externalContainerRef ?? internalContainerRef;
  const queryClient = useQueryClient();
  // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p1:inst-start-mount
  const [isLoading, setIsLoading] = useState(true);
  // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p1:inst-start-mount
  const [error, setError] = useState<Error | null>(null);
  const [bridge, setBridge] = useState<ParentMfeBridge | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentBridge: ParentMfeBridge | null = null;

    // Whether this domain supports explicit unmount (e.g. sidebar, popup, overlay).
    // Screen domain uses swap semantics — no unmount_ext action — so we skip the
    // unmount dispatch and let the next mount_ext swap the extension out instead.
    // Screen domains use swap semantics and must never receive explicit unmount_ext.
    const domainSupportsUnmount = (
      domainId !== screenDomain.id
      && (registry.getDomain(domainId)?.actions.includes(HAI3_ACTION_UNMOUNT_EXT) ?? false)
    );

    async function mountExtension() {
      if (!containerRef.current) {
        return;
      }

      try {
        // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p2:inst-retry-mount
        // Resetting error/loading here also handles the ERROR→MOUNTING transition when
        // extensionId or domainId props change (effect re-runs due to dependency array)
        setIsLoading(true);
        setError(null);
        // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p2:inst-retry-mount

        // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-dispatch-mount
        // Mount the extension via actions chain (auto-loads if not already loaded)
        // Container is provided by the domain's ContainerProvider (registered at domain registration time)
        await executeActionsChainWithMountContext(
          registry,
          {
            action: {
              type: HAI3_ACTION_MOUNT_EXT,
              target: domainId,
              payload: {
                extensionId,
              },
            },
          },
          queryClient,
          registry.executeActionsChain.bind(registry),
        );
        // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-dispatch-mount

        // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p2:inst-race-cleanup
        // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p1:inst-race-unmount
        if (!mounted) {
          // Component was unmounted while mounting - clean up if domain supports explicit unmount.
          // Swap-semantics domains (e.g. screen) will be cleaned up by the next mount_ext.
          if (domainSupportsUnmount) {
            await registry.executeActionsChain({
              action: {
                type: HAI3_ACTION_UNMOUNT_EXT,
                target: domainId,
                payload: {
                  extensionId,
                },
              },
            });
          }
          return;
        }
        // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p2:inst-race-cleanup
        // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p1:inst-race-unmount

        // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-get-bridge
        // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p1:inst-mount-success
        // Query the bridge after mount completes
        const newBridge = registry.getParentBridge(extensionId);
        if (!newBridge) {
          throw new Error(`Failed to obtain bridge for extension ${extensionId} after mount`);
        }

        currentBridge = newBridge;
        setBridge(newBridge);
        setIsLoading(false);
        // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-get-bridge
        // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p1:inst-mount-success

        // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-notify-mounted
        // Notify parent
        if (onMounted) {
          onMounted(newBridge);
        }
        // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-notify-mounted
      } catch (err) {
        // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-handle-mount-error
        // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p1:inst-mount-error
        if (!mounted) {
          return;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);

        if (onError) {
          onError(errorObj);
        }
        // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-handle-mount-error
        // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p1:inst-mount-error
      }
    }

    // Start mounting
    void mountExtension();

    // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-cleanup-unmount
    // @cpt-begin:cpt-hai3-state-react-bindings-extension-slot:p1:inst-start-unmount
    // Cleanup on unmount
    return () => {
      mounted = false;

      if (currentBridge && domainSupportsUnmount) {
        // Unmount extension asynchronously via actions chain
        void registry.executeActionsChain({
          action: {
            type: HAI3_ACTION_UNMOUNT_EXT,
            target: domainId,
            payload: {
              extensionId,
            },
          },
        }).then(() => {
          if (onUnmounted) {
            onUnmounted();
          }
        });
      }
    };
    // @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-cleanup-unmount
    // @cpt-end:cpt-hai3-state-react-bindings-extension-slot:p1:inst-start-unmount
  }, [registry, domainId, extensionId, onMounted, onUnmounted, onError, queryClient, containerRef]);

  // @cpt-begin:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-show-loading
  // The container div is always rendered so the ref stays attached throughout the lifecycle.
  // The domain's ContainerProvider may call getContainer() at any time (including during the
  // mount operation itself), so the ref must be present before mount starts.
  // Loading and error UI is layered on top via absolute positioning.
  return (
    <div
      ref={containerRef}
      className={className ? `relative ${className}` : 'relative'}
      data-domain-id={domainId}
      data-extension-id={extensionId}
      data-bridge-active={bridge !== null}
    >
      {isLoading && (
        <div className="absolute inset-0">
          {loadingComponent ?? <div>Loading extension...</div>}
        </div>
      )}
      {error && (
        <div className="absolute inset-0">
          {errorComponent ? errorComponent(error) : (
            <div>
              <strong>Error loading extension:</strong>
              <pre>{error.message}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// @cpt-end:cpt-hai3-flow-react-bindings-extension-domain-slot:p1:inst-render-slot
// @cpt-end:cpt-hai3-dod-react-bindings-extension-slot:p1:inst-render-slot
