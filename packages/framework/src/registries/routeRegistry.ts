/**
 * Route Registry - Manages routes auto-synced from screensets
 *
 * Framework Layer: L2
 */

import type { MenuScreenItem, ScreenLoader, ScreensetDefinition } from '@hai3/screensets';
import type { RouteRegistry, RouteMatchResult, CompiledRoute, ScreensetRegistry } from '../types';
import {
  compileRoute,
  matchPath,
  generatePath as generatePathFromRoute,
} from '../utils/routeMatcher';

/**
 * Route entry type
 */
interface RouteEntry {
  screensetId: string;
  screenId: string;
  loader: ScreenLoader;
  pattern: string;
  compiledRoute: CompiledRoute;
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

    screensets.forEach((screenset: ScreensetDefinition) => {
      screenset.menu.forEach((menuScreenItem: MenuScreenItem) => {
        // Use screenId if provided, otherwise fallback to id
        const screenId = menuScreenItem.menuItem.screenId ?? menuScreenItem.menuItem.id;
        if (screenId && menuScreenItem.screen) {
          // Use custom path if provided, otherwise default to /{screenId}
          const pattern = menuScreenItem.menuItem.path ?? `/${screenId}`;
          const compiledRoute = compileRoute(pattern, screenset.id, screenId);
          routes!.push({
            screensetId: screenset.id,
            screenId,
            loader: menuScreenItem.screen,
            pattern,
            compiledRoute,
          });
        }
      });
    });

    // Sort routes for deterministic matching: static routes before dynamic routes
    // This ensures /users/new matches before /users/:id
    routes.sort((a, b) => {
      const aHasParams = a.pattern.includes(':');
      const bHasParams = b.pattern.includes(':');

      // Static routes (no params) come first
      if (!aHasParams && bHasParams) return -1;
      if (aHasParams && !bHasParams) return 1;

      // Both static or both dynamic - maintain original order
      return 0;
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

    /**
     * Match a URL path against registered routes, extracting params.
     * Returns the first matching route with extracted params, or undefined if no match.
     */
    matchRoute(path: string): RouteMatchResult | undefined {
      const allRoutes = buildRoutes();
      const compiledRoutes = allRoutes.map((r) => r.compiledRoute);
      return matchPath(path, compiledRoutes);
    },

    /**
     * Generate a URL path for a screen with given params.
     */
    generatePath(screenId: string, params: Record<string, string> = {}): string {
      const allRoutes = buildRoutes();
      const route = allRoutes.find((r) => r.screenId === screenId);
      if (!route) {
        console.warn(`Route not found for screen: ${screenId}`);
        return `/${screenId}`;
      }
      return generatePathFromRoute(route.compiledRoute, params);
    },

    /**
     * Get the route pattern for a screen.
     */
    getRoutePattern(screenId: string): string | undefined {
      const allRoutes = buildRoutes();
      const route = allRoutes.find((r) => r.screenId === screenId);
      return route?.pattern;
    },
  };
}
