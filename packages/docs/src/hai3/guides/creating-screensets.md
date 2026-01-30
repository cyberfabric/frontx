---
title: Creating Screensets
description: Step-by-step guide to building screensets and screens
---

# Creating Screensets

This guide walks you through creating a complete screenset from scratch. You'll build a "Profile" feature with multiple screens, state management, and navigation.

## What You'll Build

A profile management screenset with:
- **View Profile** screen (display user info)
- **Edit Profile** screen (update user info)
- **Settings** screen (preferences)
- State management for profile data
- Navigation between screens
- API integration

**Estimated time:** 30 minutes

## Prerequisites

- HAI3 project set up ([Getting Started](/getting-started))
- Basic React and TypeScript knowledge
- Familiarity with Redux (helpful but not required)

## Step 1: Create Screenset Structure

First, create the folder structure for your screenset:

```bash
mkdir -p src/screensets/profile
cd src/screensets/profile
```

Create the following files:

```
src/screensets/profile/
├── index.ts              # Screenset definition
├── ids.ts                # Centralized IDs
├── ViewProfileScreen.tsx # View screen
├── EditProfileScreen.tsx # Edit screen
├── SettingsScreen.tsx    # Settings screen
└── profileSlice.ts       # State management
```

## Step 2: Define Centralized IDs

Create `ids.ts` to centralize all identifiers:

```typescript
// src/screensets/profile/ids.ts

/**
 * Centralized IDs for the profile screenset.
 * All IDs, event types, and namespaces are derived from the screenset ID.
 */
export const SCREENSET_ID = 'profile';

// Derived IDs (auto-namespace with screenset ID)
export const SLICE_NAME = SCREENSET_ID;
export const EVENT_NAMESPACE = SCREENSET_ID;
export const I18N_NAMESPACE = SCREENSET_ID;

// Screen IDs
export const SCREEN_IDS = {
  VIEW: 'view',
  EDIT: 'edit',
  SETTINGS: 'settings'
} as const;

// Event types (prefixed with namespace)
export const EVENT_TYPES = {
  PROFILE_UPDATED: `${EVENT_NAMESPACE}.profile.updated`,
  SETTINGS_CHANGED: `${EVENT_NAMESPACE}.settings.changed`
} as const;
```

::: tip Convention
HAI3 uses centralized IDs to avoid duplication. Update `ids.ts` when copying screensets, and everything else auto-derives correctly.
:::

## Step 3: Create State Slice

Create `profileSlice.ts` for state management:

```typescript
// src/screensets/profile/profileSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SLICE_NAME } from './ids';

interface ProfileState {
  profile: {
    id: string;
    name: string;
    email: string;
    bio: string;
  } | null;
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  settings: {
    notifications: true,
    theme: 'light'
  },
  loading: false,
  error: null
};

export const profileSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<ProfileState['profile']>) => {
      state.profile = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<ProfileState['profile']>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    updateSettings: (state, action: PayloadAction<Partial<ProfileState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setProfile,
  updateProfile,
  updateSettings,
  setLoading,
  setError
} = profileSlice.actions;

// Selectors
export const selectProfile = (state: { profile: ProfileState }) => state.profile.profile;
export const selectSettings = (state: { profile: ProfileState }) => state.profile.settings;
export const selectLoading = (state: { profile: ProfileState }) => state.profile.loading;
export const selectError = (state: { profile: ProfileState }) => state.profile.error;
```

::: tip Type Safety
Use TypeScript interfaces for state shape. HAI3 enforces strict typing - no `any` or `unknown` allowed!
:::

## Step 4: Create View Profile Screen

Create `ViewProfileScreen.tsx`:

```tsx
// src/screensets/profile/ViewProfileScreen.tsx

import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@hai3/react';
import { Button, Card } from '@hai3/uikit';
import { useScreensetNavigation } from '@hai3/react';
import { selectProfile, selectLoading, setProfile } from './profileSlice';
import { SCREEN_IDS } from './ids';

export function ViewProfileScreen() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const loading = useAppSelector(selectLoading);
  const { navigateTo } = useScreensetNavigation();

  useEffect(() => {
    // Load profile data
    // In real app, this would be an API call
    dispatch(setProfile({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Software developer and HAI3 enthusiast'
    }));
  }, [dispatch]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return <div>No profile data</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <div className="space-y-2">
          <div>
            <label className="font-semibold">Name:</label>
            <p>{profile.name}</p>
          </div>
          <div>
            <label className="font-semibold">Email:</label>
            <p>{profile.email}</p>
          </div>
          <div>
            <label className="font-semibold">Bio:</label>
            <p>{profile.bio}</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => navigateTo('profile', SCREEN_IDS.EDIT)}>
          Edit Profile
        </Button>
        <Button variant="secondary" onClick={() => navigateTo('profile', SCREEN_IDS.SETTINGS)}>
          Settings
        </Button>
      </div>
    </div>
  );
}
```

