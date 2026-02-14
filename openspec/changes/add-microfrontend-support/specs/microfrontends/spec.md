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
// Extension registration via Flux actions (with store state tracking):
// - mfeActions.registerExtension({ extension })
// Domain registration via runtime API (direct, synchronous):
// - runtime.registerDomain(domain, containerProvider, onInitError?)
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

### Requirement: MFE Lifecycle Actions

The system SHALL provide MFE lifecycle actions that call `screensetsRegistry.executeActionsChain()` directly (fire-and-forget), following HAI3 Flux pattern (no async, return void). Lifecycle actions do NOT emit events -- they resolve the extension's domain and invoke the actions chain synchronously.

#### Scenario: Load MFE bundle action

```typescript
import { mfeActions } from '@hai3/framework';

// Extension type ID (plain string - runtime validation via gts-ts)
const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Action calls executeActionsChain fire-and-forget, returns void
mfeActions.loadExtension(ANALYTICS_EXTENSION_ID);
// Resolves domain, calls screensetsRegistry.executeActionsChain() with HAI3_ACTION_LOAD_EXT
```

- **WHEN** calling `loadExtension` action
- **THEN** it SHALL resolve the extension's domain from the registry
- **AND** it SHALL call `screensetsRegistry.executeActionsChain()` with `HAI3_ACTION_LOAD_EXT` fire-and-forget
- **AND** it SHALL return `void` (no Promise, no await)
- **AND** it SHALL NOT emit any events

#### Scenario: Mount MFE action

```typescript
import { mfeActions } from '@hai3/framework';

const ANALYTICS_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Action calls executeActionsChain fire-and-forget
mfeActions.mountExtension(ANALYTICS_EXTENSION_ID);
// Resolves domain, calls screensetsRegistry.executeActionsChain() with HAI3_ACTION_MOUNT_EXT
```

- **WHEN** calling `mountExtension` action
- **THEN** it SHALL resolve the extension's domain from the registry
- **AND** it SHALL call `screensetsRegistry.executeActionsChain()` with `HAI3_ACTION_MOUNT_EXT` fire-and-forget
- **AND** it SHALL return `void` (no Promise, no await)
- **AND** it SHALL NOT emit any events

### Requirement: MFE Registration Effects

The system SHALL provide MFE effects for extension registration operations only. Effects subscribe to extension registration events, call ScreensetsRegistry methods, and dispatch to slices. Lifecycle operations (load, mount, unmount) are handled directly by actions -- NOT by effects. Domain registration is called directly on `ScreensetsRegistry` (synchronous, no Flux action/effect/slice round-trip).

#### Scenario: Register extension effect

```typescript
eventBus.on('mfe/registerExtensionRequested', async ({ extension }) => {
  dispatch(mfeSlice.actions.setExtensionRegistering({ extensionId: extension.id }));
  try {
    await screensetsRegistry.registerExtension(extension);
    dispatch(mfeSlice.actions.setExtensionRegistered({ extensionId: extension.id }));
  } catch (error) {
    dispatch(mfeSlice.actions.setExtensionError({ extensionId: extension.id, error: error.message }));
  }
});
```

- **WHEN** `'mfe/registerExtensionRequested'` event is emitted
- **THEN** the effect SHALL dispatch `setExtensionRegistering` to mfeSlice
- **AND** the effect SHALL call `screensetsRegistry.registerExtension()`
- **AND** on success, the effect SHALL dispatch `setExtensionRegistered`
- **AND** on failure, the effect SHALL dispatch `setExtensionError`

#### Scenario: Effects must NOT call executeActionsChain

- **WHEN** writing effect code
- **THEN** effects SHALL NOT call `screensetsRegistry.executeActionsChain()`
- **AND** effects SHALL NOT call action-like commands that trigger the ActionsChainsMediator
- **AND** ESLint SHALL enforce this via `no-restricted-syntax` on `executeActionsChain` calls in effects files

### Requirement: MFE Registration State Tracking

The system SHALL track MFE registration states via a store slice using extension IDs. Load and mount state tracking is handled internally by the screensets registry (`ExtensionState`) and is NOT duplicated in the framework store slice.

#### Scenario: Query extension registration state

