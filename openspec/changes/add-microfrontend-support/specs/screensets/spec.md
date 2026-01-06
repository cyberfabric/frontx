## ADDED Requirements

### Requirement: Type System Plugin Abstraction

The system SHALL abstract the Type System as a pluggable dependency.

#### Scenario: Plugin interface definition

- **WHEN** @hai3/screensets is imported
- **THEN** the package SHALL export a `TypeSystemPlugin` interface
- **AND** the interface SHALL define type ID operations (`parseTypeId`, `isValidTypeId`, `buildTypeId`)
- **AND** the interface SHALL define schema registry operations (`registerSchema`, `validateInstance`, `getSchema`)
- **AND** the interface SHALL define query operations (`query`, `listAll`)
- **AND** the interface MAY define optional compatibility checking (`checkCompatibility`)

#### Scenario: GTS plugin as default implementation

- **WHEN** a developer imports `@hai3/screensets/plugins/gts`
- **THEN** the package SHALL export a `gtsTypeSystem` implementing `TypeSystemPlugin`
- **AND** the plugin SHALL use `@globaltypesystem/gts-ts` internally
- **AND** the plugin SHALL handle GTS type ID format: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### Scenario: GTS type ID validation

- **WHEN** validating a GTS type ID
- **THEN** the plugin SHALL accept valid type IDs like `gts.hai3.screensets.mfe.definition.v1~`
- **AND** the plugin SHALL reject invalid formats like `gts.hai3.mfe.v1~` (missing segments)
- **AND** the plugin SHALL reject formats without trailing tilde
- **AND** the plugin SHALL reject formats without version prefix "v"

#### Scenario: Plugin injection at initialization

- **WHEN** creating a screensets orchestrator
- **THEN** the `ScreensetsOrchestratorConfig` SHALL require a `typeSystem` parameter
- **AND** the orchestrator SHALL use the plugin for all type ID operations
- **AND** the orchestrator SHALL use the plugin for schema validation
- **AND** initialization without a plugin SHALL throw an error

#### Scenario: HAI3 type registration via plugin

- **WHEN** the orchestrator initializes with a plugin
- **THEN** the orchestrator SHALL register HAI3 MFE types via `plugin.registerSchema()`
- **AND** registered types SHALL include:
  - `gts.hai3.screensets.mfe.definition.v1~` (MfeDefinition)
  - `gts.hai3.screensets.mfe.entry.v1~` (MfeEntry)
  - `gts.hai3.screensets.ext.domain.v1~` (ExtensionDomain)
  - `gts.hai3.screensets.ext.extension.v1~` (Extension)
  - `gts.hai3.screensets.ext.shared_property.v1~` (SharedProperty)
  - `gts.hai3.screensets.ext.action.v1~` (Action)
  - `gts.hai3.screensets.ext.actions_chain.v1~` (ActionsChain)

#### Scenario: Custom plugin implementation

- **WHEN** a developer implements a custom `TypeSystemPlugin`
- **THEN** the implementation SHALL work with the orchestrator
- **AND** type ID format SHALL be determined by the custom plugin
- **AND** validation behavior SHALL be determined by the custom plugin

#### Scenario: GtsMetadata extraction from type ID

- **WHEN** parsing a GTS type ID like `gts.hai3.screensets.mfe.definition.v1~`
- **THEN** the system SHALL extract `vendor` as "hai3"
- **AND** the system SHALL extract `package` as "screensets"
- **AND** the system SHALL extract `namespace` as "mfe"
- **AND** the system SHALL extract `type` as "definition"
- **AND** the system SHALL extract `version.major` as 1
- **AND** the system SHALL store the full `typeId`

#### Scenario: GtsMetadata extraction with minor version

- **WHEN** parsing a GTS type ID like `gts.hai3.screensets.mfe.definition.v1.2~`
- **THEN** the system SHALL extract `version.major` as 1
- **AND** the system SHALL extract `version.minor` as 2

