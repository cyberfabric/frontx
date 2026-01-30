---
title: Screensets
description: Self-contained collections of related screens
---

# Screensets

A **screenset** is a self-contained collection of related screens that form a cohesive feature or workflow. Screensets are HAI3's primary modularity mechanism.

## Overview

Think of screensets as feature modules with boundaries:

```
┌─────────────────────────────────┐
│     Auth Screenset              │
│  ┌──────────┐  ┌──────────┐    │
│  │  Login   │  │  Signup  │    │
│  │  Screen  │  │  Screen  │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  • State: authSlice             │
│  • Events: auth.*               │
│  • Components: AuthForm         │
│  • i18n: auth.json              │
└─────────────────────────────────┘
```

**Key Principle:** Each screenset is an independent module that can be developed, tested, and deployed separately.

## Why Screensets?

### Modularity

```typescript
// Each screenset is self-contained
const authScreenset = defineScreenset({
  id: 'auth',
  screens: { login, signup },
  state: authSlice,
  translations: authI18n
});

const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  screens: { overview, analytics },
  state: dashboardSlice,
  translations: dashboardI18n
});
```

Changes to `authScreenset` don't affect `dashboardScreenset`.

### Team Ownership

Different teams can own different screensets:

```
Team A → Auth screenset
Team B → Dashboard screenset
Team C → Settings screenset
```

Teams work independently with clear boundaries.

### Lazy Loading

```typescript
// Load screensets on demand
const AdminScreenset = lazy(() => import('./admin'));
const ReportsScreenset = lazy(() => import('./reports'));
```

Only load what users need, when they need it.

### AI-Friendly

Screensets provide clear boundaries for AI agents:

```
AI Agent 1: "Work on auth screenset"
AI Agent 2: "Work on dashboard screenset"
```

No conflicts, no coordination needed.

## Screenset Structure

### Recommended Organization

```
src/screensets/dashboard/
├── index.ts                 # Screenset definition
├── screens/                 # Screen components
│   ├── Overview.tsx
│   ├── Analytics.tsx
│   └── Reports.tsx
├── components/              # Shared components
│   ├── DashboardCard.tsx
│   └── MetricWidget.tsx
├── state/                   # Redux slices
│   └── dashboardSlice.ts
├── hooks/                   # Custom hooks
│   └── useDashboardData.ts
├── utils/                   # Utilities
│   └── formatMetrics.ts
└── translations/            # i18n
    ├── en.json
    └── es.json
```

### Screen Component

```typescript
// screens/Overview.tsx
import { DashboardCard } from '../components/DashboardCard';
import { useDashboardData } from '../hooks/useDashboardData';

export function Overview() {
  const data = useDashboardData();

  return (
    <div>
      <h1>Dashboard Overview</h1>
      <DashboardCard data={data} />
    </div>
  );
}
```

### Screenset Definition

```typescript
// index.ts
import { defineScreenset } from '@hai3/screensets';
import { Overview } from './screens/Overview';
import { Analytics } from './screens/Analytics';

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens: {
    overview: Overview,
    analytics: Analytics
  },
  initialScreen: 'overview'
});
```

## Screenset Lifecycle

### 1. Registration

```typescript
// App.tsx
import { dashboardScreenset } from './screensets/dashboard';

<HAI3App screensets={[dashboardScreenset]} />
```

Screenset is registered with the framework.

### 2. Mounting

When user navigates to screenset:

```typescript
navigateTo('dashboard', 'overview');
```

1. Screenset loads (if lazy)
2. Redux slices register
3. Translations load
4. Initial screen renders

### 3. Screen Transitions

Within screenset:

```typescript
navigateTo('dashboard', 'analytics');
```

1. Current screen unmounts
2. New screen mounts
3. State persists
4. No full reload

### 4. Unmounting

When leaving screenset:

```typescript
navigateTo('settings', 'profile');
```

1. Current screen unmounts
2. Screenset stays registered
3. State persists (unless configured otherwise)

## Navigation Patterns

### Within Screenset

```typescript
import { useScreensetNavigation } from '@hai3/react';

function DashboardNav() {
  const { navigateTo } = useScreensetNavigation();

  return (
    <nav>
      <button onClick={() => navigateTo('dashboard', 'overview')}>
        Overview
      </button>
      <button onClick={() => navigateTo('dashboard', 'analytics')}>
        Analytics
      </button>
    </nav>
  );
}
```

### Between Screensets

```typescript
function AppNav() {
  const { navigateTo } = useScreensetNavigation();

  return (
    <nav>
      <button onClick={() => navigateTo('dashboard')}>
        Dashboard
      </button>
      <button onClick={() => navigateTo('settings')}>
        Settings
      </button>
    </nav>
  );
}
```

