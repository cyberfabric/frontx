## MODIFIED Requirements

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
- **AND** sharedProperties SHALL reference SharedProperty type IDs (GTS schema IDs ending with `~`)
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

#### Scenario: Shared property base type definition

- **WHEN** defining the `shared_property.v1~` GTS base schema
- **THEN** the schema SHALL be an abstract base type that derived types constrain
- **AND** the schema SHALL have an `id` field (`x-gts-ref: /$id`)
- **AND** the schema SHALL have a `value` property with an unconstrained schema (`{}`) — any JSON value is valid at the base level
- **AND** the `value` property SHALL NOT be required at the base schema level
- **AND** the schema SHALL NOT have a `supportedValues` field
- **AND** derived schemas SHALL constrain the `value` property to specific types using `allOf` derivation (same pattern as `extension_screen.v1~` deriving from `extension.v1~`)

#### Scenario: Shared property constants are GTS type IDs

- **WHEN** defining shared property constants (`HAI3_SHARED_PROPERTY_THEME`, `HAI3_SHARED_PROPERTY_LANGUAGE`)
- **THEN** each constant SHALL be a GTS type/schema ID (ending with `~`)
- **AND** `HAI3_SHARED_PROPERTY_THEME` SHALL be `'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~'`
- **AND** `HAI3_SHARED_PROPERTY_LANGUAGE` SHALL be `'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~'`
- **AND** domain `sharedProperties` arrays SHALL reference these type IDs

#### Scenario: Derived shared property schema for theme

- **WHEN** defining the theme shared property type
- **THEN** the type SHALL be a GTS derived schema (not an instance) using `allOf` derivation from the `shared_property.v1~` base
- **AND** the schema SHALL constrain the `value` property to `{ "type": "string", "enum": ["default", "light", "dark", "dracula", "dracula-large"] }`
- **AND** the `$id` SHALL be `gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~`
- **AND** the schema SHALL have a `$schema` field (GTS Rule A: presence of `$schema` marks it as a schema, not an instance)

#### Scenario: Derived shared property schema for language

- **WHEN** defining the language shared property type
- **THEN** the type SHALL be a GTS derived schema (not an instance) using `allOf` derivation from the `shared_property.v1~` base
- **AND** the schema SHALL constrain the `value` property to `{ "type": "string", "enum": [...] }` containing all 36 ISO 639-1 language codes from the `Language` enum in `@hai3/i18n`
- **AND** the `$id` SHALL be `gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~`
- **AND** the schema SHALL have a `$schema` field

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
