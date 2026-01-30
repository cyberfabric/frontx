---
title: Layers
description: Understanding HAI3's layered architecture and dependency rules
---

# HAI3 Layers

HAI3's four-layer architecture is one of its defining characteristics. This document explains each layer in detail, including responsibilities, boundaries, and the rationale behind the design.

## Layer Overview

```
┌─────────────────────────────────────────┐
│  L4: App Layer                          │
│  Your application code                  │
│  ├─ Screensets & screens               │
│  ├─ Business logic                     │
│  ├─ Custom components                  │
│  └─ API service implementations        │
└─────────────────────────────────────────┘
                 ↓ depends on
┌─────────────────────────────────────────┐
│  L3: React Layer (@hai3/react)          │
│  React bindings                         │
│  ├─ HAI3Provider                       │
│  ├─ Hooks (useAppSelector, etc.)      │
│  ├─ AppRouter                          │
│  └─ Screen components                  │
└─────────────────────────────────────────┘
                 ↓ depends on
┌─────────────────────────────────────────┐
│  L2: Framework Layer (@hai3/framework)  │
│  Plugin system & composition            │
│  ├─ createHAI3() builder               │
│  ├─ Plugin system                      │
│  ├─ Registries                         │
│  └─ Framework presets                  │
└─────────────────────────────────────────┘
                 ↓ depends on
┌─────────────────────────────────────────┐
│  L1: SDK Layer (multiple packages)      │
│  Core primitives (no cross-deps)        │
│  ├─ @hai3/state (events, Redux)       │
│  ├─ @hai3/api (API client)            │
│  ├─ @hai3/i18n (translations)         │
│  └─ @hai3/screensets (types)          │
└─────────────────────────────────────────┘
```

## L1: SDK Layer (Foundation)

### Purpose

Provide core primitives that are **framework-agnostic** and can be used anywhere.

### Packages

- **`@hai3/state`** - Event bus, Redux store, slice registration
- **`@hai3/api`** - API client with protocol support (REST, SSE)
- **`@hai3/i18n`** - Internationalization with lazy loading
- **`@hai3/screensets`** - Screenset type definitions and utilities

### Key Characteristics

**Zero Cross-Dependencies:**
```json
// @hai3/state/package.json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.2.1",
    "lodash": "^4.17.21"
    // NO other @hai3/* packages!
  }
}
```

**No React:**
```typescript
// ✅ Can use in Node.js, Deno, Bun, etc.
import { createEventBus } from '@hai3/state';

const eventBus = createEventBus();
eventBus.emit({ type: 'test', payload: { foo: 'bar' } });
```

**Pure JavaScript/TypeScript:**
- No JSX
- No React hooks
- No browser-specific APIs (unless optional)
- Works in any JS environment

### Responsibilities

| Package | Responsibilities |
|---------|-----------------|
| **@hai3/state** | Event bus, Redux store configuration, dynamic slice registration, type definitions |
| **@hai3/api** | BaseApiService class, protocol implementations, API registry, mock plugin |
| **@hai3/i18n** | Language enum, translation loading, locale management |
| **@hai3/screensets** | Screenset interfaces, defineScreenset utility, screen types |

### What SDK Layer Does NOT Do

- ❌ Render UI components
- ❌ Depend on React or any UI framework
- ❌ Make assumptions about the application structure
- ❌ Cross-reference other `@hai3/*` SDK packages

### Benefits

**Testability:** Test state management without mounting React components.

**Reusability:** Use HAI3's event bus in a Node.js backend or CLI tool.

**Clarity:** Each package has a single, focused responsibility.

**Flexibility:** Swap out React for Vue, Svelte, or anything else (hypothetically).

### Example: Using SDK Independently

```typescript
import { createStore, createEventBus, registerSlice } from '@hai3/state';
import { BaseApiService } from '@hai3/api';

// Create event bus and store (no React needed!)
const eventBus = createEventBus();
const store = createStore({ eventBus });

// Create a slice
const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null },
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    }
  }
});

// Register it
registerSlice(store, userSlice);

// Dispatch actions
store.dispatch(userSlice.actions.setProfile({ id: '123', name: 'Alice' }));

// Create an API service
class UsersApiService extends BaseApiService {
  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }
}

// Use it (works in Node.js!)
const api = new UsersApiService({ baseURL: 'https://api.example.com' });
const user = await api.getUser('123');
```

[Learn more about SDK packages →](/hai3/architecture/sdk/state)

## L2: Framework Layer (Composition)

### Purpose

Compose SDK packages into a cohesive, plugin-based framework.

### Package

**`@hai3/framework`** - Single package providing the framework core

### Key Characteristics

**Composes SDK Packages:**
```json
// @hai3/framework/package.json
{
  "dependencies": {
    "@hai3/state": "*",
    "@hai3/api": "*",
    "@hai3/i18n": "*",
    "@hai3/screensets": "*"
    // NO @hai3/react or higher!
  }
}
```

