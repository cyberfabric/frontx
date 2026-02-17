## ADDED Requirements

**Key principle**: This spec defines Flux integration only. All MFE lifecycle management (loading, mounting, bridging) is handled by `@hai3/screensets`. The framework plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Namespace convention**: All HAI3 MFE core infrastructure types use the `gts.hai3.mfes.*` namespace. Layout domain instances use `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.*` namespace.

### Requirement: Microfrontends Plugin

The system SHALL provide a `microfrontends()` plugin in `@hai3/framework` that enables MFE capabilities. Screensets is CORE to HAI3 and is automatically initialized - it is NOT a plugin. The microfrontends plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Key Principles:**
- Screensets is built-in to HAI3 - NOT a `.use()` plugin
- Microfrontends plugin enables MFE capabilities with optional handler configuration
- All MFE registrations (domains, extensions) happen dynamically at runtime via actions/API

#### Scenario: Enable microfrontends in HAI3

**Implementation note**: This scenario describes the target state after Phase 34 implementation. The `microfrontends({ mfeHandlers })` configuration and dynamic registration capabilities are implemented across Phases 32-34.

```typescript
import { createHAI3, microfrontends } from '@hai3/react';
import { MfeHandlerMF } from '@hai3/screensets/mfe/handler'; // Note: The ./mfe/handler subpath export is added in Phase 34.2.2
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

// Screensets is CORE - automatically initialized by createHAI3()
// Microfrontends plugin enables MFE capabilities
const app = createHAI3()
  .use(microfrontends({ mfeHandlers: [new MfeHandlerMF(gtsPlugin)] }))
  .build();

// All domain/extension registration happens dynamically at runtime:
// Extension registration via Flux actions (with store state tracking):
// - mfeActions.registerExtension({ extension })
// Domain registration via runtime API (direct, synchronous):
// - runtime.registerDomain(domain, containerProvider, onInitError?)
```

- **WHEN** building an app with microfrontends plugin
- **THEN** the plugin SHALL enable MFE capabilities
- **AND** screensets SHALL be automatically available (core to HAI3)
- **AND** the plugin SHALL accept an optional configuration object with `mfeHandlers?: MfeHandler[]`
- **AND** all domain and extension registration SHALL happen dynamically at runtime

### Requirement: Theme and Language Propagation via Microfrontends Plugin

The microfrontends plugin SHALL propagate host theme and language changes to all base extension domains, ensuring MFEs receive updates through the bridge property subscription mechanism.

#### Scenario: Theme change propagation to all base domains

- **WHEN** the host application dispatches a `theme/changed` event (with `ChangeThemePayload { themeId: string }`)
- **THEN** the microfrontends plugin SHALL call `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, themeId)` for all 4 base domains (screen, sidebar, popup, overlay)
- **AND** only the theme ID string SHALL be propagated (no Theme objects cross the boundary)
- **AND** all mounted MFE instances subscribed to the theme property SHALL receive the update via their bridge

#### Scenario: Language change propagation to all base domains

- **WHEN** the host application dispatches an `i18n/language/changed` event (with `SetLanguagePayload { language: string }`)
- **THEN** the microfrontends plugin SHALL call `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_LANGUAGE, language)` for all 4 base domains (screen, sidebar, popup, overlay)
- **AND** only the language code string SHALL be propagated (no translation bundles cross the boundary)
- **AND** all mounted MFE instances subscribed to the language property SHALL receive the update via their bridge

#### Scenario: Propagation to unregistered domains is silently skipped

- **WHEN** the microfrontends plugin propagates a theme or language change
- **AND** one or more base domains are not yet registered
- **THEN** the propagation to unregistered domains SHALL be silently skipped (try/catch around each call)
- **AND** propagation to registered domains SHALL proceed normally
- **AND** no error SHALL be thrown or logged for unregistered domains

#### Scenario: Only GTS-defined contract values are propagated

