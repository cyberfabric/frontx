// @cpt-algo:cpt-hai3-algo-studio-devtools-localStorage-guard:p1
/**
 * Utility functions for persisting Studio state to localStorage
 */

/**
 * Save a value to localStorage with a given key
 * Handles errors gracefully (e.g., quota exceeded, localStorage disabled)
 */
// @cpt-begin:cpt-hai3-algo-studio-devtools-localStorage-guard:p1:inst-1
export const saveStudioState = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Studio] Failed to save state for ${key}:`, e);
  }
};

/**
 * Load a value from localStorage with a given key
 * Returns defaultValue if key doesn't exist or on error
 */
export const loadStudioState = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`[Studio] Failed to load state for ${key}:`, e);
    return defaultValue;
  }
};
// @cpt-end:cpt-hai3-algo-studio-devtools-localStorage-guard:p1:inst-1
