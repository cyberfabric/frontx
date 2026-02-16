# @hai3/framework

Plugin-based application framework for HAI3 applications. Orchestrates SDK packages into cohesive applications with MFE (Microfrontend) support.

## Framework Layer

This package is part of the **Framework Layer (L2)** - it depends on SDK packages (@hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n). It provides the plugin architecture and **owns the layout slices** (header, footer, menu, sidebar, screen, popup, overlay).

> **NOTE:** @hai3/uicore is deprecated. Layout slices are defined in @hai3/framework.

## Core Concepts

### Plugin Architecture

Build applications by composing plugins:

```typescript
import { createHAI3, screensets, themes, layout, microfrontends, i18n } from '@hai3/framework';

const app = createHAI3()
  .use(screensets())
  .use(themes())
  .use(layout())
  .use(microfrontends())
  .use(i18n())
  .build();
```

### Presets

Pre-configured plugin combinations:

```typescript
import { createHAI3App, presets } from '@hai3/framework';

// Full preset (default) - all plugins including MFE support
const fullApp = createHAI3App();

// Or explicitly use presets
const minimalApp = createHAI3()
  .use(presets.minimal())  // screensets + themes only
  .build();

const headlessApp = createHAI3()
  .use(presets.headless()) // screensets only
  .build();
```

### Available Plugins

| Plugin | Provides | Dependencies |
|--------|----------|--------------|
| `screensets()` | screensetsRegistry (MFE-enabled), layout domain slices | - |
| `themes()` | themeRegistry, changeTheme action | - |
| `layout()` | header, footer, menu, sidebar, popup, overlay state | screensets |
| `microfrontends()` | MFE actions, selectors, domain constants | screensets |
| `i18n()` | i18nRegistry, setLanguage action | - |
| `effects()` | Core effect coordination | - |
| `mock()` | mockSlice, toggleMockMode action | effects |

### Mock Mode Control

The `mock()` plugin provides centralized mock mode control. It's included in the `full()` preset by default, so apps don't need manual setup:

```typescript
import { createHAI3App } from '@hai3/framework';

// Full preset includes mock plugin automatically
const app = createHAI3App();

// Toggle mock mode via actions (used by HAI3 Studio ApiModeToggle)
app.actions.toggleMockMode(true);  // Activates all registered mock plugins
app.actions.toggleMockMode(false); // Deactivates all registered mock plugins
```

For custom plugin compositions:

```typescript
import { createHAI3, effects, mock } from '@hai3/framework';

const app = createHAI3()
  .use(effects())  // Required dependency
  .use(mock())     // Automatic mock mode control
  .build();
```

Services register mock plugins using `registerPlugin()` in their constructor. The framework automatically manages plugin activation based on mock mode state.

### Built Application

After calling `.build()`, access registries, actions, and the MFE-enabled screensetsRegistry:

```typescript
const app = createHAI3App();

// Access MFE-enabled registry
app.screensetsRegistry.registerDomain(screenDomain, containerProvider);
await app.screensetsRegistry.registerExtension(homeExtension);
await app.screensetsRegistry.executeActionsChain({
  action: { type: HAI3_ACTION_MOUNT_EXT, target: 'screen', payload: { extensionId: 'home' } }
});

// Access other registries
app.themeRegistry.getCurrent();
app.i18nRegistry.t('common:title');

// Access store
const state = app.store.getState();
app.store.dispatch(someAction);

// Access MFE actions
app.actions.loadExtension({ extensionId: 'home' });
app.actions.mountExtension({ extensionId: 'home', domainId: 'screen', container });
app.actions.unmountExtension({ extensionId: 'home', domainId: 'screen' });
app.actions.registerExtension(homeExtension);
app.actions.unregisterExtension({ extensionId: 'home' });

// Access theme and i18n actions
app.actions.changeTheme({ themeId: 'dark' });
app.actions.setLanguage({ language: 'es' });

// Cleanup
app.destroy();
```

