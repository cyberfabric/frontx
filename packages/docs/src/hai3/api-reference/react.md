---
title: React API Reference
description: API reference for @hai3/react package
---

# React API Reference

Complete API reference for `@hai3/react` package.

## Components

### `HAI3Provider`

Root provider component for HAI3 applications.

::: tip Component vs Type
`HAI3Provider` is a **React component** for providing the HAI3 context. Don't confuse it with `HAI3App`, which is a **TypeScript type** for the application instance (not a component).
:::

```typescript
function HAI3Provider(props: HAI3ProviderProps): JSX.Element
```

**Props:**
- `app?`: Optional HAI3App instance from `createHAI3().build()` (creates one internally if omitted)
- `config?`: Optional HAI3Config for automatic app creation
- `children`: React children

**Example:**

```typescript
import { HAI3Provider } from '@hai3/react';
import { createHAI3 } from '@hai3/framework';

const app = createHAI3().build();

function App() {
  return (
    <HAI3Provider app={app}>
      <YourApp />
    </HAI3Provider>
  );
}
```

### `AppRouter`

Renders current screenset based on routing.

```typescript
function AppRouter(props?: AppRouterProps): JSX.Element
```

**Props:** None required

**Example:**

```typescript
import { AppRouter } from '@hai3/react';

function Layout() {
  return (
    <div>
      <Header />
      <AppRouter />  {/* Renders current screenset */}
      <Footer />
    </div>
  );
}
```


## Hooks

### `useAppSelector()`

Selects data from Redux store (typed).

```typescript
function useAppSelector<TSelected>(
  selector: (state: RootState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
): TSelected
```

**Parameters:**
- `selector`: Function selecting data from state
- `equalityFn?`: Custom equality comparison (default: `===`)

**Returns:** Selected value

**Example:**

```typescript
import { useAppSelector } from '@hai3/react';

function UserProfile() {
  const user = useAppSelector(state => state.user.profile);
  const isAdmin = useAppSelector(state => state.user.role === 'admin');

  return <div>Hello, {user.name}!</div>;
}
```

### `useAppDispatch()`

Gets Redux dispatch function.

```typescript
function useAppDispatch(): AppDispatch
```

**Returns:** `AppDispatch` - Typed dispatch function

**Example:**

```typescript
import { useAppDispatch } from '@hai3/react';
import { userSlice } from './userSlice';

function LoginButton() {
  const dispatch = useAppDispatch();

  const handleLogin = async () => {
    const user = await loginApi();
    dispatch(userSlice.actions.setUser(user));
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### Event Bus

Access the event bus directly from `@hai3/framework` for event-driven communication.

**Import:**

```typescript
import { eventBus } from '@hai3/framework';
```

**API:**
- `eventBus.emit(type, payload)`: Emit an event
- `eventBus.on(type, handler)`: Subscribe to events (returns unsubscribe function)

**Example:**

```typescript
import { eventBus } from '@hai3/framework';
import { useEffect } from 'react';

