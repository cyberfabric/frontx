/**
 * Action Payload Types
 *
 * Typed payload interfaces for extension lifecycle actions.
 * The `subject` field carries an extension ID and is enforced at runtime
 * via GTS schema validation (payload.subject with x-gts-ref to extension type).
 *
 * @packageDocumentation
 */

/**
 * Payload for load_ext action.
 * Preload an extension's bundle without mounting.
 */
export interface LoadExtPayload {
  /** The extension ID to load (GTS subject reference) */
  subject: string;
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
  /** The extension ID to mount (GTS subject reference) */
  subject: string;
}

/**
 * Payload for unmount_ext action.
 * Unmount an extension from its container.
 */
export interface UnmountExtPayload {
  /** The extension ID to unmount (GTS subject reference) */
  subject: string;
}
