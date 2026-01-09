## ADDED Requirements

### Requirement: Type System Plugin Abstraction

The system SHALL abstract the Type System as a pluggable dependency. The screensets package treats type IDs as opaque strings - all type ID understanding is delegated to the plugin.

#### Scenario: Plugin interface definition

- **WHEN** @hai3/screensets is imported
- **THEN** the package SHALL export a `TypeSystemPlugin` interface
- **AND** the interface SHALL define type ID operations (`isValidTypeId`, `buildTypeId`, `parseTypeId`)
- **AND** the interface SHALL define schema registry operations (`registerSchema`, `validateInstance`, `getSchema`)
- **AND** the interface SHALL define query operations (`query`)
- **AND** the interface SHALL define required compatibility checking (`checkCompatibility`)
- **AND** the interface SHALL define attribute access (`getAttribute`) for dynamic schema resolution

#### Scenario: GTS plugin as default implementation

- **WHEN** a developer imports `@hai3/screensets/plugins/gts`
- **THEN** the package SHALL export a `gtsPlugin` implementing `TypeSystemPlugin`
- **AND** the plugin SHALL use `@globaltypesystem/gts-ts` internally
- **AND** the plugin SHALL handle GTS type ID format: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### Scenario: GTS type ID validation

- **WHEN** validating a GTS type ID
- **THEN** the plugin SHALL accept valid type IDs like `gts.hai3.screensets.mfe.entry.v1~`
- **AND** the plugin SHALL reject invalid formats like `gts.hai3.mfe.v1~` (missing segments)
- **AND** the plugin SHALL reject formats without trailing tilde
- **AND** the plugin SHALL reject formats without version prefix "v"

#### Scenario: x-gts-ref validation for type references

- **WHEN** validating a schema field with `x-gts-ref`
- **THEN** the plugin SHALL validate the referenced type ID exists in the registry
- **AND** the plugin SHALL validate the reference pattern matches (e.g., `gts.hai3.screensets.ext.action.v1~*`)
- **AND** validation SHALL fail if the referenced type is not registered
- **AND** error message SHALL identify the invalid x-gts-ref reference

#### Scenario: x-gts-ref with oneOf for multiple target types

- **WHEN** a schema field uses `oneOf` with multiple `x-gts-ref` options
- **THEN** the plugin SHALL accept values matching ANY of the referenced types
- **AND** validation SHALL fail if the value matches NONE of the referenced types
- **AND** error message SHALL list all valid target type patterns

#### Scenario: x-gts-ref self-reference with /$id

