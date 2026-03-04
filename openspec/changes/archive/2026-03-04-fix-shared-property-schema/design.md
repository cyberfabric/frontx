## Context

The `shared_property.v1~` GTS base schema currently defines `supportedValues: string[]` as a required property. This was introduced in Phase 36.1.1 (replacing the original `"value": {}`) and locks every shared property to a string-enum contract. The TypeScript `SharedProperty` interface has `{ id: string; value: unknown }` but the GTS schema and the TS interface are disconnected — the `value` field that flows at runtime through the bridge is never validated against any schema.

Additionally, the shared property constants (`HAI3_SHARED_PROPERTY_THEME`, `HAI3_SHARED_PROPERTY_LANGUAGE`) are defined as GTS instance IDs (no trailing `~`), but they should be GTS type/schema IDs (trailing `~`) because they identify shared property *types*, not specific instances. The current `theme.v1.json` and `language.v1.json` are registered as instances but should be derived schemas.

There are also two parallel property management systems: `SharedPropertiesProvider` (a standalone class in `mfe/properties/index.ts`) and inline property maps in `ChildMfeBridgeImpl`. Only the bridge is used at runtime; `SharedPropertiesProvider` is dead code exercised only in its own tests.

The property propagation path wraps/unwraps `SharedProperty` objects redundantly through the domain → parent bridge → child bridge chain.

### GTS ID mechanics (reference)

GTS type IDs end with `~` (schemas). Instance IDs do not end with `~`.

gts-ts uses **named instances**: The instance ID is a valid chained GTS ID that encodes the schema — gts-ts extracts the rightmost type segment (longest prefix ending with `~`) from the ID. This is the pattern used by actions chains and property validation alike.

GTS type derivation uses `allOf: [$ref base]` + additional properties. For example, `extension_screen.v1~` derives from `extension.v1~`:

```json
{
  "$id": "gts://gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~",
  "allOf": [{ "$ref": "gts://gts.hai3.mfes.ext.extension.v1~" }],
  "properties": { "presentation": { ... } },
  "required": ["presentation"]
}
```

Shared properties should follow the same derivation pattern but currently do not — `theme.v1` and `language.v1` are registered as instances of the base schema, when they should be derived schemas.

### Current validation model

`DefaultExtensionManager` already has `this.typeSystem` (the GTS plugin). It validates domains and extensions at registration time via `typeSystem.register()` + `typeSystem.validateInstance()`. Property updates (`updateDomainProperty`) bypass validation entirely — they check that the property type ID is declared in the domain but never validate the value.

## Goals / Non-Goals

**Goals:**

- Restore `shared_property.v1~` as an abstract base type with an open `"value": {}` property that derived types constrain
- Convert `theme.v1` and `language.v1` from GTS instances to derived schemas that constrain `value`
- Fix shared property constants to be GTS type IDs (trailing `~`) instead of instance IDs
- Add runtime validation of property values in `updateDomainProperty()` using ephemeral GTS instances and the existing type system plugin
- Remove dead `SharedPropertiesProvider` class and its tests
- Clean up redundant wrapping in the property propagation chain

**Non-Goals:**

- Changing the property propagation direction (remains host → MFE, one-way)
- Adding bidirectional property updates (MFEs sending property changes to host)
- Changing the bridge public API (`subscribeToProperty`, `getProperty`)
- Adding new shared property types beyond theme and language

## Decisions

### D1: Base schema restores `"value": {}` as optional, derived schemas constrain it

The base `shared_property.v1~` schema will have:

```json
{
  "$id": "gts://gts.hai3.mfes.comm.shared_property.v1~",
  "type": "object",
  "properties": {
    "id": { "x-gts-ref": "/$id" },
    "value": {}
  },
  "required": ["id"]
}
```

`value` is present but unconstrained in the base — any JSON value is valid. It is NOT required at the schema level because the base is abstract. Derived schemas constrain the `value` property.

### D2: Existing instance files become derived schemas

The existing `theme.v1.json` and `language.v1.json` files are currently GTS instances. They become **derived schemas** using `allOf` derivation from the base. Their IDs stay the same (same naming convention) but gain a trailing `~` to mark them as type/schema IDs, and they gain a `$schema` field.

**`theme.v1.json`** (converted from instance to derived schema):
```json
{
  "$id": "gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "$ref": "gts://gts.hai3.mfes.comm.shared_property.v1~" }],
  "properties": {
    "value": { "type": "string", "enum": ["default", "light", "dark", "dracula", "dracula-large"] }
  }
}
```

**`language.v1.json`** (converted from instance to derived schema):
```json
{
  "$id": "gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "$ref": "gts://gts.hai3.mfes.comm.shared_property.v1~" }],
  "properties": {
    "value": { "type": "string", "enum": ["en", "es", "fr", ...] }
  }
}
```

These files move from `instances/comm/` to `schemas/comm/` since they are now schemas, not instances.

**Alternative considered**: Creating new schema files with different names (e.g., `shared_property_theme.v1.json`) and keeping the instance files. Rejected because the existing IDs are correct — they just need to be schemas instead of instances. No reason to introduce new names.

### D3: Shared property constants become GTS type IDs (trailing `~`)

The constants keep the same naming convention but add trailing `~`:

```typescript
// Before (instance IDs — no trailing ~):
HAI3_SHARED_PROPERTY_THEME    = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1'
HAI3_SHARED_PROPERTY_LANGUAGE = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1'

// After (type/schema IDs — trailing ~):
HAI3_SHARED_PROPERTY_THEME    = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~'
HAI3_SHARED_PROPERTY_LANGUAGE = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~'
```

All code that references these constants (domains, entries, bridges, hooks) automatically picks up the new values. Hardcoded literal strings of the old values must be found and updated.

