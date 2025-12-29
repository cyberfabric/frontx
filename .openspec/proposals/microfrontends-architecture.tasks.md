# Tasks: Microfrontends Architecture for HAI3

| Field          | Value                                           |
|----------------|-------------------------------------------------|
| **Proposal**   | MFE-001 - Microfrontends Architecture           |
| **Status**     | Draft                                           |
| **Created**    | 2025-12-29                                      |

---

## Overview

Sequential task breakdown for implementing microfrontends support in HAI3. Tasks are ordered by dependency - each task builds on the previous.

---

## Phase 1: SDK Contracts (@hai3/screensets)

### Task 1.1: Add MicrofrontendId Branded Type

**Requirement**: FR-1, NFR-6
**Scenario**: All scenarios require MFE identification

**Description**: Add branded type for microfrontend identifiers to `@hai3/screensets/types.ts`

**Changes**:
- Add `MicrofrontendId` branded type following `ScreensetId` pattern
- Export from package index

**Done Condition**:
- [ ] `MicrofrontendId` exported from `@hai3/screensets`
- [ ] Type follows branded type pattern: `string & { readonly __brand: 'MicrofrontendId' }`
- [ ] TypeScript compiles without errors

---

### Task 1.2: Add HostBridge Interface

**Requirement**: FR-3, FR-4, NFR-4
**Scenario**: Scenario 2 (MFE-to-Host), Scenario 4 (State Sync)

**Description**: Define the thin interface that host exposes to MFEs for state subscription and action requests

**Changes**:
- Add `HostBridge<TState, THostActions>` interface
- Add `SubscribeOptions` interface
- Add `Subscription` type (re-use from @hai3/state if compatible)

**Done Condition**:
- [ ] `HostBridge` interface exported with generic parameters
- [ ] `subscribe()` method signature supports selector, callback, options
- [ ] `requestHostAction()` method signature supports typed action + payload
- [ ] `getState()` method returns current snapshot
- [ ] TypeScript inference works: `bridge.requestHostAction('showPopup', {...})` autocompletes

---

### Task 1.3: Add MfeContract Interface

**Requirement**: FR-5, FR-10, NFR-4
**Scenario**: Scenario 1 (Initial Load), Scenario 3 (Host-to-MFE Action)

**Description**: Define the interface that MFEs must implement for host integration

**Changes**:
- Add `MfeActionHandler<TPayload, TResult>` type
- Add `MfeActionHandlers` type (record of handlers)
- Add `MfeMountResult` interface (with unmount callback)
- Add `MfeContract<THostState, THostActions, TMfeActions>` interface

**Done Condition**:
- [ ] `MfeContract` interface exported
- [ ] `mount()` signature accepts container and bridge, returns `MfeMountResult`
- [ ] `actionHandlers` property typed correctly
- [ ] Async mount supported (returns `Promise<MfeMountResult>`)

---

### Task 1.4: Add MicrofrontendDefinition and MfeMenuConfig

**Requirement**: FR-8
**Scenario**: Scenario 1 (Initial Load)

**Description**: Define the complete configuration structure for an MFE

**Changes**:
- Add `MfeMenuConfig` interface
- Add `MicrofrontendDefinition` interface (analogous to `ScreensetDefinition`)

**Done Condition**:
- [ ] `MicrofrontendDefinition` exported with all fields (id, name, version, menu, contract)
- [ ] `MfeMenuConfig` supports position options
- [ ] Generic parameters flow correctly to contract

---

### Task 1.5: Add MicrofrontendRegistry Interface

**Requirement**: FR-8
**Scenario**: All scenarios

**Description**: Define registry interface following ScreensetRegistry pattern

**Changes**:
- Add `MicrofrontendRegistry` interface

**Done Condition**:
- [ ] Interface matches ScreensetRegistry pattern (register, get, getAll, has, unregister, clear)
- [ ] Methods use `MicrofrontendId` type for id parameters
- [ ] Returns `MicrofrontendDefinition` types

---

### Task 1.6: Add defineMicrofrontend Helper

**Requirement**: NFR-4
**Scenario**: MFE Developer Journey

**Description**: Add type-safe helper function for defining MFEs

**Changes**:
- Add `defineMicrofrontend()` function (identity function with type inference)
- Export from package index

**Done Condition**:
- [ ] Function exported from package
- [ ] Type inference works: IDE autocompletes fields
- [ ] Generic parameters inferred from definition object

---

## Phase 2: Bridge Implementation (@hai3/state)

### Task 2.1: Add MfeBridgeConfig Type

