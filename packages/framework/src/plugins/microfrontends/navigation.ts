/**
 * MFE Navigation Integration
 *
 * Integrates MFE mounting with navigation system.
 * Screen domain mounting = navigation to that screen.
 *
 * NOTE: This module provides navigation event handlers for MFE mounting.
 */

// ============================================================================
// Navigation Manager Class
// ============================================================================

/**
 * Abstract navigation manager.
 * Manages MFE navigation integration with screen routing.
 */
export abstract class NavigationManager {
  /**
   * Initialize navigation integration.
   * @returns Cleanup function to remove event listeners
   */
  abstract init(): () => void;

  /**
   * Get currently mounted screen extension ID.
   * @returns Extension ID or null if none mounted
   */
  abstract getCurrentScreenExtension(): string | null;

  /**
   * Get or create singleton instance.
   * @returns NavigationManager instance
   */
  static getInstance(): NavigationManager {
    return MfeNavigationManager.getInstance();
  }

  /**
   * Check if navigation is initialized.
   * @returns True if initialized
   */
  static isInitialized(): boolean {
    return MfeNavigationManager.isInitialized();
  }
}

/**
 * Concrete implementation of navigation manager.
 * Encapsulates navigation state and event subscriptions.
 */
class MfeNavigationManager extends NavigationManager {
  private static instance: MfeNavigationManager | null = null;

  private currentScreenExtensionId: string | null = null;
  private unsubscribers: Array<{ unsubscribe: () => void }> = [];
  private initialized = false;

  private constructor() {
    super();
  }

  static getInstance(): MfeNavigationManager {
    if (!MfeNavigationManager.instance) {
      MfeNavigationManager.instance = new MfeNavigationManager();
    }
    return MfeNavigationManager.instance;
  }

  static isInitialized(): boolean {
    return MfeNavigationManager.instance?.initialized ?? false;
  }

  init(): () => void {
    if (this.initialized) {
      throw new Error('NavigationManager already initialized');
    }

    this.initialized = true;

    // Navigation integration is available for future use
    // Currently no event subscriptions are needed
    // Applications handle mountExtension/unmountExtension explicitly

    // Return cleanup function
    return () => {
      this.unsubscribers.forEach((unsub) => unsub.unsubscribe());
      this.unsubscribers = [];
      this.currentScreenExtensionId = null;
      this.initialized = false;
    };
  }

  getCurrentScreenExtension(): string | null {
    return this.currentScreenExtensionId;
  }
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Initialize MFE navigation integration.
 * Connects screen navigation to MFE mounting/unmounting.
 *
 * Note: This implementation assumes screen domain and extension mapping is set up externally.
 *
 * @returns Cleanup function
 */
export function initMfeNavigation(): () => void {
  const manager = NavigationManager.getInstance();
  return manager.init();
}

/**
 * Get currently mounted screen extension ID.
 * Returns null if no screen extension is mounted or navigation is not initialized.
 */
export function getCurrentScreenExtension(): string | null {
  if (!NavigationManager.isInitialized()) {
    return null;
  }
  return NavigationManager.getInstance().getCurrentScreenExtension();
}
