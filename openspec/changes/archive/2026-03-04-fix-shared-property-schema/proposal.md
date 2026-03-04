## Why

The `shared_property.v1~` GTS base schema was intended to be an abstract type where derived types define the exact value schema — consistent with how GTS derivation works elsewhere (e.g., `extension.v1~` → `extension_screen.v1~`). During Phase 36 implementation, the unconstrained `"value": {}` property was replaced with `"supportedValues": string[]` and made required in the base schema. This bakes a concrete constraint (string enum) into the abstract base, making it impossible to create shared properties that carry objects, numbers, booleans, or structured data. Additionally, runtime property values are never validated against any schema — `updateDomainProperty()` accepts `unknown` and passes it through without checking.

## What Changes

- **BREAKING**: Remove `supportedValues` from the `shared_property.v1~` base schema. Replace with an open `"value": {}` property that derived types can constrain.
- **BREAKING**: Update `theme.v1` and `language.v1` instance schemas to use proper derived type schemas that constrain their value (string enum via `"value": { "enum": [...] }`).
- The `SharedProperty` TypeScript interface (`{ id: string; value: unknown }`) is already correct and requires no changes. The `supportedValues` field only existed in the GTS JSON schema, never in the TypeScript interface.
- Add runtime validation of property values in `updateDomainProperty()` — when the type system plugin is available, validate the incoming value against the derived type's schema before storing and propagating.
- Remove the dead `SharedPropertiesProvider` class (`mfe/properties/index.ts`) which duplicates the bridge's property management and is unused in production.
- Clean up the wrap/unwrap/re-wrap property propagation path through the bridge chain.

## Capabilities

### New Capabilities

- `shared-property-validation`: Runtime validation of shared property values against their GTS-derived schemas when a type system plugin is registered.

### Modified Capabilities

- `screensets`: The "Shared property type definition" scenario changes — `supportedValues` is removed from the base type, replaced with `value` schema defined per derived type.

## Impact

- **@hai3/screensets**: GTS schemas (`shared_property.v1~`, `theme.v1.json`, `language.v1.json`), TypeScript types (`SharedProperty`), runtime (`DefaultExtensionManager.updateDomainProperty`, bridge factory property wiring), dead code removal (`SharedPropertiesProvider`).
- **@hai3/react**: `useSharedProperty` hook requires no code changes since the `SharedProperty` interface is unchanged. Tests should be re-run to verify continued correctness.
- **@hai3/framework**: MFE plugin property propagation (`updateDomainProperty` calls) — no signature changes but validated at runtime now.
- **Tests**: GTS plugin tests asserting `supportedValues`, domain property tests, host-state-protection tests using `SharedPropertiesProvider`, bridge property tests.
- **Breaking for 3rd-party MFEs**: Any code reading `supportedValues` from GTS instances must switch to reading the derived type's value schema. Runtime `updateDomainProperty()` calls with invalid values will now throw validation errors instead of silently passing through.
