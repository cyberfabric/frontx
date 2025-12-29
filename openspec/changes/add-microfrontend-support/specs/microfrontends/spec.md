## ADDED Requirements

**Key principle**: This spec defines Flux integration only. All MFE orchestration (loading, mounting, bridging) is handled by `@hai3/screensets`. The framework plugin wires the orchestrator into the Flux data flow pattern.

### Requirement: Microfrontends Plugin

The system SHALL provide a `microfrontends()` plugin in `@hai3/framework` that wires the MFE orchestrator from `@hai3/screensets` into the Flux data flow pattern.

#### Scenario: Register microfrontends plugin

```typescript
import { createHAI3, screensets, microfrontends } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const app = createHAI3()
  .use(screensets())
  .use(microfrontends({
    remotes: [
      {
        typeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
        url: 'https://mfe.example.com/analytics/remoteEntry.js',
      },
      {
        typeId: 'gts.hai3.mfe.type.v1~acme.billing._.portal.v1~' as GtsTypeId,
        url: '/mfe/billing/remoteEntry.js',
      },
    ],
    styleIsolation: 'shadow-dom',
  }))
  .build();
```

- **WHEN** building an app with microfrontends plugin
- **THEN** the plugin SHALL accept `remotes` configuration with GTS type IDs
- **AND** the plugin SHALL depend on `screensets` plugin
- **AND** `styleIsolation` SHALL default to `'shadow-dom'`

### Requirement: Remote MFE Configuration

The system SHALL support configuring remote MFE endpoints with GTS type IDs and shared dependency declarations.

#### Scenario: Configure remote with shared dependencies

```typescript
import { type MfeRemoteConfig, type GtsTypeId } from '@hai3/screensets';

const remoteConfig: MfeRemoteConfig = {
  typeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
  url: 'https://mfe.example.com/analytics/remoteEntry.js',
  shared: ['react', 'react-dom', '@hai3/screensets', '@hai3/state'],
  preload: 'hover',
  loadTimeout: 15000,
};
```

- **WHEN** configuring a remote MFE
- **THEN** `typeId` (GTS) and `url` SHALL be required
- **AND** `shared` SHALL list dependencies to deduplicate
- **AND** `preload` SHALL control when to start loading ('none', 'hover', 'immediate')
- **AND** `loadTimeout` SHALL set maximum load time (default 10000ms)

### Requirement: MFE Actions

The system SHALL provide MFE actions that emit events only, following HAI3 Flux pattern (no async, return void).

#### Scenario: Load MFE action

```typescript
import { mfeActions } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

// Action emits event, returns void
mfeActions.loadMfe(MFE_ANALYTICS);
// Emits: 'mfe/loadRequested' with { mfeTypeId }
```

- **WHEN** calling `loadMfe` action
- **THEN** it SHALL emit `'mfe/loadRequested'` event with `mfeTypeId`
- **AND** it SHALL return `void` (no Promise)
- **AND** it SHALL NOT perform any async operations

#### Scenario: Handle MFE host action

```typescript
// Called by orchestrator when MFE requests host action
mfeActions.handleMfeHostAction(mfeTypeId, actionTypeId, payload);
// Emits: 'mfe/hostActionRequested' with { mfeTypeId, actionTypeId, payload }
```

- **WHEN** the orchestrator's `onHostAction` callback is invoked
- **THEN** it SHALL call `handleMfeHostAction` action
- **AND** the action SHALL emit `'mfe/hostActionRequested'` event
- **AND** effects SHALL handle the event and call orchestrator methods

### Requirement: MFE Effects

The system SHALL provide MFE effects that subscribe to events, call orchestrator methods, and dispatch to slices.

#### Scenario: Load effect handles loadRequested event

```typescript
import { MfeOrchestrator } from '@hai3/screensets';

// Effect subscribes to event, calls orchestrator, dispatches to slice
eventBus.on('mfe/loadRequested', async ({ mfeTypeId }) => {
  dispatch(mfeSlice.actions.setLoading({ mfeTypeId }));
  try {
    await orchestrator.load(mfeTypeId);
    dispatch(mfeSlice.actions.setLoaded({ mfeTypeId }));
  } catch (error) {
    dispatch(mfeSlice.actions.setError({ mfeTypeId, error: error.message }));
  }
});
```

- **WHEN** `'mfe/loadRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setLoading` to mfeSlice
- **AND** the effect SHALL call `orchestrator.load()`
- **AND** on success, the effect SHALL dispatch `setLoaded`
- **AND** on failure, the effect SHALL dispatch `setError`
- **AND** the effect SHALL NOT call any actions (prevents loops)

#### Scenario: Host action effect handles popup request

```typescript
eventBus.on('mfe/hostActionRequested', async ({ mfeTypeId, actionTypeId, payload }) => {
  if (conformsTo(actionTypeId, HAI3_ACTION_SHOW_POPUP)) {
    const { entryTypeId, props } = payload as ShowPopupPayload;
    const container = document.getElementById('popup-domain')!;
    orchestrator.mount(mfeTypeId, entryTypeId, container);
    dispatch(layoutSlice.actions.showPopup({ mfeTypeId, entryTypeId }));
  }
});
```

