/**
 * Presets - Pre-configured plugin combinations
 *
 * Framework Layer: L2
 */

// @cpt-flow:cpt-frontx-flow-framework-composition-full-preset:p1
// @cpt-dod:cpt-frontx-dod-framework-composition-presets:p1

import type { HAI3Plugin, Presets } from '../types';
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
  /** Configuration for microfrontends plugin */
  microfrontends?: MicrofrontendsConfig;
}

/**
 * Full preset - All plugins for the complete FrontX experience.
 * This is the default for `frontx create` projects.
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
 * import { MfeHandlerMF, FrontX_MFE_ENTRY_MF } from '@cyberfabric/screensets/mfe/handler';
 * import { gtsPlugin } from '@cyberfabric/screensets/plugins/gts';
 *
 * const app = createFrontX()
 *   .use(full({
 *     microfrontends: { typeSystem: gtsPlugin, mfeHandlers: [new MfeHandlerMF(FrontX_MFE_ENTRY_MF)] }
 *   }))
 *   .build();
 * ```
 */
// @cpt-begin:cpt-frontx-flow-framework-composition-full-preset:p1:inst-1
// @cpt-begin:cpt-frontx-dod-framework-composition-presets:p1:inst-1
export function full(config?: FullPresetConfig): HAI3Plugin[] {
  const plugins: HAI3Plugin[] = [
    effects(),
    screensets({ autoDiscover: true }),
    themes(),
    layout(),
    i18n(),
    mock(),
  ];
  if (config?.microfrontends) {
    plugins.push(microfrontends(config.microfrontends));
  }
  return plugins;
}
// @cpt-end:cpt-frontx-flow-framework-composition-full-preset:p1:inst-1

/**
 * Minimal preset - Screensets + themes only.
 * For users who want basic FrontX patterns without full layout management.
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
// @cpt-end:cpt-frontx-dod-framework-composition-presets:p1:inst-1

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