#### Scenario: x-gts-ref validation in schemas

- **WHEN** validating a schema with `x-gts-ref` property
- **THEN** the system SHALL verify referenced type IDs exist in the registry
- **AND** the system SHALL validate that referenced type IDs follow the correct format
- **AND** wildcard patterns like `gts.hai3.screensets.mfe.entry.v1~*` SHALL match any instance of that type

### Requirement: MFE TypeScript Type System

The system SHALL define internal TypeScript types for microfrontend architecture using a symmetric contract model. All types extend `GtsMetadata` which contains data extracted from the GTS type ID.

#### Scenario: GtsMetadata interface

- **WHEN** defining any MFE type
- **THEN** the type SHALL extend `GtsMetadata` interface
- **AND** `GtsMetadata` SHALL include `typeId`, `vendor`, `package`, `namespace`, `type`, and `version`
- **AND** `version` SHALL contain `major` (required) and `minor` (optional)

#### Scenario: MFE type definition

- **WHEN** a vendor creates an MFE manifest
- **THEN** the manifest SHALL conform to `MfeDefinition` TypeScript interface (extends GtsMetadata)
- **AND** the manifest SHALL include name, url, and entries array
- **AND** entries SHALL reference valid MfeEntry type IDs (e.g., `gts.vendor.package.mfe.entry.v1~`)

#### Scenario: MFE entry type definition

- **WHEN** a vendor defines an MFE entry point
- **THEN** the entry SHALL conform to `MfeEntry` TypeScript interface (extends GtsMetadata)
- **AND** the entry SHALL specify path, requiredProperties, optionalProperties, actions, and domainActions
- **AND** requiredProperties and optionalProperties SHALL reference SharedProperty type IDs
- **AND** actions and domainActions SHALL reference Action type IDs

#### Scenario: Extension domain type definition

- **WHEN** a host defines an extension domain
- **THEN** the domain SHALL conform to `ExtensionDomain` TypeScript interface (extends GtsMetadata)
- **AND** the domain SHALL specify sharedProperties, actions, extensionsActions, and uiMetadataContract
- **AND** sharedProperties SHALL reference SharedProperty type IDs
- **AND** actions and extensionsActions SHALL reference Action type IDs
- **AND** uiMetadataContract SHALL be a valid JSON Schema

#### Scenario: Extension binding type definition

- **WHEN** binding an MFE entry to a domain
- **THEN** the binding SHALL conform to `Extension` TypeScript interface (extends GtsMetadata)
- **AND** the binding SHALL reference valid domain and entry type IDs
- **AND** domain SHALL reference an ExtensionDomain type ID (e.g., `gts.hai3.screensets.ext.domain.v1~`)
- **AND** entry SHALL reference an MfeEntry type ID (e.g., `gts.hai3.screensets.mfe.entry.v1~`)
- **AND** uiMetadata SHALL conform to the domain's uiMetadataContract

#### Scenario: Shared property type definition

- **WHEN** defining a shared property
- **THEN** the property SHALL conform to `SharedProperty` TypeScript interface (extends GtsMetadata)
- **AND** the property SHALL specify name and schema
- **AND** the property SHALL NOT include a default value

#### Scenario: Action type definition

- **WHEN** defining an action
- **THEN** the action SHALL conform to `Action` TypeScript interface (extends GtsMetadata)
- **AND** the action SHALL specify name and payloadSchema
- **AND** payloadSchema SHALL be a valid JSON Schema

#### Scenario: Actions chain type definition

- **WHEN** defining an actions chain
- **THEN** the chain SHALL conform to `ActionsChain` TypeScript interface (extends GtsMetadata)
- **AND** the chain SHALL specify target and action
- **AND** target SHALL be a valid ExtensionDomain or MfeEntry type ID
- **AND** action SHALL be a valid Action type ID
- **AND** payload SHALL be optional
- **AND** next and fallback SHALL be optional recursive ActionsChain references

### Requirement: Contract Matching Validation

