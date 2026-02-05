# Implementation Tasks

## Progress Summary

**Current Status**: Phase 4 Complete - ScreensetsRegistry with Plugin Implemented

---

## Phase 1: Type System Plugin Infrastructure ✓

**Goal**: Define the TypeSystemPlugin interface and supporting types.

**Status**: COMPLETE

### 1.1 Define Plugin Interface

- [x] 1.1.1 Create `TypeSystemPlugin` interface in `packages/screensets/src/mfe/plugins/types.ts`
- [x] 1.1.2 Define `ValidationResult` and `ValidationError` interfaces
- [x] 1.1.3 Define `CompatibilityResult` and `CompatibilityChange` interfaces
- [x] 1.1.4 Define `AttributeResult` interface for attribute access
- [x] 1.1.5 Export plugin interface from `@hai3/screensets`

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

### 1.2 Define Plugin Method Signatures

- [x] 1.2.1 Define type ID operation method signatures (`isValidTypeId`, `parseTypeId`) - Note: `buildTypeId` omitted because GTS type IDs are consumed but never programmatically generated; all type IDs are defined as string constants
- [x] 1.2.2 Define schema registry method signatures (`registerSchema`, `validateInstance`, `getSchema`)
- [x] 1.2.3 Define query method signature (`query`)
- [x] 1.2.4 Define required compatibility method signature (`checkCompatibility`)
- [x] 1.2.5 Define attribute access method signature (`getAttribute`)

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

---

## Phase 2: GTS Plugin Implementation

**Goal**: Implement the GTS plugin as the default Type System implementation using the REAL `@globaltypesystem/gts-ts` package.

**Status**: COMPLETE (RE-IMPLEMENTED)

### 2.1 Create GTS Plugin

- [x] 2.1.1 Create `packages/screensets/src/mfe/plugins/gts/index.ts`
- [x] 2.1.2 Implement `isValidTypeId()` using standalone `isValidGtsID()` function
- [x] 2.1.3 Implement `parseTypeId()` using standalone `parseGtsID()` function (returns ParseResult with segments array)
- [x] 2.1.4 Implement `registerSchema()` using `GtsStore.register(entity)` with `createJsonEntity()`
- [x] 2.1.5 Implement `validateInstance()` using `GtsStore.validateInstance(gtsId)`
- [x] 2.1.6 Implement `getSchema()` using `GtsStore.get(typeId)` returning JsonEntity
- [x] 2.1.7 Implement `query()` using `GtsQuery.query(store, pattern, limit)`
- [x] 2.1.8 Implement `checkCompatibility()` using `GtsStore.checkCompatibility()`
- [x] 2.1.9 Implement `getAttribute()` using `GtsStore.getAttribute()`
- [x] 2.1.10 Import from `@globaltypesystem/gts-ts`: `isValidGtsID`, `parseGtsID`, `GtsStore`, `GtsQuery`, `createJsonEntity`
- [x] 2.1.11 Register all first-class citizen schemas during construction (built-in approach)

Note: `buildTypeId()` was intentionally omitted from the plugin interface because GTS type IDs are consumed (validated, parsed) but never programmatically generated at runtime. All type IDs are defined as string constants.

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, spec line 21

### 2.2 Export GTS Plugin

- [x] 2.2.1 Export `createGtsPlugin()` factory function
- [x] 2.2.2 Export `gtsPlugin` singleton instance
- [x] 2.2.3 Configure package.json exports for `@hai3/screensets/plugins/gts`
- [x] 2.2.4 Add `@globaltypesystem/gts-ts` as a proper dependency (NOT optional)

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.3 GTS Plugin Tests

- [x] 2.3.1 Test `isValidTypeId()` accepts valid GTS type IDs
- [x] 2.3.2 Test `isValidTypeId()` rejects invalid formats (missing segments, no tilde, no version prefix)
- [x] 2.3.3 Test `parseTypeId()` returns correct components
- [x] 2.3.4 Test schema registration and validation
- [x] 2.3.5 Test query operations
- [x] 2.3.6 Test `checkCompatibility()` returns proper CompatibilityResult
- [x] 2.3.7 Test `getAttribute()` resolves attributes correctly

Note: `buildTypeId()` test was removed because the method was intentionally omitted from the interface. GTS type IDs are consumed but never programmatically generated.

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, GTS type ID validation

---

## Phase 3: Internal TypeScript Types

**Goal**: Define internal TypeScript types for MFE architecture with simple `id: string` field.

### 3.1 Define MFE TypeScript Interfaces

**Core Types (8 types):**
- [x] 3.1.1 Create `MfeEntry` interface (id, requiredProperties, optionalProperties, actions, domainActions)
- [x] 3.1.2 Create `ExtensionDomain` interface (id, sharedProperties, actions, extensionsActions, extensionsUiMeta, defaultActionTimeout, lifecycleStages, extensionsLifecycleStages, lifecycle?)
- [x] 3.1.3 Create `Extension` interface (id, domain, entry, uiMeta, lifecycle?)
- [x] 3.1.4 Create `SharedProperty` interface (id, value)
- [x] 3.1.5 Create `Action` interface (type, target, payload?, timeout?)
- [x] 3.1.6 Create `ActionsChain` interface (action: Action, next?: ActionsChain, fallback?: ActionsChain) - no id field
- [x] 3.1.6a Create `LifecycleStage` interface (id, description?)
- [x] 3.1.6b Create `LifecycleHook` interface (stage, actions_chain)

**Module Federation Types (2 types):**
- [x] 3.1.7 Create `MfManifest` interface (id, remoteEntry, remoteName, sharedDependencies?, entries?)
- [x] 3.1.8 Create `MfeEntryMF` interface (extends MfeEntry, manifest, exposedModule)
- [x] 3.1.9 Export types from `packages/screensets/src/mfe/types/`

**Traceability**: Requirement "MFE TypeScript Type System" - Type identifier

### 3.2 Create GTS JSON Schemas