- **WHEN** a schema field uses `x-gts-ref: "/$id"`
- **THEN** the plugin SHALL validate the field value equals the instance's own `id` field
- **AND** this enables self-identifying type patterns (e.g., Action.type is the action's type ID)
- **AND** validation SHALL fail if the value does not match the instance's id

#### Scenario: Plugin requirement at initialization

- **WHEN** creating a ScreensetsRuntime
- **THEN** the `ScreensetsRuntimeConfig` SHALL require a `typeSystem` parameter
- **AND** the runtime SHALL use the plugin for all type ID operations
- **AND** the runtime SHALL use the plugin for schema validation
- **AND** initialization without a plugin SHALL throw an error

#### Scenario: HAI3 type registration via plugin

- **WHEN** the ScreensetsRuntime initializes with a plugin
- **THEN** the runtime SHALL register HAI3 MFE types via `plugin.registerSchema()`
- **AND** registered types SHALL include 6 core types:
  - `gts.hai3.screensets.mfe.entry.v1~` (MfeEntry - Abstract Base)
  - `gts.hai3.screensets.ext.domain.v1~` (ExtensionDomain)
  - `gts.hai3.screensets.ext.extension.v1~` (Extension)
  - `gts.hai3.screensets.ext.shared_property.v1~` (SharedProperty)
  - `gts.hai3.screensets.ext.action.v1~` (Action)
  - `gts.hai3.screensets.ext.actions_chain.v1~` (ActionsChain)
- **AND** registered types SHALL include 2 MF-specific types:
  - `gts.hai3.screensets.mfe.mf.v1~` (MfManifest - Standalone)
  - `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~` (MfeEntryMF - Derived)

#### Scenario: Custom plugin implementation

- **WHEN** a developer implements a custom `TypeSystemPlugin`
- **THEN** the implementation SHALL work with the ScreensetsRuntime
- **AND** type ID format SHALL be determined by the custom plugin
- **AND** validation behavior SHALL be determined by the custom plugin

#### Scenario: Type ID parsing via plugin

- **WHEN** metadata about a type ID is needed
- **THEN** the system SHALL call `plugin.parseTypeId(id)` directly
- **AND** the returned object structure SHALL be plugin-specific
- **AND** for GTS plugin, the object SHALL contain vendor, package, namespace, type, version fields

#### Scenario: Attribute access via plugin

- **WHEN** calling `plugin.getAttribute(typeId, path)`
- **THEN** the plugin SHALL resolve the property path from the type's registered schema
- **AND** the result SHALL indicate whether the attribute was resolved
- **AND** the result SHALL contain the value if resolved
- **AND** the result SHALL contain an error message if not resolved

### Requirement: Dynamic uiMeta Validation

The system SHALL validate Extension's uiMeta against its domain's extensionsUiMeta schema at runtime.

#### Scenario: uiMeta validation via attribute selector

- **WHEN** registering an extension binding
- **THEN** the ScreensetsRuntime SHALL resolve the domain's extensionsUiMeta via `plugin.getAttribute()`
- **AND** the runtime SHALL validate extension.uiMeta against the resolved schema
- **AND** validation failure SHALL prevent extension registration
- **AND** error message SHALL identify the uiMeta validation failure

#### Scenario: uiMeta validation with derived domains

- **WHEN** an extension binds to a derived domain (e.g., `gts.hai3.screensets.ext.domain.v1~hai3.layout.domain.sidebar.v1`)
- **THEN** the runtime SHALL use the derived domain's narrowed extensionsUiMeta schema
- **AND** uiMeta validation SHALL enforce the derived schema requirements

#### Scenario: uiMeta schema resolution failure

- **WHEN** the ScreensetsRuntime cannot resolve extensionsUiMeta from the domain
- **THEN** extension registration SHALL fail
- **AND** error message SHALL indicate the attribute resolution failure
- **AND** error SHALL include the domain type ID

### Requirement: MFE TypeScript Type System

The system SHALL define internal TypeScript types for microfrontend architecture using a symmetric contract model. All types have an `id: string` field as their identifier.

#### Scenario: Type identifier

- **WHEN** defining any MFE type
- **THEN** the type SHALL have an `id: string` field
- **AND** the `id` field SHALL contain the type ID (opaque to screensets)
- **AND** when metadata is needed, the system SHALL call `plugin.parseTypeId(id)` directly

#### Scenario: MFE entry type definition (abstract base)

- **WHEN** a vendor defines an MFE entry point
- **THEN** the entry SHALL conform to `MfeEntry` TypeScript interface
- **AND** the entry SHALL have an `id` field (string)
- **AND** the entry SHALL specify requiredProperties (required), actions (required), and domainActions (required)
- **AND** the entry MAY specify optionalProperties (optional field)
- **AND** the entry SHALL NOT contain implementation-specific fields like `path` or loading details
- **AND** requiredProperties and optionalProperties (if present) SHALL reference SharedProperty type IDs
- **AND** actions and domainActions SHALL reference Action type IDs
- **AND** `MfeEntry` SHALL be the abstract base type for all entry contracts

#### Scenario: MFE entry MF type definition (derived for Module Federation)

- **WHEN** a vendor creates an MFE entry for Module Federation 2.0
- **THEN** the entry SHALL conform to `MfeEntryMF` TypeScript interface (extends MfeEntry)
- **AND** the entry SHALL include manifest (reference to MfManifest type ID)
- **AND** the entry SHALL include exposedModule (federation exposed module name)
- **AND** the entry SHALL inherit all contract fields from MfeEntry base

#### Scenario: MF manifest type definition (standalone)

- **WHEN** a vendor defines a Module Federation manifest
- **THEN** the manifest SHALL conform to `MfManifest` TypeScript interface
- **AND** the manifest SHALL have an `id` field (string)
- **AND** the manifest SHALL include remoteEntry (URL to remoteEntry.js)
- **AND** the manifest SHALL include remoteName (federation container name)
- **AND** the manifest MAY include sharedDependencies (array of SharedDependencyConfig)
- **AND** SharedDependencyConfig SHALL include name (package name) and requiredVersion (semver)
- **AND** SharedDependencyConfig MAY include singleton (boolean, default: false)
- **AND** the manifest MAY include entries (convenience field for discovery)
- **AND** multiple MfeEntryMF instances MAY reference the same manifest

#### Scenario: Extension domain type definition

- **WHEN** a host defines an extension domain
- **THEN** the domain SHALL conform to `ExtensionDomain` TypeScript interface
- **AND** the domain SHALL have an `id` field (string)
- **AND** the domain SHALL specify sharedProperties, actions, extensionsActions, and extensionsUiMeta
- **AND** the domain SHALL specify `defaultActionTimeout` (REQUIRED, number in milliseconds)
- **AND** sharedProperties SHALL reference SharedProperty type IDs
- **AND** actions and extensionsActions SHALL reference Action type IDs
- **AND** extensionsUiMeta SHALL be a valid JSON Schema
- **AND** derived domains MAY narrow extensionsUiMeta through GTS type inheritance

#### Scenario: Extension binding type definition

- **WHEN** binding an MFE entry to a domain
- **THEN** the binding SHALL conform to `Extension` TypeScript interface
- **AND** the binding SHALL have an `id` field (string)
- **AND** the binding SHALL reference valid domain and entry type IDs
- **AND** domain SHALL reference an ExtensionDomain type ID
- **AND** entry SHALL reference an MfeEntry type ID (base or derived)
- **AND** uiMeta SHALL conform to the domain's extensionsUiMeta schema

#### Scenario: Shared property type definition

- **WHEN** defining a shared property instance
- **THEN** the property SHALL conform to `SharedProperty` TypeScript interface
- **AND** the property SHALL have an `id` field (string) - the type ID for this shared property
- **AND** the property SHALL have a `value` field - the shared property value

#### Scenario: Action type definition

- **WHEN** defining an action
- **THEN** the action SHALL conform to `Action` TypeScript interface
- **AND** the action SHALL specify type (REQUIRED) - self-reference to the action's type ID
- **AND** the action SHALL specify target (REQUIRED) - reference to ExtensionDomain or Extension type ID
- **AND** the action MAY specify payload (optional object)
- **AND** the action MAY specify `timeout` (optional number in milliseconds) to override domain's defaultActionTimeout
- **AND** the action SHALL NOT have a separate `id` field (type serves as identification)

#### Scenario: Actions chain type definition

- **WHEN** defining an actions chain
- **THEN** the chain SHALL conform to `ActionsChain` TypeScript interface
- **AND** the chain SHALL contain an action INSTANCE (object conforming to Action schema)
- **AND** next and fallback SHALL be optional ActionsChain INSTANCES (recursive embedded objects)
- **AND** the chain SHALL NOT have an `id` field (ActionsChain is not referenced by other types)
- **AND** the chain SHALL use `$ref` syntax in GTS schema for embedding Action and ActionsChain instances

### Requirement: MfeEntry Type Hierarchy

The system SHALL support a type hierarchy for MfeEntry to enable multiple loader implementations without parallel hierarchies.

#### Scenario: MfeEntry as abstract base

- **WHEN** defining the MfeEntry type
- **THEN** it SHALL be an abstract base type defining only the communication contract
- **AND** it SHALL NOT contain loader-specific fields
- **AND** derived types SHALL inherit all contract fields

#### Scenario: MfeEntryMF as derived type

- **WHEN** a Module Federation entry is created
- **THEN** it SHALL derive from MfeEntry
- **AND** it SHALL add manifest (reference to MfManifest)
- **AND** it SHALL add exposedModule (federation module name)
- **AND** it SHALL inherit requiredProperties, optionalProperties, actions, domainActions from base

#### Scenario: Future loader extensibility

- **WHEN** a new loader type is needed (e.g., ESM, Import Maps)
- **THEN** a new derived type (e.g., MfeEntryEsm) SHALL be created
- **AND** the new type SHALL extend MfeEntry
- **AND** the new type SHALL add loader-specific fields
- **AND** existing MfeEntry base and MfeEntryMF SHALL NOT be modified

#### Scenario: Extension binds to MfeEntry hierarchy

- **WHEN** an Extension references an entry
- **THEN** the entry field SHALL accept MfeEntry or any derived type
- **AND** contract validation SHALL use the base MfeEntry contract fields
- **AND** loading SHALL use the derived type's loader-specific fields

### Requirement: Contract Matching Validation

The system SHALL validate that MFE entries are compatible with extension domains before mounting.

#### Scenario: Valid contract matching

- **WHEN** registering an extension binding
- **AND** entry.requiredProperties is a subset of domain.sharedProperties
- **AND** entry.actions is a subset of domain.extensionsActions
- **AND** domain.actions is a subset of entry.domainActions
- **THEN** registration SHALL succeed

#### Scenario: Missing required property

- **WHEN** registering an extension binding
- **AND** entry requires a property not in domain.sharedProperties
- **THEN** registration SHALL fail with error type `missing_property`
- **AND** error message SHALL identify the missing property

#### Scenario: Unsupported entry action

- **WHEN** registering an extension binding
- **AND** entry emits an action not in domain.extensionsActions
- **THEN** registration SHALL fail with error type `unsupported_action`
- **AND** error message SHALL identify the unsupported action

#### Scenario: Unhandled domain action

- **WHEN** registering an extension binding
- **AND** domain emits an action not in entry.domainActions
- **THEN** registration SHALL fail with error type `unhandled_domain_action`
- **AND** error message SHALL identify the unhandled action

#### Scenario: Optional properties not required

- **WHEN** registering an extension binding
- **AND** entry.optionalProperties includes properties not in domain.sharedProperties
- **THEN** registration SHALL still succeed
- **AND** missing optional properties SHALL be undefined at runtime

### Requirement: Complete Runtime Isolation (Framework-Agnostic)

Each MFE instance SHALL have its own FULLY ISOLATED runtime, including TypeSystemPlugin instance. MFEs are framework-agnostic - the host uses React but MFEs can use any UI framework.

#### Scenario: MFE runtime isolation

- **WHEN** an MFE is loaded and mounted
- **THEN** the MFE SHALL receive its own @hai3/screensets instance
- **AND** the MFE SHALL receive its own TypeSystemPlugin instance
- **AND** the MFE's TypeSystemPlugin SHALL have its own isolated schema registry
- **AND** the MFE SHALL receive its own HAI3 state instance
- **AND** the MFE MAY use any UI framework (Vue 3, Angular, Svelte, React, etc.)

#### Scenario: TypeSystemPlugin isolation (security)

- **WHEN** an MFE attempts to query its TypeSystemPlugin
- **THEN** calling `plugin.query('gts.*')` SHALL only return types registered in that MFE's own registry
- **AND** the MFE SHALL NOT be able to discover host's registered types
- **AND** the MFE SHALL NOT be able to discover other MFE's registered types
- **AND** this isolation prevents information leakage about host internal structure

#### Scenario: Host state isolation

- **WHEN** an MFE is mounted in the host
- **THEN** the host state SHALL NOT be modified by MFE state changes
- **AND** the host SHALL NOT have direct access to MFE state
- **AND** the host TypeSystemPlugin SHALL NOT be accessible from MFE code

#### Scenario: Shared properties propagation via MfeBridge

- **WHEN** an MFE entry receives shared properties
- **THEN** properties SHALL be passed via MfeBridge interface only
- **AND** properties SHALL be updated when host values change
- **AND** MFE SHALL NOT modify shared properties directly
- **AND** internal coordination SHALL use private RuntimeCoordinator (not exposed to MFE)

#### Scenario: Framework agnostic MFE

- **WHEN** a vendor creates an MFE using Vue 3
- **THEN** the MFE SHALL be mountable into a React host
- **AND** the MFE SHALL receive MfeBridge for communication
- **AND** the MFE SHALL NOT require React or ReactDOM dependencies
- **AND** Module Federation SHALL NOT share React/ReactDOM as singletons

### Requirement: Actions Chain Mediation

The system SHALL provide an ActionsChainsMediator to deliver action chains between domains and extensions, using the Type System plugin for validation.

**Note on terminology:**
- **ScreensetsRuntime**: Manages MFE lifecycle (loading, mounting, registration, validation)
- **ActionsChainsMediator**: Mediates action chain delivery between domains and extensions

#### Scenario: Action chain type ID validation

- **WHEN** ActionsChainsMediator receives an actions chain
- **THEN** mediator SHALL validate target type ID via `plugin.isValidTypeId()`
- **AND** mediator SHALL validate action type ID via `plugin.isValidTypeId()`
- **AND** invalid type IDs SHALL cause chain failure

#### Scenario: Action chain execution success path

- **WHEN** ActionsChainsMediator executes an actions chain
- **AND** target successfully handles the action
- **AND** chain has a `next` property
- **THEN** mediator SHALL execute the next chain
- **AND** next chain's target SHALL receive its action

#### Scenario: Action chain execution failure path

- **WHEN** ActionsChainsMediator executes an actions chain
- **AND** target fails to handle the action
- **AND** chain has a `fallback` property
- **THEN** mediator SHALL execute the fallback chain
- **AND** fallback chain's target SHALL receive its action

#### Scenario: Action chain termination

- **WHEN** ActionsChainsMediator executes an actions chain
- **AND** chain has no `next` property (on success)
- **OR** chain has no `fallback` property (on failure)
- **THEN** chain execution SHALL terminate
- **AND** mediator SHALL return completion result

#### Scenario: Action payload validation via plugin

- **WHEN** ActionsChainsMediator delivers an action
- **THEN** payload SHALL be validated via `plugin.validateInstance()`
- **AND** validation SHALL use the action's registered payloadSchema
- **AND** invalid payloads SHALL cause chain failure

#### Scenario: Extension registration

- **WHEN** an MFE entry is mounted
- **THEN** the entry SHALL register with ActionsChainsMediator
- **AND** registration SHALL provide action handler callback
- **AND** handler SHALL receive actions for that extension

#### Scenario: Extension unregistration

- **WHEN** an MFE entry is unmounted
- **THEN** the entry SHALL unregister from ActionsChainsMediator
- **AND** pending actions SHALL be cancelled or failed
- **AND** mediator SHALL not deliver actions to unmounted entries

### Requirement: MFE Loading via MfeEntryMF and MfManifest

The system SHALL load MFE bundles using the MfeEntryMF derived type which references an MfManifest.

#### Scenario: MfeEntryMF loading flow

- **WHEN** loading an MFE from its MfeEntryMF definition
- **THEN** the loader SHALL validate entry against MfeEntryMF schema
- **AND** the loader SHALL resolve manifest from entry.manifest reference
- **AND** the loader SHALL load Module Federation container from manifest.remoteEntry
- **AND** the loader SHALL get exposed module using entry.exposedModule

#### Scenario: Manifest resolution and caching

- **WHEN** resolving an MfManifest from type ID
- **THEN** the loader SHALL cache manifests to avoid redundant loading
- **AND** the loader SHALL validate manifest against MfManifest schema
- **AND** multiple MfeEntryMF referencing same manifest SHALL reuse cached container

#### Scenario: Module Federation container loading

- **WHEN** loading a Module Federation container
- **THEN** the loader SHALL load remoteEntry.js script
- **AND** the loader SHALL get container from window[manifest.remoteName]
- **AND** the loader SHALL initialize sharing scope
- **AND** the loader SHALL cache containers per remoteName

### Requirement: Hierarchical Extension Domains

The system SHALL support hierarchical extension domains where vendor screensets can define their own domains.

#### Scenario: Base layout domains

- **WHEN** HAI3 initializes
- **THEN** the system SHALL provide base layout domains
- **AND** domains SHALL include sidebar, popup, screen, and overlay
- **AND** each domain SHALL have defined contracts

#### Scenario: Vendor-defined extension domain

- **WHEN** a vendor screenset defines an extension domain
- **THEN** the domain SHALL be registered with the system
- **AND** MFE entries compatible with the domain SHALL be mountable
- **AND** domain contracts SHALL be validated at registration

#### Scenario: Nested extension mounting

- **WHEN** an MFE entry is mounted into a vendor-defined domain
- **AND** that domain is rendered within a base layout domain
- **THEN** the MFE SHALL render within the nested context
- **AND** actions chains SHALL traverse the hierarchy correctly

### Requirement: MFE Error Handling

The system SHALL provide consistent error handling for MFE operations.

#### Scenario: MFE bundle load failure

- **WHEN** MFE bundle fails to load from URL
- **THEN** the system SHALL display fallback UI in the domain slot
- **AND** error details SHALL be logged
- **AND** retry option SHALL be available

#### Scenario: Contract validation failure at load time

- **WHEN** MFE is loaded but contract validation fails
- **THEN** the MFE SHALL NOT be mounted
- **AND** detailed error SHALL be displayed
- **AND** error SHALL identify specific contract violations

#### Scenario: Action handler throws error

- **WHEN** an action handler throws during execution
- **THEN** the action SHALL be considered failed
- **AND** fallback chain SHALL be executed if defined
- **AND** error SHALL be logged with action context

### Requirement: Framework Plugin Propagation

The Type System plugin SHALL propagate from @hai3/screensets through @hai3/framework layers.

#### Scenario: Framework microfrontends plugin configuration

- **WHEN** configuring the @hai3/framework microfrontends plugin
- **THEN** the plugin configuration SHALL accept a `typeSystem` parameter
- **AND** the plugin SHALL pass the Type System plugin to the ScreensetsRuntime
- **AND** the same plugin instance SHALL be used throughout the application

#### Scenario: Base domains registration via plugin

- **WHEN** the framework microfrontends plugin initializes
- **AND** baseDomains are specified in configuration
- **THEN** base domain type IDs SHALL be built via `plugin.buildTypeId()`
- **AND** base domain schemas SHALL be registered via `plugin.registerSchema()`

#### Scenario: Plugin consistency across layers

- **WHEN** an MFE extension accesses the ScreensetsRuntime
- **THEN** all type ID operations SHALL use the same plugin instance
- **AND** type IDs from different layers SHALL be compatible
- **AND** schema validation SHALL be consistent

### Requirement: GTS Type ID Utilities

The system SHALL provide utilities for working with GTS type IDs, used by both screensets and framework layers.

#### Scenario: GtsTypeId branded type

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export a `GtsTypeId` branded string type
- **AND** functions accepting type IDs SHALL use this type for type safety
- **AND** literal strings SHALL require explicit casting (`as GtsTypeId`)

#### Scenario: parseGtsId utility

- **WHEN** calling `parseGtsId(typeId)`
- **THEN** the function SHALL parse the GTS type ID into components
- **AND** the result SHALL include vendor, package, namespace, type, and version
- **AND** for derived types, the result SHALL include the base type components

#### Scenario: conformsTo utility

- **WHEN** calling `conformsTo(derivedTypeId, baseTypeId)`
- **THEN** the function SHALL return `true` if the derived type conforms to the base type
- **AND** `conformsTo('gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~acme.dashboard~', 'gts.hai3.screensets.mfe.entry.v1~')` SHALL return `true`
- **AND** `conformsTo('gts.hai3.screensets.mfe.mf.v1~acme.analytics~', 'gts.hai3.screensets.mfe.entry.v1~')` SHALL return `false`

### Requirement: MfeRemoteConfig Type

The system SHALL define `MfeRemoteConfig` interface for configuring remote MFE endpoints.

#### Scenario: MfeRemoteConfig interface

- **WHEN** configuring a remote MFE
- **THEN** `MfeRemoteConfig` SHALL require `manifestTypeId` (GtsTypeId) and `url` (string)
- **AND** `shared` SHALL be optional (string array of dependency names)
- **AND** `preload` SHALL be optional ('none' | 'hover' | 'immediate')
- **AND** `loadTimeout` SHALL be optional (number in milliseconds, default 10000)

### Requirement: MFE Bridge Interface

The system SHALL provide bridge interfaces for communication between host and MFE.

#### Scenario: MfeBridge interface

- **WHEN** an MFE component needs to communicate with the host
- **THEN** the MFE SHALL receive a `MfeBridge` instance via props
- **AND** `MfeBridge` SHALL provide `requestHostAction(actionTypeId, payload)` method
- **AND** `MfeBridge` SHALL provide `subscribeToProperty(propertyTypeId, callback)` method
- **AND** `MfeBridge` SHALL expose `entryTypeId` for self-identification

#### Scenario: MfeBridgeConnection interface

- **WHEN** the host creates a bridge for a mounted MFE
- **THEN** `MfeBridgeConnection` SHALL extend `MfeBridge`
- **AND** it SHALL provide `sendActionsChain(chain, options?)` for sending actions to MFE
- **AND** the `options` parameter SHALL be optional `ChainExecutionOptions`
- **AND** it SHALL provide `updateProperty(propertyTypeId, value)` for property updates
- **AND** it SHALL provide `dispose()` for cleanup

#### Scenario: MfeBridgeProps interface

- **WHEN** an MFE component is rendered
- **THEN** `MfeBridgeProps` SHALL contain `bridge: MfeBridge`
- **AND** MFE entry components SHALL accept this interface in their props

### Requirement: HAI3 Action Constants

The system SHALL export constants for standard HAI3 actions.

#### Scenario: Standard action type IDs

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export action type ID constants:
  - `HAI3_ACTION_SHOW_POPUP`: `gts.hai3.screensets.ext.action.v1~hai3.actions.show_popup~`
  - `HAI3_ACTION_HIDE_POPUP`: `gts.hai3.screensets.ext.action.v1~hai3.actions.hide_popup~`
  - `HAI3_ACTION_SHOW_SIDEBAR`: `gts.hai3.screensets.ext.action.v1~hai3.actions.show_sidebar~`
  - `HAI3_ACTION_HIDE_SIDEBAR`: `gts.hai3.screensets.ext.action.v1~hai3.actions.hide_sidebar~`

### Requirement: HAI3 Type Constants

The system SHALL export constants for HAI3 MFE base types.

#### Scenario: Base type ID constants

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export base type ID constants:
  - `HAI3_MFE_ENTRY`: `gts.hai3.screensets.mfe.entry.v1~`
  - `HAI3_MFE_ENTRY_MF`: `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~`
  - `HAI3_MF_MANIFEST`: `gts.hai3.screensets.mfe.mf.v1~`
  - `HAI3_EXT_DOMAIN`: `gts.hai3.screensets.ext.domain.v1~`
  - `HAI3_EXT_EXTENSION`: `gts.hai3.screensets.ext.extension.v1~`
  - `HAI3_EXT_ACTION`: `gts.hai3.screensets.ext.action.v1~`

### Requirement: Shadow DOM Utilities

The system SHALL provide Shadow DOM utilities for style isolation in `@hai3/screensets`.

#### Scenario: createShadowRoot utility

- **WHEN** calling `createShadowRoot(element, options?)`
- **THEN** the function SHALL create and return a ShadowRoot attached to the element
- **AND** `mode` SHALL default to 'open'
- **AND** the function SHALL handle already-attached shadow roots gracefully

#### Scenario: injectCssVariables utility

- **WHEN** calling `injectCssVariables(shadowRoot, variables)`
- **THEN** the function SHALL inject CSS custom properties into the shadow root
- **AND** the variables SHALL be available to all children within the shadow DOM
- **AND** the function SHALL update existing variables if called multiple times

### Requirement: MFE Error Classes

The system SHALL provide typed error classes for MFE operations.

#### Scenario: MfeLoadError class

- **WHEN** an MFE bundle fails to load
- **THEN** `MfeLoadError` SHALL be thrown with `entryTypeId` and `cause` properties
- **AND** the error message SHALL include the entry type ID

#### Scenario: ContractValidationError class

- **WHEN** contract validation fails between entry and domain
- **THEN** `ContractValidationError` SHALL be thrown with `errors` array
- **AND** each error SHALL include `type`, `details`, and affected type IDs

#### Scenario: UiMetaValidationError class

- **WHEN** uiMeta validation fails against domain's extensionsUiMeta schema
- **THEN** `UiMetaValidationError` SHALL be thrown with validation errors
- **AND** the error SHALL include the extension and domain type IDs

#### Scenario: ChainExecutionError class

- **WHEN** an actions chain execution fails
- **THEN** `ChainExecutionError` SHALL be thrown with `chain`, `failedAction`, and `cause`
- **AND** the error SHALL include the path of executed actions before failure

#### Scenario: MfeVersionMismatchError class

- **WHEN** shared dependency version validation fails
- **THEN** `MfeVersionMismatchError` SHALL be thrown with `manifestTypeId`, `dependency`, `expected`, and `actual` versions

#### Scenario: MfeTypeConformanceError class

- **WHEN** a type ID fails conformance check against a base type
- **THEN** `MfeTypeConformanceError` SHALL be thrown with `typeId` and `expectedBaseType`

### Requirement: Internal Runtime Coordination

The system SHALL provide PRIVATE coordination mechanisms between host and MFE runtimes that are NOT exposed to MFE code. The coordination uses WeakMap-based approach for better encapsulation and garbage collection.

#### Scenario: RuntimeCoordinator uses WeakMap

- **WHEN** the host runtime and MFE runtime need to coordinate
- **THEN** coordination SHALL use a module-level WeakMap keyed by container Element
- **AND** the WeakMap SHALL store RuntimeConnection objects with hostRuntime and bridges
- **AND** RuntimeCoordinator SHALL NOT use window globals (no `window.__hai3_*` properties)
- **AND** RuntimeCoordinator SHALL NOT be exposed to MFE component code
- **AND** MFE code SHALL only see the MfeBridge interface

#### Scenario: RuntimeConnection registration

- **WHEN** an MFE is mounted to a container element
- **THEN** the system SHALL call `registerRuntime(container, connection)` internally
- **AND** the RuntimeConnection SHALL include the hostRuntime reference
- **AND** the RuntimeConnection SHALL include a Map of entryTypeId to MfeBridgeConnection

#### Scenario: RuntimeConnection lookup

- **WHEN** the system needs to find a runtime for communication
- **THEN** the system SHALL call `getRuntime(container)` to lookup by element
- **AND** the lookup SHALL return RuntimeConnection or undefined
- **AND** the lookup SHALL be O(1) complexity via WeakMap

#### Scenario: RuntimeConnection cleanup

- **WHEN** an MFE is unmounted from a container element
- **THEN** the system SHALL call `unregisterRuntime(container)` internally
- **AND** the WeakMap entry SHALL be removed
- **AND** when the container element is garbage collected, any remaining reference SHALL be automatically cleaned up

#### Scenario: WeakMap benefits

- **WHEN** using WeakMap-based coordination instead of window globals
- **THEN** there SHALL be no window pollution (not accessible via devtools window object)
- **AND** garbage collection SHALL be automatic when container element is removed
- **AND** encapsulation SHALL be better (module-private, not globally accessible)

#### Scenario: MfeBridge is the only exposed interface

- **WHEN** an MFE component is rendered
- **THEN** the only communication interface visible to MFE code SHALL be MfeBridge
- **AND** MfeBridge SHALL provide: `requestHostAction`, `subscribeToProperty`, `getProperty`, `subscribeToAllProperties`
- **AND** MfeBridge SHALL NOT expose: RuntimeCoordinator, TypeSystemPlugin, schema registry, internal state

#### Scenario: Internal coordination for property updates

- **WHEN** the host updates a shared property value
- **THEN** RuntimeCoordinator SHALL internally propagate the update
- **AND** MfeBridge SHALL notify subscribers via `subscribeToProperty` callbacks
- **AND** the internal coordination mechanism SHALL NOT be visible to MFE code

#### Scenario: Internal coordination for action delivery

- **WHEN** the host sends an action chain to an MFE
- **THEN** RuntimeCoordinator SHALL internally route the action
- **AND** MfeBridge SHALL receive the action and invoke the MFE's handler
- **AND** the routing mechanism SHALL NOT be visible to MFE code

### Requirement: Module Federation Shared Configuration

The system SHALL configure Module Federation to support framework-agnostic isolated MFEs using the `singleton` flag to control instance sharing.

#### Scenario: SharedDependencyConfig structure

- **WHEN** defining a shared dependency in MfManifest
- **THEN** SharedDependencyConfig SHALL include `name` (package name, required)
- **AND** SharedDependencyConfig SHALL include `requiredVersion` (semver range, required)
- **AND** SharedDependencyConfig MAY include `singleton` (boolean, optional, default: false)
- **AND** `singleton: false` SHALL mean code is shared but each MFE gets its own instance
- **AND** `singleton: true` SHALL mean code is shared AND the same instance is used everywhere

#### Scenario: Code sharing vs instance sharing

- **WHEN** a dependency is listed in sharedDependencies
- **THEN** the code/bundle SHALL be downloaded once and cached (code sharing)
- **AND** the `singleton` flag SHALL control whether instances are shared or isolated
- **AND** these two benefits SHALL be independent (both can be achieved with singleton: false)

#### Scenario: Default singleton behavior

- **WHEN** `singleton` is not specified in SharedDependencyConfig
- **THEN** the default SHALL be `false` (isolated instances)
- **AND** each MFE SHALL receive its own instance from the shared code
- **AND** this provides both code sharing (performance) and instance isolation (safety)

#### Scenario: Stateful library sharing with isolation

- **WHEN** sharing React, ReactDOM, @hai3/*, or GTS via sharedDependencies
- **THEN** `singleton` SHOULD be `false` to preserve runtime isolation
- **AND** each MFE SHALL have its own React context, hooks state, and reconciler
- **AND** each MFE SHALL have its own TypeSystemPlugin and schema registry
- **AND** bundle size optimization SHALL still be achieved through code sharing

#### Scenario: Stateless utility sharing

- **WHEN** sharing truly stateless libraries (lodash, date-fns, uuid)
- **THEN** `singleton` MAY be `true` safely
- **AND** all consumers SHALL share the same instance
- **AND** this provides both code sharing AND memory optimization

#### Scenario: Isolation requirement enforcement

- **WHEN** an MFE attempts to discover types via its TypeSystemPlugin
- **THEN** `plugin.query('gts.*')` SHALL only return types in that MFE's registry
- **AND** the MFE SHALL NOT be able to discover host's registered types
- **AND** the MFE SHALL NOT be able to discover other MFE's registered types
- **AND** this isolation SHALL be guaranteed by `singleton: false` on @hai3/screensets and GTS

### Requirement: Explicit Timeout Configuration

Action timeouts SHALL be configured explicitly in type definitions, not as implicit code defaults. This ensures the platform is fully runtime-configurable and declarative. Timeout is treated as just another failure case - the ActionsChain.fallback handles all failures uniformly.

#### Scenario: ExtensionDomain timeout configuration

- **WHEN** defining an ExtensionDomain
- **THEN** the domain SHALL specify `defaultActionTimeout` (REQUIRED, number in milliseconds)
- **AND** all actions targeting this domain SHALL use `defaultActionTimeout` unless overridden

#### Scenario: Action timeout override

- **WHEN** defining an Action
- **THEN** the action MAY specify `timeout` (optional number in milliseconds)
- **AND** if specified, this value SHALL override the target domain's default
- **AND** if not specified, the domain's default SHALL be used

#### Scenario: Timeout resolution order

- **WHEN** executing an action
- **THEN** effective timeout SHALL be: `action.timeout ?? domain.defaultActionTimeout`
- **AND** on timeout: execute fallback chain if defined (same as any other failure)
- **AND** there SHALL be NO implicit code defaults for action timeouts (no magic numbers in code)

#### Scenario: Timeout as failure

- **WHEN** an action times out
- **THEN** the timeout SHALL be treated as a failure
- **AND** the ActionsChain.fallback SHALL be executed if defined
- **AND** there SHALL be NO separate `fallbackOnTimeout` flag (unified failure handling)

#### Scenario: Chain-level timeout configuration

- **WHEN** executing an actions chain
- **THEN** the system SHALL accept optional `ChainExecutionOptions` parameter
- **AND** `ChainExecutionOptions` SHALL include ONLY `chainTimeout` (optional number, ms)
- **AND** `ChainExecutionOptions` SHALL NOT include `actionTimeout` (action timeouts come from types)
- **AND** `chainTimeout` SHALL limit the total time for the entire chain execution

#### Scenario: ActionsChainsConfig mediator configuration

- **WHEN** configuring the ActionsChainsMediator
- **THEN** `ActionsChainsConfig` SHALL include ONLY `chainTimeout` (optional, default: 120000ms)
- **AND** `ActionsChainsConfig` SHALL NOT include `actionTimeout` (action timeouts come from types)

#### Scenario: ActionsChainsMediator method signatures

- **WHEN** using ActionsChainsMediator
- **THEN** `executeActionsChain(chain, options?)` SHALL accept optional `ChainExecutionOptions`
- **AND** `deliver(chain, options?)` SHALL accept optional `ChainExecutionOptions`
- **AND** action timeouts SHALL be resolved from action and domain type definitions
- **AND** on timeout or any failure: execute fallback chain if defined

#### Scenario: MfeBridgeConnection method signature

- **WHEN** using MfeBridgeConnection
- **THEN** `sendActionsChain(chain, options?)` SHALL accept optional `ChainExecutionOptions`
- **AND** the options SHALL be passed through to the underlying mediator
- **AND** action timeouts SHALL be resolved from action and domain type definitions
