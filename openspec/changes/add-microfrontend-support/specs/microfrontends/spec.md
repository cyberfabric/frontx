## ADDED Requirements

**Key principle**: This spec defines Flux integration only. All MFE lifecycle management (loading, mounting, bridging) is handled by `@hai3/screensets`. The framework plugin wires the ScreensetsRuntime into the Flux data flow pattern.

**Namespace convention**: All HAI3 MFE types use the `gts.hai3.screensets.*` namespace for consistency with the screensets package. The type hierarchy follows the pattern established in screensets/spec.md.

### Requirement: Microfrontends Plugin

The system SHALL provide a `microfrontends()` plugin in `@hai3/framework` that wires the ScreensetsRuntime from `@hai3/screensets` into the Flux data flow pattern.

#### Scenario: Register microfrontends plugin

```typescript
import { createHAI3, screensets, microfrontends } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const app = createHAI3()
  .use(screensets())
  .use(microfrontends({
    remotes: [
      {
        // MfManifest type ID - references Module Federation manifest
        manifestTypeId: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics~' as GtsTypeId,
        url: 'https://mfe.example.com/analytics/remoteEntry.js',
      },
      {
        manifestTypeId: 'gts.hai3.screensets.mfe.mf.v1~acme.billing~' as GtsTypeId,
        url: '/mfe/billing/remoteEntry.js',
      },
    ],
    styleIsolation: 'shadow-dom',
  }))
  .build();
```

- **WHEN** building an app with microfrontends plugin
- **THEN** the plugin SHALL accept `remotes` configuration with MfManifest GTS type IDs
- **AND** the plugin SHALL depend on `screensets` plugin
- **AND** `styleIsolation` SHALL default to `'shadow-dom'`

### Requirement: Remote MFE Configuration

The system SHALL support configuring remote MFE endpoints with GTS type IDs and shared dependency declarations.

#### Scenario: Configure remote with isolated dependencies

```typescript
import { type MfeRemoteConfig, type GtsTypeId } from '@hai3/screensets';

const remoteConfig: MfeRemoteConfig = {
  // References MfManifest type - consistent with gts.hai3.screensets.mfe.mf.v1~ base
  manifestTypeId: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics~' as GtsTypeId,
  url: 'https://mfe.example.com/analytics/remoteEntry.js',
  // NOTE: MFEs are framework-agnostic - NO React/ReactDOM sharing
  // NOTE: @hai3/screensets is NOT shared - each MFE gets isolated instance
  // NOTE: @globaltypesystem/gts-ts is NOT shared - isolated TypeSystemPlugin per runtime
  // NOTE: No singletons by design - sharing is ONLY for stateless utilities (lodash, date-fns)
  //       and is purely an optimization (smaller bundle), not a requirement
  preload: 'hover',
  loadTimeout: 15000,
};
```

- **WHEN** configuring a remote MFE
- **THEN** `manifestTypeId` (GTS MfManifest type) and `url` SHALL be required
- **AND** `@hai3/screensets` SHALL NOT be shared (each MFE gets isolated instance)
- **AND** `@globaltypesystem/gts-ts` SHALL NOT be shared (isolated TypeSystemPlugin)
- **AND** React/ReactDOM SHALL NOT be shared (MFEs are framework-agnostic)
- **AND** no singletons SHALL be used by design
- **AND** only stateless utilities (lodash, date-fns) MAY be shared for bundle optimization
- **AND** `preload` SHALL control when to start loading ('none', 'hover', 'immediate')
- **AND** `loadTimeout` SHALL set maximum load time (default 10000ms)

### Requirement: MFE Actions

The system SHALL provide MFE actions that emit events only, following HAI3 Flux pattern (no async, return void).

#### Scenario: Load MFE action

```typescript
import { mfeActions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

// Action emits event, returns void
mfeActions.loadMfe(MFE_ANALYTICS_ENTRY);
// Emits: 'mfe/loadRequested' with { entryTypeId }
```

- **WHEN** calling `loadMfe` action
- **THEN** it SHALL emit `'mfe/loadRequested'` event with `entryTypeId`
- **AND** it SHALL return `void` (no Promise)
- **AND** it SHALL NOT perform any async operations

#### Scenario: Handle MFE host action

