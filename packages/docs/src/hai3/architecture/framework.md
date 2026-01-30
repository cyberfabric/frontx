---
title: Framework Layer (L2)
description: Plugin system, registries, and application builder
---

# Framework Layer (L2)

The Framework Layer (`@hai3/framework`) composes SDK packages into a cohesive, plugin-based framework. It provides the plugin system, registries, and application builder.

## Overview

The Framework Layer sits between the SDK (L1) and React (L3) layers:

```
L3: React (@hai3/react)
        ↓
L2: Framework (@hai3/framework) ← You are here
        ↓
L1: SDK (@hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets)
```

**Key Responsibilities:**
- Compose SDK packages
- Provide plugin system
- Manage registries
- Build HAI3 applications
- No UI rendering (that's React layer's job)

## Package Structure

```json
{
  "name": "@hai3/framework",
  "dependencies": {
    "@hai3/state": "*",
    "@hai3/api": "*",
    "@hai3/i18n": "*",
    "@hai3/screensets": "*"
    // NO React or higher layers!
  }
}
```

## Application Builder

The `createHAI3()` function builds HAI3 applications:

```typescript
import { createHAI3 } from '@hai3/framework';
import { screensetPlugin, themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .build();
```

### Builder API

**`createHAI3(options?)`**

Creates a new application builder.

```typescript
const builder = createHAI3({
  id: 'my-app',              // Optional app ID
  name: 'My Application',    // Optional app name
  version: '1.0.0'          // Optional version
});
```

**`.use(plugin)`**

Adds a plugin to the application.

```typescript
builder.use(myPlugin);
```

Plugins are registered in order and dependencies are resolved automatically.

**`.build()`**

Builds and initializes the application.

```typescript
const app = builder.build();
```

Returns a `HAI3App` instance with:
- `id`: Application ID
- `plugins`: Plugin manager
- `eventBus`: Event bus instance
- `store`: Redux store
- `getRegistry(name)`: Get a registry by name

### Complete Example

```typescript
import { createHAI3, createPlugin } from '@hai3/framework';
import {
  screensetPlugin,
  themePlugin,
  routingPlugin,
  i18nPlugin
} from '@hai3/framework/plugins';

// Custom plugin
const analyticsPlugin = createPlugin({
  id: 'analytics',
  name: 'Analytics',
  initialize: (app) => {
    app.eventBus.on('*', (event) => {
      console.log('Event:', event.type);
    });
  }
});

// Build app
const app = createHAI3({ name: 'My App' })
  .use(screensetPlugin)
  .use(themePlugin)
  .use(routingPlugin)
  .use(i18nPlugin)
  .use(analyticsPlugin)
  .build();

console.log('App ready:', app.id);
```

## Core Plugins

Framework includes several built-in plugins:

### Screenset Plugin

Manages screensets and screens.

```typescript
import { screensetPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(screensetPlugin)
  .build();

// Access screenset registry
const screensetRegistry = app.getRegistry('screensets');
screensetRegistry.register('dashboard', dashboardScreenset);
```

**Provides:**
- Screenset registry
- Screen registration
- Screenset lifecycle management

### Theme Plugin

Manages themes and styling.

```typescript
import { themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(themePlugin)
  .build();

// Access theme registry
const themeRegistry = app.getRegistry('themes');
themeRegistry.register('dark', darkTheme);
```

**Provides:**
- Theme registry
- Theme switching
- Theme persistence

### Routing Plugin

Manages URL routing and navigation.

```typescript
import { routingPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(routingPlugin)
  .build();

// Access route registry
const routeRegistry = app.getRegistry('routes');
routeRegistry.register('/dashboard', DashboardRoute);
```

**Provides:**
- Route registry
- URL synchronization
- Browser history management

### i18n Plugin

Manages internationalization.

```typescript
import { i18nPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(i18nPlugin)
  .build();

// i18n functionality available
app.i18n.setLanguage('es');
```

**Provides:**
- Language switching
- Translation loading
- Locale management

### API Plugin

Manages API services.

```typescript
import { apiPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(apiPlugin)
  .build();

// Access API registry
const apiRegistry = app.getRegistry('api');
apiRegistry.register('users', new UsersApiService());
```

**Provides:**
- API service registry
- Request/response interceptors
- Error handling

### Layout Plugin

Provides layout components.

```typescript
import { layoutPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(layoutPlugin)
  .build();

// Layout configuration available
app.layout.configure({
  menu: { position: 'left', collapsed: false },
  header: { height: 64 }
});
```

