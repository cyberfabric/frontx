---
title: Screensets (@hai3/screensets)
description: Screenset types and utilities
---

# Screensets (@hai3/screensets)

The `@hai3/screensets` package provides type definitions and utilities for defining screensets - self-contained feature collections with screens, state, and configuration.

## Overview

**Package:** `@hai3/screensets`
**Layer:** L1 (SDK)
**Dependencies:** TypeScript types only (no runtime dependencies)

**Key Features:**
- TypeScript-first screenset definitions
- `defineScreenset` utility for type safety
- Screen configuration interfaces
- Lazy loading support
- Metadata and routing configuration
- Layout customization per screenset

## Defining Screensets

### Basic Definition

```typescript
import { defineScreenset } from '@hai3/screensets';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';

export const authScreenset = defineScreenset({
  id: 'auth',
  name: 'Authentication',
  screens: {
    login: LoginScreen,
    signup: SignupScreen
  },
  initialScreen: 'login'
});
```

### With Configuration

```typescript
export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  description: 'Main application dashboard',

  screens: {
    overview: DashboardOverview,
    analytics: AnalyticsScreen,
    reports: ReportsScreen
  },

  initialScreen: 'overview',

  // Optional configuration
  config: {
    layout: 'sidebar',
    theme: 'light',
    requiresAuth: true,
    permissions: ['dashboard.view']
  },

  // Routing configuration
  routes: {
    overview: '/',
    analytics: '/analytics',
    reports: '/reports'
  },

  // Metadata
  metadata: {
    icon: 'dashboard',
    category: 'main',
    order: 1
  }
});
```

## Screenset Configuration

### Screenset Interface

```typescript
interface Screenset {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description?: string;          // Description
  screens: Record<string, Screen>;  // Screen components
  initialScreen: string;         // Default screen ID
  config?: ScreensetConfig;      // Configuration
  routes?: Record<string, string>;  // URL routes
  metadata?: ScreensetMetadata;  // Additional metadata
}
```

### Configuration Options

```typescript
interface ScreensetConfig {
  // Layout
  layout?: 'default' | 'sidebar' | 'fullscreen' | 'centered';
  showHeader?: boolean;
  showFooter?: boolean;
  showSidebar?: boolean;

  // Theme
  theme?: string;

  // Access control
  requiresAuth?: boolean;
  permissions?: string[];

  // State management
  persistState?: boolean;
  stateKey?: string;

  // Loading
  lazy?: boolean;
  preload?: boolean;
}
```

### Metadata

```typescript
interface ScreensetMetadata {
  icon?: string;              // Icon identifier
  category?: string;          // Grouping category
  order?: number;            // Display order
  tags?: string[];           // Searchable tags
  version?: string;          // Screenset version
  author?: string;           // Author info
  [key: string]: any;        // Custom metadata
}
```

## Screen Definition

### Screen Interface

```typescript
interface Screen {
  component: React.ComponentType;
  path?: string;
  title?: string;
  config?: ScreenConfig;
  metadata?: ScreenMetadata;
}
```

### Defining Screens

```typescript
import { defineScreen } from '@hai3/screensets';

export const ProfileScreen = defineScreen({
  component: ProfileComponent,
  title: 'User Profile',

  config: {
    layout: 'centered',
    requiresAuth: true
  },

  metadata: {
    description: 'Manage user profile settings',
    keywords: ['profile', 'settings', 'user']
  }
});
```

### Screen Configuration

```typescript
interface ScreenConfig {
  layout?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  requiresAuth?: boolean;
  permissions?: string[];
  transition?: 'fade' | 'slide' | 'none';
}
```

## Lazy Loading

### Lazy Screenset

```typescript
import { lazy } from 'react';
import { defineScreenset } from '@hai3/screensets';

const DashboardOverview = lazy(() => import('./screens/DashboardOverview'));
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'));

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens: {
    overview: DashboardOverview,
    analytics: AnalyticsScreen
  },
  config: {
    lazy: true,    // Enable lazy loading
    preload: false // Don't preload
  }
});
```

### Preloading

```typescript
export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens: { /* ... */ },
  config: {
    lazy: true,
    preload: true  // Preload in background
  }
});
```

## Screen Registration

### Dynamic Registration

```typescript
import { registerScreen } from '@hai3/screensets';

// Register screen at runtime
registerScreen(dashboardScreenset, 'widgets', WidgetsScreen);
```

### Conditional Screens

```typescript
const screens: Record<string, Screen> = {
  overview: DashboardOverview,
  analytics: AnalyticsScreen
};

// Add premium features conditionally
if (user.isPremium) {
  screens.advanced = AdvancedAnalytics;
  screens.reports = ReportsScreen;
}

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens,
  initialScreen: 'overview'
});
```

## Routing

### Path Configuration