**Plugin Architecture:**
```typescript
import { createHAI3 } from '@hai3/framework';
import { screensetPlugin, themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .use(myCustomPlugin)
  .build();
```

**Registry Pattern:**
- Screenset Registry
- Theme Registry
- API Service Registry
- Route Registry

### Responsibilities

- **Application Builder:** `createHAI3()` API for building HAI3 apps
- **Plugin System:** Plugin interfaces, lifecycle management, dependency resolution
- **Registries:** Open/Closed registries for screensets, themes, services, routes
- **Presets:** Pre-configured plugin bundles (full, minimal, headless)
- **Composition:** Wiring SDK packages together

### What Framework Layer Does NOT Do

- ❌ Render React components
- ❌ Provide React hooks
- ❌ Include React as a dependency

### Benefits

**Extensibility:** Add functionality without modifying core code.

**Modularity:** Use only the plugins you need.

**Consistency:** All extensions follow the same plugin pattern.

**Testability:** Test plugin behavior without React.

### Example: Building an App

```typescript
import { createHAI3, createPlugin } from '@hai3/framework';
import { screensetPlugin, themePlugin, i18nPlugin } from '@hai3/framework/plugins';

// Custom plugin
const analyticsPlugin = createPlugin({
  id: 'analytics',
  name: 'Analytics',
  initialize: (app) => {
    app.eventBus.on('*', (event) => {
      // Track all events
      console.log('Event:', event.type);
    });
  }
});

// Build the app
const app = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .use(i18nPlugin)
  .use(analyticsPlugin)
  .build();

// App is ready (no React yet!)
console.log('App initialized:', app.id);
```

[Learn more about Framework Layer →](/hai3/architecture/framework)

## L3: React Layer (UI Bindings)

### Purpose

Provide React-specific bindings, hooks, and components.

### Package

**`@hai3/react`** - React bindings for HAI3

### Key Characteristics

**Depends Only on Framework:**
```json
// @hai3/react/package.json
{
  "dependencies": {
    "@hai3/framework": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
    // NO other @hai3/* packages directly!
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**React-Specific:**
- Hooks for accessing HAI3 features
- Provider component
- Router component
- Screen wrappers

### Responsibilities

- **HAI3Provider:** React context provider for HAI3 app
- **Hooks:** `useAppSelector`, `useAppDispatch`, `useTranslation`, `useEventBus`, `useScreensetNavigation`
- **AppRouter:** Routing component
- **Screen Components:** Wrappers for screens
- **React Integration:** Connecting React to Framework layer

### What React Layer Does NOT Do

- ❌ Define business logic
- ❌ Implement API services
- ❌ Define screensets (that's App layer)

### Benefits

**Separation:** React concerns are isolated in this layer.

**Reusability:** Framework layer could support other UI libraries.

**Testability:** Test React components with mocked HAI3 context.

**Type Safety:** Fully typed hooks and components.

### Example: Using React Layer

```tsx
import { HAI3Provider, useAppSelector, useEventBus } from '@hai3/react';
import { createHAI3 } from '@hai3/framework';

// Create HAI3 app (Framework layer)
const hai3App = createHAI3().build();

// Use in React (React layer)
function App() {
  return (
    <HAI3Provider app={hai3App}>
      <Dashboard />
    </HAI3Provider>
  );
}

