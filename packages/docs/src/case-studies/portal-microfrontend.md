---
title: Portal Microfrontend Architecture
description: Building a scalable enterprise portal with HAI3 screensets
---

# Case Study: Portal Microfrontend Architecture

Building a scalable enterprise portal where multiple independent feature teams contribute different sections without interfering with each other.

## Problem Statement

**Organization:** Global financial services company
**Challenge:** Build a unified portal serving 10,000+ employees across 8 business units
**Requirements:**
- 6 independent feature teams contributing concurrently
- Weekly deployment cycles per team
- Feature-level isolation and security
- Consistent UX across all features
- Shared infrastructure (auth, layout, navigation)
- Scale to 50+ features over 3 years

**Existing pain points:**
- Monolithic React app causing merge conflicts
- All teams blocked on single deployment pipeline
- Feature releases delayed by unrelated bugs
- Code ownership unclear
- 90+ minute build times

## Solution Overview

Using HAI3's screenset architecture as microfrontends with event-driven communication. Each feature team owns one or more screensets, deployable independently while maintaining a cohesive user experience.

**Key decisions:**
- **Screensets = Microfrontends:** Each screenset is an independently deployable unit
- **Event Bus:** Features communicate via typed events, not direct imports
- **Shell App:** Minimal portal shell handles auth, layout, and screenset loading
- **State Isolation:** Shared state (auth, user) vs. private state (feature-specific)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Portal Shell                           │
│  • Authentication                                           │
│  • Layout (Header, Sidebar, Footer)                        │
│  • Screenset Registry & Loader                             │
│  • Shared State (User, Permissions, Theme)                 │
│  • Event Bus                                                │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴────────┬──────────┬──────────┬──────────┐
       │                │          │          │          │
   ┌───▼────┐     ┌────▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼────┐
   │Dashboard│     │Analytics│ │Reports│ │Admin │ │Settings│
   │Screenset│     │Screenset│ │Screenset│Screenset│Screenset│
   │(Team A) │     │(Team B) │ │(Team C)│(Team D)│(Team E) │
   └─────────┘     └─────────┘  └──────┘  └──────┘  └───────┘
      ▲                ▲            ▲         ▲         ▲
      └────────────────┴────────────┴─────────┴─────────┘
                    Event Bus Communication
```

## Implementation Details

### Portal Shell

The shell is minimal, providing shared infrastructure:

```typescript
// src/App.tsx
import { HAI3App } from '@hai3/react';
import { AuthGuard } from './components/AuthGuard';
import { PortalLayout } from './components/PortalLayout';

// Lazy load screensets
const dashboardScreenset = lazy(() => import('@portal/dashboard'));
const analyticsScreenset = lazy(() => import('@portal/analytics'));
const reportsScreenset = lazy(() => import('@portal/reports'));
const adminScreenset = lazy(() => import('@portal/admin'));
const settingsScreenset = lazy(() => import('@portal/settings'));

export default function App() {
  return (
    <HAI3App
      screensets={[
        dashboardScreenset,
        analyticsScreenset,
        reportsScreenset,
        adminScreenset,
        settingsScreenset
      ]}
      initialScreenset="dashboard"
    >
      <AuthGuard>
        <PortalLayout>
          <AppRouter />
        </PortalLayout>
      </AuthGuard>
    </HAI3App>
  );
}
```

### Independent Screensets

Each team owns their screenset package:

```
packages/
├── portal-shell/              # Shared infrastructure (Team Platform)
├── dashboard-screenset/       # Dashboard features (Team A)
├── analytics-screenset/       # Analytics features (Team B)
├── reports-screenset/         # Reporting features (Team C)
├── admin-screenset/           # Admin tools (Team D)
└── settings-screenset/        # Settings (Team E)
```

**Dashboard Screenset** (Team A):

```typescript
// packages/dashboard-screenset/src/index.ts
import { defineScreenset } from '@hai3/screensets';
import { Overview } from './screens/Overview';
import { Widgets } from './screens/Widgets';

