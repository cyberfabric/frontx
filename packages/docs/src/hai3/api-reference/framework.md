---
title: Framework API Reference
description: API reference for @hai3/framework package
---

# Framework API Reference

Complete API reference for `@hai3/framework` package.

## Application Builder

### `createHAI3()`

Creates a new HAI3 application builder.

```typescript
function createHAI3(config?: HAI3Config): HAI3AppBuilder
```

**Parameters:**
- `config?`: Application configuration
  - `name?`: Application name
  - `devMode?`: Enable development mode (default: false)
  - `strictMode?`: Enable strict mode - throws on errors (default: false)
  - `autoNavigate?`: Auto-navigate to first screenset on mount (default: true)
  - `base?`: Base path for navigation (default: '/')
  - `routerMode?`: Router mode - 'browser' | 'hash' | 'memory' (default: 'browser')

**Returns:** `HAI3AppBuilder` - Fluent builder for plugin composition

**Example:**

```typescript
const builder = createHAI3({
  name: 'My App',
  devMode: true,
  base: '/console',
  routerMode: 'browser'
});
```

### `AppBuilder.use()`

Registers a plugin or array of plugins.

```typescript
use(plugin: Plugin | Plugin[]): AppBuilder
```

**Parameters:**
- `plugin`: Single plugin or array of plugins

**Returns:** `AppBuilder` - Builder instance (for chaining)

**Example:**

```typescript
const builder = createHAI3()
  .use(screensetPlugin)
  .use(themePlugin)
  .use([i18nPlugin, routingPlugin]);
```

### `AppBuilder.build()`

Builds and initializes the application.

```typescript
build(): HAI3App
```

**Returns:** `HAI3App` - Initialized application instance

**Example:**

```typescript
const app = createHAI3()
  .use(screensetPlugin)
  .build();
```

## Application Instance

### `HAI3App`

The initialized application instance returned by `.build()`.

::: warning Note
`HAI3App` is a **TypeScript type** for the application instance, not a React component. For the React provider component, use `HAI3Provider` from `@hai3/react`.
:::

```typescript
interface HAI3App {
  name?: string;
  store: HAI3Store;
  screensetRegistry: ScreensetRegistry;
  themeRegistry: ThemeRegistry;
  routeRegistry: RouteRegistry;
  i18nRegistry: I18nRegistry;
  actions: HAI3Actions;
  destroy: () => void;
}
```

**Example:**

```typescript
const app = createHAI3().build();

console.log(app.id);                          // 'app-1234'
const screensets = app.getRegistry('screensets');
app.eventBus.emit({ type: 'app.ready' });
```

## Plugin System

### Creating Custom Plugins

Plugins are factory functions that return `HAI3Plugin` objects.

```typescript
function myPlugin(): HAI3Plugin {
  return {
    name: 'my-plugin',
    dependencies?: string[],
    provides?: PluginProvides,
    onRegister?: (registry: HAI3Registry) => void,
    onInit?: (app: HAI3App) => void,
    onDestroy?: () => void,
  };
}
```

**Plugin Structure:**
- `name`: Unique plugin identifier (required)
- `dependencies?`: Array of plugin names this depends on
- `provides?`: Registries, slices, effects, and actions provided by plugin
- `onRegister?`: Called during plugin registration (before app build)
- `onInit?`: Called after app is built and all plugins initialized
- `onDestroy?`: Called when app is destroyed (cleanup)

**Example:**

```typescript
import type { HAI3Plugin, HAI3App } from '@hai3/framework';
import { eventBus } from '@hai3/framework';

export function loggingPlugin(): HAI3Plugin {
  return {
    name: 'logging',
    dependencies: ['screensets'],
    onInit(app: HAI3App) {
      console.log('Logging plugin initialized');
      eventBus.on('*', (payload, type) => {
        console.log('Event:', type, payload);
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

### Available Plugins

HAI3 provides these built-in plugins:

**Core Plugins:**
- `screensets()` - Screenset registry and screen state management
- `themes()` - Theme registry and theme switching
- `layout()` - Layout domains (header, footer, menu, sidebar, popup, overlay)
- `navigation()` - Navigation actions (navigateToScreen, navigateToScreenset)
- `routing()` - URL routing and route registry
- `i18n()` - Internationalization and translation registry

**Utility Plugins:**
- `effects()` - Effect coordination system
- `mock()` - Centralized mock mode control

**Usage:**
```typescript
import { createHAI3, screensets, themes, layout } from '@hai3/framework';

const app = createHAI3()
  .use(screensets())
  .use(themes())
  .use(layout())
  .build();
```

### `PluginManager`

Manages plugins.

```typescript
interface PluginManager {
  get(id: string): Plugin | undefined;
  getAll(): Plugin[];
  has(id: string): boolean;
}
```

**Example:**

```typescript
const app = createHAI3()
  .use(screensetPlugin)
  .build();

app.plugins.has('screenset');  // true
const plugin = app.plugins.get('screenset');
const allPlugins = app.plugins.getAll();
```

## Registries

### `Registry<T>`

Generic registry interface.

```typescript
interface Registry<T> {
  register(id: string, item: T): void;
  unregister(id: string): void;
  get(id: string): T | undefined;
  getAll(): T[];
  has(id: string): boolean;
}
```

**Example:**

```typescript
const screensetRegistry = app.getRegistry<Screenset>('screensets');

