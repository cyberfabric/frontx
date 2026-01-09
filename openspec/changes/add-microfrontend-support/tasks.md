# Implementation Tasks

## Progress Summary

**Current Status**: Planning - Not Started

---

## Phase 1: Type System Plugin Infrastructure

**Goal**: Define the TypeSystemPlugin interface and supporting types.

### 1.1 Define Plugin Interface

- [ ] 1.1.1 Create `TypeSystemPlugin` interface in `packages/screensets/src/mfe/plugins/types.ts`
- [ ] 1.1.2 Define `ValidationResult` and `ValidationError` interfaces
- [ ] 1.1.3 Define `CompatibilityResult` and `CompatibilityChange` interfaces
- [ ] 1.1.4 Define `AttributeResult` interface for attribute access
- [ ] 1.1.5 Export plugin interface from `@hai3/screensets`

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

### 1.2 Define Plugin Method Signatures

- [ ] 1.2.1 Define type ID operation method signatures (`isValidTypeId`, `buildTypeId`, `parseTypeId`)
- [ ] 1.2.2 Define schema registry method signatures (`registerSchema`, `validateInstance`, `getSchema`)
- [ ] 1.2.3 Define query method signature (`query`)
- [ ] 1.2.4 Define required compatibility method signature (`checkCompatibility`)
- [ ] 1.2.5 Define attribute access method signature (`getAttribute`)

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

---

## Phase 2: GTS Plugin Implementation

**Goal**: Implement the GTS plugin as the default Type System implementation.

### 2.1 Create GTS Plugin

- [ ] 2.1.1 Create `packages/screensets/src/mfe/plugins/gts/index.ts`
- [ ] 2.1.2 Implement `isValidTypeId()` to validate GTS type ID format
- [ ] 2.1.3 Implement `buildTypeId()` to construct GTS type IDs
- [ ] 2.1.4 Implement `parseTypeId()` to parse GTS type ID into components (returns generic object)
- [ ] 2.1.5 Implement `registerSchema()` using internal GtsStore
- [ ] 2.1.6 Implement `validateInstance()` using internal GtsStore
- [ ] 2.1.7 Implement `getSchema()` using internal GtsStore
- [ ] 2.1.8 Implement `query()` using GtsQuery
- [ ] 2.1.9 Implement `checkCompatibility()` using Gts.checkCompatibility()
- [ ] 2.1.10 Implement `getAttribute()` for dynamic schema resolution

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.2 Export GTS Plugin

- [ ] 2.2.1 Export `createGtsPlugin()` factory function
- [ ] 2.2.2 Export `gtsPlugin` singleton instance
- [ ] 2.2.3 Configure package.json exports for `@hai3/screensets/plugins/gts`
- [ ] 2.2.4 Add peer dependency on `@globaltypesystem/gts-ts`

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.3 GTS Plugin Tests

- [ ] 2.3.1 Test `isValidTypeId()` accepts valid GTS type IDs
- [ ] 2.3.2 Test `isValidTypeId()` rejects invalid formats (missing segments, no tilde, no version prefix)
- [ ] 2.3.3 Test `buildTypeId()` creates correct GTS format
- [ ] 2.3.4 Test `parseTypeId()` returns correct components
- [ ] 2.3.5 Test schema registration and validation
- [ ] 2.3.6 Test query operations
- [ ] 2.3.7 Test `checkCompatibility()` returns proper CompatibilityResult
- [ ] 2.3.8 Test `getAttribute()` resolves attributes correctly

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, GTS type ID validation

---

## Phase 3: Internal TypeScript Types

**Goal**: Define internal TypeScript types for MFE architecture with simple `id: string` field.

### 3.1 Define MFE TypeScript Interfaces

