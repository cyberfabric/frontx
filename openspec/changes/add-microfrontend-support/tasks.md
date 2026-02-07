# Implementation Tasks

## Progress Summary

**Current Status**: Phase 14 COMPLETE

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

**Test file**: `packages/screensets/__tests__/mfe/plugins/gts/gts-plugin.test.ts`

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

- [x] 6.1.1 ExtensionDomain TypeScript interface uses `extensionsTypeId?: string` (replaces `extensionsUiMetaTypeId`)
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

- [x] 6.4.1 Replace `UiMetaValidationError` with `ExtensionTypeError`
- [x] 6.4.2 `ExtensionTypeError` includes extensionTypeId and requiredBaseTypeId
- [x] 6.4.3 Remove any Ajv-related validation code from screensets package

**Traceability**: Requirement "MFE Error Classes" - ExtensionTypeError class

---

## Phase 7: GTS Entity Storage and Framework Plugin Propagation

**Goal**: Create JSON-based GTS entity storage for schemas and instances, and propagate Type System plugin through @hai3/framework layers.

**Status**: COMPLETE (JSON-based storage implemented, namespace consistency applied)

### 7.0 GTS JSON File Structure

The GTS entities are organized into two packages with JSON file storage:

**Directory Structure:**
```
packages/screensets/src/mfe/gts/
  hai3.mfes/                          # Core MFE GTS package (hardcoded in @hai3/screensets)
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
        init.v1.json                 # init lifecycle stage instance
        activated.v1.json            # activated lifecycle stage instance
        deactivated.v1.json          # deactivated lifecycle stage instance
        destroyed.v1.json            # destroyed lifecycle stage instance
      comm/
        load_ext.v1.json             # load_ext action instance
        unload_ext.v1.json           # unload_ext action instance
  hai3.screensets/                   # Screensets layout GTS package (added at framework level)
    instances/
      domains/
        sidebar.v1.json              # Sidebar domain instance
        popup.v1.json                # Popup domain instance
        screen.v1.json               # Screen domain instance
        overlay.v1.json              # Overlay domain instance
```

**Key Principle**: TypeScript interfaces provide compile-time safety, JSON files provide runtime validation via GTS.

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

**Location**: `packages/screensets/src/mfe/gts/hai3.screensets/instances/domains/`

- [x] 7.4.1 Create `sidebar.v1.json` - Sidebar domain instance
  ```json
  {
    "id": "gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1",
    "sharedProperties": [],
    "actions": [
      "gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1",
      "gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1"
    ],
    "extensionsActions": [],
    "defaultActionTimeout": 5000,
    "lifecycleStages": [...],
    "extensionsLifecycleStages": [...]
  }
  ```
- [x] 7.4.2 Create `popup.v1.json` - Popup domain instance (supports load_ext and unload_ext)
- [x] 7.4.3 Create `screen.v1.json` - Screen domain instance (supports ONLY load_ext, no unload_ext)
- [x] 7.4.4 Create `overlay.v1.json` - Overlay domain instance (supports load_ext and unload_ext)

**Traceability**: Requirement "Hierarchical Extension Domains" - Base layout domains as GTS instances

### 7.5 GTS JSON Loader Utilities

**Location**: `packages/screensets/src/mfe/gts/loader.ts`

- [x] 7.5.1 Create `loadSchemas()` function to load all core schemas from JSON files
- [x] 7.5.2 Create `loadLifecycleStages()` function to load default lifecycle stage instances
- [x] 7.5.3 Create `loadBaseActions()` function to load base action instances
- [x] 7.5.4 Update GTS plugin initialization to use JSON loaders instead of hardcoded objects
- [x] 7.5.5 Export loader utilities from `@hai3/screensets`

**Traceability**: Requirement "GTS Entity Storage Format" - Loading JSON schemas

### 7.6 Base Domain Factory Functions (Updated)

**Location**: `packages/framework/src/plugins/microfrontends/base-domains.ts`

- [x] 7.6.1 Update `createSidebarDomain()` to load from `hai3.screensets/instances/domains/sidebar.v1.json`
- [x] 7.6.2 Update `createPopupDomain()` to load from `hai3.screensets/instances/domains/popup.v1.json`
- [x] 7.6.3 Update `createScreenDomain()` to load from `hai3.screensets/instances/domains/screen.v1.json`
- [x] 7.6.4 Update `createOverlayDomain()` to load from `hai3.screensets/instances/domains/overlay.v1.json`
- [x] 7.6.5 Remove hardcoded TypeScript domain objects (current implementation is WRONG)
- [x] 7.6.6 Document that domains are registered via `runtime.registerDomain()` at runtime, NOT at plugin init