screensetRegistry.register('dashboard', dashboardScreenset);
const dashboard = screensetRegistry.get('dashboard');
const all = screensetRegistry.getAll();
screensetRegistry.has('dashboard');  // true
```

### `app.getRegistry()`

Gets a registry by name.

```typescript
getRegistry<T>(name: string): Registry<T>
```

**Parameters:**
- `name`: Registry name

**Returns:** `Registry<T>` - Registry instance

**Example:**

```typescript
const screensets = app.getRegistry<Screenset>('screensets');
const themes = app.getRegistry<Theme>('themes');
const apis = app.getRegistry<ApiService>('api');
```

### `app.registerRegistry()`

Registers a custom registry.

```typescript
registerRegistry<T>(name: string, registry: Registry<T>): void
```

**Parameters:**
- `name`: Registry name
- `registry`: Registry implementation

**Example:**

```typescript
const customRegistry: Registry<MyType> = {
  register: (id, item) => { /* ... */ },
  get: (id) => { /* ... */ },
  getAll: () => { /* ... */ },
  has: (id) => { /* ... */ },
  unregister: (id) => { /* ... */ }
};

app.registerRegistry('custom', customRegistry);
```

## Built-in Plugins

### `screensetPlugin`

Manages screensets and screens.

```typescript
import { screensetPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(screensetPlugin)
  .build();

const screensets = app.getRegistry('screensets');
```

### `themePlugin`

Manages themes.

```typescript
import { themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(themePlugin({
    themes: [lightTheme, darkTheme],
    defaultTheme: 'light'
  }))
  .build();
```

### `routingPlugin`

Manages routing.

```typescript
import { routingPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(routingPlugin())
  .build();
```

### `i18nPlugin`

Manages internationalization.

```typescript
import { i18nPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(i18nPlugin({
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr']
  }))
  .build();
```

### `apiPlugin`

Manages API services.

```typescript
import { apiPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(apiPlugin())
  .build();

const apiRegistry = app.getRegistry('api');
apiRegistry.register('users', new UsersApiService());
```

### `layoutPlugin`

Manages layout configuration.

```typescript
import { layoutPlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(layoutPlugin())
  .build();
```

## Presets

Pre-configured plugin combinations for common use cases.

### `presets.full()`

All core plugins for the complete HAI3 experience. This is the default for `hai3 create` projects.

```typescript
import { createHAI3, full } from '@hai3/framework';

const app = createHAI3()
  .use(full())
  .build();
```

**Includes:**
- `screensets()` - Screenset registry and screen slice
- `themes()` - Theme registry and changeTheme action
- `layout()` - All layout domain slices (header, footer, menu, sidebar, popup, overlay)
- `navigation()` - Navigation actions (navigateToScreen, navigateToScreenset)
- `routing()` - Route registry auto-synced from screensets
- `i18n()` - Internationalization registry and setLanguage action
- `effects()` - Effect coordination system
- `mock()` - Mock mode control for API services

**Configuration:**

```typescript
import { applyTheme } from '@hai3/uikit';

const app = createHAI3()
  .use(full({ themes: { applyFn: applyTheme } }))
  .build();
```

### `presets.minimal()`

Screensets + themes only. For users who want basic HAI3 patterns without full layout management.

```typescript
import { createHAI3, minimal } from '@hai3/framework';

const app = createHAI3()
  .use(minimal())
  .build();
```

**Includes:**
- `screensets()` - Screenset registry and screen slice
- `themes()` - Theme registry and changeTheme action

### `presets.headless()`

Screensets only. For external platform integration where you only need screenset orchestration (the external platform provides its own menu, header, navigation, etc.).

```typescript
import { createHAI3, headless } from '@hai3/framework';

const app = createHAI3()
  .use(headless())
  .build();
```

**Includes:**
- `screensets()` - Screenset registry and screen slice

## Types

### `HAI3Config`

Application configuration options passed to `createHAI3()`.

```typescript
interface HAI3Config {
  /** Application name */
  name?: string;
  /** Enable development mode */
  devMode?: boolean;
  /** Enable strict mode (throws on errors) */
  strictMode?: boolean;
  /** Auto-navigate to first screenset on mount (default: true) */
  autoNavigate?: boolean;
  /** Base path for navigation (default: '/') */
  base?: string;
  /** Router mode: 'browser' | 'hash' | 'memory' (default: 'browser') */
  routerMode?: 'browser' | 'hash' | 'memory';
}
```

### `HAI3Plugin`

Plugin interface returned by plugin factory functions.

```typescript
interface HAI3Plugin {
  /** Unique plugin identifier */
  name: string;
  /** Plugin dependencies (other plugin names) */
  dependencies?: string[];
  /** Resources provided by this plugin */
  provides?: PluginProvides;
  /** Called during plugin registration phase */
  onRegister?(registry: HAI3Registry): void;
  /** Called after app is built */
  onInit?(app: HAI3App): void;
  /** Called when app is destroyed */
  onDestroy?(): void;
}
```

### `PluginProvides`

Resources that plugins can provide to the application.

```typescript
interface PluginProvides {
  /** Registries to add to app instance */
  registries?: Record<string, any>;
  /** Redux slices to register */
  slices?: SliceObject[];
  /** Effect initializers */
  effects?: EffectInitializer[];
  /** Actions to add to app.actions */
  actions?: Record<string, Function>;
}
```

## Related Documentation

- [Framework Layer](/hai3/architecture/framework)
- [Plugin Concepts](/hai3/concepts/plugins)
- [Layers](/hai3/architecture/layers)
