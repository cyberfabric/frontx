# Implementation Tasks

## Progress Summary

**Current Status**: Planning - Not Started

---

## Phase 1: Type System Plugin Infrastructure

**Goal**: Define the TypeSystemPlugin interface and supporting types.

### 1.1 Define Plugin Interface

- [ ] 1.1.1 Create `TypeSystemPlugin<TTypeId>` interface in `packages/screensets/src/mfe/plugins/types.ts`
- [ ] 1.1.2 Define `ParsedTypeId` interface for parsed type ID components
- [ ] 1.1.3 Define `TypeIdOptions` interface for building type IDs
- [ ] 1.1.4 Define `ValidationResult` and `ValidationError` interfaces
- [ ] 1.1.5 Define `CompatibilityResult` and `CompatibilityChange` interfaces (optional method support)
- [ ] 1.1.6 Export plugin interface from `@hai3/screensets`

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

### 1.2 Define Plugin Supporting Types

- [ ] 1.2.1 Define type ID operation method signatures (`parseTypeId`, `isValidTypeId`, `buildTypeId`)
- [ ] 1.2.2 Define schema registry method signatures (`registerSchema`, `validateInstance`, `getSchema`, `hasSchema`)
- [ ] 1.2.3 Define query method signatures (`query`, `listAll`)
- [ ] 1.2.4 Define optional compatibility method signature (`checkCompatibility?`)

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin interface definition

### 1.3 Define GtsMetadata Interface and Utilities