**Core Type Schemas (8 types):**
- [x] 3.2.1 Create schema for `gts.hai3.screensets.mfe.entry.v1~` with id field
- [x] 3.2.2 Create schema for `gts.hai3.screensets.ext.domain.v1~` with id, defaultActionTimeout (required), lifecycleStages, extensionsLifecycleStages fields
- [x] 3.2.3 Create schema for `gts.hai3.screensets.ext.extension.v1~` with id field
- [x] 3.2.4 Create schema for `gts.hai3.screensets.ext.shared_property.v1~` with id and value fields
- [x] 3.2.5 Create schema for `gts.hai3.screensets.ext.action.v1~` with type, target, timeout (optional) fields (no id)
- [x] 3.2.6 Create schema for `gts.hai3.screensets.ext.actions_chain.v1~` with $ref syntax (no id field)
- [x] 3.2.6a Create schema for `gts.hai3.screensets.ext.lifecycle_stage.v1~` with id, description? fields
- [x] 3.2.6b Create schema for `gts.hai3.screensets.ext.lifecycle_hook.v1~` with stage, actions_chain fields

**Module Federation Schemas (2 types):**
- [x] 3.2.7 Create schema for `gts.hai3.screensets.mfe.mf.v1~` (MfManifest) with id field
- [x] 3.2.8 Create schema for `gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~` (MfeEntryMF derived)
- [x] 3.2.9 Export schemas from `packages/screensets/src/mfe/schemas/gts-schemas.ts`

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type registration via plugin

### 3.3 HAI3 Type Constants (Reference Only)

- [x] 3.3.1 Define `HAI3_CORE_TYPE_IDS` constant with 8 core GTS type IDs (reference only)
- [x] 3.3.2 Define `HAI3_MF_TYPE_IDS` constant with 2 Module Federation GTS type IDs (reference only)
- [x] 3.3.3 Define `HAI3_LIFECYCLE_STAGE_IDS` constant with 4 default lifecycle stage GTS type IDs (reference only)
- [x] 3.3.4 Document that all first-class schemas are built into GTS plugin during construction (no registerHai3Types function needed)
- [x] 3.3.5 Export type ID constants from `@hai3/screensets` for convenience

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type availability via plugin (built-in)

---

## Phase 4: ScreensetsRegistry with Plugin ✓

**Goal**: Implement the ScreensetsRegistry with required Type System plugin at initialization.

**Status**: COMPLETE

### 4.1 Runtime Configuration

- [x] 4.1.1 Create `ScreensetsRegistryConfig` interface
- [x] 4.1.2 Add required `typeSystem` parameter
- [x] 4.1.3 Add optional `onError`, `loadingComponent`, `errorFallbackComponent`, `debug`, `mfeHandler`, `parentBridge` parameters
- [x] 4.1.4 Implement `createScreensetsRegistry(config)` factory

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin requirement at initialization

### 4.2 ScreensetsRegistry Core with Plugin

- [x] 4.2.1 Create `ScreensetsRegistry` class
- [x] 4.2.2 Store plugin reference as `readonly typeSystem`
- [x] 4.2.3 Verify first-class schemas are available (built into plugin during construction)
- [x] 4.2.4 Throw error if plugin is missing

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin requirement at initialization

### 4.3 Type ID Validation via Plugin

- [x] 4.3.1 Validate target type ID via `plugin.isValidTypeId()` before chain execution
- [x] 4.3.2 Validate action type ID via `plugin.isValidTypeId()` before chain execution
- [x] 4.3.3 Return validation error if type IDs are invalid

**Traceability**: Requirement "Actions Chain Mediation" - Action chain type ID validation

### 4.4 Payload Validation via Plugin

- [x] 4.4.1 Validate payload via `plugin.validateInstance()` before delivery
- [x] 4.4.2 Use action's registered payloadSchema for validation
- [x] 4.4.3 Return validation error details on failure

**Traceability**: Requirement "Actions Chain Mediation" - Action payload validation via plugin

---

## Phase 5: Contract Matching Validation

**Goal**: Implement contract compatibility checking between entries and domains.

### 5.1 Contract Matching Algorithm

- [ ] 5.1.1 Implement `validateContract(entry, domain)` function
- [ ] 5.1.2 Implement required properties subset check (Rule 1)
- [ ] 5.1.3 Implement entry actions subset check (Rule 2)
- [ ] 5.1.4 Implement domain actions subset check (Rule 3)
- [ ] 5.1.5 Create `ContractValidationResult` type with error details

**Traceability**: Requirement "Contract Matching Validation" - Valid contract matching

### 5.2 Contract Error Types

- [ ] 5.2.1 Implement `missing_property` error type
- [ ] 5.2.2 Implement `unsupported_action` error type
- [ ] 5.2.3 Implement `unhandled_domain_action` error type
- [ ] 5.2.4 Create human-readable error message formatter

**Traceability**: Requirement "Contract Matching Validation" - error scenarios

### 5.3 Contract Validation Tests

- [ ] 5.3.1 Test valid contract matching scenario
- [ ] 5.3.2 Test missing required property scenario
- [ ] 5.3.3 Test unsupported entry action scenario
- [ ] 5.3.4 Test unhandled domain action scenario
- [ ] 5.3.5 Test optional properties not blocking registration

**Traceability**: Requirement "Contract Matching Validation" - all scenarios

---

## Phase 6: Dynamic uiMeta Validation via Pre-registered Domain Schemas

**Goal**: Implement runtime validation of Extension's uiMeta against domain's extensionsUiMeta using the pre-registration pattern.

### 6.1 Domain Schema Pre-registration

- [ ] 6.1.1 Implement domain registration to pre-register extensionsUiMeta schema with convention-based ID
- [ ] 6.1.2 Use convention-based ID format: `{domainId}@extensionsUiMeta`
- [ ] 6.1.3 Register extensionsUiMeta schema with $id containing the convention-based ID

**Traceability**: Requirement "Dynamic uiMeta Validation" - Domain registration pre-registers extensionsUiMeta schema

### 6.2 uiMeta Validation Implementation

