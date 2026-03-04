## ADDED Requirements

### Requirement: Shared Property Value Validation

The system SHALL validate shared property values at runtime against the property's GTS-derived schema using the existing `TypeSystemPlugin.register()` + `TypeSystemPlugin.validateInstance()` mechanism — the same pattern used by actions chains. No custom validation logic SHALL be introduced — validation SHALL use gts-ts exclusively.

#### Scenario: Valid property value passes validation

- **WHEN** the host calls `updateDomainProperty(domainId, propertyTypeId, value)` with a value that conforms to the property's derived schema (e.g., `"dark"` for theme)
- **THEN** the system SHALL construct a valid chained GTS instance ID by appending a deterministic instance segment to the property type ID: `ephemeralId = "${propertyTypeId}hai3.mfes.comm.runtime.v1"` (e.g., `"gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~hai3.mfes.comm.runtime.v1"`)
- **AND** the system SHALL register the named instance via `typeSystem.register({ id: ephemeralId, value })`
- **AND** the system SHALL validate the instance via `typeSystem.validateInstance(ephemeralId)`
- **AND** gts-ts SHALL extract the schema from the chained instance ID (the rightmost `~`-terminated prefix is the derived schema) and the `value` field conforms to the schema's constraint
- **AND** the property value SHALL be stored and propagated to all subscribers

#### Scenario: Invalid property value is rejected

- **WHEN** the host calls `updateDomainProperty(domainId, propertyTypeId, value)` with a value that violates the property's derived schema (e.g., `"neon"` for theme when the schema defines `enum: ["default", "light", "dark", "dracula", "dracula-large"]`)
- **THEN** the system SHALL construct a valid chained GTS instance ID: `ephemeralId = "${propertyTypeId}hai3.mfes.comm.runtime.v1"` and register the named instance via `typeSystem.register({ id: ephemeralId, value })`
- **AND** the system SHALL validate the instance via `typeSystem.validateInstance(ephemeralId)`
- **AND** validation SHALL fail because gts-ts extracts the schema from the chained ID and the `value` field does not conform to the derived schema's constraint
- **AND** `updateDomainProperty()` SHALL throw an error containing the validation failure details
- **AND** the property value SHALL NOT be stored or propagated

#### Scenario: Validation uses same pattern as actions chains

- **WHEN** validating a shared property value
- **THEN** the system SHALL use the exact same `register()` + `validateInstance()` pattern used by `DefaultActionsChainsMediator` for action validation and by `registerDomain()` / `registerExtension()` for entity validation
- **AND** the system SHALL NOT introduce any new methods on `TypeSystemPlugin`
- **AND** the system SHALL NOT use a `type` field on the instance — schema resolution SHALL be from the chained GTS instance ID
- **AND** the system SHALL NOT perform manual schema extraction, custom Ajv calls, or any validation outside of gts-ts

#### Scenario: Unregistered property schema is a configuration error

- **WHEN** the host calls `updateDomainProperty(domainId, propertyTypeId, value)` where `propertyTypeId` refers to a derived schema that has NOT been registered in the GTS store (e.g., a custom `gts...color.v1~` property type whose schema was never loaded)
- **THEN** the system SHALL construct a chained GTS instance ID `ephemeralId = "${propertyTypeId}hai3.mfes.comm.runtime.v1"` and attempt to register the named instance via `typeSystem.register({ id: ephemeralId, value })`
- **AND** `typeSystem.validateInstance(ephemeralId)` SHALL return a validation failure because gts-ts cannot resolve the schema extracted from the chained ID
- **AND** `updateDomainProperty()` SHALL throw an error indicating the schema could not be found for the property type
- **AND** the property value SHALL NOT be stored or propagated
- **AND** this SHALL be treated as a configuration error — all declared property types must have their derived schemas registered before use

#### Scenario: Re-registration updates the GTS store instance

- **WHEN** `updateDomainProperty()` is called multiple times for the same property type ID with different values
- **THEN** each call SHALL re-register the named instance `{ id: ephemeralId, value }` in the GTS store (overwriting the previous instance because the deterministic `ephemeralId` is the same for a given property type)
- **AND** each call SHALL validate the latest value against the derived schema extracted from the chained ID
- **AND** the GTS store SHALL NOT accumulate duplicate entries (the instance ID is deterministic per property type: `${propertyTypeId}hai3.mfes.comm.runtime.v1`)
