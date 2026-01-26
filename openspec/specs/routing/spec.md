# routing Specification

## Purpose
TBD - created by archiving change add-parameterized-routing. Update Purpose after archive.
## Requirements
### Requirement: Custom route path configuration

Menu items SHALL support an optional `path` property to define custom URL patterns with named parameters.

#### Scenario: Screen with single parameter

```typescript
// src/screensets/demo/demoScreenset.tsx
export const demoScreenset: ScreensetDefinition = {
  id: 'demo',
  name: 'Demo',
  defaultScreen: 'home',
  menu: [
    {
      menuItem: { id: 'user-detail', label: 'User Detail', path: '/users/:id' },
      screen: () => import('./screens/UserDetailScreen'),
    },
  ],
};
```

- **WHEN** a menu item includes `path: '/users/:id'`
- **THEN** the route registry SHALL register this pattern for matching
- **AND** navigating to `/users/123` SHALL activate the `user-detail` screen with params `{ id: '123' }`

#### Scenario: Screen with multiple parameters

```typescript
{
  menuItem: { id: 'order-item', label: 'Order Item', path: '/orders/:orderId/items/:itemId' },
  screen: () => import('./screens/OrderItemScreen'),
}
```

- **WHEN** a menu item includes `path: '/orders/:orderId/items/:itemId'`
- **THEN** navigating to `/orders/456/items/789` SHALL activate the screen with params `{ orderId: '456', itemId: '789' }`

#### Scenario: Screen without custom path (backward compatibility)

```typescript
{
  menuItem: { id: 'home', label: 'Home' },
  screen: () => import('./screens/HomeScreen'),
}
```

- **WHEN** a menu item does NOT include a `path` property
- **THEN** the system SHALL use `/${screenId}` as the default pattern (e.g., `/home`)
- **AND** existing screensets SHALL continue to work without modification

### Requirement: Route matching in RouteRegistry

The RouteRegistry SHALL provide a `matchRoute()` method that matches URL paths against registered patterns and extracts parameters.

#### Scenario: Successful route match with parameters

```typescript
const result = app.routeRegistry.matchRoute('/users/123');
// result: { screensetId: 'demo', screenId: 'user-detail', params: { id: '123' } }
```

- **WHEN** `matchRoute('/users/123')` is called
- **AND** a route with pattern `/users/:id` is registered
- **THEN** the method SHALL return the matching screen info with extracted params

#### Scenario: Route match without parameters

```typescript
const result = app.routeRegistry.matchRoute('/home');
// result: { screensetId: 'demo', screenId: 'home', params: {} }
```

- **WHEN** `matchRoute('/home')` is called for a screen without custom path
- **THEN** the method SHALL return the screen info with empty params object

#### Scenario: No matching route

```typescript
const result = app.routeRegistry.matchRoute('/nonexistent/path');
// result: undefined
```

- **WHEN** `matchRoute()` is called with a path that matches no registered routes
- **THEN** the method SHALL return `undefined`

#### Scenario: Initial page load with parameterized URL

```typescript
// User navigates directly to: https://example.com/app/users/123
// Two screensets registered: 'admin' (first), 'demo' (second)
// 'demo' screenset has route: /users/:id -> user-detail screen

const path = '/users/123';
const match = app.routeRegistry.matchRoute(path);
// match: { screensetId: 'demo', screenId: 'user-detail', params: { id: '123' } }
```

- **WHEN** the page loads with a parameterized URL
- **THEN** the system SHALL use `matchRoute()` to find the matching screen across ALL screensets
- **AND** the correct screenset SHALL be activated (not necessarily the first registered one)
- **AND** the screen SHALL receive the extracted params

#### Scenario: Initial page load with empty URL and multiple screensets

```typescript
// User navigates to: https://example.com/app/
// Two screensets registered: 'admin' (first, defaultScreen: 'dashboard'), 'demo' (second)

const path = '/';
const match = app.routeRegistry.matchRoute(path);
// match: undefined (no route matches '/')

// System falls back to first screenset's default screen
// Navigates to: /dashboard (admin screenset's defaultScreen)
```

- **WHEN** the page loads with an empty URL (`/`)
- **AND** multiple screensets are registered
- **THEN** `matchRoute('/')` SHALL return `undefined`
- **AND** the system SHALL navigate to the first registered screenset's `defaultScreen`
- **AND** this behavior is unchanged from current HAI3 routing

#### Scenario: First match wins on conflict