**Requirement**: FR-3, FR-4, FR-5
**Scenario**: All scenarios

**Description**: Define configuration for creating bridge instances

**Changes**:
- Add `MfeBridgeConfig<TState, THostActions>` interface in new `mfe/` folder
- Reference types from `@hai3/screensets`

**Done Condition**:
- [ ] `MfeBridgeConfig` interface exported
- [ ] References `HAI3Actions` from framework types
- [ ] Store and selector types correct

---

### Task 2.2: Implement createMfeBridge Function

**Requirement**: FR-3, FR-4, NFR-2
**Scenario**: Scenario 4 (State Sync), Scenario 2 (MFE-to-Host)

**Description**: Implement bridge factory that creates typed host bridges

**Changes**:
- Create `mfe/createMfeBridge.ts`
- Implement `MfeBridgeImpl` class
- Implement subscription with debounce and immediate options
- Implement action request with allowlist validation
- Export factory function

**Done Condition**:
- [ ] `createMfeBridge()` exported
- [ ] Subscriptions fire on selector changes
- [ ] Debounce works correctly (test with 100ms debounce)
- [ ] Immediate option fires callback immediately
- [ ] Action allowlist validation throws `ActionNotAllowedError`
- [ ] `getState()` returns current snapshot

---

### Task 2.3: Implement MfeBridgeManager

**Requirement**: FR-5, FR-10, NFR-2
**Scenario**: Scenario 3 (Host-to-MFE), Scenario 5 (Unmount)

**Description**: Implement manager for multiple MFE bridges

**Changes**:
- Create `mfe/MfeBridgeManager.ts`
- Track active bridges by MFE ID
- Implement `requestMfeAction()` routing
- Implement `registerMfeHandlers()` for MFE handler registration
- Implement `destroyBridge()` cleanup

**Done Condition**:
- [ ] `createMfeBridgeManager()` exported
- [ ] Can create multiple bridges for different MFEs
- [ ] `requestMfeAction()` routes to correct handler
- [ ] `isMounted()` returns correct state
- [ ] `destroyBridge()` cleans up all subscriptions
- [ ] Throws `MfeNotMountedError` for unmounted MFE actions
- [ ] Throws `ActionNotRegisteredError` for missing handlers

---

### Task 2.4: Add MFE Lifecycle Events

**Requirement**: FR-11, FR-12
**Scenario**: All scenarios (observability)

**Description**: Add events to EventPayloadMap for MFE lifecycle

**Changes**:
- Add module augmentation for EventPayloadMap
- Add loading, loaded, loadError, mounted, unmounted events
- Add actionRequested, actionCompleted, actionFailed events

**Done Condition**:
- [ ] Events defined in EventPayloadMap
- [ ] Events can be emitted via eventBus
- [ ] Events can be subscribed to via eventBus.on
- [ ] TypeScript inference works for payloads

---

### Task 2.5: Add Subscription Cleanup Tracking

**Requirement**: FR-10, NFR-3
**Scenario**: Scenario 5 (Unmount)

**Description**: Ensure all subscriptions are tracked and cleaned up

**Changes**:
- Add subscription tracking in bridge
- Implement automatic cleanup on destroyBridge
- Add dev mode warning for leaked subscriptions

**Done Condition**:
- [ ] All subscriptions tracked per bridge
- [ ] `destroyBridge()` unsubscribes all
- [ ] Dev mode logs warning if subscriptions remain after unmount
- [ ] No memory leaks after 100 mount/unmount cycles (manual verification)

---

## Phase 3: Framework Plugin (@hai3/framework)

### Task 3.1: Add MfeRemoteConfig and MicrofrontendsConfig Types

**Requirement**: FR-1, FR-6
**Scenario**: Host Application Developer Journey

**Description**: Define configuration types for the microfrontends plugin

**Changes**:
- Create `plugins/microfrontends/types.ts`
- Add `MfeRemoteConfig` interface
- Add `StyleIsolation` type
- Add `MicrofrontendsConfig` interface

**Done Condition**:
- [ ] All config types exported
- [ ] Preload strategies defined
- [ ] Style isolation options defined
- [ ] CSS variables passthrough configurable

---

### Task 3.2: Implement MfeLoader

**Requirement**: FR-2, FR-9, NFR-1
**Scenario**: Scenario 1 (Initial Load)

**Description**: Implement loader for fetching remote MFE bundles

**Changes**:
- Create `plugins/microfrontends/MfeLoader.ts`
- Implement dynamic import via Module Federation API
- Add timeout handling
- Add load state tracking
- Add error capture

