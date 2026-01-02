import React from 'react';
import { useAppSelector, useTranslation, useScreenTranslations, I18nRegistry, Language } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { CURRENT_THEME_SCREEN_ID } from "../../ids";
import { DEMO_SCREENSET_ID } from "../../ids";

/**
 * Theme screen translations (loaded lazily when screen mounts)
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

// Legacy state accessor for backward compatibility
interface LegacyState {
  'layout/app'?: { theme?: string };
  uicore?: { layout?: { theme?: string } };
}

/**
 * Current Theme Screen
 * Displays the currently active theme
 */
export const CurrentThemeScreen: React.FC = () => {
  // Register translations for this screen
  useScreenTranslations(DEMO_SCREENSET_ID, CURRENT_THEME_SCREEN_ID, translations);
  // Use correct slice path (layout/app for theme instead of uicore.layout.theme)
  const theme = useAppSelector((state): string => {
    const s = state as unknown as LegacyState;
    return s['layout/app']?.theme ?? s?.uicore?.layout?.theme ?? 'default';
  });
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-10 w-48">
          <h1 className="text-4xl font-bold">
            {t(`screen.${DEMO_SCREENSET_ID}.${CURRENT_THEME_SCREEN_ID}:title`)}
          </h1>
        </TextLoader>
        <TextLoader skeletonClassName="h-6 w-full">
          <p className="text-muted-foreground">
            {t(`screen.${DEMO_SCREENSET_ID}.${CURRENT_THEME_SCREEN_ID}:description`)}
          </p>
        </TextLoader>
      </div>

      <div className="max-w-2xl">
        <div className="flex flex-col gap-2 p-6 border border-border rounded-lg bg-background">
          <TextLoader skeletonClassName="h-7 w-32">
            <h2 className="text-xl font-semibold">
              {t(`screen.${DEMO_SCREENSET_ID}.${CURRENT_THEME_SCREEN_ID}:current_theme_label`)}
            </h2>
          </TextLoader>
          <p className="text-3xl font-mono text-primary">{theme || 'None'}</p>
        </div>
      </div>
    </div>
  );
};

CurrentThemeScreen.displayName = 'CurrentThemeScreen';

// Default export for lazy loading
export default CurrentThemeScreen;
