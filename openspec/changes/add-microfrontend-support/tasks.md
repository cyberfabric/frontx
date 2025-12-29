# Tasks: Add Microfrontend Support with GTS Type System

## Phase 1: GTS Type System (@hai3/screensets)

### 1.1 GTS Core Types
- [ ] 1.1.1 Add `GtsTypeId` branded type to `types.ts`
- [ ] 1.1.2 Add `GtsParsedId` interface with vendor, package, namespace, type, majorVersion, minorVersion, isType, chain
- [ ] 1.1.3 Add `GtsParseError` class for invalid identifiers
- [ ] 1.1.4 Export GTS types from package index

### 1.2 GTS Parser
- [ ] 1.2.1 Create `gts/parseGtsId.ts`
- [ ] 1.2.2 Implement segment parsing (split by `~`)
- [ ] 1.2.3 Implement component extraction (vendor.package.namespace.type.vN)
- [ ] 1.2.4 Handle chained identifiers (rightmost = primary)
- [ ] 1.2.5 Validate `gts.` prefix
- [ ] 1.2.6 Validate version format (v1, v1.2)
- [ ] 1.2.7 Add unit tests for parsing

### 1.3 GTS Builder
- [ ] 1.3.1 Create `gts/buildGtsId.ts`
- [ ] 1.3.2 Implement fluent builder with `vendor()`, `package()`, `namespace()`, `type()`, `version()`
- [ ] 1.3.3 Implement `extend()` for chained identifiers
- [ ] 1.3.4 Implement `build()` returning `GtsTypeId`
- [ ] 1.3.5 Default namespace to `_` when not specified
- [ ] 1.3.6 Ensure output ends with `~`
- [ ] 1.3.7 Add unit tests for building

### 1.4 GTS Schema Registry
- [ ] 1.4.1 Create `gts/gtsRegistry.ts`
- [ ] 1.4.2 Implement `register(typeId, schema)` method
- [ ] 1.4.3 Implement `get(typeId)` method
- [ ] 1.4.4 Implement `validate(payload, typeId)` using JSON Schema validation
- [ ] 1.4.5 Implement `listTypes(pattern?)` with wildcard support
- [ ] 1.4.6 Export singleton `gtsRegistry`
- [ ] 1.4.7 Add unit tests for registry

### 1.5 GTS Conformance
- [ ] 1.5.1 Create `gts/conformsTo.ts`
- [ ] 1.5.2 Implement chain-based conformance check
- [ ] 1.5.3 Add unit tests for conformance

### 1.6 Predefined HAI3 Base Types
- [ ] 1.6.1 Create `gts/hai3Types.ts`
- [ ] 1.6.2 Define `HAI3_MFE_TYPE` constant (`gts.hai3.mfe.type.v1~`)
- [ ] 1.6.3 Define `HAI3_MFE_ENTRY_BASE` and domain-specific constants (`gts.hai3.mfe.entry.v1~`, `gts.hai3.mfe.entry.screen.v1~`, etc.)
- [ ] 1.6.4 Define `HAI3_ACTION_SHOW_POPUP`, `HAI3_ACTION_HIDE_POPUP`, `HAI3_ACTION_SHOW_SIDEBAR`, `HAI3_ACTION_NAVIGATE`, etc.
- [ ] 1.6.5 Define `HAI3_APP_STATE` type constant

### 1.7 MFE Type and Entry Schemas
- [ ] 1.7.1 Register `MicrofrontendDefinition` JSON Schema at `gts.hai3.mfe.type.v1~`
- [ ] 1.7.2 Register base `MfeEntry` JSON Schema at `gts.hai3.mfe.entry.v1~`
- [ ] 1.7.3 Register `MfeEntryScreen` JSON Schema at `gts.hai3.mfe.entry.screen.v1~` (extends entry.v1)
- [ ] 1.7.4 Register `MfeEntryPopup` JSON Schema at `gts.hai3.mfe.entry.popup.v1~` (extends entry.v1)
- [ ] 1.7.5 Register `MfeEntrySidebar` JSON Schema at `gts.hai3.mfe.entry.sidebar.v1~` (extends entry.v1)
- [ ] 1.7.6 Register `MfeEntryOverlay` JSON Schema at `gts.hai3.mfe.entry.overlay.v1~` (extends entry.v1)
- [ ] 1.7.7 Register JSON Schemas for all HAI3 host actions in `gtsRegistry`
- [ ] 1.7.8 Add unit tests for schema validation
- [ ] 1.7.9 Export all constants from package index