- [ ] 6.2.1 Implement `validateExtensionUiMeta(plugin, extension)` function
- [ ] 6.2.2 Build convention-based schema ID from extension.domain
- [ ] 6.2.3 Create unique instance ID for extension's uiMeta
- [ ] 6.2.4 Register uiMeta instance with $schema pointing to pre-registered schema
- [ ] 6.2.5 Validate using standard `validateInstance()` via GTS store
- [ ] 6.2.6 Transform validation errors to include uiMeta context

**Traceability**: Requirement "Dynamic uiMeta Validation" - uiMeta validation via pre-registered domain schemas

### 6.3 uiMeta Validation Tests

- [ ] 6.3.1 Test successful uiMeta validation
- [ ] 6.3.2 Test uiMeta validation failure
- [ ] 6.3.3 Test uiMeta validation with derived domains
- [ ] 6.3.4 Test pre-registered schema is available after domain registration
- [ ] 6.3.5 Test convention-based schema ID format

**Traceability**: Requirement "Dynamic uiMeta Validation" - all scenarios

---

## Phase 7: Framework Plugin Propagation

**Goal**: Propagate Type System plugin through @hai3/framework layers.

### 7.1 Framework Microfrontends Plugin

- [ ] 7.1.1 Implement `microfrontends()` plugin factory with NO configuration parameters

**Traceability**: Requirement "Framework Plugin Propagation" - Framework microfrontends plugin (zero-config)

### 7.2 Base Domains Definition

- [ ] 7.2.1 Create `createSidebarDomain()` factory returning domain instance
- [ ] 7.2.2 Create `createPopupDomain()` factory returning domain instance
- [ ] 7.2.3 Create `createScreenDomain()` factory returning domain instance
- [ ] 7.2.4 Create `createOverlayDomain()` factory returning domain instance
- [ ] 7.2.5 Document that domains are registered via `runtime.registerDomain()` at runtime, NOT at plugin init

**Traceability**: Requirement "Framework Plugin Propagation" - Base domains (dynamic registration via runtime)

### 7.3 Plugin Propagation

- [ ] 7.3.1 Pass plugin to `createScreensetsRegistry()` in setup
- [ ] 7.3.2 Expose runtime via `framework.provide('screensetsRegistry', runtime)`
- [ ] 7.3.3 Ensure same plugin instance is used throughout

**Traceability**: Requirement "Framework Plugin Propagation" - Plugin consistency across layers

### 7.4 Framework Plugin Tests

- [ ] 7.4.1 Test microfrontends() accepts no parameters
- [ ] 7.4.2 Test microfrontends({ anything }) throws error
- [ ] 7.4.3 Test plugin obtains screensetsRegistry from framework
- [ ] 7.4.4 Test runtime.registerDomain() works for base domains at runtime

**Traceability**: Requirement "Framework Plugin Propagation" - all scenarios (zero-config, dynamic registration)

---

## Phase 8: Instance-Level Isolation (Default Behavior)

**Goal**: Implement instance-level isolation between host and MFE instances (default handler behavior).

### 8.1 State Container Factory

- [ ] 8.1.1 Create `createMfeStateContainer()` factory function
- [ ] 8.1.2 Ensure each call creates independent store instance (default handler behavior)
- [ ] 8.1.3 Implement store disposal on MFE unmount
- [ ] 8.1.4 Add store isolation verification tests

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - MFE state isolation

### 8.2 Shared Properties Injection

- [ ] 8.2.1 Create `SharedPropertiesProvider` component
- [ ] 8.2.2 Implement read-only property passing via props
- [ ] 8.2.3 Implement property update propagation from host
- [ ] 8.2.4 Add tests for property isolation (no direct modification)

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - Shared properties propagation

### 8.3 Host State Protection

- [ ] 8.3.1 Verify MFE cannot access host store directly
- [ ] 8.3.2 Implement boundary enforcement
- [ ] 8.3.3 Add integration tests for state isolation

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - Host state isolation

### 8.4 WeakMap-Based Runtime Coordination

- [ ] 8.4.1 Create `packages/screensets/src/mfe/coordination/index.ts`
- [ ] 8.4.2 Define module-level `runtimeConnections: WeakMap<Element, RuntimeConnection>`
- [ ] 8.4.3 Define `RuntimeConnection` interface with `hostRuntime` and `bridges` Map
- [ ] 8.4.4 Implement `registerRuntime(container: Element, connection: RuntimeConnection)` function
- [ ] 8.4.5 Implement `getRuntime(container: Element): RuntimeConnection | undefined` function
- [ ] 8.4.6 Implement `unregisterRuntime(container: Element)` function
- [ ] 8.4.7 Add tests verifying no window global pollution
- [ ] 8.4.8 Add tests verifying automatic garbage collection with WeakMap

**Traceability**: Requirement "Internal Runtime Coordination" - WeakMap-based coordination

---

## Phase 9: Actions Chain Mediation

**Goal**: Implement ActionsChainsMediator for action chain execution logic.

### 9.1 ActionsChainsMediator Implementation

- [ ] 9.1.1 Create `ActionsChainsMediator` class with `executeActionsChain(chain, options?)` method
- [ ] 9.1.2 Implement target resolution (domain or entry instance)
- [ ] 9.1.3 Implement action validation against target contract
- [ ] 9.1.4 Implement success path (execute `next` chain)
- [ ] 9.1.5 Implement failure path (execute `fallback` chain)
- [ ] 9.1.6 Implement termination (no next/fallback)
- [ ] 9.1.7 Implement `ChainResult` return type
- [ ] 9.1.8 Implement `ChainExecutionOptions` interface with ONLY `chainTimeout` (no action-level options)
- [ ] 9.1.9 Implement `deliver(chain, options?)` method with chain-level execution options
- [ ] 9.1.10 Implement timeout resolution from type definitions: `action.timeout ?? domain.defaultActionTimeout`
- [ ] 9.1.11 On timeout: execute fallback chain if defined (same as any other failure)

**Traceability**: Requirement "Actions Chain Mediation" - success/failure/termination scenarios, Requirement "Explicit Timeout Configuration"

### 9.2 Extension Registration with Mediator

