---
title: App Layer (L4)
description: Your application code and customizations
---

# App Layer (L4)

The App Layer is **your code** - the screensets, business logic, and customizations you build on top of HAI3.

## Overview

The App Layer sits at the top of the stack:

```
L4: App (@your/app) ← You are here (Your Code)
        ↓
L3: React (@hai3/react)
        ↓
L2: Framework (@hai3/framework)
        ↓
L1: SDK (state, api, i18n, screensets)
```

**Key Characteristics:**
- **Your code, your rules:** Organize however you want
- **Full framework access:** Use all HAI3 layers (L1, L2, L3)
- **Application-specific:** Business logic, domains, features
- **No restrictions:** Import anything from `@hai3/*` packages

## What Belongs in App Layer

### Screensets & Screens

Your application's UI organized into screensets:

```
src/screensets/
├── auth/
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   └── index.ts
├── dashboard/
│   ├── DashboardScreen.tsx
│   ├── widgets/
│   └── index.ts
└── settings/
    ├── ProfileScreen.tsx
    ├── PreferencesScreen.tsx
    └── index.ts
```

### Business Logic

Domain-specific functionality:

```
src/domains/
├── users/
│   ├── userService.ts
│   ├── userValidation.ts
│   └── userUtils.ts
├── products/
│   └── productService.ts
└── orders/
    └── orderProcessing.ts
```

### API Services

Backend integrations:

```
src/services/
└── api/
    ├── usersApi.ts
    ├── productsApi.ts
    └── ordersApi.ts
```

### State Management

Application state slices:

```
src/state/
├── userSlice.ts
├── productsSlice.ts
├── cartSlice.ts
└── index.ts
```

### Custom Components

Reusable UI components:

```
src/components/
├── ProductCard.tsx
├── UserAvatar.tsx
├── Chart.tsx
└── DataTable.tsx
```

### Themes & Styling

Custom themes and styles:

```
src/themes/
├── custom-theme.ts
├── colors.ts
└── styles.css
```

### Configuration

Application configuration:

```
src/config/
├── app.config.ts
├── features.ts
└── constants.ts
```

## Recommended Structure

### Standard Structure

```
src/
├── screensets/          # Your screensets
│   ├── auth/
│   ├── dashboard/
│   └── settings/
├── services/            # External services
│   ├── api/             # API services
│   └── analytics/       # Analytics service
├── state/               # Redux slices
│   ├── userSlice.ts
│   └── appSlice.ts
├── components/          # Shared components
│   └── common/
├── hooks/               # Custom React hooks
│   ├── useUser.ts
│   └── usePermissions.ts
├── utils/               # Utility functions
│   ├── formatters.ts
│   └── validators.ts
├── themes/              # Custom themes
│   └── custom-theme.ts
├── config/              # Configuration
│   └── app.config.ts
├── types/               # TypeScript types
│   └── models.ts
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

### Domain-Driven Structure

For larger apps, organize by domain:

```
src/
├── domains/
│   ├── auth/
│   │   ├── screens/
│   │   ├── api/
│   │   ├── state/
│   │   └── components/
│   ├── products/
│   │   ├── screens/
│   │   ├── api/
│   │   ├── state/
│   │   └── components/
│   └── orders/
│       ├── screens/
│       ├── api/
│       ├── state/
│       └── components/
├── shared/              # Shared across domains
│   ├── components/
│   ├── hooks/
│   └── utils/
├── App.tsx
└── main.tsx
```

## Entry Point

### main.tsx

Bootstrap your application:

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### App.tsx

Root application component:

```tsx
// src/App.tsx
import { HAI3App } from '@hai3/react';
import { authScreenset } from './screensets/auth';
import { dashboardScreenset } from './screensets/dashboard';
import { settingsScreenset } from './screensets/settings';

export default function App() {
  return (
    <HAI3App
      screensets={[
        authScreenset,
        dashboardScreenset,
        settingsScreenset
      ]}
      initialScreenset="dashboard"
      theme="default"
      language="en"
    />
  );
}
```

### Advanced Setup

With custom configuration:

```tsx
// src/App.tsx
import { HAI3Provider } from '@hai3/react';
import { createHAI3, presets } from '@hai3/framework';
import { analyticsPlugin } from './plugins/analytics';
import { featureFlagPlugin } from './plugins/featureFlags';

// Create HAI3 instance
const hai3App = createHAI3({ name: 'My App' })
  .use(presets.full)
  .use(analyticsPlugin)
  .use(featureFlagPlugin)
  .build();

// Register screensets
import { registerScreensets } from './screensets';
registerScreensets(hai3App);

// Register state slices
import { registerSlices } from './state';
registerSlices(hai3App.store);

export default function App() {
  return (
    <HAI3Provider app={hai3App}>
      <AppContent />
    </HAI3Provider>
  );
}
```

## Application Patterns

### Feature Flags

```typescript
// src/config/features.ts
export const features = {
  newDashboard: process.env.VITE_FEATURE_NEW_DASHBOARD === 'true',
  betaFeatures: process.env.NODE_ENV === 'development'
};

