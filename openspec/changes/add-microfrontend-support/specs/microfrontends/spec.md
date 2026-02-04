## ADDED Requirements

**Key principle**: This spec defines Flux integration only. All MFE lifecycle management (loading, mounting, bridging) is handled by `@hai3/screensets`. The framework plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Namespace convention**: All HAI3 MFE types use the `gts.hai3.screensets.*` namespace for consistency with the screensets package. The type hierarchy follows the pattern established in screensets/spec.md.

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

The system SHALL support dynamic registration of MFE manifests, extensions, and domains at runtime. There is NO static configuration - all registration is dynamic.

#### Scenario: Register MFE manifest at runtime

```typescript
import { mfeActions } from '@hai3/framework';
import { type MfManifest, type GtsTypeId } from '@hai3/screensets';

// Register manifest dynamically at runtime (e.g., after loading from backend)
const manifest: MfManifest = {
  id: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics.mfe.manifest.v1' as GtsTypeId,
  remoteEntry: 'https://mfe.example.com/analytics/remoteEntry.js',
  remoteName: 'acme_analytics',
};

mfeActions.registerManifest(manifest);
// Emits: 'mfe/registerManifestRequested' with { manifest }
// Effect calls: runtime.registerManifest(manifest)
```

- **WHEN** registering an MFE manifest
- **THEN** it SHALL be registered dynamically at runtime
- **AND** it SHALL NOT be configured statically at plugin initialization
- **AND** the runtime SHALL validate the manifest against GTS schema

#### Scenario: Dynamic MFE isolation principles (default handler)

```typescript
// MFE isolation is enforced by the default handler (MfeHandlerMF)
// With the default handler, each MFE instance gets:
// - Its own @hai3/screensets instance (NOT shared)
// - Its own TypeSystemPlugin instance (NOT shared)
// - Its own state container (NOT shared)
// - Framework agnostic - can use any UI framework

// Stateless utilities (lodash, date-fns) MAY be shared for bundle optimization
// This is handled by Module Federation sharedDependencies in MfManifest
// Custom handlers for internal MFEs may implement different isolation strategies
```

- **WHEN** loading an MFE with the default handler
- **THEN** `@hai3/screensets` SHALL NOT be shared as singleton (each MFE instance gets its own isolated runtime instance)
- **AND** `@globaltypesystem/gts-ts` SHALL NOT be shared (isolated TypeSystemPlugin)
- **AND** React/ReactDOM SHALL NOT be shared (MFEs are framework-agnostic)
- **AND** no singletons SHALL be used by design
- **AND** only stateless utilities (lodash, date-fns) MAY be shared for bundle optimization
- **AND** custom handlers MAY configure different sharing strategies for internal MFEs

### Requirement: MFE Actions

The system SHALL provide MFE actions that emit events only, following HAI3 Flux pattern (no async, return void).

#### Scenario: Load MFE action

```typescript
import { mfeActions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

// Action emits event, returns void
mfeActions.mountExtension(ANALYTICS_EXTENSION_ID);
// Emits: 'mfe/mountRequested' with { extensionId }
```

- **WHEN** calling `mountExtension` action
- **THEN** it SHALL emit `'mfe/mountRequested'` event with `extensionId`
- **AND** it SHALL return `void` (no Promise)
- **AND** it SHALL NOT perform any async operations

#### Scenario: Handle MFE host action

```typescript
// Called by ScreensetsRegistry when MFE requests host action
// actionTypeId references gts.hai3.screensets.ext.action.v1~
mfeActions.handleMfeHostAction(extensionId, actionTypeId, payload);
// Emits: 'mfe/hostActionRequested' with { extensionId, actionTypeId, payload }
```

- **WHEN** the ScreensetsRegistry's `onHostAction` callback is invoked
- **THEN** it SHALL call `handleMfeHostAction` action
- **AND** the action SHALL emit `'mfe/hostActionRequested'` event
- **AND** effects SHALL handle the event and call ScreensetsRegistry methods

### Requirement: MFE Effects

The system SHALL provide MFE effects that subscribe to events, call ScreensetsRegistry methods, and dispatch to slices.

#### Scenario: Mount effect handles mountRequested event

```typescript
import { ScreensetsRegistry } from '@hai3/screensets';

// Effect subscribes to event, calls runtime, dispatches to slice
// extensionId is Extension type: gts.hai3.screensets.ext.extension.v1~...
eventBus.on('mfe/mountRequested', async ({ extensionId }) => {
  dispatch(mfeSlice.actions.setLoading({ extensionId }));
  try {
    await runtime.mountExtension(extensionId, container);
    dispatch(mfeSlice.actions.setLoaded({ extensionId }));
  } catch (error) {
    dispatch(mfeSlice.actions.setError({ extensionId, error: error.message }));
  }
});
```