### D4: Runtime validation using the named instance pattern (same as actions chains)

No new `TypeSystemPlugin` method is needed. Validation uses the same `register()` + `validateInstance()` flow already used for domains, extensions, and actions chains — purely through gts-ts, no custom mechanisms.

The pattern is identical to how actions chains validate actions in `DefaultActionsChainsMediator`:

```typescript
// Actions chains pattern (actions-chains-mediator.ts line 159):
this.typeSystem.register({ ...action, id: action.type });
const validation = this.typeSystem.validateInstance(action.type);
```

When `updateDomainProperty(domainId, propertyTypeId, value)` is called:

1. Construct a valid **chained GTS instance ID** by appending a deterministic instance segment to the property's schema ID:
   ```typescript
   const ephemeralId = `${propertyTypeId}hai3.mfes.comm.runtime.v1`;
   // e.g., "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~hai3.mfes.comm.runtime.v1"
   // This is a valid chained GTS instance ID:
   //   - Schema prefix: everything up to the rightmost `~` = the property's derived schema
   //   - Instance segment: "hai3.mfes.comm.runtime.v1" (no trailing ~, marks it as an instance)
   ```
2. Call `typeSystem.register({ id: ephemeralId, value })` — registers the named instance. gts-ts extracts the schema automatically from the chained ID (the rightmost `~`-terminated prefix is the derived schema, e.g., `gts...theme.v1~`). No `type` field is needed.
3. Call `typeSystem.validateInstance(ephemeralId)` — gts-ts looks up the instance, extracts the schema from the chained ID, resolves the derived schema (including `allOf` base), and validates the `value` field against the schema's constraint.
4. If validation fails, throw with the validation errors. If it passes, proceed to store and propagate.

The ephemeral ID is **deterministic per property type** (`${propertyTypeId}hai3.mfes.comm.runtime.v1`), so each call overwrites the previous instance for that property. No GTS store growth.

This is the exact same `register()` + `validateInstance()` pattern used in `DefaultExtensionManager.registerDomain()`, `registerExtension()`, and `DefaultActionsChainsMediator.executeChainRecursive()`. No new TypeSystemPlugin methods, no custom Ajv logic.

**Alternative considered**: Using an opaque/UUID-based instance ID with an explicit `type` field (anonymous instance pattern). Rejected because gts-ts's `validateInstance()` calls `parseGtsID()` which requires a valid GTS ID format (`gts.` prefix, proper 5-token segments). Opaque IDs like `${propertyTypeId}__runtime` fail parsing. The named instance pattern with a valid chained GTS ID is the correct approach — it is the same pattern used by actions chains and works with gts-ts out of the box.

### D5: Remove `SharedPropertiesProvider` (dead code)

`SharedPropertiesProvider` in `mfe/properties/index.ts` is not used by any production code. The bridge (`ChildMfeBridgeImpl`) implements its own inline property management. Remove:
- `packages/screensets/src/mfe/properties/index.ts`
- `packages/screensets/__tests__/mfe/properties/shared-properties.test.ts`
- Update `host-state-protection.test.ts` to use bridge APIs instead of `SharedPropertiesProvider`

### D6: Simplify property propagation — pass raw value, wrap once at the leaf

Current flow wraps `SharedProperty` at the domain level, unwraps in the bridge factory subscriber, re-wraps in `ParentMfeBridgeImpl.receivePropertyUpdate`, then the child stores it and the React hook unwraps again.

New flow:
- Domain state stores raw values: `properties: Map<string, unknown>` (not `Map<string, SharedProperty>`)
- Domain subscribers receive `(propertyTypeId: string, value: unknown)`
- `ParentMfeBridgeImpl.receivePropertyUpdate` passes raw `(propertyTypeId, value)` to child
- `ChildMfeBridgeImpl` wraps into `SharedProperty` only when storing/notifying (preserving the public `getProperty(): SharedProperty` API)

This eliminates the wrap-unwrap-rewrap chain while keeping the child bridge's public API unchanged.

### D7: SharedProperty TypeScript interface unchanged

The interface stays as `{ id: string; value: unknown }`. This is already the current runtime shape. No TS interface change needed — the GTS schema change is the fix, and the TS type was never wrong.

The `supportedValues` field never existed in the TypeScript interface — it only existed in the GTS JSON schema and instance files.

## Risks / Trade-offs

**[Breaking constant values]** → `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` gain a trailing `~`. All code using the constant names works automatically, but any hardcoded literal strings of the old values break. Mitigation: Search for all literal occurrences and update. No 3rd-party consumers exist yet (pre-release).

**[Validation strictness]** → `updateDomainProperty()` will now throw on invalid values where it previously accepted anything. This applies to both schema constraint violations (e.g., `"neon"` for theme) and missing schemas (e.g., a domain declares a property type that has no schema registered in the GTS store). A missing schema is a configuration error -- the domain declared a property type without registering the corresponding derived schema. In both cases, `typeSystem.validateInstance()` returns a failure and `updateDomainProperty()` throws. There is no graceful degradation: all declared property types must have registered schemas. Mitigation: This is pre-release, and all built-in property types (theme, language) ship with their schemas. Custom property types must register their derived schemas before use.

**[Ephemeral instance accumulation]** → Each `updateDomainProperty` call registers a named instance in the GTS store. Mitigation: The ephemeral ID is deterministic per property type (`${propertyTypeId}hai3.mfes.comm.runtime.v1`). Each call overwrites the previous instance for that property. No store growth.

**[Test churn]** → Multiple test files assert `supportedValues` behavior and old constant values. Mitigation: These tests need updating regardless — they're testing the wrong contract. The new tests will validate the correct behavior (derived schemas, value validation).
