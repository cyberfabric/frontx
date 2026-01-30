---
title: React API Reference
description: API reference for @hai3/react package
---

# React API Reference

Complete API reference for `@hai3/react` package.

## Components

### `HAI3Provider`

Root provider component for HAI3 applications.

```typescript
function HAI3Provider(props: HAI3ProviderProps): JSX.Element
```

**Props:**
- `app`: HAI3App instance from `createHAI3().build()`
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

### `HAI3App`

Convenience component that creates app and provides it.

```typescript
function HAI3App(props: HAI3AppProps): JSX.Element
```

**Props:**
- `screensets`: Array of screensets to register
- `initialScreenset`: Initial screenset ID
- `theme?`: Initial theme ID
- `language?`: Initial language code
- `plugins?`: Additional plugins

**Example:**

```typescript
import { HAI3App } from '@hai3/react';

export default function App() {
  return (
    <HAI3App
      screensets={[dashboardScreenset, settingsScreenset]}
      initialScreenset="dashboard"
      theme="light"
      language="en"
    />
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

### `Screen`

Wrapper component for screens.

```typescript
function Screen(props: ScreenProps): JSX.Element
```

**Props:**
- `title?`: Screen title (for document title)
- `loading?`: Show loading state
- `error?`: Show error state
- `className?`: CSS class name
- `children`: Screen content

**Example:**

```typescript
import { Screen } from '@hai3/react';

export function DashboardScreen() {
  return (
    <Screen
      title="Dashboard"
      loading={isLoading}
      error={error}
    >
      <div>Dashboard content</div>
    </Screen>
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

### `useEventBus()`

Accesses event bus for emitting and listening.

```typescript
function useEventBus(): EventBusHook
```

**Returns:**
- `emit`: Emit an event
- `on`: Subscribe to events (auto-cleanup on unmount)
- `off`: Unsubscribe from events

**Example:**

```typescript
import { useEventBus } from '@hai3/react';

function ProfileEditor() {
  const { emit, on } = useEventBus();

  const handleSave = () => {
    emit({
      type: 'profile.updated',
      payload: { userId: '123' }
    });
  };

  useEffect(() => {
    return on('profile.updated', (event) => {
      console.log('Profile updated:', event.payload);
    });
  }, [on]);

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

### `useScreensetNavigation()`

Navigates between screensets and screens.

```typescript
function useScreensetNavigation(): NavigationHook
```

**Returns:**
- `navigateTo`: Navigate to screenset/screen
- `currentScreenset`: Current screenset ID
- `currentScreen`: Current screen ID
- `goBack`: Navigate back

**Example:**

```typescript
import { useScreensetNavigation } from '@hai3/react';

function NavigationMenu() {
  const { navigateTo, currentScreenset } = useScreensetNavigation();

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

### `useHAI3App()`

Accesses HAI3 app instance.

```typescript
function useHAI3App(): HAI3App
```

**Returns:** `HAI3App` - App instance

**Example:**

```typescript
import { useHAI3App } from '@hai3/react';

function DebugPanel() {
  const app = useHAI3App();

  return (
    <div>
      <h3>App Info</h3>
      <p>ID: {app.id}</p>
      <p>Plugins: {app.plugins.getAll().length}</p>
    </div>
  );
}
```

### `useRegistry()`

Accesses a specific registry.

```typescript
function useRegistry<T>(name: string): Registry<T>
```

**Parameters:**
- `name`: Registry name

**Returns:** `Registry<T>` - Registry instance

**Example:**

```typescript
import { useRegistry } from '@hai3/react';

function ThemeSelector() {
  const themeRegistry = useRegistry<Theme>('themes');
  const themes = themeRegistry.getAll();

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