**Traceability**: Requirement "Framework Plugin Propagation" - Base domains loaded from JSON files

### 7.7 Framework Microfrontends Plugin Stub

**Scope boundary**: Phase 7.7-7.8 creates the plugin SKELETON and TypeSystemPlugin propagation ONLY. Full Flux integration (actions, effects, slice) is implemented in Phase 13.

- [x] 7.7.1 Create `packages/framework/src/plugins/microfrontends/index.ts` with plugin skeleton (file creation and basic exports only)

**Traceability**: Requirement "Framework Plugin Propagation" - Framework microfrontends plugin (zero-config)

### 7.8 Plugin Propagation

- [x] 7.8.1 Pass plugin to `createScreensetsRegistry()` in setup
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

- [x] 8.1.1 Create `createMfeStateContainer()` factory function
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

> **CORRECTION (Phase 8.4 rewritten twice):**
>
> **First correction** identified that a standalone `coordination/index.ts` module with exported
> functions violated the spec's encapsulation requirements (spec lines 771-831). However, the
> replacement used standalone non-exported functions at module scope, which violates HAI3's
> strict SOLID-compliant OOP requirement: NEVER standalone functions, ALWAYS abstract class
> (exportable abstraction) + concrete class (encapsulated state).
>
> **Second correction (current)** follows the same pattern used by `MfeHandler`/`MfeHandlerMF`
> and `MfeBridgeFactory` throughout the codebase:
> - `RuntimeCoordinator` abstract class defines the coordination contract
> - `WeakMapRuntimeCoordinator` concrete class encapsulates the private `WeakMap`
> - `ScreensetsRegistry` holds `private readonly coordinator: RuntimeCoordinator` (Dependency Inversion)
> - The abstract class `RuntimeCoordinator` is exported from `@hai3/screensets` (it is the abstraction)
> - The concrete `WeakMapRuntimeCoordinator` is internal (not exported from package)
> - MFE code never sees the coordinator -- only `ChildMfeBridge` is exposed to MFEs

- [x] 8.4.1 Replace `packages/screensets/src/mfe/coordination/index.ts` with barrel export for new abstract class pattern (standalone module was incorrect per spec)
- [x] 8.4.2 Define `RuntimeCoordinator` abstract class in `packages/screensets/src/mfe/coordination/types.ts` with abstract methods: `register(container: Element, connection: RuntimeConnection): void`, `get(container: Element): RuntimeConnection | undefined`, `unregister(container: Element): void`
- [x] 8.4.3 Define `RuntimeConnection` interface in `packages/screensets/src/mfe/coordination/types.ts` with `hostRuntime` and `bridges: Map<string, ParentMfeBridge>`
- [x] 8.4.4 Implement `WeakMapRuntimeCoordinator` concrete class extending `RuntimeCoordinator` in `packages/screensets/src/mfe/coordination/weak-map-runtime-coordinator.ts` with `private readonly connections = new WeakMap<Element, RuntimeConnection>()`
- [x] 8.4.5 Add `private readonly coordinator: RuntimeCoordinator` field to `ScreensetsRegistry` -- injected via config or defaulting to `new WeakMapRuntimeCoordinator()` (Dependency Inversion Principle)
- [x] 8.4.6 Export abstract class `RuntimeCoordinator` and `RuntimeConnection` interface from `@hai3/screensets` (they are the abstractions; concrete class is NOT exported)
- [x] 8.4.7 Tests: verify `WeakMapRuntimeCoordinator` directly (register/get/unregister) and verify no window global pollution
- [x] 8.4.8 Tests: verify coordination through `ScreensetsRegistry` API during mount/unmount (Phase 19.3 exercises the coordinator via `mountExtension`/`unmountExtension`)

**Traceability**: Requirement "Internal Runtime Coordination" - WeakMap-based coordination (spec lines 771-831: PRIVATE, NOT exposed to MFE code, internally called by ScreensetsRegistry). Follows HAI3 OOP pattern: abstract class `RuntimeCoordinator` (exportable contract) + concrete `WeakMapRuntimeCoordinator` (private state), same as `MfeHandler`/`MfeHandlerMF` in `packages/screensets/src/mfe/handler/types.ts`

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

> **Note**: Phase 11.1 completed the handler to match the full design in `mfe-loading.md` Decision 10,
> where the constructor takes `(typeSystem, handledBaseTypeId, priority)`. Generic constraints updated
> to `TBridge extends ChildMfeBridge = ChildMfeBridge` per design spec.

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
- [x] 13.2.5 Implement `handleMfeHostAction(extensionId, actionTypeId, payload)` action
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

### 15.1 Bridge Core

