# Design: MFE Shared Property

This document covers the SharedProperty type and its usage in the MFE system.

---

## Context

SharedProperty is the mechanism for passing data from the host to MFEs (one-way: host → MFE). [Domains](./mfe-domain.md) declare which properties the host provides (`ExtensionDomain.sharedProperties`), and [entries](./mfe-entry-mf.md) declare which properties they require or optionally accept (`MfeEntry.requiredProperties`, `MfeEntry.optionalProperties`).

At runtime, extensions subscribe to property updates via the [MfeBridge](./mfe-api.md). The contract validation ensures that domains provide all required properties declared by mounted extensions.

## Definition

**SharedProperty**: A GTS type representing a typed value passed from the host to its mounted MFEs. It consists of a type ID (defining the property's schema and semantics) and a value conforming to that schema.

---

## Shared Property Schema

```json
{
  "$id": "gts://gts.hai3.screensets.ext.shared_property.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this shared property"
    },
    "value": {
      "$comment": "The shared property value"
    }
  },
  "required": ["id", "value"]
}
```

## TypeScript Interface Definition

```typescript
/**
 * Defines a shared property instance passed from host to MFE
 * GTS Type: gts.hai3.screensets.ext.shared_property.v1~
 */
interface SharedProperty {
  /** The GTS type ID for this shared property */
  id: string;
  /** The shared property value */
  value: unknown;
}
```