### 1.8 GTS Package Verification
- [ ] 1.8.1 Verify zero external dependencies maintained
- [ ] 1.8.2 Run `npm run type-check:packages:screensets`
- [ ] 1.8.3 Run `npm run build:packages:screensets`

## Phase 2: MFE Orchestration Library (@hai3/screensets)

**Key constraint**: All implementations in this phase use props/callbacks interface with ZERO @hai3/state dependencies.

### 2.1 Core MFE Types
- [ ] 2.1.1 Add `LayoutDomain` enum (Screen, Popup, Sidebar, Overlay)
- [ ] 2.1.2 Add `MfeEntry` interface with `typeId: GtsTypeId`, `domain`, `component`
- [ ] 2.1.3 Add `AppState` interface (tenant, user, language, theme)
- [ ] 2.1.4 Add `HostBridge<TAppState>` interface with `subscribe`, `requestHostAction`, `getAppState`, `mfeTypeId`
- [ ] 2.1.5 Add `Subscription` interface with `unsubscribe()`
- [ ] 2.1.6 Add `MfeMountResult` interface with `unmount` callback
- [ ] 2.1.7 Export all new types from package index

### 2.2 MFE Contract
- [ ] 2.2.1 Add `MfeContract` interface with `mount(container, bridge)` and `actionHandlers`
- [ ] 2.2.2 Action handlers keyed by `GtsTypeId`
- [ ] 2.2.3 Add `MfeActionHandler` type

### 2.3 MFE Definition
- [ ] 2.3.1 Add `MicrofrontendDefinition` interface with `typeId: GtsTypeId`, `name`, `entries`, `contract`, `actionTypes`, `menu`
- [ ] 2.3.2 Add `MenuItemConfig` interface
- [ ] 2.3.3 Export from package index

### 2.4 MFE Registry
- [ ] 2.4.1 Create `mfe/microfrontendRegistry.ts`
- [ ] 2.4.2 Implement `register(definition)` method
- [ ] 2.4.3 Implement `get(typeId)` method
- [ ] 2.4.4 Implement `getAll()` method
- [ ] 2.4.5 Implement `has(typeId)` method
- [ ] 2.4.6 Implement `findByPattern(pattern)` with wildcard support
- [ ] 2.4.7 Export singleton from package index

### 2.5 Remote Config Types
- [ ] 2.5.1 Add `MfeRemoteConfig` interface with `typeId: GtsTypeId`, `url`, `shared`, `preload`, `loadTimeout`
- [ ] 2.5.2 Add `PreloadStrategy` type ('none' | 'hover' | 'immediate')
- [ ] 2.5.3 Export from package index

### 2.6 Error Types
- [ ] 2.6.1 Add `PayloadValidationError` class with `actionTypeId`, `errors`
- [ ] 2.6.2 Add `MfeNotMountedError` class with `mfeTypeId`
- [ ] 2.6.3 Add `ActionNotAllowedError` class with `actionTypeId`
- [ ] 2.6.4 Add `ActionNotRegisteredError` class with `mfeTypeId`, `actionTypeId`
- [ ] 2.6.5 Add `MfeLoadTimeoutError` class with `mfeTypeId`, `timeoutMs`
- [ ] 2.6.6 Add `MfeNetworkError` class with `mfeTypeId`, `cause`
- [ ] 2.6.7 Add `MfeSchemaValidationError` class with `mfeTypeId`, `schemaTypeId`, `errors` (thrown on MFE load)
- [ ] 2.6.8 Add `MfeEntrySchemaValidationError` class with `entryTypeId`, `schemaTypeId`, `errors` (thrown on entry mount)
- [ ] 2.6.9 Export errors from package index

