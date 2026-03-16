/**
 * Themes Plugin - Provides theme registry and changeTheme action
 *
 * Framework Layer: L2
 */

// @cpt-flow:cpt-hai3-flow-framework-composition-theme-propagation:p1
// @cpt-flow:cpt-hai3-flow-framework-composition-shared-property-broadcast:p1
// @cpt-dod:cpt-hai3-dod-framework-composition-propagation:p1
// @cpt-dod:cpt-hai3-dod-framework-composition-shared-property:p1

import { eventBus } from '@hai3/state';
import { HAI3_SHARED_PROPERTY_THEME } from '@hai3/screensets';
import type { HAI3Plugin, ChangeThemePayload, ThemesConfig } from '../types';
import { createThemeRegistry } from '../registries/themeRegistry';

// Define theme events for module augmentation
declare module '@hai3/state' {
  interface EventPayloadMap {
    'theme/changed': ChangeThemePayload;
  }
}

/**
 * Change theme action.
 * Emits 'theme/changed' event to trigger theme application.
 *
 * @param payload - The theme change payload
 */
// @cpt-begin:cpt-hai3-flow-framework-composition-theme-propagation:p1:inst-1
function changeTheme(payload: ChangeThemePayload): void {
  eventBus.emit('theme/changed', payload);
}
// @cpt-end:cpt-hai3-flow-framework-composition-theme-propagation:p1:inst-1

/**
 * Themes plugin factory.
 *
 * @param config - Optional themes configuration
 * @returns Themes plugin
 *
 * @example
 * ```typescript
 * import { applyTheme } from '@hai3/uikit';
 *
 * const app = createHAI3()
 *   .use(screensets())
 *   .use(themes({ applyFn: applyTheme }))
 *   .build();
 *
 * app.actions.changeTheme({ themeId: 'dark' });
 * ```
 */
export function themes(config?: ThemesConfig): HAI3Plugin {
  // Create a new theme registry instance for this plugin
  const themeRegistry = createThemeRegistry(config);

  return {
    name: 'themes',
    dependencies: [],

    provides: {
      registries: {
        themeRegistry,
      },
      actions: {
        changeTheme,
      },
    },

    // @cpt-begin:cpt-hai3-flow-framework-composition-theme-propagation:p1:inst-2
    // @cpt-begin:cpt-hai3-dod-framework-composition-propagation:p1:inst-1
    onInit(app) {
      // Subscribe to theme changes
      eventBus.on('theme/changed', (payload: ChangeThemePayload) => {
        themeRegistry.apply(payload.themeId);
        try {
          app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, payload.themeId);
        } catch (error) {
          console.error('[HAI3] Failed to propagate theme to MFE domains', error);
        }
      });

      // Bootstrap: Apply the first registered theme (or default)
      const themes = themeRegistry.getAll();
      if (themes.length > 0) {
        themeRegistry.apply(themes[0].id);
      }
    },
    // @cpt-end:cpt-hai3-flow-framework-composition-theme-propagation:p1:inst-2
    // @cpt-end:cpt-hai3-dod-framework-composition-propagation:p1:inst-1
  };
}
