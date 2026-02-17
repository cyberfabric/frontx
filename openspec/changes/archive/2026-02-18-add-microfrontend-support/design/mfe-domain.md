# Design: MFE Domain and Extension

This document covers the ExtensionDomain and Extension types and their usage in the MFE system.

**Related Documents:**
- [MFE Entry](./mfe-entry-mf.md) - MfeEntry contract definition
- [MFE Actions](./mfe-actions.md) - Action types and mediation
- [Schemas](./schemas.md) - SharedProperty, LifecycleStage, LifecycleHook schema definitions
- [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) - Lifecycle actions and domain semantics
- [Type System](./type-system.md) - Contract validation rules

---

## Context

ExtensionDomain defines an extension point where MFE instances can be mounted. Domains can exist at any level of the hierarchy. See [MFE System Overview](./overview.md) for architecture details.

---

## ExtensionDomain

### Definition

**ExtensionDomain**: A GTS type that defines an extension point with its communication contract (shared properties, actions). Extensions mount into domains, and the domain validates that mounted extensions satisfy its contract requirements. Domains may specify `extensionsTypeId` to require extensions use a derived Extension type with domain-specific fields.

### Extension Domain Schema

See [schemas.md - Extension Domain Schema](./schemas.md#extension-domain-schema) for the JSON Schema definition.

### TypeScript Interface Definitions

```typescript
/**
 * Defines an extension point (domain) where MFEs can be mounted
 * GTS Type: gts.hai3.mfes.ext.domain.v1~
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

Contract matching validates that the entry's requirements are a subset of the domain's provisions (and vice versa for domain actions). See [Type System - Decision 8: Contract Matching Rules](./type-system.md#decision-8-contract-matching-rules) for the three subset rules, validation diagram, and error handling.

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

HAI3 provides base layout domains for the host level, and any MFE can define its own domains for nested composition. Base domains are registered at runtime via `runtime.registerDomain()`.

### Base Layout Domains

When using GTS plugin, base domains are instances of the `gts.hai3.mfes.ext.domain.v1~` schema, with instance IDs in the `hai3.screensets` package:
- `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1` - Sidebar panels
- `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1` - Modal popups
- `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1` - Full screen views
- `gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1` - Floating overlays

### Vendor-Defined Domains

Vendors define their own domains following the GTS type ID format:

**Instance ID Convention:** See [type-system.md - Instance ID Convention](./type-system.md#instance-id-convention).

```typescript
// 1. Register a derived Extension schema with domain-specific fields
plugin.registerSchema({
  "$id": "gts://gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~",
  "allOf": [{ "$ref": "gts://gts.hai3.mfes.ext.extension.v1~" }],
  "properties": {
    "title": { "type": "string" },
    "size": { "enum": ["small", "medium", "large"] }
  },
  "required": ["title", "size"]
});

// 2. Define and register the domain instance
const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  sharedProperties: ['gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.user_context.v1'],
  actions: ['gts.hai3.mfes.comm.action.v1~acme.dashboard.actions.refresh.v1'],
  extensionsActions: ['gts.hai3.mfes.comm.action.v1~acme.dashboard.actions.data_update.v1'],
  extensionsTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~',
  defaultActionTimeout: 30000,
  lifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
  extensionsLifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
};
plugin.register(widgetSlotDomain);
```

---

## Domain-Specific Layout Semantics

Each domain type has different lifecycle action support and mount semantics. See [Extension Lifecycle Actions - Domain Action Support Matrix](./mfe-ext-lifecycle-actions.md#domain-action-support-matrix) for the complete support matrix, swap semantics, and validation rules.

---

## Extension

### Definition

**Extension**: A GTS type that binds an MfeEntry to an ExtensionDomain, creating a concrete MFE instance. Domain-specific fields are defined in derived Extension types, validated natively by GTS.

Extension is the binding type that connects an [MFE entry](./mfe-entry-mf.md) to an extension domain, creating a concrete MFE **instance**. While MfeEntry defines what an MFE can do (its contract) and ExtensionDomain defines where MFE instances can mount (the slot), Extension creates the actual instance by specifying which entry mounts into which domain. Domain-specific metadata is defined in derived Extension schemas rather than a separate `uiMeta` field.

Extensions are registered dynamically at runtime and can be added/removed at any time during the application lifecycle.

### Extension Schema

See [schemas.md - Extension Schema (Base)](./schemas.md#extension-schema-base) for the base JSON Schema definition and [schemas.md - Screen Extension Schema (Derived)](./schemas.md#screen-extension-schema-derived) for the screen-domain-specific derived type.

### TypeScript Interface Definition

```typescript
/**
 * Presentation metadata for screen domain extensions.
 * Defines how a screen extension presents itself in navigation menus.
 * This is a screen-domain-specific field, NOT on the base Extension type.
 */
interface ExtensionPresentation {
  /** Display label in host UI (e.g., nav menu item text) */
  label: string;
  /** Icon identifier in host UI (e.g., Iconify icon name with prefix) */
  icon?: string;
  /** Route path for the extension (e.g., '/hello-world'). Used by navigation. */
  route: string;
  /** Sort order in host UI lists (lower = higher priority) */
  order?: number;
}

/**
 * Binds an MFE entry to an extension domain (base type)
 * GTS Type: gts.hai3.mfes.ext.extension.v1~
 *
 * The base Extension type contains only universal fields.
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
  // Domain-specific fields (like presentation) are added via derived types, not here
}

/**
 * Screen extension with presentation metadata (derived type).
 * GTS Type: gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~
 *
 * Used by the screen domain (extensionsTypeId references this schema).
 * Adds `presentation` for nav menu auto-population.
 */
interface ScreenExtension extends Extension {
  /** Required presentation metadata for screen extensions */
  presentation: ExtensionPresentation;
}
```

### Extension Examples

```typescript
// Screen extension with presentation (derived type)
// Note: Instance IDs do NOT end with ~ (only schema IDs do)
const helloWorldScreenExtension: ScreenExtension = {
  id: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~hai3.demo.mfe.helloworld.v1',
  presentation: {
    label: 'Hello World',
    icon: 'lucide:globe',
    route: '/hello-world',
    order: 10,
  },
};

// Widget extension with domain-specific fields (different derived type)
const analyticsExtension = {
  // Instance ID - does NOT end with ~
  id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.widgets.chart.v1',
  // Domain instance ID - does NOT end with ~
  domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  // Entry instance ID - does NOT end with ~
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields (defined in derived widget_extension schema):
  title: 'Analytics Dashboard',
  size: 'large',
};

// Registration flow (GTS-native approach):
// 1. Register the extension as a GTS entity
plugin.register(analyticsExtension);

// 2. Validate the registered instance by its ID
// gts-ts extracts schema ID automatically from instance ID
const result = plugin.validateInstance(analyticsExtension.id);
```
