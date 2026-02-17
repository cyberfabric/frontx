/**
 * useTranslation Hook - Translation utilities
 *
 * React Layer: L3
 */

import { useMemo, useCallback, useSyncExternalStore } from 'react';
import type { Language } from '@hai3/framework';
import { useHAI3 } from '../HAI3Context';
import type { UseTranslationReturn } from '../types';

/**
 * Hook for accessing translation utilities.
 *
 * @returns Translation utilities
 *
 * @example
 * ```tsx
 * const { t, language, setLanguage, isRTL } = useTranslation();
 *
 * return (
 *   <div dir={isRTL ? 'rtl' : 'ltr'}>
 *     <h1>{t('common:app.title')}</h1>
 *     <p>{t('common:app.welcome', { name: 'John' })}</p>
 *   </div>
 * );
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const app = useHAI3();
  const { i18nRegistry } = app;

  // Subscribe to translation changes using useSyncExternalStore
  // Uses version counter to trigger re-renders when translations change
  const version = useSyncExternalStore(
    useCallback(
      (callback: () => void) => {
        // Subscribe to translation changes (new translations registered)
        return i18nRegistry.subscribe(callback);
      },
      [i18nRegistry]
    ),
    () => i18nRegistry.getVersion(),
    () => i18nRegistry.getVersion()
  );

  // Get current language (memoized to avoid unnecessary recalculations)
  // version is used to trigger recalculation when translations change
  const language = useMemo(() => {
    void version; // Trigger recalculation when version changes
    return i18nRegistry.getLanguage();
  }, [i18nRegistry, version]);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number | boolean>) => {
      return i18nRegistry.t(key, params);
    },
    [i18nRegistry]
  );

  // Set language via framework action (emits event bus for MFE propagation)
  const setLanguage = useCallback(
    (lang: Language) => {
      if (app.actions.setLanguage) {
        app.actions.setLanguage({ language: lang });
      }
    },
    [app.actions]
  );

  // Check RTL - recomputes when language changes
  const isRTL = useMemo(() => {
    // Reference language to trigger recalculation on language change
    void language;
    return i18nRegistry.isRTL();
  }, [i18nRegistry, language]);

  return {
    t,
    language,
    setLanguage,
    isRTL,
  };
}
