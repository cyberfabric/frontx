/**
 * Navigation Plugin - Provides navigation actions and URL sync
 *
 * Framework Layer: L2
 *
 * NOTE: Uses layout slices from @hai3/framework (not @hai3/uicore which is deprecated)
 */

import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { eventBus } from '@hai3/state';
import { i18nRegistry } from '@hai3/i18n';
import { screenActions as screenActionsImport, menuActions as menuActionsImport } from '../slices';
import type { HAI3Plugin, NavigateToScreenPayload, NavigateToScreensetPayload, NavigationConfig } from '../types';
import { stripBase, prependBase, resolveBase } from '../utils/basePath';
import type { MenuScreenItem, ScreensetDefinition } from '@hai3/screensets';
import { extractRequiredParams } from '../utils/routeMatcher';

// Type assertion for slice imports (needed for plugin system compatibility)
type ActionCreators = Record<string, (payload?: unknown) => UnknownAction>;
const screenActions = screenActionsImport as unknown as ActionCreators;
const menuActions = menuActionsImport as unknown as ActionCreators;

// Define navigation events for module augmentation
declare module '@hai3/state' {
  interface EventPayloadMap {
    'navigation/screen/navigated': NavigateToScreenPayload;
    'navigation/screenset/navigated': NavigateToScreensetPayload;
  }
}

/**
 * Navigate to screen action.
 * Emits 'navigation/screen/navigated' event.
 *
 * @param payload - The navigation payload
 */
function navigateToScreen(payload: NavigateToScreenPayload): void {
  eventBus.emit('navigation/screen/navigated', payload);
}

/**
 * Navigate to screenset action.
 * Emits 'navigation/screenset/navigated' event.
 *
 * @param payload - The navigation payload
 */
function navigateToScreenset(payload: NavigateToScreensetPayload): void {
  eventBus.emit('navigation/screenset/navigated', payload);
}

/**
 * Navigation plugin factory.
 *
 * @param config - Optional navigation configuration
 * @returns Navigation plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(screensets())
 *   .use(navigation({ base: '/app' }))
 *   .build();
 *
 * app.actions.navigateToScreen({ screensetId: 'demo', screenId: 'home' });
 * ```
 */
