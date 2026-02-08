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

## GTS Package Organization

The MFE type system is organized into two GTS packages:

### `hai3.mfes` Package (Core Infrastructure)
Core infrastructure schemas hardcoded in `@hai3/screensets`. These define the fundamental building blocks of the MFE system. Organized into namespaces:
- `mfe` namespace: entry, mf_manifest, entry_mf
- `ext` namespace: domain, extension
- `comm` namespace: shared_property, action, actions_chain
- `lifecycle` namespace: stage, hook

### `hai3.screensets` Package (Layout Implementation)
Layout-specific domain instances that use the core `hai3.mfes` schemas. These are framework-level implementations.

---

## Overview

The MFE type system consists of **8 core types** plus **2 MF-specific types**. See [Type System - Decision 2](./type-system.md#decision-2-gts-type-id-format-and-registration) for the complete GTS Type ID table and layout domain instances.

---

## Core Type Schemas

### MFE Entry Schema (Abstract Base)

The base contract type for all MFE entries. Derived types add loader-specific fields.

```json
{
  "$id": "gts://gts.hai3.mfes.mfe.entry.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id"
    },
    "requiredProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.shared_property.v1~*" },
      "$comment": "SharedProperty type IDs REQUIRED by the MFE"
    },
    "optionalProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.action.v1~*" },
      "$comment": "Actions MFE can send to its domain"
    },
    "domainActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.action.v1~*" },
      "$comment": "Actions MFE can receive"
    }
  },
  "required": ["id", "requiredProperties", "actions", "domainActions"]
}
```

### Extension Domain Schema

Defines an extension point where MFEs can be mounted.

```json
{
  "$id": "gts://gts.hai3.mfes.ext.domain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "sharedProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.action.v1~*" },
      "$comment": "Action type IDs that can target extensions in this domain"
    },
    "extensionsActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.comm.action.v1~*" },
      "$comment": "Action type IDs extensions can send when targeting this domain"
    },
    "extensionsTypeId": {
      "type": "string",
      "x-gts-ref": "gts.hai3.mfes.ext.extension.v1~*",
      "$comment": "Optional reference to a derived Extension type ID. If specified, extensions must use types that derive from this type."
    },
    "defaultActionTimeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Default timeout in milliseconds for actions targeting this domain. REQUIRED."
    },
    "lifecycleStages": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.lifecycle.stage.v1~*" },
      "$comment": "Lifecycle stage type IDs supported for the domain itself. Hooks referencing unsupported stages are rejected during validation."
    },
    "extensionsLifecycleStages": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.lifecycle.stage.v1~*" },
      "$comment": "Lifecycle stage type IDs supported for extensions in this domain. Extension hooks referencing unsupported stages are rejected during validation."
    },
    "lifecycle": {
      "type": "array",
      "items": { "type": "object", "$ref": "gts://gts.hai3.mfes.lifecycle.hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "sharedProperties", "actions", "extensionsActions", "defaultActionTimeout", "lifecycleStages", "extensionsLifecycleStages"]
}
```

### Extension Schema

Binds an MFE entry to a domain. Domain-specific fields are defined in derived Extension schemas.

```json
{
  "$id": "gts://gts.hai3.mfes.ext.extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "domain": {
      "x-gts-ref": "gts.hai3.mfes.ext.domain.v1~*",
      "$comment": "ExtensionDomain type ID to mount into"
    },
    "entry": {
      "x-gts-ref": "gts.hai3.mfes.mfe.entry.v1~*",
      "$comment": "MfeEntry type ID to mount"
    },
    "lifecycle": {
      "type": "array",
      "items": { "type": "object", "$ref": "gts://gts.hai3.mfes.lifecycle.hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "domain", "entry"],
  "$comment": "Domain-specific fields are defined in derived Extension schemas. Domains may specify extensionsTypeId to require extensions use a derived type."
}
```

### Shared Property Schema

Represents a typed value passed from parent to MFE.

```json
{
  "$id": "gts://gts.hai3.mfes.comm.shared_property.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id"
    },
    "value": {}
  },
  "required": ["id", "value"]
}
```

### Action Schema

A typed message with target and optional payload.

```json
{
  "$id": "gts://gts.hai3.mfes.comm.action.v1~",
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
        { "x-gts-ref": "gts.hai3.mfes.ext.domain.v1~*" },
        { "x-gts-ref": "gts.hai3.mfes.ext.extension.v1~*" }
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
  "$id": "gts://gts.hai3.mfes.comm.actions_chain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "action": {
      "type": "object",
      "$ref": "gts://gts.hai3.mfes.comm.action.v1~"
    },
    "next": {
      "type": "object",
      "$ref": "gts://gts.hai3.mfes.comm.actions_chain.v1~"
    },
    "fallback": {
      "type": "object",
      "$ref": "gts://gts.hai3.mfes.comm.actions_chain.v1~"
    }
  },
  "required": ["action"]
}
```

### Lifecycle Stage Schema

Represents a lifecycle event that can trigger actions chains.

```json
{
  "$id": "gts://gts.hai3.mfes.lifecycle.stage.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id"
    },
    "description": {
      "type": "string"
    }
  },
  "required": ["id"]
}
```

### Lifecycle Hook Schema

Binds a lifecycle stage to an actions chain.

```json
{
  "$id": "gts://gts.hai3.mfes.lifecycle.hook.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "stage": {
      "x-gts-ref": "gts.hai3.mfes.lifecycle.stage.v1~*",
      "$comment": "The lifecycle stage that triggers this hook"
    },
    "actions_chain": {
      "type": "object",
      "$ref": "gts://gts.hai3.mfes.comm.actions_chain.v1~",
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
  "$id": "gts://gts.hai3.mfes.mfe.mf_manifest.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id"
    },
    "remoteEntry": {
      "type": "string",
      "format": "uri"
    },
    "remoteName": {
      "type": "string",
      "minLength": 1
    },
    "sharedDependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "requiredVersion": { "type": "string" },
          "singleton": {
            "type": "boolean",
            "default": false,
            "$comment": "Default false = isolated instances per MFE"
          }
        },
        "required": ["name", "requiredVersion"]
      }
    },
    "entries": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~*" }
    }
  },
  "required": ["id", "remoteEntry", "remoteName"]
}
```

### MFE Entry MF Schema (Derived)

Module Federation implementation extending the base MfeEntry.

```json
{
  "$id": "gts://gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.mfes.mfe.entry.v1~" }
  ],
  "properties": {
    "manifest": {
      "x-gts-ref": "gts.hai3.mfes.mfe.mf_manifest.v1~*",
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

## GTS Entity Storage Format

### JSON as Native GTS Format

GTS entities (schemas, instances, domains, extensions, etc.) are natively represented as JSON. This is the canonical storage format for the Global Type System.

**MANDATORY**: All GTS entities MUST be stored in `.json` files, not hardcoded as TypeScript objects. TypeScript interfaces provide compile-time type safety, while JSON files provide runtime validation via GTS.

**Two-Package Organization**:

| Package | Purpose | Location | Loaded By |
|---------|---------|----------|-----------|
| `hai3.mfes` | Core MFE infrastructure schemas and base instances | `packages/screensets/src/mfe/gts/hai3.mfes/` | GTS plugin (hardcoded in @hai3/screensets) |
| `hai3.screensets` | Layout-specific domain instances | `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/` | Framework level (added at runtime) |

**Complete Directory Structure**:
```
packages/screensets/src/mfe/gts/
  hai3.mfes/                         # Core MFE GTS package
    schemas/
      mfe/
        entry.v1.json                # MfeEntry schema (gts.hai3.mfes.mfe.entry.v1~)
        mf_manifest.v1.json          # MfManifest schema (gts.hai3.mfes.mfe.mf_manifest.v1~)
        entry_mf.v1.json             # MfeEntryMF schema (gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~)
      ext/
        domain.v1.json               # ExtensionDomain schema (gts.hai3.mfes.ext.domain.v1~)
        extension.v1.json            # Extension schema (gts.hai3.mfes.ext.extension.v1~)
      comm/
        shared_property.v1.json      # SharedProperty schema (gts.hai3.mfes.comm.shared_property.v1~)
        action.v1.json               # Action schema (gts.hai3.mfes.comm.action.v1~)
        actions_chain.v1.json        # ActionsChain schema (gts.hai3.mfes.comm.actions_chain.v1~)
      lifecycle/
        stage.v1.json                # LifecycleStage schema (gts.hai3.mfes.lifecycle.stage.v1~)
        hook.v1.json                 # LifecycleHook schema (gts.hai3.mfes.lifecycle.hook.v1~)
    instances/
      lifecycle/
        init.v1.json                 # gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1
        activated.v1.json            # gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1
        deactivated.v1.json          # gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1
        destroyed.v1.json            # gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1
      comm/
        load_ext.v1.json             # gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1
        unload_ext.v1.json           # gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1
packages/framework/src/plugins/microfrontends/gts/
  hai3.screensets/                   # Screensets layout GTS package (L2 - runtime config)
    instances/
      domains/
        sidebar.v1.json              # gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1
        popup.v1.json                # gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1
        screen.v1.json               # gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1
        overlay.v1.json              # gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1
```

**What Goes Where**:
- `@hai3/screensets`: `hai3.mfes/schemas/` - All 10 type schemas organized by namespace (mfe, ext, comm, lifecycle)
- `@hai3/screensets`: `hai3.mfes/instances/lifecycle/` - The 4 default lifecycle stage instances (core MFE system)
- `@hai3/screensets`: `hai3.mfes/instances/comm/` - Base action type instances (load_ext, unload_ext) (core MFE system)
- `@hai3/framework`: `hai3.screensets/instances/domains/` - Layout domain instances (sidebar, popup, screen, overlay) (runtime config)

**Loading JSON Schemas**:
```typescript
// Import JSON schema file
import entrySchema from './gts/hai3.mfes/schemas/mfe/entry.v1.json';

// Register with plugin
plugin.registerSchema(entrySchema);

// Or load dynamically
const schema = await fetch('/gts/hai3.mfes/schemas/mfe/entry.v1.json').then(r => r.json());
plugin.registerSchema(schema);
```

**TypeScript Type Safety**:
When using JSON files, TypeScript interfaces provide compile-time type safety for code that works with these entities:
```typescript
// TypeScript interface for code
interface MfeEntry {
  id: string;
  requiredProperties: string[];
  // ...
}

// JSON file provides runtime validation via GTS
// TypeScript interface provides compile-time validation
```

**Benefits of JSON Storage**:
1. **Native GTS format** - No translation layer needed
2. **Tool-friendly** - Can be generated, validated, and transformed by external tools
3. **Runtime loadable** - Can be fetched dynamically without bundling
4. **Shareable** - Can be published to registries or shared via HTTP
5. **Version-independent** - Schema changes don't require code recompilation

**When to Use TypeScript Objects** (LIMITED cases only):
- For inline entity definitions in unit tests (test-specific mocks)
- For temporary examples in documentation

**When NOT to Use TypeScript Objects** (use JSON files instead):
- First-class citizen schemas - MUST be in JSON files under `hai3.mfes/schemas/`
- Default lifecycle stages - MUST be in JSON files under `hai3.mfes/instances/lifecycle/`
- Base action types - MUST be in JSON files under `hai3.mfes/instances/comm/`
- Layout domain instances - MUST be in JSON files under `hai3.screensets/instances/domains/` in `@hai3/framework` (L2, runtime config)
- Any entity that will be registered with the GTS plugin at runtime

---

## Schema Registration

First-class citizen schemas are built into the GTS plugin (no explicit registration needed). Vendors register derived type schemas using `registerSchema(schema)`. See [Type System - Decision 4](./type-system.md#decision-4-built-in-first-class-citizen-schemas) for rationale and [Type System - Decision 5](./type-system.md#decision-5-vendor-type-registration) for vendor registration examples.
