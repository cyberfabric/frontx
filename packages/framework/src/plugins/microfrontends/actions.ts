/**
 * MFE Actions
 *
 * Event-emitting action functions for MFE lifecycle operations.
 * These actions emit events that MFE effects handle.
 */

import { eventBus } from '@hai3/state';

// ============================================================================
// Event Types
// ============================================================================

/** MFE event names */
export const MfeEvents = {
  LoadRequested: 'mfe/loadRequested',
  PreloadRequested: 'mfe/preloadRequested',
  MountRequested: 'mfe/mountRequested',
  UnmountRequested: 'mfe/unmountRequested',
  HostActionRequested: 'mfe/hostActionRequested',
} as const;

/** Payload for load extension event */
export interface LoadExtensionPayload {
  extensionId: string;
}

/** Payload for preload extension event */
export interface PreloadExtensionPayload {
  extensionId: string;
}

/** Payload for mount extension event */
export interface MountExtensionPayload {
  extensionId: string;
  containerElement: HTMLElement;
}

/** Payload for unmount extension event */
export interface UnmountExtensionPayload {
  extensionId: string;
}

/** Payload for host action event */
export interface HostActionPayload {
  extensionId: string;
  actionTypeId: string;
  payload?: unknown;
}

// ============================================================================
// Module Augmentation for Type-Safe Events
// ============================================================================

declare module '@hai3/state' {
  interface EventPayloadMap {
    'mfe/loadRequested': LoadExtensionPayload;
    'mfe/preloadRequested': PreloadExtensionPayload;
    'mfe/mountRequested': MountExtensionPayload;
    'mfe/unmountRequested': UnmountExtensionPayload;
    'mfe/hostActionRequested': HostActionPayload;
  }
}

// ============================================================================
// Action Functions
// ============================================================================

/**
 * Load an MFE extension bundle.
 * Emits event that MFE effects handle via runtime.loadExtension().
 *
 * @param extensionId - Extension to load
 *
 * @example
 * ```typescript
 * import { loadExtension } from '@hai3/framework';
 * loadExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
export function loadExtension(extensionId: string): void {
  eventBus.emit(MfeEvents.LoadRequested, { extensionId });
}

/**
 * Preload an MFE extension bundle without mounting.
 * Useful for optimizing load times for extensions that will be mounted soon.
 * Emits event that MFE effects handle via runtime.preloadExtension().
 *
 * @param extensionId - Extension to preload
 *
 * @example
 * ```typescript
 * import { preloadExtension } from '@hai3/framework';
 * preloadExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
export function preloadExtension(extensionId: string): void {
  eventBus.emit(MfeEvents.PreloadRequested, { extensionId });
}

/**
 * Mount an MFE extension to a container element.
 * Auto-loads the extension if not already loaded.
 * Emits event that MFE effects handle via runtime.mountExtension().
 *
 * @param extensionId - Extension to mount
 * @param containerElement - DOM element to mount into
 *
 * @example
 * ```typescript
 * import { mountExtension } from '@hai3/framework';
 * const container = document.getElementById('sidebar-container');
 * mountExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1', container);
 * ```
 */
export function mountExtension(extensionId: string, containerElement: HTMLElement): void {
  eventBus.emit(MfeEvents.MountRequested, { extensionId, containerElement });
}

/**
 * Unmount an MFE extension from its container.
 * Emits event that MFE effects handle via runtime.unmountExtension().
 *
 * @param extensionId - Extension to unmount
 *
 * @example
 * ```typescript
 * import { unmountExtension } from '@hai3/framework';
 * unmountExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
export function unmountExtension(extensionId: string): void {
  eventBus.emit(MfeEvents.UnmountRequested, { extensionId });
}

/**
 * Send a host action to an MFE extension.
 * Used for load_ext/unload_ext actions in popup, sidebar, overlay, and custom domains.
 * Emits event that MFE effects handle via bridge and action chain execution.
 *
 * @param extensionId - Extension to send action to
 * @param actionTypeId - Action type ID (e.g., 'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1')
 * @param payload - Optional action payload
 *
 * @example
 * ```typescript
 * import { handleMfeHostAction } from '@hai3/framework';
 * handleMfeHostAction(
 *   'gts.hai3.mfes.ext.extension.v1~my.extension.v1',
 *   'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1',
 *   { data: 'example' }
 * );
 * ```
 */
export function handleMfeHostAction(
  extensionId: string,
  actionTypeId: string,
  payload?: unknown
): void {
  eventBus.emit(MfeEvents.HostActionRequested, { extensionId, actionTypeId, payload });
}