- [ ] 9.2.1 Implement `registerExtensionHandler()` method in ActionsChainsMediator
- [ ] 9.2.2 Implement `unregisterExtensionHandler()` method in ActionsChainsMediator
- [ ] 9.2.3 Handle pending actions on unregistration
- [ ] 9.2.4 Add registration/unregistration tests

**Traceability**: Requirement "Actions Chain Mediation" - Extension registration/unregistration

### 9.3 ActionsChainsMediator Tests

- [ ] 9.3.1 Test action chain success path execution
- [ ] 9.3.2 Test action chain failure path execution
- [ ] 9.3.3 Test chain termination scenarios
- [ ] 9.3.4 Test type ID validation via plugin
- [ ] 9.3.5 Test payload validation via plugin
- [ ] 9.3.6 Test extension handler lifecycle (register/unregister)
- [ ] 9.3.7 Test timeout resolution uses domain.defaultActionTimeout when action.timeout not specified
- [ ] 9.3.8 Test timeout resolution uses action.timeout when specified (overrides domain default)
- [ ] 9.3.9 Test timeout triggers fallback chain execution (same as any other failure)
- [ ] 9.3.10 Test ChainExecutionOptions only accepts chainTimeout (no action-level options)

**Traceability**: Requirement "Actions Chain Mediation" - all scenarios, Requirement "Explicit Timeout Configuration"

---

## Phase 10: Base Layout Domains

**Goal**: Define and implement HAI3's base extension domains via plugin.

### 10.1 Define Base Domain Contracts

- [ ] 10.1.1 Define sidebar domain: `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.sidebar.v1~`
- [ ] 10.1.2 Define popup domain: `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1~`
- [ ] 10.1.3 Define screen domain: `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.screen.v1~`
- [ ] 10.1.4 Define overlay domain: `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.overlay.v1~`

**Traceability**: Requirement "Hierarchical Extension Domains" - Base layout domains

### 10.2 Implement Domain Registration

- [ ] 10.2.1 Create domain registry with GTS type IDs
- [ ] 10.2.2 Implement `registerDomain()` for vendor domains
- [ ] 10.2.3 Implement domain contract validation at registration
- [ ] 10.2.4 Add tests for domain registration with GTS plugin

**Traceability**: Requirement "Hierarchical Extension Domains" - Vendor-defined domain

### 10.3 Implement Domain Rendering

- [ ] 10.3.1 Create `ExtensionDomainSlot` component
- [ ] 10.3.2 Implement extension rendering within slot
- [ ] 10.3.3 Handle nested domain rendering
- [ ] 10.3.4 Add integration tests for nested mounting

**Traceability**: Requirement "Hierarchical Extension Domains" - Nested extension mounting

---

## Phase 11: MFE Loading and Error Handling

**Goal**: Implement MFE bundle loading with error handling.

### 11.1 MFE Handler and Bridge Factory

- [ ] 11.1.1 Implement `MfeBridgeFactory` abstract class in `packages/screensets/src/mfe/handler/types.ts`
- [ ] 11.1.2 Implement `MfeBridgeFactoryDefault` class that creates thin bridges
- [ ] 11.1.3 Implement `MfeHandler` abstract class with `canHandle()`, `bridgeFactory`, `handledBaseTypeId`
- [ ] 11.1.4 Implement `MfeHandlerMF` class extending `MfeHandler`
- [ ] 11.1.5 Implement `load(entry: MfeEntryMF)` method in `MfeHandlerMF`
- [ ] 11.1.6 Implement manifest resolution and caching in `MfeHandlerMF`
- [ ] 11.1.7 Implement Module Federation container loading
- [ ] 11.1.8 Implement `preload(entry)` method in `MfeHandlerMF`

**Traceability**: Requirement "MFE Loading via MfeEntryMF and MfManifest"

### 11.2 Error Handling

- [ ] 11.2.1 Implement fallback UI for load failures
- [ ] 11.2.2 Implement retry mechanism
- [ ] 11.2.3 Implement contract validation error display with type ID context
- [ ] 11.2.4 Implement action handler error logging with plugin details

**Traceability**: Requirement "MFE Error Handling" - all error scenarios

### 11.3 Error Handling Tests

- [ ] 11.3.1 Test bundle load failure scenario
- [ ] 11.3.2 Test contract validation failure at load time
- [ ] 11.3.3 Test action handler error scenario
- [ ] 11.3.4 Test retry functionality

**Traceability**: Requirement "MFE Error Handling" - all scenarios

---

## Phase 12: Integration and Documentation

**Goal**: Integrate all components and create documentation.

### 12.1 Integration Testing

- [ ] 12.1.1 Create end-to-end test with mock MFE using GTS plugin
- [ ] 12.1.2 Test full lifecycle: load, mount, action chain, unmount
- [ ] 12.1.3 Test multiple MFEs in different domains
- [ ] 12.1.4 Performance testing for action chain execution
- [ ] 12.1.5 Test custom plugin integration

**Traceability**: Requirement "Type System Plugin Abstraction" - Custom plugin implementation

### 12.2 Documentation

- [ ] 12.2.1 Update `.ai/targets/SCREENSETS.md` with MFE architecture and Type System plugin
- [ ] 12.2.2 Create MFE vendor development guide
- [ ] 12.2.3 Document `TypeSystemPlugin` interface (note: checkCompatibility is REQUIRED)
- [ ] 12.2.4 Document GTS plugin usage (`gtsPlugin`) and type schemas
- [ ] 12.2.5 Create custom plugin implementation guide
- [ ] 12.2.6 Create example MFE implementation with GTS plugin
- [ ] 12.2.7 Document opaque type ID principle (call plugin.parseTypeId when metadata needed)
- [ ] 12.2.8 Document ActionsChain containing Action instances (not type ID references)

**Traceability**: Requirement "Type System Plugin Abstraction" - all scenarios

### 12.3 Final Validation

- [ ] 12.3.1 Run `npm run type-check` - must pass
- [ ] 12.3.2 Run `npm run lint` - must pass
- [ ] 12.3.3 Run `npm run test` - must pass
- [ ] 12.3.4 Run `npm run build` - must pass