**Provides:**
- Layout configuration
- Menu, header, footer, sidebar management

## Framework Presets

Pre-configured plugin bundles:

### Full Preset

Includes all core plugins:

```typescript
import { presets } from '@hai3/framework';

const app = createHAI3()
  .use(presets.full)
  .build();
```

**Includes:**
- screensetPlugin
- themePlugin
- routingPlugin
- i18nPlugin
- apiPlugin
- layoutPlugin

### Minimal Preset

Screensets only:

```typescript
const app = createHAI3()
  .use(presets.minimal)
  .build();
```

**Includes:**
- screensetPlugin

### Headless Preset

No UI, API and state only:

```typescript
const app = createHAI3()
  .use(presets.headless)
  .build();
```

**Includes:**
- apiPlugin
- State management (always included)

### Custom Preset

Create your own:

```typescript
export const myPreset = [
  screensetPlugin,
  themePlugin,
  myCustomPlugin
];

const app = createHAI3()
  .use(myPreset)
  .build();
```

## Registry System

Registries implement the Open/Closed Principle - extend without modifying core.

### Registry Interface

```typescript
interface Registry<T> {
  register(id: string, item: T): void;
  unregister(id: string): void;
  get(id: string): T | undefined;
  getAll(): T[];
  has(id: string): boolean;
}
```

### Using Registries

```typescript
// Get a registry
const screensetRegistry = app.getRegistry('screensets');

// Register items
screensetRegistry.register('dashboard', dashboardScreenset);
screensetRegistry.register('settings', settingsScreenset);

// Query items
const dashboard = screensetRegistry.get('dashboard');
const all = screensetRegistry.getAll();
const exists = screensetRegistry.has('dashboard');

// Unregister
screensetRegistry.unregister('dashboard');
```

### Built-in Registries

| Registry | Type | Provided By |
|----------|------|-------------|
| `screensets` | Screenset | screensetPlugin |
| `themes` | Theme | themePlugin |
| `routes` | Route | routingPlugin |
| `api` | ApiService | apiPlugin |

### Custom Registries

Plugins can create custom registries:

```typescript
const myPlugin = createPlugin({
  id: 'my-plugin',
  initialize: (app) => {
    // Create custom registry
    const items = new Map();

    app.registerRegistry('my-items', {
      register: (id, item) => items.set(id, item),
      get: (id) => items.get(id),
      getAll: () => Array.from(items.values()),
      has: (id) => items.has(id),
      unregister: (id) => items.delete(id)
    });
  }
});

// Use custom registry
const app = createHAI3().use(myPlugin).build();
const myRegistry = app.getRegistry('my-items');
```

## Plugin System

See [Plugin System Concept](/hai3/concepts/plugins) for detailed plugin documentation.

### Plugin Lifecycle

1. **Registration:** `.use(plugin)`
2. **Dependency Resolution:** Framework resolves plugin dependencies
3. **Initialization:** `initialize()` called in dependency order
4. **Active:** Plugin runs
5. **Cleanup:** `cleanup()` called on shutdown

### Plugin Dependencies

Plugins can declare dependencies:

```typescript
const myPlugin = createPlugin({
  id: 'my-plugin',
  dependencies: ['screenset', 'api'],  // Requires these first
  initialize: (app) => {
    // screenset and api plugins are guaranteed to be initialized
    const screensetRegistry = app.getRegistry('screensets');
    const apiRegistry = app.getRegistry('api');
  }
});
```

Framework ensures:
- Dependencies are initialized first
- Circular dependencies are detected and error
- Missing dependencies are reported

## Event Bus Integration

Framework provides event bus access:

```typescript
const app = createHAI3().build();

// Emit events
app.eventBus.emit({
  type: 'app.initialized',
  payload: { timestamp: Date.now() }
});

// Listen to events
app.eventBus.on('user.login', (event) => {
  console.log('User logged in:', event.payload);
});
```

See [Event-Driven Architecture](/hai3/concepts/event-driven) for details.

## State Management Integration

Framework includes Redux store:

```typescript
import { registerSlice, createSlice } from '@hai3/state';

const app = createHAI3().build();

// Create a slice
const mySlice = createSlice({
  name: 'myFeature',
  initialState: {},
  reducers: {}
});

// Register it
registerSlice(app.store, mySlice);

// Dispatch actions
app.store.dispatch(mySlice.actions.someAction());
```

See [State Management SDK](/hai3/architecture/sdk/state) for details.