**Core Types (6 types):**
- [ ] 3.1.1 Create `MfeEntry` interface (id, requiredProperties, optionalProperties, actions, domainActions)
- [ ] 3.1.2 Create `ExtensionDomain` interface (id, sharedProperties, actions, extensionsActions, extensionsUiMeta, defaultActionTimeout)
- [ ] 3.1.3 Create `Extension` interface (id, domain, entry, uiMeta)
- [ ] 3.1.4 Create `SharedProperty` interface (id, value)
- [ ] 3.1.5 Create `Action` interface (type, target, payload?, timeout?)
- [ ] 3.1.6 Create `ActionsChain` interface (action: Action, next?: ActionsChain, fallback?: ActionsChain) - no id field

**Module Federation Types (2 types):**
- [ ] 3.1.7 Create `MfManifest` interface (id, remoteEntry, remoteName, sharedDependencies?, entries?)
- [ ] 3.1.8 Create `MfeEntryMF` interface (extends MfeEntry, manifest, exposedModule)
- [ ] 3.1.9 Export types from `packages/screensets/src/mfe/types/`

**Traceability**: Requirement "MFE TypeScript Type System" - Type identifier

### 3.2 Create GTS JSON Schemas

**Core Type Schemas (6 types):**
- [ ] 3.2.1 Create schema for `gts.hai3.screensets.mfe.entry.v1~` with id field
- [ ] 3.2.2 Create schema for `gts.hai3.screensets.ext.domain.v1~` with id, defaultActionTimeout (required) fields
- [ ] 3.2.3 Create schema for `gts.hai3.screensets.ext.extension.v1~` with id field
- [ ] 3.2.4 Create schema for `gts.hai3.screensets.ext.shared_property.v1~` with id and value fields
- [ ] 3.2.5 Create schema for `gts.hai3.screensets.ext.action.v1~` with type, target, timeout (optional) fields (no id)
- [ ] 3.2.6 Create schema for `gts.hai3.screensets.ext.actions_chain.v1~` with $ref syntax (no id field)

**Module Federation Schemas (2 types):**
- [ ] 3.2.7 Create schema for `gts.hai3.screensets.mfe.mf.v1~` (MfManifest) with id field
- [ ] 3.2.8 Create schema for `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~` (MfeEntryMF derived)
- [ ] 3.2.9 Export schemas from `packages/screensets/src/mfe/schemas/gts-schemas.ts`

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type registration via plugin

### 3.3 HAI3 Type Registration

- [ ] 3.3.1 Define `HAI3_CORE_TYPE_IDS` constant with 6 core GTS type IDs
- [ ] 3.3.2 Define `HAI3_MF_TYPE_IDS` constant with 2 Module Federation GTS type IDs
- [ ] 3.3.3 Implement `registerHai3Types(plugin)` function
- [ ] 3.3.4 Register all 8 schemas (6 core + 2 MF) using `plugin.registerSchema()`
- [ ] 3.3.5 Return combined type IDs for runtime use

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type registration via plugin

---

## Phase 4: ScreensetsRuntime with Plugin

**Goal**: Implement the ScreensetsRuntime with required Type System plugin at initialization.

### 4.1 Runtime Configuration

- [ ] 4.1.1 Create `ScreensetsRuntimeConfig` interface
- [ ] 4.1.2 Add required `typeSystem` parameter
- [ ] 4.1.3 Add optional `onError`, `loadingComponent`, `errorFallbackComponent`, `debug`, `mfeLoader`, `parentBridge` parameters
- [ ] 4.1.4 Implement `createScreensetsRuntime(config)` factory

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin requirement at initialization

### 4.2 ScreensetsRuntime Core with Plugin

- [ ] 4.2.1 Create `ScreensetsRuntime` class
- [ ] 4.2.2 Store plugin reference as `readonly typeSystem`
- [ ] 4.2.3 Call `registerHai3Types(plugin)` on initialization
- [ ] 4.2.4 Throw error if plugin is missing

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin requirement at initialization

### 4.3 Type ID Validation via Plugin

- [ ] 4.3.1 Validate target type ID via `plugin.isValidTypeId()` before chain execution
- [ ] 4.3.2 Validate action type ID via `plugin.isValidTypeId()` before chain execution
- [ ] 4.3.3 Return validation error if type IDs are invalid