---

## Phase 13: @hai3/framework Microfrontends Plugin

**Goal**: Implement the microfrontends plugin that wires ScreensetsRegistry into Flux data flow.

### 13.1 Plugin Infrastructure

- [ ] 13.1.1 Create `packages/framework/src/plugins/microfrontends/index.ts`
- [ ] 13.1.2 Implement `microfrontends()` plugin factory with NO configuration parameters
- [ ] 13.1.3 Add test verifying that `microfrontends({ anything })` throws an error - plugin accepts NO config
- [ ] 13.1.4 Verify screensetsRegistry is available from framework
- [ ] 13.1.5 Export plugin from `@hai3/framework`

**Traceability**: Requirement "Microfrontends Plugin" - Plugin registration (zero-config)

### 13.2 MFE Actions

- [ ] 13.2.1 Create `packages/framework/src/plugins/microfrontends/actions.ts`
- [ ] 13.2.2 Implement `loadExtension(extensionId)` action - emits `'mfe/loadRequested'` event
- [ ] 13.2.3 Implement `preloadExtension(extensionId)` action - emits `'mfe/preloadRequested'` event
- [ ] 13.2.4 Implement `mountExtension(extensionId)` action - emits `'mfe/mountRequested'` event
- [ ] 13.2.5 Implement `handleMfeHostAction(extensionId, actionTypeId, payload)` action
- [ ] 13.2.6 Export actions as `mfeActions` from plugin

**Traceability**: Requirement "MFE Actions" - Load, preload, mount, and host action

### 13.3 MFE Effects

- [ ] 13.3.1 Create `packages/framework/src/plugins/microfrontends/effects.ts`
- [ ] 13.3.2 Implement load effect - subscribes to `'mfe/loadRequested'`, calls `runtime.loadExtension()`
- [ ] 13.3.3 Implement preload effect - subscribes to `'mfe/preloadRequested'`, calls `runtime.preloadExtension()`
- [ ] 13.3.4 Implement mount effect - subscribes to `'mfe/mountRequested'`, calls `runtime.mountExtension()` (auto-loads if needed)
- [ ] 13.3.5 Implement host action effect - handles load_ext/unload_ext for popup, sidebar, overlay, and custom domains
- [ ] 13.3.6 Implement unmount effect - cleans up on domain unload

**Traceability**: Requirement "MFE Effects" - Event handlers and runtime calls

### 13.4 MFE Slice

- [ ] 13.4.1 Create `packages/framework/src/plugins/microfrontends/slice.ts`
- [ ] 13.4.2 Define `MfeState` interface with load and mount states per extension ID
- [ ] 13.4.3 Implement `setLoading`, `setBundleLoaded`, `setError` reducers for load state
- [ ] 13.4.4 Implement `setMounting`, `setMounted`, `setUnmounted` reducers for mount state
- [ ] 13.4.5 Implement `selectMfeLoadState(state, extensionId)` selector (idle/loading/loaded/error)
- [ ] 13.4.6 Implement `selectMfeMountState(state, extensionId)` selector (unmounted/mounting/mounted/error)
- [ ] 13.4.7 Implement `selectMfeError(state, extensionId)` selector

**Traceability**: Requirement "MFE Load State Tracking" - State management (separate load and mount states)

### 13.5 ShadowDomContainer Component

- [ ] 13.5.1 Create `packages/framework/src/plugins/microfrontends/components/ShadowDomContainer.tsx`
- [ ] 13.5.2 Use `createShadowRoot()` from `@hai3/screensets` on mount
- [ ] 13.5.3 Use `injectCssVariables()` for CSS variable passthrough
- [ ] 13.5.4 Render children via React portal into shadow root
- [ ] 13.5.5 Handle cleanup on unmount

**Traceability**: Requirement "Shadow DOM React Component" - Style isolation

### 13.6 Navigation Integration

- [ ] 13.6.1 Integrate MFE mounting on screen domain with navigation (mount = navigate)
- [ ] 13.6.2 Implement route-based MFE mounting via screen domain
- [ ] 13.6.3 Handle navigation cleanup (unmount previous screen extension when new one is mounted)

**Traceability**: Requirement "Navigation Integration" - Screen domain mount = navigation

### 13.7 Error Boundary and Loading

- [ ] 13.7.1 Create `MfeErrorBoundary` component with retry support
- [ ] 13.7.2 Create default `MfeLoadingIndicator` component
- [ ] 13.7.3 Allow custom error boundary via ScreensetsRegistryConfig (NOT microfrontends plugin)
- [ ] 13.7.4 Allow custom loading component via ScreensetsRegistryConfig (NOT microfrontends plugin)

**Traceability**: Requirement "Error Boundary for MFEs", "Loading Indicator for MFEs"

### 13.8 Framework Plugin Tests

- [ ] 13.8.1 Test microfrontends plugin registration
- [ ] 13.8.2 Test mfeActions event emission
- [ ] 13.8.3 Test mfeEffects runtime calls and slice dispatch
- [ ] 13.8.4 Test mfeSlice state transitions
- [ ] 13.8.5 Test ShadowDomContainer rendering and CSS injection
- [ ] 13.8.6 Test navigation integration

**Traceability**: All @hai3/framework microfrontends requirements

---

## Phase 14: @hai3/react MFE Integration

**Goal**: Add React hooks and context for MFE state management at L3.

### 14.1 MFE Context

- [ ] 14.1.1 Create `packages/react/src/mfe/MfeContext.tsx`
- [ ] 14.1.2 Define `MfeContextValue` interface with bridge, entry info
- [ ] 14.1.3 Implement `MfeProvider` component
- [ ] 14.1.4 Integrate with `HAI3Provider` for automatic MFE detection

**Traceability**: Requirement "Layer propagation" - @hai3/react MFE context

### 14.2 MFE Hooks