- [ ] 1.3.1 Create `GtsMetadata` interface in `packages/screensets/src/mfe/types/metadata.ts`
- [ ] 1.3.2 Define `typeId`, `vendor`, `package`, `namespace`, `type`, `version` properties
- [ ] 1.3.3 Implement `parseGtsTypeId(typeId: string): GtsMetadata` utility function
- [ ] 1.3.4 Implement `hydrateWithMetadata<T>(typeId, data): T` utility function
- [ ] 1.3.5 Add validation for GTS type ID format: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`
- [ ] 1.3.6 Export metadata utilities from `@hai3/screensets`

**Traceability**: Requirement "Type System Plugin Abstraction" - GtsMetadata extraction from type ID

---

## Phase 2: GTS Plugin Implementation

**Goal**: Implement the GTS plugin as the default Type System implementation.

### 2.1 Create GTS Plugin

- [ ] 2.1.1 Create `packages/screensets/src/mfe/plugins/gts/index.ts`
- [ ] 2.1.2 Implement `parseTypeId()` to parse format `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`
- [ ] 2.1.3 Implement `isValidTypeId()` to validate GTS type ID format
- [ ] 2.1.4 Implement `buildTypeId()` to construct GTS type IDs
- [ ] 2.1.5 Implement `registerSchema()` using `GtsStore.register()`
- [ ] 2.1.6 Implement `validateInstance()` using `GtsStore.validate()`
- [ ] 2.1.7 Implement `getSchema()` and `hasSchema()` using `GtsStore`
- [ ] 2.1.8 Implement `query()` using `GtsQuery.search()`
- [ ] 2.1.9 Implement `listAll()` using `GtsStore.listAll()`
- [ ] 2.1.10 Implement `checkCompatibility()` using `Gts.checkCompatibility()`

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.2 Export GTS Plugin

- [ ] 2.2.1 Export `createGtsTypeSystem()` factory function
- [ ] 2.2.2 Export `gtsTypeSystem` singleton instance
- [ ] 2.2.3 Configure package.json exports for `@hai3/screensets/plugins/gts`
- [ ] 2.2.4 Add peer dependency on `@globaltypesystem/gts-ts`

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation

### 2.3 GTS Plugin Tests

- [ ] 2.3.1 Test `parseTypeId()` with valid GTS type IDs (e.g., `gts.hai3.screensets.mfe.definition.v1~`)
- [ ] 2.3.2 Test `isValidTypeId()` rejects invalid formats (missing segments, no tilde, no version prefix)
- [ ] 2.3.3 Test `buildTypeId()` creates correct GTS format
- [ ] 2.3.4 Test schema registration and validation
- [ ] 2.3.5 Test query operations
- [ ] 2.3.6 Test GtsMetadata extraction (vendor, package, namespace, type, version)

**Traceability**: Requirement "Type System Plugin Abstraction" - GTS plugin as default implementation, GTS type ID validation

---

## Phase 3: Internal TypeScript Types

**Goal**: Define internal TypeScript types for MFE architecture, all extending GtsMetadata.

### 3.1 Define MFE TypeScript Interfaces (extending GtsMetadata)

- [ ] 3.1.1 Create `MfeDefinition extends GtsMetadata` interface (name, url, entries)
- [ ] 3.1.2 Create `MfeEntry extends GtsMetadata` interface (path, requiredProperties, optionalProperties, actions, domainActions)
- [ ] 3.1.3 Create `ExtensionDomain extends GtsMetadata` interface (sharedProperties, actions, extensionsActions, uiMetadataContract)
- [ ] 3.1.4 Create `Extension extends GtsMetadata` interface (domain, entry, uiMetadata)
- [ ] 3.1.5 Create `SharedProperty extends GtsMetadata` interface (name, schema)
- [ ] 3.1.6 Create `Action extends GtsMetadata` interface (name, payloadSchema)
- [ ] 3.1.7 Create `ActionsChain extends GtsMetadata` interface (target, action, payload, next, fallback)
- [ ] 3.1.8 Export types from `packages/screensets/src/mfe/types/`

**Traceability**: Requirement "MFE TypeScript Type System" - GtsMetadata interface

### 3.2 Create GTS JSON Schemas with x-gts-ref

- [ ] 3.2.1 Create schema for `gts.hai3.screensets.mfe.definition.v1~` with `$id` and `x-gts-ref` for entries
- [ ] 3.2.2 Create schema for `gts.hai3.screensets.mfe.entry.v1~` with `x-gts-ref` for properties and actions
- [ ] 3.2.3 Create schema for `gts.hai3.screensets.ext.domain.v1~` with `x-gts-ref` for properties and actions
- [ ] 3.2.4 Create schema for `gts.hai3.screensets.ext.extension.v1~` with `x-gts-ref` for domain and entry
- [ ] 3.2.5 Create schema for `gts.hai3.screensets.ext.shared_property.v1~`
- [ ] 3.2.6 Create schema for `gts.hai3.screensets.ext.action.v1~`
- [ ] 3.2.7 Create schema for `gts.hai3.screensets.ext.actions_chain.v1~` with `$ref` for recursive next/fallback
- [ ] 3.2.8 Export schemas from `packages/screensets/src/mfe/schemas/gts-schemas.ts`

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type registration via plugin, x-gts-ref validation in schemas

### 3.3 HAI3 Type Registration

- [ ] 3.3.1 Define `HAI3_TYPE_IDS` constant with all 7 GTS type IDs
- [ ] 3.3.2 Implement `registerHai3Types(plugin)` function
- [ ] 3.3.3 Register all 7 schemas using `plugin.registerSchema()` with correct GTS type IDs
- [ ] 3.3.4 Return `HAI3_TYPE_IDS` for orchestrator use

**Traceability**: Requirement "Type System Plugin Abstraction" - HAI3 type registration via plugin

### 3.4 x-gts-ref Validation

- [ ] 3.4.1 Implement x-gts-ref reference validation logic
- [ ] 3.4.2 Validate referenced type IDs exist in registry
- [ ] 3.4.3 Support wildcard patterns (e.g., `gts.hai3.screensets.mfe.entry.v1~*`)
- [ ] 3.4.4 Add tests for x-gts-ref validation

**Traceability**: Requirement "Type System Plugin Abstraction" - x-gts-ref validation in schemas

## Phase 4: Orchestrator with Plugin

**Goal**: Implement the orchestrator with required Type System plugin injection.

### 4.1 Orchestrator Configuration

- [ ] 4.1.1 Create `ScreensetsOrchestratorConfig<TTypeId>` interface
- [ ] 4.1.2 Add required `typeSystem` parameter
- [ ] 4.1.3 Add optional `onError`, `loadingComponent`, `errorFallbackComponent`, `debug` parameters
- [ ] 4.1.4 Implement `createScreensetsOrchestrator<TTypeId>(config)` factory

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin injection at initialization

### 4.2 Orchestrator Core with Plugin

- [ ] 4.2.1 Create `MfeOrchestratorImpl<TTypeId>` class
- [ ] 4.2.2 Store plugin reference as `readonly typeSystem`
- [ ] 4.2.3 Call `registerHai3Types(plugin)` on initialization
- [ ] 4.2.4 Throw error if plugin is missing

**Traceability**: Requirement "Type System Plugin Abstraction" - Plugin injection at initialization

### 4.3 Type ID Validation via Plugin

- [ ] 4.3.1 Validate target type ID via `plugin.isValidTypeId()` before chain execution
- [ ] 4.3.2 Validate action type ID via `plugin.isValidTypeId()` before chain execution
- [ ] 4.3.3 Return validation error if type IDs are invalid

**Traceability**: Requirement "Actions Chain Orchestration" - Action chain type ID validation

### 4.4 Payload Validation via Plugin

- [ ] 4.4.1 Validate payload via `plugin.validateInstance()` before delivery
- [ ] 4.4.2 Use action's registered payloadSchema for validation
- [ ] 4.4.3 Return validation error details on failure

**Traceability**: Requirement "Actions Chain Orchestration" - Action payload validation via plugin

---

## Phase 5: Contract Matching Validation

**Goal**: Implement contract compatibility checking between entries and domains.

### 5.1 Contract Matching Algorithm

- [ ] 5.1.1 Implement `validateContract<TTypeId>(entry, domain)` function
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

## Phase 6: Framework Plugin Propagation

**Goal**: Propagate Type System plugin through @hai3/framework layers.

### 6.1 Framework Microfrontends Plugin

- [ ] 6.1.1 Create `MicrofrontendsPluginConfig<TTypeId>` interface
- [ ] 6.1.2 Add required `typeSystem` parameter
- [ ] 6.1.3 Add optional `baseDomains` parameter
- [ ] 6.1.4 Implement `createMicrofrontendsPlugin<TTypeId>(config)` factory

**Traceability**: Requirement "Framework Plugin Propagation" - Framework microfrontends plugin configuration

### 6.2 Base Domains Registration

- [ ] 6.2.1 Create `getBaseDomain<TTypeId>(name, plugin)` function
- [ ] 6.2.2 Build base domain type IDs via `plugin.buildTypeId()`
- [ ] 6.2.3 Register base domain schemas via `plugin.registerSchema()`
- [ ] 6.2.4 Implement sidebar, popup, screen, overlay base domains

**Traceability**: Requirement "Framework Plugin Propagation" - Base domains registration via plugin

### 6.3 Plugin Propagation

- [ ] 6.3.1 Pass plugin to `createScreensetsOrchestrator()` in setup
- [ ] 6.3.2 Expose orchestrator via `framework.provide('mfeOrchestrator', orchestrator)`
- [ ] 6.3.3 Ensure same plugin instance is used throughout

**Traceability**: Requirement "Framework Plugin Propagation" - Plugin consistency across layers

### 6.4 Framework Plugin Tests

- [ ] 6.4.1 Test plugin propagation from config to orchestrator
- [ ] 6.4.2 Test base domain registration with GTS plugin
- [ ] 6.4.3 Test orchestrator accessibility via framework

**Traceability**: Requirement "Framework Plugin Propagation" - all scenarios

---

## Phase 7: Isolated State Instances

**Goal**: Implement state isolation between host and MFE instances.

### 7.1 State Container Factory

- [ ] 7.1.1 Create `createMfeStateContainer()` factory function
- [ ] 7.1.2 Ensure each call creates independent store instance
- [ ] 7.1.3 Implement store disposal on MFE unmount
- [ ] 7.1.4 Add store isolation verification tests

**Traceability**: Requirement "Isolated State Instances" - MFE state isolation

### 7.2 Shared Properties Injection

- [ ] 7.2.1 Create `SharedPropertiesProvider` component
- [ ] 7.2.2 Implement read-only property injection via props
- [ ] 7.2.3 Implement property update propagation from host
- [ ] 7.2.4 Add tests for property isolation (no direct modification)

**Traceability**: Requirement "Isolated State Instances" - Shared properties injection

### 7.3 Host State Protection

- [ ] 7.3.1 Verify MFE cannot access host store directly
- [ ] 7.3.2 Implement boundary enforcement
- [ ] 7.3.3 Add integration tests for state isolation

**Traceability**: Requirement "Isolated State Instances" - Host state isolation

---

## Phase 8: Actions Chain Execution

**Goal**: Implement action chain execution logic.

### 8.1 Chain Execution Logic

- [ ] 8.1.1 Implement `execute(chain)` method
- [ ] 8.1.2 Implement target resolution (domain or entry)
- [ ] 8.1.3 Implement action validation against target contract
- [ ] 8.1.4 Implement success path (execute `next` chain)
- [ ] 8.1.5 Implement failure path (execute `fallback` chain)
- [ ] 8.1.6 Implement termination (no next/fallback)
- [ ] 8.1.7 Implement `ChainResult` return type

**Traceability**: Requirement "Actions Chain Orchestration" - success/failure/termination scenarios

### 8.2 Extension Registration

- [ ] 8.2.1 Implement `registerExtension()` method
- [ ] 8.2.2 Implement `unregisterExtension()` method
- [ ] 8.2.3 Handle pending actions on unregistration
- [ ] 8.2.4 Add registration/unregistration tests

**Traceability**: Requirement "Actions Chain Orchestration" - Extension registration/unregistration

### 8.3 Chain Execution Tests

- [ ] 8.3.1 Test action chain success path execution
- [ ] 8.3.2 Test action chain failure path execution
- [ ] 8.3.3 Test chain termination scenarios
- [ ] 8.3.4 Test type ID validation via plugin
- [ ] 8.3.5 Test payload validation via plugin
- [ ] 8.3.6 Test extension lifecycle (register/unregister)

**Traceability**: Requirement "Actions Chain Orchestration" - all scenarios

## Phase 9: Base Layout Domains

**Goal**: Define and implement HAI3's base extension domains via plugin.

### 9.1 Define Base Domain Contracts

- [ ] 9.1.1 Define sidebar domain: `gts.hai3.screensets.ext.domain.sidebar.v1~`
- [ ] 9.1.2 Define popup domain: `gts.hai3.screensets.ext.domain.popup.v1~`
- [ ] 9.1.3 Define screen domain: `gts.hai3.screensets.ext.domain.screen.v1~`
- [ ] 9.1.4 Define overlay domain: `gts.hai3.screensets.ext.domain.overlay.v1~`

**Traceability**: Requirement "Hierarchical Extension Domains" - Base layout domains

### 9.2 Implement Domain Registration

- [ ] 9.2.1 Create domain registry with GTS type IDs
- [ ] 9.2.2 Implement `registerDomain()` for vendor domains (e.g., `gts.acme.dashboard.ext.domain.widget_slot.v1~`)
- [ ] 9.2.3 Implement domain contract validation at registration
- [ ] 9.2.4 Add tests for domain registration with GTS plugin

**Traceability**: Requirement "Hierarchical Extension Domains" - Vendor-defined domain

### 9.3 Implement Domain Rendering

- [ ] 9.3.1 Create `ExtensionDomainSlot` component
- [ ] 9.3.2 Implement extension rendering within slot
- [ ] 9.3.3 Handle nested domain rendering
- [ ] 9.3.4 Add integration tests for nested injection

**Traceability**: Requirement "Hierarchical Extension Domains" - Nested extension injection

---

## Phase 10: MFE Loading and Error Handling

**Goal**: Implement MFE bundle loading with error handling.

### 10.1 MFE Loader

- [ ] 10.1.1 Implement `loadMfe(manifest)` function
- [ ] 10.1.2 Implement bundle fetching from URL
- [ ] 10.1.3 Implement entry resolution from loaded bundle
- [ ] 10.1.4 Add loading state management

**Traceability**: Requirement "MFE Error Handling"

### 10.2 Error Handling

- [ ] 10.2.1 Implement fallback UI for load failures
- [ ] 10.2.2 Implement retry mechanism
- [ ] 10.2.3 Implement contract validation error display with type ID context
- [ ] 10.2.4 Implement action handler error logging with plugin details

**Traceability**: Requirement "MFE Error Handling" - all error scenarios

### 10.3 Error Handling Tests

- [ ] 10.3.1 Test bundle load failure scenario
- [ ] 10.3.2 Test contract validation failure at load time
- [ ] 10.3.3 Test action handler error scenario
- [ ] 10.3.4 Test retry functionality

**Traceability**: Requirement "MFE Error Handling" - all scenarios

---

## Phase 11: Integration and Documentation

**Goal**: Integrate all components and create documentation.

### 11.1 Integration Testing

- [ ] 11.1.1 Create end-to-end test with mock MFE using GTS plugin
- [ ] 11.1.2 Test full lifecycle: load, mount, action chain, unmount
- [ ] 11.1.3 Test multiple MFEs in different domains
- [ ] 11.1.4 Performance testing for action chain execution
- [ ] 11.1.5 Test custom plugin integration

**Traceability**: Requirement "Type System Plugin Abstraction" - Custom plugin implementation

### 11.2 Documentation

- [ ] 11.2.1 Update `.ai/targets/SCREENSETS.md` with MFE architecture and Type System plugin
- [ ] 11.2.2 Create MFE vendor development guide
- [ ] 11.2.3 Document `TypeSystemPlugin` interface
- [ ] 11.2.4 Document GTS plugin usage and type schemas
- [ ] 11.2.5 Create custom plugin implementation guide
- [ ] 11.2.6 Create example MFE implementation with GTS plugin

**Traceability**: Requirement "Type System Plugin Abstraction" - all scenarios

### 11.3 Final Validation

- [ ] 11.3.1 Run `npm run type-check` - must pass
- [ ] 11.3.2 Run `npm run lint` - must pass
- [ ] 11.3.3 Run `npm run test` - must pass
- [ ] 11.3.4 Run `npm run build` - must pass
