# Design: GTS Schema Definitions

This document contains the JSON Schema definitions for all MFE system types. These schemas are registered with the TypeSystemPlugin for runtime validation.

**Related Documents:**
- [GTS Specification](https://github.com/GlobalTypeSystem/gts-spec) - Global Type System specification
- [Type System](./type-system.md) - TypeSystemPlugin interface, GTS implementation, contract validation
- [MFE Entry](./mfe-entry-mf.md) - MfeEntry and MfeEntryMF type details
- [MFE Manifest](./mfe-manifest.md) - MfManifest type details
- [MFE Domain](./mfe-domain.md) - ExtensionDomain type details
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain type details
- [MFE Shared Property](./mfe-shared-property.md) - SharedProperty type details

---

## Overview

The MFE type system consists of **8 core types** plus **2 MF-specific types**:

| Category | Type | GTS Type ID |
|----------|------|-------------|
| Core | MFE Entry (Abstract) | `gts.hai3.screensets.mfe.entry.v1~` |
| Core | Extension Domain | `gts.hai3.screensets.ext.domain.v1~` |
| Core | Extension | `gts.hai3.screensets.ext.extension.v1~` |
| Core | Shared Property | `gts.hai3.screensets.ext.shared_property.v1~` |
| Core | Action | `gts.hai3.screensets.ext.action.v1~` |
| Core | Actions Chain | `gts.hai3.screensets.ext.actions_chain.v1~` |
| Core | Lifecycle Stage | `gts.hai3.screensets.ext.lifecycle_stage.v1~` |
| Core | Lifecycle Hook | `gts.hai3.screensets.ext.lifecycle_hook.v1~` |
| MF-Specific | MF Manifest | `gts.hai3.screensets.mfe.mf.v1~` |
| MF-Specific | MFE Entry MF (Derived) | `gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~` |

---

## Core Type Schemas

### MFE Entry Schema (Abstract Base)

The base contract type for all MFE entries. Derived types add loader-specific fields.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "requiredProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" },
      "$comment": "SharedProperty type IDs that MUST be provided by the domain"
    },
    "optionalProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" },
      "$comment": "SharedProperty type IDs that MAY be provided by the domain"
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs this MFE can send (when targeting its domain)"
    },
    "domainActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs this MFE can receive (when targeted by actions chains)"
    }
  },
  "required": ["id", "requiredProperties", "actions", "domainActions"]
}
```

### Extension Domain Schema

Defines an extension point where MFEs can be mounted.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.domain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "sharedProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs that can target extensions in this domain"
    },
    "extensionsActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs extensions can send when targeting this domain"
    },
    "extensionsUiMeta": { "type": "object" },
    "defaultActionTimeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Default timeout in milliseconds for actions targeting this domain. REQUIRED."
    },
    "lifecycleStages": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.lifecycle_stage.v1~*" },
      "$comment": "Lifecycle stage type IDs supported for the domain itself. Hooks referencing unsupported stages are rejected during validation."
    },
    "extensionsLifecycleStages": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.lifecycle_stage.v1~*" },
      "$comment": "Lifecycle stage type IDs supported for extensions in this domain. Extension hooks referencing unsupported stages are rejected during validation."
    },
    "lifecycle": {
      "type": "array",
      "items": { "type": "object", "$ref": "gts://gts.hai3.screensets.ext.lifecycle_hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "sharedProperties", "actions", "extensionsActions", "extensionsUiMeta", "defaultActionTimeout", "lifecycleStages", "extensionsLifecycleStages"]
}
```

### Extension Schema

Binds an MFE entry to a domain.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "domain": {
      "x-gts-ref": "gts.hai3.screensets.ext.domain.v1~*",
      "$comment": "ExtensionDomain type ID to mount into"
    },
    "entry": {
      "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~*",
      "$comment": "MfeEntry type ID to mount"
    },
    "uiMeta": {
      "type": "object",
      "$comment": "Must conform to the domain's extensionsUiMeta schema"
    },
    "lifecycle": {
      "type": "array",
      "items": { "type": "object", "$ref": "gts://gts.hai3.screensets.ext.lifecycle_hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "domain", "entry", "uiMeta"]
}
```

### Shared Property Schema

Represents a typed value passed from host to MFE.

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

### Action Schema

A typed message with target and optional payload.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.action.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "x-gts-ref": "/$id",
      "$comment": "Self-reference to this action's type ID"
    },
    "target": {
      "type": "string",
      "oneOf": [
        { "x-gts-ref": "gts.hai3.screensets.ext.domain.v1~*" },
        { "x-gts-ref": "gts.hai3.screensets.ext.extension.v1~*" }
      ],
      "$comment": "Type ID of the target ExtensionDomain or Extension"
    },
    "payload": {
      "type": "object",
      "$comment": "Optional action payload"
    },
    "timeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Optional timeout override in milliseconds"
    }
  },
  "required": ["type", "target"]
}
```

### Actions Chain Schema

A linked structure of actions with success/failure branches.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.actions_chain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "action": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.action.v1~"
    },
    "next": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~"
    },
    "fallback": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~"
    }
  },
  "required": ["action"]
}
```

### Lifecycle Stage Schema

Represents a lifecycle event that can trigger actions chains.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.lifecycle_stage.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this lifecycle stage"
    },
    "description": {
      "type": "string",
      "$comment": "Human-readable description of when this stage triggers"
    }
  },
  "required": ["id"]
}
```