**Done Condition**:
- [ ] `MfeLoader` class implemented
- [ ] `load()` fetches and returns `MicrofrontendDefinition`
- [ ] `preload()` fetches but doesn't mount
- [ ] Timeout triggers `MfeLoadTimeoutError`
- [ ] Network errors captured as `MfeNetworkError`
- [ ] `getLoadState()` returns correct state

---

### Task 3.3: Implement MicrofrontendRegistry

**Requirement**: FR-8
**Scenario**: All scenarios

**Description**: Implement registry following ScreensetRegistry pattern

**Changes**:
- Create `registries/microfrontendRegistry.ts`
- Implement Map-based storage
- Export singleton

**Done Condition**:
- [ ] Registry implements `MicrofrontendRegistry` interface
- [ ] All methods work correctly
- [ ] Singleton exported

---

### Task 3.4: Implement ShadowDomContainer Component

**Requirement**: FR-6
**Scenario**: Scenario 1 (Initial Load)

**Description**: React component that renders children in Shadow DOM

**Changes**:
- Create `components/ShadowDomContainer.tsx` in framework or separate to @hai3/react
- Attach shadow root on mount
- Pass through CSS custom properties
- Handle unmount cleanup

**Done Condition**:
- [ ] Component renders children in shadow root
- [ ] CSS variables passed via `::host` styles
- [ ] Shadow root cleaned up on unmount
- [ ] Supports `open` and `closed` modes

---

### Task 3.5: Implement microfrontends() Plugin

**Requirement**: FR-1, FR-2, FR-8
**Scenario**: All scenarios

**Description**: Main plugin that integrates all MFE functionality

**Changes**:
- Create `plugins/microfrontends/index.ts`
- Implement plugin factory
- Provide registries, slices, effects, actions
- Integrate with navigation plugin for MFE screenset detection
- Wire up MfeLoader and BridgeManager

**Done Condition**:
- [ ] Plugin can be added via `.use(microfrontends())`
- [ ] Remotes config parsed and stored
- [ ] Navigation to MFE screenset triggers load
- [ ] Bridge created and passed to MFE mount
- [ ] MFE menu items added to host menu

---

### Task 3.6: Add MFE Slice for State Tracking

**Requirement**: FR-9
**Scenario**: Scenario 1 (Initial Load)

**Description**: Redux slice to track MFE states

**Changes**:
- Create `slices/mfeSlice.ts`
- Track load state per MFE
- Track errors per MFE
- Track mounted MFEs

**Done Condition**:
- [ ] Slice exported with state shape
- [ ] Actions: setMfeLoading, setMfeLoaded, setMfeError, setMfeMounted, setMfeUnmounted
- [ ] Selectors: selectMfeLoadState, selectMfeError, selectMountedMfes

---

### Task 3.7: Integrate with Navigation Plugin

**Requirement**: FR-2
**Scenario**: Scenario 1 (Initial Load), Scenario 5 (Unmount)

**Description**: Modify navigation to detect MFE screensets and trigger load/unmount

**Changes**:
- Update `plugins/navigation.ts` to check if screenset is MFE
- Trigger MFE load on navigation to MFE screenset
- Trigger MFE unmount on navigation away

**Done Condition**:
- [ ] Navigation to MFE screenset triggers MfeLoader.load()
- [ ] Navigation away triggers bridge.destroyBridge()
- [ ] Loading state shown during load
- [ ] Error boundary shown on load failure

---

### Task 3.8: Add Error and Loading Boundaries

**Requirement**: FR-9, NFR-1
**Scenario**: Scenario 1 (Initial Load)

**Description**: Default error and loading components for MFE states

**Changes**:
- Create `components/MfeErrorBoundary.tsx`
- Create `components/MfeLoadingIndicator.tsx`
- Allow override via plugin config

**Done Condition**:
- [ ] Error boundary displays error with retry button
- [ ] Loading indicator shows during MFE load
- [ ] Custom components can be provided via config
- [ ] Retry button triggers reload

---

## Phase 4: Integration and Testing

### Task 4.1: Create Example MFE Project

**Requirement**: NFR-4
**Scenario**: MFE Developer Journey

**Description**: Create example MFE that demonstrates all features

**Changes**:
- Create `examples/mfe-analytics/` project
- Implement MFE using contracts
- Subscribe to host state
- Expose action handlers
- Request host actions

**Done Condition**:
- [ ] Example compiles and bundles
- [ ] Exports valid `MicrofrontendDefinition`
- [ ] All bridge features demonstrated
- [ ] Can be loaded by host app

