/**
 * I18n Plugin - Provides i18n registry wiring and setLanguage action
 *
 * Framework Layer: L2
 */

// @cpt-flow:cpt-hai3-flow-framework-composition-i18n-propagation:p1
// @cpt-flow:cpt-hai3-flow-framework-composition-shared-property-broadcast:p1
// @cpt-dod:cpt-hai3-dod-framework-composition-propagation:p1
// @cpt-dod:cpt-hai3-dod-framework-composition-shared-property:p1

import { eventBus } from '@hai3/state';
import { i18nRegistry as singletonI18nRegistry, Language } from '@hai3/i18n';
import { HAI3_SHARED_PROPERTY_LANGUAGE } from '@hai3/screensets';
import type { HAI3Plugin, SetLanguagePayload } from '../types';

// Define i18n events for module augmentation
declare module '@hai3/state' {
  interface EventPayloadMap {
    'i18n/language/changed': SetLanguagePayload;
  }
}

/**
 * Set language action.
 * Emits 'i18n/language/changed' event to trigger language change.
 *
 * @param payload - The language change payload
 */
// @cpt-begin:cpt-hai3-flow-framework-composition-i18n-propagation:p1:inst-1
function setLanguage(payload: SetLanguagePayload): void {
  eventBus.emit('i18n/language/changed', payload);
}
// @cpt-end:cpt-hai3-flow-framework-composition-i18n-propagation:p1:inst-1

/**
 * I18n plugin factory.
 *
 * @returns I18n plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(i18n())
 *   .build();
 *
 * app.actions.setLanguage({ language: 'de' });
 * ```
 */
export function i18n(): HAI3Plugin {
  // Use the singleton i18n registry - user translations register to this
  const i18nRegistry = singletonI18nRegistry;

  return {
    name: 'i18n',
    dependencies: [],

    provides: {
      registries: {
        i18nRegistry,
      },
      actions: {
        setLanguage,
      },
    },

    // @cpt-begin:cpt-hai3-flow-framework-composition-i18n-propagation:p1:inst-2
    // @cpt-begin:cpt-hai3-dod-framework-composition-propagation:p1:inst-2
    onInit(app) {
      // Language change effect
      eventBus.on('i18n/language/changed', async (payload: SetLanguagePayload) => {
        await i18nRegistry.setLanguage(payload.language as Language);
        try {
          app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, payload.language);
        } catch (error) {
          console.error('[HAI3] Failed to propagate language to MFE domains', error);
        }
      });

      // Bootstrap: Set initial language to trigger translation loading
      // Run async without blocking - translations load in background
      i18nRegistry.setLanguage(Language.English).catch((err: Error) => {
        console.warn('[HAI3] Failed to load initial translations:', err);
      });
    },
    // @cpt-end:cpt-hai3-flow-framework-composition-i18n-propagation:p1:inst-2
    // @cpt-end:cpt-hai3-dod-framework-composition-propagation:p1:inst-2
  };
}