```typescript
// Called by ScreensetsRuntime when MFE requests host action
// actionTypeId references gts.hai3.screensets.ext.action.v1~
mfeActions.handleMfeHostAction(entryTypeId, actionTypeId, payload);
// Emits: 'mfe/hostActionRequested' with { entryTypeId, actionTypeId, payload }
```

- **WHEN** the ScreensetsRuntime's `onHostAction` callback is invoked
- **THEN** it SHALL call `handleMfeHostAction` action
- **AND** the action SHALL emit `'mfe/hostActionRequested'` event
- **AND** effects SHALL handle the event and call ScreensetsRuntime methods

### Requirement: MFE Effects

The system SHALL provide MFE effects that subscribe to events, call ScreensetsRuntime methods, and dispatch to slices.

#### Scenario: Load effect handles loadRequested event

```typescript
import { ScreensetsRuntime } from '@hai3/screensets';

// Effect subscribes to event, calls runtime, dispatches to slice
// entryTypeId is MfeEntryMF type: gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~...
eventBus.on('mfe/loadRequested', async ({ entryTypeId }) => {
  dispatch(mfeSlice.actions.setLoading({ entryTypeId }));
  try {
    await runtime.loadMfe(entryTypeId);
    dispatch(mfeSlice.actions.setLoaded({ entryTypeId }));
  } catch (error) {
    dispatch(mfeSlice.actions.setError({ entryTypeId, error: error.message }));
  }
});
```

- **WHEN** `'mfe/loadRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setLoading` to mfeSlice
- **AND** the effect SHALL call `runtime.loadMfe()`
- **AND** on success, the effect SHALL dispatch `setLoaded`
- **AND** on failure, the effect SHALL dispatch `setError`
- **AND** the effect SHALL NOT call any actions (prevents loops)

#### Scenario: Host action effect handles popup request

```typescript
import { conformsTo, HAI3_ACTION_SHOW_POPUP } from '@hai3/screensets';

// actionTypeId conforms to gts.hai3.screensets.ext.action.v1~
eventBus.on('mfe/hostActionRequested', async ({ entryTypeId, actionTypeId, payload }) => {
  if (conformsTo(actionTypeId, HAI3_ACTION_SHOW_POPUP)) {
    const { popupEntryTypeId, props } = payload as ShowPopupPayload;
    const container = document.getElementById('popup-domain')!;
    // popupEntryTypeId is MfeEntry (or derived) type ID
    runtime.mountExtension(entryTypeId, popupEntryTypeId, container);
    dispatch(layoutSlice.actions.showPopup({ entryTypeId, popupEntryTypeId }));
  }
});
```

- **WHEN** `'mfe/hostActionRequested'` event with `show_popup` action is received
- **THEN** the effect SHALL call `runtime.mountExtension()` for the popup entry
- **AND** the effect SHALL dispatch to `layoutSlice`

### Requirement: MFE Load State Tracking

The system SHALL track MFE load states via a Redux slice using GTS type IDs.

#### Scenario: Query MFE load state

```typescript
import { selectMfeLoadState, selectMfeError } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

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

### Requirement: Shadow DOM React Component

The system SHALL provide a `ShadowDomContainer` React component that uses the shadow DOM utilities from `@hai3/screensets`.

#### Scenario: Render MFE in Shadow DOM

```tsx
import { ShadowDomContainer } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

<ShadowDomContainer
  entryTypeId={MFE_ANALYTICS_ENTRY}
  cssVariables={themeVariables}
>
  <AnalyticsEntry bridge={bridge} />
</ShadowDomContainer>
```

- **WHEN** rendering an MFE entry
- **THEN** the component SHALL use `createShadowRoot()` from `@hai3/screensets`
- **AND** it SHALL use `injectCssVariables()` from `@hai3/screensets`
- **AND** it SHALL wrap children in a React portal into the shadow root

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

The system SHALL integrate MFE loading with the navigation plugin using actions/effects pattern.

#### Scenario: Navigate to MFE screenset

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

// Action emits event
app.actions.navigateToMfe({ entryTypeId: MFE_ANALYTICS_ENTRY });
// Emits 'navigation/mfeRequested' event
// Effect handles: calls runtime.loadMfe(), then runtime.mountExtension()
```

