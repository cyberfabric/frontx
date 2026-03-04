## ADDED Requirements

### Requirement: Shared Property Value Validation

The system SHALL validate shared property values at runtime against the property's GTS-derived schema using the existing `TypeSystemPlugin.register()` + `TypeSystemPlugin.validateInstance()` mechanism. No custom validation logic SHALL be introduced — validation SHALL use gts-ts exclusively.

#### Scenario: Valid property value passes validation

- **WHEN** the host calls `updateDomainProperty(domainId, propertyTypeId, value)` with a value that conforms to the property's derived schema (e.g., `"dark"` for theme)
- **THEN** the system SHALL construct a GTS instance `{ id: propertyTypeId, value }` and register it via `typeSystem.register()`
- **AND** the system SHALL validate the instance via `typeSystem.validateInstance(propertyTypeId)`
- **AND** validation SHALL pass because gts-ts resolves the derived schema (including `allOf` base) and the `value` field conforms to the schema's constraint
- **AND** the property value SHALL be stored and propagated to all subscribers

#### Scenario: Invalid property value is rejected

- **WHEN** the host calls `updateDomainProperty(domainId, propertyTypeId, value)` with a value that violates the property's derived schema (e.g., `"neon"` for theme when the schema defines `enum: ["default", "light", "dark", "dracula", "dracula-large"]`)
- **THEN** the system SHALL construct a GTS instance `{ id: propertyTypeId, value }` and register it via `typeSystem.register()`
- **AND** the system SHALL validate the instance via `typeSystem.validateInstance(propertyTypeId)`
- **AND** validation SHALL fail because the `value` field does not conform to the derived schema's constraint
- **AND** `updateDomainProperty()` SHALL throw an error containing the validation failure details
- **AND** the property value SHALL NOT be stored or propagated

#### Scenario: Validation uses same pattern as domain and extension registration

- **WHEN** validating a shared property value
- **THEN** the system SHALL use the exact same `register()` + `validateInstance()` pattern already used by `registerDomain()` and `registerExtension()`
- **AND** the system SHALL NOT introduce any new methods on `TypeSystemPlugin`
- **AND** the system SHALL NOT perform manual schema extraction, custom Ajv calls, or any validation outside of gts-ts

#### Scenario: Re-registration updates the GTS store instance

- **WHEN** `updateDomainProperty()` is called multiple times for the same property type ID with different values
- **THEN** each call SHALL re-register the instance in the GTS store (overwriting the previous instance)
- **AND** each call SHALL validate the latest value against the derived schema
- **AND** the GTS store SHALL NOT accumulate duplicate entries (the instance ID is the same key)