export const dashboardScreenset = defineScreenset({
  id: 'dashboard',
  name: 'Dashboard',
  screens: {
    overview: Overview,
    widgets: Widgets
  },
  initialScreen: 'overview',
  config: {
    requiresAuth: true,
    permissions: ['dashboard.view']
  },
  metadata: {
    icon: 'dashboard',
    order: 1,
    owner: 'team-a'
  }
});
```

### Event-Driven Communication

Features communicate through events, not direct imports:

**Analytics emits event:**

```typescript
// packages/analytics-screenset/src/screens/Report.tsx
import { useEventBus } from '@hai3/react';

function ReportScreen() {
  const { emit } = useEventBus();

  const handleReportGenerated = (report: Report) => {
    emit({
      type: 'analytics.report.generated',
      payload: {
        reportId: report.id,
        reportType: report.type,
        timestamp: Date.now()
      }
    });
  };

  return <div>{/* Report UI */}</div>;
}
```

**Dashboard listens:**

```typescript
// packages/dashboard-screenset/src/screens/Overview.tsx
import { useEventBus } from '@hai3/react';

function Overview() {
  const { on } = useEventBus();

  useEffect(() => {
    return on('analytics.report.generated', (event) => {
      // Show notification in dashboard
      showNotification(`New ${event.payload.reportType} report available`);
    });
  }, [on]);

  return <div>{/* Dashboard UI */}</div>;
}
```

**Benefits:**
- No direct dependencies between features
- Features don't need to know about each other
- Easy to add/remove features without breaking others

### State Isolation

**Shared State** (Portal Shell):

```typescript
// packages/portal-shell/src/state/authSlice.ts
const authSlice = createSlice({
  name: 'auth',  // Global namespace
  initialState: {
    user: null,
    permissions: [],
    token: null
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    }
  }
});

// Available to all screensets
const user = useAppSelector(state => state.auth.user);
```

**Private State** (Dashboard Screenset):

```typescript
// packages/dashboard-screenset/src/state/dashboardSlice.ts
const dashboardSlice = createSlice({
  name: 'dashboard',  // Namespaced, isolated
  initialState: {
    widgets: [],
    layout: 'grid'
  },
  reducers: {
    addWidget: (state, action) => {
      state.widgets.push(action.payload);
    }
  }
});

// Only accessible within dashboard screenset
const widgets = useAppSelector(state => state.dashboard.widgets);
```

### Deployment Strategy

Each screenset is an independent npm package:

**package.json** (Dashboard Screenset):

```json
{
  "name": "@portal/dashboard",
  "version": "2.4.1",
  "main": "dist/index.js",
  "dependencies": {
    "@hai3/screensets": "^0.2.0",
    "@hai3/react": "^0.2.0"
  }
}
```

**CI/CD Pipeline** (per screenset):

```yaml
# .github/workflows/dashboard-deploy.yml
name: Deploy Dashboard Screenset

on:
  push:
    paths:
      - 'packages/dashboard-screenset/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test --workspace=@portal/dashboard
      - run: npm run build --workspace=@portal/dashboard
      - run: npm publish --workspace=@portal/dashboard
```

**Portal Shell** updates version:

```typescript
// Update dashboard-screenset version when ready
{
  "dependencies": {
    "@portal/dashboard": "^2.4.1"  // Controlled update
  }
}
```

**Benefits:**
- Teams deploy independently
- No waiting on other teams
- Rollback per feature
- Canary deployments possible

## Code Examples

### Complete Screenset with State

```typescript
// packages/reports-screenset/src/index.ts
import { defineScreenset } from '@hai3/screensets';
import { lazy } from 'react';
import { reportsSlice } from './state/reportsSlice';

const ReportList = lazy(() => import('./screens/ReportList'));
const ReportDetail = lazy(() => import('./screens/ReportDetail'));

export const reportsScreenset = defineScreenset({
  id: 'reports',
  name: 'Reports',
  screens: {
    list: ReportList,
    detail: ReportDetail
  },
  initialScreen: 'list',
  config: {
    requiresAuth: true,
    permissions: ['reports.view'],
    lazy: true
  }
});

// Export slice for portal shell to register
export { reportsSlice };
```

```typescript
// packages/reports-screenset/src/state/reportsSlice.ts
import { createSlice, createAsyncThunk } from '@hai3/state';
import { reportsApi } from '../services/reportsApi';

export const fetchReports = createAsyncThunk(
  'reports/fetch',
  async () => {
    return await reportsApi.getReports();
  }
);