- **WHEN** navigating to a registered MFE by MfeEntryMF GTS type ID
- **THEN** the action SHALL emit `'navigation/mfeRequested'` event
- **AND** the effect SHALL call `runtime.loadMfe()` then `runtime.mountExtension()`
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

### Requirement: MFE Popup Rendering

The system SHALL support rendering MFE popup entries via the Flux data flow pattern.

#### Scenario: MFE requests popup

```typescript
import { HAI3_ACTION_SHOW_POPUP } from '@hai3/screensets';

// Inside MFE component - bridge validates and calls onHostAction callback
// HAI3_ACTION_SHOW_POPUP is: gts.hai3.screensets.ext.action.v1~hai3.actions.show_popup~
await bridge.requestHostAction(HAI3_ACTION_SHOW_POPUP, {
  entryTypeId: bridge.entryTypeId,
  // popupEntryTypeId is MfeEntry (base or derived) type ID
  popupEntryTypeId: 'gts.hai3.screensets.mfe.entry.v1~acme.analytics.popups.export~',
  props: { format: 'pdf' },
});

// Flow:
// 1. Bridge validates payload against GTS schema
// 2. Bridge calls onHostAction callback
// 3. Callback invokes handleMfeHostAction action
// 4. Action emits 'mfe/hostActionRequested' event
// 5. Effect handles event, calls runtime.mountExtension() for popup entry
```

- **WHEN** an MFE requests showPopup with GTS entry type ID
- **THEN** the bridge (from @hai3/screensets) SHALL validate the payload
- **AND** the bridge SHALL call onHostAction callback
- **AND** the effect SHALL call `runtime.mountExtension()` for the popup entry
- **AND** the popup SHALL render in its own Shadow DOM container

#### Scenario: MFE popup closes

```typescript
import { HAI3_ACTION_HIDE_POPUP } from '@hai3/screensets';

// Inside MFE popup
// HAI3_ACTION_HIDE_POPUP is: gts.hai3.screensets.ext.action.v1~hai3.actions.hide_popup~
await bridge.requestHostAction(HAI3_ACTION_HIDE_POPUP, {
  popupEntryTypeId: 'gts.hai3.screensets.mfe.entry.v1~acme.analytics.popups.export~',
});
```

- **WHEN** an MFE popup requests hidePopup
- **THEN** the host SHALL unmount the popup entry
- **AND** the popup's bridge SHALL be destroyed

### Requirement: MFE Sidebar Rendering

The system SHALL support rendering MFE sidebar entries via host action requests with GTS type IDs.

#### Scenario: MFE requests sidebar

```typescript
import { HAI3_ACTION_SHOW_SIDEBAR } from '@hai3/screensets';

// HAI3_ACTION_SHOW_SIDEBAR is: gts.hai3.screensets.ext.action.v1~hai3.actions.show_sidebar~
await bridge.requestHostAction(HAI3_ACTION_SHOW_SIDEBAR, {
  entryTypeId: bridge.entryTypeId,
  // sidebarEntryTypeId is MfeEntry (base or derived) type ID
  sidebarEntryTypeId: 'gts.hai3.screensets.mfe.entry.v1~acme.analytics.sidebars.quick_stats~',
});
```

- **WHEN** an MFE requests showSidebar
- **THEN** the host SHALL validate the payload against the action schema
- **AND** the host SHALL load the MFE's sidebar entry
- **AND** the host SHALL mount it in the sidebar layout domain
- **AND** the sidebar SHALL render in Shadow DOM

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
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

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
microfrontends({
  errorBoundary: ({ error, entryTypeId, retry }) => (
    <CustomError error={error} entryTypeId={entryTypeId} onRetry={retry} />
  ),
})
```

- **WHEN** a custom error boundary is configured
- **THEN** it SHALL receive `error`, `entryTypeId` (GTS), and `retry` props
- **AND** it SHALL replace the default error boundary

### Requirement: Loading Indicator for MFEs

The system SHALL provide loading indicators while MFEs are being fetched.

#### Scenario: Default loading indicator

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// While MFE is loading, skeleton/spinner is shown
// Configured via plugin:
microfrontends({
  loadingComponent: ({ entryTypeId }) => <MfeSkeleton entryTypeId={entryTypeId} />,
})
```