**Traceability**: Requirement "Actions Chain Mediation" - Action chain type ID validation

### 4.4 Payload Validation via Plugin

- [ ] 4.4.1 Validate payload via `plugin.validateInstance()` before delivery
- [ ] 4.4.2 Use action's registered payloadSchema for validation
- [ ] 4.4.3 Return validation error details on failure

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

## Phase 6: Dynamic uiMeta Validation

**Goal**: Implement runtime validation of Extension's uiMeta against domain's extensionsUiMeta.

### 6.1 uiMeta Validation Implementation

- [ ] 6.1.1 Implement `validateExtensionUiMeta(plugin, extension)` function
- [ ] 6.1.2 Resolve domain's extensionsUiMeta via `plugin.getAttribute()`
- [ ] 6.1.3 Handle attribute resolution failure with clear error message
- [ ] 6.1.4 Validate extension.uiMeta against resolved schema
- [ ] 6.1.5 Transform validation errors to include uiMeta context

**Traceability**: Requirement "Dynamic uiMeta Validation" - uiMeta validation via attribute selector

### 6.2 uiMeta Validation Tests

- [ ] 6.2.1 Test successful uiMeta validation
- [ ] 6.2.2 Test uiMeta validation failure
- [ ] 6.2.3 Test uiMeta validation with derived domains
- [ ] 6.2.4 Test attribute resolution failure handling

**Traceability**: Requirement "Dynamic uiMeta Validation" - all scenarios

---

## Phase 7: Framework Plugin Propagation

**Goal**: Propagate Type System plugin through @hai3/framework layers.

### 7.1 Framework Microfrontends Plugin

- [ ] 7.1.1 Create `MicrofrontendsPluginConfig` interface
- [ ] 7.1.2 Add required `typeSystem` parameter
- [ ] 7.1.3 Add optional `baseDomains` parameter
- [ ] 7.1.4 Implement `createMicrofrontendsPlugin(config)` factory

**Traceability**: Requirement "Framework Plugin Propagation" - Framework microfrontends plugin configuration

### 7.2 Base Domains Registration

- [ ] 7.2.1 Create `getBaseDomain(name, plugin)` function
- [ ] 7.2.2 Build base domain type IDs via `plugin.buildTypeId()`
- [ ] 7.2.3 Register base domain schemas via `plugin.registerSchema()`
- [ ] 7.2.4 Implement sidebar, popup, screen, overlay base domains

**Traceability**: Requirement "Framework Plugin Propagation" - Base domains registration via plugin

### 7.3 Plugin Propagation

- [ ] 7.3.1 Pass plugin to `createScreensetsRuntime()` in setup
- [ ] 7.3.2 Expose runtime via `framework.provide('screensetsRuntime', runtime)`
- [ ] 7.3.3 Ensure same plugin instance is used throughout

**Traceability**: Requirement "Framework Plugin Propagation" - Plugin consistency across layers

### 7.4 Framework Plugin Tests

- [ ] 7.4.1 Test plugin propagation from config to runtime
- [ ] 7.4.2 Test base domain registration with GTS plugin
- [ ] 7.4.3 Test runtime accessibility via framework

**Traceability**: Requirement "Framework Plugin Propagation" - all scenarios

---

## Phase 8: Isolated State Instances

**Goal**: Implement state isolation between host and MFE instances.

### 8.1 State Container Factory

- [ ] 8.1.1 Create `createMfeStateContainer()` factory function
- [ ] 8.1.2 Ensure each call creates independent store instance
- [ ] 8.1.3 Implement store disposal on MFE unmount
- [ ] 8.1.4 Add store isolation verification tests

**Traceability**: Requirement "Isolated State Instances" - MFE state isolation

### 8.2 Shared Properties Injection

- [ ] 8.2.1 Create `SharedPropertiesProvider` component
- [ ] 8.2.2 Implement read-only property passing via props
- [ ] 8.2.3 Implement property update propagation from host
- [ ] 8.2.4 Add tests for property isolation (no direct modification)