```typescript
import { selectExtensionState, selectRegisteredExtensions } from '@hai3/framework';

const extensionId = 'gts.hai3.mfes.ext.extension.v1~acme.analytics.dashboard.v1';

// Registration state tracks extension registration lifecycle
const state = useAppSelector((s) => selectExtensionState(s, extensionId));
// 'unregistered' | 'registering' | 'registered' | 'error'

// Get all registered extensions
const registeredExtensions = useAppSelector(selectRegisteredExtensions);
// string[]
```

- **WHEN** querying MFE registration state
- **THEN** `selectExtensionState()` SHALL accept an extension GTS type ID
- **AND** registration states SHALL be: 'unregistered', 'registering', 'registered', 'error'
- **AND** `selectRegisteredExtensions()` SHALL return list of registered extension IDs

### Requirement: Extension Domain Rendering

The system SHALL provide an `ExtensionDomainSlot` React component (in `@hai3/react`) that renders a mount point for a domain. Mounting and unmounting of extensions is driven by `executeActionsChain()` with lifecycle actions. Shadow DOM utilities from `@hai3/screensets` are available for style isolation within MFE `mount()` implementations.

#### Scenario: ExtensionDomainSlot renders a domain mount point

- **WHEN** an `ExtensionDomainSlot` component is rendered for a domain
- **THEN** it SHALL provide a DOM container element for the domain via a React ref
- **AND** the domain's `ContainerProvider` (a `RefContainerProvider`) SHALL wrap this ref
- **AND** extensions SHALL be mounted into this container via `executeActionsChain()` with `HAI3_ACTION_MOUNT_EXT`
- **AND** the component itself SHALL NOT call `registerDomain()` (domain registration is done by framework-level code)

#### Scenario: Extension unmount on slot removal

- **WHEN** the `ExtensionDomainSlot` component is unmounted from the React tree
- **THEN** it SHALL dispatch `HAI3_ACTION_UNMOUNT_EXT` via `executeActionsChain()` for any mounted extension
- **AND** internally, the runtime calls `lifecycle.unmount(container)` on the MfeEntryLifecycle
- **AND** the MFE SHALL clean up its framework-specific resources

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

// Navigate by mounting the extension on the screen domain
// Screen domain interprets mount as "navigate to this screen"
mfeActions.mountExtension(
  'gts.hai3.mfes.ext.extension.v1~acme.analytics.screens.dashboard.v1',
);
// Note: Instance IDs do NOT end with ~ (only schema/type IDs do)
// Action resolves domain and calls screensetsRegistry.executeActionsChain() with HAI3_ACTION_MOUNT_EXT
// Screen domain replaces current screen with the extension
```

- **WHEN** mounting an extension on a screen domain
- **THEN** the action SHALL resolve the domain and call `screensetsRegistry.executeActionsChain()` with `HAI3_ACTION_MOUNT_EXT` fire-and-forget
- **AND** the screen domain SHALL replace the current screen with the extension

#### Scenario: Navigate away from MFE

```typescript
app.actions.navigateToScreenset({ screensetId: 'local-screenset' });
// Navigation action triggers mount_ext on screen domain with new screenset
// Screen domain swap semantics unmount the previous MFE automatically
// Runtime cleans up bridge subscriptions
```

- **WHEN** navigating away from an MFE screenset
- **THEN** the navigation action SHALL trigger screen domain swap semantics (mount new replaces old)
- **AND** the runtime SHALL clean up all bridge subscriptions for the unmounted MFE

### Requirement: MFE Extension Loading (DRY Principle)

The system SHALL support managing MFE extension lifecycle in any domain using three generic extension lifecycle actions: `load_ext`, `mount_ext`, and `unmount_ext`. Each domain (popup, sidebar, screen, overlay) handles these actions according to its specific layout behavior. This follows the DRY principle - no need for domain-specific action types. See [Extension Lifecycle Actions](../../design/mfe-ext-lifecycle-actions.md) for the complete design.

#### Scenario: MFE requests extension mount into popup domain

```typescript
import { HAI3_ACTION_MOUNT_EXT } from '@hai3/screensets';
import { HAI3_POPUP_DOMAIN } from '@hai3/framework';

// Inside MFE component - bridge executes action chain via registry pass-through
// HAI3_ACTION_MOUNT_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,  // Target domain handles layout behavior
    // The domain's ContainerProvider supplies the DOM container — callers do not pass it.
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.popups.export.v1',
    },
  },
});