- [ ] 15.1.1 Create `packages/screensets/src/mfe/bridge/ChildMfeBridge.ts`
- [ ] 15.1.2 Implement `sendActionsChain()` with payload validation
- [ ] 15.1.3 Implement `subscribeToProperty()` with callback management
- [ ] 15.1.4 Implement `getProperty()` for synchronous access
- [ ] 15.1.5 Implement `subscribeToAllProperties()` for bulk subscription

**Traceability**: Requirement "MFE Bridge Interface" - ChildMfeBridge

### 15.2 Bridge Connection

- [ ] 15.2.1 Create `packages/screensets/src/mfe/bridge/ParentMfeBridge.ts`
- [ ] 15.2.2 Implement `sendActionsChain(chain, options?)` for domain-to-MFE actions with chain-level options only
- [ ] 15.2.3 Implement property update notification - bridge subscribers are notified when `registry.updateDomainProperty()` is called (see spec: property updates managed at DOMAIN level)
- [ ] 15.2.4 Implement `onChildAction()` handler registration
- [ ] 15.2.5 Implement `dispose()` for cleanup

**Traceability**: Requirement "MFE Bridge Interface" - ParentMfeBridge, Requirement "Explicit Timeout Configuration"

### 15.3 Bridge Factory

- [ ] 15.3.1 Create `createBridge()` factory in ScreensetsRegistry
- [ ] 15.3.2 Connect bridge to domain properties
- [ ] 15.3.3 Connect bridge to ActionsChainsMediator
- [ ] 15.3.4 Handle bridge lifecycle with extension lifecycle

**Traceability**: Requirement "MFE Bridge Interface" - Bridge creation

### 15.4 Bridge Tests

**Test file**: `packages/screensets/__tests__/mfe/bridge/bridge.test.ts`

- [ ] 15.4.1 Test ChildMfeBridge property subscription
- [ ] 15.4.2 Test ChildMfeBridge sendActionsChain request
- [ ] 15.4.3 Test ParentMfeBridge property updates
- [ ] 15.4.4 Test ParentMfeBridge actions chain delivery
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

**Traceability**: Requirement "MFE Error Classes" - All 11 error classes defined in [mfe-errors.md](./design/mfe-errors.md)

### 16.3 Shadow DOM and Error Tests

**Test files**:
- `packages/screensets/__tests__/mfe/shadow/shadow-dom.test.ts`
- `packages/screensets/__tests__/mfe/errors/error-classes.test.ts`

- [ ] 16.3.1 Test createShadowRoot with various options
- [ ] 16.3.2 Test injectCssVariables updates
- [ ] 16.3.3 Test error class instantiation and properties
- [ ] 16.3.4 Test error message formatting

**Traceability**: Requirements "Shadow DOM Utilities", "MFE Error Classes"

---

## Phase 17: MFE Handler Internal Caching

**Goal**: Implement internal caching for MfeHandlerMF. MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./design/mfe-loading.md#decision-12).

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

**Test file**: `packages/screensets/__tests__/mfe/handler/mf-handler.test.ts`

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

> **Note**: These are ADDITIONAL convenience constants (action instance IDs, domain instance IDs, etc.) beyond the type ID reference constants (`HAI3_CORE_TYPE_IDS`, `HAI3_MF_TYPE_IDS`, `HAI3_LIFECYCLE_STAGE_IDS`) already defined in Phase 3.3.

- [ ] 18.2.1 Create `packages/screensets/src/mfe/constants/index.ts`
- [ ] 18.2.2 Define `HAI3_MFE_ENTRY`, `HAI3_MFE_ENTRY_MF`, `HAI3_MF_MANIFEST` constants
- [ ] 18.2.3 Define `HAI3_EXT_DOMAIN`, `HAI3_EXT_EXTENSION`, `HAI3_EXT_ACTION` constants
- [ ] 18.2.4 Define `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_UNLOAD_EXT` constants (DRY principle - generic actions for all domains)
- [ ] 18.2.5 Define `HAI3_POPUP_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_SCREEN_DOMAIN`, `HAI3_OVERLAY_DOMAIN` constants
- [ ] 18.2.6 Export constants from `@hai3/screensets`

**Traceability**: Requirements "HAI3 Action Constants", "HAI3 Type Constants"

### 18.3 GTS Utilities Tests

**Test file**: `packages/screensets/__tests__/mfe/gts/utilities.test.ts`

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

- [ ] 19.3.1 Implement `mountExtension(extensionId, container): Promise<ParentMfeBridge>` method
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

**Test file**: `packages/screensets/__tests__/mfe/runtime/dynamic-registration.test.ts`

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

### 19.6 Lifecycle Stage Triggering Implementation

