/**
 * Extension Domain Slot Component
 *
 * React component that renders extensions within a domain slot.
 * Manages extension lifecycle (mount/unmount) and provides rendering context.
 *
 * @packageDocumentation
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ScreensetsRegistry, ParentMfeBridge } from '@hai3/screensets';
import {
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '@hai3/screensets';

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
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [bridge, setBridge] = useState<ParentMfeBridge | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentBridge: ParentMfeBridge | null = null;

    async function mountExtension() {
      if (!containerRef.current) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Mount the extension via actions chain (auto-loads if not already loaded)
        // Container is provided by the domain's ContainerProvider (registered at domain registration time)
        await registry.executeActionsChain({
          action: {
            type: HAI3_ACTION_MOUNT_EXT,
            target: domainId,
            payload: {
              extensionId,
            },
          },
        });

        if (!mounted) {
          // Component was unmounted while mounting - clean up
          await registry.executeActionsChain({
            action: {
              type: HAI3_ACTION_UNMOUNT_EXT,
              target: domainId,
              payload: {
                extensionId,
              },
            },
          });
          return;
        }

        // Query the bridge after mount completes
        const newBridge = registry.getParentBridge(extensionId);
        if (!newBridge) {
          throw new Error(`Failed to obtain bridge for extension ${extensionId} after mount`);
        }

        currentBridge = newBridge;
        setBridge(newBridge);
        setIsLoading(false);

        // Notify parent
        if (onMounted) {
          onMounted(newBridge);
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);

        if (onError) {
          onError(errorObj);
        }
      }
    }

    // Start mounting
    void mountExtension();

    // Cleanup on unmount
    return () => {
      mounted = false;

      if (currentBridge) {
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
  }, [registry, domainId, extensionId, onMounted, onUnmounted, onError]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={className} data-domain-id={domainId} data-extension-id={extensionId}>
        {loadingComponent ?? <div>Loading extension...</div>}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={className} data-domain-id={domainId} data-extension-id={extensionId}>
        {errorComponent ? errorComponent(error) : (
          <div>
            <strong>Error loading extension:</strong>
            <pre>{error.message}</pre>
          </div>
        )}
      </div>
    );
  }

  // Render the container for the mounted extension
  return (
    <div
      ref={containerRef}
      className={className}
      data-domain-id={domainId}
      data-extension-id={extensionId}
      data-bridge-active={bridge !== null}
    />
  );
}