The system SHALL validate that MFE entries are compatible with extension domains before injection.

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

### Requirement: Isolated State Instances

Each MFE instance SHALL have its own isolated HAI3 state instance separate from the host.

#### Scenario: MFE state isolation

- **WHEN** an MFE is loaded and mounted
- **THEN** the MFE SHALL receive its own HAI3 state instance
- **AND** the MFE state SHALL be independent of host state
- **AND** the MFE SHALL NOT have direct access to host state

#### Scenario: Host state isolation

- **WHEN** an MFE is mounted in the host
- **THEN** the host state SHALL NOT be modified by MFE state changes
- **AND** the host SHALL NOT have direct access to MFE state

#### Scenario: Shared properties injection

- **WHEN** an MFE entry receives shared properties
- **THEN** properties SHALL be passed as read-only props
- **AND** properties SHALL be re-injected when host values change
- **AND** MFE SHALL NOT modify shared properties directly

### Requirement: Actions Chain Orchestration

The system SHALL provide an orchestrator to deliver action chains between domains and extensions, using the Type System plugin for validation.

#### Scenario: Action chain type ID validation

- **WHEN** orchestrator receives an actions chain
- **THEN** orchestrator SHALL validate target type ID via `plugin.isValidTypeId()`
- **AND** orchestrator SHALL validate action type ID via `plugin.isValidTypeId()`
- **AND** invalid type IDs SHALL cause chain failure

#### Scenario: Action chain execution success path

- **WHEN** orchestrator executes an actions chain
- **AND** target successfully handles the action
- **AND** chain has a `next` property
- **THEN** orchestrator SHALL execute the next chain
- **AND** next chain's target SHALL receive its action

#### Scenario: Action chain execution failure path

- **WHEN** orchestrator executes an actions chain
- **AND** target fails to handle the action
- **AND** chain has a `fallback` property
- **THEN** orchestrator SHALL execute the fallback chain
- **AND** fallback chain's target SHALL receive its action

#### Scenario: Action chain termination

- **WHEN** orchestrator executes an actions chain
- **AND** chain has no `next` property (on success)
- **OR** chain has no `fallback` property (on failure)
- **THEN** chain execution SHALL terminate
- **AND** orchestrator SHALL return completion result

#### Scenario: Action payload validation via plugin

- **WHEN** orchestrator delivers an action
- **THEN** payload SHALL be validated via `plugin.validateInstance()`
- **AND** validation SHALL use the action's registered payloadSchema
- **AND** invalid payloads SHALL cause chain failure

#### Scenario: Extension registration

- **WHEN** an MFE entry is mounted
- **THEN** the entry SHALL register with orchestrator
- **AND** registration SHALL provide action handler callback
- **AND** handler SHALL receive actions for that extension

#### Scenario: Extension unregistration

- **WHEN** an MFE entry is unmounted
- **THEN** the entry SHALL unregister from orchestrator
- **AND** pending actions SHALL be cancelled or failed
- **AND** orchestrator SHALL not deliver actions to unmounted entries

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
- **AND** MFE entries compatible with the domain SHALL be injectable
- **AND** domain contracts SHALL be validated at registration

#### Scenario: Nested extension injection

- **WHEN** an MFE entry is injected into a vendor-defined domain
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
- **AND** the plugin SHALL pass the Type System plugin to the screensets orchestrator
- **AND** the same plugin instance SHALL be used throughout the application

#### Scenario: Base domains registration via plugin

- **WHEN** the framework microfrontends plugin initializes
- **AND** baseDomains are specified in configuration
- **THEN** base domain type IDs SHALL be built via `plugin.buildTypeId()`
- **AND** base domain schemas SHALL be registered via `plugin.registerSchema()`

#### Scenario: Plugin consistency across layers

- **WHEN** an MFE extension accesses the orchestrator
- **THEN** all type ID operations SHALL use the same plugin instance
- **AND** type IDs from different layers SHALL be compatible
- **AND** schema validation SHALL be consistent
