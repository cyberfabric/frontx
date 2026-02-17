## ADDED Requirements

### Requirement: Type System Plugin Abstraction

The system SHALL abstract the Type System as a pluggable dependency. The screensets package treats type IDs as opaque strings - all type ID understanding is delegated to the plugin.

#### Scenario: Plugin interface definition

- **WHEN** @hai3/screensets is imported
- **THEN** the package SHALL export a `TypeSystemPlugin` interface
- **AND** the interface SHALL define `name` (readonly string) and `version` (readonly string) properties
- **AND** the interface SHALL define schema registry operations (`registerSchema`, `getSchema`)
- **AND** the interface SHALL define instance registry operations (`register`)
- **AND** the interface SHALL define validation operations (`validateInstance` taking instanceId only)
- **AND** the interface SHALL define type hierarchy operations (`isTypeOf`)
- **AND** the interface SHALL NOT define `buildTypeId` (GTS type IDs are consumed but never programmatically generated; all type IDs are defined as string constants)
- **AND** the interface SHALL NOT define `validateAgainstSchema` (Extension validation uses native `validateInstance()` with derived Extension types)

#### Scenario: GTS-native validation model

- **WHEN** validating a GTS entity
- **THEN** the entity MUST first be registered via `plugin.register(entity)`
- **AND** validation SHALL happen via `plugin.validateInstance(instanceId)` where instanceId is the entity's id
- **AND** gts-ts SHALL extract the schema ID from the instance ID automatically
- **AND** schema IDs SHALL end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~`)
- **AND** instance IDs SHALL NOT end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~acme.analytics.widgets.chart.v1`)

#### Scenario: GTS plugin as default implementation

- **WHEN** a developer imports `@hai3/screensets/plugins/gts`
- **THEN** the package SHALL export a `gtsPlugin` implementing `TypeSystemPlugin`
- **AND** the plugin SHALL use `@globaltypesystem/gts-ts` internally
- **AND** the plugin SHALL handle GTS type ID format: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### Scenario: x-gts-ref validation for type references

- **WHEN** validating a schema field with `x-gts-ref`
- **THEN** the plugin SHALL validate the referenced type ID exists in the registry
- **AND** the plugin SHALL validate the reference pattern matches (e.g., `gts.hai3.mfes.comm.action.v1~*`)
- **AND** validation SHALL fail if the referenced type is not registered
- **AND** error message SHALL identify the invalid x-gts-ref reference

#### Scenario: x-gts-ref works inside oneOf/anyOf with gts-ts 0.2.0+

