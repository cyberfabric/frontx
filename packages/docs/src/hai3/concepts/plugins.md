---
title: Plugin System
description: Extending HAI3 through well-defined plugin interfaces
---

# Plugin System

HAI3 is built as a collection of plugins. Everything from screensets to themes to routing is implemented as a plugin, making the framework extensible without modifying core code.

## Philosophy

**"HAI3 itself is a plugin."**

The framework core is minimal - just the plugin system and event bus. All other functionality comes from plugins:

```typescript
import { createHAI3 } from '@hai3/framework';
import {
  screensetPlugin,
  themePlugin,
  routingPlugin,
  i18nPlugin
} from '@hai3/framework/plugins';

// Build HAI3 from plugins
const app = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .use(routingPlugin)
  .use(i18nPlugin)
  .build();
```

This architecture enables:
- **Extensibility:** Add features without changing core
- **Modularity:** Use only what you need
- **Testability:** Test plugins in isolation
- **Reusability:** Share plugins across projects

## Core Plugins

HAI3 includes several built-in plugins:

| Plugin | Purpose | Registry |
|--------|---------|----------|
| **screensetPlugin** | Manages screensets and screens | ScreensetRegistry |
| **themePlugin** | Theme management and switching | ThemeRegistry |
| **routingPlugin** | URL routing and navigation | RouteRegistry |
| **i18nPlugin** | Internationalization | - |
| **apiPlugin** | API service management | ApiRegistry |
| **layoutPlugin** | Layout components (menu, header, etc.) | - |

### Using Core Plugins

```typescript
import { createHAI3 } from '@hai3/framework';
import { screensetPlugin, themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .build();
```

### Framework Presets

HAI3 provides preset plugin bundles:

```typescript
import { createHAI3, presets } from '@hai3/framework';

// Full preset (all plugins)
const fullApp = createHAI3()
  .use(presets.full)
  .build();

// Minimal preset (screensets only)
const minimalApp = createHAI3()
  .use(presets.minimal)
  .build();

// Headless preset (no UI)
const headlessApp = createHAI3()
  .use(presets.headless)
  .build();
```

## Plugin Interface

Every plugin implements the `Plugin` interface:

```typescript
interface Plugin {
  id: string;                           // Unique identifier
  name: string;                         // Human-readable name
  version?: string;                     // Optional version
  dependencies?: string[];              // Plugin IDs this depends on
  initialize?: (app: HAI3App) => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
}
```

### Plugin Lifecycle

Plugins go through a lifecycle:

```
Registration → Dependency Resolution → Initialization → Active → Cleanup
```

**1. Registration:** Plugin is added with `.use()`

**2. Dependency Resolution:** Framework ensures dependencies are loaded first

**3. Initialization:** `initialize()` is called

**4. Active:** Plugin is running

**5. Cleanup:** `cleanup()` is called on shutdown

## Creating Custom Plugins

### Basic Plugin

Create a simple plugin:

```typescript
import { createPlugin } from '@hai3/framework';

export const loggingPlugin = createPlugin({
  id: 'logging',
  name: 'Logging Plugin',
  initialize: (app) => {
    console.log('App initialized:', app.id);

    // Listen to all events
    app.eventBus.on('*', (event) => {
      console.log('[Event]', event.type, event.payload);
    });
  },
  cleanup: () => {
    console.log('Logging plugin cleaned up');
  }
});
```

Use it:

```typescript
const app = createHAI3()
  .use(loggingPlugin)
  .build();
```

### Plugin with Dependencies

Create a plugin that depends on others:

```typescript
export const analyticsPlugin = createPlugin({
  id: 'analytics',
  name: 'Analytics Plugin',
  dependencies: ['screenset', 'routing'],  // Requires these plugins
  initialize: (app) => {
    // Access screenset registry (provided by screensetPlugin)
    const screensetRegistry = app.getRegistry('screensets');

    // Listen to routing events
    app.eventBus.on('route.changed', (event) => {
      trackPageView(event.payload.path);
    });
  }
});
```

### Plugin with Configuration

Create a configurable plugin:

```typescript
interface AnalyticsConfig {
  trackingId: string;
  enabled: boolean;
  debugMode?: boolean;
}

export const createAnalyticsPlugin = (config: AnalyticsConfig) => {
  return createPlugin({
    id: 'analytics',
    name: 'Analytics Plugin',
    initialize: (app) => {
      if (!config.enabled) return;

      // Initialize analytics with config
      initializeAnalytics(config.trackingId);

      if (config.debugMode) {
        console.log('Analytics enabled:', config.trackingId);
      }

      // Track events
      app.eventBus.on('*', (event) => {
        trackEvent(event.type, event.payload);
      });
    }
  });
};

// Use with configuration
const app = createHAI3()
  .use(createAnalyticsPlugin({
    trackingId: 'UA-XXXXX',
    enabled: true,
    debugMode: false
  }))
  .build();
```

## Plugin Patterns

### Registry Plugin

Plugins can provide registries:

```typescript
export const iconPlugin = createPlugin({
  id: 'icons',
  name: 'Icon Plugin',
  initialize: (app) => {
    // Create a registry for icons
    const iconRegistry = new Map<string, IconComponent>();

    // Register built-in icons
    iconRegistry.set('user', UserIcon);
    iconRegistry.set('settings', SettingsIcon);

    // Expose registry
    app.registerRegistry('icons', {
      register: (id: string, icon: IconComponent) => {
        iconRegistry.set(id, icon);
      },
      get: (id: string) => iconRegistry.get(id),
      getAll: () => Array.from(iconRegistry.values())
    });
  }
});

// Use the registry
const app = createHAI3().use(iconPlugin).build();
const iconRegistry = app.getRegistry('icons');
iconRegistry.register('custom-icon', MyCustomIcon);
```

### Middleware Plugin

Create middleware for API requests:

```typescript
export const authMiddlewarePlugin = createPlugin({
  id: 'auth-middleware',
  name: 'Auth Middleware',
  dependencies: ['api'],
  initialize: (app) => {
    const apiRegistry = app.getRegistry('api');

    // Add auth header to all requests
    apiRegistry.addInterceptor({
      request: (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`
          };
        }
        return config;
      }
    });
  }
});
```

### Feature Toggle Plugin

Implement feature flags:

```typescript
interface FeatureFlags {
  [key: string]: boolean;
}

export const createFeatureFlagPlugin = (flags: FeatureFlags) => {
  return createPlugin({
    id: 'feature-flags',
    name: 'Feature Flag Plugin',
    initialize: (app) => {
      // Expose feature flag checker
      app.features = {
        isEnabled: (flag: string) => flags[flag] === true,
        getAll: () => flags
      };

      // Filter screensets based on flags
      app.eventBus.on('screensets.loading', (event) => {
        const filtered = event.payload.screensets.filter(screenset => {
          const flag = screenset.featureFlag;
          return !flag || flags[flag];
        });
        event.payload.screensets = filtered;
      });
    }
  });
};

// Use with flags
const app = createHAI3()
  .use(createFeatureFlagPlugin({
    'new-dashboard': true,
    'experimental-feature': false
  }))
  .build();
```

### Performance Monitoring Plugin

Track performance metrics:

```typescript
export const performancePlugin = createPlugin({
  id: 'performance',
  name: 'Performance Monitoring',
  initialize: (app) => {
    const metrics = new Map<string, number[]>();

    // Track event processing time
    app.eventBus.on('*', (event) => {
      const start = performance.now();

      // Original handler runs
      requestAnimationFrame(() => {
        const duration = performance.now() - start;

        if (!metrics.has(event.type)) {
          metrics.set(event.type, []);
        }
        metrics.get(event.type)!.push(duration);

        // Log slow events
        if (duration > 16) {  // > 1 frame at 60fps
          console.warn(`Slow event: ${event.type} took ${duration.toFixed(2)}ms`);
        }
      });
    });

    // Expose metrics API
    app.performance = {
      getMetrics: (eventType: string) => metrics.get(eventType),
      getAllMetrics: () => Object.fromEntries(metrics)
    };
  }
});
```

## Plugin Best Practices

### ✅ Do

**Single Responsibility:**
```typescript
// ✅ Good: Focused plugin
export const notificationPlugin = createPlugin({
  id: 'notifications',
  name: 'Notification Plugin',
  initialize: (app) => {
    // Only handles notifications
    app.eventBus.on('notification.show', showNotification);
  }
});
```

**Declare Dependencies:**
```typescript
// ✅ Good: Explicit dependencies
export const plugin = createPlugin({
  id: 'my-plugin',
  dependencies: ['screenset', 'api'],  // Clear dependencies
  initialize: (app) => {
    // Use screenset and api registries
  }
});
```

**Clean Up Resources:**
```typescript
// ✅ Good: Proper cleanup
export const timerPlugin = createPlugin({
  id: 'timer',
  initialize: (app) => {
    const interval = setInterval(() => {
      app.eventBus.emit({ type: 'timer.tick' });
    }, 1000);

    return () => clearInterval(interval);  // Cleanup!
  }
});
```

**Use TypeScript:**
```typescript
// ✅ Good: Typed plugin
interface MyPluginConfig {
  apiKey: string;
  timeout: number;
}

export const createMyPlugin = (config: MyPluginConfig) => {
  return createPlugin({
    id: 'my-plugin',
    // Fully typed
  });
};
```

### ❌ Don't

**Avoid Global State:**
```typescript
// ❌ Bad: Global state
let globalCounter = 0;  // Avoid!

export const counterPlugin = createPlugin({
  initialize: (app) => {
    // Use app-scoped state instead
  }
});

// ✅ Good: Use app context or Redux
```

**Don't Violate Isolation:**
```typescript
// ❌ Bad: Direct access to other plugins
export const badPlugin = createPlugin({
  initialize: (app) => {
    // Don't access other plugin internals!
    const otherPlugin = app._internalPlugins.get('other');
  }
});