### 2.7 Event Payload Types
- [ ] 2.7.1 Add `MfeEventPayloads` interface with all MFE event shapes
- [ ] 2.7.2 Add `ValidationError` interface (path, message)
- [ ] 2.7.3 Export from package index

### 2.8 MFE Bridge Implementation
- [ ] 2.8.1 Create `mfe/MfeBridge.ts`
- [ ] 2.8.2 Define `MfeBridgeConfig<TAppState>` with `getAppState`, `subscribeToState`, `onHostAction` callbacks
- [ ] 2.8.3 Implement `MfeBridge` class with constructor taking config
- [ ] 2.8.4 Implement `getAppState()` using `config.getAppState` callback
- [ ] 2.8.5 Implement `subscribe()` using `config.subscribeToState` callback with selector comparison
- [ ] 2.8.6 Implement subscription debounce option
- [ ] 2.8.7 Implement `requestHostAction()` with GTS registry validation before invoking callback
- [ ] 2.8.8 Add subscription tracking for cleanup
- [ ] 2.8.9 Add unit tests for bridge

### 2.9 MFE Loader Implementation
- [ ] 2.9.1 Create `mfe/MfeLoader.ts`
- [ ] 2.9.2 Implement Module Federation dynamic import
- [ ] 2.9.3 Implement load timeout handling
- [ ] 2.9.4 Implement shared dependency resolution
- [ ] 2.9.5 Validate loaded `MicrofrontendDefinition` against `gts.hai3.mfe.type.v1~` schema
- [ ] 2.9.6 Throw `MfeSchemaValidationError` if validation fails
- [ ] 2.9.7 Implement `preload(remote)` method
- [ ] 2.9.8 Implement `isLoaded(mfeTypeId)` method
- [ ] 2.9.9 Implement `getDefinition(mfeTypeId)` method
- [ ] 2.9.10 Add unit tests for loader (including schema validation)

### 2.10 Shadow DOM Utilities
- [ ] 2.10.1 Create `mfe/shadowDom.ts`
- [ ] 2.10.2 Implement `createShadowRoot(container, options)` function
- [ ] 2.10.3 Implement `injectCssVariables(shadowRoot, variables)` function
- [ ] 2.10.4 Support 'open' and 'closed' shadow modes
- [ ] 2.10.5 Add unit tests for shadow DOM utilities

### 2.11 MFE Orchestrator Implementation
- [ ] 2.11.1 Create `mfe/MfeOrchestrator.ts`
- [ ] 2.11.2 Define `MfeOrchestratorConfig<TAppState>` with factory callbacks
- [ ] 2.11.3 Implement constructor with loader, registry, createBridge, createShadowContainer
- [ ] 2.11.4 Implement lifecycle callbacks (onLoadStart, onLoadComplete, onLoadError, onMounted, onUnmounted)
- [ ] 2.11.5 Implement `load(mfeTypeId)` using loader, validate type conformance
- [ ] 2.11.6 Implement `mount(mfeTypeId, entryTypeId, container)` using createBridge/createShadowContainer factories
- [ ] 2.11.7 Validate entry against domain-specific schema (e.g., `gts.hai3.mfe.entry.screen.v1~`) before mounting
- [ ] 2.11.8 Throw `MfeEntrySchemaValidationError` if entry validation fails
- [ ] 2.11.9 Implement `unmount(mfeTypeId)` with subscription cleanup
- [ ] 2.11.10 Implement `requestMfeAction(mfeTypeId, actionTypeId, payload)` with payload validation
- [ ] 2.11.11 Implement `isLoaded()`, `isMounted()`, `getMountedMfes()` queries
- [ ] 2.11.12 Add unit tests for orchestrator (including entry schema validation)