- [ ] 14.2.1 Create `packages/react/src/mfe/hooks/useMfeState.ts`
- [ ] 14.2.2 Implement `useMfeState()` - returns MFE context state
- [ ] 14.2.3 Create `packages/react/src/mfe/hooks/useMfeBridge.ts`
- [ ] 14.2.4 Implement `useMfeBridge()` - returns bridge from context
- [ ] 14.2.5 Create `packages/react/src/mfe/hooks/useSharedProperty.ts`
- [ ] 14.2.6 Implement `useSharedProperty(propertyTypeId)` - subscribes to property updates

**Traceability**: Requirement "Layer propagation" - React hooks for MFE

### 14.3 MFE Host Action Hooks

- [ ] 14.3.1 Create `packages/react/src/mfe/hooks/useHostAction.ts`
- [ ] 14.3.2 Implement `useHostAction(actionTypeId)` - returns callback to request action
- [ ] 14.3.3 Add payload type inference from action schema

**Traceability**: Requirement "MFE Bridge Interface" - Host action requests

### 14.4 HAI3Provider MFE Integration

- [ ] 14.4.1 Update `HAI3Provider` to accept optional `mfeBridge` prop
- [ ] 14.4.2 Auto-detect MFE context from parent
- [ ] 14.4.3 Provide MFE context to children when bridge is present

**Traceability**: Requirement "Layer propagation" - HAI3Provider MFE integration

### 14.5 React MFE Tests

- [ ] 14.5.1 Test MfeProvider context provision
- [ ] 14.5.2 Test useMfeState hook
- [ ] 14.5.3 Test useMfeBridge hook
- [ ] 14.5.4 Test useSharedProperty subscription
- [ ] 14.5.5 Test useHostAction callback
- [ ] 14.5.6 Test HAI3Provider MFE detection

**Traceability**: All @hai3/react MFE requirements

---

## Phase 15: MFE Bridge Implementation

**Goal**: Implement MfeBridge and MfeBridgeConnection classes.

### 15.1 Bridge Core

- [ ] 15.1.1 Create `packages/screensets/src/mfe/bridge/MfeBridge.ts`
- [ ] 15.1.2 Implement `requestHostAction()` with payload validation
- [ ] 15.1.3 Implement `subscribeToProperty()` with callback management
- [ ] 15.1.4 Implement `getProperty()` for synchronous access
- [ ] 15.1.5 Implement `subscribeToAllProperties()` for bulk subscription

**Traceability**: Requirement "MFE Bridge Interface" - MfeBridge

### 15.2 Bridge Connection

- [ ] 15.2.1 Create `packages/screensets/src/mfe/bridge/MfeBridgeConnection.ts`
- [ ] 15.2.2 Implement `sendActionsChain(chain, options?)` for domain-to-MFE actions with chain-level options only
- [ ] 15.2.3 Implement `updateProperty()` with subscriber notification
- [ ] 15.2.4 Implement `onHostAction()` handler registration
- [ ] 15.2.5 Implement `dispose()` for cleanup

**Traceability**: Requirement "MFE Bridge Interface" - MfeBridgeConnection, Requirement "Explicit Timeout Configuration"

### 15.3 Bridge Factory

- [ ] 15.3.1 Create `createBridge()` factory in ScreensetsRegistry
- [ ] 15.3.2 Connect bridge to domain properties
- [ ] 15.3.3 Connect bridge to ActionsChainsMediator
- [ ] 15.3.4 Handle bridge lifecycle with extension lifecycle

**Traceability**: Requirement "MFE Bridge Interface" - Bridge creation

### 15.4 Bridge Tests

- [ ] 15.4.1 Test MfeBridge property subscription
- [ ] 15.4.2 Test MfeBridge host action request
- [ ] 15.4.3 Test MfeBridgeConnection property updates
- [ ] 15.4.4 Test MfeBridgeConnection actions chain delivery
- [ ] 15.4.5 Test bridge disposal and cleanup

**Traceability**: Requirement "MFE Bridge Interface" - all scenarios

---

## Phase 16: Shadow DOM and Error Handling

**Goal**: Implement Shadow DOM utilities and error classes.

### 16.1 Shadow DOM Utilities

- [ ] 16.1.1 Create `packages/screensets/src/mfe/shadow/index.ts`
- [ ] 16.1.2 Implement `createShadowRoot(element, options)`
- [ ] 16.1.3 Implement `injectCssVariables(shadowRoot, variables)`
- [ ] 16.1.4 Implement `injectStylesheet(shadowRoot, css, id?)`
- [ ] 16.1.5 Export utilities from `@hai3/screensets`

**Traceability**: Requirement "Shadow DOM Utilities"

### 16.2 Error Classes

- [ ] 16.2.1 Create `packages/screensets/src/mfe/errors/index.ts`
- [ ] 16.2.2 Implement `MfeError` base class
- [ ] 16.2.3 Implement `MfeLoadError` with entryTypeId
- [ ] 16.2.4 Implement `ContractValidationError` with errors array
- [ ] 16.2.5 Implement `UiMetaValidationError` with validation details
- [ ] 16.2.6 Implement `ChainExecutionError` with execution path
- [ ] 16.2.7 Implement `MfeVersionMismatchError` with version details
- [ ] 16.2.8 Implement `MfeTypeConformanceError` with type details
- [ ] 16.2.9 Export all error classes from `@hai3/screensets`

**Traceability**: Requirement "MFE Error Classes"

### 16.3 Shadow DOM and Error Tests

- [ ] 16.3.1 Test createShadowRoot with various options
- [ ] 16.3.2 Test injectCssVariables updates
- [ ] 16.3.3 Test error class instantiation and properties
- [ ] 16.3.4 Test error message formatting

**Traceability**: Requirements "Shadow DOM Utilities", "MFE Error Classes"

---

## Phase 17: MFE Handler Internal Caching

**Goal**: Implement internal caching for MfeHandlerMF. MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./design/mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf).

### 17.1 Internal ManifestCache (MfeHandlerMF only)

- [ ] 17.1.1 Create internal `ManifestCache` class within `packages/screensets/src/mfe/handler/mf-handler.ts`
- [ ] 17.1.2 Implement in-memory manifest caching for reuse across entries
- [ ] 17.1.3 Implement container caching per remoteName
- [ ] 17.1.4 Cache manifests resolved from MfeEntryMF during load

