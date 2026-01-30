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
function createHAI3(options?: AppOptions): AppBuilder
```

**Parameters:**
- `options?`:
  - `id?`: Application ID (auto-generated if omitted)
  - `name?`: Application name
  - `version?`: Application version
  - `env?`: Environment (`'development'` | `'production'`)
  - `logLevel?`: Logging level (`'debug'` | `'info'` | `'warn'` | `'error'`)

**Returns:** `AppBuilder` - Fluent builder for application configuration

**Example:**

```typescript
const builder = createHAI3({
  name: 'My App',
  version: '1.0.0',
  env: 'production'
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

The initialized application instance.

```typescript
interface HAI3App {
  id: string;
  plugins: PluginManager;
  eventBus: EventBus;
  store: Store;
  getRegistry<T>(name: string): Registry<T>;
  registerRegistry<T>(name: string, registry: Registry<T>): void;
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

### `createPlugin()`

Creates a plugin.

```typescript
function createPlugin(definition: PluginDefinition): Plugin
```

**Parameters:**
- `definition`:
  - `id`: Unique plugin identifier
  - `name?`: Human-readable name
  - `version?`: Plugin version
  - `dependencies?`: Array of plugin IDs this plugin depends on
  - `initialize`: Function called when plugin initializes
  - `cleanup?`: Function called when plugin cleans up

**Returns:** `Plugin` - Plugin instance

**Example:**

```typescript
const myPlugin = createPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  dependencies: ['screenset'],
  initialize: (app) => {
    console.log('Plugin initialized');
    app.eventBus.on('*', (event) => {
      console.log('Event:', event.type);
    });
  },
  cleanup: () => {
    console.log('Plugin cleaned up');
  }
});
```

### `Plugin`

Plugin instance.

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  initialize(app: HAI3App): void | Promise<void>;
  cleanup?(): void | Promise<void>;
}
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

### `presets.full`

All core plugins.

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

### `presets.minimal`

Screensets only.

```typescript
import { presets } from '@hai3/framework';

const app = createHAI3()
  .use(presets.minimal)
  .build();
```

**Includes:**
- screensetPlugin

### `presets.headless`

No UI, API and state only.

```typescript
import { presets } from '@hai3/framework';

const app = createHAI3()
  .use(presets.headless)
  .build();
```

**Includes:**
- apiPlugin

## Types

### `AppOptions`

Application configuration options.

```typescript
interface AppOptions {
  id?: string;
  name?: string;
  version?: string;
  env?: 'development' | 'production';
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

### `PluginDefinition`

Plugin definition object.

```typescript
interface PluginDefinition {
  id: string;
  name?: string;
  version?: string;
  dependencies?: string[];
  initialize(app: HAI3App): void | Promise<void>;
  cleanup?(): void | Promise<void>;
}
```

### `PluginConfig`

Configuration for plugins.

```typescript
type PluginConfig = {
  [key: string]: any;
}
```

## Related Documentation

- [Framework Layer](/hai3/architecture/framework)
- [Plugin Concepts](/hai3/concepts/plugins)
- [Layers](/hai3/architecture/layers)
