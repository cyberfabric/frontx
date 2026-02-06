# Design: MFE Domain and Extension

This document covers the ExtensionDomain and Extension types and their usage in the MFE system.

**Related Documents:**
- [MFE Entry](./mfe-entry-mf.md) - MfeEntry contract definition
- [MFE Actions](./mfe-actions.md) - Action types and mediation
- [MFE Shared Property](./mfe-shared-property.md) - Property definitions
- [MFE Lifecycle](./mfe-lifecycle.md) - Lifecycle stages and hooks
- [Type System](./type-system.md) - Contract validation rules

---

## Context

ExtensionDomain defines an extension point where MFE instances can be mounted. Domains can exist at any level of the hierarchy. See [MFE System Overview](./overview.md) for architecture details.

---

## ExtensionDomain

### Definition

**ExtensionDomain**: A GTS type that defines an extension point with its communication contract (shared properties, actions). Extensions mount into domains, and the domain validates that mounted extensions satisfy its contract requirements. Domains may specify `extensionsTypeId` to require extensions use a derived Extension type with domain-specific fields.

### Extension Domain Schema

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
    "extensionsTypeId": {
      "type": "string",
      "x-gts-ref": "gts.hai3.screensets.ext.extension.v1~*",
      "$comment": "Optional reference to a derived Extension type ID. If specified, extensions must use types that derive from this type."
    },
    "defaultActionTimeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Default timeout in milliseconds for actions targeting this domain. REQUIRED. All actions use this unless they specify their own timeout override."
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
      "items": { "$ref": "gts://gts.hai3.screensets.ext.lifecycle_hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "sharedProperties", "actions", "extensionsActions", "defaultActionTimeout", "lifecycleStages", "extensionsLifecycleStages"]
}
```

### TypeScript Interface Definitions

```typescript
/**
 * Defines an extension point (domain) where MFEs can be mounted
 * GTS Type: gts.hai3.screensets.ext.domain.v1~
 */
interface ExtensionDomain {
  /** The GTS type ID for this domain */
  id: string;
  /** SharedProperty type IDs provided to MFEs in this domain */
  sharedProperties: string[];
  /** Action type IDs that can target extensions in this domain */
  actions: string[];
  /** Action type IDs extensions can send when targeting this domain */
  extensionsActions: string[];
  /** Optional reference to a derived Extension type ID. If specified, extensions must use types that derive from this type. */
  extensionsTypeId?: string;
  /** Default timeout for actions targeting this domain (milliseconds, REQUIRED) */
  defaultActionTimeout: number;
  /** Lifecycle stage type IDs supported for the domain itself */
  lifecycleStages: string[];
  /** Lifecycle stage type IDs supported for extensions in this domain */
  extensionsLifecycleStages: string[];
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
}
```

---

## Contract Matching

For an MFE entry to be mountable into a domain:
1. `entry.requiredProperties` ⊆ `domain.sharedProperties`
2. `entry.actions` ⊆ `domain.extensionsActions`
3. `domain.actions` ⊆ `entry.domainActions`

See [Type System - Contract Matching](./type-system.md#decision-8-contract-matching-rules) for the full diagram, validation implementation, and error handling.

---

## Hierarchical Extension Domains

Extension domains form a hierarchical structure where domains can exist at any level:

```
HOST APPLICATION
  └── Domain A (host's domain - e.g., sidebar)
        └── Extension 1 (MFE instance that is ALSO a domain provider)
              └── Domain B (MFE's own domain - e.g., widget-slot)
                    └── Extension 2 (nested MFE instance)
                          └── Domain C (can go deeper...)
                                └── Extension 3 (deeply nested MFE)
```

HAI3 provides base layout domains for the host level, and any MFE can define its own domains for nested composition. Base domains are registered via the Type System plugin.

### Base Layout Domains

When using GTS plugin, base domains follow the format `gts.hai3.screensets.ext.domain.<layout>.v1`:
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.sidebar.v1` - Sidebar panels
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1` - Modal popups
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.screen.v1` - Full screen views
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.overlay.v1` - Floating overlays

### Vendor-Defined Domains

Vendors define their own domains following the GTS type ID format:

**Instance ID Convention:**
- Schema IDs end with `~` (e.g., `gts.hai3.screensets.ext.domain.v1~`)
- Instance IDs do NOT end with `~` (e.g., `gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1`)

```typescript
// Example: Dashboard screenset defines widget slot domain
// Schema ID: gts.hai3.screensets.ext.domain.v1~ (ends with ~)
// Instance ID: gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1 (no trailing ~)

// First, define and register a derived Extension schema with domain-specific fields
// Note: Schema $id ends with ~ because it's a schema definition
const widgetExtensionSchema: JSONSchema = {
  "$id": "gts://gts.hai3.screensets.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.ext.extension.v1~" }
  ],
  "properties": {
    "title": { "type": "string" },
    "icon": { "type": "string" },
    "size": { "enum": ["small", "medium", "large"] }
  },
  "required": ["title", "size"]
};
plugin.registerSchema(widgetExtensionSchema);