export const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      });
  }
});
```

## Security Considerations

### Feature Access Control

```typescript
// packages/portal-shell/src/components/AuthGuard.tsx
import { useAppSelector } from '@hai3/react';

function ScreensetGuard({ screenset, children }) {
  const permissions = useAppSelector(state => state.auth.permissions);
  const required = screenset.config.permissions || [];

  const hasAccess = required.every(p => permissions.includes(p));

  if (!hasAccess) {
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
}
```

### Event Bus Security

```typescript
// Validate event sources
eventBus.on('admin.*', (event) => {
  if (!hasAdminPermission(currentUser)) {
    console.warn('Unauthorized admin event emission blocked');
    return;
  }
  // Process event
});
```

### Data Isolation

```typescript
// Each screenset API includes user context
class ReportsApiService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api' });

    this.addRequestInterceptor((config) => {
      config.headers['X-User-Id'] = getCurrentUserId();
      return config;
    });
  }
}
```

## Performance Optimization

### Lazy Loading

All screensets lazy loaded, reducing initial bundle:

```typescript
const reportsScreenset = lazy(() => import('@portal/reports'));
// Loaded only when user navigates to reports
```

**Results:**
- Initial bundle: 180KB (shell only)
- Feature bundle: ~50KB per screenset
- Load time: <1s for initial, <200ms for features

### Code Splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'portal-shell': ['@hai3/react', '@hai3/framework'],
          dashboard: ['@portal/dashboard'],
          analytics: ['@portal/analytics']
        }
      }
    }
  }
});
```

### Caching

```typescript
// Service worker caches screenset bundles
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/screensets/')) {
    event.respondWith(
      caches.match(event.request).then(response =>
        response || fetch(event.request)
      )
    );
  }
});
```

## Lessons Learned

### What Worked Well

✅ **Team Autonomy:** Teams truly independent
✅ **Deploy Confidence:** Changes isolated, low risk
✅ **Faster Iterations:** Weekly releases vs. monthly
✅ **Clear Ownership:** No confusion about responsibilities
✅ **Onboarding:** New devs work in one screenset first

### Challenges Faced

⚠️ **Event Contracts:** Need formal event type registry
⚠️ **Shared Components:** Solved with design system package
⚠️ **Version Drift:** Enforced compatible HAI3 versions
⚠️ **Testing:** Cross-screenset integration tests added

### What We'd Do Differently

- **Start with event catalog:** Document all events upfront
- **Automated screenset generation:** CLI tool for scaffolding
- **Performance budget:** Set limits per screenset from day 1
- **Shared component library:** Invest earlier in design system

### Best Practices

1. **Event naming convention:** Enforce `domain.entity.action` from start
2. **Screenset size:** Keep under 100KB per screenset
3. **State boundaries:** Clear shared vs. private from design
4. **Integration tests:** Test event communication paths
5. **Documentation:** Each screenset maintains its own docs

## Results

### Team Velocity

- **Before:** 2-3 features/month (all teams combined)
- **After:** 2-3 features/week (per team)
- **Improvement:** 10x increase

### Deployment Frequency

- **Before:** Monthly releases
- **After:** Daily releases (avg 4/day across teams)
- **Lead Time:** 3 weeks → 2 days

### Quality

- **Bug Rate:** 15% reduction (isolated changes = fewer regressions)
- **Rollback Rate:** 8% → 2% (smaller, safer changes)
- **Test Coverage:** 65% → 85% (easier to test isolated screensets)

### Developer Satisfaction

Survey results (45 developers):
- **Autonomy:** 4.2/5 → 4.8/5
- **Productivity:** 3.8/5 → 4.6/5
- **Code Quality:** 3.5/5 → 4.4/5
- **Would Recommend:** 92% yes

### Business Impact

- **Time-to-Market:** 50% faster for new features
- **Customer Satisfaction:** NPS +12 points
- **Development Cost:** 30% reduction (parallel work, less rework)

## Related Documentation

- [Screensets Concept](/hai3/concepts/screensets)
- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [Manifest - Microfrontends](/hai3/architecture/manifest#v5-pluggable-ui-microfrontends-architecture)
- [Case Studies Overview](/case-studies/)