- **WHEN** the microfrontends plugin propagates domain property updates
- **THEN** the propagated values SHALL be GTS-defined contract strings only (theme ID strings like `'dark'`, `'light'`; language code strings like `'en'`, `'de'`)
- **AND** no framework-internal objects (Theme, TranslationBundle, CSS variable maps) SHALL be propagated across the bridge boundary

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
mfeActions.loadExtension(extensionId);
// Fire-and-forget: resolves domain, calls executeActionsChain with HAI3_ACTION_LOAD_EXT
```

- **WHEN** calling `loadExtension` action
- **THEN** it SHALL resolve the extension's domain from the registry
- **AND** it SHALL call `screensetsRegistry.executeActionsChain()` with `HAI3_ACTION_LOAD_EXT` fire-and-forget
- **AND** it SHALL return `void` (no Promise, no await)
- **AND** it SHALL NOT emit any events

#### Scenario: Mount MFE action

```typescript
mfeActions.mountExtension(extensionId);
// Fire-and-forget: resolves domain, calls executeActionsChain with HAI3_ACTION_MOUNT_EXT
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
// eventBus is the HAI3 framework Flux event bus (not the removed screensets EventEmitter)
eventBus.on('mfe/registerExtensionRequested', async ({ extension }) => {
  dispatch(setExtensionRegistering({ extensionId: extension.id }));
  await screensetsRegistry.registerExtension(extension);
  dispatch(setExtensionRegistered({ extensionId: extension.id }));
  // On failure: dispatch setExtensionError
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

The system SHALL track MFE registration states via a store slice using extension IDs. The authoritative load and mount state is tracked internally by the screensets registry (`ExtensionState`). The store slice additionally contains a `mountedExtensions` map that serves as a notification signal for React hook subscriptions -- this is NOT authoritative state but a trigger so that `useExtensionMounted()` and similar hooks can react to mount/unmount transitions.

#### Scenario: Query extension registration state

```typescript
const state = useAppSelector((s) => selectExtensionState(s, extensionId));
// 'unregistered' | 'registering' | 'registered' | 'error'
const registeredExtensions = useAppSelector(selectRegisteredExtensions);
```

- **WHEN** querying MFE registration state
- **THEN** `selectExtensionState()` SHALL accept an extension GTS type ID
- **AND** registration states SHALL be: 'unregistered', 'registering', 'registered', 'error'
- **AND** `selectRegisteredExtensions()` SHALL return list of registered extension IDs

#### Scenario: Store dispatches mount notification signal on mount/unmount

- **WHEN** an extension is successfully mounted via `HAI3_ACTION_MOUNT_EXT`
- **THEN** the mount action handler SHALL dispatch `setExtensionMounted` to the store slice with the extension ID
- **AND** the `mountedExtensions` map in the slice SHALL be updated to map the domain ID to the mounted extension ID
- **AND** React hooks (e.g., `useActivePackage()`, `useRegisteredPackages()`) SHALL re-render in response to this store update
- **WHEN** an extension is unmounted via `HAI3_ACTION_UNMOUNT_EXT`
- **THEN** the unmount action handler SHALL dispatch `setExtensionUnmounted` to the store slice with the extension ID
- **AND** the `mountedExtensions` map entry for that domain ID SHALL be cleared (set to `undefined`)
- **AND** the `mountedExtensions` map SHALL NOT be treated as authoritative mount state -- it is a notification trigger only

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
mfeActions.mountExtension(extensionId);
// Screen domain replaces current screen with the extension (swap semantics)
```

- **WHEN** mounting an extension on a screen domain
- **THEN** the action SHALL resolve the domain and call `screensetsRegistry.executeActionsChain()` with `HAI3_ACTION_MOUNT_EXT` fire-and-forget
- **AND** the screen domain SHALL replace the current screen with the extension

#### Scenario: Navigate away from MFE

```typescript
import { HAI3_ACTION_MOUNT_EXT, HAI3_SCREEN_DOMAIN } from '@hai3/react';

// Mount a different extension on the screen domain (swap semantics)
screensetsRegistry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_SCREEN_DOMAIN,
    payload: { extensionId: 'new-screen-extension-id' },
  },
});
// Screen domain swap semantics: mounting a new extension automatically unmounts the previous one
// Runtime cleans up bridge subscriptions for the unmounted MFE
```

- **WHEN** navigating away from an MFE screen by mounting a different extension on the screen domain
- **THEN** the `HAI3_ACTION_MOUNT_EXT` action SHALL trigger screen domain swap semantics (mount new replaces old)
- **AND** the runtime SHALL clean up all bridge subscriptions for the unmounted MFE

### Requirement: MFE Extension Loading (DRY Principle)

The system SHALL support managing MFE extension lifecycle in any domain using three generic extension lifecycle actions: `load_ext`, `mount_ext`, and `unmount_ext`. Each domain (popup, sidebar, screen, overlay) handles these actions according to its specific layout behavior. This follows the DRY principle - no need for domain-specific action types. See [Extension Lifecycle Actions](../../design/mfe-ext-lifecycle-actions.md) for the complete design.

#### Scenario: MFE requests extension mount into popup domain

```typescript
import { HAI3_ACTION_MOUNT_EXT, HAI3_POPUP_DOMAIN } from '@hai3/react';

