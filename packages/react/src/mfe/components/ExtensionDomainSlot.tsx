/**
 * Extension Domain Slot Component
 *
 * React component that renders extensions within a domain slot.
 * Manages extension lifecycle (mount/unmount) and provides rendering context.
 *
 * @packageDocumentation
 */
// @cpt-flow:cpt-frontx-flow-react-bindings-extension-domain-slot:p1
// @cpt-state:cpt-frontx-state-react-bindings-extension-slot:p1
// @cpt-dod:cpt-frontx-dod-react-bindings-extension-slot:p1

import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  type ActionsChain,
  type ParentMfeBridge,
  type MfeRegistry,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '@cyberfabric/framework';

/**
 * Props for ExtensionDomainSlot component
 */
export interface ExtensionDomainSlotProps {
  /**
   * The screensets registry instance
   */
  registry: MfeRegistry;

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
// @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-render-slot
// @cpt-begin:cpt-frontx-dod-react-bindings-extension-slot:p1:inst-render-slot
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
  // Callbacks are stored in refs so inline parent handlers do not re-run the mount effect
  // (which would remount the extension every parent render).
  const onMountedRef = useRef(onMounted);
  const onUnmountedRef = useRef(onUnmounted);
  const onErrorRef = useRef(onError);
  onMountedRef.current = onMounted;
  onUnmountedRef.current = onUnmounted;
  onErrorRef.current = onError;
  // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p1:inst-start-mount
  const [isLoading, setIsLoading] = useState(true);
  // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p1:inst-start-mount
  const [error, setError] = useState<Error | null>(null);
  const [bridge, setBridge] = useState<ParentMfeBridge | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentBridge: ParentMfeBridge | null = null;

    // Whether this domain advertises explicit unmount (registry action list).
    // Domains without unmount_ext (e.g. default screen: swap via mount_ext) skip teardown here.
    const domainSupportsUnmount =
      registry.getDomain(domainId)?.actions.includes(HAI3_ACTION_UNMOUNT_EXT) ?? false;

    async function mountExtension() {
      if (!containerRef.current) {
        return;
      }

      try {
        // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p2:inst-retry-mount
        // Resetting error/loading here also handles the ERROR→MOUNTING transition when
        // extensionId or domainId props change (effect re-runs due to dependency array)
        setIsLoading(true);
        setError(null);
        // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p2:inst-retry-mount

        // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-dispatch-mount
        // Mount the extension via actions chain (auto-loads if not already loaded)
        // Container is provided by the domain's ContainerProvider (registered at domain registration time)
        const mountChain: ActionsChain = {
          action: {
            type: HAI3_ACTION_MOUNT_EXT,
            target: domainId,
            payload: {
              subject: extensionId,
            },
          },
        };

        await registry.executeActionsChain(mountChain);
        // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-dispatch-mount

        // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p2:inst-race-cleanup
        // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p1:inst-race-unmount
        if (!mounted) {
          // Component was unmounted while mounting — clean up only if the domain advertises unmount_ext.
          if (domainSupportsUnmount) {
            await registry.executeActionsChain({
              action: {
                type: HAI3_ACTION_UNMOUNT_EXT,
                target: domainId,
                payload: {
                  subject: extensionId,
                },
              },
            });
          }
          return;
        }
        // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p2:inst-race-cleanup
        // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p1:inst-race-unmount

        // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-get-bridge
        // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p1:inst-mount-success
        // Query the bridge after mount completes
        const newBridge = registry.getParentBridge(extensionId);
        if (!newBridge) {
          throw new Error(`Failed to obtain bridge for extension ${extensionId} after mount`);
        }

        currentBridge = newBridge;
        setBridge(newBridge);
        setIsLoading(false);
        // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-get-bridge
        // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p1:inst-mount-success

        // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-notify-mounted
        // Notify parent
        onMountedRef.current?.(newBridge);
        // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-notify-mounted
      } catch (err) {
        // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-handle-mount-error
        // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p1:inst-mount-error
        if (!mounted) {
          return;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);

        onErrorRef.current?.(errorObj);
        // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-handle-mount-error
        // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p1:inst-mount-error
      }
    }

    // Start mounting
    void mountExtension();

    // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-cleanup-unmount
    // @cpt-begin:cpt-frontx-state-react-bindings-extension-slot:p1:inst-start-unmount
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
              subject: extensionId,
            },
          },
        }).then(() => {
          onUnmountedRef.current?.();
        });
      }
    };
    // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-cleanup-unmount
    // @cpt-end:cpt-frontx-state-react-bindings-extension-slot:p1:inst-start-unmount
  }, [registry, domainId, extensionId, containerRef]);

  // @cpt-begin:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-show-loading
  // Always render the mount host so the first effect pass can mount into a live DOM node.
  let statusContent: React.ReactNode = null;
  if (isLoading) {
    statusContent = loadingComponent ?? <div>Loading extension...</div>;
  } else if (error) {
    statusContent = errorComponent ? (
      errorComponent(error)
    ) : (
      <div>
        <strong>Error loading extension:</strong>
        <pre>{error.message}</pre>
      </div>
    );
  }
  // @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-show-loading

  // Render the container for the mounted extension
  return (
    <div
      ref={containerRef}
      className={className}
      data-domain-id={domainId}
      data-extension-id={extensionId}
      data-bridge-active={bridge !== null}
    >
      {statusContent}
    </div>
  );
}
// @cpt-end:cpt-frontx-flow-react-bindings-extension-domain-slot:p1:inst-render-slot
// @cpt-end:cpt-frontx-dod-react-bindings-extension-slot:p1:inst-render-slot