## Configuration

### App Configuration

```typescript
const app = createHAI3({
  id: 'my-app',
  name: 'My Application',
  version: '1.0.0',
  env: 'production',           // 'development' | 'production'
  logLevel: 'info'            // 'debug' | 'info' | 'warn' | 'error'
}).build();
```

### Plugin Configuration

Pass configuration to plugins:

```typescript
const myPlugin = (config) => createPlugin({
  id: 'my-plugin',
  initialize: (app) => {
    // Use config
    console.log('Config:', config);
  }
});

const app = createHAI3()
  .use(myPlugin({ apiKey: 'xxx', enabled: true }))
  .build();
```

## Testing Framework Code

### Unit Testing

```typescript
import { createHAI3, createPlugin } from '@hai3/framework';

test('app builds successfully', () => {
  const app = createHAI3().build();
  expect(app).toBeDefined();
  expect(app.id).toBeTruthy();
});

test('plugin initializes', () => {
  const initSpy = jest.fn();
  const plugin = createPlugin({
    id: 'test',
    initialize: initSpy
  });

  createHAI3().use(plugin).build();

  expect(initSpy).toHaveBeenCalled();
});
```

### Integration Testing

```typescript
test('plugins work together', () => {
  const app = createHAI3()
    .use(screensetPlugin)
    .use(themePlugin)
    .build();

  const screensetRegistry = app.getRegistry('screensets');
  const themeRegistry = app.getRegistry('themes');

  expect(screensetRegistry).toBeDefined();
  expect(themeRegistry).toBeDefined();
});
```

## Best Practices

### ✅ Do

**Use Builder Pattern:**
```typescript
// ✅ Good: Fluent API
const app = createHAI3()
  .use(plugin1)
  .use(plugin2)
  .build();
```

**Order Plugins by Dependency:**
```typescript
// ✅ Good: Dependencies first (framework resolves automatically)
const app = createHAI3()
  .use(screensetPlugin)  // No dependencies
  .use(analyticsPlugin)  // Depends on screenset
  .build();
```

**Use Presets for Common Configs:**
```typescript
// ✅ Good: Reusable preset
export const webAppPreset = [
  screensetPlugin,
  themePlugin,
  routingPlugin,
  i18nPlugin
];
```

### ❌ Don't

**Don't Call .build() Multiple Times:**
```typescript
// ❌ Bad: Build once
const builder = createHAI3();
const app1 = builder.build();
const app2 = builder.build();  // Don't do this!
```

**Don't Modify App After Build:**
```typescript
// ❌ Bad: Can't add plugins after build
const app = createHAI3().build();
app.use(newPlugin);  // Error!
```

**Don't Skip Dependencies:**
```typescript
// ❌ Bad: analyticsPlugin needs screensetPlugin
const app = createHAI3()
  .use(analyticsPlugin)  // Error: missing dependency!
  .build();
```

## Common Patterns

### Conditional Plugins

```typescript
const plugins = [screensetPlugin, themePlugin];

if (process.env.NODE_ENV === 'development') {
  plugins.push(devToolsPlugin);
}

const app = createHAI3()
  .use(plugins)
  .build();
```

### Plugin Composition

```typescript
const createFeaturePlugins = (features: string[]) => {
  return features.map(feature => {
    return createPlugin({
      id: `feature-${feature}`,
      initialize: (app) => {
        // Setup feature
      }
    });
  });
};

const app = createHAI3()
  .use(createFeaturePlugins(['auth', 'analytics']))
  .build();
```

### Lazy Plugin Loading

```typescript
const app = createHAI3()
  .use(screensetPlugin)
  .build();

// Load plugin later
app.eventBus.on('app.ready', async () => {
  const { heavyPlugin } = await import('./heavyPlugin');
  // Note: Can't add plugins after build in current design
  // This pattern would require framework support
});
```

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
- [Plugin System](/hai3/concepts/plugins)
- [React Layer](/hai3/architecture/react)
- [SDK Layer](/hai3/architecture/sdk/state)
- [TERMINOLOGY](/TERMINOLOGY)

## Next Steps

1. **Understand Plugins:** Read [Plugin System](/hai3/concepts/plugins) for detailed plugin documentation
2. **Learn SDK:** Explore [SDK packages](/hai3/architecture/sdk/state) that Framework composes
3. **Build Apps:** See how [React Layer](/hai3/architecture/react) uses Framework
4. **Create Plugins:** Build custom plugins to extend HAI3