## Step 5: Create Edit Profile Screen

Create `EditProfileScreen.tsx`:

```tsx
// src/screensets/profile/EditProfileScreen.tsx

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch, useEventBus } from '@hai3/react';
import { Button, Card, Input, Textarea } from '@hai3/uikit';
import { useScreensetNavigation } from '@hai3/react';
import { selectProfile, updateProfile } from './profileSlice';
import { EVENT_TYPES, SCREEN_IDS } from './ids';

export function EditProfileScreen() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const { navigateTo } = useScreensetNavigation();
  const { emit } = useEventBus();

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    bio: profile?.bio || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update Redux state
    dispatch(updateProfile(formData));

    // Emit event for other parts of the app
    emit({
      type: EVENT_TYPES.PROFILE_UPDATED,
      payload: formData
    });

    // Navigate back to view screen
    navigateTo('profile', SCREEN_IDS.VIEW);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block font-semibold mb-1">
              Name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-semibold mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="bio" className="block font-semibold mb-1">
              Bio
            </label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigateTo('profile', SCREEN_IDS.VIEW)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
```

## Step 6: Create Settings Screen

Create `SettingsScreen.tsx`:

```tsx
// src/screensets/profile/SettingsScreen.tsx

import React from 'react';
import { useAppSelector, useAppDispatch, useEventBus } from '@hai3/react';
import { Card, Switch } from '@hai3/uikit';
import { selectSettings, updateSettings } from './profileSlice';
import { EVENT_TYPES } from './ids';

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectSettings);
  const { emit } = useEventBus();

  const handleToggleNotifications = (enabled: boolean) => {
    dispatch(updateSettings({ notifications: enabled }));
    emit({
      type: EVENT_TYPES.SETTINGS_CHANGED,
      payload: { notifications: enabled }
    });
  };

  const handleToggleTheme = (theme: 'light' | 'dark') => {
    dispatch(updateSettings({ theme }));
    emit({
      type: EVENT_TYPES.SETTINGS_CHANGED,
      payload: { theme }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-gray-600">Receive email notifications</p>
            </div>
            <Switch
              checked={settings.notifications}
              onChange={handleToggleNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Theme</h3>
              <p className="text-sm text-gray-600">Choose light or dark theme</p>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => handleToggleTheme(e.target.value as 'light' | 'dark')}
              className="border rounded px-3 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

## Step 7: Define Screenset

Create `index.ts` to define the screenset:

```typescript
// src/screensets/profile/index.ts

import { defineScreenset } from '@hai3/screensets';
import { SCREENSET_ID, SCREEN_IDS } from './ids';
import { ViewProfileScreen } from './ViewProfileScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { SettingsScreen } from './SettingsScreen';

export const profileScreenset = defineScreenset({
  id: SCREENSET_ID,
  name: 'Profile',
  screens: {
    [SCREEN_IDS.VIEW]: ViewProfileScreen,
    [SCREEN_IDS.EDIT]: EditProfileScreen,
    [SCREEN_IDS.SETTINGS]: SettingsScreen
  },
  defaultScreen: SCREEN_IDS.VIEW,
  icon: 'user', // Icon identifier (depends on icon library)
  category: 'production' // 'draft', 'mockup', or 'production'
});

// Export slice for registration
export { profileSlice } from './profileSlice';
```

## Step 8: Register Screenset in App

Update your `App.tsx` to include the profile screenset:

```tsx
// src/App.tsx

import { HAI3App } from '@hai3/react';
import { profileScreenset, profileSlice } from './screensets/profile';
import { dashboardScreenset } from './screensets/dashboard';
import { registerSlice } from '@hai3/state';
import { store } from './store';

// Register the profile slice
registerSlice(store, profileSlice);