**Traceability**: Requirement "Isolated State Instances" - Shared properties propagation

### 8.3 Host State Protection

- [ ] 8.3.1 Verify MFE cannot access host store directly
- [ ] 8.3.2 Implement boundary enforcement
- [ ] 8.3.3 Add integration tests for state isolation

**Traceability**: Requirement "Isolated State Instances" - Host state isolation

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

- [ ] 10.1.1 Define sidebar domain: `gts.hai3.screensets.ext.domain.sidebar.v1~`
- [ ] 10.1.2 Define popup domain: `gts.hai3.screensets.ext.domain.popup.v1~`
- [ ] 10.1.3 Define screen domain: `gts.hai3.screensets.ext.domain.screen.v1~`
- [ ] 10.1.4 Define overlay domain: `gts.hai3.screensets.ext.domain.overlay.v1~`

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

### 11.1 MFE Loader

- [ ] 11.1.1 Implement `MfeLoader` class
- [ ] 11.1.2 Implement `load(entry: MfeEntryMF)` method
- [ ] 11.1.3 Implement manifest resolution and caching
- [ ] 11.1.4 Implement Module Federation container loading
- [ ] 11.1.5 Implement `preload(entries)` method

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

**Goal**: Implement the microfrontends plugin that wires ScreensetsRuntime into Flux data flow.

### 13.1 Plugin Infrastructure

- [ ] 13.1.1 Create `packages/framework/src/plugins/microfrontends/index.ts`
- [ ] 13.1.2 Define `MicrofrontendsPluginConfig` interface with `typeSystem`, `remotes`, `styleIsolation` options
- [ ] 13.1.3 Implement `microfrontends()` plugin factory function
- [ ] 13.1.4 Add dependency check for `screensets` plugin
- [ ] 13.1.5 Export plugin from `@hai3/framework`

**Traceability**: Requirement "Microfrontends Plugin" - Plugin registration

### 13.2 MFE Actions

- [ ] 13.2.1 Create `packages/framework/src/plugins/microfrontends/actions.ts`
- [ ] 13.2.2 Implement `loadMfe(entryTypeId)` action - emits `'mfe/loadRequested'` event
- [ ] 13.2.3 Implement `handleMfeHostAction(entryTypeId, actionTypeId, payload)` action
- [ ] 13.2.4 Implement `navigateToMfe(entryTypeId)` action - emits `'navigation/mfeRequested'` event
- [ ] 13.2.5 Export actions as `mfeActions` from plugin

**Traceability**: Requirement "MFE Actions" - Load, host action, and navigation actions

### 13.3 MFE Effects

- [ ] 13.3.1 Create `packages/framework/src/plugins/microfrontends/effects.ts`
- [ ] 13.3.2 Implement load effect - subscribes to `'mfe/loadRequested'`, calls `runtime.loadMfe()`
- [ ] 13.3.3 Implement host action effect - handles popup, sidebar, and custom actions
- [ ] 13.3.4 Implement navigation effect - loads and mounts MFE on navigation
- [ ] 13.3.5 Implement unmount effect - cleans up on navigation away

**Traceability**: Requirement "MFE Effects" - Event handlers and runtime calls

### 13.4 MFE Slice

- [ ] 13.4.1 Create `packages/framework/src/plugins/microfrontends/slice.ts`
- [ ] 13.4.2 Define `MfeState` interface with load states per entry type ID
- [ ] 13.4.3 Implement `setLoading`, `setLoaded`, `setError` reducers
- [ ] 13.4.4 Implement `selectMfeLoadState(state, entryTypeId)` selector
- [ ] 13.4.5 Implement `selectMfeError(state, entryTypeId)` selector

**Traceability**: Requirement "MFE Load State Tracking" - State management

### 13.5 ShadowDomContainer Component

- [ ] 13.5.1 Create `packages/framework/src/plugins/microfrontends/components/ShadowDomContainer.tsx`
- [ ] 13.5.2 Use `createShadowRoot()` from `@hai3/screensets` on mount
- [ ] 13.5.3 Use `injectCssVariables()` for CSS variable passthrough
- [ ] 13.5.4 Render children via React portal into shadow root
- [ ] 13.5.5 Handle cleanup on unmount

