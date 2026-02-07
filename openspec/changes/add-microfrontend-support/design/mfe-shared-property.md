# Design: MFE Shared Property

This document covers the SharedProperty type and its usage in the MFE system.

---

## Context

SharedProperty is the mechanism for passing data from the parent to MFEs (one-way: parent → MFE). [Domains](./mfe-domain.md) declare which properties the parent provides (`ExtensionDomain.sharedProperties`), and [entries](./mfe-entry-mf.md) declare which properties they require or optionally accept (`MfeEntry.requiredProperties`, `MfeEntry.optionalProperties`).

At runtime, extensions subscribe to property updates via the [ChildMfeBridge](./mfe-api.md). The contract validation ensures that domains provide all required properties declared by mounted extensions.

## Definition

**SharedProperty**: A GTS type representing a typed value passed from the parent to its mounted MFEs. It consists of a type ID (defining the property's schema and semantics) and a value conforming to that schema.

---

## Shared Property Schema

See [schemas.md - Shared Property Schema](./schemas.md#shared-property-schema) for the JSON Schema definition.

## TypeScript Interface Definition

```typescript
/**
 * Defines a shared property instance passed from parent to MFE
 * GTS Type: gts.hai3.mfes.comm.shared_property.v1~
 */
interface SharedProperty {
  /** The GTS type ID for this shared property */
  id: string;
  /** The shared property value */
  value: unknown;
}
```

### Why `value: unknown`

The `value` field is deliberately typed as `unknown` rather than a generic or specific type. This is a conscious design choice, not a shortcut:

1. **@hai3/screensets is L1 (framework-agnostic)**: The package has zero dependencies and cannot import or reference framework-specific types. Using `unknown` keeps the interface universally usable.
2. **Actual type is schema-dependent**: Each shared property's value type is defined by its GTS schema (resolved via the property's type ID). The concrete type varies per property and is only known when the schema is resolved at runtime.
3. **Runtime validation via GTS**: Type safety is enforced at runtime through `TypeSystemPlugin.validateInstance()`, which validates the value against the property's registered JSON Schema. This provides stronger guarantees than compile-time generics alone, since property schemas can be vendor-defined and dynamically registered.
4. **L2/L3 layers provide typed access**: Higher layers (@hai3/framework, @hai3/react) wrap `SharedProperty` with typed hooks (e.g., `useSharedProperty<T>(propertyTypeId)`) that narrow `unknown` to the expected type at the consumption point.
