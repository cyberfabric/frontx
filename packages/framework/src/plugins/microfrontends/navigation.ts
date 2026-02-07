/**
 * MFE Navigation Integration
 *
 * Integrates MFE mounting with navigation system.
 * Screen domain mounting = navigation to that screen.
 *
 * NOTE: This module provides navigation event handlers for MFE mounting.
 * Full functionality requires Phase 19 implementation of mountExtension/unmountExtension APIs.
 */

import { eventBus } from '@hai3/state';
import { unmountExtension } from './actions';

// ============================================================================
// Navigation Event Types
// ============================================================================

/** Navigation to screen event */
export const NavigationEvents = {
  NavigateToScreen: 'navigation/navigateToScreen',
  ScreenChanged: 'navigation/screenChanged',
} as const;

/** Payload for navigate to screen event */
export interface NavigateToScreenPayload {
  screensetId: string;
  screenId: string;
  params?: Record<string, string>;
}

/** Payload for screen changed event */
export interface ScreenChangedPayload {
  screensetId: string;
  screenId: string;
  previousScreenId?: string;
}

// Module augmentation for type-safe navigation events
declare module '@hai3/state' {
  interface EventPayloadMap {
    'navigation/navigateToScreen': NavigateToScreenPayload;
    'navigation/screenChanged': ScreenChangedPayload;
  }
}

// ============================================================================
// Navigation Integration State
// ============================================================================

/**
 * Navigation state container.
 * Encapsulates mutable state for navigation integration.
 */
interface NavigationState {
  currentScreenExtensionId: string | null;
}

// Module-level state container - stores a reference to the active navigation state
// This is set during initMfeNavigation() and cleared during cleanup
let activeNavigationState: NavigationState | null = null;

// ============================================================================
// Navigation Integration
// ============================================================================

/**
 * Initialize MFE navigation integration.
 * Connects screen navigation to MFE mounting/unmounting.
 *
 * **Phase 19 TODO**: This requires full mountExtension/unmountExtension implementation.
 *
 * @returns Cleanup function
 */
export function initMfeNavigation(): () => void {
  // Create state container for this navigation instance
  const navigationState: NavigationState = {
    currentScreenExtensionId: null,
  };

  // Set as active state
  activeNavigationState = navigationState;

  const unsubscribers: Array<{ unsubscribe: () => void }> = [];

  // Listen for screen changes
  const unsubScreenChanged = eventBus.on(NavigationEvents.ScreenChanged, async (payload) => {
    const { screenId, previousScreenId } = payload;

    // Unmount previous screen extension if exists
    if (previousScreenId && navigationState.currentScreenExtensionId) {
      try {
        unmountExtension(navigationState.currentScreenExtensionId);
        navigationState.currentScreenExtensionId = null;
      } catch (error) {
        console.error('[MFE Navigation] Failed to unmount previous screen:', error);
      }
    }

    // Mount new screen extension if it's an MFE
    // NOTE: Phase 19 required - screen domain needs to resolve screenId to extensionId
    // For now, this is a placeholder that will be fully implemented in Phase 19
    try {
      // In Phase 19, this will:
      // 1. Look up screen domain in registry
      // 2. Find extension for this screenId
      // 3. Get container element for screen domain
      // 4. Call mountExtension(extensionId, containerElement)

      console.log('[MFE Navigation] Screen changed to:', screenId);
      // Placeholder - will mount MFE when Phase 19 is complete
    } catch (error) {
      console.error('[MFE Navigation] Failed to mount screen extension:', error);
    }
  });
  unsubscribers.push(unsubScreenChanged);

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub.unsubscribe());
    navigationState.currentScreenExtensionId = null;
    // Clear active state reference
    if (activeNavigationState === navigationState) {
      activeNavigationState = null;
    }
  };
}

/**
 * Get currently mounted screen extension ID.
 * Returns null if no screen extension is mounted or navigation is not initialized.
 */
export function getCurrentScreenExtension(): string | null {
  return activeNavigationState?.currentScreenExtensionId ?? null;
}
