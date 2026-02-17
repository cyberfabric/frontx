import type { Root } from 'react-dom/client';
import type { ChildMfeBridge } from '@hai3/react';
import { ThemeAwareReactLifecycle } from './shared/ThemeAwareReactLifecycle';
import { HelloWorldScreen } from './screens/helloworld/HelloWorldScreen';

/**
 * Lifecycle implementation for the HelloWorld entry in the demo MFE.
 * Extends ThemeAwareReactLifecycle to inherit theme subscription logic.
 *
 * This class provides HelloWorld-specific Tailwind utilities and renders
 * the HelloWorldScreen component. The bridge is passed through as a prop for
 * communication with the host application.
 *
 * The container parameter is a Shadow DOM root (created by DefaultMountManager).
 * This lifecycle initializes Tailwind/UIKit styles inside the shadow root.
 */
class HelloWorldLifecycle extends ThemeAwareReactLifecycle {
  /**
   * Initialize Tailwind CSS and UIKit styles inside the Shadow DOM.
   * CSS variables and styles do NOT penetrate Shadow DOM, so we must
   * initialize them inside the shadow root.
   *
   * This implementation injects Tailwind utility classes and CSS variables
   * that MFE components need. The styles are scoped to the shadow root.
   */
  protected initializeStyles(shadowRoot: Element | ShadowRoot): void {
    const styleElement = document.createElement('style');

    // Include Tailwind base, components, and utilities
    // Plus CSS custom properties from UIKit theme system
    styleElement.textContent = `
      /* Tailwind base layer - reset and normalize */
      *, *::before, *::after {
        box-sizing: border-box;
        border-width: 0;
        border-style: solid;
        border-color: currentColor;
      }
      * { margin: 0; padding: 0; }

      /* Root element styles */
      :host {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Tailwind utilities - layout */
      .p-8 { padding: 2rem; }
      .p-4 { padding: 1rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .max-w-2xl { max-width: 42rem; }

      /* Tailwind utilities - display */
      .grid { display: grid; }
      .flex { display: flex; }
      .gap-2 { gap: 0.5rem; }

      /* Tailwind utilities - borders */
      .border { border-width: 1px; }
      .border-gray-200 { border-color: rgb(229 231 235); }
      .rounded-lg { border-radius: calc(var(--radius-lg)); }
      .rounded { border-radius: calc(var(--radius-md)); }

      /* Tailwind utilities - typography */
      .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

      /* Tailwind utilities - colors (theme-aware) */
      .text-gray-600 { color: hsl(var(--muted-foreground)); }
      .bg-background { background-color: hsl(var(--background)); }
      .text-foreground { color: hsl(var(--foreground)); }
      .border-border { border-color: hsl(var(--border)); }
    `;

    shadowRoot.appendChild(styleElement);
  }

  /**
   * Render the HelloWorld screen component.
   *
   * @param root - The React root to render into
   * @param bridge - The child MFE bridge for communication with the host
   */
  protected renderContent(root: Root, bridge: ChildMfeBridge): void {
    root.render(<HelloWorldScreen bridge={bridge} />);
  }
}

/**
 * Export a singleton instance of the lifecycle class.
 * Module Federation expects a default export; the handler calls
 * moduleFactory() which returns this module, then validates it
 * has mount/unmount methods.
 */
export default new HelloWorldLifecycle();
