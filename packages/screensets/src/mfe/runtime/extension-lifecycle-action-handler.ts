/**
 * Extension Lifecycle Action Handlers
 *
 * Per-action-type ActionHandler subclasses for domain lifecycle operations.
 * Each class encapsulates a single lifecycle action's behavior, capturing
 * its dependencies (serializer, mount manager, container provider) via constructor.
 *
 * These replace the anonymous closures that were previously registered in
 * DefaultScreensetsRegistry.registerDomain() (ADR 0018).
 *
 * @packageDocumentation
 * @internal
 */

import { ActionHandler } from '../mediator/types';
import type { OperationSerializer } from './operation-serializer';
import type { MountManager } from './mount-manager';
import type { ContainerProvider } from './container-provider';
import type { DefaultExtensionManager } from './default-extension-manager';

/**
 * Typed lifecycle action payload.
 * GTS schema validation guarantees this shape before any handler runs.
 */
export interface LifecycleActionPayload {
  subject: string;
}

/**
 * Narrows an untyped action payload to `LifecycleActionPayload`.
 *
 * GTS validates the payload structure before any handler runs, so by the time
 * `handleAction` is called `subject` is guaranteed to be a string. This guard
 * makes that invariant explicit to TypeScript without a double cast.
 */
function assertLifecyclePayload(
  payload: unknown
): asserts payload is LifecycleActionPayload {
  if (typeof (payload as Record<string, unknown> | undefined)?.['subject'] !== 'string') {
    throw new Error('LifecycleActionPayload: missing or non-string subject field');
  }
}

/**
 * Handles load_ext actions: serializes a load operation on the extension queue.
 *
 * @internal
 */
export class LoadExtHandler extends ActionHandler {
  constructor(
    private readonly operationSerializer: OperationSerializer,
    private readonly mountManager: MountManager
  ) {
    super();
  }

  /**
   * Handle a load_ext action by serializing the load operation on the extension queue.
   *
   * @param _actionTypeId - Action type ID (unused — handler is registered per type)
   * @param payload - Action payload containing the target extension subject
   */
  async handleAction(_actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void> {
    assertLifecyclePayload(payload);
    const extensionId = payload.subject;
    await this.operationSerializer.serializeOperation(extensionId, () =>
      this.mountManager.loadExtension(extensionId)
    );
  }
}

/**
 * Handles mount_ext actions under swap semantics (domains that do NOT support explicit unmount,
 * e.g. screen domain). Atomically unmounts the current extension and mounts the new one,
 * serialized on the domain queue to prevent interleaving swaps.
 *
 * @internal
 */
export class MountExtSwapHandler extends ActionHandler {
  constructor(
    private readonly domainId: string,
    private readonly operationSerializer: OperationSerializer,
    private readonly mountManager: MountManager,
    private readonly extensionManager: DefaultExtensionManager,
    private readonly containerProvider: ContainerProvider
  ) {
    super();
  }

  /**
   * Handle a mount_ext action under swap semantics by atomically replacing the current
   * extension with the new one, serialized on the domain queue to prevent interleaving swaps.
   *
   * @param _actionTypeId - Action type ID (unused — handler is registered per type)
   * @param payload - Action payload containing the target extension subject
   */
  async handleAction(_actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void> {
    assertLifecyclePayload(payload);
    const extensionId = payload.subject;

    // Serialize the entire swap on the domain queue so no two swaps interleave.
    await this.operationSerializer.serializeOperation(this.domainId, async () => {
      const currentExtId = this.extensionManager.getMountedExtension(this.domainId);

      if (currentExtId === extensionId) {
        return;
      }

      if (currentExtId) {
        await this.operationSerializer.serializeOperation(currentExtId, () =>
          this.mountManager.unmountExtension(currentExtId)
        );
        this.containerProvider.releaseContainer(currentExtId);
      }

      const container = this.containerProvider.getContainer(extensionId);
      await this.operationSerializer.serializeOperation(extensionId, () =>
        this.mountManager.mountExtension(extensionId, container)
      );
    });
  }
}

/**
 * Handles mount_ext actions under toggle semantics (domains that support explicit unmount,
 * e.g. sidebar, popup). Mounts independently without implicitly unmounting.
 *
 * @internal
 */
export class MountExtToggleHandler extends ActionHandler {
  constructor(
    private readonly operationSerializer: OperationSerializer,
    private readonly mountManager: MountManager,
    private readonly containerProvider: ContainerProvider
  ) {
    super();
  }

  /**
   * Handle a mount_ext action under toggle semantics by acquiring the extension's container
   * and serializing the mount operation, without implicitly unmounting any current extension.
   *
   * @param _actionTypeId - Action type ID (unused — handler is registered per type)
   * @param payload - Action payload containing the target extension subject
   */
  async handleAction(_actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void> {
    assertLifecyclePayload(payload);
    const extensionId = payload.subject;
    const container = this.containerProvider.getContainer(extensionId);
    await this.operationSerializer.serializeOperation(extensionId, () =>
      this.mountManager.mountExtension(extensionId, container)
    );
  }
}

/**
 * Handles unmount_ext actions: unmounts the extension and releases its container.
 * Only registered for domains that support explicit unmount (toggle semantics).
 *
 * @internal
 */
export class UnmountExtHandler extends ActionHandler {
  constructor(
    private readonly operationSerializer: OperationSerializer,
    private readonly mountManager: MountManager,
    private readonly containerProvider: ContainerProvider
  ) {
    super();
  }

  /**
   * Handle an unmount_ext action by serializing the unmount operation and releasing
   * the extension's container afterwards.
   *
   * @param _actionTypeId - Action type ID (unused — handler is registered per type)
   * @param payload - Action payload containing the target extension subject
   */
  async handleAction(_actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void> {
    assertLifecyclePayload(payload);
    const extensionId = payload.subject;
    await this.operationSerializer.serializeOperation(extensionId, () =>
      this.mountManager.unmountExtension(extensionId)
    );
    this.containerProvider.releaseContainer(extensionId);
  }
}
