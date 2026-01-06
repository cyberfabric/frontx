# Change: Add Microfrontend Support

## Why

HAI3 applications need to compose functionality from multiple independently deployed microfrontends (MFEs). Vendors can create MFE extensions that integrate into host applications through well-defined extension points. This enables:

1. **Independent Deployment**: MFEs can be deployed separately from the host application
2. **Vendor Extensibility**: Third parties can create extensions without modifying host code
3. **State Isolation**: Each MFE maintains its own HAI3 state instance with controlled communication
4. **Type-Safe Contracts**: Pluggable type system defines clear communication boundaries between host and MFE

## What Changes

### Core Architecture

Each MFE instance and host has its **own isolated HAI3 state instance**. Communication happens ONLY through a symmetric contract:
- **Shared properties** (parent to child, read-only)
- **Actions chain** delivered by orchestrator to targets

### Architectural Decision: Type System Plugin Abstraction

The @hai3/screensets package abstracts the Type System as a **pluggable dependency**:

1. **Internal TypeScript Types**: The package works internally with TypeScript interfaces (`MfeDefinition`, `MfeEntry`, `ExtensionDomain`, etc.)
2. **Required Plugin**: A `TypeSystemPlugin` must be provided at initialization
3. **Default Implementation**: GTS (`@globaltypesystem/gts-ts`) ships as the default plugin
4. **Extensibility**: Other Type System implementations can be plugged in

**Plugin Interface:**
```typescript
interface TypeSystemPlugin<TTypeId = string> {
  // Type ID operations
  parseTypeId(id: string): ParsedTypeId;
  isValidTypeId(id: string): boolean;
  buildTypeId(options: TypeIdOptions): TTypeId;

  // Schema registry
  registerSchema(typeId: TTypeId, schema: JSONSchema): void;
  validateInstance(typeId: TTypeId, instance: unknown): ValidationResult;
  getSchema(typeId: TTypeId): JSONSchema | undefined;

  // Query
  query(pattern: string, limit?: number): TTypeId[];

  // Compatibility (optional)
  checkCompatibility?(oldTypeId: TTypeId, newTypeId: TTypeId): CompatibilityResult;
}
```

### HAI3 Internal TypeScript Types

The MFE system uses these internal TypeScript interfaces. Each type includes `GtsMetadata` which contains data extracted from the GTS type ID:

```typescript
// Extracted from GTS ID parsing
interface GtsMetadata {
  readonly typeId: string;      // Full GTS type ID
  readonly vendor: string;      // Extracted from typeId
  readonly package: string;     // Extracted from typeId
  readonly namespace: string;   // Extracted from typeId
  readonly type: string;        // Extracted from typeId
  readonly version: {           // Extracted from typeId
    major: number;
    minor?: number;
  };
}
```

| TypeScript Interface | Extends | Fields | Purpose |
|---------------------|---------|--------|---------|
| `MfeDefinition` | `GtsMetadata` | `name, url, entries: string[]` | Deployable MFE unit |
| `MfeEntry` | `GtsMetadata` | `path, requiredProperties[], optionalProperties[], actions[], domainActions[]` | Entry with communication contract |
| `ExtensionDomain` | `GtsMetadata` | `sharedProperties[], actions[], extensionsActions[], uiMetadataContract` | Extension point contract |
| `Extension` | `GtsMetadata` | `domain: string, entry: string, uiMetadata` | Extension binding |
| `SharedProperty` | `GtsMetadata` | `name, schema` | Property definition (NO default value) |
| `Action` | `GtsMetadata` | `name, payloadSchema` | Action definition |
| `ActionsChain` | `GtsMetadata` | `target: string, action: string, payload, next?, fallback?` | Orchestration chain |

### GTS Type ID Format

The GTS type ID format is: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

### Type System Registration (via Plugin)

When using the GTS plugin, the following types are registered with properly structured GTS type IDs:

| GTS Type ID | Segments | Purpose |
|-------------|----------|---------|
| `gts.hai3.screensets.mfe.definition.v1~` | vendor=hai3, package=screensets, namespace=mfe, type=definition | Deployable MFE unit |
| `gts.hai3.screensets.mfe.entry.v1~` | vendor=hai3, package=screensets, namespace=mfe, type=entry | Entry with communication contract |
| `gts.hai3.screensets.ext.domain.v1~` | vendor=hai3, package=screensets, namespace=ext, type=domain | Extension point contract |
| `gts.hai3.screensets.ext.extension.v1~` | vendor=hai3, package=screensets, namespace=ext, type=extension | Extension binding |
| `gts.hai3.screensets.ext.shared_property.v1~` | vendor=hai3, package=screensets, namespace=ext, type=shared_property | Property definition |
| `gts.hai3.screensets.ext.action.v1~` | vendor=hai3, package=screensets, namespace=ext, type=action | Action definition |
| `gts.hai3.screensets.ext.actions_chain.v1~` | vendor=hai3, package=screensets, namespace=ext, type=actions_chain | Orchestration chain |

### GTS JSON Schema Definitions

Each GTS type has a corresponding JSON Schema with proper `$id` and `x-gts-ref` references:

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.definition.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "url": { "type": "string", "format": "uri" },
    "entries": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~*" },
      "minItems": 1
    }
  },
  "required": ["name", "url", "entries"]
}
```

See `design.md` for complete JSON Schema definitions of all 7 types.

### Contract Matching Rules

For injection to be valid:
```
entry.requiredProperties  is subset of  domain.sharedProperties
entry.actions             is subset of  domain.extensionsActions
domain.actions            is subset of  entry.domainActions
```

### Actions Chain Runtime

1. Orchestrator delivers actions chain to target (domain or entry)
2. Target executes the action (only target understands payload based on action type)
3. On success: orchestrator delivers `next` chain to its target
4. On failure: orchestrator delivers `fallback` chain to its target
5. Recursive until chain ends (no next/fallback)

### Hierarchical Extension Domains

- HAI3 provides base layout domains: `sidebar`, `popup`, `screen`, `overlay`
- Vendor screensets can define their own extension domains
- Example: A dashboard screenset defines a "widget slot" domain for third-party widgets

## Impact

### Affected specs
- `screensets` - Core MFE integration, Type System plugin interface, and type definitions

### Affected code

**New packages:**
- `packages/screensets/src/mfe/` - MFE runtime, loader, orchestrator
- `packages/screensets/src/mfe/types/` - Internal TypeScript type definitions
- `packages/screensets/src/mfe/validation/` - Contract matching validation
- `packages/screensets/src/mfe/orchestrator/` - Actions chain delivery
- `packages/screensets/src/mfe/plugins/` - Type System plugin interface and implementations
- `packages/screensets/src/mfe/plugins/gts/` - GTS plugin implementation (default)

**Modified packages:**
- `packages/screensets/src/store/` - Isolated state instances
- `packages/screensets/src/events/` - Cross-MFE event isolation
- `packages/screensets/src/screensets/` - Extension domain registration
- `packages/framework/src/plugins/microfrontends/` - Accept Type System plugin from screensets

### Breaking changes
- **BREAKING**: MFEs require Type System-compliant type definitions for integration
- **BREAKING**: Extension points must define explicit contracts
- **BREAKING**: `ScreensetsOrchestratorConfig` now requires `typeSystem` parameter

### Migration strategy
1. Define `TypeSystemPlugin` interface in @hai3/screensets
2. Create GTS plugin implementation as default
3. Update orchestrator to require plugin injection
4. Define internal TypeScript types for MFE architecture
5. Register HAI3 types via plugin at initialization
6. Propagate plugin through @hai3/framework layers
7. Update documentation and examples