- **WHEN** `'mfe/mountRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setLoading` to mfeSlice
- **AND** the effect SHALL call `runtime.mountExtension()`
- **AND** on success, the effect SHALL dispatch `setLoaded`
- **AND** on failure, the effect SHALL dispatch `setError`
- **AND** the effect SHALL NOT call any actions (prevents loops)

#### Scenario: Host action effect handles extension load request

```typescript
import { conformsTo, HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';

// actionTypeId conforms to gts.hai3.screensets.ext.action.v1~
eventBus.on('mfe/hostActionRequested', async ({ extensionId, actionTypeId, payload }) => {
  if (conformsTo(actionTypeId, HAI3_ACTION_LOAD_EXT)) {
    const { domainTypeId, targetExtensionId, ...params } = payload as LoadExtPayload;
    // Domain handles the load according to its layout behavior (popup shows modal, sidebar shows panel, etc.)
    runtime.mountExtension(targetExtensionId, params.container);
    dispatch(layoutSlice.actions.extensionLoaded({ domainTypeId, extensionId: targetExtensionId }));
  }
});
```

- **WHEN** `'mfe/hostActionRequested'` event with `load_ext` action is received
- **THEN** the effect SHALL call `runtime.mountExtension()` with the target extension
- **AND** the domain SHALL handle the extension according to its specific layout behavior
- **AND** the effect SHALL dispatch to `layoutSlice`

### Requirement: MFE Load State Tracking

The system SHALL track MFE load states via a Redux slice using GTS type IDs.

#### Scenario: Query MFE load state

```typescript
import { selectMfeLoadState, selectMfeError } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

const loadState = useAppSelector((state) =>
  selectMfeLoadState(state, MFE_ANALYTICS_ENTRY)
);
// 'idle' | 'loading' | 'loaded' | 'error'

const error = useAppSelector((state) =>
  selectMfeError(state, MFE_ANALYTICS_ENTRY)
);
```

- **WHEN** querying MFE load state
- **THEN** `selectMfeLoadState()` SHALL accept an MfeEntryMF GTS type ID
- **AND** valid states SHALL be: 'idle', 'loading', 'loaded', 'error'
- **AND** `selectMfeError()` SHALL return the error if state is 'error'

### Requirement: MFE Container Component

The system SHALL provide an `MfeContainer` React component that handles MFE mounting using the `MfeEntryLifecycle` interface. The component uses shadow DOM utilities from `@hai3/screensets` for style isolation.

#### Scenario: Render MFE in Shadow DOM

```tsx
import { MfeContainer } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// Extension type ID (references the MFE entry)
const ANALYTICS_EXTENSION = 'gts.hai3.screensets.ext.extension.v1~acme.analytics.dashboard.v1' as GtsTypeId;

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
import { HAI3_ACTION_LOAD_EXT, HAI3_SCREEN_DOMAIN, type GtsTypeId } from '@hai3/screensets';

// Navigate by mounting the extension on the screen domain
// Screen domain interprets mount as "navigate to this screen"
mfeActions.mountExtension({
  extensionId: 'gts.hai3.screensets.ext.extension.v1~acme.analytics.screens.dashboard.v1' as GtsTypeId,
});
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
import { HAI3_ACTION_LOAD_EXT, HAI3_POPUP_DOMAIN } from '@hai3/screensets';

// Inside MFE component - bridge validates and calls onHostAction callback
// HAI3_ACTION_LOAD_EXT is: gts.hai3.screensets.ext.action.v1~hai3.screensets.actions.load_ext.v1~
await bridge.requestHostAction(HAI3_ACTION_LOAD_EXT, {
  domainTypeId: HAI3_POPUP_DOMAIN,  // Target domain handles layout behavior
  extensionTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.analytics.popups.export.v1',
  props: { format: 'pdf' },
});

// Flow:
// 1. Bridge validates payload against GTS schema
// 2. Bridge calls onHostAction callback
// 3. Callback invokes handleMfeHostAction action
// 4. Action emits 'mfe/hostActionRequested' event
// 5. Effect handles event, calls runtime.loadExtension() with domain and extension
// 6. Popup domain handles by showing modal with the extension
```

- **WHEN** an MFE requests load_ext with popup domain
- **THEN** the bridge (from @hai3/screensets) SHALL validate the payload
- **AND** the bridge SHALL call onHostAction callback
- **AND** the effect SHALL call `runtime.loadExtension()` with domain and extension
- **AND** the popup domain SHALL render the extension as a modal