function Dashboard() {
  // Use hooks from React layer
  const user = useAppSelector(state => state.user);
  const { emit } = useEventBus();

  const handleClick = () => {
    emit({ type: 'dashboard.viewed', payload: { userId: user.id } });
  };

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={handleClick}>Track View</button>
    </div>
  );
}
```

[Learn more about React Layer →](/hai3/architecture/react)

## L4: App Layer (Your Code)

### Purpose

Your application code - screensets, business logic, and custom components.

### Structure

```
src/
├── screensets/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── DashboardScreen.tsx
│   │   ├── widgets/
│   │   └── index.ts
│   └── settings/
│       ├── ProfileScreen.tsx
│       └── index.ts
├── services/
│   └── api/
│       ├── usersApi.ts
│       └── productsApi.ts
├── state/
│   ├── userSlice.ts
│   └── productsSlice.ts
├── themes/
│   └── customTheme.ts
└── App.tsx
```

### Key Characteristics

**Depends on React Layer:**
```json
// package.json
{
  "dependencies": {
    "@hai3/react": "*",
    "@hai3/uikit": "*",  // Optional UI kit
    "react": "^18.3.1"
  }
}
```

**Application-Specific:**
- Your business logic
- Your data models
- Your API integrations
- Your custom components

### Responsibilities

- **Screensets:** Define your app's screens and flows
- **Business Logic:** Implement domain-specific functionality
- **API Services:** Extend BaseApiService for your endpoints
- **State Slices:** Define application state
- **Custom Components:** Build reusable UI components
- **Themes:** Customize appearance

### What App Layer CAN Do

- ✅ Use all HAI3 layers (L1, L2, L3)
- ✅ Import from any `@hai3/*` package
- ✅ Use third-party libraries
- ✅ Organize code however you want

### Example: App Layer Code

```tsx
// src/screensets/dashboard/index.ts
import { defineScreenset } from '@hai3/screensets';
import { DashboardScreen } from './DashboardScreen';

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens: {
    main: DashboardScreen
  },
  defaultScreen: 'main'
});

// src/screensets/dashboard/DashboardScreen.tsx
import { useAppSelector } from '@hai3/react';
import { Button, Card } from '@hai3/uikit';

export function DashboardScreen() {
  const user = useAppSelector(state => state.user);

  return (
    <div>
      <h1>Dashboard</h1>
      <Card>
        <p>Welcome, {user.name}!</p>
        <Button>Get Started</Button>
      </Card>
    </div>
  );
}

// src/App.tsx
import { HAI3App } from '@hai3/react';
import { dashboardScreenset } from './screensets/dashboard';

export default function App() {
  return (
    <HAI3App
      screensets={[dashboardScreenset]}
      initialScreenset="dashboard"
    />
  );
}
```

[Learn more about App Layer →](/hai3/architecture/app)

## Dependency Rules

### The Golden Rule

**Each layer can only depend on layers below it.**

```
L4 (App) → can depend on → L3, L2, L1
L3 (React) → can depend on → L2, L1
L2 (Framework) → can depend on → L1
L1 (SDK) → cannot depend on ANY @hai3 packages
```

### Enforcement

**Automated Checks:**
```bash
npm run arch:layers  # Validate layer dependencies
npm run arch:deps    # Check circular dependencies
npm run arch:sdk     # Verify SDK isolation
```

**ESLint Rules:**
```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@hai3/react"],
            "message": "Framework layer cannot depend on React layer!"
          }
        ]
      }
    ]
  }
}
```

**What This Prevents:**
- ❌ Framework importing from React layer
- ❌ SDK packages importing other SDK packages
- ❌ Circular dependencies between packages
- ❌ Accidental layer violations

### Why Strict Dependencies Matter

**Testability:** Lower layers can be tested without higher layers.

**Reusability:** Lower layers work independently.

**Clarity:** Dependencies flow in one direction - easy to understand.

**Safety:** Prevents circular dependencies and architectural drift.

## Benefits of Layering

### For Development

**Clear Mental Model:**
- Know exactly where code belongs
- Understand dependencies at a glance
- Navigate codebase easily

**Focused Testing:**
```typescript
// Test SDK layer (no React)
import { createEventBus } from '@hai3/state';

test('event bus emits events', () => {
  const bus = createEventBus();
  const handler = jest.fn();
  bus.on('test', handler);
  bus.emit({ type: 'test', payload: {} });
  expect(handler).toHaveBeenCalled();
});

// Test React layer (mock SDK)
import { useAppSelector } from '@hai3/react';
import { renderHook } from '@testing-library/react-hooks';

test('useAppSelector works', () => {
  // Test React hook with mocked store
});
```

**Incremental Adoption:**
- Use just SDK layer in Node.js
- Add Framework layer for plugins
- Add React layer for UI

### For AI Agents

**Clear Boundaries:**
AI knows exactly where to put code based on its purpose.

**Validation:**
Automatic checks catch violations immediately.

**Patterns:**
Consistent layer patterns make AI-generated code predictable.

### For Teams

**Parallel Work:**
Teams can work on different layers without conflicts.

**Expertise:**
Team members can specialize in specific layers.

**Onboarding:**
New developers understand architecture quickly.

**Scalability:**
Architecture scales from 1 to 100+ developers.

## Anti-Patterns

### ❌ Layer Violations

```typescript
// BAD: Framework importing from React
import { useAppSelector } from '@hai3/react';  // ERROR!

// GOOD: React importing from Framework
import { createHAI3 } from '@hai3/framework';  // OK
```

### ❌ SDK Cross-Dependencies

```typescript
// BAD: @hai3/state importing @hai3/api
import { BaseApiService } from '@hai3/api';  // ERROR!

// GOOD: Both independent
// They don't know about each other
```

### ❌ Skipping Layers

```typescript
// BAD: App importing directly from SDK
import { createEventBus } from '@hai3/state';  // Discouraged

// GOOD: App using React hooks
import { useEventBus } from '@hai3/react';  // Correct
```

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview)
- [Framework Layer](/hai3/architecture/framework)
- [React Layer](/hai3/architecture/react)
- [SDK Packages](/hai3/architecture/sdk/state)
- [Architecture Rules](/hai3/contributing/architecture-rules)
- [TERMINOLOGY](/TERMINOLOGY)

## Next Steps

1. **Deep Dive:** Explore each layer in detail:
   - [SDK Layer (@hai3/state)](/hai3/architecture/sdk/state)
   - [Framework Layer (@hai3/framework)](/hai3/architecture/framework)
   - [React Layer (@hai3/react)](/hai3/architecture/react)

2. **Build Something:** Follow [Creating Screensets](/hai3/guides/creating-screensets) to see layers in action

3. **Validate:** Learn about [Architecture Rules](/hai3/contributing/architecture-rules) and validation tools
