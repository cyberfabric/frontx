/**
 * Extension Lifecycle Action Handler
 *
 * Action handler for the three extension lifecycle actions (load_ext, mount_ext, unmount_ext)
 * within a domain. Registered per-domain with the ActionsChainsMediator during domain registration.
 *
 * @packageDocumentation
 * @internal
 */

import type { ActionHandler } from '../mediator';
import type { ParentMfeBridge } from '../handler/types';
import type { LoadExtPayload, MountExtPayload, UnmountExtPayload } from '../types';
import type { ContainerProvider } from './container-provider';
import {
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '../constants';
import { MfeError } from '../errors';

/**
 * Determines how the domain handles mount_ext actions.
 *
 * - 'swap': The domain unmounts the currently mounted extension before mounting the new one.
 *   Used by the screen domain (always has content, transitions are seamless).
 * - 'toggle': The domain mounts/unmounts extensions independently (no automatic unmounting).
 *   Used by sidebar, popup, and overlay domains.
 *
 * DomainSemantics is derived from the domain's `actions` array at handler construction time:
 * - If the domain's `actions` array does NOT include `HAI3_ACTION_UNMOUNT_EXT` -> 'swap'
 *   (the domain cannot unmount, so mount must implicitly replace the current extension)
 * - If the domain's `actions` array includes `HAI3_ACTION_UNMOUNT_EXT` -> 'toggle'
 *   (the domain supports explicit unmount, so mount does not implicitly replace)
 */
type DomainSemantics = 'swap' | 'toggle';

/**
 * Callbacks required by ExtensionLifecycleActionHandler.
 *
 * These callbacks are wired by DefaultScreensetsRegistry.registerDomain() to go
 * through OperationSerializer -> MountManager. The handler does NOT hold a
 * reference to ScreensetsRegistry -- it receives only the focused callbacks it
 * needs. This follows the same callback injection pattern used by all other
 * collaborators (ExtensionManager, LifecycleManager, DefaultMountManager).
 *
 * NOTE: The `mountExtension` callback accepts a `container: Element` parameter.
 * The handler obtains the container from `this.containerProvider.getContainer(extensionId)`
 * and passes it to the callback. The callback then routes through
 * OperationSerializer -> MountManager.mountExtension(id, container). This keeps
 * all ContainerProvider interaction in the handler (single ownership), while the
 * callback chain remains a simple pass-through for the resolved container.
 */
export interface ExtensionLifecycleCallbacks {
  /** Load an extension's bundle (OperationSerializer -> MountManager.loadExtension) */
  loadExtension: (extensionId: string) => Promise<void>;
  /** Mount an extension into a container (OperationSerializer -> MountManager.mountExtension) */
  mountExtension: (extensionId: string, container: Element) => Promise<ParentMfeBridge>;
  /** Unmount an extension (OperationSerializer -> MountManager.unmountExtension) */
  unmountExtension: (extensionId: string) => Promise<void>;
  /** Query the currently mounted extension in a domain (ExtensionManager) */
  getMountedExtension: (domainId: string) => string | undefined;
}

/**
 * Action handler for extension lifecycle actions within a domain.
 * Registered with the ActionsChainsMediator as the domain's action handler.
 *
 * This handler intercepts the three extension lifecycle actions
 * (load_ext, mount_ext, unmount_ext) and delegates to focused callbacks.
 * Non-lifecycle domain actions pass through as no-ops — the mediator
 * already validated action support against the domain's actions array.
 *
 * The handler receives focused callbacks instead of a ScreensetsRegistry
 * reference. This follows the same callback injection pattern used by
 * ExtensionManager, LifecycleManager, and DefaultMountManager.
 *
 * The handler is the SINGLE owner of all ContainerProvider interactions.
 * It calls getContainer() before mounting and releaseContainer() after unmounting.
 *
 * @internal
 */
export class ExtensionLifecycleActionHandler implements ActionHandler {
  constructor(
    private readonly domainId: string,
    private readonly callbacks: ExtensionLifecycleCallbacks,
    private readonly domainSemantics: DomainSemantics,
    private readonly containerProvider: ContainerProvider
  ) {}

  async handleAction(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): Promise<void> {
    switch (actionTypeId) {
      case HAI3_ACTION_LOAD_EXT: {
        this.requirePayload(actionTypeId, payload);
        await this.callbacks.loadExtension((payload as unknown as LoadExtPayload).extensionId);
        break;
      }

      case HAI3_ACTION_MOUNT_EXT: {
        this.requirePayload(actionTypeId, payload);
        const mountPayload = payload as unknown as MountExtPayload;
        if (this.domainSemantics === 'swap') {
          await this.handleScreenSwap(mountPayload);
        } else {
          // Toggle semantics: get container and mount
          const container = this.containerProvider.getContainer(mountPayload.extensionId);
          await this.callbacks.mountExtension(mountPayload.extensionId, container);
        }
        break;
      }

      case HAI3_ACTION_UNMOUNT_EXT: {
        this.requirePayload(actionTypeId, payload);
        const extensionId = (payload as unknown as UnmountExtPayload).extensionId;
        await this.callbacks.unmountExtension(extensionId);
        this.containerProvider.releaseContainer(extensionId);
        break;
      }

      default:
        // Non-lifecycle domain actions: pass through as no-op.
        // The mediator already validated that the domain supports this action type.
        break;
    }
  }

  private requirePayload(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): asserts payload is Record<string, unknown> {
    if (!payload) {
      throw new MfeError(
        `Extension lifecycle action '${actionTypeId}' requires a payload`,
        'LIFECYCLE_ACTION_MISSING_PAYLOAD'
      );
    }
  }

  private async handleScreenSwap(payload: MountExtPayload): Promise<void> {
    const { extensionId: newExtensionId } = payload;

    // Get current mounted extension in this domain (if any)
    const currentExtId = this.callbacks.getMountedExtension(this.domainId);
    if (currentExtId && currentExtId !== newExtensionId) {
      // Unmount current screen internally (no blank state visible)
      await this.callbacks.unmountExtension(currentExtId);
      this.containerProvider.releaseContainer(currentExtId);
    }

    // Mount new screen -- handler obtains container from provider
    const container = this.containerProvider.getContainer(newExtensionId);
    await this.callbacks.mountExtension(newExtensionId, container);
  }
}