- **WHEN** `'mfe/hostActionRequested'` event with `show_popup` action is received
- **THEN** the effect SHALL call `orchestrator.mount()` for the popup entry
- **AND** the effect SHALL dispatch to `layoutSlice`

### Requirement: MFE Load State Tracking

The system SHALL track MFE load states via a Redux slice using GTS type IDs.

#### Scenario: Query MFE load state

```typescript
import { selectMfeLoadState, selectMfeError } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

const loadState = useAppSelector((state) =>
  selectMfeLoadState(state, MFE_ANALYTICS)
);
// 'idle' | 'loading' | 'loaded' | 'error'

const error = useAppSelector((state) =>
  selectMfeError(state, MFE_ANALYTICS)
);
```

- **WHEN** querying MFE load state
- **THEN** `selectMfeLoadState()` SHALL accept a GTS type ID
- **AND** valid states SHALL be: 'idle', 'loading', 'loaded', 'error'
- **AND** `selectMfeError()` SHALL return the error if state is 'error'

### Requirement: Shadow DOM React Component

The system SHALL provide a `ShadowDomContainer` React component that uses the shadow DOM utilities from `@hai3/screensets`.

#### Scenario: Render MFE in Shadow DOM

```tsx
import { ShadowDomContainer } from '@hai3/framework';
import { type GtsTypeId } from '@hai3/screensets';

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

<ShadowDomContainer
  mfeTypeId={MFE_ANALYTICS}
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

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

// Action emits event
app.actions.navigateToMfe({ mfeTypeId: MFE_ANALYTICS });
// Emits 'navigation/mfeRequested' event
// Effect handles: calls orchestrator.load(), then orchestrator.mount()
```

- **WHEN** navigating to a registered MFE by GTS type ID
- **THEN** the action SHALL emit `'navigation/mfeRequested'` event
- **AND** the effect SHALL call `orchestrator.load()` then `orchestrator.mount()`
- **AND** on error, the effect SHALL dispatch error to slice

#### Scenario: Navigate away from MFE

```typescript
app.actions.navigateToScreenset({ screensetId: 'local-screenset' });
// Effect calls orchestrator.unmount() for previous MFE
// Orchestrator cleans up bridge subscriptions
```

- **WHEN** navigating away from an MFE screenset
- **THEN** the effect SHALL call `orchestrator.unmount()` for the previous MFE
- **AND** the orchestrator SHALL clean up all bridge subscriptions

### Requirement: MFE Popup Rendering

The system SHALL support rendering MFE popup entries via the Flux data flow pattern.

#### Scenario: MFE requests popup

```typescript
import { HAI3_ACTION_SHOW_POPUP } from '@hai3/screensets';

// Inside MFE component - bridge validates and calls onHostAction callback
await bridge.requestHostAction(HAI3_ACTION_SHOW_POPUP, {
  mfeTypeId: bridge.mfeTypeId,
  entryTypeId: 'gts.hai3.mfe.entry.popup.v1~acme.analytics.popups.export.v1~',
  props: { format: 'pdf' },
});

// Flow:
// 1. Bridge validates payload against GTS schema
// 2. Bridge calls onHostAction callback
// 3. Callback invokes handleMfeHostAction action
// 4. Action emits 'mfe/hostActionRequested' event
// 5. Effect handles event, calls orchestrator.mount() for popup entry
```

- **WHEN** an MFE requests showPopup with GTS entry type ID
- **THEN** the bridge (from @hai3/screensets) SHALL validate the payload
- **AND** the bridge SHALL call onHostAction callback
- **AND** the effect SHALL call `orchestrator.mount()` for the popup entry
- **AND** the popup SHALL render in its own Shadow DOM container

#### Scenario: MFE popup closes

```typescript
import { HAI3_ACTION_HIDE_POPUP } from '@hai3/screensets';

// Inside MFE popup
await bridge.requestHostAction(HAI3_ACTION_HIDE_POPUP, {
  entryTypeId: 'gts.hai3.mfe.entry.popup.v1~acme.analytics.popups.export.v1~',
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

await bridge.requestHostAction(HAI3_ACTION_SHOW_SIDEBAR, {
  mfeTypeId: bridge.mfeTypeId,
  entryTypeId: 'gts.hai3.mfe.entry.sidebar.v1~acme.analytics.sidebars.quick_stats.v1~',
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
// - MFE GTS type ID

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

<MfeErrorBoundary
  mfeTypeId={MFE_ANALYTICS}
  error={loadError}
  onRetry={() => loader.load(config)}
/>
```

- **WHEN** an MFE fails to load or render
- **THEN** an error boundary SHALL be displayed
- **AND** the error message SHALL be shown
- **AND** the GTS type ID SHALL be displayed
- **AND** a retry button SHALL be available
- **AND** custom error boundaries SHALL be configurable via plugin

#### Scenario: Custom error boundary