export default function App() {
  return (
    <HAI3App
      screensets={[
        dashboardScreenset,
        profileScreenset  // Add your screenset here
      ]}
      initialScreenset="dashboard"
      theme="default"
    />
  );
}
```

## Step 9: Add Translations (Optional)

Create translation files for internationalization:

```
src/screensets/profile/locales/
├── en.json
└── es.json
```

```json
// src/screensets/profile/locales/en.json
{
  "profile": {
    "title": "Profile",
    "view": {
      "name": "Name",
      "email": "Email",
      "bio": "Bio"
    },
    "edit": {
      "title": "Edit Profile",
      "save": "Save Changes",
      "cancel": "Cancel"
    },
    "settings": {
      "title": "Settings",
      "notifications": "Notifications",
      "theme": "Theme"
    }
  }
}
```

Use translations in your screens:

```tsx
import { useTranslation } from '@hai3/react';

export function ViewProfileScreen() {
  const { t } = useTranslation('profile');

  return (
    <div>
      <h1>{t('profile.title')}</h1>
      {/* ... */}
    </div>
  );
}
```

## Step 10: Add API Integration (Optional)

Create an API service for profile operations:

```typescript
// src/screensets/profile/profileApi.ts

import { BaseApiService } from '@hai3/api';

export class ProfileApiService extends BaseApiService {
  async getProfile(userId: string) {
    return this.get<Profile>(`/users/${userId}/profile`);
  }

  async updateProfile(userId: string, data: Partial<Profile>) {
    return this.put<Profile>(`/users/${userId}/profile`, data);
  }
}
```

Use in your screen:

```tsx
import { ProfileApiService } from './profileApi';

export function ViewProfileScreen() {
  const profileApi = new ProfileApiService({ baseURL: '/api' });

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await profileApi.getProfile('current');
      dispatch(setProfile(profile));
    };
    loadProfile();
  }, []);

  // ...
}
```

## Testing Your Screenset

### Start the Dev Server

```bash
npm run dev
```

Visit `http://localhost:5173` and navigate to the Profile screenset.

### Test Navigation

1. View profile information on the View screen
2. Click "Edit Profile" to navigate to Edit screen
3. Make changes and save - should navigate back to View
4. Click "Settings" to navigate to Settings screen
5. Toggle settings and verify state updates

### Verify Events

Open browser DevTools and monitor console for events:

```typescript
// Add event listener for debugging
const { on } = useEventBus();
on('*', (event) => {
  console.log('Event:', event.type, event.payload);
});
```

## Best Practices

### ✅ Do

- **Centralize IDs** in `ids.ts`
- **Use TypeScript** for type safety
- **Follow naming conventions** (screen names, event types)
- **Emit events** for cross-screenset communication
- **Keep screens focused** (single responsibility)
- **Use selectors** for accessing state

### ❌ Don't

- **Don't hardcode IDs** throughout the code
- **Don't use `any` or `unknown`** types
- **Don't directly access** other screensets' state
- **Don't put business logic** in UI components
- **Don't skip translations** for user-facing text

## Common Patterns

### Loading States

```tsx
if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

### Form Handling

```tsx
const [formData, setFormData] = useState(initialData);

const handleChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await saveData(formData);
};
```

### Event Communication

```tsx
// Emit events for state changes
emit({ type: 'profile.updated', payload: profile });

// Listen to events from other screensets
on('auth.logout', () => {
  dispatch(clearProfile());
});
```

## Next Steps

1. **Add More Screens:** Create additional screens for your feature
2. **API Integration:** Connect to real backend services ([API Integration Guide](/hai3/guides/api-integration))
3. **Event Communication:** Use events to communicate with other screensets ([Event-Driven Architecture](/hai3/concepts/event-driven))
4. **Custom Components:** Build reusable components for your screenset
5. **Theming:** Customize appearance ([Themes](/hai3/concepts/themes))

## Related Documentation

- [Screensets Concept](/hai3/concepts/screensets)
- [State Management](/hai3/architecture/sdk/state)
- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [API Integration](/hai3/guides/api-integration)
- [TERMINOLOGY](/TERMINOLOGY)

## Troubleshooting

### Screenset Not Appearing

- Check screenset is registered in `App.tsx`
- Verify `defineScreenset` is called correctly
- Check browser console for errors

### State Not Updating

- Verify slice is registered with `registerSlice`
- Check reducer is defined correctly
- Use Redux DevTools to inspect state

### Navigation Not Working

- Verify screen IDs match those in `screens` object
- Check `useScreensetNavigation` is imported correctly
- Ensure screenset ID is correct

### TypeScript Errors

- Run `npm run type-check`
- Verify all types are properly defined
- Check imports are correct

## Example Repository

See the [HAI3 Examples repository](https://github.com/HAI3org/HAI3-examples) for complete working examples.
