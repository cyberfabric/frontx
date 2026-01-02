/**
 * _blank Screenset
 * Template screenset with full structure
 */

import {
  type ScreensetConfig,
  ScreensetCategory,
  registerSlice,
  I18nRegistry,
  Language,
  screensetRegistry,
  i18nRegistry,
} from '@hai3/react';
import { _BLANK_SCREENSET_ID, HOME_SCREEN_ID } from './ids';
import _blankSlice from './slices/_blankSlice';
import { initialize_BlankEffects } from './effects/_blankEffects';

// Import for side effect - register API service
import './api/_blankApiService';

// NOTE: Mocks are now registered globally via MockPlugin in main.tsx
// If this screenset needs mocks, add them to the global mockMap in main.tsx
// or create a screenset-specific MockPlugin registration here.

/**
 * Screenset-level translations
 * Register directly with i18nRegistry (not via screenset config)
 * All 36 languages must be provided for type safety
 */
i18nRegistry.registerLoader(
  `screenset.${_BLANK_SCREENSET_ID}`,
  I18nRegistry.createLoader({
    [Language.English]: () => import('./i18n/en.json'),
    [Language.Arabic]: () => import('./i18n/ar.json'),
    [Language.Bengali]: () => import('./i18n/bn.json'),
    [Language.Czech]: () => import('./i18n/cs.json'),
    [Language.Danish]: () => import('./i18n/da.json'),
    [Language.German]: () => import('./i18n/de.json'),
    [Language.Greek]: () => import('./i18n/el.json'),
    [Language.Spanish]: () => import('./i18n/es.json'),
    [Language.Persian]: () => import('./i18n/fa.json'),
    [Language.Finnish]: () => import('./i18n/fi.json'),
    [Language.French]: () => import('./i18n/fr.json'),
    [Language.Hebrew]: () => import('./i18n/he.json'),
    [Language.Hindi]: () => import('./i18n/hi.json'),
    [Language.Hungarian]: () => import('./i18n/hu.json'),
    [Language.Indonesian]: () => import('./i18n/id.json'),
    [Language.Italian]: () => import('./i18n/it.json'),
    [Language.Japanese]: () => import('./i18n/ja.json'),
    [Language.Korean]: () => import('./i18n/ko.json'),
    [Language.Malay]: () => import('./i18n/ms.json'),
    [Language.Dutch]: () => import('./i18n/nl.json'),
    [Language.Norwegian]: () => import('./i18n/no.json'),
    [Language.Polish]: () => import('./i18n/pl.json'),
    [Language.Portuguese]: () => import('./i18n/pt.json'),
    [Language.Romanian]: () => import('./i18n/ro.json'),
    [Language.Russian]: () => import('./i18n/ru.json'),
    [Language.Swedish]: () => import('./i18n/sv.json'),
    [Language.Swahili]: () => import('./i18n/sw.json'),
    [Language.Tamil]: () => import('./i18n/ta.json'),
    [Language.Thai]: () => import('./i18n/th.json'),
    [Language.Tagalog]: () => import('./i18n/tl.json'),
    [Language.Turkish]: () => import('./i18n/tr.json'),
    [Language.Ukrainian]: () => import('./i18n/uk.json'),
    [Language.Urdu]: () => import('./i18n/ur.json'),
    [Language.Vietnamese]: () => import('./i18n/vi.json'),
    [Language.ChineseSimplified]: () => import('./i18n/zh.json'),
    [Language.ChineseTraditional]: () => import('./i18n/zh-TW.json'),
  })
);

/**
 * Register slices with effects
 */
registerSlice(_blankSlice, (dispatch) => {
  initialize_BlankEffects(dispatch);
});

/**
 * _blank Screenset Configuration
 * Translations are registered directly with i18nRegistry above
 */
export const _blankScreenset: ScreensetConfig = {
  id: _BLANK_SCREENSET_ID,
  name: '_blank',
  category: ScreensetCategory.Drafts,
  defaultScreen: HOME_SCREEN_ID,
  menu: [
    {
      menuItem: {
        id: HOME_SCREEN_ID,
        label: `screenset.${_BLANK_SCREENSET_ID}:menu_items._blank.label`,
        icon: 'lucide:home',
      },
      screen: () => import('./screens/home/HomeScreen'),
    },
  ],
};

/**
 * Self-register screenset
 */
screensetRegistry.register(_blankScreenset);
