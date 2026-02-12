# Implementation Tasks

## Progress Summary

**Current Status**: Phases 1-22.7 complete. 390/390 screensets + 19/19 react tests passing.
- **Phase 7.4** (tasks 7.4.1-7.4.4): ✓ Layout domain instance JSON files moved to `@hai3/framework`
- **Phase 7.5.5**: ✓ `loadLayoutDomains()` moved to `@hai3/framework`
- **Phase 18** (all tasks): ✓ Complete -- `GtsTypeId` and `ParsedGtsId` removed, users should use `gts-ts` directly
- **Phase 19** (all tasks): ✓ Complete -- Dynamic registration model implemented with full lifecycle triggering. Test coverage: 366/366 tests passing
- **Phase 20** (all tasks): ✓ Complete -- Framework dynamic registration actions, effects, slice, and React hook implemented with full test coverage
- **Phase 21** (21.1-21.6): ✓ Complete -- Abstract class layers with factory construction. ScreensetsRegistry split into abstract + DefaultScreensetsRegistry + factory. Collaborators split: extension-manager, lifecycle-manager, mount-manager. Mediator refactored to callback injection. Internal methods moved from abstract to concrete-only (ExtensionManager 5, LifecycleManager 1, ParentMfeBridge 2; EventEmitter removed entirely in Phase 21.7). Zero circular dependencies. 367/367 screensets tests passing
- **Phase 21.7**: ✓ Complete -- EventEmitter system removed entirely. `event-emitter.ts` deleted, `on`/`off` removed from abstract ScreensetsRegistry, all `emit()` calls removed from collaborators. `useExtensionEvents` renamed to `useDomainExtensions` with store subscription. Specs updated. 363/363 screensets + 19/19 react tests passing

**Note:** All phases (1-22.7) are complete.

> Completed phase details below are retained for traceability.

### Current State Summary

| Component | Current Pattern | Authoritative Phase |
|-----------|----------------|-------------------|
| GtsPlugin | Singleton constant (`gtsPlugin`) | Phase 21.9.1 |
| ScreensetsRegistry | Factory-with-cache (`screensetsRegistryFactory`) | Phase 21.10 |
| MfeStateContainer | Internal construction by `DefaultMountManager` | Phase 21.9.2 |

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
- [x] 1.2.2 Define type system method signatures (`registerSchema`, `getSchema` for schema operations; `register`, `validateInstance` for instance operations)
- [x] 1.2.3 Define query method signature (`query`)
- [x] 1.2.4 Define required compatibility method signature (`checkCompatibility`)
- [x] 1.2.5 Define attribute access method signature (`getAttribute`)

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

---

## Phase 2: GTS Plugin Implementation

**Goal**: Implement the GTS plugin as the default Type System implementation using the REAL `@globaltypesystem/gts-ts` package.

**Status**: COMPLETE

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

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, spec line 21

### 2.2 Export GTS Plugin

- [x] 2.2.1 Export `createGtsPlugin()` factory function -- **REOPENED (3rd time)**: Standalone factory must be removed entirely. GtsPlugin is a singleton; only `gtsPlugin` constant is exported. See Phase 21.9.1. **RESOLVED by Phase 21.9.1.**
- [x] 2.2.2 Export `gtsPlugin` singleton instance
- [x] 2.2.3 Configure package.json exports for `@hai3/screensets/plugins/gts`
- [x] 2.2.4 Add `@globaltypesystem/gts-ts` as a proper dependency (NOT optional)

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.3 GTS Plugin Tests

**Test file**: `packages/screensets/__tests__/mfe/plugins/gts/gts-plugin.test.ts`

- [x] 2.3.1 Test `isValidTypeId()` accepts valid GTS type IDs
- [x] 2.3.2 Test `isValidTypeId()` rejects invalid formats (missing segments, no tilde, no version prefix)
- [x] 2.3.3 Test `parseTypeId()` returns correct components
- [x] 2.3.4 Test schema registration and validation
- [x] 2.3.5 Test query operations
- [x] 2.3.6 Test `checkCompatibility()` returns proper CompatibilityResult
- [x] 2.3.7 Test `getAttribute()` resolves attributes correctly

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, GTS type ID validation

---

## Phase 3: Internal TypeScript Types

**Goal**: Define internal TypeScript types for MFE architecture with simple `id: string` field.

### 3.1 Define MFE TypeScript Interfaces

**Core Types (8 types):**
- [x] 3.1.1 Create `MfeEntry` interface (id, requiredProperties, optionalProperties, actions, domainActions)
- [x] 3.1.2 Create `ExtensionDomain` interface (id, sharedProperties, actions, extensionsActions, extensionsTypeId?, defaultActionTimeout, lifecycleStages, extensionsLifecycleStages, lifecycle?)
- [x] 3.1.3 Create `Extension` interface (id, domain, entry, lifecycle?) - domain-specific fields in derived types
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
- [x] 3.2.1 Create schema for `gts.hai3.mfes.mfe.entry.v1~` with id field
- [x] 3.2.2 Create schema for `gts.hai3.mfes.ext.domain.v1~` with id, defaultActionTimeout (required), extensionsTypeId (optional), lifecycleStages, extensionsLifecycleStages fields
- [x] 3.2.3 Create schema for `gts.hai3.mfes.ext.extension.v1~` with id field
- [x] 3.2.4 Create schema for `gts.hai3.mfes.comm.shared_property.v1~` with id and value fields
- [x] 3.2.5 Create schema for `gts.hai3.mfes.comm.action.v1~` with type, target, timeout (optional) fields (no id)
- [x] 3.2.6 Create schema for `gts.hai3.mfes.comm.actions_chain.v1~` with $ref syntax (no id field)
- [x] 3.2.6a Create schema for `gts.hai3.mfes.lifecycle.stage.v1~` with id, description? fields
- [x] 3.2.6b Create schema for `gts.hai3.mfes.lifecycle.hook.v1~` with stage, actions_chain fields

**Module Federation Schemas (2 types):**
- [x] 3.2.7 Create schema for `gts.hai3.mfes.mfe.mf_manifest.v1~` (MfManifest) with id field
- [x] 3.2.8 Create schema for `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~` (MfeEntryMF derived)
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
- [x] 4.1.4 Implement `createScreensetsRegistry(config)` factory -- **REOPENED (4th time)**: Singleton constant hardcodes `gtsPlugin` at module initialization, defeating `TypeSystemPlugin` pluggability. Must be replaced with factory-with-cache pattern (`ScreensetsRegistryFactory`). See Phase 21.10. **Previously resolved by Phase 21.9.3; reopened for Phase 21.10.**

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

**Status**: COMPLETE

### 5.1 Contract Matching Algorithm

- [x] 5.1.1 Implement `validateContract(entry, domain)` function
- [x] 5.1.2 Implement required properties subset check (Rule 1)
- [x] 5.1.3 Implement entry actions subset check (Rule 2)
- [x] 5.1.4 Implement domain actions subset check (Rule 3)
- [x] 5.1.5 Create `ContractValidationResult` type with error details

**Traceability**: Requirement "Contract Matching Validation" - Valid contract matching

### 5.2 Contract Error Types

- [x] 5.2.1 Implement `missing_property` error type
- [x] 5.2.2 Implement `unsupported_action` error type
- [x] 5.2.3 Implement `unhandled_domain_action` error type
- [x] 5.2.4 Create human-readable error message formatter

**Traceability**: Requirement "Contract Matching Validation" - error scenarios

### 5.3 Contract Validation Tests

**Test file**: `packages/screensets/__tests__/mfe/validation/contract.test.ts`

- [x] 5.3.1 Test valid contract matching scenario
- [x] 5.3.2 Test missing required property scenario
- [x] 5.3.3 Test unsupported entry action scenario
- [x] 5.3.4 Test unhandled domain action scenario
- [x] 5.3.5 Test optional properties not blocking registration

**Traceability**: Requirement "Contract Matching Validation" - all scenarios

### 5.4 Migrate Test Files

- [x] 5.4.1 Move `packages/screensets/src/mfe/plugins/gts/__tests__/gts-plugin.test.ts` to `packages/screensets/__tests__/mfe/plugins/gts/gts-plugin.test.ts`
- [x] 5.4.2 Move `packages/screensets/src/mfe/validation/__tests__/contract.test.ts` to `packages/screensets/__tests__/mfe/validation/contract.test.ts`
- [x] 5.4.3 Update any import paths in migrated test files if necessary
- [x] 5.4.4 Verify tests pass after migration with `npm run test`

**Traceability**: Requirement "Test File Location Convention" - Tests in `__tests__/` directory, not co-located in `src/`

---

## Phase 6: Domain-Specific Extension Validation via Derived Types

**Goal**: Implement validation of Extension instances using derived Extension types when domains specify `extensionsTypeId`. This enables domain-specific fields without separate uiMeta entities or custom Ajv validation.

**Status**: COMPLETE

### 6.1 Update ExtensionDomain Type

- [x] 6.1.1 ExtensionDomain TypeScript interface uses `extensionsTypeId?: string`
- [x] 6.1.2 ExtensionDomain GTS schema uses `extensionsTypeId` as optional string with `x-gts-ref` to derived Extension types
- [x] 6.1.3 `extensionsTypeId` is not in required fields (it is optional)
- [x] 6.1.4 Extension TypeScript interface does NOT have `uiMeta` field (removed)

**Traceability**: Requirement "Domain-Specific Extension Validation via Derived Types" - Domain uses extensionsTypeId reference

### 6.2 Extension Type Validation Implementation

- [x] 6.2.1 Implement `validateExtensionType(plugin, domain, extension)` function
- [x] 6.2.2 If `domain.extensionsTypeId` is not specified, return valid (skip type hierarchy check)
- [x] 6.2.3 Validate using `plugin.isTypeOf(extension.id, domain.extensionsTypeId)` for type hierarchy
- [x] 6.2.4 Native GTS validation handles all fields via `plugin.register(extension)` then `plugin.validateInstance(extension.id)`
- [x] 6.2.5 Handle case where derived Extension type is not registered (clear error message)

**Traceability**: Requirement "Domain-Specific Extension Validation via Derived Types" - Type hierarchy validation

### 6.3 Extension Type Validation Tests

**Test file**: `packages/screensets/__tests__/mfe/validation/extension-type.test.ts`

- [x] 6.3.1 Test successful extension type validation when extensionsTypeId is specified
- [x] 6.3.2 Test extension type hierarchy failure returns proper error
- [x] 6.3.3 Test validation skipped when extensionsTypeId is not specified
- [x] 6.3.4 Test error when derived Extension type is not registered
- [x] 6.3.5 Test domain-specific fields validated via native GTS validateInstance

**Traceability**: Requirement "Domain-Specific Extension Validation via Derived Types" - all scenarios

### 6.4 Update Error Classes

- [x] 6.4.1 Implement `ExtensionTypeError` class
- [x] 6.4.2 `ExtensionTypeError` includes extensionTypeId and requiredBaseTypeId
- [x] 6.4.3 Remove any Ajv-related validation code from screensets package

**Traceability**: Requirement "MFE Error Classes" - ExtensionTypeError class

---

## Phase 7: GTS Entity Storage and Framework Plugin Propagation

**Goal**: Create JSON-based GTS entity storage for schemas and instances, and propagate Type System plugin through @hai3/framework layers.

**Status**: COMPLETE (JSON-based storage implemented, namespace consistency applied)

### 7.0 GTS JSON File Structure

GTS entities are organized across two packages:

- **@hai3/screensets (L1)**: Schemas and core MFE system instances (lifecycle stages, base actions).
- **@hai3/framework (L2)**: Layout domain instances (runtime configuration).

**Directory Structure:**
```
packages/screensets/src/mfe/gts/
  hai3.mfes/                          # Core MFE GTS package (hardcoded in @hai3/screensets, L1)
    schemas/
      mfe/
        entry.v1.json                # MfeEntry schema (gts.hai3.mfes.mfe.entry.v1~)
        mf_manifest.v1.json          # MfManifest schema (gts.hai3.mfes.mfe.mf_manifest.v1~)
        entry_mf.v1.json             # MfeEntryMF schema (gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~)
      ext/
        domain.v1.json               # ExtensionDomain schema (gts.hai3.mfes.ext.domain.v1~)
        extension.v1.json            # Extension schema (gts.hai3.mfes.ext.extension.v1~)
      comm/
        shared_property.v1.json      # SharedProperty schema (gts.hai3.mfes.comm.shared_property.v1~)
        action.v1.json               # Action schema (gts.hai3.mfes.comm.action.v1~)
        actions_chain.v1.json        # ActionsChain schema (gts.hai3.mfes.comm.actions_chain.v1~)
      lifecycle/
        stage.v1.json                # LifecycleStage schema (gts.hai3.mfes.lifecycle.stage.v1~)
        hook.v1.json                 # LifecycleHook schema (gts.hai3.mfes.lifecycle.hook.v1~)
    instances/
      lifecycle/
        init.v1.json                 # init lifecycle stage instance (core MFE system)
        activated.v1.json            # activated lifecycle stage instance (core MFE system)
        deactivated.v1.json          # deactivated lifecycle stage instance (core MFE system)
        destroyed.v1.json            # destroyed lifecycle stage instance (core MFE system)
      comm/
        load_ext.v1.json             # load_ext action instance (core MFE system)
        unload_ext.v1.json           # unload_ext action instance (core MFE system)

packages/framework/src/plugins/microfrontends/gts/
  hai3.screensets/                   # Screensets layout GTS package (runtime config, L2)
    instances/
      domains/
        sidebar.v1.json              # Sidebar domain instance
        popup.v1.json                # Popup domain instance
        screen.v1.json               # Screen domain instance
        overlay.v1.json              # Overlay domain instance
```

**Key Principle**: TypeScript interfaces = compile-time safety; JSON files = runtime validation via GTS.

### 7.1 Core MFE Schemas (`hai3.mfes` package)

**Location**: `packages/screensets/src/mfe/gts/hai3.mfes/schemas/`

- [x] 7.1.1 Create `mfe/entry.v1.json` - MfeEntry schema with `$id: "gts://gts.hai3.mfes.mfe.entry.v1~"`
- [x] 7.1.2 Create `ext/domain.v1.json` - ExtensionDomain schema with `$id: "gts://gts.hai3.mfes.ext.domain.v1~"`
- [x] 7.1.3 Create `ext/extension.v1.json` - Extension schema with `$id: "gts://gts.hai3.mfes.ext.extension.v1~"`
- [x] 7.1.4 Create `comm/action.v1.json` - Action schema with `$id: "gts://gts.hai3.mfes.comm.action.v1~"`
- [x] 7.1.5 Create `comm/actions_chain.v1.json` - ActionsChain schema with `$id: "gts://gts.hai3.mfes.comm.actions_chain.v1~"`
- [x] 7.1.6 Create `comm/shared_property.v1.json` - SharedProperty schema with `$id: "gts://gts.hai3.mfes.comm.shared_property.v1~"`
- [x] 7.1.7 Create `lifecycle/stage.v1.json` - LifecycleStage schema with `$id: "gts://gts.hai3.mfes.lifecycle.stage.v1~"`
- [x] 7.1.8 Create `lifecycle/hook.v1.json` - LifecycleHook schema with `$id: "gts://gts.hai3.mfes.lifecycle.hook.v1~"`
- [x] 7.1.9 Create `mfe/mf_manifest.v1.json` - MfManifest schema with `$id: "gts://gts.hai3.mfes.mfe.mf_manifest.v1~"`
- [x] 7.1.10 Create `mfe/entry_mf.v1.json` - MfeEntryMF schema with `$id: "gts://gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~"`

**Traceability**: Requirement "GTS Entity Storage Format" in design/schemas.md - JSON as native GTS format

### 7.2 Base Lifecycle Stage Instances (`hai3.mfes` package)

**Location**: `packages/screensets/src/mfe/gts/hai3.mfes/instances/lifecycle/`

- [x] 7.2.1 Create `init.v1.json` - init lifecycle stage instance
  ```json
  {
    "id": "gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1",
    "description": "After registration"
  }
  ```
- [x] 7.2.2 Create `activated.v1.json` - activated lifecycle stage instance
  ```json
  {
    "id": "gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1",
    "description": "After mount"
  }
  ```
- [x] 7.2.3 Create `deactivated.v1.json` - deactivated lifecycle stage instance
  ```json
  {
    "id": "gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1",
    "description": "After unmount"
  }
  ```
- [x] 7.2.4 Create `destroyed.v1.json` - destroyed lifecycle stage instance
  ```json
  {
    "id": "gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1",
    "description": "Before unregistration"
  }
  ```

**Traceability**: Requirement "Default Lifecycle Stages" - 4 default lifecycle stage instances

### 7.3 Base Action Instances (`hai3.mfes` package)

**Location**: `packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/`

- [x] 7.3.1 Create `load_ext.v1.json` - load_ext action instance (base action type for loading extensions)
- [x] 7.3.2 Create `unload_ext.v1.json` - unload_ext action instance (base action type for unloading extensions)

**Traceability**: Requirement "DRY Principle for Extension Actions" - Generic load_ext/unload_ext actions

### 7.4 Layout Domain Instances (`hai3.screensets` package)

**Location**: `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/`

Move each file from `packages/screensets/src/mfe/gts/hai3.screensets/instances/domains/` to `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/` and delete the original.

- [x] 7.4.1 `sidebar.v1.json` - Sidebar domain instance (supports load_ext and unload_ext)
- [x] 7.4.2 `popup.v1.json` - Popup domain instance (supports load_ext and unload_ext)
- [x] 7.4.3 `screen.v1.json` - Screen domain instance (supports ONLY load_ext, no unload_ext)
- [x] 7.4.4 `overlay.v1.json` - Overlay domain instance (supports load_ext and unload_ext)

**Traceability**: Requirement "Hierarchical Extension Domains" - Base layout domains as GTS instances

### 7.5 GTS JSON Loader Utilities

**Location (L1 loaders)**: `packages/screensets/src/mfe/gts/loader.ts`
**Location (L2 loaders)**: `packages/framework/src/plugins/microfrontends/gts/loader.ts`

- [x] 7.5.1 Create `loadSchemas()` function to load all core schemas from JSON files
- [x] 7.5.2 Create `loadLifecycleStages()` function to load default lifecycle stage instances
- [x] 7.5.3 Create `loadBaseActions()` function to load base action instances
- [x] 7.5.4 Update GTS plugin initialization to use JSON loaders instead of hardcoded objects
- [x] 7.5.5 Move `loadLayoutDomains()` to `packages/framework/src/plugins/microfrontends/gts/loader.ts`. Remove it and its domain JSON imports from `packages/screensets/src/mfe/gts/loader.ts` and `@hai3/screensets` exports.

