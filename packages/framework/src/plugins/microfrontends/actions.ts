/**
 * MFE Actions
 *
 * Action functions for MFE lifecycle and registration operations.
 * Lifecycle actions call executeActionsChain() directly (fire-and-forget).
 * Registration actions emit events that MFE effects handle.
 */

// @cpt-flow:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1
// @cpt-flow:cpt-frontx-flow-framework-composition-mfe-registration:p1
// @cpt-dod:cpt-frontx-dod-framework-composition-mfe-plugin:p1

import { eventBus } from '@cyberfabric/state';
import { MfeEvents } from './constants';
import {
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
  type Extension,
  type ScreensetsRegistry,
} from '@cyberfabric/screensets';

// ============================================================================
// Module-Level Registry Reference
// ============================================================================

let screensetsRegistry: ScreensetsRegistry | null = null;

/**
 * Set the MFE-enabled ScreensetsRegistry reference.
 * Called during plugin initialization.
 */
export function setMfeRegistry(registry: ScreensetsRegistry): void {
  screensetsRegistry = registry;
}

/**
 * Helper to resolve domain ID for an extension.
 */
function resolveDomainId(extensionId: string): string {
  if (!screensetsRegistry) {
    throw new Error('MFE registry not initialized. Call setMfeRegistry() before using lifecycle actions.');
  }
  const extension = screensetsRegistry.getExtension(extensionId);
  if (!extension) {
    throw new Error(`Extension '${extensionId}' is not registered. Register it before calling lifecycle actions.`);
  }
  return extension.domain;
}

// ============================================================================
// Event Payload Types (Registration Events Only)
// ============================================================================

/** Payload for register extension event */
export interface RegisterExtensionPayload {
  extension: Extension;
}

/** Payload for unregister extension event */
export interface UnregisterExtensionPayload {
  extensionId: string;
}

// ============================================================================
// Module Augmentation for Type-Safe Events
// ============================================================================

declare module '@cyberfabric/state' {
  interface EventPayloadMap {
    'mfe/registerExtensionRequested': RegisterExtensionPayload;
    'mfe/unregisterExtensionRequested': UnregisterExtensionPayload;
  }
}

// ============================================================================
// Lifecycle Action Functions
// ============================================================================

/**
 * Load an MFE extension bundle.
 * Calls executeActionsChain() directly (fire-and-forget).
 *
 * @param extensionId - Extension to load
 *
 * @example
 * ```typescript
 * import { loadExtension } from '@cyberfabric/framework';
 * loadExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
// @cpt-begin:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-1
export function loadExtension(extensionId: string): void {
  const domainId = resolveDomainId(extensionId);

  // Call executeActionsChain fire-and-forget (no await)
  screensetsRegistry!.executeActionsChain({
    action: {
      type: HAI3_ACTION_LOAD_EXT,
      target: domainId,
      payload: { extensionId },
    },
  }).catch((error) => {
    console.error(`[MFE] Load failed for ${extensionId}:`, error);
  });
}
// @cpt-end:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-1

/**
 * Mount an MFE extension.
 * Auto-loads the extension if not already loaded.
 * The container is provided by the domain's ContainerProvider (registered at domain registration time).
 * Calls executeActionsChain() directly (fire-and-forget).
 *
 * @param extensionId - Extension to mount
 *
 * @example
 * ```typescript
 * import { mountExtension } from '@cyberfabric/framework';
 * mountExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
// @cpt-begin:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-2
export function mountExtension(extensionId: string): void {
  const domainId = resolveDomainId(extensionId);

  // Call executeActionsChain fire-and-forget (no await)
  screensetsRegistry!.executeActionsChain({
    action: {
      type: HAI3_ACTION_MOUNT_EXT,
      target: domainId,
      payload: { extensionId },
    },
  }).catch((error) => {
    console.error(`[MFE] Mount failed for ${extensionId}:`, error);
  });
}
// @cpt-end:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-2

/**
 * Unmount an MFE extension from its container.
 * Calls executeActionsChain() directly (fire-and-forget).
 *
 * @param extensionId - Extension to unmount
 *
 * @example
 * ```typescript
 * import { unmountExtension } from '@cyberfabric/framework';
 * unmountExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
// @cpt-begin:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-3
export function unmountExtension(extensionId: string): void {
  const domainId = resolveDomainId(extensionId);

  // Call executeActionsChain fire-and-forget (no await)
  screensetsRegistry!.executeActionsChain({
    action: {
      type: HAI3_ACTION_UNMOUNT_EXT,
      target: domainId,
      payload: { extensionId },
    },
  }).catch((error) => {
    console.error(`[MFE] Unmount failed for ${extensionId}:`, error);
  });
}
// @cpt-end:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-3

/**
 * Register an extension dynamically at runtime.
 * Emits event that MFE effects handle via runtime.registerExtension().
 *
 * @param extension - Extension instance to register
 *
 * @example
 * ```typescript
 * import { registerExtension } from '@cyberfabric/framework';
 * const extension: Extension = {
 *   id: 'gts.hai3.mfes.ext.extension.v1~my.extension.v1',
 *   domain: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1',
 *   entry: 'gts.hai3.mfes.mfe.entry.v1~my.entry.v1',
 * };
 * registerExtension(extension);
 * ```
 */
// @cpt-begin:cpt-frontx-flow-framework-composition-mfe-registration:p1:inst-1
export function registerExtension(extension: Extension): void {
  eventBus.emit(MfeEvents.RegisterExtensionRequested, { extension });
}
// @cpt-end:cpt-frontx-flow-framework-composition-mfe-registration:p1:inst-1

/**
 * Unregister an extension dynamically at runtime.
 * Emits event that MFE effects handle via runtime.unregisterExtension().
 *
 * @param extensionId - Extension ID to unregister
 *
 * @example
 * ```typescript
 * import { unregisterExtension } from '@cyberfabric/framework';
 * unregisterExtension('gts.hai3.mfes.ext.extension.v1~my.extension.v1');
 * ```
 */
export function unregisterExtension(extensionId: string): void {
  eventBus.emit(MfeEvents.UnregisterExtensionRequested, { extensionId });
}
