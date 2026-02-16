/**
 * Presets - Pre-configured plugin combinations
 *
 * Framework Layer: L2
 */

import type { HAI3Plugin, Presets, ThemesConfig } from '../types';
import { screensets } from '../plugins/screensets';
import { themes } from '../plugins/themes';
import { layout } from '../plugins/layout';
import { i18n } from '../plugins/i18n';
import { effects } from '../plugins/effects';
import { mock } from '../plugins/mock';
import { microfrontends, type MicrofrontendsConfig } from '../plugins/microfrontends';

/**
 * Full preset configuration.
 */
export interface FullPresetConfig {
  /** Configuration for themes plugin */
  themes?: ThemesConfig;
  /** Configuration for microfrontends plugin */
  microfrontends?: MicrofrontendsConfig;
}

/**
 * Full preset - All plugins for the complete HAI3 experience.
 * This is the default for `hai3 create` projects.
 *
 * Includes:
 * - screensets (screenset registry, screen slice)
 * - themes (theme registry, changeTheme action)
 * - layout (all layout domain slices and effects)
 * - i18n (i18n registry, setLanguage action)
 * - effects (effect coordination)
 * - mock (mock mode control for API services)
 * - microfrontends (MFE registry, actions, effects)
 *
 * @param config - Optional preset configuration
 *
 * @example
 * ```typescript
 * import { applyTheme } from '@hai3/uikit';
 * import { MfeHandlerMF } from '@hai3/screensets/mfe/handler';
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const app = createHAI3()
 *   .use(full({
 *     themes: { applyFn: applyTheme },
 *     microfrontends: { mfeHandlers: [new MfeHandlerMF(gtsPlugin)] }
 *   }))
 *   .build();
 * ```
 */
export function full(config?: FullPresetConfig): HAI3Plugin[] {
  return [
    effects(),
    screensets({ autoDiscover: true }),
    themes(config?.themes),
    layout(),
    i18n(),
    mock(),
    microfrontends(config?.microfrontends),
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
