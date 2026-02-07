/**
 * Shadow DOM Container
 *
 * Vanilla DOM-based Shadow DOM container for MFE style isolation.
 * Framework-agnostic - no React dependencies.
 *
 * NOTE: This component depends on Shadow DOM utilities from @hai3/screensets (Phase 16).
 * Until Phase 16 is complete, this uses minimal DOM APIs directly.
 * Phase 16 will provide createShadowRoot() and injectCssVariables() utilities.
 *
 * NOTE: React-based ShadowDomContainer should be implemented in @hai3/react (Phase 14).
 */

/**
 * Shadow DOM Container configuration
 */
export interface ShadowDomContainerConfig {
  /** Host element to attach shadow root to */
  hostElement: HTMLElement;
  /** CSS mode for shadow DOM */
  mode?: 'open' | 'closed';
  /** CSS variables to inject (optional) */
  cssVariables?: Record<string, string>;
}

/**
 * Shadow DOM Container class.
 *
 * Creates and manages a shadow root for MFE rendering with style isolation.
 * Provides CSS variable passthrough for theme integration.
 *
 * **Phase 16 TODO**: Replace direct DOM API usage with:
 * - `createShadowRoot()` from `@hai3/screensets`
 * - `injectCssVariables()` from `@hai3/screensets`
 *
 * @example
 * ```typescript
 * const container = new ShadowDomContainer({
 *   hostElement: document.getElementById('mfe-host'),
 *   mode: 'open',
 *   cssVariables: {
 *     '--primary-color': '#007bff',
 *     '--font-family': 'Arial, sans-serif'
 *   }
 * });
 *
 * container.create();
 *
 * // Render MFE content into shadow root
 * const shadowRoot = container.getShadowRoot();
 * shadowRoot.innerHTML = '<div>MFE Content</div>';
 *
 * // Later cleanup
 * container.destroy();
 * ```
 */
export class ShadowDomContainer {
  private hostElement: HTMLElement;
  private mode: 'open' | 'closed';
  private cssVariables: Record<string, string>;
  private shadowRoot: ShadowRoot | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: ShadowDomContainerConfig) {
    this.hostElement = config.hostElement;
    this.mode = config.mode ?? 'open';
    this.cssVariables = config.cssVariables ?? {};
  }

  /**
   * Create the shadow root and inject CSS variables.
   *
   * **Phase 16 TODO**: Replace with `createShadowRoot()` from `@hai3/screensets`
   */
  public create(): ShadowRoot {
    if (this.shadowRoot) {
      return this.shadowRoot;
    }

    // Create shadow root using native DOM API
    // Phase 16 will replace this with: createShadowRoot(this.hostElement, { mode: this.mode })
    this.shadowRoot = this.hostElement.attachShadow({ mode: this.mode });

    // Inject CSS variables
    this.injectCssVariables();

    return this.shadowRoot;
  }

  /**
   * Inject CSS variables into shadow root.
   *
   * **Phase 16 TODO**: Replace with `injectCssVariables()` from `@hai3/screensets`
   */
  private injectCssVariables(): void {
    if (!this.shadowRoot) return;

    // Create or update style element
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.shadowRoot.appendChild(this.styleElement);
    }

    // Generate CSS custom properties
    const cssRules = Object.entries(this.cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    this.styleElement.textContent = `
:host {
${cssRules}
}

/* Reset styles to isolate from parent */
:host {
  all: initial;
  display: block;
}
    `;
  }

  /**
   * Update CSS variables.
   * Useful for theme changes.
   *
   * **Phase 16 TODO**: Replace with `injectCssVariables()` from `@hai3/screensets`
   */
  public updateCssVariables(cssVariables: Record<string, string>): void {
    this.cssVariables = { ...this.cssVariables, ...cssVariables };
    if (this.shadowRoot) {
      this.injectCssVariables();
    }
  }

  /**
   * Get the shadow root instance.
   * Returns null if not yet created.
   */
  public getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /**
   * Check if shadow root exists.
   */
  public isCreated(): boolean {
    return this.shadowRoot !== null;
  }

  /**
   * Clean up and remove shadow root.
   */
  public destroy(): void {
    if (this.shadowRoot && this.hostElement.shadowRoot === this.shadowRoot) {
      // Shadow roots cannot be removed, but we can clear content
      this.shadowRoot.innerHTML = '';
      this.shadowRoot = null;
      this.styleElement = null;
    }
  }
}