// Then define the domain INSTANCE, referencing the derived Extension type
// Note: domain.id does NOT end with ~ (it's an instance ID)
const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  sharedProperties: [
    // Properties provided to MFEs in this domain (instance IDs, no trailing ~)
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.user_context.v1',
  ],
  actions: [
    // Action types that can target extensions in this domain (instance IDs, no trailing ~)
    'gts.hai3.screensets.ext.action.v1~acme.dashboard.ext.refresh.v1',
  ],
  extensionsActions: [
    // Action types extensions can send when targeting this domain (instance IDs, no trailing ~)
    'gts.hai3.screensets.ext.action.v1~acme.dashboard.ext.data_update.v1',
  ],
  // Reference to a derived Extension SCHEMA type - ends with ~ because it's a schema reference
  extensionsTypeId: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~',
  defaultActionTimeout: 30000,
  lifecycleStages: [
    // Lifecycle stages for the domain itself (instance IDs, no trailing ~)
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1',
  ],
  extensionsLifecycleStages: [
    // Lifecycle stages supported for extensions in this domain (instance IDs, no trailing ~)
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1',
    // Custom stage for widget refresh
    'gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1',
  ],
};

// Registration using GTS-native approach:
plugin.register(widgetSlotDomain);
const result = plugin.validateInstance(widgetSlotDomain.id);
```

---

## Domain-Specific Layout Semantics

Different domain layouts have different semantics for extension lifecycle:

- **Popup, Sidebar, Overlay** - Can be shown/hidden (extension can be loaded/unloaded)
- **Screen** - Always has a screen selected (can navigate between screens, but can't have "no screen")

The ActionsChainsMediator handles these semantics when processing actions. See [MFE Actions](./mfe-actions.md) for details on action chain execution.

---

## Extension

### Definition

**Extension**: A GTS type that binds an MfeEntry to an ExtensionDomain, creating a concrete MFE instance. Domain-specific fields are defined in derived Extension types, validated natively by GTS.

Extension is the binding type that connects an [MFE entry](./mfe-entry-mf.md) to an extension domain, creating a concrete MFE **instance**. While MfeEntry defines what an MFE can do (its contract) and ExtensionDomain defines where MFE instances can mount (the slot), Extension creates the actual instance by specifying which entry mounts into which domain. Domain-specific metadata is defined in derived Extension schemas rather than a separate `uiMeta` field.

Extensions are registered dynamically at runtime and can be added/removed at any time during the application lifecycle.

### Extension Schema

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
    "lifecycle": {
      "type": "array",
      "items": { "$ref": "gts://gts.hai3.screensets.ext.lifecycle_hook.v1~" },
      "$comment": "Optional lifecycle hooks - explicitly declared actions for each stage"
    }
  },
  "required": ["id", "domain", "entry"],
  "$comment": "Domain-specific fields are defined in derived Extension schemas. Domains may specify extensionsTypeId to require a derived type."
}
```

### TypeScript Interface Definition

```typescript
/**
 * Binds an MFE entry to an extension domain
 * GTS Type: gts.hai3.screensets.ext.extension.v1~
 *
 * Domain-specific fields are defined in derived Extension types.
 * If domain.extensionsTypeId is specified, extension must use a type deriving from it.
 */
interface Extension {
  /** The GTS type ID for this extension */
  id: string;
  /** ExtensionDomain type ID to mount into */
  domain: string;
  /** MfeEntry type ID to mount */
  entry: string;
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
  // Domain-specific fields are added via derived types, not defined here
}
```

### Extension Example

```typescript
// Extension using derived type with domain-specific fields
// Note: Instance IDs do NOT end with ~ (only schema IDs do)
const analyticsExtension = {
  // Instance ID - does NOT end with ~
  id: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.v1',
  // Domain instance ID - does NOT end with ~
  domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  // Entry instance ID - does NOT end with ~
  entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields (defined in derived widget_extension schema):
  title: 'Analytics Dashboard',
  icon: 'chart-line',
  size: 'large',
};

// Registration flow (GTS-native approach):
// 1. Register the extension as a GTS entity
plugin.register(analyticsExtension);

// 2. Validate the registered instance by its ID
// gts-ts extracts schema ID automatically from instance ID
const result = plugin.validateInstance(analyticsExtension.id);
```