---

### Task 4.2: Create Host Integration Example

**Requirement**: All FR
**Scenario**: Host Application Developer Journey

**Description**: Demonstrate host configuration and MFE loading

**Changes**:
- Update demo app to use microfrontends plugin
- Configure remote MFE
- Show navigation between local and MFE screensets

**Done Condition**:
- [ ] Host loads MFE from example
- [ ] Navigation works seamlessly
- [ ] State sync demonstrated
- [ ] Action requests work both directions

---

### Task 4.3: Add Unit Tests for Bridge

**Requirement**: NFR-2
**Scenario**: All scenarios

**Description**: Test bridge implementation

**Changes**:
- Add tests for `createMfeBridge`
- Add tests for `MfeBridgeManager`
- Test subscription behavior
- Test action routing

**Done Condition**:
- [ ] Subscription fires on state change
- [ ] Debounce works correctly
- [ ] Action allowlist enforced
- [ ] Cleanup removes all subscriptions
- [ ] Error cases handled correctly

---

### Task 4.4: Add Integration Tests

**Requirement**: All FR, NFR
**Scenario**: All scenarios

**Description**: End-to-end tests for MFE lifecycle

**Changes**:
- Add test for MFE load and mount
- Add test for state subscription
- Add test for action requests
- Add test for unmount cleanup

**Done Condition**:
- [ ] Full lifecycle tested
- [ ] No memory leaks detected
- [ ] Performance within targets

---

### Task 4.5: Update Documentation

**Requirement**: All
**Scenario**: Developer Journey

**Description**: Document MFE features

**Changes**:
- Update CLAUDE.md files for affected packages
- Add API documentation
- Add architecture diagrams if needed

**Done Condition**:
- [ ] @hai3/screensets CLAUDE.md updated with MFE contracts
- [ ] @hai3/state CLAUDE.md updated with bridge API
- [ ] @hai3/framework CLAUDE.md updated with plugin

---

## Phase 5: Advanced Features (Future)

### Task 5.1: Add Preloading Strategies

**Requirement**: FR-14
**Scenario**: Performance optimization

**Description**: Implement hover and visible preloading

**Changes**:
- Add preload on menu item hover
- Add preload when element enters viewport
- Track preloaded MFEs

**Done Condition**:
- [ ] Hover preload triggers on menu hover
- [ ] Visible preload triggers on intersection
- [ ] Preloaded MFEs mount faster

---

### Task 5.2: Add Version Mismatch Detection

**Requirement**: FR-13
**Scenario**: Compatibility checking

**Description**: Validate shared dependency versions

**Changes**:
- Add version metadata to MFE bundle
- Compare at load time
- Warn or block on mismatch

**Done Condition**:
- [ ] Version info available in MFE metadata
- [ ] Comparison logic implemented
- [ ] Configurable strictness (warn vs block)

---

### Task 5.3: Add Event Forwarding

**Requirement**: FR-11, FR-12
**Scenario**: Cross-cutting events

**Description**: Optional event forwarding between host and MFEs

**Changes**:
- Add event whitelist to bridge config
- Forward whitelisted events to MFE
- Allow MFE to emit whitelisted events

**Done Condition**:
- [ ] Host events forwarded to subscribed MFEs
- [ ] MFE events emitted to host EventBus
- [ ] Whitelist enforced

---

## Task Dependency Graph

```
Phase 1 (SDK Contracts)
  1.1 -> 1.2 -> 1.3 -> 1.4 -> 1.5 -> 1.6

Phase 2 (Bridge)
  2.1 -> 2.2 -> 2.3 -> 2.4 -> 2.5
  (Depends on Phase 1 completion)

Phase 3 (Framework)
  3.1 -> 3.2 -> 3.3 -> 3.4 -> 3.5 -> 3.6 -> 3.7 -> 3.8
  (Depends on Phase 2 completion)

Phase 4 (Integration)
  4.1 -> 4.2 -> 4.3 -> 4.4 -> 4.5
  (Depends on Phase 3 completion)

Phase 5 (Advanced)
  5.1, 5.2, 5.3 (Independent, can be done in any order)
  (Depends on Phase 4 completion)
```

---

## Estimation Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| Phase 1 | 6 | 2 days |
| Phase 2 | 5 | 3 days |
| Phase 3 | 8 | 5 days |
| Phase 4 | 5 | 4 days |
| Phase 5 | 3 | 3 days (optional) |
| **Total** | **27** | **14-17 days** |