## MFE Plugin

The `microfrontends()` plugin provides MFE support:

### MFE Actions

```typescript
import {
  loadExtension,
  mountExtension,
  unmountExtension,
  registerExtension,
  unregisterExtension,
} from '@hai3/framework';

// Load extension code
await loadExtension({ extensionId: 'home' });

// Mount extension into domain
await mountExtension({
  extensionId: 'home',
  domainId: 'screen',
  container: document.getElementById('screen-container')!,
});

// Unmount extension from domain
await unmountExtension({ extensionId: 'home', domainId: 'screen' });

// Register/unregister extensions dynamically
registerExtension(homeExtension);
unregisterExtension({ extensionId: 'home' });
```

### MFE Selectors

```typescript
import {
  selectExtensionState,
  selectRegisteredExtensions,
  selectExtensionError,
} from '@hai3/framework';

// Get extension state
const extensionState = selectExtensionState(state, 'home');

// Get all registered extensions
const extensions = selectRegisteredExtensions(state);

// Get extension error
const error = selectExtensionError(state, 'home');
```

### Domain Constants

```typescript
import {
  HAI3_SCREEN_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_POPUP_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
  screenDomain,
  sidebarDomain,
  popupDomain,
  overlayDomain,
} from '@hai3/framework';

// String constants
HAI3_SCREEN_DOMAIN   // 'screen'
HAI3_SIDEBAR_DOMAIN  // 'sidebar'
HAI3_POPUP_DOMAIN    // 'popup'
HAI3_OVERLAY_DOMAIN  // 'overlay'

// Domain objects (ExtensionDomain)
screenDomain   // { id: 'screen', domainType: 'primary', allowedTypes: ['hai3.screen'] }
sidebarDomain  // { id: 'sidebar', domainType: 'supplementary', ... }
popupDomain    // { id: 'popup', domainType: 'overlay', ... }
overlayDomain  // { id: 'overlay', domainType: 'overlay', ... }
```

### Action and Property Constants

```typescript
import {
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
} from '@hai3/framework';

// Action IDs
HAI3_ACTION_LOAD_EXT     // 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1'
HAI3_ACTION_MOUNT_EXT    // 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1'
HAI3_ACTION_UNMOUNT_EXT  // 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1'

// Shared property IDs
HAI3_SHARED_PROPERTY_THEME    // 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1'
HAI3_SHARED_PROPERTY_LANGUAGE // 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1'
```

## Creating Custom Plugins

Extend HAI3 with custom functionality:

```typescript
import type { HAI3Plugin } from '@hai3/framework';

export function myPlugin(): HAI3Plugin {
  return {
    name: 'my-plugin',
    dependencies: ['screensets'], // Optional dependencies
    provides: {
      registries: { myRegistry: createMyRegistry() },
      slices: [mySlice],
      effects: [initMyEffects],
      actions: { myAction: myActionHandler },
    },
    onInit(app) {
      // Initialize after app is built
    },
    onDestroy(app) {
      // Cleanup when app is destroyed
    },
  };
}
```

## Key Rules

1. **Use presets for common cases** - `createHAI3App()` for full apps with MFE support
2. **Compose plugins for customization** - Use `createHAI3().use()` pattern
3. **Dependencies are auto-resolved** - Plugin order doesn't matter
4. **Access via app instance** - All registries and actions on `app.*`
5. **NO React in this package** - Framework is headless, use @hai3/react for React bindings
6. **MFE is the primary architecture** - Use `screensetsRegistry` for domain/extension management

## Re-exports

For convenience, this package re-exports from SDK packages:

- From @hai3/state: `eventBus`, `createStore`, `getStore`, `registerSlice`, `hasSlice`, `createSlice`
- From @hai3/screensets: `LayoutDomain`, `ScreensetsRegistry`, `Extension`, `ScreenExtension`, `ExtensionDomain`, `MfeHandler`, `MfeBridgeFactory`, `ParentMfeBridge`, `ChildMfeBridge`, action/property constants, contracts/types
- From @hai3/api: `apiRegistry`, `BaseApiService`, `RestProtocol`, `RestMockPlugin`, `SseMockPlugin`, `MOCK_PLUGIN`, `isMockPlugin`
- From @hai3/i18n: `i18nRegistry`, `Language`, `SUPPORTED_LANGUAGES`, `getLanguageMetadata`

