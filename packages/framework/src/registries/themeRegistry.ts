/**
 * Theme Registry - Manages theme registration and application
 *
 * Framework Layer: L2
 */
// @cpt-flow:cpt-frontx-flow-framework-composition-theme-propagation:p1
// @cpt-algo:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-theme-propagation:p1

import type { ThemeRegistry, ThemeConfig } from '../types';

/**
 * Create a new theme registry instance.
 */
export function createThemeRegistry(): ThemeRegistry {
  const themes = new Map<string, ThemeConfig>();
  let currentThemeId: string | null = null;

  // Subscription support for React
  const subscribers = new Set<() => void>();
  let version = 0;

  function notifySubscribers(): void {
    version++;
    subscribers.forEach((callback) => {
      callback();
    });
  }

  /**
   * Write theme CSS custom properties into a managed <style> element in <head>.
   * Using a stylesheet rule instead of inline styles allows Shadow DOM :host rules
   * and user CSS to override theme variables, which inline style.setProperty() blocks.
   */
  function applyCSSVariables(variables: Record<string, string>): void {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById('hai3-theme-vars') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'hai3-theme-vars';
      document.head.appendChild(styleEl);
    }

    const entries = Object.entries(variables);
    if (entries.length === 0) {
      styleEl.textContent = '';
      return;
    }

    // Strip </style> sequences to prevent CSS injection if values ever come from external sources.
    const safe = (s: string) => s.replace(/<\/style/gi, '');
    const varLines = entries.map(([key, value]) => `  ${safe(key)}: ${safe(value)};`).join('\n');
    styleEl.textContent = `:root {\n${varLines}\n}`;
  }

  return {
    register(config: ThemeConfig): void {
      if (themes.has(config.id)) {
        console.warn(`Theme "${config.id}" is already registered. Skipping.`);
        return;
      }

      themes.set(config.id, config);

      // If this is the default theme and no theme is applied yet, apply it
      if (config.default && currentThemeId === null) {
        this.apply(config.id);
      }
    },

    get(id: string): ThemeConfig | undefined {
      return themes.get(id);
    },

    getAll(): ThemeConfig[] {
      return Array.from(themes.values());
    },

    apply(id: string): void {
      const config = themes.get(id);

      if (!config) {
        console.warn(`Theme "${id}" not found. Cannot apply.`);
        return;
      }

      applyCSSVariables(config.variables);
      currentThemeId = id;
      notifySubscribers();
    },

    getCurrent(): ThemeConfig | undefined {
      return currentThemeId ? themes.get(currentThemeId) : undefined;
    },

    subscribe(callback: () => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    getVersion(): number {
      return version;
    },
  };
}
