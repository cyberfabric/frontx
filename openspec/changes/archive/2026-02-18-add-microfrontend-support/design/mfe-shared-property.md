# Design: MFE Shared Property

This document covers the SharedProperty type and its usage in the MFE system.

---

## Context

SharedProperty is the mechanism for passing data from the parent to MFEs (one-way: parent → MFE). [Domains](./schemas.md#extension-domain-schema) declare which properties the parent provides (`ExtensionDomain.sharedProperties`), and [entries](./mfe-entry-mf.md) declare which properties they require or optionally accept (`MfeEntry.requiredProperties`, `MfeEntry.optionalProperties`).

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
  /** The set of values consumers must support for this property */
  supportedValues: string[];
}
```

---

## HAI3 Default Shared Property Instances

HAI3 provides two built-in shared property instances for theme and language communication. These are core infrastructure, defined in the `hai3.mfes` GTS package.

### Theme Shared Property

```json
// packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/theme.v1.json
{
  "id": "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1",
  "supportedValues": ["default", "light", "dark", "dracula", "dracula-large"]
}
```

**Type ID**: `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`

**Supported Values**: The 5 theme IDs from the host's `ThemeConfig` constants. The MFE must support all listed themes and apply its own CSS variables inside its Shadow DOM based on the runtime value received via `bridge.subscribeToProperty()`.

### Language Shared Property

```json
// packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/language.v1.json
{
  "id": "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1",
  "supportedValues": ["en", "es", "fr", "de", "it", "pt", "nl", "ru", "pl", "uk", "cs", "ar", "he", "fa", "ur", "tr", "zh", "zh-TW", "ja", "ko", "vi", "th", "id", "hi", "bn", "sv", "da", "no", "fi", "el", "ro", "hu", "ms", "tl", "ta", "sw"]
}
```

**Type ID**: `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`

**Supported Values**: All 36 ISO 639-1 language codes from the `Language` enum in `@hai3/i18n`. The MFE must support all listed languages by loading its own i18n translations and applying text direction (RTL/LTR) as needed inside its Shadow DOM. The runtime language value is received via `bridge.subscribeToProperty()`.

### Constants

```typescript
// packages/screensets/src/mfe/constants/index.ts

/** Theme shared property type ID */
export const HAI3_SHARED_PROPERTY_THEME = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1';

/** Language shared property type ID */
export const HAI3_SHARED_PROPERTY_LANGUAGE = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1';
```

### Domain-Entry Contract Flow

At registration time, contract validation checks `entry.requiredProperties` is a subset of `domain.sharedProperties` (see [principles.md - Theme and Language](./principles.md#theme-and-language-as-domain-properties) for the full propagation model). At runtime, the host calls `registry.updateDomainProperty()` and MFEs subscribe via `bridge.subscribeToProperty()`.

---

### Why `supportedValues: string[]`

The `supportedValues` field is a string array defining the enum contract -- the set of values that consumers of this shared property MUST support. This is a deliberate design choice:

1. **Shared properties are contracts, not runtime state**: A SharedProperty GTS instance declares which values exist in the system (e.g., 5 theme IDs, 36 language codes). The actual runtime value is set via `registry.updateDomainProperty()` and flows through the bridge -- it is NOT stored in the GTS instance.
2. **Enum contract enables validation**: At registration time, contract validation can verify that an MFE's supported values intersect with the domain's property contract. This catches configuration errors early.
3. **@hai3/screensets is L1 (framework-agnostic)**: The package has zero dependencies. Using `string[]` keeps the interface universally usable without framework-specific types.
4. **Runtime values flow through the bridge**: The host calls `registry.updateDomainProperty(domainId, propertyTypeId, currentValue)` with the actual runtime value (e.g., `"dark"`). MFEs receive it via `bridge.subscribeToProperty()`. The GTS instance only defines what values are valid -- it does not carry a current value.