**Traceability**: Requirement "Shadow DOM React Component" - Style isolation

### 13.6 Navigation Integration

- [ ] 13.6.1 Integrate MFE loading with navigation plugin
- [ ] 13.6.2 Implement route-based MFE mounting
- [ ] 13.6.3 Handle navigation cleanup (unmount previous MFE)
- [ ] 13.6.4 Add navigation state to mfeSlice

**Traceability**: Requirement "Navigation Integration" - Route-based MFE loading

### 13.7 Error Boundary and Loading

- [ ] 13.7.1 Create `MfeErrorBoundary` component with retry support
- [ ] 13.7.2 Create default `MfeLoadingIndicator` component
- [ ] 13.7.3 Allow custom error boundary via plugin config
- [ ] 13.7.4 Allow custom loading component via plugin config

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

- [ ] 15.3.1 Create `createBridge()` factory in ScreensetsRuntime
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

## Phase 17: Manifest Fetching and Registry

**Goal**: Implement manifest fetching strategies and MFE registry.

### 17.1 Manifest Fetchers

- [ ] 17.1.1 Create `packages/screensets/src/mfe/loader/manifest-fetcher.ts`
- [ ] 17.1.2 Implement `ManifestFetcher` interface
- [ ] 17.1.3 Implement `UrlManifestFetcher` class
- [ ] 17.1.4 Implement `RegistryManifestFetcher` class
- [ ] 17.1.5 Implement `CompositeManifestFetcher` class

**Traceability**: Design Decision 18 - Manifest Fetching Strategy

### 17.2 MFE Registry

- [ ] 17.2.1 Create `packages/screensets/src/mfe/registry/index.ts`
- [ ] 17.2.2 Implement `microfrontendRegistry` singleton
- [ ] 17.2.3 Implement `getManifest(manifestTypeId)` method
- [ ] 17.2.4 Implement `getEntry(entryTypeId)` method
- [ ] 17.2.5 Implement `registerManifest(manifest)` method

**Traceability**: Requirement "MFE Registry Integration"

### 17.3 MfeLoader Integration

- [ ] 17.3.1 Update `MfeLoader` to use `ManifestFetcher`
- [ ] 17.3.2 Replace placeholder `fetchManifestInstance` with fetcher call
- [ ] 17.3.3 Add manifest caching integration
- [ ] 17.3.4 Add registry registration on load

**Traceability**: Requirement "MFE Loading via MfeEntryMF and MfManifest"

### 17.4 Manifest and Registry Tests

- [ ] 17.4.1 Test UrlManifestFetcher with mock responses
- [ ] 17.4.2 Test RegistryManifestFetcher lookup
- [ ] 17.4.3 Test CompositeManifestFetcher fallback
- [ ] 17.4.4 Test microfrontendRegistry queries
- [ ] 17.4.5 Test MfeLoader with different fetchers

**Traceability**: Design Decision 18, Requirement "MFE Registry Integration"

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
- [ ] 18.2.4 Define `HAI3_ACTION_SHOW_POPUP`, `HAI3_ACTION_HIDE_POPUP` constants
- [ ] 18.2.5 Define `HAI3_ACTION_SHOW_SIDEBAR`, `HAI3_ACTION_HIDE_SIDEBAR` constants
- [ ] 18.2.6 Export constants from `@hai3/screensets`

**Traceability**: Requirements "HAI3 Action Constants", "HAI3 Type Constants"

### 18.3 GTS Utilities Tests

- [ ] 18.3.1 Test GtsTypeId branded type
- [ ] 18.3.2 Test parseGtsId with various type IDs
- [ ] 18.3.3 Test conformsTo with derived and base types
- [ ] 18.3.4 Test HAI3 constants values

**Traceability**: Requirements "GTS Type ID Utilities", "HAI3 Action Constants", "HAI3 Type Constants"