**Traceability**: Design Decision 12 in mfe-loading.md

### 17.2 MfeHandlerMF Manifest Resolution

- [ ] 17.2.1 Implement manifest resolution from MfeEntryMF.manifest field
- [ ] 17.2.2 Support manifest as inline object OR type ID reference
- [ ] 17.2.3 Cache resolved manifests for entries from same remote
- [ ] 17.2.4 Clear error messaging if manifest resolution fails

**Traceability**: Requirement "MFE Loading via MfeEntryMF and MfManifest"

### 17.3 Handler Caching Tests

- [ ] 17.3.1 Test manifest caching reuses data for multiple entries from same remote
- [ ] 17.3.2 Test container caching avoids redundant script loads
- [ ] 17.3.3 Test manifest resolution from inline MfeEntryMF.manifest
- [ ] 17.3.4 Test manifest resolution from type ID reference

**Traceability**: Design Decision 12 in mfe-loading.md

---

## Phase 18: GTS Utilities and Constants

**Goal**: Implement GTS type ID utilities and HAI3 constants.

### 18.1 GTS Utilities

- [ ] 18.1.1 Create `packages/screensets/src/mfe/gts/index.ts`
- [ ] 18.1.2 Define `GtsTypeId` branded type
- [ ] 18.1.3 Implement `parseGtsId(typeId)` function
- [ ] 18.1.4 Implement `conformsTo(derivedTypeId, baseTypeId)` function
- [ ] 18.1.5 Export utilities from `@hai3/screensets`

**Traceability**: Requirement "GTS Type ID Utilities"

### 18.2 HAI3 Constants

- [ ] 18.2.1 Create `packages/screensets/src/mfe/constants/index.ts`
- [ ] 18.2.2 Define `HAI3_MFE_ENTRY`, `HAI3_MFE_ENTRY_MF`, `HAI3_MF_MANIFEST` constants
- [ ] 18.2.3 Define `HAI3_EXT_DOMAIN`, `HAI3_EXT_EXTENSION`, `HAI3_EXT_ACTION` constants
- [ ] 18.2.4 Define `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_UNLOAD_EXT` constants (DRY principle - generic actions for all domains)
- [ ] 18.2.5 Define `HAI3_POPUP_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_SCREEN_DOMAIN`, `HAI3_OVERLAY_DOMAIN` constants
- [ ] 18.2.6 Export constants from `@hai3/screensets`

**Traceability**: Requirements "HAI3 Action Constants", "HAI3 Type Constants"

### 18.3 GTS Utilities Tests

- [ ] 18.3.1 Test GtsTypeId branded type
- [ ] 18.3.2 Test parseGtsId with various type IDs
- [ ] 18.3.3 Test conformsTo with derived and base types
- [ ] 18.3.4 Test HAI3 constants values

**Traceability**: Requirements "GTS Type ID Utilities", "HAI3 Action Constants", "HAI3 Type Constants"

---

## Phase 19: Dynamic Registration Model

**Goal**: Implement dynamic registration of extensions and MFEs at any time during runtime.

### 19.1 ScreensetsRegistry Dynamic API

- [ ] 19.1.1 Implement `registerExtension(extension): Promise<void>` method
- [ ] 19.1.2 Implement extension validation against GTS schema
- [ ] 19.1.3 Implement domain existence check (must be registered first)
- [ ] 19.1.4 Implement contract validation (entry vs domain)
- [ ] 19.1.5 Implement `unregisterExtension(extensionId): Promise<void>` method
- [ ] 19.1.6 Implement auto-unmount if MFE is currently mounted
- [ ] 19.1.7 Implement `registerDomain(domain): Promise<void>` method
- [ ] 19.1.8 Implement `unregisterDomain(domainId): Promise<void>` method
- [ ] 19.1.9 Implement cascade unregister of extensions in domain

Note: The ScreensetsRegistry does NOT have `setTypeInstanceProvider`, `refreshExtensionsFromBackend`, or `fetchInstance` methods. Entity fetching is outside MFE system scope.

**Traceability**: Requirement "Dynamic Registration Model" - all scenarios

### 19.2 Extension Loading API

- [ ] 19.2.1 Implement `loadExtension(extensionId): Promise<void>` method
- [ ] 19.2.2 Verify extension is registered before loading
- [ ] 19.2.3 Resolve entry from extension, find appropriate MfeHandler
- [ ] 19.2.4 Call handler.load(entry) to fetch and initialize bundle
- [ ] 19.2.5 Cache loaded lifecycle for mounting
- [ ] 19.2.6 Emit `extensionLoaded` event
- [ ] 19.2.7 Implement `preloadExtension(extensionId): Promise<void>` method
- [ ] 19.2.8 Same as loadExtension but semantically for preloading
- [ ] 19.2.9 Use handler.preload() if available for batch optimization

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - loadExtension/preloadExtension scenarios

### 19.3 Extension Mounting API

- [ ] 19.3.1 Implement `mountExtension(extensionId, container): Promise<MfeBridgeConnection>` method
- [ ] 19.3.2 If extension not loaded, call loadExtension first (auto-load)
- [ ] 19.3.3 Create bridge connection via handler.bridgeFactory
- [ ] 19.3.4 Register with RuntimeCoordinator
- [ ] 19.3.5 Call lifecycle.mount(container, bridge)
- [ ] 19.3.6 Emit `extensionMounted` event
- [ ] 19.3.7 Implement `unmountExtension(extensionId): Promise<void>` method
- [ ] 19.3.8 Call lifecycle.unmount(container)
- [ ] 19.3.9 Dispose bridge and unregister from coordinator
- [ ] 19.3.10 Keep extension registered and bundle loaded after unmount
- [ ] 19.3.11 Emit `extensionUnmounted` event

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - mountExtension/unmountExtension scenarios

### 19.4 Registration Events

