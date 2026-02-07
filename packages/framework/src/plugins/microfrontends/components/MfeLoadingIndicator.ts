/**
 * MFE Loading Indicator Component
 *
 * Vanilla DOM-based loading indicator for MFE loading operations.
 * Framework-agnostic - no React dependencies.
 *
 * NOTE: React-based loading components should be implemented in @hai3/react (Phase 14).
 */

/**
 * MFE Loading Indicator configuration
 */
export interface MfeLoadingIndicatorConfig {
  /** Container element to render loading indicator into */
  container: HTMLElement;
  /** Optional loading message */
  message?: string;
  /** Extension ID being loaded (optional) */
  extensionId?: string;
}

/**
 * MFE Loading Indicator class.
 *
 * Renders a loading spinner with message in vanilla DOM.
 * Used while MFE bundles are loading.
 *
 * @example
 * ```typescript
 * const indicator = new MfeLoadingIndicator({
 *   container: document.getElementById('mfe-container'),
 *   message: 'Loading extension...',
 *   extensionId: 'my.extension.v1'
 * });
 *
 * indicator.render();
 *
 * // Later cleanup
 * indicator.destroy();
 * ```
 */
export class MfeLoadingIndicator {
  private container: HTMLElement;
  private message: string;
  private extensionId?: string;
  private rootElement: HTMLDivElement | null = null;

  constructor(config: MfeLoadingIndicatorConfig) {
    this.container = config.container;
    this.message = config.message ?? 'Loading...';
    this.extensionId = config.extensionId;
  }

  /**
   * Render the loading indicator UI.
   */
  public render(): void {
    this.destroy(); // Clean up any existing UI

    const root = document.createElement('div');
    root.className = 'mfe-loading-indicator';
    root.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    `;

    // Spinner
    const spinner = document.createElement('div');
    spinner.className = 'mfe-spinner';
    spinner.style.cssText = `
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    `;

    // Add CSS animation for spinner
    if (!document.getElementById('mfe-spinner-keyframes')) {
      const style = document.createElement('style');
      style.id = 'mfe-spinner-keyframes';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    root.appendChild(spinner);

    // Message
    const messageElement = document.createElement('p');
    messageElement.textContent = this.message;
    messageElement.style.cssText = 'color: #666; margin-bottom: 0.5rem;';
    root.appendChild(messageElement);

    // Extension ID (optional)
    if (this.extensionId) {
      const extensionInfo = document.createElement('p');
      extensionInfo.textContent = this.extensionId;
      extensionInfo.style.cssText = 'font-size: 0.8rem; color: #999;';
      root.appendChild(extensionInfo);
    }

    this.rootElement = root;
    this.container.appendChild(root);
  }

  /**
   * Update the loading message.
   */
  public updateMessage(message: string): void {
    this.message = message;
    if (this.rootElement) {
      const messageElement = this.rootElement.querySelector('p');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  }

  /**
   * Clean up and remove loading UI.
   */
  public destroy(): void {
    if (this.rootElement && this.rootElement.parentNode === this.container) {
      this.container.removeChild(this.rootElement);
      this.rootElement = null;
    }
  }
}
