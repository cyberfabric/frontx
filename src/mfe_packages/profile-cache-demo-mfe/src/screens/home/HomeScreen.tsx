import React, { useEffect, useRef, useState } from 'react';
import type { ChildMfeBridge } from '@hai3/react';
import {
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
  useApiQuery,
  useQueryCache,
} from '@hai3/react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useScreenTranslations } from '../../shared/useScreenTranslations';
import { accountsKeys, accountsQueries } from '../../data/accounts';
import { AccountDetailsCard } from './components/AccountDetailsCard';

// Stable reference for translation modules (hoisted to module level to prevent re-render loops)
const languageModules = import.meta.glob('./i18n/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, string> }>
>;

/**
 * Props for the HomeScreen component.
 */
interface HomeScreenProps {
  bridge: ChildMfeBridge;
}

/**
 * Home Screen for the ProfileCacheDemo MFE.
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
 * 1. Copy the entire profile-cache-demo-mfe directory to a new name
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
  const [cacheWarmOnMount, setCacheWarmOnMount] = useState<boolean | null>(null);
  const queryCache = useQueryCache();

  const { t, loading } = useScreenTranslations(languageModules, bridge);
  const { data, isLoading, isError, error, refetch } = useApiQuery(
    accountsQueries.currentUser()
  );

  useEffect(() => {
    setCacheWarmOnMount(
      queryCache.getState(accountsKeys.currentUser())?.data !== undefined
    );
  }, [queryCache]);

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

  if (isLoading) {
    return (
      <div ref={containerRef} className="p-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="mb-6 h-4 w-96" />
        <Card>
          <CardContent className="grid gap-4 p-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div ref={containerRef} className="p-8">
        <h1 className="mb-4 text-3xl font-bold">{t('title')}</h1>
        <p className="mb-6 text-muted-foreground">{t('error_prefix')}{error?.message ?? t('unknown_error')}</p>
        <Button type="button" onClick={() => void refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const user = data?.user;

  return (
    <div ref={containerRef} className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        {t('title')}
      </h1>
      <p className="text-muted-foreground mb-6">
        {t('description')}
      </p>

      <div className="grid max-w-4xl gap-6">
        {user ? <AccountDetailsCard user={user} t={t} /> : null}

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">
              {t('bridge_info')}
            </h2>
            <dl className="grid gap-2">
              <div>
                <dt className="font-medium">{t('domain_id')}</dt>
                <dd className="font-mono text-sm text-muted-foreground">{bridge.domainId}</dd>
              </div>
              <div>
                <dt className="font-medium">{t('instance_id')}</dt>
                <dd className="font-mono text-sm text-muted-foreground">{bridge.instanceId}</dd>
              </div>
              <div>
                <dt className="font-medium">{t('current_theme')}</dt>
                <dd className="font-mono text-sm text-muted-foreground">{theme}</dd>
              </div>
              <div>
                <dt className="font-medium">{t('current_language')}</dt>
                <dd className="font-mono text-sm text-muted-foreground">{language}</dd>
              </div>
              <div>
                <dt className="font-medium">{t('cache_key')}</dt>
                <dd className="font-mono text-sm text-muted-foreground">
                  {JSON.stringify(accountsKeys.currentUser())}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Cache Warm On Mount</dt>
                <dd className="font-mono text-sm text-muted-foreground">
                  {cacheWarmOnMount === null ? 'pending' : cacheWarmOnMount ? 'yes' : 'no'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

HomeScreen.displayName = 'HomeScreen';