function ProfileEditor() {
  const handleSave = () => {
    eventBus.emit('profile.updated', { userId: '123' });
  };

  useEffect(() => {
    const unsubscribe = eventBus.on('profile.updated', (payload) => {
      console.log('Profile updated:', payload);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  return <button onClick={handleSave}>Save</button>;
}
```

### `useTranslation()`

Accesses translations.

```typescript
function useTranslation(ns?: string | string[]): TranslationHook
```

**Parameters:**
- `ns?`: Namespace(s) to load (optional)

**Returns:**
- `t`: Translate function
- `i18n`: i18n instance
- `language`: Current language
- `setLanguage`: Change language
- `languages`: Available languages

**Example:**

```typescript
import { useTranslation } from '@hai3/react';

function Welcome() {
  const { t, language, setLanguage } = useTranslation('common');

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.message', { name: 'John' })}</p>
      <button onClick={() => setLanguage('es')}>
        Español
      </button>
    </div>
  );
}
```

### `useNavigation()`

Navigates between screensets and screens.

```typescript
function useNavigation(): NavigationHook
```

**Returns:**
- `navigateTo`: Navigate to screenset/screen
- `currentScreenset`: Current screenset ID
- `currentScreen`: Current screen ID
- `goBack`: Navigate back

**Example:**

```typescript
import { useNavigation } from '@hai3/react';

function NavigationMenu() {
  const { navigateTo, currentScreenset } = useNavigation();

  return (
    <nav>
      <button onClick={() => navigateTo('dashboard', 'main')}>
        Dashboard
      </button>
      <button onClick={() => navigateTo('settings', 'profile')}>
        Settings
      </button>
      <p>Current: {currentScreenset}</p>
    </nav>
  );
}
```

### `useHAI3()`

Accesses HAI3 app instance.

```typescript
function useHAI3(): HAI3App
```

**Returns:** `HAI3App` - App instance

**Example:**

```typescript
import { useHAI3 } from '@hai3/react';

function DebugPanel() {
  const app = useHAI3();

  return (
    <div>
      <h3>App Info</h3>
      <p>ID: {app.id}</p>
      <p>Plugins: {app.plugins.getAll().length}</p>
    </div>
  );
}
```

### Accessing Registries

Access registries through the HAI3 app instance using `useHAI3()`.

**Example:**

```typescript
import { useHAI3 } from '@hai3/react';

function ThemeSelector() {
  const app = useHAI3();
  const themes = app.themeRegistry.getAll();

  return (
    <select>
      {themes.map(theme => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </select>
  );
}
```

**Available registries:**
- `app.screensetRegistry` - Screenset definitions
- `app.themeRegistry` - Theme configurations
- `app.routeRegistry` - Route mappings
- `app.i18nRegistry` - Translations

### `useTheme()`

Accesses theme configuration.

```typescript
function useTheme(): ThemeHook
```

**Returns:**
- `theme`: Current theme object
- `currentTheme`: Current theme ID
- `setTheme`: Change theme
- `availableThemes`: Available themes

**Example:**

```typescript
import { useTheme } from '@hai3/react';

function ThemeSwitcher() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <select
      value={currentTheme}
      onChange={(e) => setTheme(e.target.value)}
    >
      {availableThemes.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
```

### `useRouteParams()`

Access type-safe route parameters from the current URL.

```typescript
function useRouteParams<TScreenId>(): RouteParams
```

**Returns:** Route parameters, optionally typed based on screen ID

**Basic Usage:**

```typescript
import { useRouteParams } from '@hai3/react';

function UserDetailScreen() {
  const params = useRouteParams();
  // params: Record<string, string>

  return <div>User ID: {params.id}</div>;
}
```

**Type-Safe Usage with Module Augmentation:**

First, declare your route params:

```typescript
// src/app/types/routes.ts
import '@hai3/framework';

declare module '@hai3/framework' {
  interface RouteParams {
    'user-detail': { userId: string };
    'post-edit': { postId: string; section?: string };
  }
}
```

Then use with full type safety:

```typescript
import { useRouteParams } from '@hai3/react';

function UserDetailScreen() {
  const params = useRouteParams<'user-detail'>();
  // params: { userId: string } - fully typed!

  return <div>User ID: {params.userId}</div>;
}

function PostEditScreen() {
  const params = useRouteParams<'post-edit'>();
  // params: { postId: string; section?: string }

  return (
    <div>
      <h1>Edit Post {params.postId}</h1>
      {params.section && <p>Section: {params.section}</p>}
    </div>
  );
}
```

**With Navigation:**

```typescript
import { useNavigation, useRouteParams } from '@hai3/react';

function ProductList() {
  const { navigateTo } = useNavigation();

  const handleProductClick = (productId: string) => {
    navigateTo('products', 'detail', { productId });
  };

  return <button onClick={() => handleProductClick('123')}>View Product</button>;
}

function ProductDetailScreen() {
  const params = useRouteParams<'product-detail'>();
  // Access params.productId with type safety

  return <div>Product: {params.productId}</div>;
}
```

**Notes:**
- Parameters are automatically extracted from the URL
- Module augmentation provides type safety
- Works seamlessly with `useNavigation()`
- Parameters are always strings (parse as needed)

## Types

### `HAI3ProviderProps`

```typescript
interface HAI3ProviderProps {
  app: HAI3App;
  children: React.ReactNode;
}
```

### `HAI3AppProps`

```typescript
interface HAI3AppProps {
  screensets: Screenset[];
  initialScreenset: string;
  theme?: string;
  language?: string;
  plugins?: Plugin[];
}
```

### `ScreenProps`

```typescript
interface ScreenProps {
  title?: string;
  loading?: boolean;
  error?: Error | string | null;
  className?: string;
  children: React.ReactNode;
}
```

### `EventBusHook`

```typescript
interface EventBusHook {
  emit: <T = any>(event: Event<T>) => void;
  on: <T = any>(type: string, handler: EventHandler<T>) => UnsubscribeFn;
  off: <T = any>(type: string, handler?: EventHandler<T>) => void;
}
```

### `TranslationHook`

```typescript
interface TranslationHook {
  t: (key: string, params?: Record<string, any>) => string;
  i18n: I18n;
  language: string;
  setLanguage: (lang: string) => void;
  languages: Language[];
}
```

### `NavigationHook`

```typescript
interface NavigationHook {
  navigateTo: (screensetId: string, screenId?: string, params?: any) => void;
  currentScreenset: string;
  currentScreen: string;
  goBack: () => void;
}
```

### `ThemeHook`

```typescript
interface ThemeHook {
  theme: Theme;
  currentTheme: string;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}
```

## Related Documentation

- [React Layer](/hai3/architecture/react)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [Hooks Deep Dive](/hai3/architecture/react#core-hooks)