**Traceability**: Requirement "GTS Entity Storage Format" - Loading JSON schemas

### 7.6 Base Domain Factory Functions (Updated)

**Location**: `packages/framework/src/plugins/microfrontends/base-domains.ts`

- [x] 7.6.1 Update `createSidebarDomain()` to load from framework-local `./gts/hai3.screensets/instances/domains/sidebar.v1.json`
- [x] 7.6.2 Update `createPopupDomain()` to load from framework-local `./gts/hai3.screensets/instances/domains/popup.v1.json`
- [x] 7.6.3 Update `createScreenDomain()` to load from framework-local `./gts/hai3.screensets/instances/domains/screen.v1.json`
- [x] 7.6.4 Update `createOverlayDomain()` to load from framework-local `./gts/hai3.screensets/instances/domains/overlay.v1.json`
- [x] 7.6.5 Remove hardcoded TypeScript domain objects (replaced by JSON files)
- [x] 7.6.6 Document that domains are registered via `runtime.registerDomain()` at runtime, NOT at plugin init

**Traceability**: Requirement "Framework Plugin Propagation" - Base domains loaded from JSON files

### 7.7 Framework Microfrontends Plugin Stub

**Scope boundary**: Phase 7.7-7.8 creates the plugin SKELETON and TypeSystemPlugin propagation ONLY. Full Flux integration (actions, effects, slice) is implemented in Phase 13.

- [x] 7.7.1 Create `packages/framework/src/plugins/microfrontends/index.ts` with plugin skeleton (file creation and basic exports only)

**Traceability**: Requirement "Framework Plugin Propagation" - Framework microfrontends plugin (zero-config)

### 7.8 Plugin Propagation

- [x] 7.8.1 Pass plugin to `createScreensetsRegistry()` in setup -- **SUPERSEDED by Phase 21.10** -- plugin is wired via `screensetsRegistryFactory.build(config)` at application wiring time.
- [x] 7.8.2 Expose runtime via `framework.provide('screensetsRegistry', runtime)`
- [x] 7.8.3 Ensure same plugin instance is used throughout

**Traceability**: Requirement "Framework Plugin Propagation" - Plugin consistency across layers

### 7.9 Framework Plugin Propagation Tests

**Test file**: `packages/framework/__tests__/plugins/microfrontends.test.ts`

**Scope boundary**: These tests validate plugin propagation and JSON loading ONLY. Flux integration tests (actions, effects, slice) are in Phase 13.8.

- [x] 7.9.1 Test plugin obtains screensetsRegistry from framework
- [x] 7.9.2 Test same TypeSystemPlugin instance is propagated through layers
- [x] 7.9.3 Test runtime.registerDomain() works for base domains at runtime
- [x] 7.9.4 Test JSON schema loading works correctly
- [x] 7.9.5 Test JSON instance loading works correctly

**Traceability**: Requirement "Framework Plugin Propagation" - Plugin consistency across layers, JSON loading

---

## Phase 8: Instance-Level Isolation (Default Behavior)

**Goal**: Implement instance-level isolation between host and MFE instances (default handler behavior).

**Status**: COMPLETE ✓

### 8.1 State Container Factory

- [x] 8.1.1 Create `createMfeStateContainer()` factory function -- **REOPENED (3rd time)**: Standalone factory must be removed; `MfeStateContainer` is a pure abstract class with no static methods; `DefaultMountManager` constructs instances directly. See Phase 21.9.2. **RESOLVED by Phase 21.9.2.**
- [x] 8.1.2 Ensure each call creates independent store instance (default handler behavior)
- [x] 8.1.3 Implement store disposal on MFE unmount
- [x] 8.1.4 Add store isolation verification tests

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - MFE state isolation

### 8.2 Shared Properties Injection

- [x] 8.2.1 Create `SharedPropertiesProvider` component
- [x] 8.2.2 Implement read-only property passing via props
- [x] 8.2.3 Implement property update propagation from host
- [x] 8.2.4 Add tests for property isolation (no direct modification)

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - Shared properties propagation

### 8.3 Host State Protection

- [x] 8.3.1 Verify MFE cannot access host store directly
- [x] 8.3.2 Implement boundary enforcement
- [x] 8.3.3 Add integration tests for state isolation

**Traceability**: Requirement "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" - Host state isolation

### 8.4 WeakMap-Based Runtime Coordination

- [x] 8.4.1 Replace `packages/screensets/src/mfe/coordination/index.ts` with barrel export for abstract class pattern
- [x] 8.4.2 Define `RuntimeCoordinator` abstract class in `packages/screensets/src/mfe/coordination/types.ts` with abstract methods: `register`, `get`, `unregister`
- [x] 8.4.3 Define `RuntimeConnection` interface in `packages/screensets/src/mfe/coordination/types.ts` with `parentRuntime` and `bridges: Map<string, ParentMfeBridge>`
- [x] 8.4.4 Implement `WeakMapRuntimeCoordinator` concrete class extending `RuntimeCoordinator` in `packages/screensets/src/mfe/coordination/weak-map-runtime-coordinator.ts`
- [x] 8.4.5 Add `private readonly coordinator: RuntimeCoordinator` field to `ScreensetsRegistry`, injected via config or defaulting to `new WeakMapRuntimeCoordinator()`
- [x] 8.4.6 Export `RuntimeCoordinator` abstract class and `RuntimeConnection` interface from `@hai3/screensets`
- [x] 8.4.7 Tests: verify `WeakMapRuntimeCoordinator` directly (register/get/unregister) and verify no window global pollution
- [x] 8.4.8 Tests: verify coordination through `ScreensetsRegistry` API during mount/unmount

**Traceability**: Requirement "Internal Runtime Coordination" - WeakMap-based coordination, private to ScreensetsRegistry

---

## Phase 9: Actions Chain Mediation

**Goal**: Implement ActionsChainsMediator for action chain execution logic.

### 9.1 ActionsChainsMediator Implementation

- [x] 9.1.1 Create `ActionsChainsMediator` class with `executeActionsChain(chain, options?)` method
- [x] 9.1.2 Implement target resolution (domain or entry instance)
- [x] 9.1.3 Implement action validation against target contract
- [x] 9.1.4 Implement success path (execute `next` chain)
- [x] 9.1.5 Implement failure path (execute `fallback` chain)
- [x] 9.1.6 Implement termination (no next/fallback)
- [x] 9.1.7 Implement `ChainResult` return type
- [x] 9.1.8 Implement `ChainExecutionOptions` interface with ONLY `chainTimeout` (no action-level options)
- [x] 9.1.9 Add chain-level execution options support to `executeActionsChain(chain, options?)`
- [x] 9.1.10 Implement timeout resolution from type definitions: `action.timeout ?? domain.defaultActionTimeout`
- [x] 9.1.11 On timeout: execute fallback chain if defined (same as any other failure)

**Traceability**: Requirement "Actions Chain Mediation" - success/failure/termination scenarios, Requirement "Explicit Timeout Configuration"

### 9.2 Extension Registration with Mediator

- [x] 9.2.1 Implement `registerExtensionHandler()` method in ActionsChainsMediator
- [x] 9.2.2 Implement `unregisterExtensionHandler()` method in ActionsChainsMediator
- [x] 9.2.3 Handle pending actions on unregistration
- [x] 9.2.4 Add registration/unregistration tests

**Traceability**: Requirement "Actions Chain Mediation" - Extension registration/unregistration

### 9.3 ActionsChainsMediator Tests

**Test file**: `packages/screensets/__tests__/mfe/mediator/actions-chains-mediator.test.ts`

- [x] 9.3.1 Test action chain success path execution
- [x] 9.3.2 Test action chain failure path execution
- [x] 9.3.3 Test chain termination scenarios
- [x] 9.3.4 Test type ID validation via plugin
- [x] 9.3.5 Test payload validation via plugin
- [x] 9.3.6 Test extension handler lifecycle (register/unregister)
- [x] 9.3.7 Test timeout resolution uses domain.defaultActionTimeout when action.timeout not specified
- [x] 9.3.8 Test timeout resolution uses action.timeout when specified (overrides domain default)
- [x] 9.3.9 Test timeout triggers fallback chain execution (same as any other failure)
- [x] 9.3.10 Test ChainExecutionOptions only accepts chainTimeout (no action-level options)

**Traceability**: Requirement "Actions Chain Mediation" - all scenarios, Requirement "Explicit Timeout Configuration"

---

## Phase 10: Base Layout Domains

**Goal**: Define and implement HAI3's base extension domains via plugin.

**Status**: COMPLETE ✓

### 10.1 Define Base Domain Contracts

- [x] 10.1.1 Define sidebar domain: `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1` (JSON defined in Phase 7.4, registration tested)
- [x] 10.1.2 Define popup domain: `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1` (JSON defined in Phase 7.4, registration tested)
- [x] 10.1.3 Define screen domain: `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1` (JSON defined in Phase 7.4, registration tested)
- [x] 10.1.4 Define overlay domain: `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1` (JSON defined in Phase 7.4, registration tested)

**Traceability**: Requirement "Hierarchical Extension Domains" - Base layout domains

### 10.2 Implement Domain Registration

- [x] 10.2.1 Create domain registry with GTS type IDs (`ScreensetsRegistry.domains` Map with `registerDomain()`)
- [x] 10.2.2 Implement `registerDomain()` for vendor domains (GTS validation + lifecycle hook validation)
- [x] 10.2.3 Implement domain contract validation at registration (GTS schema + lifecycle stage validation)
- [x] 10.2.4 Add tests for domain registration with GTS plugin (`domain-registration.test.ts`)

**Traceability**: Requirement "Hierarchical Extension Domains" - Vendor-defined domain

### 10.3 Implement Domain Rendering

- [x] 10.3.1 Create `ExtensionDomainSlot` component (`packages/screensets/src/mfe/components/ExtensionDomainSlot.tsx`)
- [x] 10.3.2 Implement extension rendering within slot (component structure with mount/unmount lifecycle; actual mounting delegates to Phase 19.3 `mountExtension`/`unmountExtension`)
- [x] 10.3.3 Handle nested domain rendering (container element supports nested domains; framework integration in Phase 13)
- [x] 10.3.4 Add integration tests for nested mounting (lifecycle validation tests in `lifecycle.test.ts`; full nested mounting integration tests deferred to Phase 19.5)

**Traceability**: Requirement "Hierarchical Extension Domains" - Nested extension mounting

---

## Phase 11: MFE Loading and Error Handling

**Goal**: Implement MFE bundle loading with error handling.

**Status**: COMPLETE ✓

### 11.1 MFE Handler and Bridge Factory

- [x] 11.1.1 Implement `MfeBridgeFactory` abstract class in `packages/screensets/src/mfe/handler/types.ts`
- [x] 11.1.2 Implement `MfeBridgeFactoryDefault` class that creates thin bridges (`mf-handler.ts`)
- [x] 11.1.3 Implement `MfeHandler` abstract class with `canHandle()`, `bridgeFactory`, `handledBaseTypeId`
- [x] 11.1.4 Implement `MfeHandlerMF` class extending `MfeHandler` (`mf-handler.ts`)
- [x] 11.1.5 Implement `load(entry: MfeEntryMF)` method in `MfeHandlerMF`
- [x] 11.1.6 Implement manifest resolution and caching in `MfeHandlerMF` (internal `ManifestCache` class)
- [x] 11.1.7 Implement Module Federation container loading with runtime get/init validation
- [x] 11.1.8 Implement `preload(entries)` method in `MfeHandlerMF` (array signature per design doc)

**Traceability**: Requirement "MFE Loading via MfeEntryMF and MfManifest"

### 11.2 Error Handling

- [x] 11.2.1 Implement fallback UI for load failures (`MfeErrorHandler.renderLoadFailure`)
- [x] 11.2.2 Implement retry mechanism (`RetryHandler` with exponential backoff + `MfeHandlerMF.loadWithRetry`)
- [x] 11.2.3 Implement contract validation error display with type ID context
- [x] 11.2.4 Implement action handler error logging with plugin details (`MfeErrorHandler.logActionHandlerError`)

**Traceability**: Requirement "MFE Error Handling" - all error scenarios

### 11.3 Error Handling Tests

**Test file**: `packages/screensets/__tests__/mfe/errors/error-handling.test.ts`

- [x] 11.3.1 Test bundle load failure scenario
- [x] 11.3.2 Test contract validation failure at load time
- [x] 11.3.3 Test action handler error scenario
- [x] 11.3.4 Test retry functionality

**Traceability**: Requirement "MFE Error Handling" - all scenarios

---

## Phase 12: Integration and Documentation

**Goal**: Integrate all components and create documentation.

### 12.1 Integration Testing

**Test file**: `packages/screensets/__tests__/mfe/integration/e2e.test.ts`

- [x] 12.1.1 Create end-to-end test with mock MFE using GTS plugin
- [x] 12.1.2 Test type system integration operations (isTypeOf, getSchema, query, isValidTypeId) - Note: Full lifecycle testing (load/mount/unmount) will be expanded in Phase 19 when mountExtension/unmountExtension are fully implemented
- [x] 12.1.3 Test multiple type system queries across different type namespaces
- [x] 12.1.4 Performance testing for type system operations
- [x] 12.1.5 Test custom plugin integration

**Traceability**: Requirement "Type System Plugin Abstraction" - Custom plugin implementation

### 12.2 Documentation

- [x] 12.2.1 Update `.ai/targets/SCREENSETS.md` with MFE architecture and Type System plugin
- [x] 12.2.2 Create MFE vendor development guide
- [x] 12.2.3 Document `TypeSystemPlugin` interface (note: checkCompatibility is REQUIRED)
- [x] 12.2.4 Document GTS plugin usage (`gtsPlugin`) and type schemas
- [x] 12.2.5 Create custom plugin implementation guide
- [x] 12.2.6 Create example MFE implementation with GTS plugin
- [x] 12.2.7 Document opaque type ID principle (call plugin.parseTypeId when metadata needed)
- [x] 12.2.8 Document ActionsChain containing Action instances (not type ID references)

**Traceability**: Requirement "Type System Plugin Abstraction" - all scenarios

### 12.3 Final Validation

- [x] 12.3.1 Run `npm run type-check` - must pass
- [x] 12.3.2 Run `npm run lint` - must pass
- [x] 12.3.3 Run `npm run test` - must pass
- [x] 12.3.4 Run `npm run build` - must pass

---

## Phase 13: @hai3/framework Microfrontends Plugin

**Goal**: Implement the microfrontends plugin that wires ScreensetsRegistry into Flux data flow.

### 13.1 Plugin Flux Wiring (builds on Phase 7.7 skeleton)

**Scope boundary**: Phase 7.7 created the plugin file skeleton and propagation. Phase 13.1 completes the `microfrontends()` factory with full Flux integration (actions, effects, slice registration) and zero-config enforcement.

- [x] 13.1.1 Implement `microfrontends()` plugin factory with NO configuration parameters and Flux wiring (actions, effects, slice)
- [x] 13.1.2 Add test verifying that `microfrontends({ anything })` throws an error - plugin accepts NO config
- [x] 13.1.3 Verify screensetsRegistry is available from framework
- [x] 13.1.4 Export plugin from `@hai3/framework`

**Traceability**: Requirement "Microfrontends Plugin" - Plugin registration (zero-config)

### 13.2 MFE Actions

- [x] 13.2.1 Create `packages/framework/src/plugins/microfrontends/actions.ts`
- [x] 13.2.2 Implement `loadExtension(extensionId)` action - emits `'mfe/loadRequested'` event
- [x] 13.2.3 Implement `preloadExtension(extensionId)` action - emits `'mfe/preloadRequested'` event
- [x] 13.2.4 Implement `mountExtension(extensionId)` action - emits `'mfe/mountRequested'` event
- [x] 13.2.5 Implement `handleMfeChildAction(extensionId, actionTypeId, payload)` action
- [x] 13.2.6 Export actions as `mfeActions` from plugin

**Traceability**: Requirement "MFE Actions" - Load, preload, mount, and host action

### 13.3 MFE Effects

- [x] 13.3.1 Create `packages/framework/src/plugins/microfrontends/effects.ts`
- [x] 13.3.2 Implement load effect - subscribes to `'mfe/loadRequested'`, calls `runtime.loadExtension()`
- [x] 13.3.3 Implement preload effect - subscribes to `'mfe/preloadRequested'`, calls `runtime.preloadExtension()`
- [x] 13.3.4 Implement mount effect - subscribes to `'mfe/mountRequested'`, calls `runtime.mountExtension()` (auto-loads if needed)
- [x] 13.3.5 Implement host action effect - handles load_ext/unload_ext for popup, sidebar, overlay, and custom domains
- [x] 13.3.6 Implement unmount effect - cleans up on domain unload

**Traceability**: Requirement "MFE Effects" - Event handlers and runtime calls

### 13.4 MFE Slice

- [x] 13.4.1 Create `packages/framework/src/plugins/microfrontends/slice.ts`
- [x] 13.4.2 Define `MfeState` interface with load and mount states per extension ID
- [x] 13.4.3 Implement `setLoading`, `setBundleLoaded`, `setError` reducers for load state
- [x] 13.4.4 Implement `setMounting`, `setMounted`, `setUnmounted` reducers for mount state
- [x] 13.4.5 Implement `selectMfeLoadState(state, extensionId)` selector (idle/loading/loaded/error)
- [x] 13.4.6 Implement `selectMfeMountState(state, extensionId)` selector (unmounted/mounting/mounted/error)
- [x] 13.4.7 Implement `selectMfeError(state, extensionId)` selector

**Traceability**: Requirement "MFE Load State Tracking" - State management (separate load and mount states)

### 13.5 ShadowDomContainer Component

- [x] 13.5.1 Create `packages/framework/src/plugins/microfrontends/components/ShadowDomContainer.ts` (vanilla DOM, not React)
- [x] 13.5.2 Use shadow root creation with direct DOM APIs (Phase 16 will provide `createShadowRoot()` utility)
- [x] 13.5.3 Use CSS variable injection with direct DOM APIs (Phase 16 will provide `injectCssVariables()` utility)
- [x] 13.5.4 Use vanilla DOM for rendering (no React portal - this is framework-agnostic @hai3/framework package)
- [x] 13.5.5 Handle cleanup on destroy

**Traceability**: Requirement "Shadow DOM Component" - Style isolation (framework-agnostic implementation)

