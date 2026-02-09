---
title: Plugin System
description: Understanding HAI3's plugin architecture
---

# Plugin System

HAI3's plugin system enables modular, composable applications. Plugins provide registries, state slices, effects, and actions that extend the framework.

## What are Plugins?

Plugins are factory functions that return `HAI3Plugin` objects. They encapsulate related functionality and can depend on other plugins.

**Key characteristics:**
- **Composable**: Mix and match plugins for your needs
- **Dependency-aware**: Framework resolves plugin dependencies automatically
- **Lifecycle-managed**: Hooks for registration, initialization, and cleanup
- **Type-safe**: Full TypeScript support with type inference

## Plugin Interface

Every plugin implements the `HAI3Plugin` interface:

```typescript
interface HAI3Plugin {
  name: string;                         // Unique identifier
  dependencies?: string[];              // Plugin names this depends on
  provides?: PluginProvides;            // Registries, slices, effects, actions
  onRegister?: (registry: HAI3Registry) => void;
  onInit?: (app: HAI3App) => void;
  onDestroy?: () => void;
}
```

### Plugin Lifecycle

Plugins go through a lifecycle:

```
Registration → Dependency Resolution → onRegister → Build → onInit → Active → onDestroy
```

**1. Registration:** Plugin is added with `.use(plugin())`

**2. Dependency Resolution:** Framework ensures dependencies are loaded first

**3. onRegister (Optional):** Called during registration to set up resources

**4. Build:** App is built with all plugins composed

**5. onInit (Optional):** Called after app is built and ready

**6. Active:** Plugin is running

**7. onDestroy (Optional):** Called when app is destroyed (cleanup)

## Built-in Plugins

HAI3 provides 8 built-in plugins:

### Core Plugins

#### `screensets()`

Provides screenset registry and screen state management.

```typescript
import { createHAI3, screensets } from '@hai3/framework';

const app = createHAI3()
  .use(screensets())
  .build();
```

**Configuration:**
```typescript
screensets({
  autoDiscover: true  // Auto-discover screensets from src/screensets/
})
```

**Provides:**
- `app.screensetRegistry` - Screenset registry
- `screenSlice` - Active screen state

#### `themes()`

Provides theme registry and theme switching.

```typescript
import { createHAI3, themes } from '@hai3/framework';
import { applyTheme } from '@hai3/uikit';

const app = createHAI3()
  .use(themes({ applyFn: applyTheme }))
  .build();
```

**Configuration:**
```typescript
themes({
  applyFn?: (theme: UikitTheme) => void  // Function to apply theme to UI
})
```

**Provides:**
- `app.themeRegistry` - Theme registry
- `changeTheme` action - Switch themes

#### `layout()`

Provides all layout domain slices (header, footer, menu, sidebar, popup, overlay).

```typescript
import { createHAI3, layout } from '@hai3/framework';

const app = createHAI3()
  .use(layout())
  .build();
```

**Dependencies:** `screensets`

**Provides:**
- Layout domain slices: `headerSlice`, `footerSlice`, `menuSlice`, `sidebarSlice`, `popupSlice`, `overlaySlice`
- Layout actions: `setMenuCollapsed`, `toggleSidebar`, `openPopup`, etc.

#### `navigation()`

Provides navigation actions for moving between screens and screensets.

```typescript
import { createHAI3, navigation } from '@hai3/framework';

const app = createHAI3()
  .use(navigation())
  .build();
```

**Dependencies:** `screensets`, `routing`

**Provides:**
- `navigateToScreen` action
- `navigateToScreenset` action
- Navigation event coordination

#### `routing()`

Provides route registry auto-synced from screensets.

```typescript
import { createHAI3, routing } from '@hai3/framework';

const app = createHAI3()
  .use(routing())
  .build();
```

**Dependencies:** `screensets`

**Provides:**
- `app.routeRegistry` - Route registry
- URL synchronization
- Route matching

#### `i18n()`

Provides internationalization registry and language switching.

```typescript
import { createHAI3, i18n } from '@hai3/framework';

const app = createHAI3()
  .use(i18n())
  .build();
```

**Provides:**
- `app.i18nRegistry` - Translation registry
- `setLanguage` action
- Translation management

### Utility Plugins

#### `effects()`

Provides effect coordination system for managing side effects.

```typescript
import { createHAI3, effects } from '@hai3/framework';

const app = createHAI3()
  .use(effects())
  .build();
```

**Purpose:** Required by other plugins that need effect coordination (e.g., mock plugin).

#### `mock()`

Provides centralized mock mode control for API services.

