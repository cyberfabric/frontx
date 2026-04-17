# Feature: Screenset Registry & Contracts

<!-- artifact-version: 1.5 -->


<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Register Extension Domain](#register-extension-domain)
  - [Register Extension at Runtime](#register-extension-at-runtime)
  - [Unregister Extension](#unregister-extension)
  - [Unregister Domain](#unregister-domain)
  - [Execute Actions Chain](#execute-actions-chain)
  - [Register Extension Action Handler](#register-extension-action-handler)
  - [Update Shared Property](#update-shared-property)
  - [Query Registry State](#query-registry-state)
  - [Build Registry via Factory](#build-registry-via-factory)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Extension Registration Validation Pipeline](#extension-registration-validation-pipeline)
  - [Domain Registration Validation](#domain-registration-validation)
  - [Contract Matching](#contract-matching)
  - [Extension Type Hierarchy Validation](#extension-type-hierarchy-validation)
  - [Shared Property GTS Validation and Broadcast](#shared-property-gts-validation-and-broadcast)
  - [GTS Package Auto-Discovery](#gts-package-auto-discovery)
  - [Entry Type Handler Resolution](#entry-type-handler-resolution)
  - [Operation Serialization](#operation-serialization)
  - [Domain Semantics Determination](#domain-semantics-determination)
- [4. States (CDSL)](#4-states-cdsl)
  - [Extension Load State](#extension-load-state)
  - [Extension Mount State](#extension-mount-state)
  - [Registry Factory Cache State](#registry-factory-cache-state)
- [5. Definitions of Done](#5-definitions-of-done)
  - [ScreensetsRegistry Public Contract](#screensetsregistry-public-contract)
  - [MFE Type Contracts](#mfe-type-contracts)
  - [GTS-Based Validation](#gts-based-validation)
  - [MFE Schema Registration](#mfe-schema-registration)
  - [MfManifest GTS Schema and Type Update](#mfmanifest-gts-schema-and-type-update)
  - [Shared Property Broadcast](#shared-property-broadcast)
  - [MFE Handler Injection](#mfe-handler-injection)
  - [ActionsChainsMediator Contract](#actionschainsmediator-contract)
  - [TypeSystemPlugin Interface](#typesystemplugin-interface)
  - [Factory-with-Cache Pattern](#factory-with-cache-pattern)
  - [Layer and Build Constraints](#layer-and-build-constraints)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

- [x] `p1` - **ID**: `cpt-frontx-featstatus-screenset-registry`

- [x] `p2` - `cpt-frontx-feature-screenset-registry`
---

## 1. Feature Context

### 1.1 Overview

The Screenset Registry & Contracts feature provides the foundational contract layer between host applications and microfrontend extensions in FrontX. It defines all TypeScript type contracts for the MFE type system, implements the `ScreensetsRegistry` runtime facade, and manages the lifecycle of extension domains and extensions through a GTS-validated registration pipeline.

The feature is a pure TypeScript L1 SDK package (`@cyberfabric/screensets`) with zero `@cyberfabric/*` inter-dependencies. It exports abstract classes (`ScreensetsRegistry`, `ScreensetsRegistryFactory`, `MfeHandler`, `MfeBridgeFactory`), all MFE TypeScript interfaces, action/property constants, and the `TypeSystemPlugin` interface that decouples the registry from any specific type system implementation.

The registry acts as the central runtime authority: it owns domain and extension state, enforces multi-step validation on registration, serializes concurrent operations per entity, mediates action chain execution, and manages the parent/child MFE bridge lifecycle.

### 1.2 Purpose

Enable host applications and microfrontend extensions to communicate through declared contracts validated at runtime, while keeping the registry itself free of any React, framework, or type-system implementation dependencies.

Success criteria: A host application can register a domain and extension, execute actions chains, broadcast shared properties, and dispose the registry — all without importing anything beyond `@cyberfabric/screensets`.

### 1.3 Actors

- `cpt-frontx-actor-developer`
- `cpt-frontx-actor-host-app`
- `cpt-frontx-actor-microfrontend`
- `cpt-frontx-actor-gts-plugin`
- `cpt-frontx-actor-framework-plugin`
- `cpt-frontx-actor-build-system`
- `cpt-frontx-actor-runtime`

### 1.4 References

- Overall Design: [DESIGN.md](../../DESIGN.md)
- Decomposition: [DECOMPOSITION.md](../../DECOMPOSITION.md) — section 2.2
- Component: `cpt-frontx-component-screensets`
- Design principle: `cpt-frontx-principle-self-registering-registries`
- Design constraint: `cpt-frontx-constraint-no-react-below-l3`
- Design constraint: `cpt-frontx-constraint-zero-cross-deps-at-l1`
- Design constraint: `cpt-frontx-constraint-no-barrel-exports-for-registries`

#### Non-Applicable Domains

- **OPS**: Client-side library, no server deployment
- **COMPL**: No regulatory data handling
- **UX**: Infrastructure capability, no direct user interface
- **DATA**: No database persistence
- **INT**: No external service integrations
- **BIZ**: Infrastructure capability; business value derived transitively
- **PERF**: No hot code paths beyond validation (sub-millisecond operations)
- **MAINT**: No formal SLA or support tier — maintained under FrontX iterative development model
- **SEC**: No authentication or authorization implementation; security concerns (input validation, schema enforcement) are addressed through GTS validation already covered by `cpt-frontx-nfr-sec-type-validation`

---

## 2. Actor Flows (CDSL)

### Register Extension Domain

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-register-domain`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-gts-plugin`

1. - [x] `p1` - Host app obtains a `ScreensetsRegistry` instance via `screensetsRegistryFactory.build(config)` - `inst-obtain-registry`
2. - [x] `p1` - Host app calls `registry.registerDomain(domain, containerProvider, options?)` where `options` is `{ onInitError?: (error: Error) => void; actionHandlers?: Record<string, ActionHandler> }` - `inst-call-register-domain`
3. - [x] `p1` - Registry runs `cpt-frontx-algo-screenset-registry-domain-validation` — IF validation fails RETURN `DomainValidationError` or `UnsupportedLifecycleStageError` - `inst-run-domain-validation`
4. - [x] `p1` - Registry determines domain semantics via `cpt-frontx-algo-screenset-registry-domain-semantics` - `inst-determine-semantics`
5. - [x] `p1` - Registry registers individual `ActionHandler` class instances per lifecycle action type (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) with the mediator via `mediator.registerHandler(domainId, actionTypeId, handler)` — one call per action type; each handler is a small class extending `ActionHandler`, not a closure; no monolithic `ExtensionLifecycleActionHandler` switch class is constructed; IF `options.actionHandlers` is provided, each entry is also registered via `mediator.registerHandler(domainId, actionTypeId, handler)` - `inst-register-action-handlers`
6. - [x] `p1` - Registry stores domain state (properties Map, extensions Set, propertySubscribers Map, mountedExtension undefined) - `inst-store-domain-state`
7. - [x] `p1` - Registry fires-and-forgets the `init` lifecycle stage for the domain; errors routed to `options.onInitError` callback if provided, otherwise logged to console.error - `inst-trigger-domain-init`
8. - [x] `p1` - `registerDomain` returns synchronously - `inst-return-sync`

### Register Extension at Runtime

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-register-extension`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`, `cpt-frontx-actor-gts-plugin`

1. - [x] `p1` - Caller invokes `await registry.registerExtension(extension)` at any point during app lifecycle - `inst-call-register-extension`
2. - [x] `p1` - Operation is serialized per `extension.id` via `OperationSerializer` — concurrent calls for the same extension ID are queued - `inst-serialize-per-id`
3. - [x] `p1` - Registry runs `cpt-frontx-algo-screenset-registry-extension-validation` — IF any step fails RETURN the appropriate typed error - `inst-run-extension-validation`
4. - [x] `p1` - Registry stores `ExtensionState` (bridge null, loadState `idle`, mountState `unmounted`) and adds extension to domain's extensions Set - `inst-store-extension-state`
5. - [x] `p1` - Registry runs `cpt-frontx-algo-screenset-registry-gts-package-discovery` to track GTS package; if `extension.id` is not a valid GTS ID the error is silently swallowed - `inst-track-gts-package`
6. - [x] `p1` - Registry triggers the `init` lifecycle stage for the extension - `inst-trigger-extension-init`
7. - [x] `p1` - Promise resolves when init lifecycle completes - `inst-return-resolved`

### Unregister Extension

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-unregister-extension`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

1. - [x] `p1` - Caller invokes `await registry.unregisterExtension(extensionId)` - `inst-call-unregister`
2. - [x] `p1` - Operation is serialized per `extensionId` via `OperationSerializer` - `inst-serialize-unregister`
3. - [x] `p1` - IF extension is not registered, operation is a no-op (idempotent) - `inst-idempotent-check`
4. - [x] `p1` - IF extension `mountState` is `mounted`, `MountManager.unmountExtension` is called directly (bypassing `OperationSerializer` to avoid deadlock) - `inst-auto-unmount`
5. - [x] `p1` - `destroyed` lifecycle stage is triggered for the extension - `inst-trigger-destroyed`
6. - [x] `p1` - Extension is removed from the domain's extensions Set and from the extensions Map - `inst-remove-extension`
7. - [x] `p1` - GTS package tracking is cleaned up; if the package Set is now empty, the package key is deleted - `inst-cleanup-package`
8. - [x] `p1` - Promise resolves when all steps complete - `inst-return-complete`

### Unregister Domain

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-unregister-domain`

**Actors**: `cpt-frontx-actor-host-app`

1. - [x] `p1` - Caller invokes `await registry.unregisterDomain(domainId)` - `inst-call-unregister-domain`
2. - [x] `p1` - Operation is serialized per `domainId` via `OperationSerializer` - `inst-serialize-domain-unregister`
3. - [x] `p1` - IF domain is not registered, operation is a no-op (idempotent) - `inst-domain-idempotent`
4. - [x] `p1` - All per-action-type handlers for the domain are unregistered from the mediator via `mediator.unregisterAllHandlers(domainId)` - `inst-unregister-action-handler`
5. - [x] `p1` - FOR EACH extension in the domain's extensions Set: `unregisterExtension(extensionId)` is called sequentially - `inst-cascade-unregister`
6. - [x] `p1` - `destroyed` lifecycle stage is triggered for the domain itself - `inst-trigger-domain-destroyed`
7. - [x] `p1` - Domain is removed from the domains Map - `inst-remove-domain`

### Execute Actions Chain

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-execute-chain`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-microfrontend`, `cpt-frontx-actor-framework-plugin`

1. - [x] `p1` - Caller invokes `await registry.executeActionsChain(chain)` - `inst-call-execute-chain`
2. - [x] `p1` - Registry delegates to `ActionsChainsMediator.executeActionsChain(chain)` - `inst-delegate-to-mediator`
3. - [x] `p1` - Mediator resolves the target domain from `chain.action.target` - `inst-resolve-target`
4. - [x] `p1` - IF target domain is not registered, the chain fails with a recorded error - `inst-target-not-found`
5. - [x] `p1` - Mediator validates the action via anonymous instance pattern: the action object (no `id` field) is registered with `typeSystem.register(action)`; GTS resolves the schema from `action.type` via `schemaIdFields` config; `typeSystem.validateInstance('')` validates the anonymous instance — IF validation fails the chain fails with a recorded error - `inst-validate-action-anonymous`
6. - [ ] `p1` - Mediator performs runtime entry declaration validation for extension-targeted actions: IF `chain.action.target` resolves to an extension (not a domain), look up the entry that owns the extension; IF `chain.action.type` is not present in the entry's `actions` array (the list of action types the entry is capable of receiving and executing), the chain fails with a recorded error `Action type '{type}' is not declared by target entry '{entryId}'`. Infrastructure lifecycle actions (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) target domains, not extensions, and are exempt from this runtime check - `inst-validate-entry-declaration`
7. - [x] `p1` - Mediator resolves the handler by `(action.target, action.type)` pair: looks up `handlers.get(action.target)?.get(action.type)`. Domain handlers and extension handlers are stored in the same unified `Map<targetId, Map<actionTypeId, ActionHandler>>`. Since GTS schemas enforce that domain-targeted actions use domain IDs and extension-targeted actions use extension IDs, there is no overlap — an action targets exactly one handler - `inst-resolve-handler`
8. - [x] `p1` - IF a handler is found for the `(target, actionType)` pair, mediator calls `handler.handleAction(action.type, action.payload)`. IF no per-`(target, actionType)` handler is found, the mediator checks for a catch-all handler registered for the target (used for child domain forwarding). IF no handler exists at all, the action is a successful no-op - `inst-invoke-handler`
9. - [ ] `p1` - Action contract enforcement is two-layered: (1) GTS schema validation in step 5 constrains `target` via `x-gts-ref` — lifecycle action schemas restrict target to domain IDs; custom MFE action schemas restrict target to specific extension IDs; invalid targets are rejected by the type system. (2) Runtime entry declaration validation in step 6 ensures the target entry explicitly declares the action type in its `actions` array. GTS alone is insufficient — an entry may opt into only a subset of actions its domain supports, and runtime validation enforces that scoping before handler resolution - `inst-validate-extension-contract`
10. - [x] `p1` - IF action completes successfully AND `chain.next` is defined, mediator executes `chain.next` recursively - `inst-execute-next`
11. - [x] `p1` - IF action fails AND `chain.fallback` is defined, mediator executes `chain.fallback` instead - `inst-execute-fallback`
12. - [x] `p1` - IF `result.completed` is false, registry logs the error and path to `console.error` - `inst-log-chain-failure`
13. - [x] `p1` - Promise resolves when the chain execution concludes (success or exhausted fallback) - `inst-resolve-chain`

### Register Extension Action Handler

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-register-extension-handler`

**Actors**: `cpt-frontx-actor-microfrontend`, `cpt-frontx-actor-framework-plugin`

1. - [x] `p1` - Child MFE calls `bridge.registerActionHandler(actionTypeId, handler)` during mount, once per action type it wishes to handle — `handler` is an `ActionHandler` abstract class instance - `inst-call-register-handler`
2. - [x] `p1` - `ChildMfeBridge` delegates to `mediator.registerHandler(extensionId, actionTypeId, handler)` — the bridge holds `extensionId` from its construction context - `inst-bridge-delegates-to-mediator`
3. - [x] `p1` - Mediator stores the handler in the unified `handlers` map: `handlers.get(extensionId).set(actionTypeId, handler)` - `inst-store-extension-handler`
4. - [x] `p1` - When the bridge is disposed (extension unmount or unregister), mediator unregisters all handlers for `extensionId` — the entire inner map entry is removed - `inst-unregister-on-dispose`

### Update Shared Property

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-update-shared-property`

**Actors**: `cpt-frontx-actor-framework-plugin`, `cpt-frontx-actor-gts-plugin`

1. - [x] `p1` - Caller invokes `registry.updateSharedProperty(propertyId, value)` (synchronous) - `inst-call-update-property`
2. - [x] `p1` - Registry runs `cpt-frontx-algo-screenset-registry-shared-property-broadcast` - `inst-run-broadcast-algo`
3. - [x] `p1` - IF GTS validation fails, RETURN throw — no domain receives the update - `inst-throw-on-invalid`
4. - [x] `p1` - FOR EACH domain that declares `propertyId` in its `sharedProperties`: store the raw value and notify all subscribers - `inst-propagate-to-domains`

### Query Registry State

- [x] `p2` - **ID**: `cpt-frontx-flow-screenset-registry-query`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

1. - [x] `p2` - Caller invokes any read-only method: `getExtension`, `getDomain`, `getExtensionsForDomain`, `getMountedExtension`, `getDomainProperty`, `getParentBridge`, `getRegisteredPackages`, `getExtensionsForPackage` - `inst-call-query`
2. - [x] `p2` - Registry delegates to `ExtensionManager` for extension/domain lookups, or to the `packages` Map for GTS package queries - `inst-delegate-query`
3. - [x] `p2` - Methods return the requested value or a safe default (undefined, null, or empty array) — they never throw on missing entities - `inst-return-safe-default`

### Build Registry via Factory

- [x] `p1` - **ID**: `cpt-frontx-flow-screenset-registry-factory-build`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

1. - [x] `p1` - Caller invokes `screensetsRegistryFactory.build({ typeSystem, mfeHandlers? })` - `inst-call-build`
2. - [x] `p1` - IF no instance is cached: factory creates a `DefaultScreensetsRegistry`, caches it along with the config, and returns it - `inst-create-and-cache`
3. - [x] `p1` - IF instance is already cached AND the provided `typeSystem` differs from the cached one: RETURN throw with config mismatch message - `inst-throw-mismatch`
4. - [x] `p1` - IF instance is cached AND `typeSystem` matches: RETURN the cached instance - `inst-return-cached`
5. - [x] `p1` - IF `mfeHandlers` are provided, handlers are sorted by descending `priority` before being stored - `inst-sort-handlers`

---

## 3. Processes / Business Logic (CDSL)

### Extension Registration Validation Pipeline

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-extension-validation`

1. - [x] `p1` - `typeSystem.register(extension)` registers the extension instance with the type system - `inst-register-gts`
2. - [x] `p1` - `typeSystem.validateInstance(extension.id)` validates the extension against its GTS schema — IF invalid RETURN throw `ExtensionValidationError` - `inst-validate-gts`
3. - [x] `p1` - Resolve the `ExtensionDomainState` for `extension.domain` — IF domain not registered RETURN throw with descriptive message - `inst-check-domain-exists`
4. - [x] `p1` - Resolve the `MfeEntry` for `extension.entry` from existing extension states or from `typeSystem.getSchema(entryId)` — IF not found RETURN throw with descriptive message - `inst-resolve-entry`
5. - [x] `p1` - Run `cpt-frontx-algo-screenset-registry-contract-matching` — IF invalid RETURN throw `ContractValidationError` - `inst-run-contract-matching`
6. - [x] `p1` - Run `cpt-frontx-algo-screenset-registry-extension-type-validation` — IF invalid RETURN throw `ExtensionTypeError` - `inst-run-type-validation`
7. - [x] `p1` - Validate lifecycle hooks reference only stages listed in `domain.extensionsLifecycleStages` — IF invalid RETURN throw `UnsupportedLifecycleStageError` - `inst-validate-lifecycle-hooks`
8. - [x] `p1` - Run `cpt-frontx-algo-screenset-registry-handler-resolution` — IF handlers are registered and none match the entry type, RETURN throw `EntryTypeNotHandledError` - `inst-validate-entry-type`

### Domain Registration Validation

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-domain-validation`

1. - [x] `p1` - `typeSystem.register(domain)` registers the domain instance with the type system - `inst-register-domain-gts`
2. - [x] `p1` - `typeSystem.validateInstance(domain.id)` validates the domain against its GTS schema — IF invalid RETURN throw `DomainValidationError` - `inst-validate-domain-gts`
3. - [x] `p1` - Validate that all `LifecycleHook` entries in `domain.lifecycle` (if present) reference only stages listed in `domain.lifecycleStages` — IF any hook references an unsupported stage RETURN throw `UnsupportedLifecycleStageError` - `inst-validate-domain-lifecycle-hooks`

### Contract Matching

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-contract-matching`

This algorithm enforces three subset rules. All errors are collected before returning so the full set of violations is reported at once.

1. - [x] `p1` - **Rule 1 — Required properties**: FOR EACH `prop` in `entry.requiredProperties`: IF `prop` is not in `domain.sharedProperties` APPEND `missing_property` error - `inst-check-required-props`
2. - [x] `p1` - **Rule 2 — Entry supports domain-required actions** (`domain.extensionsActions ⊆ entry.actions`): FOR EACH `action` in `domain.extensionsActions`: IF `action` is not in `entry.actions` APPEND `unsupported_action` error. Rationale: `domain.extensionsActions` declares the action types an extension's entry must support to be injectable into this domain; the entry's `actions` (action types it is capable of receiving and executing) must be a superset - `inst-check-entry-actions`
3. - [x] `p1` - **Rule 3 — Domain supports entry-required actions, non-infrastructure** (`entry.domainActions ⊆ domain.actions`): FOR EACH `action` in `entry.domainActions`: IF `action` is in the infrastructure set (`gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1~`, `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1~`, `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1~`) CONTINUE; IF `action` is not in `domain.actions` APPEND `unhandled_domain_action` error. Rationale: `entry.domainActions` declares the action types the parent domain must support for this entry to be injectable; the domain's `actions` (action types it is capable of receiving and executing) must be a superset - `inst-check-domain-actions`
4. - [x] `p1` - IF errors array is empty RETURN valid; ELSE RETURN invalid with collected errors - `inst-return-contract-result`

### Extension Type Hierarchy Validation

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-extension-type-validation`

1. - [x] `p1` - `typeSystem.register(extension)` ensures the instance is in the type system (may already be registered from the GTS validation step) - `inst-ensure-registered`
2. - [x] `p1` - `typeSystem.validateInstance(extension.id)` validates the extension — IF invalid RETURN the validation errors - `inst-validate-instance`
3. - [x] `p1` - IF `domain.extensionsTypeId` is not set RETURN valid (no type hierarchy requirement) - `inst-skip-if-no-type-id`
4. - [x] `p1` - `typeSystem.isTypeOf(extension.id, domain.extensionsTypeId)` — IF false RETURN invalid with message indicating the required base type - `inst-check-type-hierarchy`
5. - [x] `p1` - TRY all steps; CATCH any error: IF error message contains "not found" or "not registered" RETURN invalid with schema-not-registered message; ELSE RETURN invalid with generic error message - `inst-catch-type-errors`

### Shared Property GTS Validation and Broadcast

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-shared-property-broadcast`

1. - [x] `p1` - Collect all domains whose `sharedProperties` array includes `propertyId` — IF no domains match RETURN (silent no-op) - `inst-collect-matching-domains`
2. - [x] `p1` - Construct a deterministic ephemeral GTS instance ID: `${propertyId}hai3.mfes.comm.runtime.v1` — this ID is deterministic so repeated calls overwrite the previous ephemeral instance, preventing store growth - `inst-construct-ephemeral-id`
3. - [x] `p1` - `typeSystem.register({ id: ephemeralId, value })` registers the ephemeral instance - `inst-register-ephemeral`
4. - [x] `p1` - `typeSystem.validateInstance(ephemeralId)` validates the value against the derived shared property schema — IF invalid RETURN throw with validation error messages - `inst-validate-ephemeral`
5. - [x] `p1` - FOR EACH matching domain: store the raw value in `domainState.properties` keyed by `propertyId` - `inst-store-domain-value`
6. - [x] `p1` - FOR EACH matching domain: notify all subscribers in `domainState.propertySubscribers.get(propertyId)` with `(propertyId, value)` - `inst-notify-subscribers`

### GTS Package Auto-Discovery

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-gts-package-discovery`

GTS packages are extracted from extension IDs automatically — there is no explicit package registration API.

1. - [x] `p1` - TRY: call `extractGtsPackage(extension.id)` to derive the two-segment GTS package string (e.g., `'hai3.demo'`) - `inst-extract-package`
2. - [x] `p1` - IF the package key does not yet exist in the `packages` Map, create a new empty Set for it - `inst-create-package-set`
3. - [x] `p1` - Add `extension.id` to the Set for this package - `inst-add-to-set`
4. - [x] `p1` - CATCH any error from `extractGtsPackage`: silently swallow — the extension ID is not a valid GTS ID and package tracking is skipped - `inst-swallow-extract-error`

### Entry Type Handler Resolution

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-handler-resolution`

1. - [x] `p1` - IF no handlers are registered in the registry, RETURN (skip validation — early registration before handler setup is allowed; loading will fail later at runtime) - `inst-skip-if-no-handlers`
2. - [x] `p1` - FOR EACH registered handler: call `typeSystem.isTypeOf(entryTypeId, handler.handledBaseTypeId)` using the registry's own `typeSystem` — the handler does not perform this check itself - `inst-check-can-handle`
3. - [x] `p1` - IF any handler matches RETURN (at least one handler can process the entry type) - `inst-return-if-handled`
4. - [x] `p1` - IF no handler can handle the type RETURN throw `EntryTypeNotHandledError` with the entry type ID and list of handler base type IDs - `inst-throw-not-handled`

### Operation Serialization

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-operation-serialization`

All mutating operations on a given entity are queued per entity ID to prevent concurrent modification races.

1. - [x] `p1` - `OperationSerializer.serializeOperation(entityId, operation)` wraps the async operation in a per-entity queue - `inst-queue-operation`
2. - [x] `p1` - IF another operation is already running for `entityId`, the new operation waits in the queue - `inst-wait-in-queue`
3. - [x] `p1` - When the running operation completes (resolve or reject), the next queued operation starts - `inst-dequeue-next`
4. - [x] `p1` - `unregisterExtension` always calls `MountManager.unmountExtension` directly (not via `OperationSerializer`) to avoid deadlock — the parent `unregisterExtension` operation already holds the serializer lock for that entity - `inst-bypass-serializer-for-unmount`

### Domain Semantics Determination

- [x] `p1` - **ID**: `cpt-frontx-algo-screenset-registry-domain-semantics`

Determines whether a domain uses `swap` or `toggle` mount semantics based on its declared actions.

1. - [x] `p1` - IF `domain.actions` includes `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1~` → domain uses `toggle` semantics (sidebar, popup, overlay domains: one extension can be explicitly unmounted) - `inst-toggle-semantics`
2. - [x] `p1` - IF `domain.actions` does NOT include `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1~` → domain uses `swap` semantics (screen domain: mounting a new extension automatically unmounts the current one) - `inst-swap-semantics`
3. - [x] `p1` - The determined semantics value is captured in the closure of the per-action-type handlers registered with the mediator during `registerDomain()` - `inst-pass-semantics`

---

## 4. States (CDSL)

### Extension Load State

- [x] `p1` - **ID**: `cpt-frontx-state-screenset-registry-extension-load`

Tracks whether an extension's bundle has been fetched and initialized.

1. - [x] `p1` - **FROM** `idle` **TO** `loading` **WHEN** an action whose `type` is `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1~` is dispatched for the extension - `inst-idle-to-loading`
2. - [x] `p1` - **FROM** `loading` **TO** `loaded` **WHEN** the `MfeHandler.load()` promise resolves successfully - `inst-loading-to-loaded`
3. - [x] `p1` - **FROM** `loading` **TO** `error` **WHEN** the `MfeHandler.load()` promise rejects - `inst-loading-to-error`
4. - [ ] `p2` - **FROM** `error` **TO** `idle` **WHEN** the extension is unregistered and re-registered - `inst-error-to-idle`

### Extension Mount State

- [x] `p1` - **ID**: `cpt-frontx-state-screenset-registry-extension-mount`

Tracks whether an extension's React tree is rendered into a domain container.

1. - [x] `p1` - **FROM** `unmounted` **TO** `mounting` **WHEN** an action whose `type` is `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1~` is dispatched and load state is `loaded` - `inst-unmounted-to-mounting`
2. - [x] `p1` - **FROM** `mounting` **TO** `mounted` **WHEN** `MfeEntryLifecycle.mount()` resolves successfully - `inst-mounting-to-mounted`
3. - [x] `p1` - **FROM** `mounted` **TO** `unmounting` **WHEN** an action whose `type` is `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1~` is dispatched (toggle domains) or another extension is mounted (swap domains) - `inst-mounted-to-unmounting`
4. - [x] `p1` - **FROM** `unmounting` **TO** `unmounted` **WHEN** `MfeEntryLifecycle.unmount()` resolves - `inst-unmounting-to-unmounted`
5. - [x] `p1` - **FROM** `mounted` **TO** `unmounted` **WHEN** the extension is unregistered while mounted (auto-unmount) - `inst-mounted-to-unmounted-on-unregister`

### Registry Factory Cache State

- [x] `p1` - **ID**: `cpt-frontx-state-screenset-registry-factory-cache`

Tracks the singleton caching state of `DefaultScreensetsRegistryFactory`.

1. - [x] `p1` - **FROM** `empty` **TO** `cached` **WHEN** `factory.build(config)` is called for the first time — instance and config are stored - `inst-empty-to-cached`
2. - [x] `p1` - **FROM** `cached` **TO** `cached` **WHEN** `factory.build(config)` is called again with the same `typeSystem` reference — cached instance is returned - `inst-cached-same-config`
3. - [x] `p1` - **FROM** `cached` **TO** `error` (throws) **WHEN** `factory.build(config)` is called with a different `typeSystem` reference — throws config mismatch error - `inst-cached-config-mismatch`

---

## 5. Definitions of Done

### ScreensetsRegistry Public Contract

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-registry-contract`

`ScreensetsRegistry` is exported as an abstract class. All external consumers hold references of type `ScreensetsRegistry` — never the concrete `DefaultScreensetsRegistry`. The abstract class exposes: `typeSystem` (readonly), `registerDomain`, `unregisterDomain`, `registerExtension`, `unregisterExtension`, `updateSharedProperty`, `getDomainProperty`, `executeActionsChain`, `triggerLifecycleStage`, `triggerDomainLifecycleStage`, `triggerDomainOwnLifecycleStage`, `getExtension`, `getDomain`, `getExtensionsForDomain`, `getMountedExtension`, `getRegisteredPackages`, `getExtensionsForPackage`, `getParentBridge`, `dispose`. `loadExtension`, `mountExtension`, and `unmountExtension` are NOT public — all lifecycle operations go through `executeActionsChain`.

**Implements**:
- `cpt-frontx-flow-screenset-registry-register-domain`
- `cpt-frontx-flow-screenset-registry-register-extension`
- `cpt-frontx-flow-screenset-registry-unregister-extension`
- `cpt-frontx-flow-screenset-registry-unregister-domain`
- `cpt-frontx-flow-screenset-registry-execute-chain`
- `cpt-frontx-flow-screenset-registry-update-shared-property`
- `cpt-frontx-flow-screenset-registry-query`

**Covers (PRD)**:
- `cpt-frontx-fr-sdk-screensets-package`
- `cpt-frontx-fr-mfe-dynamic-registration`
- `cpt-frontx-fr-broadcast-write-api`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`
- `cpt-frontx-constraint-no-barrel-exports-for-registries`

### MFE Type Contracts

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-type-contracts`

All MFE TypeScript interfaces are defined with the correct shapes as derived from source code and architecture artifacts:

- `MfeEntry`: `id`, `requiredProperties`, `actions`, `domainActions`, optional `optionalProperties`
- `MfeEntryMF` extends `MfeEntry`: adds `manifest` (`string | MfManifest`), `exposedModule`, `exposeAssets`. Fields:
  - `manifest` — reference to the package-level manifest. Two resolution paths:
    1. **GTS type reference (string)**: resolved from the ManifestCache by GTS ID at load time
    2. **Inline MfManifest object**: validated and cached at load time
  - `exposedModule` — which module to load from the MFE package (e.g., `"./lifecycle"`)
  - `exposeAssets` — chunk paths and CSS assets for THIS specific exposed module:
    - `js` — `{ sync: string[], async: string[] }` — JS chunk filenames relative to manifest's `publicPath`
    - `css` — `{ sync: string[], async: string[] }` — CSS asset filenames relative to manifest's `publicPath`
  - The `exposeAssets` data originates from the `exposes[]` array in `mf-manifest.json` but is split out at registration time — the manifest entity carries shared data, the entry carries per-module data
- `MfManifest` (GTS schema `gts://gts.hai3.mfes.mfe.mf_manifest.v1~`): package-level metadata shared across all entries from the same MFE package. Contains ONLY what is common between entries — knows nothing about individual entries or exposed modules. Fields:
  - `id` — GTS instance ID (required)
  - `name` — federation container name (required)
  - `metaData` — build and entry metadata (required):
    - `publicPath` — base URL for resolving chunk paths (e.g., `http://localhost:3001/`)
    - `remoteEntry` — entry point location: `{ path, name, type }` (e.g., `{ path: "/js/", name: "remoteEntry.js", type: "module" }`)
    - `name` — federation name (same as top-level `name`)
    - `buildInfo` — `{ buildVersion, buildName }`
    - `globalName` — global variable name for script-tag loading
  - `shared` — array of shared dependency declarations (required). Each entry:
    - `name` — package name (e.g., `"react"`)
    - `version` — actual installed version (e.g., `"19.0.0"`)
    - `requiredVersion` — semver range (e.g., `"^19.0.0"`)
    - `chunkPath` — MFE-relative path to the standalone ESM for this dependency (e.g., `"shared/react.js"`); set by the `frontx-mf-gts` plugin; the handler resolves against `publicPath` and deduplicates via `sharedDepTextCache` keyed by `name@version`
    - `unwrapKey` — the export key to access the module inside the standalone ESM (e.g., `"react"`); `null` means `'default'` is used; determined by the `frontx-mf-gts` plugin from the package's export structure
    - `assets` — `{ js: { sync: string[], async: string[] }, css: { sync: string[], async: string[] } }` — chunk filenames
  - Fields present in `mf-manifest.json` but excluded from `MfManifest`: `exposes` (per-module data — split into `MfeEntryMF.exposeAssets` at registration time), `remotes` (not used by the handler), `singleton` (meaningless under blob URL isolation), `hash`, `fallback`/`fallbackName`/`fallbackType`
- `ExtensionDomain`: `id`, `sharedProperties`, `actions`, `extensionsActions`, `defaultActionTimeout` (required number), `lifecycleStages` (required), `extensionsLifecycleStages` (required), optional `extensionsTypeId`, optional `lifecycle`
- `Extension`: `id`, `domain`, `entry`, optional `lifecycle`
- `ScreenExtension` extends `Extension`: adds required `presentation` (`ExtensionPresentation`)
- `ExtensionPresentation`: `label`, `route`, optional `icon`, optional `order`
- `SharedProperty`: `id`, `value: unknown`
- `Action`: `type` (GTS schema type ID with trailing `~`), `target`, optional `payload`, optional `timeout`; no `id` field; when `payload` is present and the action targets an extension, `payload.subject` carries a GTS reference to the extension instance — no `payload.extensionId` field exists
- `ActionsChain`: `action` (Action instance), optional `next` (ActionsChain), optional `fallback` (ActionsChain); no `id` field
- `LifecycleStage`, `LifecycleHook` with appropriate shapes

**Covers (PRD)**:
- `cpt-frontx-fr-mfe-entry-types`
- `cpt-frontx-fr-mfe-ext-domain`
- `cpt-frontx-fr-mfe-shared-property`
- `cpt-frontx-fr-mfe-action-types`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`

### GTS-Based Validation

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-gts-validation`

All registration and dispatch paths perform GTS-native validation:

- Domain registration: `typeSystem.register(domain)` then `typeSystem.validateInstance(domain.id)`; lifecycle hook stages validated against `domain.lifecycleStages`
- Extension registration: `typeSystem.register(extension)` then `typeSystem.validateInstance(extension.id)`; contract matching; type hierarchy check via `typeSystem.isTypeOf`; lifecycle hooks validated against `domain.extensionsLifecycleStages`
- Action dispatch (schema validation): anonymous instance pattern — the action object (no `id` field) is registered via `typeSystem.register(action)`; GTS resolves the schema from the action's `type` field using the `schemaIdFields` configuration; `typeSystem.validateInstance('')` validates the anonymous instance against the resolved schema; the `payload.subject` field is validated as required by the schema, making a separate `requireExtensionId()` helper redundant
- Action dispatch (runtime entry declaration validation): before handler invocation, the mediator validates that the action's `type` is in the target entry's `actions` array (the list of action types the entry is capable of receiving and executing); undeclared actions fail the chain with an error `Action type '{type}' is not declared by target entry '{entryId}'`; domain-targeted infrastructure lifecycle actions (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) are exempt because they target domains, not entries; this layer is required in addition to GTS schema validation — the type system alone cannot verify entry-specific opt-in
- Shared property update: ephemeral instance `{ id: ephemeralId, value }` registered and validated before any domain receives the value; validation failure throws and blocks all propagation
- All validation errors produce typed exceptions: `DomainValidationError`, `ExtensionValidationError`, `ContractValidationError`, `ExtensionTypeError`, `UnsupportedLifecycleStageError`, `EntryTypeNotHandledError`

**Implements**:
- `cpt-frontx-algo-screenset-registry-extension-validation`
- `cpt-frontx-algo-screenset-registry-domain-validation`
- `cpt-frontx-algo-screenset-registry-contract-matching`
- `cpt-frontx-algo-screenset-registry-extension-type-validation`
- `cpt-frontx-algo-screenset-registry-shared-property-broadcast`

**Covers (PRD)**:
- `cpt-frontx-fr-mfe-dynamic-registration`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`
- `cpt-frontx-principle-self-registering-registries`

### MFE Schema Registration

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-mfe-schema-registration`

`mfe.json` is the human-authored, environment-independent MFE configuration file. It contains entries (without `exposeAssets`), extensions, and an optional `schemas` array of inline GTS JSON Schema definitions. Before build-time enrichment, it has no `manifest` section, no URLs, and no chunk paths.

The `frontx-mf-gts` Vite plugin derives the shared dep list from `rollupOptions.external` in the resolved Vite config, builds standalone ESM modules for each from `node_modules` via esbuild, and enriches `mfe.json` in-place with `manifest.metaData`, `manifest.shared[]` entries (with `chunkPath`, `version`, `unwrapKey` per dep), and `entries[].exposeAssets`.

After enrichment, `mfe.json` is the complete self-contained contract per MFE. The temporary generation script aggregates pointers to enriched `mfe.json` files and produces `mfe.generated.json` with environment-specific `--base-url`. The bootstrap loader imports `mfe.generated.json`, registers the `MfManifest` GTS entity, and performs **scoped schema registration per entry**: for each entry in the config, collect the action IDs declared in `entry.actions` and `entry.domainActions`; for each collected action ID, locate the matching schema in `config.schemas[]` (the schema whose `$id` equals the action ID with the `gts://` prefix); call `typeSystem.registerSchema(schema)` only for the matched schemas. Schemas that do not correspond to any action declared by any entry in the package are NOT registered. Entries and extensions are registered after schemas. Deduplication is automatic because GTS overwrites any schema with the same `$id`. When a backend API is ready, the static import of `mfe.generated.json` is replaced with a fetch call — same `mfe.json` shape, different transport.

**Rules**:
- `mfe.json` MUST NOT contain a `manifest` section, URLs, or chunk paths
- `mfe.generated.json` is produced at deploy time by the generation script with `--base-url`; it is NOT checked into version control
- Schema registration in the bootstrap happens before `registerEntry` and before `registerExtension` calls for the loaded package
- Schema registration is scoped: only schemas matching action IDs declared by at least one entry in the package are registered; this, combined with runtime action declaration validation in the mediator, ensures entries receive only the actions they opt into
- Missing or empty `schemas` array is silently skipped
- An action ID declared by an entry but missing a matching schema in `config.schemas[]` does NOT cause bootstrap to fail — the type system will reject unvalidatable actions at dispatch time
- Each schema element must carry a `$id` — the GTS `registerSchema` implementation enforces this at runtime
- Registration is idempotent: loading the same MFE package twice does not produce errors

**Implements**:
- `cpt-frontx-interface-mfe-json-schemas`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`

### MfManifest GTS Schema and Type Update

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-mfmanifest-schema-update`

The `MfManifest` TypeScript interface and the GTS schema `mf_manifest.v1.json` (registered as `gts://gts.hai3.mfes.mfe.mf_manifest.v1~`) are updated to include build-time fields: `metaData` (extracted from `mf-manifest.json` by the plugin — includes `publicPath`, `remoteEntry`, `name`, `buildInfo`, `globalName`) at the manifest level, and `chunkPath: string` / `version: string` / `unwrapKey: string | null` on each shared dependency entry (produced by the `frontx-mf-gts` Vite plugin from standalone ESM builds). The `GtsPlugin` registers `mf_manifest.v1.json` as a first-class schema alongside all other built-in schemas. All runtime code (`MfeHandlerMF`, `ManifestCache`, `MfeBridgeFactory`) works with the `MfManifest` TypeScript interface and never imports or inspects GTS JSON schemas directly. The GTS layer is the validation boundary; the TypeScript interface is the runtime contract.

**Covers (PRD)**:
- `cpt-frontx-fr-mfe-entry-types`
- `cpt-frontx-contract-mfe-manifest`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`

### Shared Property Broadcast

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-shared-property-broadcast`

`updateSharedProperty(propertyId, value)` is the only write method for shared properties. `updateDomainProperty()` and `updateDomainProperties()` do not exist. The method:
- Silently no-ops if no registered domains declare the property
- Validates the value once using a deterministic ephemeral GTS instance ID before touching any domain
- Throws synchronously on validation failure — no partial updates
- Propagates the raw value to all matching domain states and notifies all per-domain, per-property subscribers
- Known property constants are `HAI3_SHARED_PROPERTY_THEME = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~'` and `HAI3_SHARED_PROPERTY_LANGUAGE = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~'`. Their derived GTS schemas are registered at the application layer, not bundled in the SDK.

**Implements**:
- `cpt-frontx-flow-screenset-registry-update-shared-property`
- `cpt-frontx-algo-screenset-registry-shared-property-broadcast`

**Covers (PRD)**:
- `cpt-frontx-fr-mfe-shared-property`
- `cpt-frontx-fr-broadcast-write-api`
- `cpt-frontx-fr-broadcast-matching`
- `cpt-frontx-fr-broadcast-validate`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`

### MFE Handler Injection

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-handler-injection`

`ScreensetsRegistryConfig` has `typeSystem: TypeSystemPlugin` (required) and `mfeHandlers?: MfeHandler[]` (optional). If handlers are provided, they are stored sorted by descending `priority`. `MfeHandler` is an abstract class with `handledBaseTypeId: string`, `priority: number`, `bridgeFactory`, and abstract `load(entry)`. The handler does NOT hold a `typeSystem` reference and does NOT have a `canHandle()` method — the registry performs handler resolution directly using its own `typeSystem.isTypeOf(entryTypeId, handler.handledBaseTypeId)`. `MfeBridgeFactory` is an abstract class with `create(domainId, entryTypeId, instanceId)` and `dispose(bridge)`.

**Covers (PRD)**:
- `cpt-frontx-fr-sdk-screensets-package`
- `cpt-frontx-fr-mfe-dynamic-registration`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`

### ActionsChainsMediator Contract

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-mediator-contract`

`ActionsChainsMediator` is exported as an abstract class. Handler storage uses a unified two-level map: `Map<targetId, Map<actionTypeId, ActionHandler>>`. A single `registerHandler(targetId, actionTypeId, handler)` API covers both domain-side and extension-side registration. `ActionHandler` is an abstract class with a single `abstract handleAction(actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void>` method — consistent with all other public contracts in the package. The `CustomActionHandler` type and any `ActionHandlerFn` alias are removed. Mediator resolution uses `(target, actionType)` pair, not just `target`. Domain-side lifecycle handlers are small classes extending `ActionHandler` (one per lifecycle action type), not closures.

Domain-side: `registerDomain()` registers three handlers (one per lifecycle action type) and `unregisterDomain()` removes all of them. Extension-side: `registerHandler()` is called once per action type; disposing the bridge calls `unregisterAllHandlers(extensionId)` which removes the entire inner map entry.

**Runtime action declaration validation**: before resolving and invoking a handler, the mediator validates that the action's `type` is declared by the target entry. For extension-targeted actions, it resolves the extension, locates the entry that owns the extension, and requires that the entry's `actions` array (the list of action types the entry is capable of receiving and executing) contain the action type. `domainActions` is NOT consulted at runtime — it captures the action types the parent domain must support for the entry to be injectable, and is enforced at registration time via contract matching Rule 3, not at dispatch time. Undeclared actions fail the chain with a recorded error `Action type '{type}' is not declared by target entry '{entryId}'`. Infrastructure lifecycle actions (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) target domains, not extensions, so this check does not apply to them. Combined with scoped bootstrap schema registration, this ensures the `actions` array on entries is a live runtime contract — not a dead declaration only consulted at registration time.

**Implements**:
- `cpt-frontx-flow-screenset-registry-execute-chain`
- `cpt-frontx-flow-screenset-registry-register-extension-handler`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`
- `cpt-frontx-seq-extension-action-delivery`

### TypeSystemPlugin Interface

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-type-system-plugin`

`TypeSystemPlugin` is a plain TypeScript interface (not a class) with:
- `name: string` and `version: string` (readonly)
- `registerSchema(schema: JSONSchema): void` — for vendor/dynamic schemas; first-class schemas are built into the plugin and need not be registered
- `getSchema(typeId: string): JSONSchema | undefined`
- `register(entity: unknown): void` — GTS-native registration; for named instances the schema is extracted from the chained instance ID; for anonymous instances (no `id` field) the schema is extracted from a `schemaIdFields`-designated field such as `type`
- `validateInstance(instanceId: string): ValidationResult` — validates a registered instance; pass the instance `id` for named instances; pass `''` (empty string) for anonymous instances registered without an `id` field
- `isTypeOf(typeId: string, baseTypeId: string): boolean` — type hierarchy check
- `JSONSchema`, `ValidationError`, `ValidationResult` supporting types are exported alongside the interface
- The package treats all type IDs as opaque strings; no parsing of type IDs occurs in `@cyberfabric/screensets`
- The GTS plugin implementation is exported via subpath `@cyberfabric/screensets/plugins/gts` to avoid pulling `@globaltypesystem/gts-ts` when consumers only need the contracts

**Covers (PRD)**:
- `cpt-frontx-fr-sdk-screensets-package`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`
- `cpt-frontx-constraint-no-barrel-exports-for-registries`

### Factory-with-Cache Pattern

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-factory-cache`

`ScreensetsRegistryFactory` is an abstract class with a single abstract method `build(config: ScreensetsRegistryConfig): ScreensetsRegistry`. `DefaultScreensetsRegistryFactory` is the concrete implementation — it is marked `@internal` and not exported from the public barrel. The exported singleton `screensetsRegistryFactory` is an instance of `DefaultScreensetsRegistryFactory`. After the first `build()` call the instance is cached; subsequent calls with the same `typeSystem` reference return the cached instance; calls with a different `typeSystem` reference throw. Construction verifies all thirteen first-class GTS schemas are present in the plugin.

**Implements**:
- `cpt-frontx-flow-screenset-registry-factory-build`
- `cpt-frontx-state-screenset-registry-factory-cache`

**Covers (PRD)**:
- `cpt-frontx-fr-sdk-screensets-package`
- `cpt-frontx-fr-mfe-dynamic-registration`

**Covers (DESIGN)**:
- `cpt-frontx-component-screensets`
- `cpt-frontx-principle-self-registering-registries`

### Layer and Build Constraints

- [x] `p1` - **ID**: `cpt-frontx-dod-screenset-registry-layer-constraints`

`@cyberfabric/screensets` has zero `@cyberfabric/*` entries in `dependencies` or `devDependencies`. No `import 'react'` or any React API appears in `packages/screensets/src/`. The package output is ESM-only (`"type": "module"`, `format: ['esm']` in tsup config). All source compiles with `"strict": true`. `LayoutDomain` enum and all action/property constants are exported from the main barrel. Concrete runtime classes (`DefaultScreensetsRegistry`, `DefaultScreensetsRegistryFactory`) are not exported from the main barrel — only abstract base classes are public.

**Covers (PRD)**:
- `cpt-frontx-fr-sdk-flat-packages`
- `cpt-frontx-fr-sdk-screensets-package`
- `cpt-frontx-nfr-maint-zero-crossdeps`

**Covers (DESIGN)**:
- `cpt-frontx-constraint-no-react-below-l3`
- `cpt-frontx-constraint-zero-cross-deps-at-l1`
- `cpt-frontx-constraint-typescript-strict-mode`
- `cpt-frontx-constraint-esm-first-module-format`
- `cpt-frontx-constraint-no-barrel-exports-for-registries`

---

## 6. Acceptance Criteria

- [x] `screensetsRegistryFactory.build({ typeSystem: gtsPlugin })` returns a `ScreensetsRegistry` instance and subsequent calls with the same `typeSystem` return the same instance
- [x] `screensetsRegistryFactory.build({ typeSystem: differentPlugin })` after an initial build throws a config mismatch error
- [x] `registerDomain(domain, containerProvider, options?)` throws `DomainValidationError` when the domain fails GTS validation, and throws `UnsupportedLifecycleStageError` when a lifecycle hook references a stage not in `domain.lifecycleStages`; `options.onInitError` receives init lifecycle errors; `options.actionHandlers` entries are registered per action type with the mediator
- [x] `registerExtension` throws `ExtensionValidationError`, `ContractValidationError`, `ExtensionTypeError`, `UnsupportedLifecycleStageError`, or `EntryTypeNotHandledError` at the appropriate validation step
- [x] Contract matching enforces all three subset rules and excludes infrastructure lifecycle actions from Rule 3
- [x] `updateSharedProperty` throws synchronously if GTS validation fails and no domain receives the update; silently no-ops if no domain declares the property
- [x] `unregisterExtension` auto-unmounts a mounted extension before triggering the `destroyed` lifecycle stage
- [x] `unregisterDomain` cascade-unregisters all extensions before triggering the domain's `destroyed` lifecycle stage
- [x] Concurrent `registerExtension` calls for the same extension ID are serialized via `OperationSerializer`; calls for different IDs proceed concurrently
- [x] `getRegisteredPackages()` returns packages in discovery order; `getExtensionsForPackage(packageId)` returns only live (still-registered) extensions
- [x] `dispose()` clears all internal state, disposes all bridges, and clears the `packages` Map
- [x] `@cyberfabric/screensets` package has zero `@cyberfabric/*` dependencies and zero React imports, confirmed by CI dependency-cruiser check
- [x] All source compiles without TypeScript errors under `"strict": true`
- [ ] Mediator rejects an extension-targeted action whose `type` is not declared in the target entry's `actions` array — the chain fails with an error naming the action type and entry ID; `domainActions` is NOT consulted at runtime (it is enforced at registration time by contract matching Rule 3); domain-targeted infrastructure lifecycle actions (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) remain exempt
- [ ] Bootstrap schema registration is scoped per entry: only schemas whose `$id` matches an action ID declared in `entry.actions` or `entry.domainActions` of at least one entry in the package are registered via `typeSystem.registerSchema`; unreferenced schemas from `config.schemas[]` are never registered