// bridge.executeActionsChain() delegates to registry.executeActionsChain() (pass-through)
// The domain's ContainerProvider supplies the DOM container -- callers do not pass it.
await bridge.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: { extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.analytics.popups.export.v1' },
  },
});
```

- **WHEN** an MFE requests mount_ext with popup domain
- **THEN** the bridge SHALL delegate to `registry.executeActionsChain()` via the injected callback (pass-through)
- **AND** the domain's `ExtensionLifecycleActionHandler` SHALL call its `mountExtension` callback (OperationSerializer -> MountManager)
- **AND** the popup domain SHALL render the extension as a modal

#### Scenario: MFE requests extension unmount from popup domain

- **WHEN** an MFE requests unmount_ext from popup domain (same pattern as mount, using `HAI3_ACTION_UNMOUNT_EXT`)
- **THEN** the parent SHALL unmount the extension from the popup domain
- **AND** the extension's bridge SHALL be disposed

#### Scenario: MFE requests extension preload and mount into sidebar domain

The same three lifecycle actions (`load_ext`, `mount_ext`, `unmount_ext`) work for ANY domain. The pattern is identical to the popup example above -- only the target domain constant changes (e.g., `HAI3_SIDEBAR_DOMAIN`).

- **WHEN** an MFE requests load_ext with sidebar domain
- **THEN** the domain's `ExtensionLifecycleActionHandler` SHALL call its `loadExtension` callback (OperationSerializer -> MountManager)
- **AND** the extension's JS bundle SHALL be fetched and cached (no DOM rendering)
- **AND** subsequent mount SHALL be instant
- **WHEN** an MFE requests mount_ext with sidebar domain
- **THEN** the sidebar domain SHALL render the extension as a side panel in Shadow DOM

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
const ANALYTICS_EXTENSION = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.analytics.screens.dashboard.v1';
const extension = runtime.getExtension(ANALYTICS_EXTENSION);
console.log(extension?.domain);     // Domain type ID
console.log(extension?.entry);      // Entry type ID (MfeEntryMF)
console.log(extension?.presentation.label);  // Screen-domain-specific field from derived ScreenExtension type

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
// If host uses React 19.2.0 and MFE built with React 19.1.0:
// Warning logged: "MFE entry 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.dashboard.v1' was built with react@19.1.0, host has 19.2.0"
```

- **WHEN** an MFE is loaded with different shared dependency versions
- **THEN** a warning SHALL be logged in development
- **AND** the warning SHALL include the GTS entry type ID
- **AND** the MFE SHALL still load (minor version differences tolerated)

#### Scenario: Major version mismatch error