```typescript
import { createHAI3, effects, mock } from '@hai3/framework';

const app = createHAI3()
  .use(effects())  // Required dependency
  .use(mock())
  .build();

// Toggle mock mode
app.actions.toggleMockMode(true);  // Enable mocks
app.actions.toggleMockMode(false); // Disable mocks
```

**Dependencies:** `effects`

**Provides:**
- `mockSlice` - Mock mode state
- `toggleMockMode` action
- Automatic mock plugin activation/deactivation

**Usage:** Services register mock plugins that are automatically controlled by this plugin.

## Creating Custom Plugins

### Basic Plugin

Create a simple logging plugin:

```typescript
import type { HAI3Plugin } from '@hai3/framework';
import { eventBus } from '@hai3/framework';

export function loggingPlugin(): HAI3Plugin {
  return {
    name: 'logging',
    onInit(app) {
      console.log('App initialized:', app.name);

      // Listen to all events
      eventBus.on('*', (payload, type) => {
        console.log('[Event]', type, payload);
      });
    },
    onDestroy() {
      console.log('Logging plugin destroyed');
    }
  };
}

// Usage
const app = createHAI3()
  .use(loggingPlugin())
  .build();
```

### Plugin with Dependencies

Create a plugin that depends on other plugins:

```typescript
import type { HAI3Plugin } from '@hai3/framework';
import { eventBus } from '@hai3/framework';

export function analyticsPlugin(): HAI3Plugin {
  return {
    name: 'analytics',
    dependencies: ['screensets', 'routing'],  // Requires these plugins
    onInit(app) {
      // Access screenset registry
      const screensets = app.screensetRegistry.getAll();
      console.log('Tracking screensets:', screensets.length);

      // Listen to navigation events
      eventBus.on('navigation.screen', (payload) => {
        trackPageView(payload.screensetId, payload.screenId);
      });
    }
  };
}

function trackPageView(screensetId: string, screenId: string) {
  // Send to analytics service
  console.log('Page view:', screensetId, screenId);
}
```

### Plugin with Provided Resources

Create a plugin that provides registries and actions:

```typescript
import type { HAI3Plugin, HAI3App } from '@hai3/framework';
import { createSlice } from '@hai3/state';

// Create a registry
class FeatureFlagRegistry {
  private flags = new Map<string, boolean>();

  register(key: string, value: boolean) {
    this.flags.set(key, value);
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) ?? false;
  }
}

// Create a slice
const featureFlagsSlice = createSlice({
  name: 'featureFlags',
  initialState: { flags: {} as Record<string, boolean> },
  reducers: {
    toggleFlag: (state, action: { payload: { key: string } }) => {
      const { key } = action.payload;
      state.flags[key] = !state.flags[key];
    }
  }
});

export function featureFlagsPlugin(): HAI3Plugin {
  const registry = new FeatureFlagRegistry();

  return {
    name: 'feature-flags',
    provides: {
      registries: { featureFlagRegistry: registry },
      slices: [featureFlagsSlice],
      actions: {
        toggleFeatureFlag: (key: string) => (app: HAI3App) => {
          app.store.dispatch(featureFlagsSlice.actions.toggleFlag({ key }));
        }
      }
    },
    onInit(app) {
      console.log('Feature flags plugin initialized');
    }
  };
}

// Usage
const app = createHAI3()
  .use(featureFlagsPlugin())
  .build();

// Access registry
const registry = app.featureFlagRegistry;
registry.register('new-dashboard', true);

// Use action
app.actions.toggleFeatureFlag('new-dashboard');
```

### Configurable Plugin

Create a plugin with configuration options:

```typescript
import type { HAI3Plugin } from '@hai3/framework';

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

export function loggingPlugin(config?: LoggingConfig): HAI3Plugin {
  const level = config?.level ?? 'info';
  const prefix = config?.prefix ?? '[HAI3]';

  return {
    name: 'logging',
    onInit(app) {
      console.log(`${prefix} Initialized with level: ${level}`);

      // Use config to control logging
      if (level === 'debug') {
        eventBus.on('*', (payload, type) => {
          console.log(`${prefix} [${level}]`, type, payload);
        });
      }
    }
  };
}

// Usage
const app = createHAI3()
  .use(loggingPlugin({ level: 'debug', prefix: '[MyApp]' }))
  .build();
```

## Using Presets

Instead of manually composing plugins, use presets for common configurations:

### Full Preset

All plugins for complete HAI3 experience:

```typescript
import { createHAI3, full } from '@hai3/framework';

const app = createHAI3()
  .use(full())
  .build();

// Includes: screensets, themes, layout, navigation, routing, i18n, effects, mock
```

### Minimal Preset

Screensets + themes only:

```typescript
import { createHAI3, minimal } from '@hai3/framework';

const app = createHAI3()
  .use(minimal())
  .build();

// Includes: screensets, themes
```