### 13.6 Navigation Integration

- [x] 13.6.1 Integrate MFE mounting on screen domain with navigation (mount = navigate) - skeleton with Phase 19 dependency noted
- [x] 13.6.2 Implement route-based MFE mounting via screen domain - skeleton with Phase 19 dependency noted
- [x] 13.6.3 Handle navigation cleanup (unmount previous screen extension when new one is mounted) - skeleton with Phase 19 dependency noted

**Traceability**: Requirement "Navigation Integration" - Screen domain mount = navigation (skeleton for Phase 19)

### 13.7 Error Boundary and Loading

- [x] 13.7.1 Create `MfeErrorBoundary` component with retry support (vanilla DOM class, not React)
- [x] 13.7.2 Create default `MfeLoadingIndicator` component (vanilla DOM class, not React)
- [x] 13.7.3 Allow custom error boundary via ScreensetsRegistryConfig (NOT microfrontends plugin) - configuration structure ready
- [x] 13.7.4 Allow custom loading component via ScreensetsRegistryConfig (NOT microfrontends plugin) - configuration structure ready

**Traceability**: Requirement "Error Boundary for MFEs", "Loading Indicator for MFEs" (framework-agnostic vanilla DOM)

### 13.8 Framework Plugin Tests

**Test file**: `packages/framework/__tests__/plugins/microfrontends/plugin.test.ts`

- [x] 13.8.1 Test microfrontends plugin registration
- [x] 13.8.2 Test mfeActions event emission
- [x] 13.8.3 Test mfeEffects runtime calls and slice dispatch
- [x] 13.8.4 Test mfeSlice state transitions
- [x] 13.8.5 Test ShadowDomContainer rendering and CSS injection
- [x] 13.8.6 Test navigation integration
- [x] 13.8.7 Test MfeErrorBoundary rendering and retry
- [x] 13.8.8 Test MfeLoadingIndicator rendering and updates

**Traceability**: All @hai3/framework microfrontends requirements

---

## Phase 14: @hai3/react MFE Integration

**Goal**: Add React hooks and context for MFE state management at L3.

**Status**: COMPLETE

### 14.1 MFE Context

- [x] 14.1.1 Create `packages/react/src/mfe/MfeContext.tsx`
- [x] 14.1.2 Define `MfeContextValue` interface with bridge, entry info
- [x] 14.1.3 Implement `MfeProvider` component
- [x] 14.1.4 Integrate with `HAI3Provider` for automatic MFE detection

**Traceability**: Requirement "Layer propagation" - @hai3/react MFE context

### 14.2 MFE Hooks

- [x] 14.2.1 Create `packages/react/src/mfe/hooks/useMfeState.ts`
- [x] 14.2.2 Implement `useMfeState()` - returns MFE context state
- [x] 14.2.3 Create `packages/react/src/mfe/hooks/useMfeBridge.ts`
- [x] 14.2.4 Implement `useMfeBridge()` - returns bridge from context
- [x] 14.2.5 Create `packages/react/src/mfe/hooks/useSharedProperty.ts`
- [x] 14.2.6 Implement `useSharedProperty(propertyTypeId)` - subscribes to property updates (Phase 15 dependency noted)

**Traceability**: Requirement "Layer propagation" - React hooks for MFE

### 14.3 MFE Host Action Hooks

- [x] 14.3.1 Create `packages/react/src/mfe/hooks/useHostAction.ts`
- [x] 14.3.2 Implement `useHostAction(actionTypeId)` - returns callback to request action (Phase 15 dependency noted)
- [x] 14.3.3 Add payload type inference from action schema

**Traceability**: Requirement "MFE Bridge Interface" - Host action requests

### 14.4 HAI3Provider MFE Integration

- [x] 14.4.1 Update `HAI3Provider` to accept optional `mfeBridge` prop
- [x] 14.4.2 Auto-detect MFE context from parent (via mfeBridge prop)
- [x] 14.4.3 Provide MFE context to children when bridge is present

**Traceability**: Requirement "Layer propagation" - HAI3Provider MFE integration

### 14.5 React MFE Tests

**Test file**: `packages/react/__tests__/mfe/hooks.test.tsx`

- [x] 14.5.1 Test MfeProvider context provision
- [x] 14.5.2 Test useMfeState hook
- [x] 14.5.3 Test useMfeBridge hook
- [x] 14.5.4 Test useSharedProperty subscription (stub with Phase 15 note)
- [x] 14.5.5 Test useHostAction callback (stub with Phase 15 note)
- [x] 14.5.6 Test HAI3Provider MFE detection (integration test note)

**Traceability**: All @hai3/react MFE requirements

---

## Phase 15: MFE Bridge Implementation

**Goal**: Implement ChildMfeBridge and ParentMfeBridge classes.

**Status**: COMPLETE

### 15.1 Bridge Core

- [x] 15.1.1 Create `packages/screensets/src/mfe/bridge/ChildMfeBridge.ts`
- [x] 15.1.2 Implement `sendActionsChain()` with payload validation -- **SUPERSEDED by Phase 21.11**: `sendActionsChain` moved to concrete-only on `ChildMfeBridgeImpl`. Public `ChildMfeBridge` now exposes `executeActionsChain` (capability pass-through to registry).
- [x] 15.1.3 Implement `subscribeToProperty()` with callback management
- [x] 15.1.4 Implement `getProperty()` for synchronous access
- [x] 15.1.5 Implement `subscribeToAllProperties()` for bulk subscription

**Traceability**: Requirement "MFE Bridge Interface" - ChildMfeBridge

### 15.2 Bridge Connection

- [x] 15.2.1 Create `packages/screensets/src/mfe/bridge/ParentMfeBridge.ts`
- [x] 15.2.2 Implement `sendActionsChain(chain, options?)` for domain-to-MFE actions with chain-level options only -- **SUPERSEDED by Phase 21.11**: `sendActionsChain` moved to concrete-only on `ParentMfeBridgeImpl`. Public `ParentMfeBridge` now exposes only `instanceId` + `dispose()`.
- [x] 15.2.3 Implement property update notification - bridge subscribers are notified when `registry.updateDomainProperty()` is called (see spec: property updates managed at DOMAIN level)
- [x] 15.2.4 Implement `onChildAction()` handler registration -- **SUPERSEDED by Phase 21.11**: `onChildAction` moved to concrete-only on `ParentMfeBridgeImpl`. Public `ParentMfeBridge` now exposes only `instanceId` + `dispose()`.
- [x] 15.2.5 Implement `dispose()` for cleanup

**Traceability**: Requirement "MFE Bridge Interface" - ParentMfeBridge, Requirement "Explicit Timeout Configuration"

### 15.3 Bridge Factory

- [x] 15.3.1 Create `createBridge()` factory in ScreensetsRegistry
- [x] 15.3.2 Connect bridge to domain properties
- [x] 15.3.3 Connect bridge to ActionsChainsMediator
- [x] 15.3.4 Handle bridge lifecycle with extension lifecycle

**Traceability**: Requirement "MFE Bridge Interface" - Bridge creation

### 15.4 Bridge Tests

**Test file**: `packages/screensets/__tests__/mfe/bridge/bridge.test.ts`

- [x] 15.4.1 Test ChildMfeBridge property subscription
- [x] 15.4.2 Test ChildMfeBridge sendActionsChain request -- **SUPERSEDED by Phase 21.11**: tests updated to verify `executeActionsChain` on public interface.
- [x] 15.4.3 Test ParentMfeBridge property updates
- [x] 15.4.4 Test ParentMfeBridge actions chain delivery -- **SUPERSEDED by Phase 21.11**: `sendActionsChain` moved to concrete-only on `ParentMfeBridgeImpl`. Tests updated for reduced public interface (`instanceId` + `dispose()`).
- [x] 15.4.5 Test bridge disposal and cleanup

**Traceability**: Requirement "MFE Bridge Interface" - all scenarios

---

## Phase 16: Shadow DOM and Error Handling ✓

**Goal**: Implement Shadow DOM utilities and error classes.

**Status**: COMPLETE

### 16.1 Shadow DOM Utilities

- [x] 16.1.1 Create `packages/screensets/src/mfe/shadow/index.ts`
- [x] 16.1.2 Implement `createShadowRoot(element, options)`
- [x] 16.1.3 Implement `injectCssVariables(shadowRoot, variables)`
- [x] 16.1.4 Implement `injectStylesheet(shadowRoot, css, id?)`
- [x] 16.1.5 Export utilities from `@hai3/screensets`

**Traceability**: Requirement "Shadow DOM Utilities"

### 16.2 Error Classes

- [x] 16.2.1 Create `packages/screensets/src/mfe/errors/index.ts`
- [x] 16.2.2 Implement `MfeError` base class
- [x] 16.2.3 Implement `MfeLoadError` with entryTypeId
- [x] 16.2.4 Implement `ContractValidationError` with errors array
- [x] 16.2.5 Implement `ExtensionTypeError` with extensionTypeId and requiredBaseTypeId
- [x] 16.2.6 Implement `ChainExecutionError` with execution path
- [x] 16.2.7 Implement `MfeVersionMismatchError` with version details
- [x] 16.2.8 Implement `MfeTypeConformanceError` with type details
- [x] 16.2.9 Implement `DomainValidationError` with domain type ID and validation errors
- [x] 16.2.10 Implement `ExtensionValidationError` with extension type ID and validation errors
- [x] 16.2.11 Implement `UnsupportedDomainActionError` with action type ID and domain type ID
- [x] 16.2.12 Implement `UnsupportedLifecycleStageError` with stage ID, entity ID, and supported stages
- [x] 16.2.13 Export all error classes from `@hai3/screensets`

**Traceability**: Requirement "MFE Error Classes" - see [mfe-errors.md](./design/mfe-errors.md) for the complete list of error classes

### 16.3 Shadow DOM and Error Tests

**Test files**:
- `packages/screensets/__tests__/mfe/shadow/shadow-dom.test.ts`
- `packages/screensets/__tests__/mfe/errors/error-classes.test.ts`

- [x] 16.3.1 Test createShadowRoot with various options
- [x] 16.3.2 Test injectCssVariables updates
- [x] 16.3.3 Test error class instantiation and properties
- [x] 16.3.4 Test error message formatting

**Traceability**: Requirements "Shadow DOM Utilities", "MFE Error Classes"

---

## Phase 17: MFE Handler Internal Caching ✓

**Goal**: Implement internal caching for MfeHandlerMF. MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./design/mfe-loading.md#decision-12).

**Status**: COMPLETE

### 17.1 Internal ManifestCache (MfeHandlerMF only)

- [x] 17.1.1 Create internal `ManifestCache` class within `packages/screensets/src/mfe/handler/mf-handler.ts`
- [x] 17.1.2 Implement in-memory manifest caching for reuse across entries
- [x] 17.1.3 Implement container caching per remoteName
- [x] 17.1.4 Cache manifests resolved from MfeEntryMF during load

**Traceability**: Design Decision 12 in mfe-loading.md

### 17.2 MfeHandlerMF Manifest Resolution

- [x] 17.2.1 Implement manifest resolution from MfeEntryMF.manifest field
- [x] 17.2.2 Support manifest as inline object OR type ID reference
- [x] 17.2.3 Cache resolved manifests for entries from same remote
- [x] 17.2.4 Clear error messaging if manifest resolution fails

**Traceability**: Requirement "MFE Loading via MfeEntryMF and MfManifest"

### 17.3 Handler Caching Tests

**Test file**: `packages/screensets/__tests__/mfe/handler/mf-handler.test.ts`

- [x] 17.3.1 Test manifest caching reuses data for multiple entries from same remote
- [x] 17.3.2 Test container caching avoids redundant script loads
- [x] 17.3.3 Test manifest resolution from inline MfeEntryMF.manifest
- [x] 17.3.4 Test manifest resolution from type ID reference

**Traceability**: Design Decision 12 in mfe-loading.md

---

## Phase 18: GTS Utilities and Constants

**Goal**: Implement GTS type ID utilities and HAI3 constants.

**Status**: COMPLETE ✓

### 18.1 GTS Utilities

- [x] 18.1.1 Create `packages/screensets/src/mfe/gts/index.ts`
- [x] 18.1.2 Remove `GtsTypeId` branded type and `ParsedGtsId` interface from `packages/screensets/src/mfe/gts/index.ts` (duplicates `gts-ts` runtime validation via `isValidGtsID()` / `validateGtsID()` and `parseGtsID()` return type)
- [x] 18.1.3 Remove `parseGtsId()` custom implementation and its exports (duplicates `gts-ts` `parseGtsID()`)
- [x] 18.1.4 Remove `conformsTo()` custom implementation and its exports (duplicates `TypeSystemPlugin.isTypeOf()`)
- [x] 18.1.5 Remove `GtsTypeId` and `ParsedGtsId` exports entirely (all GTS type IDs are plain strings; runtime validation via `gts-ts`)

**Traceability**: Requirement "GTS Type ID Utilities"

### 18.2 HAI3 Constants

> **Note**: These are ADDITIONAL convenience constants (action instance IDs, domain instance IDs, etc.) beyond the type ID reference constants (`HAI3_CORE_TYPE_IDS`, `HAI3_MF_TYPE_IDS`, `HAI3_LIFECYCLE_STAGE_IDS`) already defined in Phase 3.3.

- [x] 18.2.1 Create `packages/screensets/src/mfe/constants/index.ts`
- [x] 18.2.2 Define `HAI3_MFE_ENTRY`, `HAI3_MFE_ENTRY_MF`, `HAI3_MF_MANIFEST` constants (schema IDs)
- [x] 18.2.3 Define `HAI3_EXT_DOMAIN`, `HAI3_EXT_EXTENSION`, `HAI3_EXT_ACTION` constants (schema IDs)
- [x] 18.2.4 Define `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_UNLOAD_EXT` constants (core action instance IDs)
- [x] 18.2.5 Move `HAI3_POPUP_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_SCREEN_DOMAIN`, `HAI3_OVERLAY_DOMAIN` constants to `@hai3/framework` (`packages/framework/src/plugins/microfrontends/constants.ts`). Remove from `@hai3/screensets`.
- [x] 18.2.6 Update exports: remove domain instance constants from `@hai3/screensets` barrel exports, add them to `@hai3/framework` barrel exports

**Traceability**: Requirements "HAI3 Action Constants", "HAI3 Type Constants"

### 18.3 GTS Utilities Tests

**Test file**: `packages/screensets/__tests__/mfe/gts/utilities.test.ts`

- [x] 18.3.1 Remove GtsTypeId branded type tests and ParsedGtsId tests (types removed)
- [x] 18.3.2 Remove parseGtsId tests
- [x] 18.3.3 Remove conformsTo tests
- [x] 18.3.4 Test HAI3 constants values

**Traceability**: Requirements "GTS Type ID Utilities", "HAI3 Action Constants", "HAI3 Type Constants"

---

## Phase 19: Dynamic Registration Model

**Goal**: Implement dynamic registration of extensions and MFEs at any time during runtime.

### 19.1 ScreensetsRegistry Dynamic API