// src/App.tsx
const screensets = [
  features.newDashboard ? newDashboardScreenset : dashboardScreenset,
  settingsScreenset
];
```

### Environment Configuration

```typescript
// src/config/app.config.ts
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  environment: import.meta.env.MODE,
  version: import.meta.env.VITE_APP_VERSION,
  analytics: {
    enabled: import.meta.env.PROD,
    trackingId: import.meta.env.VITE_ANALYTICS_ID
  }
};
```

### Authentication Guard

```tsx
// src/components/AuthGuard.tsx
import { useAppSelector } from '@hai3/react';
import { Navigate } from 'react-router-dom';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Error Boundary

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Global State Initialization

```typescript
// src/state/index.ts
import { registerSlice } from '@hai3/state';
import { userSlice } from './userSlice';
import { appSlice } from './appSlice';
import { productsSlice } from './productsSlice';

export function registerSlices(store: any) {
  registerSlice(store, userSlice);
  registerSlice(store, appSlice);
  registerSlice(store, productsSlice);
}
```

### Custom Hooks

```typescript
// src/hooks/useUser.ts
import { useAppSelector } from '@hai3/react';

export function useUser() {
  const user = useAppSelector(state => state.user.profile);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isAdmin = user?.role === 'admin';

  return {
    user,
    isAuthenticated,
    isAdmin
  };
}
```

### API Service Setup

```typescript
// src/services/api/index.ts
import { BaseApiService } from '@hai3/api';

const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

export class UsersApiService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  async getUsers() {
    return this.get<User[]>('/users');
  }

  async getUser(id: string) {
    return this.get<User>(`/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.put<User>(`/users/${id}`, data);
  }
}

export const usersApi = new UsersApiService();
```

## Best Practices

### ✅ Do

**Organize by Feature:**
```
✅ Good: Grouped by feature
src/screensets/
├── auth/
│   ├── LoginScreen.tsx
│   ├── authSlice.ts
│   ├── authApi.ts
│   └── index.ts
```

**Use TypeScript:**
```typescript
// ✅ Good: Typed everything
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = { id: '1', name: 'John', email: 'john@example.com' };
```

**Centralize Configuration:**
```typescript
// ✅ Good: Single config file
// src/config/app.config.ts
export const config = {
  api: { baseURL: '...' },
  features: { ... },
  analytics: { ... }
};
```

**Use Environment Variables:**
```typescript
// ✅ Good: Use env vars
const apiUrl = import.meta.env.VITE_API_URL;
```

### ❌ Don't

**Don't Mix Concerns:**
```
❌ Bad: Everything in one place
src/
├── everything.ts  // 5000 lines!
```

**Don't Hardcode Values:**
```typescript
// ❌ Bad: Hardcoded
const apiUrl = 'https://api.example.com';

// ✅ Good: Configured
const apiUrl = config.api.baseURL;
```

**Don't Skip Error Handling:**
```typescript
// ❌ Bad: No error handling
const data = await api.getData();

// ✅ Good: Handle errors
try {
  const data = await api.getData();
} catch (error) {
  handleError(error);
}
```

## Testing App Code

### Unit Tests

```typescript
// src/utils/validators.test.ts
import { validateEmail } from './validators';

test('validates email correctly', () => {
  expect(validateEmail('test@example.com')).toBe(true);
  expect(validateEmail('invalid')).toBe(false);
});
```

### Component Tests

```typescript
// src/components/UserCard.test.tsx
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

test('renders user name', () => {
  const user = { id: '1', name: 'John Doe' };
  render(<UserCard user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
// src/screensets/dashboard/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardScreen } from './DashboardScreen';
import { TestWrapper } from '../../test/utils';

test('loads and displays dashboard data', async () => {
  render(<DashboardScreen />, { wrapper: TestWrapper });

  await waitFor(() => {
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

## Build and Deploy

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Environment Variables

Create `.env` files:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ANALYTICS_ID=dev-tracking-id

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_ANALYTICS_ID=prod-tracking-id
```

## Performance Optimization

### Code Splitting

```tsx
// Lazy load screensets
const DashboardScreenset = lazy(() => import('./screensets/dashboard'));
const SettingsScreenset = lazy(() => import('./screensets/settings'));

<Suspense fallback={<Loading />}>
  <DashboardScreenset />
</Suspense>
```

### Bundle Analysis

```bash
npm run build -- --report
```

### Optimize Dependencies

```json
{
  "dependencies": {
    // Only include what you need
    "@hai3/react": "*",
    "@hai3/uikit": "*"
    // Don't include unused packages
  }
}
```

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
- [React Layer](/hai3/architecture/react)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [Deployment](/hai3/guides/deployment)
- [Getting Started](/getting-started)

## Next Steps

1. **Start Building:** Follow [Creating Screensets Guide](/hai3/guides/creating-screensets)
2. **Add Features:** Implement your business logic
3. **Integrate APIs:** Connect to your backend ([API Integration](/hai3/guides/api-integration))
4. **Deploy:** Build and deploy your app ([Deployment Guide](/hai3/guides/deployment))