// ✅ Good: Use registries or events
export const goodPlugin = createPlugin({
  dependencies: ['other'],
  initialize: (app) => {
    const registry = app.getRegistry('other');
  }
});
```

**Avoid Heavy Initialization:**
```typescript
// ❌ Bad: Blocking initialization
export const slowPlugin = createPlugin({
  initialize: async (app) => {
    // Blocks app startup!
    await loadHugeDataset();
  }
});

// ✅ Good: Lazy load
export const fastPlugin = createPlugin({
  initialize: (app) => {
    app.eventBus.on('app.ready', async () => {
      await loadHugeDataset();
    });
  }
});
```

## Plugin Registry Pattern

HAI3 uses registries to implement the **Open/Closed Principle** - open for extension, closed for modification.

### Creating a Registry

```typescript
interface Registry<T> {
  register: (id: string, item: T) => void;
  unregister: (id: string) => void;
  get: (id: string) => T | undefined;
  getAll: () => T[];
  has: (id: string) => boolean;
}

function createRegistry<T>(): Registry<T> {
  const items = new Map<string, T>();

  return {
    register: (id, item) => items.set(id, item),
    unregister: (id) => items.delete(id),
    get: (id) => items.get(id),
    getAll: () => Array.from(items.values()),
    has: (id) => items.has(id)
  };
}
```

### Using Registries

```typescript
// Core provides screenset registry
const screensetRegistry = app.getRegistry('screensets');

// Your code extends it
screensetRegistry.register('dashboard', dashboardScreenset);
screensetRegistry.register('settings', settingsScreenset);

// No modifications to core code!
```

## Testing Plugins

### Unit Testing

```typescript
import { createHAI3 } from '@hai3/framework';
import { myPlugin } from './myPlugin';

test('plugin initializes correctly', () => {
  const app = createHAI3().use(myPlugin).build();

  expect(app.plugins.has('my-plugin')).toBe(true);
});

test('plugin handles events', () => {
  const handler = jest.fn();
  const testPlugin = createPlugin({
    id: 'test',
    initialize: (app) => {
      app.eventBus.on('test.event', handler);
    }
  });

  const app = createHAI3().use(testPlugin).build();
  app.eventBus.emit({ type: 'test.event' });

  expect(handler).toHaveBeenCalled();
});
```

### Integration Testing

```typescript
test('plugins work together', () => {
  const app = createHAI3()
    .use(pluginA)
    .use(pluginB)
    .build();

  // Test interaction between plugins
  app.eventBus.emit({ type: 'trigger.action' });

  // Assert both plugins responded correctly
});
```

## Real-World Examples

### Authentication Plugin

```typescript
export const createAuthPlugin = (config: AuthConfig) => {
  return createPlugin({
    id: 'auth',
    name: 'Authentication Plugin',
    initialize: (app) => {
      let currentUser: User | null = null;

      // Handle login
      app.eventBus.on('auth.login', async (event) => {
        const { email, password } = event.payload;
        const user = await authService.login(email, password);
        currentUser = user;
        app.eventBus.emit({ type: 'auth.logged-in', payload: user });
      });

      // Handle logout
      app.eventBus.on('auth.logout', async () => {
        await authService.logout();
        currentUser = null;
        app.eventBus.emit({ type: 'auth.logged-out' });
      });

      // Expose auth API
      app.auth = {
        getCurrentUser: () => currentUser,
        isAuthenticated: () => currentUser !== null
      };
    }
  });
};
```

### Caching Plugin

```typescript
export const createCachePlugin = (options: CacheOptions = {}) => {
  return createPlugin({
    id: 'cache',
    name: 'Cache Plugin',
    dependencies: ['api'],
    initialize: (app) => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const ttl = options.ttl || 5 * 60 * 1000;  // 5 minutes

      // Intercept API requests
      const apiRegistry = app.getRegistry('api');
      apiRegistry.addInterceptor({
        request: (config) => {
          if (config.method === 'GET') {
            const cached = cache.get(config.url);
            if (cached && Date.now() - cached.timestamp < ttl) {
              return Promise.resolve(cached.data);
            }
          }
          return config;
        },
        response: (response, config) => {
          if (config.method === 'GET') {
            cache.set(config.url, {
              data: response,
              timestamp: Date.now()
            });
          }
          return response;
        }
      });

      // Invalidate cache on events
      app.eventBus.on('cache.invalidate', (event) => {
        if (event.payload.key) {
          cache.delete(event.payload.key);
        } else {
          cache.clear();
        }
      });
    }
  });
};
```

## Related Documentation

- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [Framework Layer](/hai3/architecture/framework)
- [Architecture Overview](/hai3/architecture/overview)
- [TERMINOLOGY](/TERMINOLOGY#plugin-system)
- [Extensibility Guide](/TERMINOLOGY#how-to-extend-hai3)

## Next Steps

1. **Explore Core Plugins:** Understand built-in plugins in the [Framework Layer](/hai3/architecture/framework)
2. **Build a Plugin:** Create your first custom plugin
3. **Learn Events:** Plugins use [Event-Driven Architecture](/hai3/concepts/event-driven)
4. **Study Examples:** Check out the HAI3 examples repository for plugin samples