### With Parameters

```typescript
// Navigate with data
navigateTo('products', 'detail', { id: '123' });

// Access in screen
function ProductDetail() {
  const { params } = useScreenParams();
  const productId = params.id;
}
```

## Screenset Isolation

Screensets are isolated by default:

### State Isolation

```typescript
// Dashboard screenset state
const dashboardSlice = createSlice({
  name: 'dashboard',  // Namespaced
  initialState: { /* ... */ }
});

// Settings screenset state
const settingsSlice = createSlice({
  name: 'settings',   // Separate namespace
  initialState: { /* ... */ }
});
```

Each screenset has its own state slice.

### Component Isolation

```typescript
// Dashboard components
src/screensets/dashboard/components/DashboardCard.tsx

// Settings components
src/screensets/settings/components/SettingsPanel.tsx
```

Components don't leak between screensets.

### Translation Isolation

```typescript
// Dashboard translations
const { t } = useTranslation('dashboard');
t('overview.title');

// Settings translations
const { t } = useTranslation('settings');
t('profile.title');
```

Each screenset has its own namespace.

### Event Isolation (Optional)

```typescript
// Dashboard events
eventBus.emit({ type: 'dashboard.data.loaded' });

// Only dashboard listens
eventBus.on('dashboard.*', handler);
```

Use namespaced events for screenset-specific communication.

## Shared Resources

Some resources are shared across screensets:

### Shared State

```typescript
// Common state (user, app config)
const appSlice = createSlice({
  name: 'app',
  initialState: { theme: 'light', language: 'en' }
});

// Available to all screensets
const theme = useAppSelector(state => state.app.theme);
```

### Shared Components

```typescript
// src/components/ (outside screensets)
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';

// Available to all screensets
function MyScreen() {
  return <Button>Click me</Button>;
}
```

### Global Events

```typescript
// System-wide events
eventBus.on('app.*', handler);    // App lifecycle
eventBus.on('auth.*', handler);   // Authentication
eventBus.on('error.*', handler);  // Errors
```

## Best Practices

**One Feature, One Screenset:**
```typescript
// ✅ Good: Focused screenset
const authScreenset = { login, signup, forgotPassword };

// ❌ Bad: Mixed features
const everythingScreenset = { login, dashboard, settings };
```

**Keep Screens Cohesive:**
```typescript
// ✅ Good: Related screens
screens: { overview, analytics, reports }

// ❌ Bad: Unrelated screens
screens: { dashboard, userProfile, checkout }
```

**Use Lazy Loading for Large Screensets:**
```typescript
// ✅ Good: Lazy load
const AdminScreenset = lazy(() => import('./admin'));

// ❌ Bad: Load everything upfront
import { AdminScreenset } from './admin';
```

**Namespace Events:**
```typescript
// ✅ Good: Namespaced
eventBus.emit({ type: 'dashboard.data.loaded' });

// ❌ Bad: Generic
eventBus.emit({ type: 'loaded' });
```

## Common Patterns

### Multi-Step Workflow

```typescript
const checkoutScreenset = defineScreenset({
  id: 'checkout',
  screens: {
    cart: CartScreen,
    shipping: ShippingScreen,
    payment: PaymentScreen,
    confirmation: ConfirmationScreen
  },
  initialScreen: 'cart'
});
```

### Master-Detail

```typescript
const productsScreenset = defineScreenset({
  id: 'products',
  screens: {
    list: ProductListScreen,
    detail: ProductDetailScreen
  },
  routes: {
    list: '/products',
    detail: '/products/:id'
  }
});
```

### Settings Hub

```typescript
const settingsScreenset = defineScreenset({
  id: 'settings',
  screens: {
    profile: ProfileScreen,
    security: SecurityScreen,
    notifications: NotificationsScreen,
    billing: BillingScreen
  }
});
```

## Testing Screensets

```typescript
import { renderScreenset } from '@hai3/testing';
import { dashboardScreenset } from './index';

test('renders initial screen', () => {
  const { getByText } = renderScreenset(dashboardScreenset);
  expect(getByText('Dashboard Overview')).toBeInTheDocument();
});

test('navigates between screens', () => {
  const { getByText, navigateTo } = renderScreenset(dashboardScreenset);

  navigateTo('analytics');
  expect(getByText('Analytics')).toBeInTheDocument();
});
```

## Related Documentation

- [Screensets SDK](/hai3/architecture/sdk/screensets)
- [Creating Screensets Guide](/hai3/guides/creating-screensets)
- [Manifest - Modular Screen Architecture](/hai3/architecture/manifest#v4-modular-screen-architecture)
- [TERMINOLOGY](/TERMINOLOGY#screensets-screens)