### 2.12 Package Verification
- [ ] 2.12.1 Verify ZERO @hai3/state dependencies
- [ ] 2.12.2 Verify all APIs use props/callbacks (no store, dispatch, emit references)
- [ ] 2.12.3 Run `npm run type-check:packages:screensets`
- [ ] 2.12.4 Run `npm run build:packages:screensets`

## Phase 3: Flux Integration (@hai3/framework)

**Key constraint**: This phase ONLY wires the orchestrator into Flux data flow. Actions emit events, effects call orchestrator and dispatch.

### 3.1 Configuration Types
- [ ] 3.1.1 Add `MicrofrontendsConfig` interface with `remotes`, `styleIsolation`, `errorBoundary`, `loadingComponent`
- [ ] 3.1.2 Add `StyleIsolation` type ('shadow-dom' | 'none')
- [ ] 3.1.3 Add `MfeLoadState` type ('idle' | 'loading' | 'loaded' | 'error')

### 3.2 MFE Actions
- [ ] 3.2.1 Create `plugins/microfrontends/actions.ts`
- [ ] 3.2.2 Implement `loadMfe(mfeTypeId)` action - emits 'mfe/loadRequested', returns void
- [ ] 3.2.3 Implement `mountMfeEntry(mfeTypeId, entryTypeId, domain)` action - emits event, returns void
- [ ] 3.2.4 Implement `unmountMfe(mfeTypeId)` action - emits event, returns void
- [ ] 3.2.5 Implement `handleMfeHostAction(mfeTypeId, actionTypeId, payload)` action - emits event, returns void
- [ ] 3.2.6 Implement `requestMfeAction(mfeTypeId, actionTypeId, payload)` action - emits event, returns void
- [ ] 3.2.7 Verify ALL actions return void, NO async keyword

### 3.3 MFE Slice
- [ ] 3.3.1 Create `slices/mfeSlice.ts`
- [ ] 3.3.2 Add state shape: `{ loadStates, errors, mounted }`
- [ ] 3.3.3 Add reducers: `setLoading`, `setLoaded`, `setError`, `setMounted`, `setUnmounted`
- [ ] 3.3.4 Add selectors: `selectMfeLoadState`, `selectMfeError`, `selectMountedMfes`
- [ ] 3.3.5 Register slice with createSlice from @hai3/state

### 3.4 MFE Effects
- [ ] 3.4.1 Create `plugins/microfrontends/effects.ts`
- [ ] 3.4.2 Implement load effect: subscribes to 'mfe/loadRequested', calls orchestrator.load(), dispatches to slice
- [ ] 3.4.3 Implement mount effect: subscribes to 'mfe/mountRequested', calls orchestrator.mount(), dispatches
- [ ] 3.4.4 Implement unmount effect: subscribes to 'mfe/unmountRequested', calls orchestrator.unmount()
- [ ] 3.4.5 Implement host action effect: subscribes to 'mfe/hostActionRequested', handles popup/sidebar/etc
- [ ] 3.4.6 Implement MFE action effect: subscribes to 'mfe/mfeActionRequested', calls orchestrator.requestMfeAction()
- [ ] 3.4.7 Verify effects do NOT call actions (prevents loops)
- [ ] 3.4.8 Add unit tests for effects

### 3.5 Orchestrator Callback Wiring
- [ ] 3.5.1 Create `plugins/microfrontends/createWiredOrchestrator.ts`
- [ ] 3.5.2 Wire `createBridge` factory to create MfeBridge with onHostAction → handleMfeHostAction action
- [ ] 3.5.3 Wire lifecycle callbacks to emit events
- [ ] 3.5.4 Wire `getAppState` to use store selector
- [ ] 3.5.5 Wire `subscribeToState` to use store.subscribe