### Headless Preset

Screensets only (for external platform integration):

```typescript
import { createHAI3, headless } from '@hai3/framework';

const app = createHAI3()
  .use(headless())
  .build();

// Includes: screensets
```

## Plugin Composition Patterns

### Mixing Presets with Custom Plugins

```typescript
import { createHAI3, full } from '@hai3/framework';
import { analyticsPlugin } from './plugins/analytics';

const app = createHAI3()
  .use(full())                 // All built-in plugins
  .use(analyticsPlugin())      // Add custom plugin
  .build();
```

### Conditional Plugins

```typescript
import { createHAI3, screensets, themes } from '@hai3/framework';
import { devToolsPlugin } from './plugins/devTools';

const builder = createHAI3()
  .use(screensets())
  .use(themes());

// Add dev tools only in development
if (import.meta.env.DEV) {
  builder.use(devToolsPlugin());
}

const app = builder.build();
```

### Plugin Arrays

```typescript
import { createHAI3 } from '@hai3/framework';
import { loggingPlugin } from './plugins/logging';
import { analyticsPlugin } from './plugins/analytics';

const app = createHAI3()
  .use([loggingPlugin(), analyticsPlugin()])  // Multiple plugins at once
  .build();
```

## Best Practices

### 1. Keep Plugins Focused

Each plugin should have a single, well-defined purpose:

✅ **Good:** `authPlugin` handles authentication only
❌ **Bad:** `megaPlugin` handles auth, routing, analytics, and logging

### 2. Declare Dependencies

Always declare plugin dependencies explicitly:

```typescript
export function myPlugin(): HAI3Plugin {
  return {
    name: 'my-plugin',
    dependencies: ['screensets', 'routing'],  // Clear dependencies
    // ...
  };
}
```

### 3. Use Lifecycle Hooks Appropriately

- `onRegister`: Set up resources that other plugins might need
- `onInit`: Initialize after all plugins are registered and app is built
- `onDestroy`: Clean up resources, unsubscribe from events

### 4. Provide Type-Safe APIs

Export types for plugin configuration and provided resources:

```typescript
export interface MyPluginConfig {
  apiKey: string;
  endpoint: string;
}

export function myPlugin(config: MyPluginConfig): HAI3Plugin {
  // Implementation with type-safe config
}
```

### 5. Document Your Plugins

Include JSDoc comments explaining what the plugin does:

```typescript
/**
 * Analytics plugin for tracking user interactions.
 *
 * Provides:
 * - Event tracking
 * - Page view tracking
 * - Custom event support
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(analyticsPlugin({ apiKey: 'xxx' }))
 *   .build();
 * ```
 */
export function analyticsPlugin(config: AnalyticsConfig): HAI3Plugin {
  // ...
}
```

## Advanced Topics

### Plugin Communication

Plugins communicate via the event bus:

```typescript
// Plugin A emits event
export function pluginA(): HAI3Plugin {
  return {
    name: 'plugin-a',
    onInit() {
      eventBus.emit('data.loaded', { items: [] });
    }
  };
}

// Plugin B listens
export function pluginB(): HAI3Plugin {
  return {
    name: 'plugin-b',
    dependencies: ['plugin-a'],
    onInit() {
      eventBus.on('data.loaded', (payload) => {
        console.log('Received data:', payload);
      });
    }
  };
}
```

### Dynamic Plugin Loading

Load plugins conditionally at runtime:

```typescript
async function createApp() {
  const builder = createHAI3()
    .use(screensets())
    .use(themes());

  // Load plugin based on feature flag
  const featureFlags = await fetchFeatureFlags();
  if (featureFlags.enableAnalytics) {
    const { analyticsPlugin } = await import('./plugins/analytics');
    builder.use(analyticsPlugin());
  }

  return builder.build();
}
```

### Plugin Testing

Test plugins in isolation:

```typescript
import { createHAI3 } from '@hai3/framework';
import { loggingPlugin } from './loggingPlugin';

describe('loggingPlugin', () => {
  it('should initialize successfully', () => {
    const app = createHAI3()
      .use(loggingPlugin())
      .build();

    expect(app).toBeDefined();
  });

  it('should log events', () => {
    const spy = vi.spyOn(console, 'log');

    const app = createHAI3()
      .use(loggingPlugin({ level: 'debug' }))
      .build();

    eventBus.emit('test.event', { data: 'test' });

    expect(spy).toHaveBeenCalled();
  });
});
```

## Related Documentation

- [Framework API Reference](/hai3/api-reference/framework) - Detailed plugin API
- [Architecture Overview](/hai3/architecture/overview) - Understanding HAI3 architecture
- [Creating Screensets](/hai3/guides/creating-screensets) - Building with screensets
