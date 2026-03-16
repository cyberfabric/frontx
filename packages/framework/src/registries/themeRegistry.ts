/**
 * Theme Registry - Manages theme registration and application
 *
 * Framework Layer: L2
 */

import type { ThemeRegistry, ThemeConfig, UikitTheme, ThemeApplyFn, ThemesConfig } from '../types';

/**
 * Create a new theme registry instance.
 *
 * @param config - Optional configuration for the theme registry
 */
export function createThemeRegistry(config?: ThemesConfig): ThemeRegistry {
  const themes = new Map<string, ThemeConfig>();
  // Store UIKit themes (e.g., @hai3/uikit themes)
  const uikitThemes = new Map<string, UikitTheme>();
  let currentThemeId: string | null = null;
  // Custom apply function for UIKit themes (passed via constructor injection)
  const customApplyFn: ThemeApplyFn | null = config?.applyFn ?? null;

  // Subscription support for React
  const subscribers = new Set<() => void>();
  let version = 0;

  /**
   * Notify subscribers of theme change
   */
  function notifySubscribers(): void {
    version++;
    subscribers.forEach((callback) => callback());
  }

  /**
   * Apply CSS custom properties from theme to :root
   */
  function applyCSSVariables(config: ThemeConfig): void {
    // Skip if not in browser environment
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply each CSS variable
    Object.entries(config.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  return {
    /**
     * Register a theme.
     * Supports both config-based API and UIKit theme API.
     */
    register(configOrId: ThemeConfig | string, uikitTheme?: UikitTheme): void {
      // Handle UIKit theme API: register(id, theme)
      if (typeof configOrId === 'string') {
        const id = configOrId;
        if (!uikitTheme) {
          console.warn(`register() called with ID "${id}" but no theme object. Skipping.`);
          return;
        }

        if (themes.has(id)) {
          console.warn(`Theme "${id}" is already registered. Skipping.`);
          return;
        }

        // Store UIKit theme for apply
        uikitThemes.set(id, uikitTheme);

        // Create a minimal ThemeConfig for the registry
        // Try to extract name from UIKit theme if it's an object
        let themeName = id;
        if (uikitTheme && typeof uikitTheme === 'object' && 'name' in uikitTheme) {
          const nameValue = (uikitTheme as { name?: unknown }).name;
          if (typeof nameValue === 'string') {
            themeName = nameValue;
          }
        }
        const config: ThemeConfig = {
          id,
          name: themeName,
          variables: {}, // UIKit themes use custom apply function
        };

        themes.set(id, config);
        return;
      }

      // New API: register(config)
      const config = configOrId;

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

    /**
     * Get theme by ID.
     */
    get(id: string): ThemeConfig | undefined {
      return themes.get(id);
    },

    /**
     * Get all themes.
     */
    getAll(): ThemeConfig[] {
      return Array.from(themes.values());
    },

    /**
     * Apply a theme.
     */
    apply(id: string): void {
      const config = themes.get(id);

      if (!config) {
        console.warn(`Theme "${id}" not found. Cannot apply.`);
        return;
      }

      // Apply CSS variables if theme has them (config-based API)
      if (config.variables && Object.keys(config.variables).length > 0) {
        applyCSSVariables(config);
      }

      // Apply UIKit theme using custom apply function
      const uikitTheme = uikitThemes.get(id);
      if (uikitTheme && customApplyFn) {
        customApplyFn(uikitTheme, id);
      }

      currentThemeId = id;

      // Notify React subscribers of theme change
      notifySubscribers();
    },

    /**
     * Get current theme.
     */
    getCurrent(): ThemeConfig | undefined {
      return currentThemeId ? themes.get(currentThemeId) : undefined;
    },

    /**
     * Subscribe to theme changes.
     * Returns unsubscribe function.
     */
    subscribe(callback: () => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    /**
     * Get current version number.
     * Used by React for re-rendering.
     */
    getVersion(): number {
      return version;
    },
  };
}
