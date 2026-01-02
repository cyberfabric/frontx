import React, { useEffect, useState } from 'react';
import { useTranslation, useScreenTranslations, apiRegistry, I18nRegistry, Language } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { Button, Card, CardContent, CardFooter } from '@hai3/uikit';
import { AccountsApiService, type ApiUser } from '@/app/api';
import { notifyUserLoaded } from '@/app/actions/bootstrapActions';
import { PROFILE_SCREEN_ID } from "../../ids";
import { DEMO_SCREENSET_ID } from "../../ids";

/**
 * Profile screen translations (loaded lazily when screen mounts)
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
 * Profile Screen
 * Demonstrates API integration with SDK architecture
 * - Fetches user data on mount using accounts service
 * - Displays user info from local state
 * - Shows loading/error states
 */
export const ProfileScreen: React.FC = () => {
  // Register translations for this screen
  useScreenTranslations(DEMO_SCREENSET_ID, PROFILE_SCREEN_ID, translations);

  // Local state for user data (full API user, not just header summary)
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();

  // Fetch user data function
  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get accounts service using class-based registration
      if (!apiRegistry.has(AccountsApiService)) {
        setError('Accounts service not registered');
        setLoading(false);
        return;
      }

      const accountsService = apiRegistry.getService(AccountsApiService);
      const response = await accountsService.getCurrentUser();
      if (response?.user) {
        setUser(response.user);
        // Notify app that user data is loaded - updates header via flux action
        notifyUserLoaded(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch user data on mount
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <TextLoader skeletonClassName="h-6 w-32">
          <p className="text-muted-foreground">
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:loading`)}
          </p>
        </TextLoader>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <TextLoader skeletonClassName="h-6 w-48">
          <p className="text-destructive">
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:error_prefix`)} {error}
          </p>
        </TextLoader>
        <Button onClick={fetchUser}>
          <TextLoader skeletonClassName="h-6 w-20" inheritColor>
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:retry`)}
          </TextLoader>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <TextLoader skeletonClassName="h-6 w-40">
          <p className="text-muted-foreground">
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:no_user_data`)}
          </p>
        </TextLoader>
        <Button onClick={fetchUser}>
          <TextLoader skeletonClassName="h-6 w-24" inheritColor>
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:load_user`)}
          </TextLoader>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-10 w-48">
          <h1 className="text-4xl font-bold">
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:title`)}
          </h1>
        </TextLoader>
        <TextLoader skeletonClassName="h-6 w-48">
          <p className="text-muted-foreground">
            {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:welcome`)}
          </p>
        </TextLoader>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-24 h-24 rounded-full"
              />
            )}
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm">
                <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                  <span className="font-medium">{t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:role_label`)}:</span>{' '}
                  <span className="capitalize">{user.role}</span>
                </TextLoader>
              </p>
              {user.extra?.department && (
                <p className="text-sm">
                  <TextLoader skeletonClassName="h-5 w-36" inheritColor>
                    <span className="font-medium">{t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:department_label`)}:</span>{' '}
                    {user.extra.department}
                  </TextLoader>
                </p>
              )}
              <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                <p className="text-sm text-muted-foreground">
                  {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:id_label`)}: {user.id}
                </p>
              </TextLoader>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                  <p className="font-medium">
                    {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:created_label`)}
                  </p>
                </TextLoader>
                <p className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                  <p className="font-medium">
                    {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:last_updated_label`)}
                  </p>
                </TextLoader>
                <p className="text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={fetchUser}>
            <TextLoader skeletonClassName="h-6 w-20" inheritColor>
              {t(`screen.${DEMO_SCREENSET_ID}.${PROFILE_SCREEN_ID}:refresh`)}
            </TextLoader>
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
};

ProfileScreen.displayName = 'ProfileScreen';

// Default export for lazy loading
export default ProfileScreen;