### Lifecycle Hook Schema

Binds a lifecycle stage to an actions chain.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.lifecycle_hook.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "stage": {
      "x-gts-ref": "gts.hai3.screensets.ext.lifecycle_stage.v1~*",
      "$comment": "The lifecycle stage that triggers this hook"
    },
    "actions_chain": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~",
      "$comment": "The actions chain to execute when the stage triggers"
    }
  },
  "required": ["stage", "actions_chain"]
}
```

---

## MF-Specific Type Schemas

### MF Manifest Schema

Module Federation configuration for loading MFE bundles.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.mf.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "remoteEntry": {
      "type": "string",
      "format": "uri",
      "$comment": "URL to the remoteEntry.js file"
    },
    "remoteName": {
      "type": "string",
      "minLength": 1,
      "$comment": "Module Federation container name"
    },
    "sharedDependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "$comment": "Package name (e.g., 'react', 'lodash')" },
          "requiredVersion": { "type": "string", "$comment": "Semver range (e.g., '^18.0.0')" },
          "singleton": {
            "type": "boolean",
            "default": false,
            "$comment": "If true, share single instance. Default false = isolated instances."
          }
        },
        "required": ["name", "requiredVersion"]
      },
      "$comment": "Dependencies to share for bundle optimization"
    },
    "entries": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~*" },
      "$comment": "Convenience field for discovery - lists MfeEntryMF type IDs"
    }
  },
  "required": ["id", "remoteEntry", "remoteName"]
}
```

### MFE Entry MF Schema (Derived)

Module Federation implementation extending the base MfeEntry.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.mfe.entry.v1~" }
  ],
  "properties": {
    "manifest": {
      "x-gts-ref": "gts.hai3.screensets.mfe.mf.v1~*",
      "$comment": "Reference to MfManifest type ID containing Module Federation config"
    },
    "exposedModule": {
      "type": "string",
      "minLength": 1,
      "$comment": "Module Federation exposed module name (e.g., './ChartWidget')"
    }
  },
  "required": ["manifest", "exposedModule"]
}
```

---

## Schema Registration

### First-Class Citizen Schemas (Built-in)

**Key Principle**: First-class citizen schemas are built into the GTS plugin. No explicit registration is needed.

**Rationale:**
1. **First-class types define system capabilities** - MfeEntry, ExtensionDomain, Action, etc. establish the contract model
2. **Well-known at compile time** - These types are fixed parts of the HAI3 architecture
3. **Changes require code changes** - Modifying these schemas requires updating the screensets package
4. **Vendors extend, not replace** - Third parties can only create derived types within these boundaries

**Built-in types (registered during GTS plugin construction):**
- Core types (8): MfeEntry, ExtensionDomain, Extension, SharedProperty, Action, ActionsChain, LifecycleStage, LifecycleHook
- Default lifecycle stages (4): init, activated, deactivated, destroyed
- MF-specific types (2): MfManifest, MfeEntryMF

The GTS plugin is ready to use immediately after creation - no initialization ceremony required.

### Vendor Schema Registration

Vendors register their derived type schemas using `registerSchema(schema)`. The type ID is extracted from the schema's `$id` field - no need to specify it separately.

```typescript
// Vendor schema registration example

// Vendor-specific derived action type
const acmeDataUpdatedSchema: JSONSchema = {
  "$id": "gts://gts.hai3.screensets.ext.action.v1~acme.analytics.ext.data_updated.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.ext.action.v1~" }
  ],
  "properties": {
    "payload": {
      "type": "object",
      "properties": {
        "datasetId": { "type": "string" },
        "metrics": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["datasetId", "metrics"]
    }
  }
};

// Register vendor schema - type ID extracted from $id
plugin.registerSchema(acmeDataUpdatedSchema);

// Vendor-specific derived entry type
const acmeChartEntrySchema: JSONSchema = {
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~acme.analytics.mfe.chart_widget.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~" }
  ],
  "properties": {
    "chartType": { "enum": ["bar", "line", "pie", "scatter"] },
    "dataSource": { "type": "string" }
  }
};

plugin.registerSchema(acmeChartEntrySchema);
```