export function navigation(config?: NavigationConfig): HAI3Plugin {

  return {
    name: 'navigation',
    dependencies: ['screensets'],

    provides: {
      actions: {
        navigateToScreen,
        navigateToScreenset,
      },
    },

    onInit(app) {
      const dispatch = app.store.dispatch as Dispatch<UnknownAction>;
      const base = resolveBase(config, app.config);
      const routerMode = app.config.routerMode ?? 'browser';
      let currentScreensetId: string | null = null;

      // URL helpers that respect router mode
      const getCurrentPath = (): string => {
        if (typeof window === 'undefined') return '/';

        switch (routerMode) {
          case 'hash':
            // Extract path from hash: #/path -> /path
            return window.location.hash.slice(1) || '/';
          case 'memory':
            // Memory mode doesn't use URL
            return '/';
          case 'browser':
          default:
            return window.location.pathname;
        }
      };

      const updateURL = (path: string): void => {
        if (typeof window === 'undefined' || routerMode === 'memory') {
          return; // Skip URL updates in memory mode
        }

        const url = prependBase(path, base);

        switch (routerMode) {
          case 'hash':
            // Update hash: /path -> #/path
            if (window.location.hash !== `#${url}`) {
              window.location.hash = url;
            }
            break;
          case 'browser':
          default:
            if (window.location.pathname !== url) {
              window.history.pushState(null, '', url);
            }
            break;
        }
      };

      // Load screenset translations (async, non-blocking)
      const loadScreensetTranslations = async (screensetId: string, language?: string): Promise<void> => {
        await i18nRegistry.loadScreensetTranslations(
          screensetId,
          language as Parameters<typeof i18nRegistry.loadScreensetTranslations>[1]
        );
      };

      // Update screenset menu items
      const updateScreensetMenu = (screenset: ScreensetDefinition): void => {
        const menuItems = screenset.menu.map((item: MenuScreenItem) => ({
          id: item.menuItem.screenId ?? item.menuItem.id,
          label: item.menuItem.label,
          icon: item.menuItem.icon,
        }));
        dispatch(menuActions.setMenuItems(menuItems));
      };

      // Activate screenset (menu + translations)
      const activateScreenset = (screensetId: string): void => {
        if (screensetId === currentScreensetId) {
          return;
        }

        const screenset = app.screensetRegistry.get(screensetId);
        if (!screenset) {
          return;
        }

        currentScreensetId = screensetId;

        loadScreensetTranslations(screensetId).catch((err) => {
          console.warn(`[HAI3] Failed to load translations for screenset ${screensetId}:`, err);
        });

        updateScreensetMenu(screenset);
      };

      // Extract internal path from current URL (without base)
      const extractInternalPath = (): string => {
        const currentPath = getCurrentPath();
        return stripBase(currentPath, base) || '/';
      };

      // Activate screen from route match (screenset + Redux state)
      const activateFromRouteMatch = (match: { screensetId: string; screenId: string; params: Record<string, string> }): void => {
        activateScreenset(match.screensetId);
        dispatch(screenActions.navigateTo(match.screenId));
      };

      // Match current URL path against routes
      const matchCurrentPath = (): { screensetId: string; screenId: string; params: Record<string, string> } | undefined => {
        const path = extractInternalPath();
        return app.routeRegistry?.matchRoute(path);
      };

      // Handle navigation to specific screen
      eventBus.on('navigation/screen/navigated', (payload: NavigateToScreenPayload) => {
        if (!app.routeRegistry?.hasScreen(payload.screensetId, payload.screenId)) {
          console.warn(
            `Screen "${payload.screenId}" in screenset "${payload.screensetId}" not found.`
          );
          return;
        }

        // Validate required params
        const pattern = app.routeRegistry?.getRoutePattern(payload.screenId);
        if (pattern) {
          const requiredParams = extractRequiredParams(pattern);
          const providedParams = payload.params || {};

          const missingParams = requiredParams.filter(param => !(param in providedParams));
          if (missingParams.length > 0) {
            console.warn(
              `Screen "${payload.screenId}" requires route params [${requiredParams.join(', ')}] but missing: [${missingParams.join(', ')}]`
            );
            return;
          }
        }

        activateScreenset(payload.screensetId);
        dispatch(screenActions.navigateTo(payload.screenId));

        // Generate URL from route pattern and params, then update based on router mode
        const path = app.routeRegistry?.generatePath(payload.screenId, payload.params) ?? `/${payload.screenId}`;
        updateURL(path);
      });

      // Handle navigation to screenset (default screen)
      eventBus.on('navigation/screenset/navigated', (payload: NavigateToScreensetPayload) => {
        const screenset = app.screensetRegistry.get(payload.screensetId);
        if (!screenset) {
          console.warn(`Screenset "${payload.screensetId}" not found.`);
          return;
        }

        navigateToScreen({
          screensetId: payload.screensetId,
          screenId: screenset.defaultScreen,
        });
      });

      let lastLoadedLanguage: string | null = null;

      // Reload translations when language changes
      i18nRegistry.subscribe(() => {
        const currentLanguage = i18nRegistry.getLanguage();
        if (!currentLanguage || currentLanguage === lastLoadedLanguage) {
          return;
        }

        if (!currentScreensetId) {
          return;
        }

        const screenset = app.screensetRegistry.get(currentScreensetId);
        if (!screenset) {
          return;
        }

        lastLoadedLanguage = currentLanguage;

        loadScreensetTranslations(currentScreensetId, currentLanguage)
          .then(() => updateScreensetMenu(screenset))
          .catch((err) => {
            console.warn(
              `[HAI3] Failed to reload translations for screenset ${currentScreensetId}:`,
              err
            );
          });
      });

      if (typeof window !== 'undefined' && routerMode !== 'memory') {
        // Handle browser back/forward (popstate for browser, hashchange for hash)
        const handleURLChange = () => {
          const match = matchCurrentPath();
          if (match) {
            activateFromRouteMatch(match);
          }
        };

        if (routerMode === 'hash') {
          window.addEventListener('hashchange', handleURLChange);
        } else {
          window.addEventListener('popstate', handleURLChange);
        }

        // Initial navigation on page load
        const match = matchCurrentPath();
        const autoNavigate = app.config.autoNavigate !== false;

        if (match) {
          activateFromRouteMatch(match);
        } else if (autoNavigate) {
          const screensets = app.screensetRegistry.getAll();
          if (screensets.length > 0) {
            navigateToScreenset({ screensetId: screensets[0].id });
          }
        }
      } else if (routerMode === 'memory') {
        // Memory mode: auto-navigate without URL sync
        const autoNavigate = app.config.autoNavigate !== false;
        if (autoNavigate) {
          const screensets = app.screensetRegistry.getAll();
          if (screensets.length > 0) {
            navigateToScreenset({ screensetId: screensets[0].id });
          }
        }
      }
    },
  };
}
