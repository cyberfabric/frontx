import React, { useEffect, useRef, useState } from 'react';
import type { ChildMfeBridge } from '@hai3/react';
import { HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE } from '@hai3/react';
import { Card, CardContent, Skeleton } from '@hai3/uikit';
import { useScreenTranslations } from '../../shared/useScreenTranslations';

/**
 * Props for the HomeScreen component.
 */
interface HomeScreenProps {
  bridge: ChildMfeBridge;
}

/**
 * Home Screen for the Blank MFE template.
 *
 * This is a template component that demonstrates:
 * - Shadow DOM isolation
 * - Bridge communication with the host
 * - Theme property subscription
 * - Language property subscription
 * - MFE-local i18n with dynamic translation loading
 * - UIKit components for consistent styling
 *
 * To use this template:
 * 1. Copy the entire _blank-mfe directory to a new name
 * 2. Update all placeholder IDs in mfe.json
 * 3. Update package.json name and port
 * 4. Update vite.config.ts name
 * 5. Customize this component for your use case
 * 6. Add/modify translation files as needed
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({ bridge }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<string>('default');
  const [language, setLanguage] = useState<string>('en');

  // Load translations using the shared hook
  const languageModules = import.meta.glob('./i18n/*.json') as Record<
    string,
    () => Promise<{ default: Record<string, string> }>
  >;
  const { t, loading } = useScreenTranslations(languageModules, bridge);

  useEffect(() => {
    // Read initial property values
    const initialTheme = bridge.getProperty(HAI3_SHARED_PROPERTY_THEME);
    if (initialTheme && typeof initialTheme.value === 'string') {
      setTheme(initialTheme.value);
    }
    const initialLang = bridge.getProperty(HAI3_SHARED_PROPERTY_LANGUAGE);
    if (initialLang && typeof initialLang.value === 'string') {
      setLanguage(initialLang.value);
    }

    // Subscribe to theme domain property
    const themeUnsubscribe = bridge.subscribeToProperty(
      HAI3_SHARED_PROPERTY_THEME,
      (property) => {
        if (typeof property.value === 'string') {
          setTheme(property.value);
        }
      }
    );

    // Subscribe to language domain property
    const languageUnsubscribe = bridge.subscribeToProperty(
      HAI3_SHARED_PROPERTY_LANGUAGE,
      (property) => {
        if (typeof property.value === 'string') {
          setLanguage(property.value);
          const rootNode = containerRef.current?.getRootNode();
          if (rootNode && 'host' in rootNode) {
            const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
            const direction = rtlLanguages.includes(property.value) ? 'rtl' : 'ltr';
            (rootNode.host as HTMLElement).dir = direction;
          }
        }
      }
    );

    return () => {
      themeUnsubscribe();
      languageUnsubscribe();
    };
  }, [bridge]);

  // Show skeleton while translations are loading
  if (loading) {
    return (
      <div ref={containerRef} className="p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        {t('title')}
      </h1>
      <p className="text-gray-600 mb-6">
        {t('description')}
      </p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-3">
            Bridge Properties
          </h2>
          <dl className="grid gap-2">
            <div>
              <dt className="font-medium">Domain ID:</dt>
              <dd className="font-mono text-sm text-gray-600">{bridge.domainId}</dd>
            </div>
            <div>
              <dt className="font-medium">Instance ID:</dt>
              <dd className="font-mono text-sm text-gray-600">{bridge.instanceId}</dd>
            </div>
            <div>
              <dt className="font-medium">Current Theme:</dt>
              <dd className="font-mono text-sm text-gray-600">{theme}</dd>
            </div>
            <div>
              <dt className="font-medium">Current Language:</dt>
              <dd className="font-mono text-sm text-gray-600">{language}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

HomeScreen.displayName = 'HomeScreen';
