/**
 * Presets - Pre-configured plugin combinations
 *
 * Framework Layer: L2
 */

import type { HAI3Plugin, Presets, ThemesConfig } from '../types';
import { screensets } from '../plugins/screensets';
import { themes } from '../plugins/themes';
import { layout } from '../plugins/layout';
import { navigation } from '../plugins/navigation';
import { routing } from '../plugins/routing';
import { i18n } from '../plugins/i18n';
import { effects } from '../plugins/effects';
import { mock } from '../plugins/mock';

/**
 * Full preset configuration.
 */
export interface FullPresetConfig {
  /** Configuration for themes plugin */
  themes?: ThemesConfig;
}

/**
 * Full preset - All plugins for the complete HAI3 experience.
 * This is the default for `hai3 create` projects.
 *
 * Includes:
 * - screensets (screenset registry, screen slice)
 * - themes (theme registry, changeTheme action)
 * - layout (all layout domain slices and effects)
 * - navigation (navigateToScreen, navigateToScreenset actions)
 * - routing (route registry auto-synced from screensets)
 * - i18n (i18n registry, setLanguage action)
 * - effects (effect coordination)
 * - mock (mock mode control for API services)
 *
 * @param config - Optional preset configuration
 *
 * @example
 * ```typescript
 * import { applyTheme } from '@hai3/uikit';
 *
 * const app = createHAI3()
 *   .use(full({ themes: { applyFn: applyTheme } }))
 *   .build();
 * ```
 */
export function full(config?: FullPresetConfig): HAI3Plugin[] {
  return [
    effects(),
    screensets({ autoDiscover: true }),
    themes(config?.themes),
    layout(),
    routing(),
    navigation(),
    i18n(),
    mock(),
  ];
}

/**
 * Minimal preset - Screensets + themes only.
 * For users who want basic HAI3 patterns without full layout management.
 *
 * Includes:
 * - screensets (screenset registry, screen slice)
 * - themes (theme registry, changeTheme action)
 */
export function minimal(): HAI3Plugin[] {
  return [
    screensets({ autoDiscover: true }),
    themes(),
  ];
}

/**
 * Headless preset - Screensets only.
 * For external platform integration where you only need screenset orchestration.
 * The external platform provides its own menu, header, navigation, etc.
 *
 * Includes:
 * - screensets (screenset registry, screen slice)
 */
export function headless(): HAI3Plugin[] {
  return [
    screensets(),
  ];
}

/**
 * Presets collection
 */
export const presets: Presets = {
  full,
  minimal,
  headless,
};