```typescript
// Route 1 registered first: /users/:id
// Route 2 registered second: /users/new
const result = app.routeRegistry.matchRoute('/users/new');
// result matches Route 1 with params: { id: 'new' }
```

- **WHEN** multiple routes could match the same URL
- **THEN** the first registered route SHALL win
- **AND** this behavior SHALL be documented

### Requirement: Navigation with parameters

The navigation system SHALL support passing parameters when navigating programmatically.

#### Scenario: Navigate to parameterized screen via action

```typescript
app.actions.navigateToScreen({
  screensetId: 'demo',
  screenId: 'user-detail',
  params: { id: '123' },
});
// URL becomes: /users/123
```

- **WHEN** `navigateToScreen` is called with `params`
- **THEN** the system SHALL generate the URL by substituting params into the route pattern
- **AND** the browser URL SHALL be updated to the generated path

#### Scenario: Navigate to parameterized screen via useNavigation hook

```tsx
import { useNavigation } from '@hai3/react';

const UserList: React.FC = () => {
  const { navigateToScreen } = useNavigation();

  const handleUserClick = (userId: string) => {
    navigateToScreen('demo', 'user-detail', { id: userId });
  };

  return (
    <button onClick={() => handleUserClick('123')}>
      View User 123
    </button>
  );
};
```

- **WHEN** `navigateToScreen(screensetId, screenId, params)` is called from the `useNavigation` hook
- **THEN** the system SHALL navigate to the screen with the provided params
- **AND** the URL SHALL be generated from the route pattern and params

#### Scenario: Navigate without params to non-parameterized screen

```typescript
app.actions.navigateToScreen({
  screensetId: 'demo',
  screenId: 'home',
});
// URL becomes: /home
```

- **WHEN** `navigateToScreen` is called without `params` for a screen without custom path
- **THEN** the system SHALL navigate to `/${screenId}` as before

#### Scenario: Navigate without params via useNavigation hook (backward compatible)

```tsx
const { navigateToScreen } = useNavigation();

// Existing code continues to work without params
navigateToScreen('demo', 'home');
// URL becomes: /home
```

- **WHEN** `navigateToScreen(screensetId, screenId)` is called without the optional params argument
- **THEN** the system SHALL navigate to `/${screenId}` as before
- **AND** existing code using `useNavigation` SHALL continue to work without modification

#### Scenario: Missing required params

```typescript
app.actions.navigateToScreen({
  screensetId: 'demo',
  screenId: 'user-detail',
  // params missing!
});
```

- **WHEN** `navigateToScreen` is called without required params for a parameterized route
- **THEN** the system SHALL log a warning
- **AND** navigation SHALL NOT occur

### Requirement: Route params context for screens

Screen components SHALL access route parameters via a React context and hook.

#### Scenario: Access params via useRouteParams hook

```tsx
// src/screensets/demo/screens/UserDetailScreen.tsx
import { useRouteParams } from '@hai3/react';

const UserDetailScreen: React.FC = () => {
  const params = useRouteParams();
  // params: { id: '123' }

  return <div>User ID: {params.id}</div>;
};
```

- **WHEN** a screen component calls `useRouteParams()`
- **THEN** it SHALL receive the current route parameters as `Record<string, string>`
- **AND** the params SHALL update when the URL changes

#### Scenario: Empty params for non-parameterized screen

```tsx
const HomeScreen: React.FC = () => {
  const params = useRouteParams();
  // params: {}

  return <div>Home</div>;
};
```

- **WHEN** `useRouteParams()` is called in a screen without route parameters
- **THEN** it SHALL return an empty object `{}`

#### Scenario: Params update on browser navigation

- **WHEN** the user navigates using browser back/forward buttons
- **THEN** the params context SHALL update with the new URL's parameters
- **AND** screen components using `useRouteParams()` SHALL re-render with new params

### Requirement: URL generation from params

The system SHALL provide a utility to generate URLs from route patterns and params.

#### Scenario: Generate URL for parameterized route

```typescript
const url = app.routeRegistry.generatePath('user-detail', { id: '123' });
// url: '/users/123'
```

- **WHEN** `generatePath(screenId, params)` is called
- **THEN** the system SHALL return the URL with params substituted into the pattern

#### Scenario: Generate URL for non-parameterized route

```typescript
const url = app.routeRegistry.generatePath('home', {});
// url: '/home'
```

- **WHEN** `generatePath(screenId, {})` is called for a screen without custom path
- **THEN** the system SHALL return `/${screenId}`
