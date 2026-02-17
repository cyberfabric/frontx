import { createRoot, type Root } from 'react-dom/client';
import type { MfeEntryLifecycle, ChildMfeBridge, SharedProperty } from '@hai3/react';
import { HAI3_SHARED_PROPERTY_THEME } from '@hai3/react';
import { applyThemeToShadowRoot } from '@hai3/uikit';
import { resolveTheme } from './themes';

/**
 * Abstract base class for React-based MFE lifecycle implementations with theme awareness.
 *
 * This class implements the common pattern shared by all theme-aware MFE lifecycles:
 * - Shadow root detection
 * - Initial theme application
 * - Theme change subscription
 * - React root creation and rendering
 * - Cleanup on unmount
 *
 * Concrete subclasses must provide:
 * - `initializeStyles(container)` - screen-specific Tailwind utilities
 * - `renderContent(root, bridge)` - screen component rendering
 *
 * The 7-step mount sequence prevents FOUC (Flash of Unstyled Content) by ensuring
 * theme CSS variables exist before React renders the first time.
 *
 * @packageDocumentation
 */
export abstract class ThemeAwareReactLifecycle implements MfeEntryLifecycle<ChildMfeBridge> {
  private root: Root | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private unsubscribeTheme: (() => void) | null = null;

  mount(container: Element | ShadowRoot, bridge: ChildMfeBridge): void {
    // Step 1: Store shadow root reference safely
    this.shadowRoot = container instanceof ShadowRoot ? container : null;

    // Step 2: Initialize base styles (Tailwind utilities, NO CSS variables)
    this.initializeStyles(container);

    // Step 3: Read initial theme ID from bridge
    const initialProperty = bridge.getProperty(HAI3_SHARED_PROPERTY_THEME);

    // Step 4: Apply initial theme via applyThemeToShadowRoot
    if (initialProperty && typeof initialProperty.value === 'string' && this.shadowRoot) {
      const theme = resolveTheme(initialProperty.value);
      if (theme) {
        applyThemeToShadowRoot(this.shadowRoot, theme, initialProperty.value);
      }
    }

    // Step 5: Subscribe to future theme changes
    this.unsubscribeTheme = bridge.subscribeToProperty(
      HAI3_SHARED_PROPERTY_THEME,
      (property: SharedProperty) => {
        if (this.shadowRoot && typeof property.value === 'string') {
          const theme = resolveTheme(property.value);
          if (theme) {
            applyThemeToShadowRoot(this.shadowRoot, theme, property.value);
          }
        }
      }
    );

    // Step 6: Create React root AFTER theme vars exist
    this.root = createRoot(container);

    // Step 7: Render - first render has correct theme variables available
    this.renderContent(this.root, bridge);
  }

  unmount(_container: Element | ShadowRoot): void {
    // Unsubscribe from theme changes
    if (this.unsubscribeTheme) {
      this.unsubscribeTheme();
      this.unsubscribeTheme = null;
    }

    // Clear shadow root reference
    this.shadowRoot = null;

    // Unmount React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  /**
   * Initialize screen-specific Tailwind utilities inside the Shadow DOM.
   *
   * CSS variables and styles do NOT penetrate Shadow DOM, so we must
   * initialize them inside the shadow root. Each concrete lifecycle
   * provides its own set of Tailwind utility classes needed for its screen.
   *
   * @param container - The Shadow DOM root or element to append styles to
   */
  protected abstract initializeStyles(container: Element | ShadowRoot): void;

  /**
   * Render the screen-specific React component.
   *
   * Each concrete lifecycle renders its own screen component
   * (e.g., `root.render(<HelloWorldScreen bridge={bridge} />)`).
   *
   * @param root - The React root to render into
   * @param bridge - The child MFE bridge for communication with the host
   */
  protected abstract renderContent(root: Root, bridge: ChildMfeBridge): void;
}
