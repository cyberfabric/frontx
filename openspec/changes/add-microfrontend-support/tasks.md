# Implementation Tasks

## Status

All MFE implementation tasks are COMPLETE (410 screensets + 16 react tests passing).

Phase 27 (React component migration) is now COMPLETE. @hai3/screensets has zero React dependencies.

### Completed Work

| Area | Description | Status |
|------|-------------|--------|
| Type System Plugin Infrastructure | `TypeSystemPlugin` interface, GTS plugin, built-in schemas | COMPLETE |
| Internal TypeScript Types | 8 core + 2 MF-specific GTS types | COMPLETE |
| ScreensetsRegistry | Abstract class, factory-with-cache, dynamic registration API | COMPLETE |
| Contract Matching Validation | Entry-domain contract validation, derived Extension types | COMPLETE |
| Instance-Level Isolation | Shadow DOM, per-instance runtime, MfeHandlerMF | COMPLETE |
| Actions Chain Mediation | ActionsChainsMediator, timeout resolution, success/failure branching | COMPLETE |
| Base Layout Domains | Sidebar, popup, screen, overlay domain definitions | COMPLETE |
| MFE Loading and Error Handling | MfeHandler abstraction, MfeHandlerMF, error class hierarchy | COMPLETE |
| Framework Microfrontends Plugin | Zero-config plugin, Flux integration, store slice | COMPLETE |
| React MFE Integration | MfeContainer, hooks, bridge React wrappers | COMPLETE |
| MFE Bridge Implementation | ParentMfeBridge, ChildMfeBridge, property subscriptions | COMPLETE |
| Shadow DOM and Error Handling | createShadowRoot, injectCssVariables, error boundaries | COMPLETE |
| Handler Internal Caching | ManifestCache inside MfeHandlerMF | COMPLETE |
| GTS Utilities and Constants | Type ID constants, action constants | COMPLETE |
| Dynamic Registration Model | Runtime registration/unregistration, cascade unregister | COMPLETE |
| Framework Dynamic Registration Actions | registerExtension/unregisterExtension actions and effects | COMPLETE |
| Abstract Class Layers | Abstract + concrete split for all stateful components | COMPLETE |
| Cross-Runtime Action Chain Routing | ChildDomainForwardingHandler, hierarchical composition | COMPLETE |
| Extension Lifecycle Actions | load_ext, mount_ext, unmount_ext via executeActionsChain | COMPLETE |
| Callback Injection for Lifecycle | Load/mount/unmount via OperationSerializer callbacks | COMPLETE |
| Container Provider Abstraction | ContainerProvider abstract class, domain-owned containers | COMPLETE |
| Flux Architecture Compliance | Actions call executeActionsChain directly, lifecycle effects removed, ESLint protection | COMPLETE |
| Zero React Dependencies in SDK Layer | RefContainerProvider and ExtensionDomainSlot moved to @hai3/react | COMPLETE |

### Current Construction Patterns

| Component | Pattern |
|-----------|---------|
| GtsPlugin | Singleton constant (`gtsPlugin`) |
| ScreensetsRegistry | Factory-with-cache (`screensetsRegistryFactory`) |
| MfeStateContainer | Internal construction by `DefaultMountManager` |

---

## Phase 27: Move React-Dependent Components to @hai3/react (COMPLETE)

**Goal**: `@hai3/screensets` is SDK Layer L1 with zero dependencies. Three files currently import React, violating this constraint. Move `RefContainerProvider` and `ExtensionDomainSlot` to `@hai3/react`.

### 27.1 Move RefContainerProvider to @hai3/react

- [x] 27.1.1 Move `packages/screensets/src/mfe/runtime/ref-container-provider.ts` to `packages/react/src/mfe/components/RefContainerProvider.ts`. Update the import from `import type React from 'react'` to use the appropriate React ref type.
- [x] 27.1.2 Remove the `import type React from 'react'` from `packages/screensets/src/mfe/runtime/ref-container-provider.ts` (delete the file after moving).
- [x] 27.1.3 Update `packages/react/src/mfe/index.ts` barrel to export `RefContainerProvider`.
- [x] 27.1.4 Remove `RefContainerProvider` export from any `@hai3/screensets` barrel files.

**Traceability**: Proposal -- `@hai3/screensets` must have zero dependencies. Design [mfe-ext-lifecycle-actions.md - ContainerProvider](./design/mfe-ext-lifecycle-actions.md#container-provider-abstraction).

### 27.2 Move ExtensionDomainSlot to @hai3/react

- [x] 27.2.1 Move `packages/screensets/src/mfe/components/ExtensionDomainSlot.tsx` to `packages/react/src/mfe/components/ExtensionDomainSlot.tsx`.
- [x] 27.2.2 Update all imports of `ExtensionDomainSlot` in `@hai3/react` to reference the new local path instead of `@hai3/screensets`.
- [x] 27.2.3 Update `packages/react/src/mfe/index.ts` barrel to export `ExtensionDomainSlot`.
- [x] 27.2.4 Remove `ExtensionDomainSlot` export from any `@hai3/screensets` barrel files.

**Traceability**: Proposal -- `@hai3/screensets` must have zero dependencies. Design [mfe-ext-lifecycle-actions.md - ContainerProvider](./design/mfe-ext-lifecycle-actions.md#container-provider-abstraction).

### 27.3 Remove React Type Import from Screensets Types

- [x] 27.3.1 In `packages/screensets/src/types.ts`, remove `import type { ComponentType } from 'react'` (line 10). Replace the `ComponentType` usage with a framework-agnostic type (e.g., `unknown`) since `@hai3/screensets` is L1 and must not depend on React. The L2/L3 layers provide typed wrappers.

**Traceability**: Proposal -- `@hai3/screensets` must have zero dependencies. Design [type-system.md - ScreensetsRegistryConfig](./design/type-system.md#decision-6-screensetsregistry-configuration) already documents `loadingComponent?: unknown` and `errorFallbackComponent?: unknown` as framework-agnostic.

### 27.4 Update Tests

- [x] 27.4.1 Move or update any tests that reference `RefContainerProvider` or `ExtensionDomainSlot` from `@hai3/screensets` test paths to `@hai3/react` test paths.
- [x] 27.4.2 Verify no `@hai3/screensets` source files import React: run `grep -r "from 'react'" packages/screensets/src/` and confirm zero results.

**Traceability**: Validation that zero-dependency constraint is satisfied.

### 27.5 Validation

- [x] 27.5.1 Run `npm run type-check` -- must pass with no errors.
- [x] 27.5.2 Run `npm run test` -- all tests must pass.
- [x] 27.5.3 Run `npm run build` -- must pass.
- [x] 27.5.4 Run `npm run lint` -- must pass.