// Flow:
// 1. bridge.executeActionsChain() delegates to registry.executeActionsChain() via injected callback
// 2. Registry validates action chain against GTS schema
// 3. ActionsChainsMediator routes chain to target domain
// 4. ExtensionLifecycleActionHandler calls mountExtension callback (OperationSerializer -> MountManager)
// 5. Popup domain handles by showing modal with the extension
```

- **WHEN** an MFE requests mount_ext with popup domain
- **THEN** the bridge (from @hai3/screensets) SHALL validate the action chain
- **AND** the bridge SHALL delegate to `registry.executeActionsChain()` via the injected callback (the bridge is a pass-through, not a router)
- **AND** the domain's `ExtensionLifecycleActionHandler` SHALL call its `mountExtension` callback (OperationSerializer -> MountManager)
- **AND** the popup domain SHALL render the extension as a modal

#### Scenario: MFE requests extension unmount from popup domain

```typescript
import { HAI3_ACTION_UNMOUNT_EXT } from '@hai3/screensets';
import { HAI3_POPUP_DOMAIN } from '@hai3/framework';

// Inside MFE popup -- dismiss/close the popup
// HAI3_ACTION_UNMOUNT_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_UNMOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.popups.export.v1',
    },
  },
});
```

- **WHEN** an MFE requests unmount_ext from popup domain
- **THEN** the parent SHALL unmount the extension from the popup domain
- **AND** the extension's bridge SHALL be disposed

#### Scenario: MFE requests extension preload into sidebar domain

```typescript
import { HAI3_ACTION_LOAD_EXT } from '@hai3/screensets';
import { HAI3_SIDEBAR_DOMAIN } from '@hai3/framework';

// HAI3_ACTION_LOAD_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_SIDEBAR_DOMAIN,  // Target domain handles layout behavior
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.sidebars.quick_stats.v1',
    },
  },
});
```

- **WHEN** an MFE requests load_ext with sidebar domain
- **THEN** the parent SHALL validate the action chain against the action schema
- **AND** the domain's `ExtensionLifecycleActionHandler` SHALL call its `loadExtension` callback (OperationSerializer -> MountManager)
- **AND** the extension's JS bundle SHALL be fetched and cached (no DOM rendering)
- **AND** subsequent mount SHALL be instant

#### Scenario: MFE requests extension mount into sidebar domain

```typescript
import { HAI3_ACTION_MOUNT_EXT } from '@hai3/screensets';
import { HAI3_SIDEBAR_DOMAIN } from '@hai3/framework';

// HAI3_ACTION_MOUNT_EXT is: gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_SIDEBAR_DOMAIN,
    // The domain's ContainerProvider supplies the DOM container — callers do not pass it.
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.sidebars.quick_stats.v1',
    },
  },
});
```

- **WHEN** an MFE requests mount_ext with sidebar domain
- **THEN** the parent SHALL validate the action chain against the action schema
- **AND** the domain's `ExtensionLifecycleActionHandler` SHALL call its `mountExtension` callback (OperationSerializer -> MountManager)
- **AND** the sidebar domain SHALL render the extension as a side panel
- **AND** the extension SHALL render in Shadow DOM

Domain-specific action support validation, domain action support matrix (screen, sidebar, popup, overlay), and `UnsupportedDomainActionError` semantics are defined in the [screensets spec - Domain-Specific Action Support](../screensets/spec.md#requirement-domain-specific-action-support). The three lifecycle action types work for ANY extension domain -- no domain-specific action constants are needed.

### Requirement: MFE Error Handling at Mount Point

The system SHALL handle MFE load and render failures gracefully. Error handling is the responsibility of the domain registration code (via `onInitError` callback on `registerDomain()`) and the actions chain fallback mechanism.

#### Scenario: Load failure triggers fallback chain

- **WHEN** an MFE bundle fails to load during `mount_ext` execution
- **THEN** the actions chain fallback SHALL be executed if defined
- **AND** the `onInitError` callback (if provided at domain registration) SHALL be called for init-stage errors
- **AND** the error SHALL be logged with extension and domain context

#### Scenario: Application-level error UI

- **WHEN** an application needs custom error UI for MFE failures
- **THEN** the application SHALL use the `onInitError` callback and/or actions chain fallback mechanism
- **AND** the application MAY wrap `ExtensionDomainSlot` with its own React error boundary
- **AND** error handling SHALL NOT require framework-provided UI components

### Requirement: MFE Preloading

The system SHALL support preloading MFE bundles before navigation. Preloading uses `loadExtension()` -- it resolves the domain and calls `executeActionsChain()` with `HAI3_ACTION_LOAD_EXT` fire-and-forget. Loading fetches the bundle without mounting.

#### Scenario: Preload usage patterns

- **WHEN** preloading on menu hover
- **THEN** calling `mfeActions.loadExtension(extensionId)` on `onMouseEnter` SHALL fetch the bundle in the background
- **AND** subsequent `mfeActions.mountExtension(extensionId)` on click SHALL be instant (bundle already cached)
- **WHEN** preloading on app startup
- **THEN** calling `mfeActions.loadExtension(extensionId)` in an initialization effect SHALL fetch bundles in the background
- **AND** preloading SHALL be triggered dynamically, NOT via static plugin configuration

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

```

