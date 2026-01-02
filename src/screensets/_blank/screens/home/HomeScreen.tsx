/**
 * Home Screen
 * Main screen for the _blank screenset
 */

import React from 'react';
import {
  useTranslation,
  useScreenTranslations,
  I18nRegistry,
  Language,
} from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { _BLANK_SCREENSET_ID, HOME_SCREEN_ID } from '../../ids';

/**
 * Screen-level translations (loaded lazily when screen mounts)
 */
const translations = I18nRegistry.createLoader({
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
});

/**
 * Home Screen Component
 */
export const HomeScreen: React.FC = () => {
  // Register translations for this screen
  useScreenTranslations(_BLANK_SCREENSET_ID, HOME_SCREEN_ID, translations);

  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 p-8">
      <TextLoader skeletonClassName="h-10 w-64">
        <h1 className="text-4xl font-bold">
          {t(`screen.${_BLANK_SCREENSET_ID}.${HOME_SCREEN_ID}:title`)}
        </h1>
      </TextLoader>

      <TextLoader skeletonClassName="h-6 w-96">
        <p className="text-muted-foreground">
          {t(`screen.${_BLANK_SCREENSET_ID}.${HOME_SCREEN_ID}:description`)}
        </p>
      </TextLoader>
    </div>
  );
};

HomeScreen.displayName = 'HomeScreen';

// Default export for lazy loading
export default HomeScreen;
