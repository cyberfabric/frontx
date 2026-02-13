/**
 * Base Domain Factories
 *
 * Factory functions for loading HAI3 base extension domains from JSON files.
 * These domains are NOT registered at plugin init - they are registered
 * dynamically at runtime via runtime.registerDomain().
 *
 * Domain definitions are loaded from framework-local JSON files.
 *
 * This follows the GTS entity storage principle: JSON as the native format,
 * TypeScript interfaces for compile-time type safety.
 *
 * @packageDocumentation
 */

import type { ExtensionDomain } from '@hai3/screensets';
import { loadLayoutDomains } from './gts/loader';

// Load all layout domains from framework-local JSON files
// The loader returns an array of [sidebar, popup, screen, overlay]
const layoutDomains = loadLayoutDomains();

// Extract individual domains from the loaded array
const [sidebarDomainJson, popupDomainJson, screenDomainJson, overlayDomainJson] = layoutDomains;

/**
 * Create a sidebar domain by loading from JSON.
 *
 * Sidebar domains provide a collapsible side panel for extensions.
 * They support load_ext, mount_ext, and unmount_ext actions.
 *
 * @returns Sidebar domain instance loaded from JSON
 *
 * @example
 * ```typescript
 * const sidebarDomain = createSidebarDomain();
 * runtime.registerDomain(sidebarDomain, containerProvider);
 * ```
 */
export function createSidebarDomain(): ExtensionDomain {
  return sidebarDomainJson as ExtensionDomain;
}

/**
 * Create a popup domain by loading from JSON.
 *
 * Popup domains provide modal dialog slots for extensions.
 * They support load_ext, mount_ext, and unmount_ext actions.
 *
 * @returns Popup domain instance loaded from JSON
 *
 * @example
 * ```typescript
 * const popupDomain = createPopupDomain();
 * runtime.registerDomain(popupDomain, containerProvider);
 * ```
 */
export function createPopupDomain(): ExtensionDomain {
  return popupDomainJson as ExtensionDomain;
}

/**
 * Create a screen domain by loading from JSON.
 *
 * Screen domains provide the main content area for extensions.
 * They support load_ext and mount_ext (with swap semantics).
 * They do NOT support unmount_ext - you cannot have "no screen selected".
 *
 * @returns Screen domain instance loaded from JSON
 *
 * @example
 * ```typescript
 * const screenDomain = createScreenDomain();
 * runtime.registerDomain(screenDomain, containerProvider);
 * ```
 */
export function createScreenDomain(): ExtensionDomain {
  return screenDomainJson as ExtensionDomain;
}

/**
 * Create an overlay domain by loading from JSON.
 *
 * Overlay domains provide full-screen overlay slots for extensions.
 * They support load_ext, mount_ext, and unmount_ext actions.
 *
 * @returns Overlay domain instance loaded from JSON
 *
 * @example
 * ```typescript
 * const overlayDomain = createOverlayDomain();
 * runtime.registerDomain(overlayDomain, containerProvider);
 * ```
 */
export function createOverlayDomain(): ExtensionDomain {
  return overlayDomainJson as ExtensionDomain;
}