- **WHEN** querying the ScreensetsRegistry
- **THEN** `getExtension(extensionId)` SHALL return the registered extension or undefined
- **AND** `getDomain(domainId)` SHALL return the registered domain or undefined
- **AND** `getExtensionsForDomain(domainId)` SHALL return all extensions for that domain

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
// If host uses React 18.x and MFE built with React 17.x:
// The handler validates shared dependency versions when loading the MFE bundle
try {
  await runtime.executeActionsChain({
    action: { type: HAI3_ACTION_LOAD_EXT, target: domainId, payload: { extensionId } },
  });
} catch (error) {
  // MfeVersionMismatchError is thrown internally by MfeHandlerMF
  console.log(`MFE entry has incompatible deps: ${error.message}`);
}
```

- **WHEN** an MFE has incompatible major version of shared deps
- **THEN** `MfeVersionMismatchError` SHALL be thrown internally by the handler
- **AND** the MFE SHALL NOT be mounted
- **AND** error boundary SHALL display version conflict message

### Requirement: GTS Type Conformance Validation

The system SHALL validate that MFE type IDs conform to HAI3 base types.

#### Scenario: Validate MfManifest type on load

- **WHEN** loading an MFE manifest
- **THEN** the loader SHALL internally validate that the manifest type ID conforms to `gts.hai3.mfes.mfe.mf_manifest.v1~` via `plugin.isTypeOf()`
- **AND** if validation fails, `MfeTypeConformanceError` SHALL be thrown internally

#### Scenario: Validate MfeEntry type on mount

- **WHEN** mounting an entry
- **THEN** the entry type SHALL be validated internally against the expected base type via `plugin.isTypeOf()`
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
  // Domain registration is direct on the registry (synchronous, no Flux action)
  // Each domain requires a ContainerProvider (see mfe-ext-lifecycle-actions.md)
  for (const domain of domains) {
    runtime.registerDomain(domain, containerProviderForDomain(domain.id));
  }
  // Extension registration via Flux actions (with store state tracking)
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
        <ExtensionDomainSlot key={ext.id} domainId={domainId} extensionId={ext.id} />
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

### Requirement: ESLint Flux Protection for Effects

The system SHALL enforce via ESLint that effects files cannot call `executeActionsChain()` or import action modules. This prevents the Flux architecture violation where effects trigger action-like commands.

#### Scenario: Effects file naming convention coverage

- **WHEN** an effects file is named `effects.ts` (lowercase)
- **THEN** the ESLint rules for effects SHALL apply to it
- **AND** the file globs SHALL include both `**/*Effects.ts` and `**/effects.ts` patterns
- **AND** the rules SHALL be enforced in BOTH `screenset.ts` (L4) and `framework.ts` (L2) ESLint configs
- **AND** the monorepo root `eslint.config.js` SHALL NOT disable `no-restricted-syntax` for effects files in the framework package

#### Scenario: Effects cannot call executeActionsChain

- **WHEN** an effects file calls `executeActionsChain()` on any object
- **THEN** ESLint SHALL report a FLUX VIOLATION error
- **AND** the error message SHALL state that effects cannot call `executeActionsChain()` because it triggers the ActionsChainsMediator

#### Scenario: Effects cannot import actions

- **WHEN** an effects file imports from an actions module
- **THEN** ESLint SHALL report a FLUX VIOLATION error
- **AND** the error message SHALL state that effects cannot import actions (circular flow risk)
- **AND** event constants (e.g., `MfeEvents`) SHALL be extracted to a shared constants file so effects can import them without importing from actions