```typescript
microfrontends({
  errorBoundary: ({ error, mfeTypeId, retry }) => (
    <CustomError error={error} mfeTypeId={mfeTypeId} onRetry={retry} />
  ),
})
```

- **WHEN** a custom error boundary is configured
- **THEN** it SHALL receive `error`, `mfeTypeId` (GTS), and `retry` props
- **AND** it SHALL replace the default error boundary

### Requirement: Loading Indicator for MFEs

The system SHALL provide loading indicators while MFEs are being fetched.

#### Scenario: Default loading indicator

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// While MFE is loading, skeleton/spinner is shown
// Configured via plugin:
microfrontends({
  loadingComponent: ({ mfeTypeId }) => <MfeSkeleton mfeTypeId={mfeTypeId} />,
})
```

- **WHEN** an MFE is loading
- **THEN** a loading indicator SHALL be displayed
- **AND** custom loading components SHALL be configurable
- **AND** the loading component SHALL receive `mfeTypeId` (GTS) prop

### Requirement: MFE Preloading

The system SHALL support preloading MFE bundles before navigation using GTS type IDs.

#### Scenario: Preload on menu hover

```typescript
import { type GtsTypeId } from '@hai3/screensets';

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

// With preload: 'hover', hovering menu item starts fetch
<MenuItem
  onMouseEnter={() => loader.preload(MFE_ANALYTICS)}
  onClick={() => app.actions.navigateToMfe({ mfeTypeId: MFE_ANALYTICS })}
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
      typeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
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

const MFE_ANALYTICS = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

// After MFE is loaded
const mfe = microfrontendRegistry.get(MFE_ANALYTICS);
console.log(mfe?.name);    // 'Analytics Dashboard'
console.log(mfe?.typeId);  // 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~'
console.log(mfe?.entries.map(e => e.typeId)); // GTS entry type IDs

// Parse vendor info from GTS type
const parsed = parseGtsId(MFE_ANALYTICS);
console.log(parsed.vendor); // 'acme'
```

- **WHEN** an MFE is loaded
- **THEN** its definition SHALL be registered in `microfrontendRegistry`
- **AND** the registry SHALL be queryable by GTS type ID
- **AND** `parseGtsId()` SHALL extract vendor and other metadata

### Requirement: MFE Version Validation

The system SHALL validate shared dependency versions between host and MFE.

#### Scenario: Version mismatch warning

```typescript
// If host uses React 18.3.0 and MFE built with React 18.2.0:
// Warning logged: "MFE 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' was built with react@18.2.0, host has 18.3.0"
```

- **WHEN** an MFE is loaded with different shared dependency versions
- **THEN** a warning SHALL be logged in development
- **AND** the warning SHALL include the GTS type ID
- **AND** the MFE SHALL still load (minor version differences tolerated)

#### Scenario: Major version mismatch error

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// If host uses React 18.x and MFE built with React 17.x:
try {
  await loader.load({
    typeId: 'gts.hai3.mfe.type.v1~vendor.legacy._.mfe.v1~' as GtsTypeId,
    url: '...',
  });
} catch (error) {
  if (error instanceof MfeVersionMismatchError) {
    console.log(`MFE ${error.mfeTypeId} has incompatible deps`);
  }
}
```

- **WHEN** an MFE has incompatible major version of shared deps
- **THEN** `MfeVersionMismatchError` SHALL be thrown with `mfeTypeId`
- **AND** the MFE SHALL NOT be mounted
- **AND** error boundary SHALL display version conflict message

### Requirement: GTS Type Conformance Validation

The system SHALL validate that MFE type IDs conform to HAI3 base types.

#### Scenario: Validate MFE type on load

```typescript
import { conformsTo, HAI3_MFE_TYPE, type GtsTypeId } from '@hai3/screensets';

// When loading an MFE
const mfeTypeId = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;

if (!conformsTo(mfeTypeId, HAI3_MFE_TYPE)) {
  throw new MfeTypeConformanceError(mfeTypeId, HAI3_MFE_TYPE);
}
```

- **WHEN** loading an MFE
- **THEN** the loader SHALL validate that `typeId` conforms to `gts.hai3.mfe.type.v1~`
- **AND** if validation fails, `MfeTypeConformanceError` SHALL be thrown

#### Scenario: Validate entry type on mount

```typescript
import { conformsTo, HAI3_MFE_ENTRY_SCREEN, type GtsTypeId } from '@hai3/screensets';

const entryTypeId = 'gts.hai3.mfe.entry.screen.v1~acme.analytics.screens.main.v1~' as GtsTypeId;

if (!conformsTo(entryTypeId, HAI3_MFE_ENTRY_SCREEN)) {
  throw new MfeEntryTypeConformanceError(entryTypeId, HAI3_MFE_ENTRY_SCREEN);
}
```

- **WHEN** mounting an entry
- **THEN** the entry type SHALL be validated against the expected base type
- **AND** screen entries SHALL conform to `gts.hai3.mfe.entry.screen.v1~`
- **AND** popup entries SHALL conform to `gts.hai3.mfe.entry.popup.v1~`
