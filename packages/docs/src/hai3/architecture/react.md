---
title: React Layer (L3)
description: React bindings, hooks, and components
---

# React Layer (L3)

The React Layer (`@hai3/react`) provides React-specific bindings for HAI3. It bridges the Framework Layer with React components.

## Overview

The React Layer sits on top of the Framework Layer:

```
L4: App (@your/app)
        ↓
L3: React (@hai3/react) ← You are here
        ↓
L2: Framework (@hai3/framework)
        ↓
L1: SDK (state, api, i18n, screensets)
```

**Key Responsibilities:**
- Provide React context for HAI3
- Expose React hooks for Framework features
- Render screensets and screens
- Handle React-specific concerns (routing, suspense, etc.)

## Package Structure

```json
{
  "name": "@hai3/react",
  "dependencies": {
    "@hai3/framework": "*"
    // Only Framework, nothing higher!
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

## Core Components

### HAI3Provider

The root provider component that makes HAI3 available to your React tree.

```tsx
import { HAI3Provider } from '@hai3/react';
import { createHAI3 } from '@hai3/framework';
import { presets } from '@hai3/framework';

// Create HAI3 app (Framework layer)
const hai3App = createHAI3()
  .use(presets.full)
  .build();

// Wrap your app (React layer)
function App() {
  return (
    <HAI3Provider app={hai3App}>
      <YourApp />
    </HAI3Provider>
  );
}
```

**Props:**
- `app`: HAI3App instance from `createHAI3().build()`
- `children`: React children

### HAI3App

Convenience component that creates HAI3App and provides it:

```tsx
import { HAI3App } from '@hai3/react';
import { dashboardScreenset, settingsScreenset } from './screensets';

export default function App() {
  return (
    <HAI3App
      screensets={[dashboardScreenset, settingsScreenset]}
      initialScreenset="dashboard"
      theme="default"
      language="en"
    />
  );
}
```

**Props:**
- `screensets`: Array of screensets to register
- `initialScreenset`: Initial screenset ID to show
- `theme?`: Initial theme ID
- `language?`: Initial language code
- `plugins?`: Additional plugins to use

### AppRouter

Renders the current screenset based on routing:

```tsx
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

**Features:**
- URL synchronization
- History management
- Lazy loading screens
- Transition animations

### Screen

Wrapper component for individual screens:

```tsx
import { Screen } from '@hai3/react';

export function DashboardScreen() {
  return (
    <Screen
      title="Dashboard"
      loading={isLoading}
      error={error}
    >
      <div>
        {/* Screen content */}
      </div>
    </Screen>
  );
}
```

**Props:**
- `title`: Screen title (for document title)
- `loading?`: Show loading state
- `error?`: Show error state
- `className?`: CSS class name
- `children`: Screen content

## Core Hooks

### useAppSelector

Select data from Redux store (typed):

```tsx
import { useAppSelector } from '@hai3/react';

function UserProfile() {
  const user = useAppSelector(state => state.user.profile);
  const theme = useAppSelector(state => state.app.theme);

  return <div>Hello, {user.name}!</div>;
}
```

**Usage:**
```typescript
const value = useAppSelector(selector);
```

- `selector`: `(state: RootState) => T`
- Returns: Selected value (memoized)

### useAppDispatch

Get Redux dispatch function:

```tsx
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

**Usage:**
```typescript
const dispatch = useAppDispatch();
dispatch(action);
```

### useEventBus

Access event bus for emitting and listening to events:

```tsx
import { useEventBus } from '@hai3/react';

function ProfileEditor() {
  const { emit, on } = useEventBus();

  // Emit event
  const handleSave = () => {
    emit({
      type: 'profile.updated',
      payload: { userId: '123' }
    });
  };

  // Listen to events
  useEffect(() => {
    return on('profile.updated', (event) => {
      console.log('Profile updated:', event.payload);
    });
  }, [on]);

  return <button onClick={handleSave}>Save</button>;
}
```

**API:**
- `emit(event)`: Emit an event
- `on(type, handler)`: Listen to events (returns cleanup function)
- `off(type, handler)`: Remove listener

### useTranslation

Access translations:

```tsx
import { useTranslation } from '@hai3/react';

