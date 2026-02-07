/**
 * MFE Error Boundary Component
 *
 * Vanilla DOM-based error boundary for MFE loading and mounting errors.
 * Framework-agnostic - no React dependencies.
 *
 * NOTE: React-based error boundaries should be implemented in @hai3/react (Phase 14).
 */

/**
 * MFE Error Boundary configuration
 */
export interface MfeErrorBoundaryConfig {
  /** Container element to render error into */
  container: HTMLElement;
  /** Error message to display */
  error: Error | string;
  /** Extension ID that failed */
  extensionId?: string;
  /** Retry callback */
  onRetry?: () => void;
}

/**
 * MFE Error Boundary class.
 *
 * Renders error UI with retry support in vanilla DOM.
 * Used when MFE loading or mounting fails.
 *
 * @example
 * ```typescript
 * const boundary = new MfeErrorBoundary({
 *   container: document.getElementById('mfe-container'),
 *   error: new Error('Failed to load MFE'),
 *   extensionId: 'my.extension.v1',
 *   onRetry: () => {
 *     // Retry loading logic
 *   }
 * });
 *
 * boundary.render();
 *
 * // Later cleanup
 * boundary.destroy();
 * ```
 */
export class MfeErrorBoundary {
  private container: HTMLElement;
  private error: Error | string;
  private extensionId?: string;
  private onRetry?: () => void;
  private rootElement: HTMLDivElement | null = null;

  constructor(config: MfeErrorBoundaryConfig) {
    this.container = config.container;
    this.error = config.error;
    this.extensionId = config.extensionId;
    this.onRetry = config.onRetry;
  }

  /**
   * Render the error boundary UI.
   */
  public render(): void {
    this.destroy(); // Clean up any existing UI

    const root = document.createElement('div');
    root.className = 'mfe-error-boundary';
    root.style.cssText = `
      padding: 2rem;
      text-align: center;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      margin: 1rem;
    `;

    const title = document.createElement('h3');
    title.textContent = 'MFE Load Error';
    title.style.cssText = 'color: #c00; margin-bottom: 1rem;';
    root.appendChild(title);

    if (this.extensionId) {
      const extensionInfo = document.createElement('p');
      extensionInfo.textContent = `Extension: ${this.extensionId}`;
      extensionInfo.style.cssText = 'font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;';
      root.appendChild(extensionInfo);
    }

    const errorMessage = document.createElement('p');
    const errorText = this.error instanceof Error ? this.error.message : String(this.error);
    errorMessage.textContent = errorText;
    errorMessage.style.cssText = 'color: #333; margin-bottom: 1rem;';
    root.appendChild(errorMessage);

    if (this.onRetry) {
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.style.cssText = `
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
      `;
      retryButton.addEventListener('click', () => {
        if (this.onRetry) {
          this.onRetry();
        }
      });
      root.appendChild(retryButton);
    }

    this.rootElement = root;
    this.container.appendChild(root);
  }

  /**
   * Clean up and remove error UI.
   */
  public destroy(): void {
    if (this.rootElement && this.rootElement.parentNode === this.container) {
      this.container.removeChild(this.rootElement);
      this.rootElement = null;
    }
  }
}
