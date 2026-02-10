/**
 * MFE Actions
 *
 * Event-emitting action functions for MFE lifecycle operations.
 * These actions emit events that MFE effects handle.
 */

import { eventBus } from '@hai3/state';
import type { Extension, ExtensionDomain } from '@hai3/screensets';

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
  RegisterExtensionRequested: 'mfe/registerExtensionRequested',
  UnregisterExtensionRequested: 'mfe/unregisterExtensionRequested',
  RegisterDomainRequested: 'mfe/registerDomainRequested',
  UnregisterDomainRequested: 'mfe/unregisterDomainRequested',
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

/** Payload for register extension event */
export interface RegisterExtensionPayload {
  extension: Extension;
}

/** Payload for unregister extension event */
export interface UnregisterExtensionPayload {
  extensionId: string;
}

/** Payload for register domain event */
export interface RegisterDomainPayload {
  domain: ExtensionDomain;
}

/** Payload for unregister domain event */
export interface UnregisterDomainPayload {
  domainId: string;
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
    'mfe/registerExtensionRequested': RegisterExtensionPayload;
    'mfe/unregisterExtensionRequested': UnregisterExtensionPayload;
    'mfe/registerDomainRequested': RegisterDomainPayload;
    'mfe/unregisterDomainRequested': UnregisterDomainPayload;
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

/**
 * Register an extension dynamically at runtime.
 * Emits event that MFE effects handle via runtime.registerExtension().
 *
 * @param extension - Extension instance to register
 *
 * @example
 * ```typescript
 * import { registerExtension } from '@hai3/framework';
 * const extension: Extension = {
 *   id: 'gts.hai3.mfes.ext.extension.v1~my.extension.v1',
 *   domain: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1',
 *   entry: 'gts.hai3.mfes.mfe.entry.v1~my.entry.v1',
 * };
 * registerExtension(extension);
 * ```
 */
export function registerExtension(extension: Extension): void {
  eventBus.emit(MfeEvents.RegisterExtensionRequested, { extension });
}

/**
 * Unregister an extension dynamically at runtime.
 * Emits event that MFE effects handle via runtime.unregisterExtension().
 *
 * @param extensionId - Extension ID to unregister
 *
 * @example
 * ```typescript
 * import { unregisterExtension } from '@hai3/framework';
 * unregisterExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
export function unregisterExtension(extensionId: string): void {
  eventBus.emit(MfeEvents.UnregisterExtensionRequested, { extensionId });
}

/**
 * Register an extension domain dynamically at runtime.
 * Emits event that MFE effects handle via runtime.registerDomain().
 *
 * @param domain - ExtensionDomain instance to register
 *
 * @example
 * ```typescript
 * import { registerDomain } from '@hai3/framework';
 * const domain: ExtensionDomain = {
 *   id: 'gts.hai3.mfes.ext.domain.v1~my.custom.domain.v1',
 *   sharedProperties: [],
 *   actions: ['gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1'],
 *   extensionsActions: [],
 *   defaultActionTimeout: 5000,
 *   lifecycleStages: [],
 *   extensionsLifecycleStages: [],
 * };
 * registerDomain(domain);
 * ```
 */
export function registerDomain(domain: ExtensionDomain): void {
  eventBus.emit(MfeEvents.RegisterDomainRequested, { domain });
}

/**
 * Unregister an extension domain dynamically at runtime.
 * Emits event that MFE effects handle via runtime.unregisterDomain().
 *
 * @param domainId - Domain ID to unregister
 *
 * @example
 * ```typescript
 * import { unregisterDomain } from '@hai3/framework';
 * unregisterDomain('gts.hai3.mfes.ext.domain.v1~my.custom.domain.v1');
 * ```
 */
export function unregisterDomain(domainId: string): void {
  eventBus.emit(MfeEvents.UnregisterDomainRequested, { domainId });
}