#### Scenario: MFE requests extension unload from popup domain

```typescript
import { HAI3_ACTION_UNLOAD_EXT, HAI3_POPUP_DOMAIN } from '@hai3/screensets';

// Inside MFE popup
// HAI3_ACTION_UNLOAD_EXT is: gts.hai3.screensets.ext.action.v1~hai3.screensets.actions.unload_ext.v1~
await bridge.requestHostAction(HAI3_ACTION_UNLOAD_EXT, {
  domainTypeId: HAI3_POPUP_DOMAIN,
  extensionTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.analytics.popups.export.v1',
});
```

- **WHEN** an MFE requests unload_ext from popup domain
- **THEN** the host SHALL unmount the extension from the popup domain
- **AND** the extension's bridge SHALL be destroyed

#### Scenario: MFE requests extension load into sidebar domain

```typescript
import { HAI3_ACTION_LOAD_EXT, HAI3_SIDEBAR_DOMAIN } from '@hai3/screensets';

// HAI3_ACTION_LOAD_EXT is: gts.hai3.screensets.ext.action.v1~hai3.screensets.actions.load_ext.v1~
await bridge.requestHostAction(HAI3_ACTION_LOAD_EXT, {
  domainTypeId: HAI3_SIDEBAR_DOMAIN,  // Target domain handles layout behavior
  extensionTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.analytics.sidebars.quick_stats.v1',
});
```

- **WHEN** an MFE requests load_ext with sidebar domain
- **THEN** the host SHALL validate the payload against the action schema
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
import { HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT, HAI3_SCREEN_DOMAIN } from '@hai3/screensets';

// This works - screen domain supports load_ext (navigate to screen)
await bridge.requestHostAction(HAI3_ACTION_LOAD_EXT, {
  domainTypeId: HAI3_SCREEN_DOMAIN,
  extensionTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.screens.analytics.v1',
});

