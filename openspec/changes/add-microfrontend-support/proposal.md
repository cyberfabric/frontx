# Change: Add Microfrontend Support with GTS Type System

## Why

HAI3 currently bundles all screensets into a monolithic application, creating several limitations for enterprise SaaS platforms:

1. **Build coupling** - All screensets rebuild together, increasing CI/CD times
2. **Deployment coupling** - Single screenset change requires full app redeployment
3. **Team scalability** - Multiple teams cannot independently deploy screensets
4. **Runtime flexibility** - Cannot load screensets dynamically based on tenant/user permissions
5. **Third-party extensibility** - Partners cannot inject functionality without source access
6. **Weak identification** - Simple string IDs don't scale for multi-vendor ecosystems

This change introduces **true runtime vertical slices** where screensets are deployed as independently built microfrontends (MFEs) that the host application loads and orchestrates at runtime with zero build-time knowledge.

**Additionally**, this change adopts the [Global Type System (GTS)](https://github.com/GlobalTypeSystem/gts-spec) for:
- Hierarchical, vendor-namespaced, versioned identifiers (like Apple's UTIs)
- JSON Schema-backed type definitions for MFEs, entries, and actions
- Runtime validation of loaded MFE bundles against registered schemas
- Schema registry for type discovery and conformance checking

## What Changes

### @hai3/screensets (SDK Layer L1) - Full MFE Orchestration Library

This package becomes a **complete MFE orchestration library** with a **state-management agnostic API** (props/callbacks interface). It has ZERO dependencies on `@hai3/state`.

- **ADDED** GTS type system utilities (`GtsTypeId`, `parseGtsId`, `gts()` builder)
- **ADDED** GTS schema registry (`gtsRegistry`) for storing and validating schemas
- **ADDED** `conformsTo()` function for type conformance checking
- **ADDED** `MicrofrontendDefinition` as a **full GTS type** with JSON Schema (`gts.hai3.mfe.type.v1~`)
- **ADDED** `MfeEntry` as **full GTS types** per domain with JSON Schemas (`gts.hai3.mfe.entry.screen.v1~`, etc.)
- **ADDED** Runtime validation of loaded MFE definitions against registered schemas
- **ADDED** `MfeBridge` class implementation (props/callbacks, NO state references)
- **ADDED** `MfeOrchestrator` class for loading, mounting, unmounting MFEs
- **ADDED** `MfeLoader` for Module Federation 2.0 remote loading
- **ADDED** `createShadowRoot()` utility for Shadow DOM isolation
- **ADDED** `MfeContract` interface for MFE lifecycle (mount/unmount/action handlers)
- **ADDED** `microfrontendRegistry` singleton for MFE definition storage
- **ADDED** Predefined HAI3 GTS base types for MFEs, entries, and actions
- **ADDED** MFE error types (`PayloadValidationError`, `MfeNotMountedError`, `ActionNotAllowedError`)
- **ADDED** MFE event payload types for `EventPayloadMap` augmentation

### @hai3/framework (Framework Layer L2) - Flux Integration Only

This package provides **ONLY the Flux integration** layer. It wires the MFE orchestrator (from @hai3/screensets) into the event-driven data flow pattern from @hai3/state.

- **ADDED** `microfrontends()` plugin
- **ADDED** MFE Actions (`loadMfe`, `mountMfeEntry`, `unmountMfe`, `requestMfeAction`, etc.) that emit events
- **ADDED** MFE Effects that subscribe to events and call orchestrator methods, then dispatch to slice
- **ADDED** `mfeSlice` for tracking MFE load states
- **ADDED** Bridge callback wiring (orchestrator callbacks → framework actions → events)
- **MODIFIED** Navigation plugin to detect and delegate to MFE screensets

### Non-Goals (Out of Scope)
- Server-Side Rendering for MFEs (client-side only)
- Cross-MFE direct communication (must go through host)
- Shared state between MFEs (each gets narrow app slice)
- HMR for remote MFEs
- Build tool migration (bundler-agnostic at contract level)
- GTS instance identifiers for runtime MFE instances (use opaque UUIDs)

## Impact

- **Affected specs**: `screensets`
- **New capability**: `microfrontends`
- **Affected code**:
  - `packages/screensets/src/gts/` - GTS utilities (parser, builder, registry, conformance)
  - `packages/screensets/src/mfe/` - Full MFE orchestration (Bridge, Orchestrator, Loader, ShadowDom, Registry)
  - `packages/screensets/src/errors.ts` - MFE error types
  - `packages/framework/src/plugins/microfrontends/` - Flux integration (actions, effects, plugin)
  - `packages/framework/src/slices/mfeSlice.ts` - MFE load states

## Key Architectural Decisions

1. **GTS Type System** - Hierarchical, versioned, vendor-namespaced identifiers (e.g., `gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~`)
2. **MFEs and Entries are Full GTS Types** - `MicrofrontendDefinition` and `MfeEntry` have JSON Schemas registered in `gtsRegistry`; loaded bundles are validated against these schemas at runtime
3. **Schema Registry + Runtime Validation** - Validates MFE definitions on load, action payloads before execution, and entry structures before mounting
4. **Module Federation 2.0** - Mature, TypeScript support, battle-tested
5. **1 MFE = 1 Screenset with multiple entries** - Each layout domain (screen, popup, sidebar, overlay) is a separate GTS-typed entry
6. **Shadow DOM for style isolation** - Web standard, CSS variables pass through for theming
7. **Thin bridge contracts (ISP)** - MFEs see only narrow `app` state slice, not full RootState
8. **Runtime injection** - Host has zero build-time knowledge of MFEs
9. **Types only, not instances** - MFE definitions have GTS type IDs; runtime instances use opaque UUIDs
10. **Full implementation in SDK, Flux wiring in Framework** - @hai3/screensets contains complete MFE orchestration (state-agnostic, props/callbacks); @hai3/framework wires callbacks to Flux data flow (Actions emit events, Effects dispatch)

## GTS Type Examples

All MFEs, entries, and actions are **full GTS types** with JSON Schemas registered in `gtsRegistry`.

```
# HAI3 Platform Base Types (with JSON Schemas)
gts.hai3.mfe.type.v1~                              # MicrofrontendDefinition schema
gts.hai3.mfe.entry.v1~                             # Base MfeEntry schema
gts.hai3.mfe.entry.screen.v1~                      # Screen entry schema (extends entry.v1)
gts.hai3.mfe.entry.popup.v1~                       # Popup entry schema (extends entry.v1)
gts.hai3.action.host.show_popup.v1~                # Host action payload schema

# Vendor MFE (conforms to HAI3 MFE type, validated on load)
gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~

# Vendor Entry (conforms to HAI3 screen entry, validated on mount)
gts.hai3.mfe.entry.screen.v1~acme.analytics.screens.main.v1~

# Vendor Action (conforms to HAI3 MFE action, validated on invocation)
gts.hai3.action.mfe.v1~acme.analytics.actions.refresh_data.v1~
```

**Runtime Validation Flow:**
1. MFE bundle loaded → validate `MicrofrontendDefinition` against `gts.hai3.mfe.type.v1~` schema
2. Entry mounted → validate `MfeEntry` against domain-specific schema (e.g., `gts.hai3.mfe.entry.screen.v1~`)
3. Action invoked → validate payload against action's schema
