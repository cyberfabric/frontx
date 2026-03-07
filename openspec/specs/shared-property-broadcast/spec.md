## Requirements

### Requirement: Shared Property Write API

The system SHALL provide `updateSharedProperty(propertyId, value)` as the sole write method for shared property values on `ScreensetsRegistry`. The existing `updateDomainProperty()` and `updateDomainProperties()` methods SHALL be removed. Shared properties have global values — a property means the same thing across all domains that declare it. `getDomainProperty()` SHALL remain as the read path.

#### Scenario: Broadcast to matching domains

- **WHEN** the host calls `registry.updateSharedProperty(propertyId, value)` and multiple registered domains include `propertyId` in their `sharedProperties` array
- **THEN** the system SHALL validate the value against the property's GTS-derived schema, store the value, and propagate it to all subscribers for each matching domain
- **AND** domains that do NOT include `propertyId` in their `sharedProperties` array SHALL NOT receive the update
- **AND** the caller SHALL NOT need to know which domains exist or which domains declare the property

#### Scenario: No matching domains is a no-op

- **WHEN** the host calls `registry.updateSharedProperty(propertyId, value)` and no registered domains include `propertyId` in their `sharedProperties` array
- **THEN** the system SHALL silently succeed without error
- **AND** no property updates SHALL be made

#### Scenario: Late-registered domains participate in future broadcasts

- **WHEN** a domain is registered via `registerDomain()` after previous `updateSharedProperty()` calls
- **THEN** the newly registered domain SHALL receive values from subsequent `updateSharedProperty()` calls if its `sharedProperties` array includes the property ID
- **AND** the domain SHALL NOT retroactively receive values from prior `updateSharedProperty()` calls

#### Scenario: Late-registered domains do not receive prior property values (known limitation)

- **GIVEN** `updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, "dark")` was called while only `screenDomain` was registered
- **WHEN** `sidebarDomain` is registered later via `registerDomain()`
- **THEN** `sidebarDomain` SHALL NOT automatically receive the current theme value `"dark"`
- **AND** `sidebarDomain`'s subscribers SHALL NOT be notified of the prior value
- **AND** the registering code (e.g., the app's domain registration logic) is responsible for setting initial property values after registration if needed, by calling `updateSharedProperty()` again or by reading the current value from another source and propagating it
- **NOTE** This is a known limitation of the fire-and-forget broadcast model. The system does not maintain a "current value" cache for replay to late registrants. If initial values are required, the app layer must ensure they are set after domain registration.

#### Scenario: Validation MUST occur before propagation

- **WHEN** `updateSharedProperty(propertyId, value)` is called
- **THEN** the system SHALL perform GTS validation (register + validateInstance) BEFORE propagating the value to any matching domain
- **AND** if validation fails, the error SHALL propagate from `updateSharedProperty()`
- **AND** the property value SHALL NOT be stored or propagated to any domain

#### Scenario: Validation MAY be performed once when all matching domains share the same property schema

- **WHEN** `updateSharedProperty(propertyId, value)` is called and multiple registered domains include `propertyId` in their `sharedProperties` array
- **THEN** the implementation MAY optimize by performing GTS validation once for the property, rather than repeating it per matching domain
- **AND** this optimization is valid because the GTS schema for a given `propertyId` is derived from the property type ID, which is identical across all domains declaring that property
- **AND** the single validation result SHALL apply to all matching domains — if validation passes, the value is propagated to all; if it fails, no domain receives the value

#### Scenario: Method is on the abstract ScreensetsRegistry class

- **WHEN** a consumer depends on `ScreensetsRegistry` (the public abstraction)
- **THEN** `updateSharedProperty(propertyId: string, value: unknown): void` SHALL be an abstract method on `ScreensetsRegistry`
- **AND** `DefaultScreensetsRegistry` SHALL implement it by iterating all registered domains and validating/storing/propagating for matches

#### Scenario: updateDomainProperty and updateDomainProperties are removed

- **WHEN** the system provides the `ScreensetsRegistry` public API
- **THEN** `updateDomainProperty(domainId, propertyTypeId, value)` SHALL NOT exist on the abstract class or implementation
- **AND** `updateDomainProperties(domainId, properties)` SHALL NOT exist on the abstract class or implementation
- **AND** `getDomainProperty(domainId, propertyTypeId)` SHALL remain as the read path
- **AND** internal code that previously called `updateDomainProperty` SHALL be refactored to use the new `updateSharedProperty` path

### Requirement: Manual Bridge Forwarding for Nested MFE Hosts

MFEs that act as nested hosts (creating their own child `ScreensetsRegistry` with domains) SHALL manually forward shared properties from the parent bridge to their child registry using `bridge.subscribeToProperty()` combined with `registry.updateSharedProperty()`.

#### Scenario: Nested MFE forwards theme from parent bridge

- **WHEN** a nested MFE host receives a `ChildMfeBridge` via `mount(container, bridge)` and creates its own child registry with domains that declare `HAI3_SHARED_PROPERTY_THEME` in their `sharedProperties` array
- **THEN** the MFE SHALL subscribe to the property on the parent bridge: `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_THEME, callback)`
- **AND** in the callback, the MFE SHALL call `childRegistry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, value.value)`
- **AND** all child domains declaring `HAI3_SHARED_PROPERTY_THEME` SHALL receive the propagated value

#### Scenario: Forwarding is per-property opt-in

- **WHEN** a nested MFE host's child domains declare different shared properties than the parent domain provides
- **THEN** the MFE SHALL only forward properties that both the parent bridge provides AND the child domains declare
- **AND** properties available on the parent bridge but not declared by any child domain MAY be ignored