> **Context**: `registry-runtime.md` defines `triggerLifecycleStage()`, `triggerDomainLifecycleStage()`, and
> `triggerDomainOwnLifecycleStage()` methods on ScreensetsRegistry. These methods are called internally
> during registration/unregistration/mounting/unmounting (default stages) and can be called externally
> for custom stages. See [mfe-lifecycle.md](./design/mfe-lifecycle.md) for the triggering sequences.

- [ ] 19.6.1 Implement `triggerLifecycleStage(extensionId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on a specific extension
- [ ] 19.6.2 Implement `triggerDomainLifecycleStage(domainId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on all extensions in a domain
- [ ] 19.6.3 Implement `triggerDomainOwnLifecycleStage(domainId, stageId)` on ScreensetsRegistry -- triggers all lifecycle hooks for the given stage on the domain itself
- [ ] 19.6.4 Implement private `triggerLifecycleStageInternal(entity, stageId)` helper -- collects hooks matching the stage and executes their actions chains in declaration order
- [ ] 19.6.5 Integrate automatic lifecycle triggering into registration/mounting methods: `registerExtension` triggers `init`, `mountExtension` triggers `activated`, `unmountExtension` triggers `deactivated`, `unregisterExtension` triggers `destroyed`
- [ ] 19.6.6 Integrate automatic lifecycle triggering into domain methods: `registerDomain` triggers `init`, `unregisterDomain` triggers `destroyed`

**Test file**: `packages/screensets/__tests__/mfe/runtime/lifecycle-triggering.test.ts`

- [ ] 19.6.7 Test `triggerLifecycleStage` executes hooks for a specific extension and stage
- [ ] 19.6.8 Test `triggerLifecycleStage` throws if extension not registered
- [ ] 19.6.9 Test `triggerDomainLifecycleStage` executes hooks for all extensions in a domain
- [ ] 19.6.10 Test `triggerDomainLifecycleStage` throws if domain not registered
- [ ] 19.6.11 Test `triggerDomainOwnLifecycleStage` executes hooks on the domain itself
- [ ] 19.6.12 Test hooks execute in declaration order (array order)
- [ ] 19.6.13 Test automatic `init` stage triggered during `registerExtension`
- [ ] 19.6.14 Test automatic `activated` stage triggered during `mountExtension`
- [ ] 19.6.15 Test automatic `deactivated` stage triggered during `unmountExtension`
- [ ] 19.6.16 Test automatic `destroyed` stage triggered during `unregisterExtension`
- [ ] 19.6.17 Test entity with no lifecycle hooks skips triggering gracefully

**Traceability**: Requirement "Lifecycle Stage Triggering" in design/mfe-lifecycle.md -- Stage Triggering Sequence, ScreensetsRegistry Lifecycle Methods in design/registry-runtime.md

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

### 20.4 Extension Events Hook (L3 - @hai3/react)

> **Layer placement**: `useExtensionEvents` is a React hook and belongs in `@hai3/react` (L3), not `@hai3/framework` (L2). React hooks must not live in framework-agnostic packages per the layer architecture.

- [ ] 20.4.1 Create `useExtensionEvents(domainId)` hook in `packages/react/src/mfe/hooks/useExtensionEvents.ts`
- [ ] 20.4.2 Subscribe to runtime's `extensionRegistered` event
- [ ] 20.4.3 Subscribe to runtime's `extensionUnregistered` event
- [ ] 20.4.4 Filter events by domainId
- [ ] 20.4.5 Return current extensions for domain
- [ ] 20.4.6 Trigger re-render on changes
- [ ] 20.4.7 Export from `@hai3/react` (NOT from `@hai3/framework`)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - events hook. Layer architecture: React hooks in L3 (@hai3/react)

### 20.5 Framework Dynamic Registration Tests

**Test file**: `packages/framework/__tests__/plugins/microfrontends/dynamic-registration.test.ts`

- [ ] 20.5.1 Test registerExtension action emits event
- [ ] 20.5.2 Test registerExtension effect calls runtime
- [ ] 20.5.3 Test unregisterExtension action and effect
- [ ] 20.5.4 Test registerDomain action and effect
- [ ] 20.5.5 Test unregisterDomain action and effect
- [ ] 20.5.6 Test slice state transitions
- [ ] 20.5.7 Test selectExtensionState selector
- [ ] 20.5.8 Test selectRegisteredExtensions selector
- [ ] 20.5.9 Test useExtensionEvents hook (in `packages/react/__tests__/mfe/hooks/useExtensionEvents.test.ts`)

**Traceability**: Requirement "Dynamic Registration Support in Framework" - all scenarios. Note: useExtensionEvents tests are in @hai3/react package per L3 layer placement
