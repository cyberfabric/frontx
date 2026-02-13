/**
 * Action Payload Types
 *
 * Typed payload interfaces for extension lifecycle actions.
 *
 * @packageDocumentation
 */

/**
 * Payload for load_ext action.
 * Preload an extension's bundle without mounting.
 */
export interface LoadExtPayload {
  /** The extension ID to load */
  extensionId: string;
}

/**
 * Payload for mount_ext action.
 *
 * NOTE: The `container` field was removed in Phase 25. The container element
 * is now provided by the domain's ContainerProvider, which is registered at
 * domain registration time. This makes mount_ext payloads pure data (no DOM
 * references), and shifts container management responsibility to the domain.
 */
export interface MountExtPayload {
  /** The extension ID to mount */
  extensionId: string;
}

/**
 * Payload for unmount_ext action.
 * Unmount an extension from its container.
 */
export interface UnmountExtPayload {
  /** The extension ID to unmount */
  extensionId: string;
}