> **Concurrency note**: All async operations are serialized per entity ID to prevent race conditions. See [Concurrency and Operation Serialization](./design/registry-runtime.md#concurrency-and-operation-serialization) in `design/registry-runtime.md`.

- [x] 19.1.1 Implement `registerExtension(extension): Promise<void>` method
- [x] 19.1.2 Implement extension validation against GTS schema
- [x] 19.1.3 Implement domain existence check (must be registered first)
- [x] 19.1.4 Implement contract validation (entry vs domain)
- [x] 19.1.5 Implement `unregisterExtension(extensionId): Promise<void>` method
- [x] 19.1.6 Implement auto-unmount if MFE is currently mounted
- [x] 19.1.7 Implement `registerDomain(domain): void` method (synchronous)
- [x] 19.1.8 Implement `unregisterDomain(domainId): Promise<void>` method
- [x] 19.1.9 Implement cascade unregister of extensions in domain

Note: The ScreensetsRegistry does NOT have `setTypeInstanceProvider`, `refreshExtensionsFromBackend`, or `fetchInstance` methods. Entity fetching is outside MFE system scope.

**Traceability**: Requirement "Dynamic Registration Model" - all scenarios

### 19.1b ScreensetsRegistry Query Methods

- [x] 19.1b.1 Implement `getExtension(extensionId): Extension | undefined` method on ScreensetsRegistry -- returns the registered extension or undefined
- [x] 19.1b.2 Implement `getDomain(domainId): ExtensionDomain | undefined` method on ScreensetsRegistry -- returns the registered domain or undefined
- [x] 19.1b.3 Implement `getExtensionsForDomain(domainId): Extension[]` method on ScreensetsRegistry -- returns all extensions registered for the given domain

**Test file**: `packages/screensets/__tests__/mfe/runtime/query-methods.test.ts`

- [x] 19.1b.4 Test `getExtension` returns registered extension
- [x] 19.1b.5 Test `getExtension` returns undefined for unregistered extension
- [x] 19.1b.6 Test `getDomain` returns registered domain
- [x] 19.1b.7 Test `getDomain` returns undefined for unregistered domain
- [x] 19.1b.8 Test `getExtensionsForDomain` returns all extensions for a domain
- [x] 19.1b.9 Test `getExtensionsForDomain` returns empty array for domain with no extensions

**Traceability**: Requirement "ScreensetsRegistry Query Methods" - getExtension, getDomain, getExtensionsForDomain

### 19.2 Extension Loading API

- [x] 19.2.1 Implement `loadExtension(extensionId): Promise<void>` method
- [x] 19.2.2 Verify extension is registered before loading
- [x] 19.2.3 Resolve entry from extension, find appropriate MfeHandler
- [x] 19.2.4 Call handler.load(entry) to fetch and initialize bundle
- [x] 19.2.5 Cache loaded lifecycle for mounting
- [x] 19.2.6 Emit `extensionLoaded` event -- SUPERSEDED by Phase 21.7
- [x] 19.2.7 Implement `preloadExtension(extensionId): Promise<void>` method
- [x] 19.2.8 Same as loadExtension but semantically for preloading
- [x] 19.2.9 Use handler.preload() if available for batch optimization

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - loadExtension/preloadExtension scenarios

### 19.3 Extension Mounting API

> **Note**: Phase 13.6 (Navigation Integration) created skeleton implementations with Phase 19 dependency. When completing Phase 19.3, also complete the Phase 13.6 navigation skeletons (tasks 13.6.1-13.6.3) by wiring them to the real `mountExtension`/`unmountExtension` methods implemented here.

- [x] 19.3.1 Implement `mountExtension(extensionId, container): Promise<ParentMfeBridge>` method
- [x] 19.3.2 If extension not loaded, call loadExtension first (auto-load)
- [x] 19.3.3 Create bridge connection via handler.bridgeFactory
- [x] 19.3.4 Register with RuntimeCoordinator
- [x] 19.3.5 Call lifecycle.mount(container, bridge)
- [x] 19.3.6 Emit `extensionMounted` event -- SUPERSEDED by Phase 21.7
- [x] 19.3.7 Implement `unmountExtension(extensionId): Promise<void>` method
- [x] 19.3.8 Call lifecycle.unmount(container)
- [x] 19.3.9 Dispose bridge and unregister from coordinator
- [x] 19.3.10 Keep extension registered and bundle loaded after unmount
- [x] 19.3.11 Emit `extensionUnmounted` event -- SUPERSEDED by Phase 21.7

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - mountExtension/unmountExtension scenarios

### 19.4 Registration Events -- SUPERSEDED by Phase 21.7

> **Note**: Tasks 19.4.1-19.4.9 were completed but are now superseded by Phase 21.7 which removes the entire EventEmitter system. The `emit`, `on`, and `off` methods and all event emission calls will be deleted.

- [x] 19.4.1 Implement `emit(event, data)` method on ScreensetsRegistry
- [x] 19.4.2 Emit `extensionRegistered` event with `{ extensionId }`
- [x] 19.4.3 Emit `extensionUnregistered` event with `{ extensionId }`
- [x] 19.4.4 Emit `domainRegistered` event with `{ domainId }`
- [x] 19.4.5 Emit `domainUnregistered` event with `{ domainId }`
- [x] 19.4.6 Emit `extensionLoaded` event with `{ extensionId }`
- [x] 19.4.7 Emit `extensionMounted` event with `{ extensionId }`
- [x] 19.4.8 Emit `extensionUnmounted` event with `{ extensionId }`
- [x] 19.4.9 Implement `on(event, callback)` and `off(event, callback)` for subscriptions

**Traceability**: Requirement "ScreensetsRegistry Dynamic API" - Registration events. **SUPERSEDED by Phase 21.7.**

### 19.5 Dynamic Registration Tests

**Test file**: `packages/screensets/__tests__/mfe/runtime/dynamic-registration.test.ts`

- [x] 19.5.1 Test registerExtension after runtime initialization
- [x] 19.5.2 Test registerExtension fails if domain not registered
- [x] 19.5.3 Test unregisterExtension unmounts MFE if mounted
- [x] 19.5.4 Test unregisterExtension is idempotent
- [x] 19.5.5 Test registerDomain at any time
- [x] 19.5.6 Test unregisterDomain cascades to extensions
- [x] 19.5.7 Test loadExtension requires extension to be registered
- [x] 19.5.8 Test loadExtension caches bundle for mounting
- [x] 19.5.9 Test preloadExtension has same behavior as loadExtension
- [x] 19.5.10 Test mountExtension auto-loads if not loaded
- [x] 19.5.11 Test mountExtension requires extension to be registered
- [x] 19.5.12 Test unmountExtension keeps extension registered and bundle loaded
- [x] 19.5.13 Test registration events are emitted correctly
- [x] 19.5.14 Test hot-swap: unregister + register with same ID

**Traceability**: Requirement "Dynamic Registration Model", "ScreensetsRegistry Dynamic API" - all scenarios

### 19.6 Lifecycle Stage Triggering Implementation

> See [mfe-lifecycle.md](./design/mfe-lifecycle.md) for triggering sequences and [registry-runtime.md](./design/registry-runtime.md) for the ScreensetsRegistry lifecycle API.

- [x] 19.6.1 Implement `triggerLifecycleStage(extensionId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on a specific extension
- [x] 19.6.2 Implement `triggerDomainLifecycleStage(domainId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on all extensions in a domain
- [x] 19.6.3 Implement `triggerDomainOwnLifecycleStage(domainId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on the domain itself
- [x] 19.6.4 Implement private `triggerLifecycleStageInternal(entity, stageId)` helper -- collects hooks matching the stage and executes their actions chains in declaration order
- [x] 19.6.5 Integrate automatic lifecycle triggering into registration/mounting methods: `registerExtension` triggers `init`, `mountExtension` triggers `activated`, `unmountExtension` triggers `deactivated`, `unregisterExtension` triggers `destroyed`
- [x] 19.6.6 Integrate automatic lifecycle triggering into domain methods: `registerDomain` triggers `init`, `unregisterDomain` triggers `destroyed`

**Test file**: `packages/screensets/__tests__/mfe/runtime/lifecycle-triggering.test.ts`

- [x] 19.6.7 Test `triggerLifecycleStage` executes hooks for a specific extension and stage
- [x] 19.6.8 Test `triggerLifecycleStage` throws if extension not registered
- [x] 19.6.9 Test `triggerDomainLifecycleStage` executes hooks for all extensions in a domain
- [x] 19.6.10 Test `triggerDomainLifecycleStage` throws if domain not registered
- [x] 19.6.11 Test `triggerDomainOwnLifecycleStage` executes hooks on the domain itself
- [x] 19.6.12 Test hooks execute in declaration order (array order)
- [x] 19.6.13 Test automatic `init` stage triggered during `registerExtension`
- [x] 19.6.14 Test automatic `activated` stage triggered during `mountExtension`
- [x] 19.6.15 Test automatic `deactivated` stage triggered during `unmountExtension`
- [x] 19.6.16 Test automatic `destroyed` stage triggered during `unregisterExtension`
- [x] 19.6.17 Test entity with no lifecycle hooks skips triggering gracefully

**Traceability**: Requirement "Lifecycle Stage Triggering" in design/mfe-lifecycle.md -- Stage Triggering Sequence, ScreensetsRegistry Lifecycle Methods in design/registry-runtime.md

---

## Phase 20: Framework Dynamic Registration Actions ✓

**Goal**: Add dynamic registration actions to @hai3/framework microfrontends plugin.

**Status**: COMPLETE

### 20.1 Dynamic Registration Actions

- [x] 20.1.1 Add `registerExtension(extension)` action to mfeActions
- [x] 20.1.2 Emit `'mfe/registerExtensionRequested'` event
- [x] 20.1.3 Add `unregisterExtension(extensionId)` action to mfeActions
- [x] 20.1.4 Emit `'mfe/unregisterExtensionRequested'` event
- [x] 20.1.5 Add `registerDomain(domain)` action to mfeActions
- [x] 20.1.6 Emit `'mfe/registerDomainRequested'` event
- [x] 20.1.7 Add `unregisterDomain(domainId)` action to mfeActions
- [x] 20.1.8 Emit `'mfe/unregisterDomainRequested'` event
- [x] 20.1.9 Verify `loadExtension(extensionId)` and `preloadExtension(extensionId)` actions exist (from Phase 13.2)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - actions

### 20.2 Dynamic Registration Effects

- [x] 20.2.1 Handle `'mfe/registerExtensionRequested'` event
- [x] 20.2.2 Call `runtime.registerExtension()` in effect
- [x] 20.2.3 Dispatch `setExtensionRegistering` before call
- [x] 20.2.4 Dispatch `setExtensionRegistered` on success
- [x] 20.2.5 Dispatch `setExtensionError` on failure
- [x] 20.2.6 Handle `'mfe/unregisterExtensionRequested'` event
- [x] 20.2.7 Call `runtime.unregisterExtension()` in effect
- [x] 20.2.8 Handle `'mfe/registerDomainRequested'` event
- [x] 20.2.9 Call `runtime.registerDomain()` in effect
- [x] 20.2.10 Handle `'mfe/unregisterDomainRequested'` event
- [x] 20.2.11 Call `runtime.unregisterDomain()` in effect

**Traceability**: Requirement "Dynamic Registration Support in Framework" - effects

### 20.3 Extension Registration Slice

- [x] 20.3.1 Add `registrationStates: Record<string, ExtensionRegistrationState>` to mfeSlice
- [x] 20.3.2 Define `ExtensionRegistrationState`: 'unregistered' | 'registering' | 'registered' | 'error'
- [x] 20.3.3 Add `setExtensionRegistering` reducer
- [x] 20.3.4 Add `setExtensionRegistered` reducer
- [x] 20.3.5 Add `setExtensionUnregistered` reducer
- [x] 20.3.6 Add `setExtensionError` reducer
- [x] 20.3.7 Add `selectExtensionState(state, extensionId)` selector
- [x] 20.3.8 Add `selectRegisteredExtensions(state)` selector

**Traceability**: Requirement "Dynamic Registration Support in Framework" - slice

### 20.4 Extension Events Hook (L3 - @hai3/react) -- SUPERSEDED by Phase 21.7

> **Note**: Tasks 20.4.1-20.4.7 were completed but are now superseded by Phase 21.7 which removes the event system and renames/rewrites the hook to `useDomainExtensions` with store slice subscription.

> **Layer placement**: `useExtensionEvents` is a React hook and belongs in `@hai3/react` (L3), not `@hai3/framework` (L2). React hooks must not live in framework-agnostic packages per the layer architecture.

- [x] 20.4.1 Create `useExtensionEvents(domainId)` hook in `packages/react/src/mfe/hooks/useExtensionEvents.ts`
- [x] 20.4.2 Subscribe to runtime's `extensionRegistered` event
- [x] 20.4.3 Subscribe to runtime's `extensionUnregistered` event
- [x] 20.4.4 Filter events by domainId
- [x] 20.4.5 Return current extensions for domain
- [x] 20.4.6 Trigger re-render on changes
- [x] 20.4.7 Export from `@hai3/react` (NOT from `@hai3/framework`)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - events hook. Layer architecture: React hooks in L3 (@hai3/react). **SUPERSEDED by Phase 21.7.**

### 20.5 Framework Dynamic Registration Tests

**Test file**: `packages/framework/__tests__/plugins/microfrontends/dynamic-registration.test.ts`

- [x] 20.5.1 Test registerExtension action emits event
- [x] 20.5.2 Test registerExtension effect calls runtime
- [x] 20.5.3 Test unregisterExtension action and effect
- [x] 20.5.4 Test registerDomain action and effect
- [x] 20.5.5 Test unregisterDomain action and effect
- [x] 20.5.6 Test slice state transitions
- [x] 20.5.7 Test selectExtensionState selector
- [x] 20.5.8 Test selectRegisteredExtensions selector
- [x] 20.5.9 Test useExtensionEvents hook (in `packages/react/__tests__/mfe/hooks/useExtensionEvents.test.tsx`)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - all scenarios. Note: useExtensionEvents tests are in @hai3/react package per L3 layer placement

---

## Phase 21: Abstract Class Layers with Factory Construction

**Goal**: Refactor ScreensetsRegistry into an abstract class + concrete implementation pair hidden behind a factory, split co-located collaborator files, and update all DIP consumer references.

**Prerequisite**: Phase 19 implementation complete. This phase is a structural refactoring -- no new features, no behavioral changes.

**Architectural Reference**: [Registry Runtime - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction), [Principles - Abstract Class Layers](./design/principles.md#abstract-class-layers-with-singleton-construction)

### 21.1 Extract Abstract ScreensetsRegistry

- [x] 21.1.1 Create `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts` as an abstract class with all public method signatures (~80 lines). Move the current concrete class out of this file. Note: `getDomainState()` is NOT on the abstract class -- it is a concrete-only `@internal` method on `DefaultScreensetsRegistry`. The abstract class must NOT import `ExtensionDomainState`. **BLOCKED BY 21.3.9**: The mediator must be refactored to use callback injection BEFORE this task removes `getDomainState` from the abstract class, otherwise the mediator will fail to compile.
- [x] 21.1.2 Create `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts` containing the concrete class that extends the abstract `ScreensetsRegistry`. Move all implementation code (constructor, collaborator wiring, method bodies) into this file (~670 lines).
- [x] 21.1.3 Add `@internal` test-only accessors on `DefaultScreensetsRegistry`: `get domains()`, `get extensions()`, `triggerLifecycleStageInternal()`, `getDomainState()`, `getExtensionManager()`, `getLifecycleManager()` -- these are concrete-only `@internal` accessors and must NOT exist on the abstract class.
- [x] 21.1.4 Create `packages/screensets/src/mfe/runtime/create-screensets-registry.ts` with the factory function that returns the abstract `ScreensetsRegistry` type. This is the ONLY file that imports `DefaultScreensetsRegistry`.
- [x] 21.1.5 Update `@hai3/screensets` barrel exports: export `ScreensetsRegistry` (abstract), `createScreensetsRegistry` (factory), `ScreensetsRegistryConfig` (interface). Do NOT export `DefaultScreensetsRegistry`. Do NOT re-export `ExtensionDomainState` from the public barrel -- it is an internal type used only by `bridge-factory.ts` within the `runtime/` package. **Two specific re-export removal locations**: (1) In `ScreensetsRegistry.ts`, remove the `import type { ExtensionDomainState } from './extension-manager'` and the `export type { ExtensionDomainState } from './extension-manager'` lines -- the abstract class must not import or re-export this type. (2) In `runtime/index.ts`, remove the `export type { ExtensionDomainState } from './ScreensetsRegistry'` line -- with the ScreensetsRegistry no longer re-exporting it, this line would fail to compile and must be deleted.
- [x] 21.1.6 Verify `createScreensetsRegistry()` return type is the abstract `ScreensetsRegistry`, not `DefaultScreensetsRegistry`.

**Traceability**: Requirement "Abstract Class Layers with Factory Construction" - ScreensetsRegistry abstraction layer

### 21.2 Split Collaborator Files

- [x] 21.2.1 Split `extension-manager.ts` (643 lines): extract `DefaultExtensionManager` class into `default-extension-manager.ts` (~460 lines). Keep abstract `ExtensionManager` class, `ExtensionDomainState`, `ExtensionState`, and related types in `extension-manager.ts` (~185 lines).
- [x] 21.2.2 Split `lifecycle-manager.ts` (270 lines): extract `DefaultLifecycleManager` class into `default-lifecycle-manager.ts` (~170 lines). Keep abstract `LifecycleManager` class and callback type definitions (`ActionChainExecutor`, `ErrorHandler`, `LifecycleStageInternalTrigger`) in `lifecycle-manager.ts` (~100 lines).
- [x] 21.2.3 Split `mount-manager.ts` (414 lines): extract `DefaultMountManager` class into `default-mount-manager.ts` (~320 lines). Keep abstract `MountManager` class and callback type definitions (`Logger`, `ErrorHandler`, `ActionChainExecutor`, `LifecycleTrigger`) in `mount-manager.ts` (~97 lines).
- [x] 21.2.4 Leave `event-emitter.ts` (130 lines) as-is -- too small to split. -- SUPERSEDED by Phase 21.7 (file deleted)
- [x] 21.2.5 Leave `operation-serializer.ts` (70 lines) as-is -- too small to split.
- [x] 21.2.6 Update imports in `DefaultScreensetsRegistry.ts` to import concrete classes from the new `default-*.ts` files.

**Traceability**: Requirement "Abstract Class Layers with Factory Construction" - Collaborator file splits

### 21.3 DIP Consumer Reference Updates

- [x] 21.3.1 Update `packages/screensets/src/mfe/coordination/types.ts`: ensure `RuntimeConnection.hostRuntime` types against the abstract `ScreensetsRegistry` (import from `ScreensetsRegistry.ts`, not `DefaultScreensetsRegistry.ts`).
- [x] 21.3.2 Update `packages/screensets/src/mfe/runtime/mount-manager.ts` (abstract file): ensure any `hostRuntime` parameter reference types against abstract `ScreensetsRegistry`.
- [x] 21.3.3 Update `packages/screensets/src/mfe/mediator/actions-chains-mediator.ts`: ensure references type against abstract `ScreensetsRegistry`.
- [x] 21.3.4 Update `packages/screensets/src/mfe/components/ExtensionDomainSlot.tsx`: ensure references type against abstract `ScreensetsRegistry`.
- [x] 21.3.5 Update `packages/framework/src/plugins/microfrontends/effects.ts`: ensure references type against abstract `ScreensetsRegistry`.
- [x] 21.3.6 Update `packages/framework/src/types.ts`: ensure `MfeScreensetsRegistry` type alias maps to abstract `ScreensetsRegistry`.
- [x] 21.3.7 Update `packages/screensets/src/mfe/runtime/bridge-factory.ts`: change `import { ExtensionDomainState } from './ScreensetsRegistry'` to `import { ExtensionDomainState } from './extension-manager'` (type moves to abstract file after Phase 21.2.1 split).
- [x] 21.3.8 Verify no module imports `DefaultScreensetsRegistry` directly except `create-screensets-registry.ts` and test files.
- [x] 21.3.9 **PREREQUISITE for 21.1.1**: Refactor `DefaultActionsChainsMediator` to receive `getDomainState` as an injected callback in its constructor config instead of depending on the `ScreensetsRegistry` type. Replace all `this.registry.getDomainState(...)` calls with the injected callback. Remove the `ScreensetsRegistry` import from the mediator entirely. Update `DefaultScreensetsRegistry` constructor wiring and mediator tests accordingly. Also added `config.mediator` field to `ScreensetsRegistryConfig` for custom mediator injection.
- [x] 21.3.10 Move `getDomainsMap()` and `getExtensionsMap()` from abstract `ExtensionManager` to concrete `DefaultExtensionManager` only. These are `@internal` test-only accessors that should not be on the abstract class. Specifically: (a) Remove `abstract getDomainsMap()` and `abstract getExtensionsMap()` from abstract `ExtensionManager` in `extension-manager.ts`. (b) Keep these methods as concrete (non-abstract) methods on `DefaultExtensionManager` in `default-extension-manager.ts`. (c) In `DefaultScreensetsRegistry`, ensure the `extensionManager` field is typed as `DefaultExtensionManager` (not abstract `ExtensionManager`) so that `this.extensionManager.getDomainsMap()` and `this.extensionManager.getExtensionsMap()` remain callable from the concrete-only `get domains()` and `get extensions()` test shims.

**Traceability**: Requirement "Abstract Class Layers with Factory Construction" - DIP compliance for ScreensetsRegistry references. Task 21.3.9 traces to Decision 18 encapsulation principle (test-only accessors on concrete class only) and the callback injection pattern established by ExtensionManager and MountManager collaborators. Task 21.3.10 traces to the same Decision 18 encapsulation principle applied to ExtensionManager.

### 21.4 Update Test Files

- [x] 21.4.1 Update test files that access `@internal` test shims (`domains`, `extensions`, `triggerLifecycleStageInternal`) to import `DefaultScreensetsRegistry` directly from `DefaultScreensetsRegistry.ts` using relative imports (NOT from public barrel).
- [x] 21.4.2 Update test files that create `ScreensetsRegistry` instances to use `createScreensetsRegistry()` factory instead of `new ScreensetsRegistry()`. -- **SUPERSEDED by Phase 21.9.3** -- test files that need custom configurations import `DefaultScreensetsRegistry` directly; production code uses the `screensetsRegistry` singleton.
- [x] 21.4.3 Update test assertions to verify the factory returns the abstract `ScreensetsRegistry` type (i.e., `instanceof ScreensetsRegistry` is true).
- [x] 21.4.4 Update test files for extension-manager: import `DefaultExtensionManager` from `default-extension-manager.ts` where concrete internals are needed.
- [x] 21.4.5 Update test files for lifecycle-manager: import `DefaultLifecycleManager` from `default-lifecycle-manager.ts` where concrete internals are needed.
- [x] 21.4.6 Update test files for mount-manager: import `DefaultMountManager` from `default-mount-manager.ts` where concrete internals are needed.

**Traceability**: Requirement "Abstract Class Layers with Factory Construction" - Test compatibility

### 21.5 Validation

- [x] 21.5.1 Run `npm run type-check` -- must pass with no errors
- [x] 21.5.2 Run `npm run lint` -- must pass (no ESLint rule changes required)
- [x] 21.5.3 Run `npm run test` -- all existing tests must pass with no behavioral changes
- [x] 21.5.4 Run `npm run build` -- must pass
- [x] 21.5.5 Verify no circular import warnings or errors in the build output
- [x] 21.5.6 Verify `DefaultScreensetsRegistry` is NOT present in `@hai3/screensets` public type declarations (`.d.ts` output)

**Traceability**: Requirement "Abstract Class Layers with Factory Construction" - No regressions

### 21.6 Encapsulation Fix: Move Internal Methods from Abstract to Concrete-Only

**Goal**: Remove internal-only methods from abstract class contracts and public interfaces. Methods that are only called by sibling concrete collaborators or by `DefaultScreensetsRegistry` for disposal/test must live on the concrete class only.

**Prerequisite**: Phase 21.5 complete (abstract class layers established). This phase is a pure encapsulation fix -- no new features, no behavioral changes.

**Architectural Reference**: [Registry Runtime - Concrete-Only Internal Methods on Collaborator Abstract Classes](./design/registry-runtime.md#concrete-only-internal-methods-on-collaborator-abstract-classes)

#### Group A: ExtensionManager (5 methods)

**Ordering constraint**: Tasks 21.6.6 and 21.6.7 (change collaborator field types to `DefaultExtensionManager`) MUST be completed BEFORE tasks 21.6.1-21.6.5 (remove methods from abstract `ExtensionManager`). Otherwise, removing the abstract methods first will cause compile errors in `DefaultMountManager` and `DefaultLifecycleManager` since their `extensionManager` fields still reference the abstract type, which will no longer declare the removed methods.

- [x] 21.6.6 Change `DefaultMountManager` config to accept `DefaultExtensionManager` instead of `ExtensionManager` for its `extensionManager` field. Update the import in `default-mount-manager.ts` from `import { ExtensionManager }` to `import { DefaultExtensionManager }`.
- [x] 21.6.7 Change `DefaultLifecycleManager` constructor to accept `DefaultExtensionManager` instead of `ExtensionManager` for its `extensionManager` parameter. Update the import in `default-lifecycle-manager.ts`.
- [x] 21.6.1 Remove `getDomainState(domainId)` from abstract `ExtensionManager` in `packages/screensets/src/mfe/runtime/extension-manager.ts`. Keep it on `DefaultExtensionManager` in `default-extension-manager.ts` as a concrete-only method. **DEPENDS ON 21.6.6 and 21.6.7.**
- [x] 21.6.2 Remove `getExtensionState(extensionId)` from abstract `ExtensionManager`. Keep on `DefaultExtensionManager`. **DEPENDS ON 21.6.6 and 21.6.7.**
- [x] 21.6.3 Remove `getExtensionStatesForDomain(domainId)` from abstract `ExtensionManager`. Keep on `DefaultExtensionManager`. **DEPENDS ON 21.6.6 and 21.6.7.**
- [x] 21.6.4 Remove `resolveEntry(entryId)` from abstract `ExtensionManager`. Make it `private` on `DefaultExtensionManager` (it is only called by the concrete class itself, so it has no reason to be public). **DEPENDS ON 21.6.6 and 21.6.7.**
- [x] 21.6.5 Remove `clear()` from abstract `ExtensionManager`. Keep on `DefaultExtensionManager`. **DEPENDS ON 21.6.6 and 21.6.7.**
- [x] 21.6.8 Verify `DefaultScreensetsRegistry.extensionManager` field is typed as `DefaultExtensionManager` (should already be the case after 21.3.10 -- confirm no regression). All calls to `getDomainState()`, `getExtensionState()`, `getExtensionStatesForDomain()`, `clear()` on the field must compile against the concrete type. Note: `resolveEntry()` is `private` on `DefaultExtensionManager` (per 21.6.4), so it is not callable from `DefaultScreensetsRegistry` -- confirm no external callers exist.

**Traceability**: [Design - Group A: ExtensionManager](./design/registry-runtime.md#group-a-extensionmanager----5-methods-to-concrete-only). Traces to Decision 18 encapsulation principle: abstract classes define only the public contract; internal query/disposal methods are concrete-only.

#### Group B: LifecycleManager (1 method)

- [x] 21.6.9 Remove `triggerLifecycleStageInternal(entity, stageId, skipCallback?)` from abstract `LifecycleManager` in `packages/screensets/src/mfe/runtime/lifecycle-manager.ts`. Keep it on `DefaultLifecycleManager` in `default-lifecycle-manager.ts` as a concrete-only method.
- [x] 21.6.10 Change `DefaultScreensetsRegistry.lifecycleManager` field type from `LifecycleManager` (abstract) to `DefaultLifecycleManager` (concrete). Update the import in `DefaultScreensetsRegistry.ts` to include `DefaultLifecycleManager` from `default-lifecycle-manager.ts`. This ensures `this.lifecycleManager.triggerLifecycleStageInternal()` compiles.

**Traceability**: [Design - Group B: LifecycleManager](./design/registry-runtime.md#group-b-lifecyclemanager----1-method-to-concrete-only). Traces to Decision 18 encapsulation principle.

#### Group C: EventEmitter (1 method) -- SUPERSEDED by Phase 21.7

> **Note**: Tasks 21.6.11-21.6.12 were completed but are now superseded by Phase 21.7 which removes the EventEmitter entirely.

- [x] 21.6.11 Remove `clear()` from abstract `EventEmitter` in `packages/screensets/src/mfe/runtime/event-emitter.ts`. Keep it on `DefaultEventEmitter` in the same file (event-emitter.ts is not split). The abstract `EventEmitter` retains: `on()`, `off()`, `emit()`.
- [x] 21.6.12 Change `DefaultScreensetsRegistry.eventEmitter` field type from `EventEmitter` (abstract) to `DefaultEventEmitter` (concrete). Update the import in `DefaultScreensetsRegistry.ts` to import `DefaultEventEmitter` from `event-emitter.ts`. This ensures `this.eventEmitter.clear()` compiles.

**Traceability**: Traced to Decision 18 encapsulation principle. Design section removed as part of EventEmitter elimination in Phase 21.7. **SUPERSEDED by Phase 21.7.**

#### Group C: ParentMfeBridge interface (2 methods)

- [x] 21.6.13 Remove `getPropertySubscribers()` from the `ParentMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ParentMfeBridgeImpl` class in `bridge/ParentMfeBridge.ts` (unchanged).
- [x] 21.6.14 Remove `registerPropertySubscriber(propertyTypeId, subscriber)` from the `ParentMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ParentMfeBridgeImpl` class (unchanged).
- [x] 21.6.15 Verify `bridge-factory.ts` `createBridge()` compiles after removing `registerPropertySubscriber()` from the `ParentMfeBridge` interface. The local `parentBridge` variable is already constructed via `new ParentMfeBridgeImpl(childBridge)`, so TypeScript infers the concrete `ParentMfeBridgeImpl` type and the call to `parentBridge.registerPropertySubscriber()` compiles against the concrete class. The function return type remains `{ parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge }` (narrow public interface). The import for `ParentMfeBridgeImpl` from `'../bridge/ParentMfeBridge'` already exists. No code changes expected -- this is a verification-only task.
- [x] 21.6.16 Update `disposeBridge()` in `bridge-factory.ts`: cast `parentBridge` to `ParentMfeBridgeImpl` internally to access `getPropertySubscribers()`. Keep parameter typed as `ParentMfeBridge`.

**Test file verification**: After removing `getPropertySubscribers()` and `registerPropertySubscriber()` from the `ParentMfeBridge` interface, verify that test files calling these methods still compile:
- `packages/screensets/__tests__/mfe/bridge/bridge.test.ts` -- creates `ParentMfeBridgeImpl` instances directly (typed as `ParentMfeBridgeImpl`), so calls to these methods compile against the concrete class. No changes expected.
- `packages/screensets/__tests__/mfe/runtime/bridge-factory.test.ts` -- already uses `(parentBridge as ParentMfeBridgeImpl)` casts to access these methods. No changes expected.

**Traceability**: [Design - Group C: ParentMfeBridge interface](./design/registry-runtime.md#group-c-parentmfebridge-interface----4-methods-removed-from-public-type). Public interface cleanup: internal-only methods must not appear on public types.

#### Validation

- [x] 21.6.17 Run `npm run type-check` -- must pass with no errors.
- [x] 21.6.18 Run `npm run test` -- all existing tests must pass with no behavioral changes.
- [x] 21.6.19 Run `npm run build` -- must pass.
- [x] 21.6.20 Verify `getPropertySubscribers` and `registerPropertySubscriber` are NOT present in `ParentMfeBridge` type in `.d.ts` output. Verify `getDomainState`, `getExtensionState`, `getExtensionStatesForDomain`, `resolveEntry`, `clear` are NOT present on abstract `ExtensionManager` in `.d.ts` output. Verify `triggerLifecycleStageInternal` is NOT present on abstract `LifecycleManager` in `.d.ts` output. (Note: EventEmitter `clear` verification was here but is now superseded by Phase 21.7 which removes EventEmitter entirely.)

**Traceability**: Encapsulation fix validation -- no regressions, public API surface is correct.

### 21.7 Remove EventEmitter System

**Goal**: Remove the entire EventEmitter pub-sub system from the MFE runtime. Lifecycle stages with actions chains are the **only** mechanism for reacting to runtime transitions. The "events" (`domainRegistered`, `extensionRegistered`, `extensionLoaded`, `extensionMounted`, `extensionUnmounted`, `extensionUnregistered`, `domainUnregistered`) duplicate lifecycle stages 1:1 and must be eliminated entirely. No replacement mechanism is introduced -- no callbacks, no new event system.

> **Scope clarification**: This phase removes the ScreensetsRegistry EventEmitter pub-sub system only. Flux store actions/events (`mfe/loadRequested`, `mfe/mountRequested`, etc.) are unrelated and retained.

**Prerequisite**: Phase 21.6 complete. This phase removes a parallel notification system that duplicates lifecycle stage transitions.

**Architectural Reference**: [Registry Runtime - No Event System](./design/registry-runtime.md#no-event-system----lifecycle-stages-with-actions-chains-only)

**Ordering**: Tasks are ordered so that usages are removed before the source files. Remove consumers first (abstract class methods, concrete implementations, emit call sites), then delete the file, then clean up exports and tests.

#### Step 1: Remove `on`/`off` from abstract ScreensetsRegistry

- [x] 21.7.1 Remove the `on(event, callback)` abstract method from `ScreensetsRegistry` abstract class in `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts`.
- [x] 21.7.2 Remove the `off(event, callback)` abstract method from `ScreensetsRegistry` abstract class in `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts`.

**Traceability**: Design note "No Event System" in registry-runtime.md. The abstract class must not declare event subscription methods.

#### Step 2: Remove `on`/`off` implementations and `eventEmitter` field from DefaultScreensetsRegistry

- [x] 21.7.3 Remove the `on(event, callback)` method implementation from `DefaultScreensetsRegistry` in `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`.
- [x] 21.7.4 Remove the `off(event, callback)` method implementation from `DefaultScreensetsRegistry` in `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`.
- [x] 21.7.5 Remove the `eventEmitter` field declaration from `DefaultScreensetsRegistry`.
- [x] 21.7.6 Remove the `eventEmitter` construction/wiring from the `DefaultScreensetsRegistry` constructor (including any `DefaultEventEmitter` import).
- [x] 21.7.7 Remove the `this.eventEmitter.clear()` call from `DefaultScreensetsRegistry.dispose()`.

**Traceability**: Design note "No Event System" in registry-runtime.md. The concrete class must not own or wire an EventEmitter.

#### Step 3: Remove `emit` callback from DefaultExtensionManager

- [x] 21.7.8 Remove all `this.emit(...)` calls from `DefaultExtensionManager` in `packages/screensets/src/mfe/runtime/default-extension-manager.ts`. These calls emit: `domainRegistered`, `domainUnregistered`, `extensionRegistered`, `extensionUnregistered`.
- [x] 21.7.9 Remove the `emit` callback from `DefaultExtensionManager`'s constructor config type.
- [x] 21.7.10 Remove the `EventEmitCallback` type from `packages/screensets/src/mfe/runtime/extension-manager.ts` if it is no longer used by any other module after removing it from `DefaultExtensionManager`.

**Traceability**: Design note "No Event System" in registry-runtime.md. Extension registration/unregistration transitions are lifecycle stages, not events.

#### Step 4: Remove `eventEmitter` from DefaultMountManager

- [x] 21.7.11 Remove all `this.eventEmitter.emit(...)` calls from `DefaultMountManager` in `packages/screensets/src/mfe/runtime/default-mount-manager.ts`. These calls emit: `extensionLoaded`, `extensionMounted`, `extensionUnmounted`.
- [x] 21.7.12 Remove the `eventEmitter` field from `DefaultMountManager`'s constructor config type.

**Traceability**: Design note "No Event System" in registry-runtime.md. Mount/unmount/load transitions are lifecycle stages or internal details, not events.

#### Step 5: Delete the event-emitter.ts file

- [x] 21.7.13 Delete `packages/screensets/src/mfe/runtime/event-emitter.ts` entirely (both the `EventEmitter` abstract class and `DefaultEventEmitter` concrete class).

**Traceability**: Design note "No Event System" in registry-runtime.md. The file is no longer referenced by any module.

#### Step 6: Clean up exports

- [x] 21.7.14 Remove any `EventEmitter` or `DefaultEventEmitter` exports from `packages/screensets/src/mfe/runtime/index.ts` barrel (if any exist).

**Traceability**: Design note "No Event System" in registry-runtime.md. No event types should be publicly exported.

#### Step 7: Rename and rewrite `useExtensionEvents` hook to `useDomainExtensions`

- [x] 21.7.15 Rename `useExtensionEvents` to `useDomainExtensions` and rewrite the implementation in `packages/react/src/mfe/hooks/`. Specifically: (a) Rename the file from `useExtensionEvents.ts` to `useDomainExtensions.ts`. (b) Rename the hook export from `useExtensionEvents` to `useDomainExtensions`. (c) Replace the event-based implementation (which subscribed to `extensionRegistered`/`extensionUnregistered` events via `runtime.on`/`runtime.off`) with a **store slice subscription**. The hook subscribes to the `registrationStates` field in the MFE store slice (implemented in Phase 20.3) to detect when extensions are registered or unregistered. When the slice state changes, the hook calls `runtime.getExtensionsForDomain(domainId)` to get the current extension list and triggers a re-render. (d) The hook signature becomes `useDomainExtensions(domainId: string): Extension[]`. (e) Update the `@hai3/react` barrel export to export `useDomainExtensions` instead of `useExtensionEvents`. (f) Remove the old `useExtensionEvents.ts` file if not already replaced by the rename.
- [x] 21.7.16 Update all imports and references to `useExtensionEvents` in application code to use `useDomainExtensions`. Search for `useExtensionEvents` across the codebase to ensure no references remain.

**Traceability**: Phase 20.4 tasks (20.4.1-20.4.7) originally implemented this hook using events. Phase 21.7 removes the event system. The replacement uses the store slice from Phase 20.3 (`registrationStates`) as the change-detection mechanism. The name changes from "events" to "extensions" because there are no events anymore -- the hook returns the list of extensions for a domain.

#### Step 8: Update `specs/screensets/spec.md` -- remove all event-emission assertions

- [x] 21.7.17 Remove `**AND** an \`extensionRegistered\` event SHALL be emitted` from the "Register extension dynamically after user action" scenario (line 958 area).
- [x] 21.7.18 Remove `**AND** an \`extensionUnregistered\` event SHALL be emitted` from the "Unregister extension when user disables feature" scenario (line 973 area).
- [x] 21.7.19 Remove `**AND** a \`domainRegistered\` event SHALL be emitted` from the "Register domain dynamically" scenario (line 988 area).
- [x] 21.7.20 Remove `**AND** a \`domainUnregistered\` event SHALL be emitted` from the "Unregister domain dynamically" scenario (line 997 area).
- [x] 21.7.21 Remove `**AND** \`domainRegistered\` event SHALL be emitted` from the "ScreensetsRegistry registerDomain method" scenario (line 1045 area).
- [x] 21.7.22 Remove the entire "Registration events" scenario (lines 1102-1113 area) which lists all 7 event types (`extensionRegistered`, `extensionUnregistered`, `domainRegistered`, `domainUnregistered`, `extensionLoaded`, `extensionMounted`, `extensionUnmounted`) and the `external systems MAY subscribe` clause. This scenario directly contradicts the "No Event System" design note.

**Traceability**: Blocker -- spec assertions must not mandate event emission when the design explicitly forbids an event system. All "SHALL emit" clauses for events are removed. The "Registration events" scenario is removed entirely. Lifecycle stages with actions chains are the only mechanism for reacting to runtime transitions.

#### Step 9: Update `specs/microfrontends/spec.md` -- rewrite "Listen to registration events" scenario

- [x] 21.7.23 Rewrite the "Listen to registration events" scenario (lines 856-879 area) in `specs/microfrontends/spec.md`. The scenario title must change to "Observe domain extensions via store slice" (or similar, no "events" in the title). The code example must show `useDomainExtensions` (renamed hook from Step 7) imported from `@hai3/react`, subscribing to the store slice state -- NOT to `extensionRegistered`/`extensionUnregistered` events. The acceptance criteria must state: (a) `useDomainExtensions(domainId)` SHALL subscribe to the MFE store slice `registrationStates` (from Phase 20.3) to detect registration changes. (b) It SHALL call `runtime.getExtensionsForDomain(domainId)` to resolve the current extension list. (c) It SHALL trigger re-render when the slice state changes. (d) It SHALL return the current list of extensions for the domain. Remove ALL references to `extensionRegistered`/`extensionUnregistered` events, `runtime.on`, and `runtime.off`.

**Traceability**: Blocker -- the spec scenario must not mandate event-based subscription when the design explicitly forbids an event system. The hook is renamed from `useExtensionEvents` to `useDomainExtensions` and uses store slice subscription instead of events.

#### Step 10: Update tests

- [x] 21.7.24 Remove or update test cases in `packages/screensets/__tests__/mfe/runtime/` that test `on`/`off`/event emission behavior (e.g., tests for `domainRegistered`, `extensionRegistered`, `extensionLoaded`, `extensionMounted`, `extensionUnmounted`, `extensionUnregistered`, `domainUnregistered` events).
- [x] 21.7.25 Rename test file from `useExtensionEvents.test.tsx` to `useDomainExtensions.test.tsx` in `packages/react/__tests__/mfe/hooks/`. Rewrite the test cases to verify the renamed hook `useDomainExtensions` works via store slice subscription, not via `on`/`off` events.
- [x] 21.7.26 Verify no remaining test files import from `event-emitter.ts`.
- [x] 21.7.27 Verify no remaining test files reference `useExtensionEvents` (old hook name).

**Traceability**: Tests must reflect the removal of the event system and the hook rename. No test should reference `on`, `off`, `emit`, any event name from the removed system, or the old hook name `useExtensionEvents`.

#### Validation

- [x] 21.7.28 Run `npm run type-check` -- must pass with no errors.
- [x] 21.7.29 Run `npm run test` -- all remaining tests must pass.
- [x] 21.7.30 Run `npm run build` -- must pass.
- [x] 21.7.31 Verify `event-emitter.ts` does not exist in the built output.
- [x] 21.7.32 Verify `on` and `off` are NOT present on the `ScreensetsRegistry` type in `.d.ts` output.
- [x] 21.7.33 Verify no source file imports from `event-emitter.ts`.
- [x] 21.7.34 Verify no "SHALL emit" clauses referencing events remain in `specs/screensets/spec.md`.
- [x] 21.7.35 Verify no references to `useExtensionEvents` remain in any spec or source file.

**Traceability**: EventEmitter removal validation -- no regressions, event system is fully eliminated from implementation, specs, and tests.

---

## Phase 21.8: Class-Based Refactoring for GtsPlugin and MfeStateContainer

**Goal**: Refactor two architectural violations where factory functions return plain objects with closure-based state instead of the required abstract class + concrete class pattern. This aligns `GtsPlugin` and `MfeStateContainer` with every other stateful component in the MFE runtime.

**Prerequisite**: Phase 21.7 complete. This phase is a structural refactoring -- no new features, no behavioral changes.

**Architectural Reference**: [Registry Runtime - No Functional Factories for Stateful Components](./design/registry-runtime.md#no-functional-factories-for-stateful-components), [Registry Runtime - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction)

### 21.8.1 Refactor GtsPlugin to Class-Based Pattern

**Violation**: `createGtsPlugin()` in `packages/screensets/src/mfe/plugins/gts/index.ts` returns a plain object literal implementing `TypeSystemPlugin`. The `GtsStore` instance is hidden in a closure variable instead of a private class field.

- [x] 21.8.1.1 Create concrete `GtsPlugin` class implementing `TypeSystemPlugin` in `packages/screensets/src/mfe/plugins/gts/index.ts`. Move the `GtsStore` instance to a `private readonly gtsStore` field. Move all method implementations from the returned object literal into class methods that reference `this.gtsStore` instead of the closure variable.
- [x] 21.8.1.2 Update `createGtsPlugin()` factory to instantiate `new GtsPlugin()` and return it typed as `TypeSystemPlugin`. The factory function remains for API compatibility. -- **SUPERSEDED by Phase 21.9.1** -- `createGtsPlugin()` factory is removed entirely.
- [x] 21.8.1.3 Update `gtsPlugin` singleton to use the typed factory: `export const gtsPlugin: TypeSystemPlugin = createGtsPlugin()`. -- **SUPERSEDED by Phase 21.9.1** -- `gtsPlugin` is instantiated directly via `new GtsPlugin()`, not via factory.
- [x] 21.8.1.4 Do NOT export the `GtsPlugin` class from the public barrel. Only `createGtsPlugin` and `gtsPlugin` are exported. The concrete class is an implementation detail. -- **SUPERSEDED by Phase 21.9.1** -- only `gtsPlugin` is exported; `createGtsPlugin` is removed.
- [x] 21.8.1.5 Verify all existing GTS plugin tests pass without modification. The refactoring is behavioral no-op -- tests interact through the `TypeSystemPlugin` interface.

**Traceability**: Reopened task 2.2.1. Design: [type-system.md - GTS Plugin Implementation](./design/type-system.md#decision-1-type-system-plugin-interface). Principle: "No Functional Factories for Stateful Components" in registry-runtime.md.

### 21.8.2 Refactor MfeStateContainer to Abstract Class + Concrete Class Pattern

**Violation**: `createMfeStateContainer()` in `packages/screensets/src/mfe/state/index.ts` returns a plain object `{ getState(), setState(), subscribe(), dispose() }` with state hidden in closure variables (`state`, `listeners`, `disposed`).

- [x] 21.8.2.1 Replace the existing `MfeStateContainer<TState>` interface with an abstract class of the same name in `packages/screensets/src/mfe/state/index.ts` (or a new file `mfe-state-container.ts` if the file is too large). Remove the old interface definition. Define abstract methods: `getState(): TState`, `setState(updater: (prev: TState) => TState): void`, `subscribe(listener: (state: TState) => void): () => void`, `dispose(): void`, and `readonly disposed: boolean` abstract getter.
- [x] 21.8.2.2 Create concrete `DefaultMfeStateContainer<TState>` extending `MfeStateContainer<TState>` in the same module. Move closure variables to private fields: `private state: TState`, `private listeners: Set<(state: TState) => void>`, `private _disposed: boolean`. Implement all abstract methods using `this.state`, `this.listeners`, `this._disposed` instead of closure references.
- [x] 21.8.2.3 Update `createMfeStateContainer<TState>(config: MfeStateContainerConfig<TState>): MfeStateContainer<TState>` factory to instantiate `new DefaultMfeStateContainer(config)`. Preserve the existing config-object signature -- this is a structural refactoring, not an API change. The return type changes from a plain object type to `MfeStateContainer<TState>`.
- [x] 21.8.2.4 Integrate `isMfeStateContainerDisposed()` into the abstract class as the `disposed` getter. Remove the standalone function if it becomes redundant. If external code calls `isMfeStateContainerDisposed(container)`, update those call sites to use `container.disposed` instead.
- [x] 21.8.2.5 Export the abstract `MfeStateContainer` class from `@hai3/screensets` (for DIP -- consumers type against the abstract class). Do NOT export `DefaultMfeStateContainer` from the public barrel.
- [x] 21.8.2.6 Update all test files that reference the old plain object type or `isMfeStateContainerDisposed()` to use the new `MfeStateContainer<TState>` type and `container.disposed` getter. Verify all existing state container tests pass.

**Traceability**: Reopened task 8.1.1. Design: "No Functional Factories for Stateful Components" in registry-runtime.md. Requirement: "Instance-Level Isolation (Default Behavior, Framework-Agnostic)" -- MFE state isolation.

### 21.8.3 Validation

- [x] 21.8.3.1 Run `npm run type-check` -- must pass with no errors.
- [x] 21.8.3.2 Run `npm run test` -- all existing tests must pass with no behavioral changes.
- [x] 21.8.3.3 Run `npm run build` -- must pass.
- [x] 21.8.3.4 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 21.8.3.5 Verify `GtsPlugin` class is NOT present in `@hai3/screensets` public type declarations (`.d.ts` output). Only `createGtsPlugin` and `gtsPlugin` appear. -- **SUPERSEDED by Phase 21.9.1** -- `createGtsPlugin` must no longer appear in `.d.ts` output.
- [x] 21.8.3.6 Verify `DefaultMfeStateContainer` class is NOT present in `@hai3/screensets` public type declarations (`.d.ts` output). Only `MfeStateContainer` (abstract) and `createMfeStateContainer` appear. -- **SUPERSEDED by Phase 21.9.2** -- `createMfeStateContainer` must no longer appear in `.d.ts` output.

**Traceability**: Class-based refactoring validation -- no regressions, public API surface is correct.

---

## Phase 21.9: Eliminate Standalone Factory Functions

**Goal**: Remove all standalone factory functions (`createGtsPlugin()`, `createMfeStateContainer()`, `createScreensetsRegistry()`) and replace them with the correct patterns: singleton constants (for single-instance components) or direct construction in internal wiring code (for multi-instance components). Standalone factory functions and static factory methods on abstract classes both violate the class-based architecture principle.

**Prerequisite**: Phase 21.8 complete. This phase is a structural refactoring -- no new features, no behavioral changes.

**Architectural Reference**: [Registry Runtime - No Standalone Factory Functions](./design/registry-runtime.md#no-standalone-factory-functions-for-stateful-components), [Registry Runtime - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction)

### 21.9.1 GtsPlugin Singleton (Remove createGtsPlugin)

GtsPlugin is a singleton -- one GTS type system per application. The `createGtsPlugin()` factory allows creating multiple instances, which is architecturally wrong. Remove the factory entirely; `gtsPlugin` is the only public export.

- [x] 21.9.1.1 Remove `createGtsPlugin()` standalone function from `packages/screensets/src/mfe/plugins/gts/index.ts`.
- [x] 21.9.1.2 Change `gtsPlugin` to instantiate directly: `export const gtsPlugin: TypeSystemPlugin = new GtsPlugin()` (no factory indirection).
- [x] 21.9.1.3 Remove `createGtsPlugin` from barrel exports in `packages/screensets/src/mfe/index.ts` and `packages/screensets/src/index.ts`.
- [x] 21.9.1.4 Update any call sites that use `createGtsPlugin()` to use the `gtsPlugin` singleton instead. Search the entire codebase for `createGtsPlugin`.

**Traceability**: Reopened task 2.2.1. Design: [type-system.md - GtsPlugin Singleton](./design/type-system.md#decision-1-type-system-plugin-interface). Principle: "No Standalone Factory Functions" in registry-runtime.md.

### 21.9.2 MfeStateContainer Pure Abstract (Replace createMfeStateContainer)

Make `MfeStateContainer` a pure abstract class with NO static methods. Remove standalone `createMfeStateContainer()`. `DefaultMountManager` constructs `DefaultMfeStateContainer` instances directly (internal wiring). No public construction path exists.

- [x] 21.9.2.1 Remove `static create()` from abstract `MfeStateContainer` class if present. The abstract class must be a pure contract with NO static methods and NO import of `DefaultMfeStateContainer`.
- [x] 21.9.2.2 Remove standalone `createMfeStateContainer()` function from its source file.
- [x] 21.9.2.3 Update barrel exports: remove `createMfeStateContainer` from all barrel files. `MfeStateContainer` (abstract class, pure contract) remains exported for DIP typing.
- [x] 21.9.2.4 Update all call sites: `DefaultMountManager` constructs `new DefaultMfeStateContainer(config)` directly (internal wiring code that already knows concrete types). Search the entire codebase for `createMfeStateContainer` and `MfeStateContainer.create` to ensure none remain.

**Traceability**: Reopened task 8.1.1. Design: [registry-runtime.md - MfeStateContainer](./design/registry-runtime.md#mfestatecontainer). Principle: "No Standalone Factory Functions" in registry-runtime.md.

### 21.9.3 ScreensetsRegistry Singleton (Replace createScreensetsRegistry)

**SUPERSEDED by Phase 21.10** -- the `screensetsRegistry` singleton constant created in this phase is replaced by the `screensetsRegistryFactory` factory-with-cache pattern. See Phase 21.10 for the current construction approach.

Make `ScreensetsRegistry` a pure abstract class with NO static methods. Remove standalone `createScreensetsRegistry()`. Create a `screensetsRegistry` singleton constant in the barrel/initialization file. Delete `create-screensets-registry.ts`.

- [x] 21.9.3.1 Remove `static create()` from abstract `ScreensetsRegistry` class in `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts` if present. The abstract class must be a pure contract with NO static methods and NO import of `DefaultScreensetsRegistry`.
- [x] 21.9.3.2 Create singleton `screensetsRegistry` constant in `packages/screensets/src/mfe/runtime/index.ts` (barrel/initialization file): `export const screensetsRegistry: ScreensetsRegistry = new DefaultScreensetsRegistry({ typeSystem: gtsPlugin })`. This is the ONLY code that imports `DefaultScreensetsRegistry`.
- [x] 21.9.3.3 Remove standalone `createScreensetsRegistry()` function from `packages/screensets/src/mfe/runtime/create-screensets-registry.ts`.
- [x] 21.9.3.4 Delete the `create-screensets-registry.ts` file entirely (it only contained the standalone factory function).
- [x] 21.9.3.5 Update barrel exports: remove `createScreensetsRegistry` from all barrel files. Export `screensetsRegistry` (singleton constant) and `ScreensetsRegistry` (abstract class, pure contract) from the barrel.
- [x] 21.9.3.6 Update all call sites from `createScreensetsRegistry(config)` or `ScreensetsRegistry.create(config)` to use the `screensetsRegistry` singleton. Search the entire codebase for `createScreensetsRegistry` and `ScreensetsRegistry.create` to ensure none remain.

**Traceability**: Reopened task 4.1.4. Design: [registry-runtime.md - Factory-with-Cache Pattern](./design/registry-runtime.md#factory-with-cache-pattern) (was "Singleton Pattern" before Phase 21.10 replaced it with factory-with-cache). Principle: "No Standalone Factory Functions" in registry-runtime.md.

### 21.9.4 Validation

- [x] 21.9.4.1 Run `npm run type-check` -- must pass with no errors.
- [x] 21.9.4.2 Run `npm run test` -- all existing tests must pass with no behavioral changes.
- [x] 21.9.4.3 Run `npm run build` -- must pass.
- [x] 21.9.4.4 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 21.9.4.5 Verify no standalone `create*` factory functions and no static `create()` methods on abstract classes appear in public `.d.ts` output. Specifically: `createGtsPlugin`, `createMfeStateContainer`, `createScreensetsRegistry`, `ScreensetsRegistry.create`, and `MfeStateContainer.create` must NOT appear. Only `screensetsRegistry` (singleton constant) and `gtsPlugin` (singleton constant) should appear as construction points.

**Traceability**: Standalone factory function and static factory method elimination validation -- no regressions, public API surface is correct.

---

## Phase 21.10: Factory-with-Cache for ScreensetsRegistry

**Goal**: Replace the `screensetsRegistry` singleton constant (which hardcodes `gtsPlugin` at module initialization time) with a `ScreensetsRegistryFactory` factory-with-cache pattern. This makes `TypeSystemPlugin` truly pluggable by deferring the binding of the type system plugin to application wiring time. The factory caches the instance after the first `build()` call and returns it on subsequent calls.

**Prerequisite**: Phase 21.9 complete. This phase is a structural refactoring -- no new features, no behavioral changes to existing consumers that use GTS.

**Architectural Reference**: [Registry Runtime - Factory-with-Cache Pattern](./design/registry-runtime.md#factory-with-cache-pattern), [Registry Runtime - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction), [Principles - Abstract Class Layers](./design/principles.md#abstract-class-layers-with-singleton-construction)

**Motivation**: The current pattern creates the `ScreensetsRegistry` singleton as `new DefaultScreensetsRegistry({ typeSystem: gtsPlugin })` in the barrel file. This hardcodes `gtsPlugin` at import time, defeating the entire purpose of `TypeSystemPlugin` being a pluggable abstraction. A custom type system plugin can never be provided because the registry is already constructed with GTS by the time any consumer code runs.

### 21.10.1 Create ScreensetsRegistryFactory Abstract Class

- [x] 21.10.1.1 Create `packages/screensets/src/mfe/runtime/ScreensetsRegistryFactory.ts` as an abstract class with a single abstract method: `abstract build(config: ScreensetsRegistryConfig): ScreensetsRegistry`. The class is a pure contract -- NO static methods, NO knowledge of `DefaultScreensetsRegistryFactory` or `DefaultScreensetsRegistry`.

**Traceability**: Requirement "Abstract Class Layers" -- factory abstraction is a pure contract. Reopened task 4.1.4 -- `TypeSystemPlugin` must be truly pluggable.

### 21.10.2 Create DefaultScreensetsRegistryFactory Concrete Class

- [x] 21.10.2.1 Create `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistryFactory.ts` containing a concrete class extending `ScreensetsRegistryFactory`. The class has a `private instance: ScreensetsRegistry | null = null` field and a `private cachedConfig: ScreensetsRegistryConfig | null = null` field. The `build(config)` method: (a) if `this.instance` is not null, checks that `config.typeSystem` matches the cached config's typeSystem; throws an error if they differ (config-mismatch detection to catch misconfiguration early); otherwise returns `this.instance` (cached singleton); (b) if `this.instance` is null, creates `new DefaultScreensetsRegistry(config)`, caches the config, stores the instance in `this.instance`, and returns it. This is the ONLY code that imports `DefaultScreensetsRegistry` (alongside test files that import it directly for testing concrete internals).

**Traceability**: Requirement "Abstract Class Layers" -- concrete factory caches the instance. Reopened task 4.1.4.

### 21.10.3 Export screensetsRegistryFactory Singleton Constant

- [x] 21.10.3.1 In `packages/screensets/src/mfe/runtime/index.ts` (barrel), create the singleton factory constant: `export const screensetsRegistryFactory: ScreensetsRegistryFactory = new DefaultScreensetsRegistryFactory()`. Import `DefaultScreensetsRegistryFactory` from `./DefaultScreensetsRegistryFactory`.

**Traceability**: Requirement "Abstract Class Layers" -- singleton factory constant is the only construction point. Reopened task 4.1.4.

### 21.10.4 Remove screensetsRegistry Pre-Built Singleton

- [x] 21.10.4.1 Remove the `screensetsRegistry` singleton constant from `packages/screensets/src/mfe/runtime/index.ts`. It no longer exists -- the factory provides the instance. Remove the `import { gtsPlugin }` and `import { DefaultScreensetsRegistry }` lines that were used only for the singleton constant construction (note: `DefaultScreensetsRegistryFactory` import replaces the `DefaultScreensetsRegistry` import in the barrel).

**Traceability**: Reopened task 4.1.4 -- the pre-built singleton hardcodes `gtsPlugin`, defeating pluggability.

### 21.10.5 Update Barrel Exports

- [x] 21.10.5.1 Update `packages/screensets/src/mfe/runtime/index.ts` barrel: export `ScreensetsRegistryFactory` (abstract class) from `./ScreensetsRegistryFactory` and `screensetsRegistryFactory` (singleton factory constant). Remove the `screensetsRegistry` export.
- [x] 21.10.5.2 Update `packages/screensets/src/mfe/index.ts` barrel: replace `screensetsRegistry` re-export with `screensetsRegistryFactory` and `ScreensetsRegistryFactory` re-exports.
- [x] 21.10.5.3 Update `packages/screensets/src/index.ts` barrel: replace `screensetsRegistry` re-export with `screensetsRegistryFactory` and `ScreensetsRegistryFactory` re-exports.

**Traceability**: [Design - Export Policy](./design/registry-runtime.md#export-policy). `screensetsRegistry` is removed; `screensetsRegistryFactory` and `ScreensetsRegistryFactory` are the replacements.

### 21.10.6 Update Framework Plugin

- [x] 21.10.6.1 Update `packages/framework/src/plugins/microfrontends/` to use `screensetsRegistryFactory.build({ typeSystem: gtsPlugin })` instead of importing `screensetsRegistry` directly. Import `screensetsRegistryFactory` from `@hai3/screensets` and `gtsPlugin` from `@hai3/screensets/plugins/gts` (subpath export). This is the application wiring point where the type system binding occurs.

**Traceability**: Requirement "Type System Plugin Abstraction" -- GTS binding happens at framework wiring, not module initialization.

### 21.10.7 Update Test Files

- [x] 21.10.7.1 Update test files that imported `screensetsRegistry` singleton to use the factory instead: `screensetsRegistryFactory.build({ typeSystem: gtsPlugin })`. Tests that need custom configs continue to use `new DefaultScreensetsRegistry(config)` directly (unchanged -- they import from the concrete file path).
- [x] 21.10.7.2 Search the entire codebase for `screensetsRegistry` (excluding `screensetsRegistryFactory`) to ensure no references to the removed singleton remain.

**Traceability**: Reopened task 4.1.4 -- test compatibility with factory-with-cache pattern.

### 21.10.8 Update Documentation References

- [x] 21.10.8.1 Search all `openspec/` files and update remaining references to `screensetsRegistry` singleton to reference `screensetsRegistryFactory.build(config)`. This includes spec files, design docs, and any code examples that show `screensetsRegistry.registerDomain(...)` or similar patterns -- they should show obtaining the registry from the factory first.
- [x] 21.10.8.2 Update JSDoc example in `packages/screensets/src/mfe/plugins/gts/index.ts` to show `screensetsRegistryFactory.build(config)` instead of `import { screensetsRegistry } from '@hai3/screensets'`.

**Traceability**: Documentation consistency with factory-with-cache pattern.

### 21.10.9 Validation

- [x] 21.10.9.1 Run `npm run type-check` -- must pass with no errors.
- [x] 21.10.9.2 Run `npm run test` -- all existing tests must pass with no behavioral changes.
- [x] 21.10.9.3 Run `npm run build` -- must pass.
- [x] 21.10.9.4 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 21.10.9.5 Verify `screensetsRegistry` singleton constant does NOT appear in `@hai3/screensets` public type declarations (`.d.ts` output). Only `screensetsRegistryFactory` (singleton factory constant), `ScreensetsRegistryFactory` (abstract class), and `ScreensetsRegistry` (abstract class) should appear as public API surface for registry construction.
- [x] 21.10.9.6 Verify `DefaultScreensetsRegistryFactory` is NOT present in `@hai3/screensets` public type declarations (`.d.ts` output).

**Traceability**: Factory-with-cache refactoring validation -- no regressions, public API surface is correct. Reopened task 4.1.4 fully resolved.

---

## Phase 21.11: Bridge API Architecture Correction

**Goal**: Correct the bridge API so that `registry.executeActionsChain()` is the ONLY public entry point for actions chain execution. Child MFEs get `executeActionsChain` on the bridge as a capability pass-through to the registry. All bridge transport methods (`sendActionsChain`, `onActionsChain`) become concrete-only (private internal transport for hierarchical composition). `ParentMfeBridge` public interface is reduced to only `instanceId` + `dispose()`.

**Prerequisite**: Phase 21.10 complete. This phase corrects the bridge API architecture: transport methods moved to concrete-only, `executeActionsChain` added as capability pass-through.

**Architectural Reference**: [MFE API - Bridge Interfaces](./design/mfe-api.md#mfe-bridge-interfaces), [MFE API - Action Chain Execution Model](./design/mfe-api.md#action-chain-execution-model), [Registry Runtime - Group C](./design/registry-runtime.md#group-c-parentmfebridge-interface----4-methods-removed-from-public-type), [Overview - Action Chain Execution](./design/overview.md#action-chain-execution)

### 21.11.1 Remove internal wiring methods from public ParentMfeBridge interface

- [x] 21.11.1.0 Add `readonly instanceId: string` to both the `ParentMfeBridge` abstract interface in `packages/screensets/src/mfe/handler/types.ts` AND the concrete `ParentMfeBridgeImpl` class in `packages/screensets/src/mfe/bridge/ParentMfeBridge.ts`. The design doc (`mfe-api.md`) declares `instanceId` on the public interface, and validation task 21.11.8.5 expects it in the `.d.ts` output. Currently only `ChildMfeBridgeImpl` has `instanceId`; `ParentMfeBridgeImpl` does not. The concrete class should expose it as a getter derived from `this.childBridge.instanceId` or accept it as a constructor parameter.
- [x] 21.11.1.1 Remove `onChildAction(callback)` from the `ParentMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ParentMfeBridgeImpl` class in `bridge/ParentMfeBridge.ts` (unchanged).
- [x] 21.11.1.2 Remove `receivePropertyUpdate(propertyTypeId, value)` from the `ParentMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ParentMfeBridgeImpl` class (unchanged).
- [x] 21.11.1.3 Move `onChildAction` wiring into `createBridge()` in `bridge-factory.ts`. The function already performs all wiring setup, so adding the `onChildAction` wiring there keeps all bridge setup in one place.
- [x] 21.11.1.4 Update `createBridge()` in `bridge-factory.ts` to accept an `executeActionsChain` callback parameter and call `parentBridgeImpl.onChildAction(executeActionsChain)` before returning. Update the `DefaultMountManager.mountExtension()` call site to pass the `executeActionsChain` callback to `createBridge()`. Remove the separate `parentBridge.onChildAction(...)` call from `DefaultMountManager`.
- [x] 21.11.1.5 Verify that `bridge-factory.ts` subscriber callbacks that call `parentBridgeImpl.receivePropertyUpdate()` still compile -- they already use the concrete `parentBridgeImpl` variable (not the interface type). No changes expected.

**Traceability**: [Design - Group C: ParentMfeBridge interface](./design/registry-runtime.md#group-c-parentmfebridge-interface----4-methods-removed-from-public-type). Public interface cleanup: internal wiring methods must not appear on public types.

### 21.11.2 Concrete-only internal methods for hierarchical composition transport

- [x] 21.11.2.1 `onActionsChain(handler)` implemented on `ChildMfeBridgeImpl` as a concrete-only method. NOT on the public `ChildMfeBridge` interface.
- [x] 21.11.2.2 `handleParentActionsChain(chain, options)` implemented on `ChildMfeBridgeImpl` as a concrete-only method. Called by `ParentMfeBridgeImpl.sendActionsChain()` for internal transport.
- [x] 21.11.2.3 `NoActionsChainHandlerError` error class created in `packages/screensets/src/mfe/errors/index.ts`.
- [x] 21.11.2.4 `ChildMfeBridgeImpl.cleanup()` clears the `actionsChainHandler` field.

**Traceability**: [MFE API - ChildMfeBridge concrete-only methods](./design/mfe-api.md#childmfebridge-interface). Internal transport for hierarchical composition.

### 21.11.3 `ParentMfeBridgeImpl.sendActionsChain()` as concrete-only

- [x] 21.11.3.1 `ParentMfeBridgeImpl.sendActionsChain()` implemented with forwarding to `childBridge.handleParentActionsChain()`. `BridgeDisposedError` class created.

**Traceability**: [MFE API - ParentMfeBridge concrete-only methods](./design/mfe-api.md#parentmfebridge-interface). Concrete-only transport for hierarchical composition.

### 21.11.4 Remove `sendActionsChain` from public ParentMfeBridge interface

- [x] 21.11.4.0 Remove `sendActionsChain(chain, options?)` from the `ParentMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ParentMfeBridgeImpl` class (concrete-only for internal hierarchical composition transport). After this change, the public `ParentMfeBridge` interface has ONLY `instanceId` and `dispose()`.

**Traceability**: [Design - Group C](./design/registry-runtime.md#group-c-parentmfebridge-interface----4-methods-removed-from-public-type). `sendActionsChain` implies routing which is an internal concern. The parent uses `registry.executeActionsChain()` directly.

### 21.11.5 Remove `sendActionsChain` and `onActionsChain` from public ChildMfeBridge interface, add `executeActionsChain`

- [x] 21.11.5.0 Remove `sendActionsChain(chain, options?)` from the `ChildMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ChildMfeBridgeImpl` class (concrete-only for internal child-to-parent transport).

- [x] 21.11.5.1 Remove `onActionsChain(handler)` from the `ChildMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`. The method remains on `ChildMfeBridgeImpl` class (concrete-only for internal hierarchical composition wiring).

- [x] 21.11.5.2 Add `executeActionsChain(chain, options?)` to the `ChildMfeBridge` interface in `packages/screensets/src/mfe/handler/types.ts`:
  ```typescript
  /**
   * Execute an actions chain via the registry.
   * This is a capability pass-through -- the bridge delegates directly to
   * the registry's executeActionsChain(). This is the ONLY public API for
   * child MFEs to trigger actions chains.
   *
   * @param chain - Actions chain to execute
   * @param options - Optional execution options
   * @returns Promise resolving to chain result
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;
  ```

- [x] 21.11.5.3 Implement `executeActionsChain(chain, options)` on `ChildMfeBridgeImpl` in `packages/screensets/src/mfe/bridge/ChildMfeBridge.ts`:
  - Add a `private executeActionsChainCallback` field (initially `null`).
  - The method calls `this.executeActionsChainCallback(chain, options)` and returns the result.
  - If the callback is null (bridge not wired), throw an error indicating the bridge is not connected.

- [x] 21.11.5.4 Add a `setExecuteActionsChainCallback(callback)` internal method on `ChildMfeBridgeImpl` for `createBridge()` to inject the registry callback.

- [x] 21.11.5.5 Update `ChildMfeBridgeImpl.cleanup()` to clear the `executeActionsChainCallback` field (set to `null`).

**Traceability**: [MFE API - ChildMfeBridge Interface](./design/mfe-api.md#childmfebridge-interface). `executeActionsChain` is the public capability. `sendActionsChain` and `onActionsChain` are internal transport.

### 21.11.6 Update `createBridge()` to wire `executeActionsChain` callback

- [x] 21.11.6.0 Update `createBridge()` in `packages/screensets/src/mfe/runtime/bridge-factory.ts` to accept an additional `registryExecuteActionsChain` callback parameter (the registry's `executeActionsChain` method).

- [x] 21.11.6.1 In `createBridge()`, after creating the `ChildMfeBridgeImpl`, call `childBridge.setExecuteActionsChainCallback(registryExecuteActionsChain)` to wire the registry's execution capability to the child bridge.

- [x] 21.11.6.2 Update `DefaultMountManager.mountExtension()` in `packages/screensets/src/mfe/runtime/default-mount-manager.ts` to pass the registry's `executeActionsChain` callback to `createBridge()`.

**Traceability**: [MFE API - Action Chain Execution Model](./design/mfe-api.md#action-chain-execution-model). The bridge delegates to the registry, not routes through the parent.

### 21.11.7 Update design docs, specs, and proposal

- [x] 21.11.7.0 Error classes `NoActionsChainHandlerError` and `BridgeDisposedError` already exist in `design/mfe-errors.md`.

- [x] 21.11.7.1 Spec scenarios for ParentMfeBridge and ChildMfeBridge already applied in previous phases.

- [x] 21.11.7.2 Update the "ChildMfeBridge interface" scenario in `specs/screensets/spec.md`: assert `executeActionsChain` is present, assert `sendActionsChain` and `onActionsChain` are NOT present on the public interface.

- [x] 21.11.7.3 Update the "ParentMfeBridge interface" scenario in `specs/screensets/spec.md`: assert `sendActionsChain` is NOT present on the public interface, assert only `instanceId` and `dispose()` remain.

- [x] 21.11.7.4 Update the "Parent-to-child action chain delivery" scenario in `specs/screensets/spec.md`: change from public API scenario to internal transport scenario (concrete-only methods).

- [x] 21.11.7.5 Update code examples in `specs/microfrontends/spec.md`: replace `bridge.sendActionsChain()` with `bridge.executeActionsChain()`.

- [x] 21.11.7.6 Update `design/mfe-api.md`: ChildMfeBridge public interface shows `executeActionsChain` instead of `sendActionsChain`/`onActionsChain`. ParentMfeBridge public interface shows only `instanceId` + `dispose()`. Bridge transport methods documented as concrete-only.

- [x] 21.11.7.7 Update `design/overview.md`: "Action Chain Execution" section reflects `registry.executeActionsChain()` as the only public entry point.

- [x] 21.11.7.8 Update `design/registry-runtime.md` Group C: add `sendActionsChain` (both bridges) and `onActionsChain` (ChildMfeBridge) to the concrete-only table. Update "After Phase 21.11" summary.

- [x] 21.11.7.9 Update `proposal.md` Bridge Interface Names: reflect new public API.

**Traceability**: Spec alignment with corrected architecture. All "SHALL" assertions must match the actual public interface.

### 21.11.8 Update tests and validation

- [x] 21.11.8.0 Add tests in `packages/screensets/__tests__/mfe/bridge/bridge.test.ts`:
  - Test `ChildMfeBridgeImpl.executeActionsChain()` delegates to the injected registry callback.
  - Test `ChildMfeBridgeImpl.executeActionsChain()` throws when callback is not wired.
  - Test `ChildMfeBridgeImpl.onActionsChain()` registers a handler (concrete-only, test via concrete type).
  - Test `ChildMfeBridgeImpl.handleParentActionsChain()` calls the registered handler (concrete-only).
  - Test `ChildMfeBridgeImpl.handleParentActionsChain()` throws when no handler is registered.
  - Test `ParentMfeBridgeImpl.sendActionsChain()` forwards to child bridge's handler (concrete-only).
  - Test `ParentMfeBridgeImpl.sendActionsChain()` throws when bridge is disposed.
  - Test cleanup clears both `executeActionsChainCallback` and `actionsChainHandler`.

- [x] 21.11.8.1 Update existing tests that reference `sendActionsChain` or `onActionsChain` on the public interface types:
  - Any test using `bridge.sendActionsChain()` on a `ChildMfeBridge`-typed variable must be changed to `bridge.executeActionsChain()`.
  - Any test using `parentBridge.sendActionsChain()` on a `ParentMfeBridge`-typed variable must either cast to `ParentMfeBridgeImpl` or use `registry.executeActionsChain()`.

- [x] 21.11.8.2 Verify `DefaultMountManager` integration tests still pass with the updated `createBridge()` signature.

- [x] 21.11.8.3 Run `npm run type-check` -- must pass with no errors.
- [x] 21.11.8.4 Run `npm run test` -- all existing tests must pass plus new/updated tests.
- [x] 21.11.8.5 Run `npm run build` -- must pass.
- [x] 21.11.8.6 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 21.11.8.7 Verify `.d.ts` output for `ParentMfeBridge`: ONLY `instanceId` and `dispose()`. No `sendActionsChain`, `onChildAction`, or `receivePropertyUpdate`.
- [x] 21.11.8.8 Verify `.d.ts` output for `ChildMfeBridge`: has `executeActionsChain`. Does NOT have `sendActionsChain`, `onActionsChain`, or `handleParentActionsChain`.

**Traceability**: Bridge API architecture correction validation -- correct public surface, no regressions.

---

## Phase 22: Cross-Runtime Action Chain Routing

**Goal**: Implement the routing/discovery mechanism that connects the parent's `ActionsChainsMediator` to child runtime domains. When a child MFE registers its own domains in a child `ScreensetsRegistry`, the parent's mediator must be able to route actions targeting those domains through the bridge transport.

**Prerequisite**: Phase 21.11 complete. This phase adds the final piece of hierarchical composition: the parent mediator's ability to discover and route to child domains.

**Architectural Reference**: [MFE API - Cross-Runtime Action Chain Routing](./design/mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition), [Overview - Cross-runtime routing/discovery](./design/overview.md#action-chain-execution)

### 22.1 Create ChildDomainForwardingHandler

**Goal**: Create an `ActionHandler` implementation that forwards actions to a child runtime via bridge transport.

- [x] 22.1.1 Create `packages/screensets/src/mfe/bridge/ChildDomainForwardingHandler.ts`. The class implements `ActionHandler` and holds a reference to `ParentMfeBridgeImpl` and the child domain ID. The `handleAction(actionTypeId, payload)` method wraps the action in an `ActionsChain` and calls `this.parentBridgeImpl.sendActionsChain(chain)`. Because `sendActionsChain()` returns `Promise<ChainResult>` but `ActionHandler.handleAction()` returns `Promise<void>`, the method MUST check the result and reject on failure: `const result = await this.parentBridgeImpl.sendActionsChain(chain); if (!result.completed) throw new Error(result.error ?? 'Chain execution failed in child domain');`.
- [x] 22.1.2 The class is `@internal` -- NOT exported from the `@hai3/screensets` barrel. It is used only by internal bridge wiring code.
- [x] 22.1.3 Export `ChildDomainForwardingHandler` from the bridge barrel (`packages/screensets/src/mfe/bridge/index.ts`) for internal use by sibling modules.

**Traceability**: [MFE API - ChildDomainForwardingHandler](./design/mfe-api.md#childdomainforwardinghandler). Requirement "Hierarchical Composition" -- cross-runtime action routing.

### 22.2 Add registerChildDomain / unregisterChildDomain on ChildMfeBridgeImpl

**Goal**: Add concrete-only methods on `ChildMfeBridgeImpl` that allow a child MFE to register/unregister its domains for cross-runtime forwarding. These methods are NOT on the public `ChildMfeBridge` interface.

- [x] 22.2.1 Add a `private registerChildDomainCallback: ((domainId: string) => void) | null = null` field on `ChildMfeBridgeImpl`.
- [x] 22.2.2 Add a `private unregisterChildDomainCallback: ((domainId: string) => void) | null = null` field on `ChildMfeBridgeImpl`.
- [x] 22.2.3 Add `registerChildDomain(domainId: string): void` concrete-only method on `ChildMfeBridgeImpl`. Calls `this.registerChildDomainCallback(domainId)` and adds `domainId` to `childDomainIds`. Throws a generic `Error` if callback is not wired (message: `'registerChildDomain callback not wired'`). A generic `Error` is acceptable here because this is a programming error (misuse of internal API), not a runtime failure that needs typed error handling.
- [x] 22.2.4 Add `unregisterChildDomain(domainId: string): void` concrete-only method on `ChildMfeBridgeImpl`. Calls `this.unregisterChildDomainCallback(domainId)` and removes `domainId` from `childDomainIds`. No-ops silently if callback is null (allows safe calls during cleanup).
- [x] 22.2.5 Add `setChildDomainCallbacks(register, unregister)` internal method on `ChildMfeBridgeImpl` for `createBridge()` to inject the callbacks.
- [x] 22.2.6 Update `ChildMfeBridgeImpl.cleanup()` to clean up child domain registrations. The ordering is a MUST requirement to prevent forwarding handler leaks: (1) iterate `childDomainIds` and call `this.unregisterChildDomain(domainId)` for each entry -- the callbacks MUST still be wired at this point so `unregisterChildDomain()` can invoke the unregister callback; (2) clear the `childDomainIds` set; (3) set `registerChildDomainCallback` and `unregisterChildDomainCallback` to `null`. If callbacks are nulled before iterating, `unregisterChildDomain()` will no-op and forwarding handlers will leak in the parent mediator.
- [x] 22.2.7 Add a `private readonly childDomainIds: Set<string> = new Set()` field on `ChildMfeBridgeImpl` to track which child domains have been registered via `registerChildDomain()`. The `registerChildDomain()` method adds to this set; `unregisterChildDomain()` removes from it. The set is used by `cleanup()` (see 22.2.6) to ensure all forwarding handlers are removed from the parent mediator when the bridge is disposed.

**Traceability**: [MFE API - Cross-Runtime Action Chain Routing](./design/mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition). Requirement "Hierarchical Composition" -- concrete-only wiring methods for cross-runtime domain registration.

### 22.3 Wire cross-runtime callbacks in createBridge()

**Goal**: Update `createBridge()` in `bridge-factory.ts` to wire the child domain forwarding callbacks using `ChildDomainForwardingHandler` and the parent mediator. **Note:** Phase 22.7 subsequently refactored `bridge-factory.ts` into class-based `DefaultRuntimeBridgeFactory`.

- [x] 22.3.1 Update `createBridge()` signature to accept additional parameters: `registerDomainActionHandler: (domainId: string, handler: ActionHandler) => void` and `unregisterDomainActionHandler: (domainId: string) => void` callbacks.
- [x] 22.3.2 In `createBridge()`, create the register callback: `(domainId) => { const handler = new ChildDomainForwardingHandler(parentBridgeImpl, domainId); registerDomainActionHandler(domainId, handler); }`.
- [x] 22.3.3 In `createBridge()`, create the unregister callback: `(domainId) => { unregisterDomainActionHandler(domainId); }`.
- [x] 22.3.4 Call `childBridge.setChildDomainCallbacks(registerCb, unregisterCb)` in `createBridge()`.
- [x] 22.3.5 Extend `DefaultMountManager`'s constructor config to include `registerDomainActionHandler: (domainId: string, handler: ActionHandler) => void` and `unregisterDomainActionHandler: (domainId: string) => void` callback fields. These are required for the mount manager to pass to `createBridge()`.
- [x] 22.3.6 Update `DefaultScreensetsRegistry`'s constructor to pass its own `registerDomainActionHandler` and `unregisterDomainActionHandler` methods (bound to `this`) when constructing the `DefaultMountManager` instance, so the mount manager can forward them to `createBridge()`.
- [x] 22.3.7 Update `DefaultMountManager.mountExtension()` to pass the `registerDomainActionHandler` and `unregisterDomainActionHandler` callbacks from its config to `createBridge()`.

**Traceability**: [MFE API - Cross-Runtime Action Chain Routing](./design/mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition). Requirement "Hierarchical Composition" -- bridge factory wiring for cross-runtime forwarding.

### 22.4 Tests

**Test file**: `packages/screensets/__tests__/mfe/bridge/cross-runtime-routing.test.ts`

- [x] 22.4.1 Test `ChildDomainForwardingHandler.handleAction()` wraps action in `ActionsChain` and calls `parentBridgeImpl.sendActionsChain()`. When `sendActionsChain()` returns `{ completed: true }`, `handleAction()` resolves. When `sendActionsChain()` returns `{ completed: false, error: 'some error' }`, `handleAction()` rejects with `Error('some error')`. When `sendActionsChain()` returns `{ completed: false }` (no error field), `handleAction()` rejects with `Error('Chain execution failed in child domain')`.
- [x] 22.4.2 Test `ChildMfeBridgeImpl.registerChildDomain()` calls the injected callback and adds domainId to tracked set.
- [x] 22.4.3 Test `ChildMfeBridgeImpl.unregisterChildDomain()` calls the injected callback and removes domainId from tracked set.
- [x] 22.4.4 Test `ChildMfeBridgeImpl.registerChildDomain()` throws `Error('registerChildDomain callback not wired')` when callbacks are not wired.
- [x] 22.4.5 Test `ChildMfeBridgeImpl.cleanup()` unregisters all tracked child domains before nulling callbacks. Verify ordering: the unregister callback MUST be invoked for each tracked domain, and THEN callbacks are set to null. Verify that calling `registerChildDomain()` after cleanup throws (callback is null).
- [x] 22.4.6 Test end-to-end: parent mediator routes an action targeting a child domain through `ChildDomainForwardingHandler` -> bridge transport -> child registry's `executeActionsChain()`. Verify the child's domain handler receives the action.
- [x] 22.4.7 Test cleanup: after child MFE unmount, the parent's mediator no longer has a handler for the child domain ID.
- [x] 22.4.8 Test that actions targeting the parent's own domains are NOT affected by cross-runtime wiring (parent domain handlers still work as before).

**Traceability**: [MFE API - Cross-Runtime Action Chain Routing](./design/mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition). Requirement "Hierarchical Composition" -- cross-runtime routing verification.

### 22.5 Validation

- [x] 22.5.1 Run `npm run type-check` -- must pass with no errors.
- [x] 22.5.2 Run `npm run test` -- all existing tests must pass plus new tests.
- [x] 22.5.3 Run `npm run build` -- must pass.
- [x] 22.5.4 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 22.5.5 Verify `ChildDomainForwardingHandler` is NOT present in `@hai3/screensets` public type declarations (`.d.ts` output).
- [x] 22.5.6 Verify `registerChildDomain` and `unregisterChildDomain` are NOT present on the public `ChildMfeBridge` interface in `.d.ts` output.

**Traceability**: Cross-runtime routing validation -- correct public surface, no regressions.

### 22.6 Fix MfeEntryLifecycle Generic Default

**Goal**: Change the default generic parameter of `MfeEntryLifecycle` from `ParentMfeBridge` to `ChildMfeBridge` in the implementation. All MFE implementations receive a `ChildMfeBridge`, so the default should reflect the consumer-facing type.

- [x] 22.6.1 In `packages/screensets/src/mfe/handler/types.ts`, change `MfeEntryLifecycle<TBridge = ParentMfeBridge>` to `MfeEntryLifecycle<TBridge = ChildMfeBridge>`. Ensure `ChildMfeBridge` is imported.
- [x] 22.6.2 Run `npm run type-check` -- must pass with no errors (existing usages should be unaffected since they either specify `TBridge` explicitly or already pass `ChildMfeBridge`).
- [x] 22.6.3 Run `npm run test` -- all existing tests must pass.

**Traceability**: Proposal "Framework-Agnostic Lifecycle Interface" table (TBridge defaults to ChildMfeBridge). Design [MFE API - MfeEntryLifecycle Interface](./design/mfe-api.md#mfeentrylifecycle-interface). Screensets spec "MfeEntryLifecycle interface definition" scenario.

---

## Phase 22.7: Class-Based RuntimeBridgeFactory (Replace Standalone bridge-factory.ts Functions)

**Goal**: Convert the standalone `createBridge()` and `disposeBridge()` functions in `bridge-factory.ts` into the abstract + concrete class pattern (`RuntimeBridgeFactory` / `DefaultRuntimeBridgeFactory`). Replace the dynamic `await import('./bridge-factory')` calls in `DefaultMountManager` with constructor-injected `RuntimeBridgeFactory` dependency. Delete the old `bridge-factory.ts` file.

**Prerequisite**: Phase 22 complete. This phase is a structural refactoring -- no new features, no behavioral changes. All 390/390 screensets + 19/19 react tests must continue to pass.

**Architectural Reference**: [Registry Runtime - Runtime Bridge Factory (Class-Based)](./design/registry-runtime.md#runtime-bridge-factory-class-based), [Registry Runtime - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction)

**Motivation**: `bridge-factory.ts` exports two standalone functions (`createBridge()` and `disposeBridge()`). This violates the project's core rule: "EVERY component MUST be a class." All other collaborators (`ExtensionManager`, `LifecycleManager`, `MountManager`, `ActionsChainsMediator`, `RuntimeCoordinator`, etc.) follow the abstract + concrete pattern. The runtime bridge factory must be aligned.

### 22.7.1 Create RuntimeBridgeFactory Abstract Class

- [x] 22.7.1.1 Create `packages/screensets/src/mfe/runtime/runtime-bridge-factory.ts` containing the abstract `RuntimeBridgeFactory` class with two abstract methods: `createBridge(domainState, extensionId, entryTypeId, executeActionsChain, registerDomainActionHandler, unregisterDomainActionHandler)` returning `{ parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge }`, and `disposeBridge(domainState, parentBridge)` returning `void`. The class is `@internal` -- NOT exported from the `@hai3/screensets` public barrel. Import types only (no concrete bridge imports): `ParentMfeBridge`, `ChildMfeBridge` from `../handler/types`, `ExtensionDomainState` from `./extension-manager`, `ActionsChain` from `../types`, `ChainResult`, `ChainExecutionOptions`, `ActionHandler` from `../mediator/types`.
- [x] 22.7.1.2 Add TSDoc `@packageDocumentation` and `@internal` annotations. Document the distinction from handler's `MfeBridgeFactory` in the class-level JSDoc.

**Traceability**: [Design - Runtime Bridge Factory](./design/registry-runtime.md#runtime-bridge-factory-class-based). Requirement "Abstract Class Layers" -- every stateful component follows abstract + concrete pattern.

### 22.7.2 Create DefaultRuntimeBridgeFactory Concrete Class

- [x] 22.7.2.1 Create `packages/screensets/src/mfe/runtime/default-runtime-bridge-factory.ts` containing the concrete `DefaultRuntimeBridgeFactory` class extending `RuntimeBridgeFactory`. Move the full implementation of `createBridge()` from the standalone function in `bridge-factory.ts` into the `createBridge()` method. Move the full implementation of `disposeBridge()` from the standalone function into the `disposeBridge()` method. All imports from the old `bridge-factory.ts` (`ChildMfeBridgeImpl`, `ParentMfeBridgeImpl`, `ChildDomainForwardingHandler`, `SharedProperty`) move to this file.
- [x] 22.7.2.2 Add `@internal` annotation to the class. The class is NOT exported from the barrel.
- [x] 22.7.2.3 Verify the `createBridge()` method return type is `{ parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge }` (narrow public interface, same as current standalone function).
- [x] 22.7.2.4 Verify the `disposeBridge()` method parameter type for `parentBridge` stays `ParentMfeBridge` (public interface). The internal cast to `ParentMfeBridgeImpl` is kept inside the method body (same as current standalone function).

**Traceability**: [Design - Runtime Bridge Factory](./design/registry-runtime.md#runtime-bridge-factory-class-based). Requirement "Abstract Class Layers" -- concrete class is `@internal`, not exported.

### 22.7.3 Inject RuntimeBridgeFactory into DefaultMountManager

- [x] 22.7.3.1 Add a `bridgeFactory: RuntimeBridgeFactory` field to `DefaultMountManager`'s constructor config type in `packages/screensets/src/mfe/runtime/default-mount-manager.ts`. Store it as a `private readonly bridgeFactory: RuntimeBridgeFactory` field on the class.
- [x] 22.7.3.2 Replace the dynamic import in `mountExtension()`: change `const bridgeFactory = await import('./bridge-factory'); const { parentBridge, childBridge } = bridgeFactory.createBridge(...)` to `const { parentBridge, childBridge } = this.bridgeFactory.createBridge(...)`. Remove the `await import('./bridge-factory')` call entirely.
- [x] 22.7.3.3 Replace the dynamic import in `unmountExtension()`: change `const bridgeFactory = await import('./bridge-factory'); bridgeFactory.disposeBridge(...)` to `this.bridgeFactory.disposeBridge(...)`. Remove the `await import('./bridge-factory')` call entirely.
- [x] 22.7.3.4 Add `import { RuntimeBridgeFactory } from './runtime-bridge-factory';` to `default-mount-manager.ts`. Remove the old dynamic import of `./bridge-factory`.

**Traceability**: [Design - Runtime Bridge Factory](./design/registry-runtime.md#runtime-bridge-factory-class-based). Constructor injection replaces dynamic import, making the dependency explicit and testable.

### 22.7.4 Wire RuntimeBridgeFactory in DefaultScreensetsRegistry

- [x] 22.7.4.1 In `DefaultScreensetsRegistry`'s constructor in `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`, construct `new DefaultRuntimeBridgeFactory()` and pass it to `DefaultMountManager`'s config as the `bridgeFactory` field. The `DefaultScreensetsRegistry` may store it as `private readonly bridgeFactory: RuntimeBridgeFactory` (abstract type) if other collaborators need it, or pass it directly to the mount manager constructor if no other collaborator needs it.
- [x] 22.7.4.2 Add `import { DefaultRuntimeBridgeFactory } from './default-runtime-bridge-factory';` and `import { RuntimeBridgeFactory } from './runtime-bridge-factory';` to `DefaultScreensetsRegistry.ts`.
- [x] 22.7.4.3 Update or remove the stale comment at line ~370 in `DefaultScreensetsRegistry.ts` that references `bridge-factory.ts`.

**Traceability**: [Design - Runtime Bridge Factory](./design/registry-runtime.md#runtime-bridge-factory-class-based). `DefaultScreensetsRegistry` is the ONLY code that imports the concrete `DefaultRuntimeBridgeFactory`.

### 22.7.5 Delete bridge-factory.ts

- [x] 22.7.5.1 Delete `packages/screensets/src/mfe/runtime/bridge-factory.ts` entirely. All functionality has been moved to `DefaultRuntimeBridgeFactory`.
- [x] 22.7.5.2 Search the entire codebase for `import.*bridge-factory` and `from.*bridge-factory` to verify no remaining imports of the deleted file.

**Traceability**: Old standalone function file is replaced by class-based pattern. No references should remain.

### 22.7.6 Update Test Files

- [x] 22.7.6.1 Update `packages/screensets/__tests__/mfe/runtime/bridge-factory.test.ts`: rename to `runtime-bridge-factory.test.ts`. Update imports from `bridge-factory` to import `DefaultRuntimeBridgeFactory` from the concrete file path. Update test setup to instantiate `new DefaultRuntimeBridgeFactory()` and call methods on the instance instead of calling standalone functions. All existing test assertions should apply to the class methods with no behavioral changes.
- [x] 22.7.6.2 Update any other test files that import from `bridge-factory.ts` to import from the new file paths. Search test files for `bridge-factory` to find all references.
- [x] 22.7.6.3 Verify that `DefaultMountManager` integration tests still pass -- the mount manager now receives `RuntimeBridgeFactory` via constructor injection instead of using dynamic import. Test files that construct `DefaultMountManager` directly must include `bridgeFactory: new DefaultRuntimeBridgeFactory()` in the config.

**Traceability**: Test compatibility with class-based pattern. All existing test assertions remain valid -- this is a structural refactoring.

### 22.7.7 Update Abstract MountManager Type

- [x] 22.7.7.1 Verify that the abstract `MountManager` class in `packages/screensets/src/mfe/runtime/mount-manager.ts` does NOT reference `RuntimeBridgeFactory` in its abstract method signatures. The bridge factory is an implementation detail of `DefaultMountManager`, not part of the public abstract contract. The abstract `MountManager` defines `mountExtension(extensionId, container)` and `unmountExtension(extensionId)` -- how bridges are created/disposed is the concrete class's responsibility.

**Traceability**: [Design - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction). Abstract class is pure contract; bridge factory is implementation detail.

### 22.7.8 Validation

- [x] 22.7.8.1 Run `npm run type-check` -- must pass with no errors.
- [x] 22.7.8.2 Run `npm run test` -- all 390/390 screensets + 19/19 react tests must pass with no behavioral changes.
- [x] 22.7.8.3 Run `npm run build` -- must pass.
- [x] 22.7.8.4 Run `npm run lint` -- must pass (no ESLint rule changes required).
- [x] 22.7.8.5 Verify `bridge-factory.ts` does not exist in the built output.
- [x] 22.7.8.6 Verify `RuntimeBridgeFactory` and `DefaultRuntimeBridgeFactory` are NOT present in `@hai3/screensets` public type declarations (`.d.ts` output) -- they are `@internal`.
- [x] 22.7.8.7 Verify no remaining `await import('./bridge-factory')` calls exist in any source file.
- [x] 22.7.8.8 Verify no remaining `createBridge` or `disposeBridge` standalone function exports exist (only class methods).

**Traceability**: Class-based bridge factory validation -- no regressions, no public API surface changes, old standalone functions fully eliminated.