- **WHEN** an MFE is loading
- **THEN** a loading indicator SHALL be displayed
- **AND** custom loading components SHALL be configurable
- **AND** the loading component SHALL receive `entryTypeId` (GTS MfeEntryMF) prop

### Requirement: MFE Preloading

The system SHALL support preloading MFE bundles before navigation using GTS type IDs.

#### Scenario: Preload on menu hover

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// MfeEntryMF type ID - derived from gts.hai3.screensets.mfe.entry.v1~
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

// With preload: 'hover', hovering menu item starts fetch
<MenuItem
  onMouseEnter={() => loader.preload(MFE_ANALYTICS_ENTRY)}
  onClick={() => app.actions.navigateToMfe({ entryTypeId: MFE_ANALYTICS_ENTRY })}
>
  Analytics
</MenuItem>
```

- **WHEN** `preload: 'hover'` is configured
- **THEN** hovering the menu item SHALL start the MFE fetch
- **AND** the bundle SHALL be cached for instant navigation
- **AND** preload SHALL NOT mount the MFE

#### Scenario: Immediate preload

```typescript
import { type GtsTypeId } from '@hai3/screensets';

microfrontends({
  remotes: [
    {
      // MfManifest type ID - contains remoteEntry URL
      manifestTypeId: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics~' as GtsTypeId,
      url: '...',
      preload: 'immediate',
    },
  ],
})
// Analytics bundle fetched on app startup
```

- **WHEN** `preload: 'immediate'` is configured
- **THEN** the MFE bundle SHALL be fetched on app initialization
- **AND** navigation to that MFE SHALL be instant

### Requirement: MFE Registry Integration

The system SHALL register loaded MFE definitions with `microfrontendRegistry` for querying by GTS type ID.

#### Scenario: Query loaded MFEs

```typescript
import { microfrontendRegistry, type GtsTypeId, parseGtsId } from '@hai3/screensets';

// MfManifest type ID - contains Module Federation config
const ANALYTICS_MANIFEST = 'gts.hai3.screensets.mfe.mf.v1~acme.analytics~' as GtsTypeId;

// After manifest is loaded
const manifest = microfrontendRegistry.getManifest(ANALYTICS_MANIFEST);
console.log(manifest?.remoteName);  // 'acme_analytics'
console.log(manifest?.remoteEntry); // URL to remoteEntry.js
console.log(manifest?.entries);     // List of MfeEntryMF type IDs

// Query by entry type ID
const MFE_ANALYTICS_ENTRY = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;
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
// Warning logged: "MFE entry 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' was built with react@18.2.0, host has 18.3.0"
```

- **WHEN** an MFE is loaded with different shared dependency versions
- **THEN** a warning SHALL be logged in development
- **AND** the warning SHALL include the GTS entry type ID
- **AND** the MFE SHALL still load (minor version differences tolerated)

#### Scenario: Major version mismatch error

```typescript
import { type GtsTypeId, MfeVersionMismatchError } from '@hai3/screensets';

// If host uses React 18.x and MFE built with React 17.x:
try {
  await loader.load({
    // MfManifest type ID
    manifestTypeId: 'gts.hai3.screensets.mfe.mf.v1~vendor.legacy~' as GtsTypeId,
    url: '...',
  });
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
const manifestTypeId = 'gts.hai3.screensets.mfe.mf.v1~acme.analytics~' as GtsTypeId;

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
const entryTypeId = 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.analytics.dashboard~' as GtsTypeId;

// HAI3_MFE_ENTRY is: gts.hai3.screensets.mfe.entry.v1~ (base)
// HAI3_MFE_ENTRY_MF is: gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~ (derived)
if (!conformsTo(entryTypeId, HAI3_MFE_ENTRY)) {
  throw new MfeEntryTypeConformanceError(entryTypeId, HAI3_MFE_ENTRY);
}
```

- **WHEN** mounting an entry
- **THEN** the entry type SHALL be validated against the expected base type
- **AND** all MFE entries SHALL conform to `gts.hai3.screensets.mfe.entry.v1~` (base)
- **AND** Module Federation entries SHALL also conform to `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~` (derived)
