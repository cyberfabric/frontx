## ADDED Requirements

**Key principle**: This spec defines Flux integration only. All MFE lifecycle management (loading, mounting, bridging) is handled by `@hai3/screensets`. The framework plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Namespace convention**: All HAI3 MFE core infrastructure types use the `gts.hai3.mfes.*` namespace. Layout domain instances use `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.*` namespace.

### Requirement: Microfrontends Plugin

The system SHALL provide a `microfrontends()` plugin in `@hai3/framework` that enables MFE capabilities. Screensets is CORE to HAI3 and is automatically initialized - it is NOT a plugin. The microfrontends plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Key Principles:**
- Screensets is built-in to HAI3 - NOT a `.use()` plugin
- Microfrontends plugin enables MFE capabilities with NO static configuration
- All MFE registrations happen dynamically at runtime via actions/API

#### Scenario: Enable microfrontends in HAI3

```typescript
import { createHAI3, microfrontends } from '@hai3/framework';

// Screensets is CORE - automatically initialized by createHAI3()
// Microfrontends plugin just enables MFE capabilities - no static config
const app = createHAI3()
  .use(microfrontends())  // No configuration object - just enables MFE capabilities
  .build();

// All registration happens dynamically at runtime:
// - dispatch(registerExtension({ extension }))
// - dispatch(registerDomain({ domain }))
// - runtime.registerExtension(extension)
// - runtime.registerDomain(domain)
```

- **WHEN** building an app with microfrontends plugin
- **THEN** the plugin SHALL enable MFE capabilities
- **AND** screensets SHALL be automatically available (core to HAI3)
- **AND** the plugin SHALL NOT accept static configuration
- **AND** all MFE registration SHALL happen dynamically at runtime

### Requirement: Dynamic MFE Registration

The system SHALL support dynamic registration of MFE extensions and domains at runtime. There is NO static configuration - all registration is dynamic.

**Important**: MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](../../design/mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf).

#### Scenario: Dynamic MFE isolation principles (default handler)

HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](../../design/overview.md#runtime-isolation-default-behavior) for the complete isolation model.

- **WHEN** loading an MFE with the default handler
- **THEN** each MFE instance SHALL have its own isolated runtime
- **AND** only stateless utilities (lodash, date-fns) MAY be shared for bundle optimization

### Requirement: MFE Actions

The system SHALL provide MFE actions that emit events only, following HAI3 Flux pattern (no async, return void).

#### Scenario: Load MFE bundle action

```typescript
import { mfeActions } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Action emits event, returns void - loads JS bundle only
mfeActions.loadExtension(ANALYTICS_EXTENSION_ID);
// Emits: 'mfe/loadRequested' with { extensionId }
```

- **WHEN** calling `loadExtension` action
- **THEN** it SHALL emit `'mfe/loadRequested'` event with `extensionId`
- **AND** it SHALL return `void` (no Promise)
- **AND** it SHALL NOT perform any async operations
- **AND** the effect SHALL call `runtime.loadExtension()` to fetch the JS bundle

#### Scenario: Preload MFE bundle action

```typescript
import { mfeActions } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Action emits event for preloading - fetch bundle before user navigates
mfeActions.preloadExtension(ANALYTICS_EXTENSION_ID);
// Emits: 'mfe/preloadRequested' with { extensionId }
```

- **WHEN** calling `preloadExtension` action
- **THEN** it SHALL emit `'mfe/preloadRequested'` event with `extensionId`
- **AND** it SHALL return `void` (no Promise)
- **AND** the effect SHALL call `runtime.preloadExtension()` to fetch the JS bundle
- **AND** this is semantically for preloading (e.g., on hover)

#### Scenario: Mount MFE action

```typescript
import { mfeActions } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Action emits event, returns void - mounts to DOM (auto-loads if needed)
mfeActions.mountExtension(ANALYTICS_EXTENSION_ID);
// Emits: 'mfe/mountRequested' with { extensionId }
```

- **WHEN** calling `mountExtension` action
- **THEN** it SHALL emit `'mfe/mountRequested'` event with `extensionId`
- **AND** it SHALL return `void` (no Promise)
- **AND** it SHALL NOT perform any async operations
- **AND** the effect SHALL call `runtime.mountExtension()` (which auto-loads if needed)

#### Scenario: Handle MFE child action

```typescript
// Called by ScreensetsRegistry when MFE (child) sends an action chain to parent
// actionTypeId references gts.hai3.mfes.comm.action.v1~
mfeActions.handleMfeChildAction(extensionId, actionTypeId, payload);
// Emits: 'mfe/childActionRequested' with { extensionId, actionTypeId, payload }
```

- **WHEN** the child bridge forwards an action chain to the parent via internal bridge wiring
- **THEN** it SHALL call `handleMfeChildAction` action
- **AND** the action SHALL emit `'mfe/childActionRequested'` event
- **AND** effects SHALL handle the event and call ScreensetsRegistry methods

### Requirement: MFE Effects

The system SHALL provide MFE effects that subscribe to events, call ScreensetsRegistry methods, and dispatch to slices.

#### Scenario: Load effect handles loadRequested event

```typescript
import { ScreensetsRegistry } from '@hai3/screensets';

// Effect subscribes to event, calls runtime, dispatches to slice
// extensionId is Extension type: gts.hai3.mfes.ext.extension.v1~...
// Note: eventBus is the framework (L2) event bus, not the removed screensets EventEmitter.
eventBus.on('mfe/loadRequested', async ({ extensionId }) => {
  dispatch(mfeSlice.actions.setLoading({ extensionId }));
  try {
    await runtime.loadExtension(extensionId);
    dispatch(mfeSlice.actions.setBundleLoaded({ extensionId }));
  } catch (error) {
    dispatch(mfeSlice.actions.setError({ extensionId, error: error.message }));
  }
});
```

- **WHEN** `'mfe/loadRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setLoading` to mfeSlice
- **AND** the effect SHALL call `runtime.loadExtension()` to fetch the JS bundle
- **AND** on success, the effect SHALL dispatch `setBundleLoaded`
- **AND** on failure, the effect SHALL dispatch `setError`
- **AND** the bundle is loaded but NOT mounted to DOM

#### Scenario: Preload effect handles preloadRequested event

```typescript
// Effect for preloading - similar to load but fires in background
eventBus.on('mfe/preloadRequested', async ({ extensionId }) => {
  try {
    await runtime.preloadExtension(extensionId);
    dispatch(mfeSlice.actions.setBundleLoaded({ extensionId }));
  } catch (error) {
    // Preload failures are logged but don't block UI
    console.warn(`Failed to preload ${extensionId}:`, error);
  }
});
```

- **WHEN** `'mfe/preloadRequested'` event is emitted
- **THEN** the effect SHALL call `runtime.preloadExtension()` to fetch the JS bundle
- **AND** on success, the effect SHALL dispatch `setBundleLoaded`
- **AND** on failure, the effect SHALL log a warning (non-blocking)
- **AND** preload SHALL NOT show loading UI to user

#### Scenario: Mount effect handles mountRequested event

```typescript
import { ScreensetsRegistry } from '@hai3/screensets';

// Effect subscribes to event, calls runtime, dispatches to slice
// extensionId is Extension type: gts.hai3.mfes.ext.extension.v1~...
eventBus.on('mfe/mountRequested', async ({ extensionId }) => {
  dispatch(mfeSlice.actions.setMounting({ extensionId }));
  try {
    await runtime.mountExtension(extensionId, container);
    dispatch(mfeSlice.actions.setMounted({ extensionId }));
  } catch (error) {
    dispatch(mfeSlice.actions.setError({ extensionId, error: error.message }));
  }
});
```

- **WHEN** `'mfe/mountRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setMounting` to mfeSlice
- **AND** the effect SHALL call `runtime.mountExtension()` (which auto-loads if needed)
- **AND** on success, the effect SHALL dispatch `setMounted`
- **AND** on failure, the effect SHALL dispatch `setError`
- **AND** the effect SHALL NOT call any actions (prevents loops)

#### Scenario: Child action effect handles extension load request

```typescript
import { HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';

// actionTypeId conforms to gts.hai3.mfes.comm.action.v1~
eventBus.on('mfe/childActionRequested', async ({ extensionId, actionTypeId, payload }) => {
  if (runtime.typeSystem.isTypeOf(actionTypeId, HAI3_ACTION_LOAD_EXT)) {
    const { domainTypeId, targetExtensionId, ...params } = payload as LoadExtPayload;
    // Domain handles the load according to its layout behavior (popup shows modal, sidebar shows panel, etc.)
    runtime.mountExtension(targetExtensionId, params.container);
    dispatch(layoutSlice.actions.extensionLoaded({ domainTypeId, extensionId: targetExtensionId }));
  }
});
```

- **WHEN** `'mfe/childActionRequested'` event with `load_ext` action is received
- **THEN** the effect SHALL call `runtime.mountExtension()` with the target extension
- **AND** the domain SHALL handle the extension according to its specific layout behavior
- **AND** the effect SHALL dispatch to `layoutSlice`

### Requirement: MFE Load State Tracking

The system SHALL track MFE load and mount states via a store slice using extension IDs.

#### Scenario: Query MFE load state

```typescript
import { selectMfeLoadState, selectMfeMountState, selectMfeError } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Load state tracks bundle loading
const loadState = useAppSelector((state) =>
  selectMfeLoadState(state, ANALYTICS_EXTENSION_ID)
);
// 'idle' | 'loading' | 'loaded' | 'error'

// Mount state tracks DOM mounting
const mountState = useAppSelector((state) =>
  selectMfeMountState(state, ANALYTICS_EXTENSION_ID)
);
// 'unmounted' | 'mounting' | 'mounted' | 'error'

const error = useAppSelector((state) =>
  selectMfeError(state, ANALYTICS_EXTENSION_ID)
);
```

- **WHEN** querying MFE load state
- **THEN** `selectMfeLoadState()` SHALL accept an extension GTS type ID
- **AND** load states SHALL be: 'idle', 'loading', 'loaded', 'error'
- **AND** `selectMfeMountState()` SHALL return mount states: 'unmounted', 'mounting', 'mounted', 'error'
- **AND** `selectMfeError()` SHALL return the error if either state is 'error'

#### Scenario: Load vs mount state distinction

- **WHEN** tracking MFE lifecycle
- **THEN** load state SHALL track JavaScript bundle loading
- **AND** mount state SHALL track DOM rendering
- **AND** an extension CAN be 'loaded' but 'unmounted' (preloaded scenario)
- **AND** an extension CANNOT be 'mounted' without being 'loaded' first

### Requirement: MFE Container Component

The system SHALL provide an `MfeContainer` React component that handles MFE mounting using the `MfeEntryLifecycle` interface. The component uses shadow DOM utilities from `@hai3/screensets` for style isolation.

#### Scenario: Render MFE in Shadow DOM

```tsx
import { MfeContainer } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// MfeContainer handles mounting via ScreensetsRegistry.mountExtension() and Shadow DOM isolation
<MfeContainer
  extensionId={ANALYTICS_EXTENSION}
  cssVariables={themeVariables}
/>
```

- **WHEN** rendering an MFE via `MfeContainer`
- **THEN** the component SHALL call `runtime.mountExtension(extensionId, container)` (loading is handled internally)
- **AND** it SHALL create a shadow root using `createShadowRoot()` from `@hai3/screensets`
- **AND** it SHALL inject CSS variables using `injectCssVariables()` from `@hai3/screensets`
- **AND** internally, the runtime calls `lifecycle.mount(shadowRoot, bridge)` on the loaded MfeEntryLifecycle
- **AND** it SHALL NOT assume the MFE is a React component

#### Scenario: MfeContainer unmount cleanup

- **WHEN** the `MfeContainer` component is unmounted
- **THEN** it SHALL call `runtime.unmountExtension(extensionId)` (cleanup is handled internally)
- **AND** internally, the runtime calls `lifecycle.unmount(shadowRoot)` on the MfeEntryLifecycle
- **AND** the MFE SHALL clean up its framework-specific resources
- **AND** the shadow root content SHALL be cleared

#### Scenario: CSS variable passthrough

```typescript
const themeVariables = {
  '--hai3-color-primary': '#3b82f6',
  '--hai3-color-background': '#ffffff',
  '--hai3-spacing-unit': '4px',
};
```

- **WHEN** CSS variables are passed to ShadowDomContainer
- **THEN** the component SHALL call `injectCssVariables(shadowRoot, themeVariables)`
- **AND** MFE components SHALL use the variables for consistent theming

### Requirement: Navigation Integration

The system SHALL integrate MFE loading with the navigation plugin using actions/effects pattern. Navigation is handled by mounting extensions on screen domains - no separate `navigateToExtension` action is needed.

**Key Principle**: The domain type determines mount behavior:
- **Screen domain**: mount = navigate (replace current screen)
- **Popup domain**: mount = open popup, unmount = close popup
- **Sidebar domain**: mount = show sidebar, unmount = hide sidebar
- **Overlay domain**: mount = show overlay, unmount = hide overlay

#### Scenario: Navigate to MFE screenset via screen domain

```typescript
import { mfeActions } from '@hai3/framework';
import { HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';
import { HAI3_SCREEN_DOMAIN } from '@hai3/framework';

// Navigate by mounting the extension on the screen domain
// Screen domain interprets mount as "navigate to this screen"
mfeActions.mountExtension(
  'gts.hai3.mfes.ext.extension.v1~acme.analytics.screens.dashboard.v1',
);
// Note: Instance IDs do NOT end with ~ (only schema/type IDs do)
// Effect handles: calls runtime.mountExtension() on the screen domain
// Screen domain replaces current screen with the extension
```

- **WHEN** mounting an extension on a screen domain
- **THEN** the effect SHALL call `runtime.mountExtension()`
- **AND** the screen domain SHALL replace the current screen with the extension
- **AND** on error, the effect SHALL dispatch error to slice

#### Scenario: Navigate away from MFE

```typescript
app.actions.navigateToScreenset({ screensetId: 'local-screenset' });
// Effect unmounts previous MFE via runtime
// Runtime cleans up bridge subscriptions
```

- **WHEN** navigating away from an MFE screenset
- **THEN** the effect SHALL unmount the previous MFE via runtime
- **AND** the runtime SHALL clean up all bridge subscriptions

### Requirement: MFE Extension Loading (DRY Principle)

The system SHALL support loading MFE extensions into any domain using generic `load_ext` and `unload_ext` actions. Each domain (popup, sidebar, screen, overlay) handles these actions according to its specific layout behavior. This follows the DRY principle - no need for domain-specific action types.

#### Scenario: MFE requests extension load into popup domain

```typescript
import { HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';
import { HAI3_POPUP_DOMAIN } from '@hai3/framework';

// Inside MFE component - bridge executes action chain via registry pass-through
// HAI3_ACTION_LOAD_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_POPUP_DOMAIN,  // Target domain handles layout behavior
    payload: {
      extensionTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.popups.export.v1',
      props: { format: 'pdf' },
    },
  },
});

// Flow:
// 1. bridge.executeActionsChain() delegates to registry.executeActionsChain() via injected callback
// 2. Registry validates action chain against GTS schema
// 3. ActionsChainsMediator routes chain to target domain
// 4. Effect handles event, calls runtime.loadExtension() with domain and extension
// 5. Popup domain handles by showing modal with the extension
```

- **WHEN** an MFE requests load_ext with popup domain
- **THEN** the bridge (from @hai3/screensets) SHALL validate the action chain
- **AND** the bridge SHALL delegate to `registry.executeActionsChain()` via the injected callback (the bridge is a pass-through, not a router)
- **AND** the effect SHALL call `runtime.loadExtension()` with domain and extension
- **AND** the popup domain SHALL render the extension as a modal

#### Scenario: MFE requests extension unload from popup domain

```typescript
import { HAI3_ACTION_UNLOAD_EXT } from '@hai3/screensets';
import { HAI3_POPUP_DOMAIN } from '@hai3/framework';

// Inside MFE popup
// HAI3_ACTION_UNLOAD_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_UNLOAD_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.popups.export.v1',
    },
  },
});
```

- **WHEN** an MFE requests unload_ext from popup domain
- **THEN** the parent SHALL unmount the extension from the popup domain
- **AND** the extension's bridge SHALL be destroyed

#### Scenario: MFE requests extension load into sidebar domain

```typescript
import { HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';
import { HAI3_SIDEBAR_DOMAIN } from '@hai3/framework';

// HAI3_ACTION_LOAD_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_SIDEBAR_DOMAIN,  // Target domain handles layout behavior
    payload: {
      extensionTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.sidebars.quick_stats.v1',
    },
  },
});
```

- **WHEN** an MFE requests load_ext with sidebar domain
- **THEN** the parent SHALL validate the action chain against the action schema
- **AND** the effect SHALL call `runtime.loadExtension()` with domain and extension
- **AND** the sidebar domain SHALL render the extension as a side panel
- **AND** the extension SHALL render in Shadow DOM

#### Scenario: Domain-agnostic extension lifecycle

- **WHEN** using `HAI3_ACTION_LOAD_EXT` or `HAI3_ACTION_UNLOAD_EXT`
- **THEN** the same action type SHALL work for ANY extension domain (popup, sidebar, screen, overlay, custom)
- **AND** the domain SHALL interpret the action according to its layout semantics
- **AND** no domain-specific action constants SHALL be needed

#### Scenario: Domain-specific action support validation

- **WHEN** an MFE requests an action on a domain
- **THEN** the effect SHALL validate the domain supports the requested action
- **AND** if the domain does NOT support the action, the request SHALL fail
- **AND** `UnsupportedDomainActionError` SHALL be thrown with clear error message

#### Scenario: Screen domain only supports load_ext

```typescript
import { HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT } from '@hai3/screensets';
import { HAI3_SCREEN_DOMAIN } from '@hai3/framework';

// This works - screen domain supports load_ext (navigate to screen)
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_SCREEN_DOMAIN,
    payload: {
      extensionTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.screens.analytics.v1',
    },
  },
});

// This will FAIL - screen domain does NOT support unload_ext
// You cannot have "no screen selected"
try {
  await bridge.executeActionsChain({
    action: {
      type: HAI3_ACTION_UNLOAD_EXT,
      target: HAI3_SCREEN_DOMAIN,
      payload: {
        extensionTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.screens.analytics.v1',
      },
    },
  });
} catch (error) {
  // UnsupportedDomainActionError: Domain does not support action 'unload_ext'
}
```

- **WHEN** an MFE requests `unload_ext` on the screen domain
- **THEN** the request SHALL fail with `UnsupportedDomainActionError`
- **AND** the error SHALL indicate the screen domain does not support unload
- **AND** the screen SHALL remain displayed (no navigation away to "nothing")

#### Scenario: Popup, sidebar, overlay domains support both load and unload

- **WHEN** an MFE requests `load_ext` on popup, sidebar, or overlay domain
- **THEN** the request SHALL succeed (all these domains support load)
- **WHEN** an MFE requests `unload_ext` on popup, sidebar, or overlay domain
- **THEN** the request SHALL succeed (all these domains support unload)
- **AND** the extension SHALL be hidden/closed appropriately for the domain

### Requirement: Error Boundary for MFEs

The system SHALL provide error boundaries for MFE load and render failures with GTS type IDs.

#### Scenario: MFE load error display

```typescript
// Default error boundary shows:
// - Error message
// - Retry button
// - MFE GTS entry type ID

// MfeEntryMF type ID - derived from gts.hai3.mfes.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1';

<MfeErrorBoundary
  entryTypeId={MFE_ANALYTICS_ENTRY}
  error={loadError}
  onRetry={() => loader.load(config)}
/>
```

- **WHEN** an MFE fails to load or render
- **THEN** an error boundary SHALL be displayed
- **AND** the error message SHALL be shown
- **AND** the GTS entry type ID SHALL be displayed
- **AND** a retry button SHALL be available
- **AND** custom error boundaries SHALL be configurable via plugin

#### Scenario: Custom error boundary

```typescript
import { MfeContainer } from '@hai3/framework';

// Custom error boundary is passed as a prop to MfeContainer
// NOT as static plugin configuration
<MfeContainer
  extensionId={MFE_ANALYTICS_ENTRY}
  errorBoundary={({ error, entryTypeId, retry }) => (
    <CustomError error={error} entryTypeId={entryTypeId} onRetry={retry} />
  )}
/>
```

- **WHEN** a custom error boundary is needed
- **THEN** it SHALL be passed as a prop to MfeContainer
- **AND** it SHALL receive `error`, `entryTypeId` (GTS), and `retry` props
- **AND** it SHALL replace the default error boundary for that container

### Requirement: Loading Indicator for MFEs

The system SHALL provide loading indicators while MFEs are being fetched.

#### Scenario: Default loading indicator

```typescript
import { MfeContainer } from '@hai3/framework';

// MfeEntryMF type ID - derived from gts.hai3.mfes.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1';

// Loading component is passed as a prop to MfeContainer
// NOT as static plugin configuration
<MfeContainer
  extensionId={MFE_ANALYTICS_ENTRY}
  loadingComponent={({ entryTypeId }) => <MfeSkeleton entryTypeId={entryTypeId} />}
/>
```

- **WHEN** an MFE is loading
- **THEN** a loading indicator SHALL be displayed
- **AND** custom loading components SHALL be passed as props to MfeContainer
- **AND** the loading component SHALL receive `entryTypeId` (GTS MfeEntryMF) prop

### Requirement: MFE Preloading

The system SHALL support preloading MFE bundles before navigation using extension IDs. Preloading loads the JS bundle without mounting to DOM.

#### Scenario: Preload on menu hover

```typescript
import { mfeActions } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Preload is triggered via action, not static configuration
// On click, mount the extension on its screen domain (which navigates to it)
<MenuItem
  onMouseEnter={() => mfeActions.preloadExtension(ANALYTICS_EXTENSION_ID)}
  onClick={() => mfeActions.mountExtension(ANALYTICS_EXTENSION_ID)}
>
  Analytics
</MenuItem>
```

- **WHEN** preloading an MFE
- **THEN** the preload action SHALL call `runtime.preloadExtension()` to fetch the JS bundle
- **AND** the bundle SHALL be cached for instant mounting
- **AND** preload SHALL NOT mount the MFE to DOM
- **AND** subsequent mount calls SHALL be instant (bundle already loaded)

#### Scenario: Immediate preload on app initialization

```typescript
import { mfeActions } from '@hai3/framework';

// Preload can be triggered immediately after app initialization
// via an effect that listens to app ready event
// NOT via static plugin configuration

// In an effect or app initialization hook:
eventBus.on('app/ready', () => {
  // Preload frequently used extensions dynamically
  mfeActions.preloadExtension('gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1');
  mfeActions.preloadExtension('gts.hai3.mfes.ext.extension.v1~acme.billing.overview.v1');
});
// Analytics and billing bundles fetched after app startup
```

- **WHEN** preloading MFEs on app startup
- **THEN** the preload action SHALL be triggered dynamically (e.g., in an effect)
- **AND** the MFE bundles SHALL be fetched in the background
- **AND** mounting to those MFEs SHALL be instant (bundles already loaded)

#### Scenario: Load vs preload distinction

Loading fetches the bundle; mounting renders to DOM. See [Load vs Mount](../../design/registry-runtime.md#load-vs-mount) for details.

- **WHEN** using loadExtension vs preloadExtension
- **THEN** both SHALL fetch and cache the JS bundle
- **AND** loadExtension SHALL show loading UI (via slice state)
- **AND** preloadExtension SHALL NOT show loading UI (silent background fetch)

### Requirement: ScreensetsRegistry Query Methods

The system SHALL provide query methods on ScreensetsRegistry for querying registered extensions and domains by GTS type ID.

#### Scenario: Query registered extensions and domains

```typescript
// Query extension by type ID (extension uses derived type with domain-specific fields)
// Note: Instance IDs do NOT end with ~ (only schema/type IDs do)
const ANALYTICS_EXTENSION = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.ext.screen_extension.v1~acme.analytics.dashboard.v1';
const extension = runtime.getExtension(ANALYTICS_EXTENSION);
console.log(extension?.domain);     // Domain type ID
console.log(extension?.entry);      // Entry type ID (MfeEntryMF)
console.log(extension?.title);      // Domain-specific field from derived Extension type

// Query domain by type ID
const SCREEN_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1';
const domain = runtime.getDomain(SCREEN_DOMAIN);
console.log(domain?.sharedProperties);  // List of shared property type IDs

// Query all extensions for a domain
const extensions = runtime.getExtensionsForDomain(SCREEN_DOMAIN);
console.log(extensions.length);  // Number of extensions registered for this domain

// Parse vendor info from GTS type via plugin
const parsed = runtime.typeSystem.parseTypeId(ANALYTICS_EXTENSION);
console.log(parsed.vendor); // 'acme' (extension vendor)
```

- **WHEN** querying the ScreensetsRegistry
- **THEN** `getExtension(extensionId)` SHALL return the registered extension or undefined
- **AND** `getDomain(domainId)` SHALL return the registered domain or undefined
- **AND** `getExtensionsForDomain(domainId)` SHALL return all extensions for that domain
- **AND** `plugin.parseTypeId()` SHALL extract vendor and other metadata (no standalone `parseGtsId()` utility)

**Note**: MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](../../design/mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf).

### Requirement: MFE Version Validation

The system SHALL validate shared dependency versions between host and MFE.

#### Scenario: Version mismatch warning

```typescript
// If host uses React 18.3.0 and MFE built with React 18.2.0:
// Warning logged: "MFE entry 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' was built with react@18.2.0, host has 18.3.0"
```

- **WHEN** an MFE is loaded with different shared dependency versions
- **THEN** a warning SHALL be logged in development
- **AND** the warning SHALL include the GTS entry type ID
- **AND** the MFE SHALL still load (minor version differences tolerated)

#### Scenario: Major version mismatch error

```typescript
import { MfeVersionMismatchError } from '@hai3/screensets';

// If host uses React 18.x and MFE built with React 17.x:
// The handler validates shared dependency versions when loading the MFE bundle
try {
  // Load extension - MfeHandlerMF resolves manifest internally from MfeEntryMF
  await runtime.loadExtension(extensionId);
} catch (error) {
  if (error instanceof MfeVersionMismatchError) {
    console.log(`MFE entry ${error.manifestTypeId} has incompatible deps`);
  }
}
```

- **WHEN** an MFE has incompatible major version of shared deps
- **THEN** `MfeVersionMismatchError` SHALL be thrown with `manifestTypeId`
- **AND** the MFE SHALL NOT be mounted
- **AND** error boundary SHALL display version conflict message

### Requirement: GTS Type Conformance Validation

The system SHALL validate that MFE type IDs conform to HAI3 base types.

#### Scenario: Validate MfManifest type on load

```typescript
import { HAI3_MF_MANIFEST } from '@hai3/screensets';

// When loading an MFE manifest
const manifestTypeId = 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.mfe.manifest.v1';

// HAI3_MF_MANIFEST is: gts.hai3.mfes.mfe.mf_manifest.v1~
if (!runtime.typeSystem.isTypeOf(manifestTypeId, HAI3_MF_MANIFEST)) {
  throw new MfeTypeConformanceError(manifestTypeId, HAI3_MF_MANIFEST);
}
```

- **WHEN** loading an MFE manifest
- **THEN** the loader SHALL validate that `manifestTypeId` conforms to `gts.hai3.mfes.mfe.mf_manifest.v1~` via `plugin.isTypeOf()`
- **AND** if validation fails, `MfeTypeConformanceError` SHALL be thrown

#### Scenario: Validate MfeEntry type on mount

```typescript
import { HAI3_MFE_ENTRY, HAI3_MFE_ENTRY_MF } from '@hai3/screensets';

// MfeEntryMF (Module Federation derived) type ID
const entryTypeId = 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1';

// HAI3_MFE_ENTRY is: gts.hai3.mfes.mfe.entry.v1~ (base)
// HAI3_MFE_ENTRY_MF is: gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~ (derived)
if (!runtime.typeSystem.isTypeOf(entryTypeId, HAI3_MFE_ENTRY)) {
  throw new MfeTypeConformanceError(entryTypeId, HAI3_MFE_ENTRY);
}
```

- **WHEN** mounting an entry
- **THEN** the entry type SHALL be validated against the expected base type via `plugin.isTypeOf()`
- **AND** all MFE entries SHALL conform to `gts.hai3.mfes.mfe.entry.v1~` (base)
- **AND** Module Federation entries SHALL also conform to `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~` (derived)

### Requirement: Dynamic Registration Support in Framework

The framework SHALL support dynamic registration of extensions and MFEs at any time during runtime, not just at initialization. This integrates with the ScreensetsRegistry dynamic API.

#### Scenario: Register extension via action

```typescript
import { mfeActions } from '@hai3/framework';
import { type Extension } from '@hai3/screensets';

// Extension can be registered at any time - NOT just initialization
// Extension uses derived type that includes domain-specific fields
mfeActions.registerExtension({
  id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics_widget.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields from derived Extension type (no uiMeta wrapper)
  title: 'Analytics',
  size: 'medium',
});
// Emits: 'mfe/registerExtensionRequested' with { extension }
// Effect calls: runtime.registerExtension(extension)
```

- **WHEN** calling `mfeActions.registerExtension(extension)`
- **THEN** it SHALL emit `'mfe/registerExtensionRequested'` event
- **AND** the effect SHALL call `runtime.registerExtension()`
- **AND** it SHALL dispatch `setExtensionRegistered` to slice on success
- **AND** it SHALL dispatch `setExtensionError` on failure

#### Scenario: Unregister extension via action

```typescript
import { mfeActions } from '@hai3/framework';

// Unregister at any time - also unmounts if currently mounted
mfeActions.unregisterExtension('gts.hai3.mfes.ext.extension.v1~acme.user.widgets.analytics_widget.v1');
// Emits: 'mfe/unregisterExtensionRequested' with { extensionId }
// Effect calls: runtime.unregisterExtension(extensionId)
```

- **WHEN** calling `mfeActions.unregisterExtension(extensionId)`
- **THEN** it SHALL emit `'mfe/unregisterExtensionRequested'` event
- **AND** the effect SHALL call `runtime.unregisterExtension()`
- **AND** if MFE is mounted, it SHALL be unmounted first

#### Scenario: Track extension registration state in slice

```typescript
import { selectExtensionState, selectRegisteredExtensions } from '@hai3/framework';

const extensionId = 'gts.hai3.mfes.ext.extension.v1~acme.user.widgets.analytics_widget.v1';

// Query registration state
const state = useAppSelector((s) => selectExtensionState(s, extensionId));
// 'unregistered' | 'registering' | 'registered' | 'error'

// Get all registered extensions
const registeredExtensions = useAppSelector(selectRegisteredExtensions);
// string[]
```

- **WHEN** querying extension registration state
- **THEN** `selectExtensionState()` SHALL return registration status
- **AND** `selectRegisteredExtensions()` SHALL return list of registered extension IDs

#### Scenario: Register extensions from backend (application responsibility)

```typescript
import { mfeActions } from '@hai3/framework';

// App is created WITHOUT static configuration
const app = createHAI3()
  .use(microfrontends())  // No configuration - just enables MFE capabilities
  .build();

// Entity fetching is OUTSIDE MFE system scope - application handles this
eventBus.on('auth/loginSuccess', async ({ token }) => {
  // Application code fetches entities from backend
  const response = await fetch('/api/extensions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { domains, extensions } = await response.json();

  // MFE system only handles registration of already-fetched entities
  for (const domain of domains) {
    mfeActions.registerDomain(domain);
  }
  for (const extension of extensions) {
    mfeActions.registerExtension(extension);
  }
});
```

- **WHEN** entities need to be loaded from backend
- **THEN** application code SHALL fetch entities (outside MFE system scope)
- **AND** application code SHALL call `registerDomain()` / `registerExtension()` for each entity
- **AND** the MFE system SHALL NOT provide fetch/refresh methods

#### Scenario: Observe domain extensions via store slice

```typescript
import { useDomainExtensions } from '@hai3/react';

function WidgetSlot() {
  // Re-render when extensions are registered/unregistered for this domain
  const extensions = useDomainExtensions('gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1');

  return (
    <div>
      {extensions.map(ext => (
        <MfeContainer key={ext.id} extensionId={ext.id} />
      ))}
    </div>
  );
}
```

- **WHEN** using `useDomainExtensions(domainId)` hook
- **THEN** it SHALL subscribe to store changes to detect registration state updates
- **AND** it SHALL call `runtime.getExtensionsForDomain(domainId)` to resolve the current extension list
- **AND** it SHALL trigger re-render when the extension list for the domain changes
- **AND** it SHALL return the current list of extensions for the domain