### 3.6 Shadow DOM React Component
- [ ] 3.6.1 Create `components/ShadowDomContainer.tsx`
- [ ] 3.6.2 Use `createShadowRoot()` from @hai3/screensets on mount
- [ ] 3.6.3 Use `injectCssVariables()` from @hai3/screensets
- [ ] 3.6.4 Render children via React portal into shadow root
- [ ] 3.6.5 Clean up on unmount

### 3.7 Error and Loading Components
- [ ] 3.7.1 Create `components/MfeErrorBoundary.tsx` with `mfeTypeId` prop
- [ ] 3.7.2 Create `components/MfeLoadingIndicator.tsx` with `mfeTypeId` prop
- [ ] 3.7.3 Support custom component override via config

### 3.8 Plugin Implementation
- [ ] 3.8.1 Create `plugins/microfrontends/index.ts`
- [ ] 3.8.2 Implement `microfrontends()` plugin factory
- [ ] 3.8.3 Declare dependency on `screensets` plugin
- [ ] 3.8.4 Initialize orchestrator with wired callbacks in `onInit`
- [ ] 3.8.5 Register mfeSlice
- [ ] 3.8.6 Initialize effects with orchestrator reference
- [ ] 3.8.7 Augment EventPayloadMap with MfeEventPayloads
- [ ] 3.8.8 Export mfeActions for component use

### 3.9 Navigation Integration
- [ ] 3.9.1 Add `navigateToMfe` action that emits 'navigation/mfeRequested'
- [ ] 3.9.2 Add effect that loads and mounts MFE on navigation
- [ ] 3.9.3 Add effect that unmounts previous MFE on navigation away
- [ ] 3.9.4 Validate entry type conformance on mount

### 3.10 Preloading
- [ ] 3.10.1 Implement 'hover' preload strategy (menu item hover triggers orchestrator.preload)
- [ ] 3.10.2 Implement 'immediate' preload strategy (app startup calls preload)

### 3.11 Package Verification
- [ ] 3.11.1 Export plugin and types from index
- [ ] 3.11.2 Run `npm run type-check:packages:framework`
- [ ] 3.11.3 Run `npm run build:packages`
- [ ] 3.11.4 Run `npm run arch:check`

## Phase 4: Integration & Testing

### 4.1 Example MFE Project
- [ ] 4.1.1 Create `examples/mfe-analytics/` directory
- [ ] 4.1.2 Configure Vite with Module Federation plugin
- [ ] 4.1.3 Define MFE with GTS type ID derived from `HAI3_MFE_TYPE`
- [ ] 4.1.4 Define entries with GTS type IDs derived from `HAI3_MFE_ENTRY_*`
- [ ] 4.1.5 Register action schemas in `gtsRegistry`
- [ ] 4.1.6 Demonstrate bridge.subscribe() usage
- [ ] 4.1.7 Demonstrate bridge.requestHostAction() with typed payloads
- [ ] 4.1.8 Demonstrate actionHandlers for host→MFE requests

### 4.2 Host Integration Example
- [ ] 4.2.1 Add microfrontends plugin to demo app
- [ ] 4.2.2 Configure remote MFE with GTS type ID
- [ ] 4.2.3 Test navigation to MFE screenset
- [ ] 4.2.4 Test popup rendering from MFE request
- [ ] 4.2.5 Test sidebar rendering from MFE request
- [ ] 4.2.6 Test payload validation errors

### 4.3 Unit Tests
- [ ] 4.3.1 Test `parseGtsId()` for valid/invalid identifiers
- [ ] 4.3.2 Test `gts()` builder for various configurations
- [ ] 4.3.3 Test `gtsRegistry.validate()` for valid/invalid payloads
- [ ] 4.3.4 Test `conformsTo()` for chain-based conformance
- [ ] 4.3.5 Test MFE type schema validation (valid `MicrofrontendDefinition`)
- [ ] 4.3.6 Test MFE type schema validation (invalid/missing fields → `MfeSchemaValidationError`)
- [ ] 4.3.7 Test entry schema validation per domain (screen, popup, sidebar, overlay)
- [ ] 4.3.8 Test entry schema validation failure → `MfeEntrySchemaValidationError`
- [ ] 4.3.9 Test `MfeBridge` subscription behavior with callbacks
- [ ] 4.3.10 Test subscription debounce option
- [ ] 4.3.11 Test `requestHostAction()` with payload validation
- [ ] 4.3.12 Test `MfeOrchestrator` lifecycle
- [ ] 4.3.13 Test subscription cleanup on bridge destroy
- [ ] 4.3.14 Test MFE actions emit correct events
- [ ] 4.3.15 Test MFE effects call orchestrator correctly
- [ ] 4.3.16 Test effects do NOT call actions