- **GIVEN** gts-ts 0.2.0+ is used (which fixed combinator traversal -- gts-ts issue #10)
- **WHEN** a subschema contains only `x-gts-ref` inside `oneOf`
- **THEN** validation SHALL work correctly because gts-ts 0.2.0 resolved the Ajv combinator traversal issue
- **AND** exactly one `x-gts-ref` subschema SHALL match, satisfying the `oneOf` constraint
- **AND** the action schema `target` field is the canonical example: it uses `oneOf` with `x-gts-ref` subschemas for domain and extension references

#### Scenario: x-gts-ref self-reference with /$id

- **WHEN** a schema field uses `x-gts-ref: "/$id"`
- **THEN** the plugin SHALL validate the field value equals the instance's own `id` field
- **AND** this enables self-identifying type patterns (e.g., Action.type is the action's type ID)
- **AND** validation SHALL fail if the value does not match the instance's id

#### Scenario: Plugin requirement at initialization

- **WHEN** creating a ScreensetsRegistry
- **THEN** the `ScreensetsRegistryConfig` SHALL require a `typeSystem` parameter
- **AND** the runtime SHALL use the plugin for all type ID operations
- **AND** the runtime SHALL use the plugin for schema validation
- **AND** initialization without a plugin SHALL throw an error

#### Scenario: HAI3 type availability via plugin

- **WHEN** the ScreensetsRegistry initializes with a plugin
- **THEN** first-class HAI3 MFE types SHALL be built into the GTS plugin during construction, NOT registered at runtime
- **AND** available types SHALL include 8 core types:
  - `gts.hai3.mfes.mfe.entry.v1~` (MfeEntry - Abstract Base)
  - `gts.hai3.mfes.ext.domain.v1~` (ExtensionDomain)
  - `gts.hai3.mfes.ext.extension.v1~` (Extension)
  - `gts.hai3.mfes.comm.shared_property.v1~` (SharedProperty)
  - `gts.hai3.mfes.comm.action.v1~` (Action)
  - `gts.hai3.mfes.comm.actions_chain.v1~` (ActionsChain)
  - `gts.hai3.mfes.lifecycle.stage.v1~` (LifecycleStage)
  - `gts.hai3.mfes.lifecycle.hook.v1~` (LifecycleHook)
- **AND** registered types SHALL include 2 MF-specific types:
  - `gts.hai3.mfes.mfe.mf_manifest.v1~` (MfManifest - Standalone)
  - `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~` (MfeEntryMF - Derived)

#### Scenario: Custom plugin implementation

- **WHEN** a developer implements a custom `TypeSystemPlugin`
- **THEN** the implementation SHALL work with the ScreensetsRegistry
- **AND** type ID format SHALL be determined by the custom plugin
- **AND** validation behavior SHALL be determined by the custom plugin

#### Scenario: Type hierarchy checking via plugin

- **WHEN** checking if a type conforms to a base type
- **THEN** the system SHALL call `plugin.isTypeOf(derivedTypeId, baseTypeId)` on the TypeSystemPlugin
- **AND** `plugin.isTypeOf('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.dashboard.mfe.main.v1', 'gts.hai3.mfes.mfe.entry.v1~')` SHALL return `true`
- **AND** `plugin.isTypeOf('gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.mfe.manifest.v1', 'gts.hai3.mfes.mfe.entry.v1~')` SHALL return `false`
- **AND** there SHALL be NO standalone `conformsTo()` utility function (use `plugin.isTypeOf()` instead)

#### Scenario: Type IDs as plain strings

- **WHEN** working with GTS type IDs
- **THEN** all type IDs SHALL be plain `string` values (no branded types)
- **AND** the package SHALL NOT export a `GtsTypeId` branded type or `ParsedGtsId` interface
- **AND** runtime validation SHALL use `gts-ts` functions via the TypeSystemPlugin

### Requirement: Domain-Specific Extension Validation via Derived Types

The system SHALL validate Extension instances using derived Extension types when domains specify `extensionsTypeId`. This enables domain-specific fields without separate uiMeta entities or custom Ajv validation.

#### Scenario: Extension type validation via derived types

- **WHEN** registering an extension binding
- **AND** the domain has `extensionsTypeId` specified
- **THEN** the ScreensetsRegistry SHALL verify `plugin.isTypeOf(extension.id, domain.extensionsTypeId)` returns true
- **AND** validation failure SHALL prevent extension registration
- **AND** error message SHALL indicate the extension type must derive from the domain's extensionsTypeId

#### Scenario: Domain without extensionsTypeId

- **WHEN** registering an extension binding
- **AND** the domain does NOT have `extensionsTypeId` specified
- **THEN** extensions SHALL use the base Extension type (`gts.hai3.mfes.ext.extension.v1~`)
- **AND** extension registration SHALL proceed (assuming other validations pass)

#### Scenario: Derived Extension type must be registered

- **WHEN** a domain specifies `extensionsTypeId`
- **THEN** the derived Extension type MUST be registered with the TypeSystemPlugin before extension validation
- **AND** if the type is not registered, extension registration SHALL fail
- **AND** error message SHALL indicate the missing type ID

#### Scenario: Extension validation with derived types

- **WHEN** an extension uses a derived type (e.g., `gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.widgets.chart.v1`)
- **THEN** the runtime SHALL first register the extension via `plugin.register(extension)`
- **AND** the runtime SHALL validate the registered instance via `plugin.validateInstance(extension.id)`
- **AND** gts-ts SHALL extract the schema ID from the instance ID automatically
- **AND** the runtime SHALL verify type hierarchy via `plugin.isTypeOf(extension.id, domain.extensionsTypeId)`
- **AND** the instance ID SHALL NOT end with `~` (only schema IDs end with `~`)

#### Scenario: Extension type hierarchy validation failure

- **WHEN** an extension's type does NOT derive from the domain's `extensionsTypeId`
- **THEN** extension registration SHALL fail
- **AND** `ExtensionTypeError` SHALL be thrown
- **AND** error SHALL include the extension type ID and required base type ID

### Requirement: MFE TypeScript Type System

The system SHALL define internal TypeScript types for microfrontend architecture using a symmetric contract model. All types have an `id: string` field as their identifier.

#### Scenario: Type identifier

- **WHEN** defining any MFE type
- **THEN** the type SHALL have an `id: string` field
- **AND** the `id` field SHALL contain the type ID (opaque to screensets)
- **AND** type IDs are opaque strings; the system validates them via `plugin.validateInstance()`, not by parsing

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
- **AND** the entry SHALL include manifest (`string | MfManifest` -- either a type ID reference to a cached manifest or an inline MfManifest object)
- **AND** the entry SHALL include exposedModule (federation exposed module name)
- **AND** the entry SHALL inherit all contract fields from MfeEntry base

#### Scenario: MF manifest type definition (standalone)

- **WHEN** a vendor defines a Module Federation manifest
- **THEN** the manifest SHALL conform to `MfManifest` TypeScript interface
- **AND** the manifest SHALL have an `id` field (string)
- **AND** the manifest SHALL include remoteEntry (URL to remoteEntry.js)
- **AND** the manifest SHALL include remoteName (federation container name)
- **AND** the manifest MAY include sharedDependencies (array of SharedDependencyConfig)
- **AND** SharedDependencyConfig SHALL include name (package name) and MAY include requiredVersion (semver)
- **AND** SharedDependencyConfig MAY include singleton (boolean, default: false)
- **AND** the manifest MAY include entries (convenience field for discovery)
- **AND** multiple MfeEntryMF instances MAY reference the same manifest

#### Scenario: Extension domain type definition

- **WHEN** a parent defines an extension domain
- **THEN** the domain SHALL conform to `ExtensionDomain` TypeScript interface
- **AND** the domain SHALL have an `id` field (string)
- **AND** the domain SHALL specify sharedProperties, actions, and extensionsActions
- **AND** the domain MAY specify `extensionsTypeId` (optional string, reference to a derived Extension type ID)
- **AND** the domain SHALL specify `defaultActionTimeout` (REQUIRED, number in milliseconds)
- **AND** sharedProperties SHALL reference SharedProperty type IDs
- **AND** `actions` SHALL list Action type IDs the domain can send TO extensions (e.g., `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`, plus any domain-specific actions)
- **AND** `extensionsActions` SHALL list Action type IDs extensions can send TO this domain
- **AND** the domain SHALL specify `lifecycleStages` (REQUIRED, array of lifecycle stage type IDs the domain itself recognizes)
- **AND** the domain SHALL specify `extensionsLifecycleStages` (REQUIRED, array of lifecycle stage type IDs that extensions in this domain can use)
- **AND** if `extensionsTypeId` is specified, extensions must use types that derive from that type
- **AND** derived domains MAY specify their own `extensionsTypeId` to override or narrow the validation

#### Scenario: Extension binding type definition

- **WHEN** binding an MFE entry to a domain
- **THEN** the binding SHALL conform to `Extension` TypeScript interface (or a derived type)
- **AND** the binding SHALL have an `id` field (string)
- **AND** the binding SHALL reference valid domain and entry type IDs
- **AND** domain SHALL reference an ExtensionDomain type ID
- **AND** entry SHALL reference an MfeEntry type ID (base or derived)
- **AND** the base binding SHALL NOT have a `presentation` field (presentation metadata is defined on derived types, not the base Extension)
- **AND** if the domain has extensionsTypeId, the extension's type SHALL derive from that type
- **AND** domain-specific fields SHALL be defined in derived Extension schemas, NOT in a separate uiMeta field

#### Scenario: ScreenExtension binding type definition

- **WHEN** binding an MFE entry to the screen domain
- **THEN** the binding SHALL conform to `ScreenExtension` derived type (extends `Extension`)
- **AND** the binding SHALL have a `presentation` field (REQUIRED `ExtensionPresentation` object)
- **AND** `presentation.label` SHALL be a string (display label for navigation)
- **AND** `presentation.route` SHALL be a string (route path for the screen)
- **AND** `presentation.icon` MAY be a string (icon identifier)
- **AND** `presentation.order` MAY be a number (sort order for menu positioning)
- **AND** the `presentation` field is REQUIRED because screen extensions drive the host navigation menu

#### Scenario: Shared property type definition

- **WHEN** defining a shared property instance
- **THEN** the property SHALL conform to `SharedProperty` TypeScript interface
- **AND** the property SHALL have an `id` field (string) - the type ID for this shared property
- **AND** the property SHALL have a `supportedValues` field (array of strings) defining the contract of values that consumers must support
- **AND** the property SHALL NOT have a `value` field (runtime values are set via `updateDomainProperty()`, not stored in GTS instances)

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
- **AND** it SHALL add manifest (`string | MfManifest` -- type ID reference or inline object)
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
- **AND** domain.actions (excluding infrastructure lifecycle actions) is a subset of entry.domainActions
- **THEN** registration SHALL succeed

#### Scenario: Valid contract with infrastructure-only domain actions

- **WHEN** registering an extension binding
- **AND** domain.actions contains only infrastructure lifecycle actions (load_ext, mount_ext, unmount_ext)
- **AND** entry.domainActions is empty
- **THEN** registration SHALL succeed
- **AND** infrastructure lifecycle actions SHALL be excluded from the rule 3 subset check

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

#### Scenario: Unhandled domain action (custom actions only)

- **WHEN** registering an extension binding
- **AND** domain emits a non-infrastructure action not in entry.domainActions
- **THEN** registration SHALL fail with error type `unhandled_domain_action`
- **AND** error message SHALL identify the unhandled action
- **NOTE** infrastructure lifecycle actions (HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT, HAI3_ACTION_UNMOUNT_EXT) are excluded from this check

#### Scenario: Optional properties not required

- **WHEN** registering an extension binding
- **AND** entry.optionalProperties includes properties not in domain.sharedProperties
- **THEN** registration SHALL still succeed
- **AND** missing optional properties SHALL be undefined at runtime

### Requirement: Instance-Level Isolation (Default Behavior, Framework-Agnostic)

With HAI3's default handler (MfeHandlerMF), each MFE instance SHALL have its own isolated runtime. See [Runtime Isolation](../../design/overview.md#runtime-isolation-default-behavior) for the complete isolation model.

#### Scenario: MFE runtime isolation (default handler)

- **WHEN** an MFE is loaded and mounted using the default handler (MfeHandlerMF)
- **THEN** the MFE SHALL have its own isolated runtime (screensets, TypeSystemPlugin, state)
- **AND** the MFE MAY use any UI framework (Vue 3, Angular, Svelte, React, etc.)

#### Scenario: Shared properties propagation via MfeBridge

- **WHEN** an MFE entry receives shared properties
- **THEN** properties SHALL be passed via MfeBridge interface only
- **AND** properties SHALL be updated when parent values change
- **AND** MFE SHALL NOT modify shared properties directly

### Requirement: Actions Chain Mediation

The system SHALL provide an ActionsChainsMediator to deliver action chains between domains and extensions, using the Type System plugin for validation.

**Note on terminology:**
- **ScreensetsRegistry**: Manages MFE lifecycle (loading, mounting, registration, validation)
- **ActionsChainsMediator**: Mediates action chain delivery between domains and extensions

#### Scenario: Action chain type ID validation

- **WHEN** ActionsChainsMediator receives an actions chain
- **THEN** mediator SHALL validate target type ID format
- **AND** mediator SHALL validate action type ID format
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
- **THEN** the action SHALL first be registered via `plugin.register(action)`
- **AND** the action SHALL be validated via `plugin.validateInstance(action.type)`
- **AND** validation SHALL use the schema extracted from the action's type ID
- **AND** invalid actions SHALL cause chain failure

#### Scenario: Extension registration

- **WHEN** an MFE entry is mounted
- **THEN** the entry SHALL register with ActionsChainsMediator
- **AND** registration SHALL provide an `ActionHandler` callback
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

#### Scenario: Module Federation container loading via ESM import

- **WHEN** loading a Module Federation container
- **THEN** the loader SHALL dynamically import the remote entry via `import(manifest.remoteEntry)` (ESM dynamic import)
- **AND** the imported ESM module SHALL be the container (it exports `get` and `init`)
- **AND** the loader SHALL call `container.init(sharedScope)` to initialize shared dependencies
- **AND** the loader SHALL call `container.get(exposedModule)` to retrieve the module factory
- **AND** the loader SHALL cache imported modules per remoteEntry URL to avoid redundant imports

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

#### Scenario: `ActionHandler` throws error

- **WHEN** an `ActionHandler` throws during execution
- **THEN** the action SHALL be considered failed
- **AND** fallback chain SHALL be executed if defined
- **AND** error SHALL be logged with action context

### Requirement: Framework Plugin Propagation

The Type System plugin SHALL propagate from @hai3/screensets through @hai3/framework layers.

#### Scenario: Framework microfrontends plugin (optional config)

**Implementation note**: This scenario describes the target state after Phase 34.2 implementation.

- **WHEN** initializing the @hai3/framework microfrontends plugin
- **THEN** the plugin SHALL accept an optional configuration object with `mfeHandlers?: MfeHandler[]`
- **AND** calling `microfrontends()` with no arguments SHALL be valid (zero handlers registered)
- **AND** calling `microfrontends({ mfeHandlers: [handler] })` SHALL pass the handlers to the registry at build time
- **AND** the plugin SHALL create the ScreensetsRegistry via `screensetsRegistryFactory.build({ typeSystem: gtsPlugin, mfeHandlers })` at framework wiring time
- **AND** the same TypeSystemPlugin instance SHALL be used throughout the application

#### Scenario: Base domains registration via runtime

- **WHEN** base domains need to be registered
- **THEN** they SHALL be registered dynamically via `runtime.registerDomain()` at runtime
- **AND** there SHALL be NO static baseDomains configuration in plugin setup

#### Scenario: Plugin consistency across layers

- **WHEN** an MFE extension accesses the ScreensetsRegistry
- **THEN** all type ID operations SHALL use the same plugin instance
- **AND** type IDs from different layers SHALL be compatible
- **AND** schema validation SHALL be consistent

### Requirement: MFE Bridge Interface

The system SHALL provide bridge interfaces for communication between parent and MFE (child).

#### Scenario: ChildMfeBridge interface

- **WHEN** an MFE component (child) needs to communicate with the parent
- **THEN** the MFE SHALL receive a `ChildMfeBridge` instance via props
- **AND** `ChildMfeBridge` SHALL provide `executeActionsChain(chain): Promise<void>` method as a capability pass-through to the registry's `executeActionsChain()`
- **AND** `ChildMfeBridge` SHALL NOT provide `sendActionsChain()` on the public interface (internal transport, concrete-only)
- **AND** `ChildMfeBridge` SHALL NOT provide `onActionsChain()` on the public interface (internal transport wiring, concrete-only)
- **AND** `ChildMfeBridge` SHALL provide `subscribeToProperty(propertyTypeId: string, callback: (value: unknown) => void): () => void` method. The callback receives the runtime property value (set by `updateDomainProperty`), not the GTS SharedProperty type definition.
- **AND** `ChildMfeBridge` SHALL provide `getProperty(propertyTypeId: string): unknown` method. Returns the runtime property value, not the GTS SharedProperty type definition.

#### Scenario: ParentMfeBridge interface

- **WHEN** the parent creates a bridge for a mounted MFE (child)
- **THEN** `ParentMfeBridge` SHALL be a separate interface from `ChildMfeBridge` (they are independent abstractions for parent and child sides of the bridge)
- **AND** `ParentMfeBridge` SHALL expose `readonly instanceId: string` for identifying the child instance
- **AND** `ParentMfeBridge` SHALL NOT expose `sendActionsChain()` on the public interface (internal transport, concrete-only)
- **AND** `ParentMfeBridge` SHALL NOT expose internal wiring methods (`onChildAction`, `receivePropertyUpdate`) -- these are concrete-only on `ParentMfeBridgeImpl`
- **AND** it SHALL provide `dispose()` for cleanup
- **AND** property updates SHALL be managed at the DOMAIN level via `registry.updateDomainProperty()`, NOT on ParentMfeBridge
- **AND** the parent SHALL use `registry.executeActionsChain()` directly for action chain execution, NOT a method on the bridge

### Requirement: Framework-Agnostic MFE Module Interface

The system SHALL define a framework-agnostic `MfeEntryLifecycle` interface that MFEs must export. This allows MFEs to be written in any framework (React, Vue, Angular, Svelte, Vanilla JS) while maintaining a consistent loading contract.

#### Scenario: MfeEntryLifecycle interface definition

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export an `MfeEntryLifecycle` interface
- **AND** the interface SHALL define `mount(container: Element | ShadowRoot, bridge: TBridge): void | Promise<void>` where `TBridge` defaults to `ChildMfeBridge`
- **AND** the interface SHALL define `unmount(container: Element | ShadowRoot): void | Promise<void>`
- **AND** all MFE entries SHALL export functions conforming to this interface

#### Scenario: MFE module validation on load

- **WHEN** loading an MFE module via Module Federation
- **THEN** the loader SHALL validate that `mount` is a function
- **AND** the loader SHALL validate that `unmount` is a function
- **AND** if either is missing, `MfeLoadError` SHALL be thrown
- **AND** the error message SHALL indicate the required interface

#### Scenario: React MFE implementation

- **WHEN** implementing an MFE in React
- **THEN** the MFE SHALL export a `mount` function that uses `ReactDOM.createRoot(container).render(<App bridge={bridge} />)`
- **AND** the MFE SHALL export an `unmount` function that calls `root.unmount()`
- **AND** the MFE SHALL NOT export a React component directly

#### Scenario: Non-React MFE implementation

MFE packages MAY be implemented in any UI framework. The contract is framework-agnostic: export an object conforming to the `MfeEntryLifecycle` interface (`mount` and `unmount` methods).

#### Scenario: MFE mount receives bridge

- **WHEN** the parent mounts an MFE
- **THEN** the `mount` function SHALL receive the `ChildMfeBridge` instance
- **AND** the MFE SHALL use the bridge for all parent communication
- **AND** the bridge SHALL be available throughout the MFE lifecycle

#### Scenario: MFE unmount cleanup

- **WHEN** the parent unmounts an MFE
- **THEN** the `unmount` function SHALL be called with the same container element
- **AND** the MFE SHALL clean up all DOM content in the container
- **AND** the MFE SHALL unsubscribe from all bridge subscriptions
- **AND** the MFE SHALL release any framework-specific resources

### Requirement: HAI3 Action Constants

The system SHALL export constants for standard HAI3 extension lifecycle actions following the DRY principle. Three generic actions replace domain-specific action types. See [Extension Lifecycle Actions](../../design/mfe-ext-lifecycle-actions.md) for the complete design.

#### Scenario: Standard action type IDs

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export action type ID constants:
  - `HAI3_ACTION_LOAD_EXT`: `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1`
  - `HAI3_ACTION_MOUNT_EXT`: `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1`
  - `HAI3_ACTION_UNMOUNT_EXT`: `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1`
- **AND** there SHALL NOT be separate action types for each domain (no show_popup, show_sidebar, etc.)

#### Scenario: load_ext action payload structure

- **WHEN** dispatching a `load_ext` action
- **THEN** the payload SHALL include `extensionId` (string) - the extension to load
- **AND** the action target SHALL be a domain type ID (set on the Action.target field)

#### Scenario: mount_ext action payload structure

- **WHEN** dispatching a `mount_ext` action
- **THEN** the payload SHALL include `extensionId` (string) - the extension to mount
- **AND** the payload SHALL NOT include a `container` field (container is provided by the domain's ContainerProvider)
- **AND** the action target SHALL be a domain type ID (set on the Action.target field)

#### Scenario: unmount_ext action payload structure

- **WHEN** dispatching an `unmount_ext` action
- **THEN** the payload SHALL include `extensionId` (string) - the extension to unmount
- **AND** the action target SHALL be a domain type ID (set on the Action.target field)

### Requirement: Domain-Specific Action Support

The system SHALL allow domains to declare which HAI3 extension lifecycle actions they support. Not all domains can support all actions semantically. See [Extension Lifecycle Actions - Domain Action Support Matrix](../../design/mfe-ext-lifecycle-actions.md#domain-action-support-matrix) for the complete matrix.

#### Scenario: Domain declares supported actions

- **WHEN** defining an ExtensionDomain
- **THEN** the domain SHALL include an `actions` field listing supported HAI3 actions
- **AND** the `actions` field SHALL be an array of action type IDs (strings)
- **AND** all extension domains MUST support `HAI3_ACTION_LOAD_EXT` and `HAI3_ACTION_MOUNT_EXT` at minimum
- **AND** domains MAY optionally support `HAI3_ACTION_UNMOUNT_EXT`

#### Scenario: Popup domain supports all three lifecycle actions

- **WHEN** defining the popup base domain
- **THEN** `actions` SHALL include `HAI3_ACTION_LOAD_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_MOUNT_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_UNMOUNT_EXT`
- **AND** popup can be preloaded (load), shown (mount), and dismissed (unmount)

#### Scenario: Sidebar domain supports all three lifecycle actions

- **WHEN** defining the sidebar base domain
- **THEN** `actions` SHALL include `HAI3_ACTION_LOAD_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_MOUNT_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_UNMOUNT_EXT`
- **AND** sidebar can be preloaded (load), shown (mount), and hidden (unmount)

#### Scenario: Overlay domain supports all three lifecycle actions

- **WHEN** defining the overlay base domain
- **THEN** `actions` SHALL include `HAI3_ACTION_LOAD_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_MOUNT_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_UNMOUNT_EXT`
- **AND** overlay can be preloaded (load), shown (mount), and dismissed (unmount)

#### Scenario: Screen domain supports load and mount only

- **WHEN** defining the screen base domain
- **THEN** `actions` SHALL include `HAI3_ACTION_LOAD_EXT`
- **AND** `actions` SHALL include `HAI3_ACTION_MOUNT_EXT`
- **AND** `actions` SHALL NOT include `HAI3_ACTION_UNMOUNT_EXT`
- **AND** mount uses swap semantics (unmount current, mount new)
- **AND** you can navigate TO a screen but cannot have "no screen selected"

#### Scenario: ActionsChainsMediator validates domain action support

- **WHEN** ActionsChainsMediator delivers an action to a domain
- **THEN** the mediator SHALL validate the domain supports the action type
- **AND** if the domain does NOT support the action type, delivery SHALL fail
- **AND** `UnsupportedDomainActionError` SHALL be thrown with `actionTypeId` and `domainTypeId`

#### Scenario: UnsupportedDomainActionError class

- **WHEN** an action is not supported by the target domain
- **THEN** `UnsupportedDomainActionError` SHALL be thrown
- **AND** the error SHALL include `actionTypeId` (the unsupported action)
- **AND** the error SHALL include `domainTypeId` (the target domain)
- **AND** the error code SHALL be `'UNSUPPORTED_DOMAIN_ACTION'`

### Requirement: HAI3 Type Constants

The system SHALL define constants for HAI3 MFE base types. Type ID constants (`HAI3_MFE_ENTRY`, `HAI3_MFE_ENTRY_MF`, `HAI3_MF_MANIFEST`, `HAI3_EXT_DOMAIN`, `HAI3_EXT_EXTENSION`, `HAI3_EXT_ACTION`) are internal to the screensets package and are NOT exported from the public barrel. They are used internally by the registry, handlers, and validation code.

#### Scenario: Base type ID constants

- **WHEN** the MFE system performs type validation internally
- **THEN** the system SHALL use base type ID constants:
  - `HAI3_MFE_ENTRY`: `gts.hai3.mfes.mfe.entry.v1~`
  - `HAI3_MFE_ENTRY_MF`: `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~`
  - `HAI3_MF_MANIFEST`: `gts.hai3.mfes.mfe.mf_manifest.v1~`
  - `HAI3_EXT_DOMAIN`: `gts.hai3.mfes.ext.domain.v1~`
  - `HAI3_EXT_EXTENSION`: `gts.hai3.mfes.ext.extension.v1~`
  - `HAI3_EXT_ACTION`: `gts.hai3.mfes.comm.action.v1~`

### Requirement: HAI3 Shared Property Constants

The system SHALL export constants for the built-in shared property type IDs. These are the standard properties that all base extension domains provide.

#### Scenario: Shared property type ID constants

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export shared property type ID constants:
  - `HAI3_SHARED_PROPERTY_THEME`: `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`
  - `HAI3_SHARED_PROPERTY_LANGUAGE`: `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`

#### Scenario: Theme and language GTS instances are built-in

- **WHEN** the GTS plugin is constructed
- **THEN** the theme shared property instance (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`) SHALL be registered
- **AND** the language shared property instance (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`) SHALL be registered
- **AND** both instances SHALL be stored as JSON files under `hai3.mfes/instances/comm/`

### Requirement: Extension Presentation Metadata

The system SHALL support presentation metadata on ScreenExtension instances (derived type for screen-domain extensions) for host UI integration (e.g., navigation menu items). Non-screen-domain extensions use the base Extension type which does not include presentation metadata.

#### Scenario: ScreenExtension with presentation metadata

- **WHEN** registering a screen-domain extension using the `ScreenExtension` derived type
- **THEN** the extension's `presentation` field SHALL be REQUIRED (not optional)
- **AND** the extension's `presentation.label` SHALL be a string (display label)
- **AND** the extension's `presentation.route` SHALL be a string (route path)
- **AND** the extension's `presentation.icon` MAY be a string (icon identifier)
- **AND** the extension's `presentation.order` MAY be a number (sort order)
- **AND** the presentation metadata SHALL be accessible via `runtime.getExtension(extensionId).presentation`

#### Scenario: Non-screen-domain extension without presentation metadata

- **WHEN** registering an extension for a non-screen domain (sidebar, popup, overlay) using the base `Extension` type
- **THEN** the extension SHALL be registered successfully without a `presentation` field
- **AND** `runtime.getExtension(extensionId).presentation` SHALL be `undefined`
- **AND** the base `Extension` type SHALL NOT define a `presentation` field

#### Scenario: Host derives menu from screen extensions

- **WHEN** querying screen extensions via `runtime.getExtensionsForDomain(HAI3_SCREEN_DOMAIN)`
- **THEN** each returned `ScreenExtension` SHALL have a `presentation` field (required on the derived type)
- **AND** the host SHALL build navigation menu items from each screen extension's presentation metadata
- **AND** menu items SHALL be sorted by `presentation.order` (ascending, lower = higher priority)

### Requirement: Shadow DOM Utilities

The system SHALL provide Shadow DOM utilities for style isolation in `@hai3/screensets`.

#### Scenario: createShadowRoot utility

- **WHEN** calling `createShadowRoot(element, options?)`
- **THEN** the function SHALL create and return a ShadowRoot attached to the element
- **AND** `mode` SHALL default to 'open'
- **AND** the function SHALL handle already-attached shadow roots gracefully

#### Scenario: createShadowRoot automatic CSS isolation

- **WHEN** `createShadowRoot()` creates or returns a shadow root
- **THEN** the function SHALL automatically inject CSS isolation styles (`:host { all: initial; display: block; }`) into the shadow root
- **AND** the isolation styles SHALL be injected via a `<style>` element with `id="__hai3-shadow-isolation__"`
- **AND** no CSS (including CSS custom properties) SHALL leak from the host into the shadow root
- **AND** MFEs SHALL start from a completely clean CSS slate with no opt-in required
- **AND** the injection SHALL be idempotent: if a style element with that ID already exists, it SHALL be reused
- **AND** this guarantee SHALL apply to both newly created shadow roots and pre-existing shadow roots

#### Scenario: injectCssVariables utility

- **WHEN** calling `injectCssVariables(shadowRoot, variables)`
- **THEN** the function SHALL inject CSS custom properties into the shadow root
- **AND** the variables SHALL be available to all children within the shadow DOM
- **AND** the function SHALL update existing variables if called multiple times

### Requirement: Shadow DOM Style Isolation (Default Handler)

The default handler (`MfeHandlerMF`) SHALL enforce CSS isolation via Shadow DOM boundaries. The abstract `MfeHandler` class does NOT mandate Shadow DOM -- this is a property of the `MfeHandlerMF` concrete implementation only. Custom `MfeHandler` implementations may choose different isolation strategies.

#### Scenario: Default handler creates Shadow DOM boundary on mount

- **WHEN** `DefaultMountManager` mounts an MFE using the default handler (`MfeHandlerMF`)
- **THEN** the mount manager SHALL create a Shadow DOM boundary on the container element via `container.attachShadow({ mode: 'open' })`
- **AND** the MFE's `mount(container, bridge)` SHALL receive the shadow root, NOT the host element
- **AND** the MFE SHALL render all its content inside the shadow root

#### Scenario: CSS variable isolation via Shadow DOM

- **WHEN** an MFE is mounted inside a Shadow DOM boundary
- **THEN** CSS variables defined on the host application SHALL NOT penetrate into the MFE's shadow root
- **AND** global stylesheets from the host SHALL NOT affect MFE content
- **AND** each MFE instance SHALL be fully responsible for its own styles

#### Scenario: Custom handler may use different isolation

- **WHEN** a custom `MfeHandler` implementation mounts an MFE
- **THEN** the handler MAY choose to skip Shadow DOM creation
- **AND** the handler MAY use iframe isolation, CSS Modules, or any other strategy
- **AND** the abstract `MfeHandler` class SHALL NOT mandate any specific isolation mechanism

### Requirement: Theme and Language as Domain Properties

Theme and language SHALL be communicated to MFEs through domain properties on the bridge. CSS variables do NOT propagate from host to MFE -- the MFE sets its own CSS variables based on domain property values.

#### Scenario: Domain carries theme and language properties

- **WHEN** any of the 4 base extension domains (screen, sidebar, popup, overlay) is defined
- **THEN** the domain's `sharedProperties` SHALL include `HAI3_SHARED_PROPERTY_THEME` (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`)
- **AND** the domain's `sharedProperties` SHALL include `HAI3_SHARED_PROPERTY_LANGUAGE` (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`)
- **AND** when the host changes theme/language, the host SHALL call `registry.updateDomainProperty()` to update these properties
- **AND** all subscribed MFE instances in the domain SHALL receive the update via their bridge

#### Scenario: MFE reads theme from bridge and applies CSS variables

- **WHEN** an MFE instance is mounted and subscribes to the `theme` domain property
- **THEN** the MFE SHALL read the theme value via `bridge.subscribeToProperty(themePropertyId, callback)` or `bridge.getProperty(themePropertyId)`
- **AND** the MFE SHALL apply its own CSS variables inside its Shadow DOM based on the theme value (e.g., `theme: 'dark'` triggers dark mode CSS variables)
- **AND** the MFE SHALL NOT rely on host CSS variables for theming

#### Scenario: MFE reads language from bridge and applies localization

- **WHEN** an MFE instance is mounted and subscribes to the `language` domain property
- **THEN** the MFE SHALL read the language value via `bridge.subscribeToProperty(languagePropertyId, callback)` or `bridge.getProperty(languagePropertyId)`
- **AND** the MFE SHALL apply localization and text direction (RTL/LTR) inside its Shadow DOM based on the language value
- **AND** the MFE SHALL NOT rely on host `html[lang]` or `html[dir]` attributes

### Requirement: Shared Dependencies for MFEs (Tailwind + UIKit)

Each MFE MUST use Tailwind CSS and `@hai3/uikit` for styling. These are added to the Module Federation `shared` config. No inline styles are permitted.

#### Scenario: MFE includes Tailwind and UIKit in shared config

- **WHEN** configuring a Module Federation MFE remote
- **THEN** the `shared` config SHALL include `tailwindcss` with `singleton: false`
- **AND** the `shared` config SHALL include `@hai3/uikit` with `singleton: false`
- **AND** these SHALL be in addition to `react` and `react-dom`

#### Scenario: MFE initializes styles inside Shadow DOM

- **WHEN** an MFE is mounted and receives the shadow root as its container
- **THEN** the MFE SHALL initialize its own Tailwind CSS styles inside the shadow root
- **AND** the MFE SHALL initialize its own UIKit component styles inside the shadow root
- **AND** host Tailwind/UIKit styles SHALL NOT penetrate into the MFE's shadow root

#### Scenario: No inline styles in MFE packages

- **WHEN** writing MFE component code under `src/mfe_packages/`
- **THEN** the MFE SHALL use Tailwind utility classes and UIKit components for styling
- **AND** the MFE SHALL NOT use inline styles (`style` attribute or `style` prop)
- **AND** the monorepo ESLint `no-inline-styles` rule SHALL apply to MFE packages with zero exclusions

### Requirement: MFE Error Classes

The system SHALL provide typed error classes for MFE operations. All error classes are internal to the `@hai3/screensets` package and are NOT exported from the public barrel. Consumers catch errors as standard `Error` instances; the typed classes exist for internal error handling and test assertions via direct path imports.

#### Scenario: MfeLoadError class

- **WHEN** an MFE bundle fails to load
- **THEN** `MfeLoadError` SHALL be thrown with `entryTypeId` and `cause` properties
- **AND** the error message SHALL include the entry type ID

#### Scenario: ContractValidationError class

- **WHEN** contract validation fails between entry and domain
- **THEN** `ContractValidationError` SHALL be thrown with `errors` array
- **AND** each error SHALL include `type`, `details`, and affected type IDs

#### Scenario: ExtensionTypeError class

- **WHEN** extension type hierarchy validation fails (extension type does not derive from domain's extensionsTypeId)
- **THEN** `ExtensionTypeError` SHALL be thrown with type hierarchy details
- **AND** the error SHALL include the extension type ID and required base type ID

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

#### Scenario: DomainValidationError class

- **WHEN** domain registration validation fails (e.g., missing required fields, invalid schema)
- **THEN** `DomainValidationError` SHALL be thrown with `errors` array and `domainTypeId`
- **AND** each error SHALL include `path` and `message` describing the validation failure
- **AND** the error code SHALL be `'DOMAIN_VALIDATION_ERROR'`

#### Scenario: ExtensionValidationError class

- **WHEN** extension registration validation fails (e.g., missing required fields, invalid schema)
- **THEN** `ExtensionValidationError` SHALL be thrown with `errors` array and `extensionTypeId`
- **AND** each error SHALL include `path` and `message` describing the validation failure
- **AND** the error code SHALL be `'EXTENSION_VALIDATION_ERROR'`

#### Scenario: UnsupportedLifecycleStageError class

- **WHEN** a lifecycle hook references a stage not supported by the domain
- **THEN** `UnsupportedLifecycleStageError` SHALL be thrown with `stageId`, `entityId`, and `supportedStages`
- **AND** the error code SHALL be `'UNSUPPORTED_LIFECYCLE_STAGE'`

#### Scenario: NoActionsChainHandlerError class

- **WHEN** internal bridge transport attempts to forward an actions chain to a child that has no handler registered via `ChildMfeBridgeImpl.onActionsChain()`
- **THEN** `NoActionsChainHandlerError` SHALL be thrown with `instanceId`
- **AND** the error message SHALL indicate the child MFE must call `bridge.onActionsChain()` to receive parent actions chains
- **AND** the error code SHALL be `'NO_ACTIONS_CHAIN_HANDLER'`

#### Scenario: BridgeDisposedError class

- **WHEN** an operation (e.g., `executeActionsChain`, `subscribeToProperty`) is attempted on a disposed bridge
- **THEN** `BridgeDisposedError` SHALL be thrown with `instanceId`
- **AND** the error code SHALL be `'BRIDGE_DISPOSED'`

### Requirement: Internal Runtime Coordination

The system SHALL provide PRIVATE coordination mechanisms between parent and MFE runtimes that are NOT exposed to MFE code. The coordination uses a WeakMap-based approach encapsulated within a `RuntimeCoordinator` class (abstract class + concrete implementation), following HAI3's SOLID OOP pattern. The `ScreensetsRegistry` holds a `private readonly coordinator: RuntimeCoordinator` field (Dependency Inversion Principle).

#### Scenario: RuntimeCoordinator uses WeakMap

- **WHEN** the parent runtime and MFE runtime need to coordinate
- **THEN** coordination SHALL use a `RuntimeCoordinator` abstract class with a `WeakMapRuntimeCoordinator` concrete implementation
- **AND** RuntimeCoordinator SHALL NOT use window globals
- **AND** both abstract and concrete classes SHALL be internal (NOT exported from public barrel)
- **AND** MFE code SHALL only see the ChildMfeBridge interface

#### Scenario: RuntimeConnection lifecycle

- **WHEN** an MFE is mounted, the system SHALL call `coordinator.register(container, connection)` internally
- **AND** when unmounted, `coordinator.unregister(container)` SHALL remove the entry
- **AND** garbage collection SHALL be automatic when the container element is removed (WeakMap semantics)

#### Scenario: ChildMfeBridge is the only exposed interface

- **WHEN** an MFE component is rendered
- **THEN** the only communication interface visible to MFE code SHALL be ChildMfeBridge
- **AND** ChildMfeBridge SHALL provide: `executeActionsChain`, `subscribeToProperty`, `getProperty`
- **AND** ChildMfeBridge SHALL NOT expose: RuntimeCoordinator, TypeSystemPlugin, schema registry, internal state

#### Scenario: Internal coordination for property updates

- **WHEN** the parent updates a shared property value
- **THEN** RuntimeCoordinator SHALL internally propagate the update
- **AND** ChildMfeBridge SHALL notify subscribers via `subscribeToProperty` callbacks
- **AND** the internal coordination mechanism SHALL NOT be visible to MFE code

#### Scenario: Internal coordination for action delivery

- **WHEN** the parent sends an action chain to an MFE
- **THEN** RuntimeCoordinator SHALL internally route the action
- **AND** ChildMfeBridge SHALL receive the action and invoke the MFE's handler
- **AND** the routing mechanism SHALL NOT be visible to MFE code

### Requirement: Module Federation Shared Configuration

The system SHALL configure Module Federation to support framework-agnostic MFEs using the `singleton` flag to control instance sharing. HAI3's default handler uses `singleton: false` for isolation; custom handlers may use `singleton: true` for internal MFEs when sharing is beneficial.

#### Scenario: SharedDependencyConfig structure

- **WHEN** defining a shared dependency in MfManifest
- **THEN** SharedDependencyConfig SHALL include `name` (package name, required)
- **AND** SharedDependencyConfig MAY include `requiredVersion` (semver range, optional)
- **AND** SharedDependencyConfig MAY include `singleton` (boolean, optional, default: false)
- **AND** `singleton: false` SHALL mean code is shared but each MFE instance gets its own runtime instance
- **AND** `singleton: true` SHALL mean code is shared AND the same instance is used everywhere

#### Scenario: Default handler uses singleton false for isolation

- **GIVEN** the default MF handler (`MfeHandlerMF`)
- **THEN** shared dependencies SHALL use `singleton: false` (the default)
- **AND** each MFE instance SHALL receive its own runtime instance from the shared code (code sharing + instance isolation)
- **AND** each MFE instance SHALL have its own `TypeSystemPlugin`, React context, hooks state, and reconciler

#### Scenario: Custom handler may use singleton true

- **GIVEN** a custom `MfeHandler` implementation for internal MFEs
- **THEN** shared dependencies MAY use `singleton: true` if the handler guarantees version alignment
- **AND** all consumers SHALL share the same instance when `singleton: true`
- **AND** this is appropriate for truly stateless libraries (lodash, date-fns, uuid) or when the handler enforces compatible versions

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

- **WHEN** executing an actions chain internally via the `ActionsChainsMediator`
- **THEN** the mediator SHALL support `chainTimeout` (optional number, ms) to limit total chain execution time
- **AND** action timeouts SHALL be resolved from action and domain type definitions (not from the public API)

#### Scenario: ActionsChainsConfig mediator configuration

- **WHEN** configuring the ActionsChainsMediator (internal)
- **THEN** `ActionsChainsConfig` SHALL include ONLY `chainTimeout` (optional, default: 120000ms)
- **AND** `ActionsChainsConfig` SHALL NOT include `actionTimeout` (action timeouts come from types)

#### Scenario: Public executeActionsChain method signatures

- **WHEN** using `registry.executeActionsChain(chain)` or `childBridge.executeActionsChain(chain)`
- **THEN** the method SHALL accept a single `ActionsChain` parameter
- **AND** the method SHALL return `Promise<void>`
- **AND** action timeouts SHALL be resolved internally from action and domain type definitions
- **AND** on timeout or any failure: execute fallback chain if defined

#### Scenario: executeActionsChain error visibility on chain failure

- **GIVEN** a registered domain with extensions
- **WHEN** `registry.executeActionsChain(chain)` executes a chain that fails (e.g., handler throws, target not found)
- **THEN** the method SHALL log `console.error` with a message containing `"Actions chain failed"`, the error description, and the execution path
- **AND** the method SHALL still return a resolved `Promise<void>` (not reject)
- **AND** the method SHALL NOT throw an error (fire-and-forget callers must not break)

#### Scenario: executeActionsChain no error log on success

- **GIVEN** a registered domain with extensions
- **WHEN** `registry.executeActionsChain(chain)` executes a chain that succeeds
- **THEN** the method SHALL NOT log any `console.error` messages

### Requirement: Dynamic Registration Model

The system SHALL support dynamic registration of extensions, domains, and MFEs at any time during the application lifecycle, not just at initialization. Entity fetching is outside MFE system scope. See [System Boundary](../../design/overview.md#system-boundary).

#### Scenario: Register extension dynamically after user action

- **WHEN** a user enables a feature (e.g., toggles a widget in settings)
- **THEN** the system SHALL allow calling `runtime.registerExtension(extension)` at any time
- **AND** the extension SHALL be validated against schema and contract before registration
- **AND** the extension SHALL be available for mounting immediately after registration

#### Scenario: Register extension after backend API response

- **WHEN** application code fetches extensions configuration from backend API
- **THEN** application code SHALL call `runtime.registerExtension()` for each fetched extension
- **AND** newly registered extensions SHALL be immediately available
- **AND** the MFE system SHALL NOT provide fetch methods (fetching is application responsibility)

#### Scenario: Unregister extension when user disables feature

- **WHEN** a user disables a feature at runtime
- **THEN** the system SHALL allow calling `runtime.unregisterExtension(extensionId)`
- **AND** if the extension's MFE is currently mounted, it SHALL be unmounted first
- **AND** the bridge SHALL be disposed

#### Scenario: Hot-swap extension at runtime

- **WHEN** the system needs to swap an extension implementation (e.g., A/B testing)
- **THEN** the system SHALL support unregistering the old extension
- **AND** the system SHALL support registering a new extension with the same ID
- **AND** the new extension MAY reference a different entry (different MFE)
- **AND** the MFE SHALL be reloaded with the new implementation

#### Scenario: Register domain dynamically

- **WHEN** a screenset needs to add a new extension point at runtime
- **THEN** the system SHALL allow calling `runtime.registerDomain(domain, containerProvider, onInitError?)` at any time
- **AND** the `containerProvider` parameter SHALL be a `ContainerProvider` instance that supplies DOM containers for extensions in this domain
- **AND** the domain SHALL be validated against schema before registration
- **AND** extensions MAY then be registered for this domain

#### Scenario: Unregister domain dynamically

- **WHEN** an extension point is no longer needed
- **THEN** the system SHALL allow calling `runtime.unregisterDomain(domainId)`
- **AND** all extensions in this domain SHALL be unregistered first
- **AND** all mounted MFEs in this domain SHALL be unmounted

#### Scenario: registerExtension method contract

- **WHEN** calling `runtime.registerExtension(extension)`
- **THEN** the method SHALL return `Promise<void>`
- **AND** the extension SHALL be validated against GTS schema
- **AND** the domain MUST exist (registered earlier or dynamically)
- **AND** the contract SHALL be validated (entry vs domain)
- **AND** the extension type hierarchy SHALL be validated against domain's extensionsTypeId (if specified)

#### Scenario: unregisterExtension method contract

- **WHEN** calling `runtime.unregisterExtension(extensionId)`
- **THEN** the method SHALL return `Promise<void>`
- **AND** if extension is mounted, the MFE SHALL be unmounted first
- **AND** the extension SHALL be removed from registry and domain's extension set
- **AND** the operation SHALL be idempotent (no error if already unregistered)

#### Scenario: registerDomain method contract

- **WHEN** calling `runtime.registerDomain(domain, containerProvider, onInitError?)`
- **THEN** the method SHALL return `void` (synchronous)
- **AND** the `containerProvider` SHALL be a `ContainerProvider` instance
- **AND** `onInitError` SHALL be an optional callback `(error: Error) => void`
- **AND** the domain SHALL be validated against GTS schema
- **AND** the `containerProvider` SHALL be stored alongside the domain state
- **AND** if `onInitError` is provided, it SHALL be called when the fire-and-forget lifecycle `init` stage errors occur for extensions in this domain
- **AND** `onInitError` SHALL NOT be called for unmount errors or other lifecycle errors

#### Scenario: unregisterDomain method contract

- **WHEN** calling `runtime.unregisterDomain(domainId)`
- **THEN** the method SHALL return `Promise<void>`
- **AND** all extensions in domain SHALL be unregistered first
- **AND** the operation SHALL be idempotent

#### Scenario: Mount extension on demand

- **WHEN** an extension is registered but not yet mounted
- **THEN** the system SHALL allow mounting via `runtime.executeActionsChain()` with `HAI3_ACTION_MOUNT_EXT` action targeting the domain
- **AND** the extension MUST be registered before mounting (validation dependency)
- **AND** the MFE bundle SHALL be loaded via MfeHandler (internally by MountManager)
- **AND** a bridge connection SHALL be created

#### Scenario: Unmount extension

- **WHEN** an extension is no longer needed but should remain registered
- **THEN** the system SHALL allow unmounting via `runtime.executeActionsChain()` with `HAI3_ACTION_UNMOUNT_EXT` action targeting the domain
- **AND** the bridge SHALL be disposed
- **AND** the extension SHALL remain registered for future mounting
- **AND** the bundle SHALL remain loaded (cached for remounting)

#### Scenario: Load vs mount distinction

Loading fetches the bundle; mounting renders to DOM. See [Load vs Mount](../../design/registry-runtime.md#load-vs-mount) for details.

- **WHEN** understanding the difference between load and mount
- **THEN** the load operation SHALL fetch and initialize the JavaScript bundle only
- **AND** the mount operation SHALL render the loaded extension to a DOM container
- **AND** an extension CAN be loaded but not mounted (preloading scenario)
- **AND** these operations are NOT exposed as methods on the abstract `ScreensetsRegistry` -- they are internal to `MountManager` and accessed via `ExtensionLifecycleActionHandler` callbacks

### Requirement: Container Provider Abstraction

The system SHALL provide a `ContainerProvider` abstract class that shifts DOM container management from action callers to the domain. See [Extension Lifecycle Actions - ContainerProvider](../../design/mfe-ext-lifecycle-actions.md#container-provider-abstraction) for the complete design.

#### Scenario: ContainerProvider abstract class definition

- **WHEN** importing `@hai3/screensets`
- **THEN** the package SHALL export a `ContainerProvider` abstract class
- **AND** the class SHALL define `abstract getContainer(extensionId: string): Element`
- **AND** the class SHALL define `abstract releaseContainer(extensionId: string): void`

#### Scenario: ContainerProvider registered with domain

- **WHEN** calling `runtime.registerDomain(domain, containerProvider, onInitError?)`
- **THEN** the `containerProvider` parameter SHALL be required
- **AND** the containerProvider SHALL be stored alongside the domain state
- **AND** the containerProvider SHALL be passed to the `ExtensionLifecycleActionHandler` at construction time

#### Scenario: mount_ext uses ContainerProvider

- **WHEN** the `ExtensionLifecycleActionHandler` handles a `mount_ext` action
- **THEN** the handler SHALL call `containerProvider.getContainer(extensionId)` to obtain the DOM container
- **AND** the `mount_ext` payload SHALL NOT contain a `container` field
- **AND** the handler SHALL be the single owner of all `ContainerProvider` interactions

#### Scenario: unmount_ext releases container

- **WHEN** the `ExtensionLifecycleActionHandler` handles an `unmount_ext` action
- **THEN** after unmount completes, the handler SHALL call `containerProvider.releaseContainer(extensionId)`

#### Scenario: swap-semantics domain mount_ext

- **WHEN** `mount_ext` is dispatched on a swap-semantics domain (screen domain) with a currently mounted extension
- **THEN** the handler SHALL unmount the current extension, release its container, obtain a new container, and mount the new extension
- **AND** the transition SHALL be seamless (no visible empty state)

#### Scenario: getContainer failure

- **WHEN** `containerProvider.getContainer(extensionId)` throws
- **THEN** the mount operation SHALL fail and the fallback chain SHALL be executed if defined

#### Scenario: RefContainerProvider (React layer)

- **WHEN** a React-rendered extension domain is registered
- **THEN** `RefContainerProvider` (from `@hai3/react`) SHALL wrap the `ExtensionDomainSlot` ref
- **AND** `RefContainerProvider` and `ExtensionDomainSlot` SHALL live in `@hai3/react`, NOT in `@hai3/screensets`
- **AND** the `ExtensionDomainSlot` SHALL NOT call `registerDomain()` (domain registration is framework-level code)

### Requirement: GTS Package Query API

The system SHALL provide query methods for discovering registered GTS packages from extensions.

#### Scenario: Empty registry returns empty packages array

- **GIVEN** no extensions are registered
- **WHEN** `registry.getRegisteredPackages()` is called
- **THEN** it SHALL return an empty array

#### Scenario: Extensions from two packages returns both in order

- **GIVEN** extensions from two GTS packages are registered
- **AND** the first extension registered has package 'hai3.demo'
- **AND** the second extension registered has package 'hai3.other'
- **WHEN** `registry.getRegisteredPackages()` is called
- **THEN** it SHALL return `['hai3.demo', 'hai3.other']` in discovery order

#### Scenario: getExtensionsForPackage returns only matching extensions

- **GIVEN** extensions from 'hai3.demo' are registered
- **AND** extensions from 'hai3.other' are registered
- **WHEN** `registry.getExtensionsForPackage('hai3.demo')` is called
- **THEN** it SHALL return only extensions belonging to 'hai3.demo'
- **AND** it SHALL NOT return extensions from 'hai3.other'

#### Scenario: Last extension unregistered removes package

- **GIVEN** one extension from 'hai3.demo' is registered
- **AND** `registry.getRegisteredPackages()` returns `['hai3.demo']`
- **WHEN** the extension is unregistered
- **AND** `registry.getRegisteredPackages()` is called
- **THEN** it SHALL return an empty array
- **AND** the package SHALL be automatically removed

#### Scenario: extractGtsPackage utility extracts package from entity ID

- **GIVEN** an entity ID `'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.home.v1'`
- **WHEN** `extractGtsPackage(entityId)` is called
- **THEN** it SHALL return `'hai3.demo'`

#### Scenario: extractGtsPackage throws on invalid entity ID

- **GIVEN** an entity ID with no `~` delimiter
- **WHEN** `extractGtsPackage(entityId)` is called
- **THEN** it SHALL throw an error indicating the entity ID is invalid

#### Scenario: extractGtsPackage throws on schema type ID

- **GIVEN** an entity ID ending with `~` (schema type ID)
- **WHEN** `extractGtsPackage(entityId)` is called
- **THEN** it SHALL throw an error indicating schema type IDs are not supported

#### Scenario: getExtensionsForPackage returns empty array for unknown package

- **GIVEN** no extensions from 'hai3.unknown' are registered
- **WHEN** `registry.getExtensionsForPackage('hai3.unknown')` is called
- **THEN** it SHALL return an empty array