- [ ] 19.4.1 Implement `emit(event, data)` method on ScreensetsRegistry
- [ ] 19.4.2 Emit `extensionRegistered` event with `{ extensionId }`
- [ ] 19.4.3 Emit `extensionUnregistered` event with `{ extensionId }`
- [ ] 19.4.4 Emit `domainRegistered` event with `{ domainId }`
- [ ] 19.4.5 Emit `domainUnregistered` event with `{ domainId }`
- [ ] 19.4.6 Emit `extensionLoaded` event with `{ extensionId }`
- [ ] 19.4.7 Emit `extensionMounted` event with `{ extensionId }`
- [ ] 19.4.8 Emit `extensionUnmounted` event with `{ extensionId }`
- [ ] 19.4.9 Implement `on(event, callback)` and `off(event, callback)` for subscriptions

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - Registration events

### 19.5 Dynamic Registration Tests

- [ ] 19.5.1 Test registerExtension after runtime initialization
- [ ] 19.5.2 Test registerExtension fails if domain not registered
- [ ] 19.5.3 Test unregisterExtension unmounts MFE if mounted
- [ ] 19.5.4 Test unregisterExtension is idempotent
- [ ] 19.5.5 Test registerDomain at any time
- [ ] 19.5.6 Test unregisterDomain cascades to extensions
- [ ] 19.5.7 Test loadExtension requires extension to be registered
- [ ] 19.5.8 Test loadExtension caches bundle for mounting
- [ ] 19.5.9 Test preloadExtension has same behavior as loadExtension
- [ ] 19.5.10 Test mountExtension auto-loads if not loaded
- [ ] 19.5.11 Test mountExtension requires extension to be registered
- [ ] 19.5.12 Test unmountExtension keeps extension registered and bundle loaded
- [ ] 19.5.13 Test registration events are emitted correctly
- [ ] 19.5.14 Test hot-swap: unregister + register with same ID

**Traceability**: Requirement "Dynamic Registration Model", "ScreensetsRegistry Dynamic API" - all scenarios

---

## Phase 20: Framework Dynamic Registration Actions

**Goal**: Add dynamic registration actions to @hai3/framework microfrontends plugin.

### 20.1 Dynamic Registration Actions

- [ ] 20.1.1 Add `registerExtension(extension)` action to mfeActions
- [ ] 20.1.2 Emit `'mfe/registerExtensionRequested'` event
- [ ] 20.1.3 Add `unregisterExtension(extensionId)` action to mfeActions
- [ ] 20.1.4 Emit `'mfe/unregisterExtensionRequested'` event
- [ ] 20.1.5 Add `registerDomain(domain)` action to mfeActions
- [ ] 20.1.6 Emit `'mfe/registerDomainRequested'` event
- [ ] 20.1.7 Add `unregisterDomain(domainId)` action to mfeActions
- [ ] 20.1.8 Emit `'mfe/unregisterDomainRequested'` event
- [ ] 20.1.9 Verify `loadExtension(extensionId)` and `preloadExtension(extensionId)` actions exist (from Phase 13.2)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - actions

### 20.2 Dynamic Registration Effects

- [ ] 20.2.1 Handle `'mfe/registerExtensionRequested'` event
- [ ] 20.2.2 Call `runtime.registerExtension()` in effect
- [ ] 20.2.3 Dispatch `setExtensionRegistering` before call
- [ ] 20.2.4 Dispatch `setExtensionRegistered` on success
- [ ] 20.2.5 Dispatch `setExtensionError` on failure
- [ ] 20.2.6 Handle `'mfe/unregisterExtensionRequested'` event
- [ ] 20.2.7 Call `runtime.unregisterExtension()` in effect
- [ ] 20.2.8 Handle `'mfe/registerDomainRequested'` event
- [ ] 20.2.9 Call `runtime.registerDomain()` in effect
- [ ] 20.2.10 Handle `'mfe/unregisterDomainRequested'` event
- [ ] 20.2.11 Call `runtime.unregisterDomain()` in effect

**Traceability**: Requirement "Dynamic Registration Support in Framework" - effects

### 20.3 Extension Registration Slice

- [ ] 20.3.1 Add `extensionStates: Record<string, ExtensionRegistrationState>` to mfeSlice
- [ ] 20.3.2 Define `ExtensionRegistrationState`: 'unregistered' | 'registering' | 'registered' | 'error'
- [ ] 20.3.3 Add `setExtensionRegistering` reducer
- [ ] 20.3.4 Add `setExtensionRegistered` reducer
- [ ] 20.3.5 Add `setExtensionUnregistered` reducer
- [ ] 20.3.6 Add `setExtensionError` reducer
- [ ] 20.3.7 Add `selectExtensionState(state, extensionId)` selector
- [ ] 20.3.8 Add `selectRegisteredExtensions(state)` selector

**Traceability**: Requirement "Dynamic Registration Support in Framework" - slice

### 20.4 Extension Events Hook

- [ ] 20.4.1 Create `useExtensionEvents(domainId)` hook
- [ ] 20.4.2 Subscribe to runtime's `extensionRegistered` event
- [ ] 20.4.3 Subscribe to runtime's `extensionUnregistered` event
- [ ] 20.4.4 Filter events by domainId
- [ ] 20.4.5 Return current extensions for domain
- [ ] 20.4.6 Trigger re-render on changes

**Traceability**: Requirement "Dynamic Registration Support in Framework" - events hook

### 20.5 Framework Dynamic Registration Tests

- [ ] 20.5.1 Test registerExtension action emits event
- [ ] 20.5.2 Test registerExtension effect calls runtime
- [ ] 20.5.3 Test unregisterExtension action and effect
- [ ] 20.5.4 Test registerDomain action and effect
- [ ] 20.5.5 Test unregisterDomain action and effect
- [ ] 20.5.6 Test slice state transitions
- [ ] 20.5.7 Test selectExtensionState selector
- [ ] 20.5.8 Test selectRegisteredExtensions selector
- [ ] 20.5.9 Test useExtensionEvents hook

**Traceability**: Requirement "Dynamic Registration Support in Framework" - all scenarios