function Welcome() {
  const { t, language, setLanguage } = useTranslation();

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

**API:**
- `t(key, params?)`: Translate a key
- `language`: Current language code
- `setLanguage(code)`: Change language
- `languages`: Available languages

### useScreensetNavigation

Navigate between screensets and screens:

```tsx
import { useScreensetNavigation } from '@hai3/react';

function NavigationMenu() {
  const { navigateTo, currentScreenset, currentScreen } = useScreensetNavigation();

  return (
    <nav>
      <button onClick={() => navigateTo('dashboard', 'main')}>
        Dashboard
      </button>
      <button onClick={() => navigateTo('settings', 'profile')}>
        Settings
      </button>
      <p>Current: {currentScreenset}/{currentScreen}</p>
    </nav>
  );
}
```

**API:**
- `navigateTo(screensetId, screenId?)`: Navigate to screenset/screen
- `currentScreenset`: Current screenset ID
- `currentScreen`: Current screen ID
- `goBack()`: Navigate back in history

### useHAI3App

Access the HAI3 app instance:

```tsx
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

**Returns:** HAI3App instance

### useRegistry

Access a specific registry:

```tsx
import { useRegistry } from '@hai3/react';

function ThemeSelector() {
  const themeRegistry = useRegistry('themes');
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

**Usage:**
```typescript
const registry = useRegistry<T>(registryName);
```

## Patterns and Examples

### Loading States

```tsx
function DataScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <Screen title="Data">{/* Render data */}</Screen>;
}
```

### Event-Driven Updates

```tsx
function NotificationBell() {
  const [count, setCount] = useState(0);
  const { on } = useEventBus();

  useEffect(() => {
    return on('notification.received', () => {
      setCount(c => c + 1);
    });
  }, [on]);

  return <div>Notifications: {count}</div>;
}
```

### Form Handling

```tsx
function ProfileForm() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(state => state.user.profile);
  const { emit } = useEventBus();
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update Redux state
    dispatch(userSlice.actions.updateProfile(formData));

    // Emit event
    emit({
      type: 'profile.updated',
      payload: formData
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

### Multi-Language Support

```tsx
function LanguageSwitcher() {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
```

### Conditional Rendering Based on State

```tsx
function UserDashboard() {
  const user = useAppSelector(state => state.user);
  const isAdmin = useAppSelector(state => state.user.role === 'admin');

  if (!user.profile) {
    return <EmptyState message="Please complete your profile" />;
  }

  return (
    <div>
      <h1>Welcome, {user.profile.name}</h1>
      {isAdmin && <AdminPanel />}
      <UserContent />
    </div>
  );
}
```

## Testing React Components

### Testing with Hooks

```tsx
import { render, screen } from '@testing-library/react';
import { HAI3Provider } from '@hai3/react';
import { createHAI3 } from '@hai3/framework';

function TestWrapper({ children }) {
  const app = createHAI3().build();
  return <HAI3Provider app={app}>{children}</HAI3Provider>;
}

test('component renders', () => {
  render(<MyComponent />, { wrapper: TestWrapper });
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Mocking Hooks

```tsx
import * as hai3React from '@hai3/react';

jest.spyOn(hai3React, 'useAppSelector').mockReturnValue({
  user: { name: 'Test User' }
});

test('displays user name', () => {
  render(<UserProfile />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

### Testing Event Emission

```tsx
import { fireEvent, render } from '@testing-library/react';

test('emits event on click', () => {
  const mockEmit = jest.fn();
  jest.spyOn(hai3React, 'useEventBus').mockReturnValue({
    emit: mockEmit,
    on: jest.fn(),
    off: jest.fn()
  });

  render(<SaveButton />);
  fireEvent.click(screen.getByText('Save'));

  expect(mockEmit).toHaveBeenCalledWith({
    type: 'data.saved',
    payload: expect.any(Object)
  });
});
```

## Performance Optimization

### Memoization

```tsx
import { memo, useMemo } from 'react';

// Memoize component
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  const processed = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  return <div>{processed}</div>;
});
```

### Selective Re-renders

```tsx
// ❌ Bad: Re-renders on any state change
const state = useAppSelector(state => state);

// ✅ Good: Re-renders only when user changes
const user = useAppSelector(state => state.user);
```

### Lazy Loading Screens

```tsx
import { lazy, Suspense } from 'react';

const DashboardScreen = lazy(() => import('./DashboardScreen'));

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  screens: {
    main: DashboardScreen  // Loaded on demand
  }
});
```

## Best Practices

### ✅ Do

**Use Hooks Correctly:**
```tsx
// ✅ Good: Hooks at top level
function MyComponent() {
  const user = useAppSelector(state => state.user);
  const dispatch = useAppDispatch();

  // Component logic
}
```

**Clean Up Event Listeners:**
```tsx
// ✅ Good: Return cleanup function
useEffect(() => {
  return on('event', handler);  // Cleanup!
}, [on]);
```

**Memoize Selectors:**
```tsx
// ✅ Good: Memoized selector
const user = useAppSelector(state => state.user);

// ✅ Better: Reusable selector
const selectUser = (state) => state.user;
const user = useAppSelector(selectUser);
```

### ❌ Don't

**Don't Call Hooks Conditionally:**
```tsx
// ❌ Bad: Conditional hook
if (condition) {
  const user = useAppSelector(state => state.user);  // Error!
}

// ✅ Good: Always call hooks
const user = useAppSelector(state => state.user);
if (condition && user) {
  // Use user
}
```

**Don't Forget Dependencies:**
```tsx
// ❌ Bad: Missing dependency
useEffect(() => {
  loadData(userId);
}, []);  // Missing userId!

// ✅ Good: Include dependencies
useEffect(() => {
  loadData(userId);
}, [userId]);
```

**Don't Mutate State:**
```tsx
// ❌ Bad: Direct mutation
const user = useAppSelector(state => state.user);
user.name = 'New Name';  // Don't mutate!

// ✅ Good: Dispatch action
dispatch(userSlice.actions.updateName('New Name'));
```

## Common Issues

### Issue: Hook Returns Undefined

```tsx
// ❌ Problem: No HAI3Provider
function App() {
  return <MyComponent />;  // Hook will fail
}

// ✅ Solution: Wrap with provider
function App() {
  return (
    <HAI3Provider app={hai3App}>
      <MyComponent />
    </HAI3Provider>
  );
}
```

### Issue: State Not Updating

```tsx
// ❌ Problem: Not dispatching correctly
const user = useAppSelector(state => state.user);
user.name = 'New';  // Won't trigger re-render

// ✅ Solution: Use dispatch
const dispatch = useAppDispatch();
dispatch(userSlice.actions.setName('New'));
```

### Issue: Event Handler Not Cleaning Up

```tsx
// ❌ Problem: Memory leak
useEffect(() => {
  on('event', handler);  // No cleanup!
});

// ✅ Solution: Return cleanup
useEffect(() => {
  return on('event', handler);  // Cleanup on unmount
}, [on]);
```

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
- [Framework Layer](/hai3/architecture/framework)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [State Management SDK](/hai3/architecture/sdk/state)
- [API Reference - React](/hai3/api-reference/react)

## Next Steps

1. **Build Screens:** Follow [Creating Screensets Guide](/hai3/guides/creating-screensets)
2. **Learn Hooks:** Practice with the hooks in your components
3. **Understand State:** Read [State Management](/hai3/architecture/sdk/state)
4. **Use Events:** Implement [Event-Driven patterns](/hai3/concepts/event-driven)