// This will FAIL - screen domain does NOT support unload_ext
// You cannot have "no screen selected"
try {
  await bridge.requestHostAction(HAI3_ACTION_UNLOAD_EXT, {
    domainTypeId: HAI3_SCREEN_DOMAIN,
    extensionTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.screens.analytics.v1',
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
import { type GtsTypeId } from '@hai3/screensets';

// Default error boundary shows:
// - Error message
// - Retry button
// - MFE GTS entry type ID

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

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
  entryTypeId={MFE_ANALYTICS_ENTRY}
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
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

// Loading component is passed as a prop to MfeContainer
// NOT as static plugin configuration
<MfeContainer
  entryTypeId={MFE_ANALYTICS_ENTRY}
  loadingComponent={({ entryTypeId }) => <MfeSkeleton entryTypeId={entryTypeId} />}
/>
```

- **WHEN** an MFE is loading
- **THEN** a loading indicator SHALL be displayed
- **AND** custom loading components SHALL be passed as props to MfeContainer
- **AND** the loading component SHALL receive `entryTypeId` (GTS MfeEntryMF) prop

### Requirement: MFE Preloading

The system SHALL support preloading MFE bundles before navigation using GTS type IDs.

#### Scenario: Preload on menu hover

```typescript
import { mfeActions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

// Preload is triggered via action, not static configuration
// On click, mount the extension on its screen domain (which navigates to it)
<MenuItem
  onMouseEnter={() => mfeActions.preloadExtension(ANALYTICS_EXTENSION_ID)}
  onClick={() => mfeActions.mountExtension({ extensionId: ANALYTICS_EXTENSION_ID })}
>
  Analytics
</MenuItem>
```

- **WHEN** preloading an MFE
- **THEN** the preload action SHALL start the MFE fetch dynamically
- **AND** the bundle SHALL be cached for instant navigation
- **AND** preload SHALL NOT mount the MFE

#### Scenario: Immediate preload on app initialization

```typescript
import { mfeActions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// Preload can be triggered immediately after app initialization
// via an effect that listens to app ready event
// NOT via static plugin configuration

// In an effect or app initialization hook:
eventBus.on('app/ready', () => {
  // Preload frequently used extensions dynamically
  mfeActions.preloadExtension('gts.hai3.screensets.ext.extension.v1~acme.analytics.dashboard.v1' as GtsTypeId);
  mfeActions.preloadExtension('gts.hai3.screensets.ext.extension.v1~acme.billing.overview.v1' as GtsTypeId);
});
// Analytics and billing bundles fetched after app startup
```

- **WHEN** preloading MFEs on app startup
- **THEN** the preload action SHALL be triggered dynamically (e.g., in an effect)
- **AND** the MFE bundles SHALL be fetched in the background
- **AND** navigation to those MFEs SHALL be instant

### Requirement: MFE Registry Integration

The system SHALL register loaded MFE definitions with `microfrontendRegistry` for querying by GTS type ID.

#### Scenario: Query loaded MFEs

```typescript
import { microfrontendRegistry, type GtsTypeId, parseGtsId } from '@hai3/screensets';

// MfManifest type ID - contains Module Federation config
const ANALYTICS_MANIFEST = 'gts.hai3.screensets.mfe.mf.v1~acme.analytics.mfe.manifest.v1' as GtsTypeId;

// After manifest is loaded
const manifest = microfrontendRegistry.getManifest(ANALYTICS_MANIFEST);
console.log(manifest?.remoteName);  // 'acme_analytics'
console.log(manifest?.remoteEntry); // URL to remoteEntry.js
console.log(manifest?.entries);     // List of MfeEntryMF type IDs

// Query by entry type ID
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;
const entry = microfrontendRegistry.getEntry(MFE_ANALYTICS_ENTRY);
console.log(entry?.manifest);       // References MfManifest type ID
console.log(entry?.exposedModule);  // './Dashboard'

// Parse vendor info from GTS type
const parsed = parseGtsId(ANALYTICS_MANIFEST);
console.log(parsed.vendor); // 'hai3' (base type vendor)
```

- **WHEN** an MFE manifest is loaded
- **THEN** its definition SHALL be registered in `microfrontendRegistry`
- **AND** the registry SHALL be queryable by MfManifest or MfeEntryMF GTS type ID
- **AND** `parseGtsId()` SHALL extract vendor and other metadata

### Requirement: MFE Version Validation

The system SHALL validate shared dependency versions between host and MFE.

#### Scenario: Version mismatch warning

```typescript
// If host uses React 18.3.0 and MFE built with React 18.2.0:
// Warning logged: "MFE entry 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' was built with react@18.2.0, host has 18.3.0"
```

- **WHEN** an MFE is loaded with different shared dependency versions
- **THEN** a warning SHALL be logged in development
- **AND** the warning SHALL include the GTS entry type ID
- **AND** the MFE SHALL still load (minor version differences tolerated)

#### Scenario: Major version mismatch error

```typescript
import { type GtsTypeId, MfeVersionMismatchError } from '@hai3/screensets';

// If host uses React 18.x and MFE built with React 17.x:
// The runtime validates versions when loading a dynamically registered manifest
try {
  // Manifest is loaded dynamically - not configured statically
  const manifest = await fetchManifestFromBackend('vendor.legacy');
  await runtime.registerManifest(manifest);
} catch (error) {
  if (error instanceof MfeVersionMismatchError) {
    console.log(`MFE manifest ${error.manifestTypeId} has incompatible deps`);
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
import { conformsTo, HAI3_MF_MANIFEST, type GtsTypeId } from '@hai3/screensets';

// When loading an MFE manifest
const manifestTypeId = 'gts.hai3.screensets.mfe.mf.v1~acme.analytics.mfe.manifest.v1' as GtsTypeId;

// HAI3_MF_MANIFEST is: gts.hai3.screensets.mfe.mf.v1~
if (!conformsTo(manifestTypeId, HAI3_MF_MANIFEST)) {
  throw new MfeTypeConformanceError(manifestTypeId, HAI3_MF_MANIFEST);
}
```

- **WHEN** loading an MFE manifest
- **THEN** the loader SHALL validate that `manifestTypeId` conforms to `gts.hai3.screensets.mfe.mf.v1~`
- **AND** if validation fails, `MfeTypeConformanceError` SHALL be thrown

#### Scenario: Validate MfeEntry type on mount

```typescript
import { conformsTo, HAI3_MFE_ENTRY, HAI3_MFE_ENTRY_MF, type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF (Module Federation derived) type ID
const entryTypeId = 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' as GtsTypeId;

// HAI3_MFE_ENTRY is: gts.hai3.screensets.mfe.entry.v1~ (base)
// HAI3_MFE_ENTRY_MF is: gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~ (derived)
if (!conformsTo(entryTypeId, HAI3_MFE_ENTRY)) {
  throw new MfeEntryTypeConformanceError(entryTypeId, HAI3_MFE_ENTRY);
}
```

- **WHEN** mounting an entry
- **THEN** the entry type SHALL be validated against the expected base type
- **AND** all MFE entries SHALL conform to `gts.hai3.screensets.mfe.entry.v1~` (base)
- **AND** Module Federation entries SHALL also conform to `gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~` (derived)

### Requirement: Dynamic Registration Support in Framework

The framework SHALL support dynamic registration of extensions and MFEs at any time during runtime, not just at initialization. This integrates with the ScreensetsRegistry dynamic API.

#### Scenario: Register extension via action

```typescript
import { mfeActions } from '@hai3/framework';
import { type Extension, type GtsTypeId } from '@hai3/screensets';

// Extension can be registered at any time - NOT just initialization
mfeActions.registerExtension({
  id: 'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1' as GtsTypeId,
  domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
  entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  uiMeta: { title: 'Analytics', size: 'medium' },
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
import { type GtsTypeId } from '@hai3/screensets';

// Unregister at any time - also unmounts if currently mounted
mfeActions.unregisterExtension('gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1' as GtsTypeId);
// Emits: 'mfe/unregisterExtensionRequested' with { extensionId }
// Effect calls: runtime.unregisterExtension(extensionId)
```

- **WHEN** calling `mfeActions.unregisterExtension(extensionId)`
- **THEN** it SHALL emit `'mfe/unregisterExtensionRequested'` event
- **AND** the effect SHALL call `runtime.unregisterExtension()`
- **AND** if MFE is mounted, it SHALL be unmounted first

#### Scenario: Refresh extensions from backend via action

```typescript
import { mfeActions } from '@hai3/framework';

// After user login, refresh all extensions from backend
mfeActions.refreshExtensions();
// Emits: 'mfe/refreshExtensionsRequested'
// Effect calls: runtime.refreshExtensionsFromBackend()
```

- **WHEN** calling `mfeActions.refreshExtensions()`
- **THEN** it SHALL emit `'mfe/refreshExtensionsRequested'` event
- **AND** the effect SHALL call `runtime.refreshExtensionsFromBackend()`
- **AND** it SHALL dispatch loading/success/error states to slice

#### Scenario: Track extension registration state in slice

```typescript
import { selectExtensionState, selectRegisteredExtensions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const extensionId = 'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1' as GtsTypeId;

// Query registration state
const state = useAppSelector((s) => selectExtensionState(s, extensionId));
// 'unregistered' | 'registering' | 'registered' | 'error'

// Get all registered extensions
const registeredExtensions = useAppSelector(selectRegisteredExtensions);
// GtsTypeId[]
```

- **WHEN** querying extension registration state
- **THEN** `selectExtensionState()` SHALL return registration status
- **AND** `selectRegisteredExtensions()` SHALL return list of registered extension IDs

#### Scenario: Configure TypeInstanceProvider at runtime

```typescript
import { mfeActions } from '@hai3/framework';
import { InMemoryTypeInstanceProvider, BackendTypeInstanceProvider } from '@hai3/screensets';

// App is created WITHOUT static configuration
const app = createHAI3()
  .use(microfrontends())  // No configuration - just enables MFE capabilities
  .build();

// TypeInstanceProvider is set dynamically at runtime
// This can be done in response to user login, configuration load, etc.

// Current: in-memory provider (set during app initialization)
runtime.setTypeInstanceProvider(new InMemoryTypeInstanceProvider());

// Future: backend provider (set after authentication)
eventBus.on('auth/loginSuccess', ({ token }) => {
  runtime.setTypeInstanceProvider(new BackendTypeInstanceProvider({
    apiUrl: '/api/extensions',
    authToken: () => token,
  }));
  // Refresh extensions from the new provider
  mfeActions.refreshExtensions();
});
```

- **WHEN** setting a TypeInstanceProvider
- **THEN** it SHALL be set dynamically at runtime via `runtime.setTypeInstanceProvider()`
- **AND** it SHALL NOT be passed as static plugin configuration
- **AND** the provider SHALL enable dynamic extension discovery

#### Scenario: Listen to registration events

```typescript
import { useExtensionEvents } from '@hai3/framework';

function WidgetSlot() {
  // Re-render when extensions are registered/unregistered for this domain
  const extensions = useExtensionEvents('gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~');

  return (
    <div>
      {extensions.map(ext => (
        <MfeContainer key={ext.id} extensionId={ext.id} />
      ))}
    </div>
  );
}
```

- **WHEN** using `useExtensionEvents(domainId)` hook
- **THEN** it SHALL subscribe to runtime's `extensionRegistered` and `extensionUnregistered` events
- **AND** it SHALL filter events by domain
- **AND** it SHALL trigger re-render when extensions change
- **AND** it SHALL return current list of extensions for the domain
