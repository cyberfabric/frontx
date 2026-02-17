import type { Root } from 'react-dom/client';
import type { ChildMfeBridge } from '@hai3/react';
import { ThemeAwareReactLifecycle } from './shared/ThemeAwareReactLifecycle';
import { UIKitElementsScreen } from './screens/uikit/UIKitElementsScreen';

/**
 * Lifecycle implementation for the UIKit Elements entry in the demo MFE.
 * Extends ThemeAwareReactLifecycle to inherit theme subscription logic.
 *
 * This class provides UIKit Elements-specific Tailwind utilities and renders
 * the UIKitElementsScreen component. The bridge is passed through as a prop for
 * communication with the host application.
 *
 * The container parameter is a Shadow DOM root (created by DefaultMountManager).
 * This lifecycle initializes Tailwind/UIKit styles inside the shadow root.
 */
class UIKitElementsLifecycle extends ThemeAwareReactLifecycle {
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
      /* Tailwind base layer */
      *, *::before, *::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: currentColor; }
      * { margin: 0; padding: 0; }
      :host {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .p-8 { padding: 2rem; } .p-4 { padding: 1rem; } .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .mb-2 { margin-bottom: 0.5rem; } .mb-3 { margin-bottom: 0.75rem; } .mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; }
      .mt-4 { margin-top: 1rem; }
      .max-w-2xl { max-width: 42rem; } .max-w-4xl { max-width: 56rem; }
      .w-full { width: 100%; }
      .grid { display: grid; } .flex { display: flex; } .inline-flex { display: inline-flex; }
      .items-center { align-items: center; } .justify-between { justify-content: space-between; }
      .gap-2 { gap: 0.5rem; } .gap-3 { gap: 0.75rem; } .gap-4 { gap: 1rem; }
      .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .border { border-width: 1px; } .border-gray-200 { border-color: rgb(229 231 235); }
      .rounded-lg { border-radius: calc(var(--radius-lg)); } .rounded { border-radius: calc(var(--radius-md)); }
      .rounded-md { border-radius: calc(var(--radius-md)); }
      .text-3xl { font-size: 1.875rem; line-height: 2.25rem; } .text-2xl { font-size: 1.5rem; line-height: 2rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; } .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; } .text-xs { font-size: 0.75rem; line-height: 1rem; }
      .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .text-gray-600 { color: hsl(var(--muted-foreground)); }
      .text-gray-500 { color: hsl(var(--muted-foreground)); }
      .bg-background { background-color: hsl(var(--background)); }
      .bg-muted { background-color: hsl(var(--muted)); }
      .bg-primary { background-color: hsl(var(--primary)); }
      .text-foreground { color: hsl(var(--foreground)); }
      .text-primary { color: hsl(var(--primary)); }
      .text-primary-foreground { color: hsl(var(--primary-foreground)); }
      .border-border { border-color: hsl(var(--border)); }
      .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
      .overflow-hidden { overflow: hidden; }
      .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .space-y-2 > :not(:first-child) { margin-top: 0.5rem; }
      .space-y-4 > :not(:first-child) { margin-top: 1rem; }
    `;

    shadowRoot.appendChild(styleElement);
  }

  /**
   * Render the UIKit Elements screen component.
   *
   * @param root - The React root to render into
   * @param bridge - The child MFE bridge for communication with the host
   */
  protected renderContent(root: Root, bridge: ChildMfeBridge): void {
    root.render(<UIKitElementsScreen bridge={bridge} />);
  }
}

/**
 * Export a singleton instance of the lifecycle class.
 * Module Federation expects a default export; the handler calls
 * moduleFactory() which returns this module, then validates it
 * has mount/unmount methods.
 */
export default new UIKitElementsLifecycle();
