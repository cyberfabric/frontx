/**
 * I18n Plugin - Provides i18n registry wiring and setLanguage action
 *
 * Framework Layer: L2
 */

import { eventBus } from '@hai3/state';
import { i18nRegistry as singletonI18nRegistry, Language } from '@hai3/i18n';
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
function setLanguage(payload: SetLanguagePayload): void {
  eventBus.emit('i18n/language/changed', payload);
}

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

    onInit(_app) {
      // Language change effect
      eventBus.on('i18n/language/changed', async (payload: SetLanguagePayload) => {
        await i18nRegistry.setLanguage(payload.language as Language);
      });

      // Bootstrap: Set initial language to trigger translation loading
      // Run async without blocking - translations load in background
      i18nRegistry.setLanguage(Language.English).catch((err: Error) => {
        console.warn('[HAI3] Failed to load initial translations:', err);
      });
    },
  };
}