```typescript
export const settingsScreenset = defineScreenset({
  id: 'settings',
  name: 'Settings',
  screens: {
    profile: ProfileScreen,
    security: SecurityScreen,
    billing: BillingScreen
  },
  routes: {
    profile: '/settings/profile',
    security: '/settings/security',
    billing: '/settings/billing'
  }
});
```

### Dynamic Routes

```typescript
export const productScreenset = defineScreenset({
  id: 'products',
  name: 'Products',
  screens: {
    list: ProductListScreen,
    detail: ProductDetailScreen
  },
  routes: {
    list: '/products',
    detail: '/products/:id'  // Dynamic parameter
  }
});
```

## Type Safety

### Typed Screenset

```typescript
interface DashboardScreens {
  overview: typeof DashboardOverview;
  analytics: typeof AnalyticsScreen;
}

const dashboardScreenset = defineScreenset<DashboardScreens>({
  id: 'dashboard',
  name: 'Dashboard',
  screens: {
    overview: DashboardOverview,
    analytics: AnalyticsScreen
  }
});

// TypeScript validates screen IDs
dashboardScreenset.screens.overview;   // ✅ Valid
dashboardScreenset.screens.invalid;    // ❌ TypeScript error
```

### Navigation Types

```typescript
import { useNavigation } from '@hai3/react';

function Component() {
  const { navigateTo } = useNavigation();

  // Type-safe navigation
  navigateTo('dashboard', 'overview');   // ✅ Valid
  navigateTo('dashboard', 'invalid');    // ❌ TypeScript error
}
```

## Best Practices

**Keep Screensets Focused:**
```typescript
// ✅ Good: Focused screenset
const authScreenset = defineScreenset({
  id: 'auth',
  screens: {
    login: LoginScreen,
    signup: SignupScreen,
    forgotPassword: ForgotPasswordScreen
  }
});

// ❌ Bad: Mixed concerns
const everythingScreenset = defineScreenset({
  id: 'everything',
  screens: {
    login: LoginScreen,
    dashboard: DashboardScreen,  // Different concern
    settings: SettingsScreen     // Different concern
  }
});
```

**Use Lazy Loading for Large Screensets:**
```typescript
// ✅ Good: Lazy load heavy screens
const adminScreenset = defineScreenset({
  id: 'admin',
  screens: {
    dashboard: lazy(() => import('./AdminDashboard')),
    users: lazy(() => import('./UserManagement')),
    reports: lazy(() => import('./ReportingTools'))
  },
  config: { lazy: true }
});
```

**Define Routes Explicitly:**
```typescript
// ✅ Good: Explicit routes
routes: {
  overview: '/dashboard',
  analytics: '/dashboard/analytics'
}

// ❌ Bad: No routes (auto-generated)
// May conflict with other screensets
```

**Use Metadata for Discoverability:**
```typescript
// ✅ Good: Rich metadata
metadata: {
  icon: 'dashboard',
  category: 'main',
  tags: ['analytics', 'metrics', 'reports'],
  description: 'View key metrics and analytics'
}
```

## Complete Example

```typescript
// src/screensets/dashboard/index.ts
import { defineScreenset } from '@hai3/screensets';
import { lazy } from 'react';

const DashboardOverview = lazy(() => import('./screens/Overview'));
const AnalyticsScreen = lazy(() => import('./screens/Analytics'));
const ReportsScreen = lazy(() => import('./screens/Reports'));

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  description: 'Main application dashboard with analytics and reports',

  screens: {
    overview: DashboardOverview,
    analytics: AnalyticsScreen,
    reports: ReportsScreen
  },

  initialScreen: 'overview',

  config: {
    layout: 'sidebar',
    showHeader: true,
    showSidebar: true,
    requiresAuth: true,
    permissions: ['dashboard.view'],
    lazy: true,
    preload: false,
    persistState: true,
    stateKey: 'dashboard'
  },

  routes: {
    overview: '/dashboard',
    analytics: '/dashboard/analytics',
    reports: '/dashboard/reports'
  },

  metadata: {
    icon: 'dashboard',
    category: 'main',
    order: 1,
    tags: ['dashboard', 'analytics', 'reports', 'metrics'],
    version: '1.0.0'
  }
});
```

## Testing

```typescript
import { dashboardScreenset } from './index';

test('screenset is properly defined', () => {
  expect(dashboardScreenset.id).toBe('dashboard');
  expect(dashboardScreenset.screens.overview).toBeDefined();
  expect(dashboardScreenset.initialScreen).toBe('overview');
});

test('routes are configured', () => {
  expect(dashboardScreenset.routes?.overview).toBe('/dashboard');
  expect(dashboardScreenset.routes?.analytics).toBe('/dashboard/analytics');
});
```

## Related Documentation

- [SDK Layer](/hai3/architecture/layers)
- [Screenset Concepts](/hai3/concepts/screensets)
- [Creating Screensets Guide](/hai3/guides/creating-screensets)
- [TERMINOLOGY](/TERMINOLOGY#screensets-screens)