### 4.4 Integration Tests
- [ ] 4.4.1 Test MFE load and mount lifecycle via Flux flow
- [ ] 4.4.2 Test MFE schema validation on load (valid and invalid bundles)
- [ ] 4.4.3 Test entry schema validation on mount (valid and invalid entries)
- [ ] 4.4.4 Test state subscription updates via bridge
- [ ] 4.4.5 Test host→MFE action requests with validation
- [ ] 4.4.6 Test MFE→host action requests with validation
- [ ] 4.4.7 Test navigation away cleanup
- [ ] 4.4.8 Test CSS isolation in Shadow DOM
- [ ] 4.4.9 Test multiple concurrent MFEs

### 4.5 Performance Tests
- [ ] 4.5.1 Verify MFE load time < 500ms (p95) after host loaded
- [ ] 4.5.2 Verify bridge action round-trip < 10ms
- [ ] 4.5.3 Verify no memory leaks after 100 mount/unmount cycles
- [ ] 4.5.4 Verify GTS validation overhead < 1ms per action

## Phase 5: Documentation & CLI

### 5.1 Documentation
- [ ] 5.1.1 Update @hai3/screensets CLAUDE.md with GTS utilities, MFE orchestration classes
- [ ] 5.1.2 Update @hai3/framework CLAUDE.md with Flux integration (actions, effects, plugin)
- [ ] 5.1.3 Add architecture diagram showing screensets orchestration + framework Flux wiring
- [ ] 5.1.4 Document the data flow: Component → Action → Event → Effect → Orchestrator → Slice

### 5.2 CLI Commands
- [ ] 5.2.1 Add `hai3 create --mfe` command for MFE screenset template
- [ ] 5.2.2 Generate Vite + Module Federation config
- [ ] 5.2.3 Generate example MicrofrontendDefinition with GTS types
- [ ] 5.2.4 Generate example entries and contract with GTS type IDs
- [ ] 5.2.5 Generate example action schema registration

### 5.3 Final Validation
- [ ] 5.3.1 Run full build: `npm run build:packages`
- [ ] 5.3.2 Run arch check: `npm run arch:check`
- [ ] 5.3.3 Run type check: `npm run type-check`
- [ ] 5.3.4 Run lint: `npm run lint`
- [ ] 5.3.5 Manual browser testing via Chrome MCP

---

## Dependencies

```
Phase 1 (GTS) ───────────────────┐
          │                      │
          v                      │
Phase 2 (MFE Orchestration) ─────┤
          │                      ├──> Phase 4 (Testing)
          v                      │
Phase 3 (Flux Integration) ──────┘
          │
          v
Phase 5 (Docs & CLI)
```

**Parallelizable:**
- Phase 4.1 (Example MFE) can start after Phase 2
- Phase 5.1-5.2 can start after Phase 3

**Critical Path:**
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

## Key Architectural Notes

1. **@hai3/screensets** is a complete MFE orchestration library with ZERO @hai3/state dependencies
2. **@hai3/screensets** uses props/callbacks interface for all state-related operations
3. **@hai3/framework** ONLY provides Flux integration glue
4. Framework Actions emit events and return void (no async)
5. Framework Effects subscribe to events, call orchestrator methods, dispatch to slices
6. Effects may NOT call actions (prevents loops)
7. Bridge `onHostAction` callback is wired to a Framework action at plugin init time
