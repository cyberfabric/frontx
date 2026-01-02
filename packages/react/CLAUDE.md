# @hai3/react

React bindings and hooks for HAI3 applications. Provides the React integration layer.

## React Layer

This package is part of the **React Layer (L3)** - it depends only on @hai3/framework (not directly on SDK packages) and provides React-specific components and hooks.

## Core Concepts

### HAI3Provider

Wrap your app with HAI3Provider to enable all hooks:

```tsx
import { HAI3Provider } from '@hai3/react';

function App() {
  return (
    <HAI3Provider>
      <YourApp />
    </HAI3Provider>
  );
}

// With configuration
<HAI3Provider config={{ devMode: true }}>
  <YourApp />
</HAI3Provider>

// With pre-built app
const app = createHAI3().use(screensets()).build();
<HAI3Provider app={app}>
  <YourApp />
</HAI3Provider>
```

### Available Hooks

#### useHAI3

Access the HAI3 app instance:

```tsx
import { useHAI3 } from '@hai3/react';

function MyComponent() {
  const app = useHAI3();
  const screensets = app.screensetRegistry.getAll();
}
```

#### useAppDispatch / useAppSelector

Type-safe Redux hooks:

```tsx
import { useAppDispatch, useAppSelector } from '@hai3/react';
import { selectActiveScreen } from '@hai3/react';

function MyComponent() {
  const dispatch = useAppDispatch();
  const activeScreen = useAppSelector(selectActiveScreen);
}
```

#### useTranslation

Access translation utilities:

```tsx
import { useTranslation } from '@hai3/react';

function MyComponent() {
  const { t, language, setLanguage, isRTL } = useTranslation();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('common:title')}</h1>
      <p>{t('common:welcome', { name: 'John' })}</p>
    </div>
  );
}
```

#### useScreenTranslations

Load screen-level translations:

```tsx
import { useScreenTranslations } from '@hai3/react';

const translations = {
  en: () => import('./i18n/en.json'),
  es: () => import('./i18n/es.json'),
};

function HomeScreen() {
  const { isLoaded, error } = useScreenTranslations('demo', 'home', translations);

  if (!isLoaded) return <Loading />;
  if (error) return <Error error={error} />;

  return <div>...</div>;
}
```

#### useNavigation

Navigate between screens:

```tsx
import { useNavigation } from '@hai3/react';

function MyComponent() {
  const { navigateToScreen, navigateToScreenset, currentScreen } = useNavigation();

  return (
    <button onClick={() => navigateToScreen('demo', 'home')}>
      Go to Home
    </button>
  );
}
```

#### useTheme

Access theme utilities:

```tsx
import { useTheme } from '@hai3/react';

function ThemeToggle() {
  const { currentTheme, themes, setTheme } = useTheme();

  return (
    <select value={currentTheme} onChange={(e) => setTheme(e.target.value)}>
      {themes.map((theme) => (
        <option key={theme.id} value={theme.id}>{theme.name}</option>
      ))}
    </select>
  );
}
```

### Components

#### AppRouter

Renders screens with lazy loading:

```tsx
import { AppRouter } from '@hai3/react';

function App() {
  return (
    <HAI3Provider>
      <Layout>
        <AppRouter
          fallback={<Loading />}
          errorFallback={(error) => <Error error={error} />}
        />
      </Layout>
    </HAI3Provider>
  );
}
```

## Key Rules

1. **Wrap with HAI3Provider** - Required for all hooks to work
2. **Use hooks for state access** - Don't import selectors directly from @hai3/layout
3. **Lazy load translations** - Use `useScreenTranslations` for screen-level i18n
4. **NO Layout components here** - Layout and UI components belong in L4 (user's project via CLI scaffolding)

## Re-exports

For convenience, this package re-exports everything from @hai3/framework:

- All SDK primitives (eventBus, createStore, etc.)
- All plugins (screensets, themes, layout, etc.)
- All registries and factory functions
- All selectors from @hai3/layout
- All types

This allows users to import everything from `@hai3/react` without needing `@hai3/framework` directly.

## Exports

### Components
- `HAI3Provider` - Main context provider
- `AppRouter` - Screen router

### Hooks
- `useHAI3` - Access app instance
- `useAppDispatch` - Typed dispatch
- `useAppSelector` - Typed selector
- `useTranslation` - Translation utilities
- `useScreenTranslations` - Screen translation loading
- `useNavigation` - Navigation utilities
- `useTheme` - Theme utilities

### Context
- `HAI3Context` - React context (for advanced use)

### Types
- `HAI3ProviderProps`, `AppRouterProps`
- `UseTranslationReturn`, `UseNavigationReturn`, `UseThemeReturn`
- All types from @hai3/framework
