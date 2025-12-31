/**
 * Route Registry - Manages routes auto-synced from screensets
 *
 * Framework Layer: L2
 */

import type { MenuScreenItem, ScreenLoader } from '@hai3/screensets';
import type { RouteRegistry, ScreensetRegistry } from '../types';

/**
 * Route entry type
 */
interface RouteEntry {
  screensetId: string;
  screenId: string;
  loader: ScreenLoader;
}

/**
 * Create a new route registry instance.
 *
 * @param screensetRegistry - Screenset registry to sync from
 */
export function createRouteRegistry(
  screensetRegistry: ScreensetRegistry
): RouteRegistry {
  // Lazy-initialized routes cache
  let routes: RouteEntry[] | null = null;

  /**
   * Build routes from screensets (lazy initialization)
   */
  function buildRoutes(): RouteEntry[] {
    if (routes !== null) {
      return routes;
    }

    routes = [];
    const screensets = screensetRegistry.getAll();

    screensets.forEach((screenset) => {
      screenset.menu.forEach((menuScreenItem: MenuScreenItem) => {
        // Use screenId if provided, otherwise fallback to id
        const screenId = menuScreenItem.menuItem.screenId ?? menuScreenItem.menuItem.id;
        if (screenId && menuScreenItem.screen) {
          routes!.push({
            screensetId: screenset.id,
            screenId,
            loader: menuScreenItem.screen,
          });
        }
      });
    });

    return routes;
  }

  return {
    /**
     * Check if a screen exists by screenId only (globally unique).
     */
    hasScreenById(screenId: string): boolean {
      const allRoutes = buildRoutes();
      return allRoutes.some((route) => route.screenId === screenId);
    },

    /**
     * Check if a screen exists by both screensetId and screenId (explicit lookup when screenset context is known).
     */
    hasScreen(screensetId: string, screenId: string): boolean {
      const allRoutes = buildRoutes();
      return allRoutes.some(
        (route) =>
          route.screensetId === screensetId && route.screenId === screenId
      );
    },

    /**
     * Get screenset ID for a given screen ID (reverse lookup).
     * Screen IDs are globally unique across all screensets.
     */
    getScreensetForScreen(screenId: string): string | undefined {
      const allRoutes = buildRoutes();
      const route = allRoutes.find((r) => r.screenId === screenId);
      return route?.screensetId;
    },

    /**
     * Get screen loader by screenId only.
     */
    getScreenById(screenId: string): ScreenLoader | undefined {
      const allRoutes = buildRoutes();
      const route = allRoutes.find((r) => r.screenId === screenId);
      return route?.loader;
    },

    /**
     * Get screen loader by both screensetId and screenId (explicit lookup when screenset context is known).
     */
    getScreen(
      screensetId: string,
      screenId: string
    ): ScreenLoader | undefined {
      const allRoutes = buildRoutes();
      const route = allRoutes.find(
        (r) => r.screensetId === screensetId && r.screenId === screenId
      );
      return route?.loader;
    },

    /**
     * Get all routes.
     */
    getAll(): Array<{ screensetId: string; screenId: string }> {
      const allRoutes = buildRoutes();
      return allRoutes.map(({ screensetId, screenId }) => ({
        screensetId,
        screenId,
      }));
    },
  };
}
