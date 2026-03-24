/**
 * Theme Registry - Manages theme registration and application
 *
 * Framework Layer: L2
 */
// @cpt-flow:cpt-hai3-flow-framework-composition-theme-propagation:p1
// @cpt-algo:cpt-hai3-algo-ui-libraries-choice-theme-propagation:p1
// @cpt-dod:cpt-hai3-dod-ui-libraries-choice-theme-propagation:p1

import type { ThemeRegistry, ThemeConfig } from '../types';

/**
 * Create a new theme registry instance.
 */
export function createThemeRegistry(): ThemeRegistry {
  const themes = new Map<string, ThemeConfig>();
  let currentThemeId: string | null = null;
  /** Track CSS property names set by the previous theme so they can be cleared on switch */
  let previousVarKeys: string[] = [];

  // Subscription support for React
  const subscribers = new Set<() => void>();
  let version = 0;

  function notifySubscribers(): void {
    version++;
    subscribers.forEach((callback) => callback());
  }

  /**
   * Clear previous theme vars and apply new CSS custom properties to :root
   */
  function applyCSSVariables(variables: Record<string, string>): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Clear previous theme vars that are not in the new set
    const newKeys = Object.keys(variables);
    for (const key of previousVarKeys) {
      if (!(key in variables)) {
        root.style.removeProperty(key);
      }
    }

    // Apply each CSS variable
    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value);
    }

    previousVarKeys = newKeys;
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