```typescript
// If host uses React 19.x and MFE built with React 18.x:
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

> The core registration API (`registerExtension`, `unregisterExtension`, `registerDomain`, `unregisterDomain`) is defined in the [screensets spec - Dynamic Registration Model](../screensets/spec.md#requirement-dynamic-registration-model). This section covers the Flux integration layer that wraps the core API with actions, effects, and store state tracking.

#### Scenario: Register extension via action

```typescript
mfeActions.registerExtension({ id, domain, entry, ...domainFields });
// Emits 'mfe/registerExtensionRequested'; effect calls runtime.registerExtension()
```

- **WHEN** calling `mfeActions.registerExtension(extension)`
- **THEN** it SHALL emit `'mfe/registerExtensionRequested'` event
- **AND** the effect SHALL call `runtime.registerExtension()`
- **AND** it SHALL dispatch `setExtensionRegistered` to slice on success
- **AND** it SHALL dispatch `setExtensionError` on failure

#### Scenario: Unregister extension via action

```typescript
mfeActions.unregisterExtension(extensionId);
// Emits 'mfe/unregisterExtensionRequested'; effect calls runtime.unregisterExtension()
```

- **WHEN** calling `mfeActions.unregisterExtension(extensionId)`
- **THEN** it SHALL emit `'mfe/unregisterExtensionRequested'` event
- **AND** the effect SHALL call `runtime.unregisterExtension()`
- **AND** if MFE is mounted, it SHALL be unmounted first

#### Scenario: Track extension registration state in slice

```typescript
const state = useAppSelector((s) => selectExtensionState(s, extensionId));
const registeredExtensions = useAppSelector(selectRegisteredExtensions);
```

- **WHEN** querying extension registration state
- **THEN** `selectExtensionState()` SHALL return registration status
- **AND** `selectRegisteredExtensions()` SHALL return list of registered extension IDs

#### Scenario: Register extensions from backend (application responsibility)

```typescript
// Entity fetching is OUTSIDE MFE system scope -- application handles this
const { domains, extensions } = await fetchFromBackend();
// Domain registration: direct on registry (synchronous)
for (const domain of domains) runtime.registerDomain(domain, containerProvider);
// Extension registration: via Flux actions (with store state tracking)
for (const ext of extensions) mfeActions.registerExtension(ext);
```

- **WHEN** entities need to be loaded from backend
- **THEN** application code SHALL fetch entities (outside MFE system scope)
- **AND** application code SHALL call `registerDomain()` / `registerExtension()` for each entity
- **AND** the MFE system SHALL NOT provide fetch/refresh methods

#### Scenario: Observe domain extensions via store slice

```typescript
const extensions = useDomainExtensions(domainId);
// Re-renders when extensions are registered/unregistered for this domain
```

- **WHEN** using `useDomainExtensions(domainId)` hook
- **THEN** it SHALL subscribe to store changes to detect registration state updates
- **AND** it SHALL call `runtime.getExtensionsForDomain(domainId)` to resolve the current extension list
- **AND** it SHALL trigger re-render when the extension list for the domain changes
- **AND** it SHALL return the current list of extensions for the domain

### Requirement: No Monorepo Tooling Exclusions for MFE Packages

MFE packages under `src/mfe_packages/` are app-level (L4) code and MUST follow ALL monorepo rules. No tooling exclusions are permitted.

#### Scenario: ESLint applies to MFE packages

- **WHEN** linting MFE packages under `src/mfe_packages/`
- **THEN** all monorepo ESLint rules SHALL apply, including `no-inline-styles`
- **AND** `src/mfe_packages/**` SHALL NOT be added to any ESLint ignore pattern
- **AND** ESLint layer enforcement rules SHALL apply (MFE packages are L4)

#### Scenario: dependency-cruiser applies to MFE packages

- **WHEN** running dependency-cruiser on the codebase
- **THEN** `src/mfe_packages` SHALL NOT be excluded from dependency analysis
- **AND** layer enforcement SHALL catch violations (e.g., importing `@hai3/screensets` instead of `@hai3/react`)

#### Scenario: knip applies to MFE packages

- **WHEN** running knip for dead code detection
- **THEN** `src/mfe_packages/**` SHALL NOT be added to any knip ignore pattern
- **AND** `@originjs/vite-plugin-federation` SHALL NOT be added to `ignoreDependencies`
- **AND** MFE package dependencies SHALL be tracked normally

#### Scenario: tsconfig includes MFE packages

- **WHEN** compiling TypeScript
- **THEN** `src/mfe_packages` SHALL NOT be excluded from the tsconfig `exclude` array
- **AND** MFE package code SHALL be type-checked alongside all other app-level code

### Requirement: MFE Layer Enforcement

MFE packages SHALL be L4 (app-level) and MUST ONLY import from `@hai3/react` (L3). They SHALL NOT import from `@hai3/screensets` (L1) or `@hai3/framework` (L2) directly.

#### Scenario: MFE imports from @hai3/react only

- **WHEN** an MFE package imports HAI3 types or utilities
- **THEN** the import SHALL come from `@hai3/react` (L3)
- **AND** the import SHALL NOT come from `@hai3/screensets` (L1)
- **AND** the import SHALL NOT come from `@hai3/framework` (L2)

#### Scenario: ESLint catches L1/L2 imports from MFE packages

- **WHEN** an MFE package under `src/mfe_packages/` imports from `@hai3/screensets` or `@hai3/framework`
- **THEN** ESLint layer rules SHALL report a violation
- **AND** the violation message SHALL indicate that MFE packages (L4) can only import from `@hai3/react` (L3)

#### Scenario: All public symbols available via @hai3/react

- **WHEN** an MFE package needs to use `MfeEntryLifecycle`, `ChildMfeBridge`, Shadow DOM utilities, or any other MFE symbol
- **THEN** these symbols SHALL be available as re-exports from `@hai3/react`
- **AND** no direct import from `@hai3/screensets` or `@hai3/framework` SHALL be necessary

### Requirement: hello-world-mfe Uses Tailwind, UIKit, Domain Properties, and Presentation Metadata

The hello-world-mfe package SHALL use Tailwind CSS classes, UIKit components, bridge domain properties for theme/language, and extension presentation metadata for menu integration.

#### Scenario: hello-world-mfe uses Tailwind classes

- **WHEN** rendering the HelloWorld MFE component
- **THEN** the component SHALL use Tailwind CSS utility classes for all styling
- **AND** the component SHALL NOT use inline styles (no `style` prop or `style` attribute)

#### Scenario: hello-world-mfe uses UIKit components

- **WHEN** rendering UI elements in the HelloWorld MFE
- **THEN** the component SHALL use `@hai3/uikit` components where applicable
- **AND** the UIKit styles SHALL be initialized inside the MFE's Shadow DOM at mount time

#### Scenario: hello-world-mfe includes Tailwind and UIKit in shared config

- **WHEN** configuring the hello-world-mfe Module Federation remote
- **THEN** the `shared` config in `vite.config.ts` SHALL include `tailwindcss` with `singleton: false`
- **AND** the `shared` config SHALL include `@hai3/uikit` with `singleton: false`

#### Scenario: hello-world-mfe entry declares required properties

- **WHEN** defining the hello-world-mfe entry in `mfe.json`
- **THEN** the entry's `requiredProperties` SHALL include `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`
- **AND** the entry's `requiredProperties` SHALL include `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`

#### Scenario: hello-world-mfe extension declares presentation metadata

- **WHEN** defining the hello-world-mfe extension in `mfe.json`
- **THEN** the extension SHALL include a `presentation` field with `label`, `route`, and optionally `icon` and `order`
- **AND** the presentation metadata SHALL drive the nav menu item for this screen

#### Scenario: hello-world-mfe consumes theme from bridge

- **WHEN** the hello-world-mfe is mounted
- **THEN** the lifecycle implementation SHALL subscribe to the theme domain property via `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_THEME, callback)`
- **AND** the component SHALL apply CSS variables inside its Shadow DOM based on the theme value
- **AND** theme changes SHALL be reflected immediately without remounting

#### Scenario: hello-world-mfe consumes language from bridge

- **WHEN** the hello-world-mfe is mounted
- **THEN** the lifecycle implementation SHALL subscribe to the language domain property via `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_LANGUAGE, callback)`
- **AND** the component SHALL apply text direction and localization based on the language value

#### Scenario: hello-world-mfe works inside Shadow DOM

- **WHEN** the hello-world-mfe is mounted by `MfeHandlerMF`
- **THEN** the MFE SHALL render correctly inside the Shadow DOM container
- **AND** all styles SHALL be scoped to the shadow root
- **AND** no styles SHALL leak to or from the host application

#### Scenario: hello-world-mfe imports from @hai3/react only

- **WHEN** the hello-world-mfe imports HAI3 types or utilities
- **THEN** all imports SHALL come from `@hai3/react` (L3)
- **AND** no imports SHALL come from `@hai3/screensets` (L1) or `@hai3/framework` (L2)

### Requirement: Full Demo Screenset Conversion to MFE Package

The legacy demo screenset (4 screens: HelloWorld, Profile, CurrentTheme, UIKitElements) SHALL be fully converted into a single `demo-mfe` package following the ONE SCREENSET = ONE MFE principle. Each screen becomes an entry within the consolidated package.

#### Scenario: Demo screenset becomes one MFE package with 4 entries

- **WHEN** converting the legacy demo screenset
- **THEN** a single `src/mfe_packages/demo-mfe/` package SHALL be created
- **AND** the package SHALL have 1 manifest (single Module Federation remote, single `remoteEntry.js`)
- **AND** the package SHALL have 4 entries, each with its own `exposedModule` (`./lifecycle-helloworld`, `./lifecycle-profile`, `./lifecycle-theme`, `./lifecycle-uikit`)
- **AND** the package SHALL have 4 extensions, each targeting the screen domain and pointing to its respective entry
- **AND** shared internals (i18n helpers, common hooks, shared styles) SHALL live in `demo-mfe/src/shared/`
- **AND** navigation between screens SHALL be host-controlled via `mount_ext` actions (no internal routing)
- **AND** the package SHALL have a single `vite.config.ts`, `mfe.json`, `package.json`, `tsconfig.json`

#### Scenario: Each MFE carries its own i18n files

- **WHEN** an MFE package requires localization
- **THEN** the MFE SHALL bundle its own i18n translation files (e.g., `src/i18n/en.json`, `src/i18n/de.json`, etc.)
- **AND** the MFE SHALL subscribe to the language domain property and load the appropriate translations
- **AND** the MFE SHALL NOT rely on the host's i18n registry

#### Scenario: Each MFE entry declares required properties

- **WHEN** defining an MFE entry in `mfe.json`
- **THEN** the entry's `requiredProperties` SHALL include `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE`
- **AND** the contract validation SHALL pass because the base extension domains declare both properties

#### Scenario: Each extension carries presentation metadata

- **WHEN** defining an extension in `mfe.json`
- **THEN** the extension SHALL include `presentation` with `label`, `icon`, `route`, and `order`
- **AND** the host nav menu SHALL auto-populate from these fields

#### Scenario: Host app registers all MFE extensions

- **WHEN** the host app initializes
- **THEN** it SHALL register all MFE extensions from their `mfe.json` files
- **AND** the nav menu SHALL display items for all registered screen extensions, sorted by `presentation.order`
- **AND** clicking a menu item SHALL trigger `mount_ext` for the corresponding extension
- **AND** the screen domain swap semantics SHALL handle transitions between screens

#### Scenario: All MFE packages follow L4 rules

- **WHEN** any MFE package under `src/mfe_packages/` is built or linted
- **THEN** the MFE SHALL import only from `@hai3/react` (L3)
- **AND** all monorepo tooling rules SHALL apply (ESLint, dependency-cruiser, knip, tsconfig)

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