**Layout Slices (owned by @hai3/framework):**
- `layoutReducer`, `layoutDomainReducers`, `LAYOUT_SLICE_NAME`
- Domain slices: `headerSlice`, `footerSlice`, `menuSlice`, `sidebarSlice`, `screenSlice`, `popupSlice`, `overlaySlice`
- Domain actions: `headerActions`, `footerActions`, `menuActions`, `sidebarActions`, `screenActions`, `popupActions`, `overlayActions`
- Individual reducer functions: `setMenuCollapsed`, `toggleSidebar`, `setActiveScreen`, etc.

**MFE Exports:**
- `MfeHandlerMF` - Concrete MFE handler for Module Federation
- `gtsPlugin` - GTS (Global Type System) plugin for type validation
- `createShadowRoot`, `injectCssVariables` - Shadow DOM utilities

**NOTE:** `createAction` is NOT exported to consumers. Actions should be handwritten functions in extensions that contain business logic and emit events via `eventBus.emit()`.

**NOTE:** "Selector" is Redux terminology and is not used in HAI3. Access state via `useAppSelector` hook from @hai3/react:
```typescript
const menu = useAppSelector((state: RootStateWithLayout) => state.layout.menu);
```

## Exports

### Core
- `createHAI3` - App builder factory
- `createHAI3App` - Convenience function (full preset)
- `presets` - Available presets (full, minimal, headless)

### Plugins
- `screensets`, `themes`, `layout`, `microfrontends`, `i18n`, `effects`, `mock`

### Registries
- `createThemeRegistry` - Theme registry factory

### Types
- `HAI3Config`, `HAI3Plugin`, `HAI3App`, `HAI3AppBuilder`
- `PluginFactory`, `PluginProvides`, `PluginLifecycle`
- `Preset`, `Presets`, `ScreensetsConfig`
- All re-exported types from SDK packages

## Migration from Legacy API

The legacy screenset navigation API has been removed. HAI3 now uses the MFE architecture exclusively:

### Removed APIs
- `screensetRegistry` (replaced by `screensetsRegistry`)
- `createScreensetRegistry()` (replaced by `ScreensetsRegistry` class)
- `navigation()` plugin (replaced by MFE actions)
- `routing()` plugin (replaced by extension route presentation)
- `routeRegistry` (replaced by extension route management)
- `navigateToScreen()` / `navigateToScreenset()` actions (replaced by `mountExtension()`)

### Migration Examples

**OLD**: Navigate to screen
```typescript
app.actions.navigateToScreen({ screensetId: 'demo', screenId: 'home' });
```

**NEW**: Mount extension
```typescript
await app.actions.mountExtension({
  extensionId: 'home',
  domainId: 'screen',
  container: document.getElementById('screen-container')!,
});
```

**OLD**: Register screenset
```typescript
import { screensetRegistry, ScreensetDefinition } from '@hai3/framework';

const screenset: ScreensetDefinition = {
  id: 'demo',
  name: 'Demo',
  category: ScreensetCategory.Production,
  defaultScreen: 'home',
  menu: [/* ... */],
};

screensetRegistry.register(screenset);
```

**NEW**: Register domain and extensions
```typescript
import { screensetsRegistry, ExtensionDomain, Extension } from '@hai3/framework';

// Register domain
app.screensetsRegistry.registerDomain(screenDomain, containerProvider);

// Register extensions
await app.screensetsRegistry.registerExtension(homeExtension);
await app.screensetsRegistry.registerExtension(profileExtension);
```

See the MFE migration guide in the project documentation for detailed migration steps.
