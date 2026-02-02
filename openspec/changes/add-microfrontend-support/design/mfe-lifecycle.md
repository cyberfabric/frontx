# Design: MFE Lifecycle Stages

This document covers the lifecycle stage system - explicit, type-safe lifecycle hooks for extensions and domains.

**Related Documents:**
- [MFE Domain](./mfe-domain.md) - ExtensionDomain and Extension types
- [MFE Actions](./mfe-actions.md) - ActionsChain type
- [Type System](./type-system.md) - GTS type definitions
- [Schemas](./schemas.md) - JSON Schema definitions
- [Registry Runtime](./registry-runtime.md) - ScreensetsRegistry lifecycle methods

---

## Context

HAI3's purpose is runtime extendability. Lifecycle stages are first-class citizens represented as GTS types. Each extension or domain can explicitly declare its lifecycle hooks - an array binding stages to actions chains.

**Design Principle: Forced Explicitness**

- Lifecycle stages are defined types, not scattered hook registrations
- Actions chains are explicitly declared on the entity definition
- You look at an extension, you see what happens at each lifecycle stage
- No "prove negative" problem - absence of a hook means no action at that stage

---

## LifecycleStage

### Definition

**LifecycleStage**: A GTS type representing a lifecycle event that can trigger actions chains. HAI3 provides default stages, and projects can define custom stages.

### LifecycleStage Schema

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

### TypeScript Interface

```typescript
/**
 * Represents a lifecycle event that can trigger actions chains
 * GTS Type: gts.hai3.screensets.ext.lifecycle_stage.v1~
 */
interface LifecycleStage {
  /** The GTS type ID for this lifecycle stage */
  id: string;
  /** Human-readable description of when this stage triggers */
  description?: string;
}
```

---

## Default Lifecycle Stages

HAI3 provides four default lifecycle stages:

| Stage | GTS Type ID | When Triggered |
|-------|-------------|----------------|
| **init** | `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~` | Immediately after registration (domain or extension is registered with the registry) |
| **activated** | `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~` | When the extension is mounted and ready to receive actions |
| **deactivated** | `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~` | When the extension is unmounted but still registered |
| **destroyed** | `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~` | Immediately before unregistration (final cleanup) |

### Stage Triggering Sequence

**Extension Lifecycle:**
```
registerExtension(ext)
    |
    v
[init]  <-- Triggers ext.lifecycle hooks for 'init' stage
    |
    v
(extension registered, not mounted)
    |
    v
mountExtension(extId, container)
    |
    v
[activated]  <-- Triggers ext.lifecycle hooks for 'activated' stage
    |
    v
(extension mounted and running)
    |
    v
unmountExtension(extId)
    |
    v
[deactivated]  <-- Triggers ext.lifecycle hooks for 'deactivated' stage
    |
    v
(extension unmounted but still registered)
    |
    v
unregisterExtension(extId)
    |
    v
[destroyed]  <-- Triggers ext.lifecycle hooks for 'destroyed' stage
    |
    v
(extension removed from registry)
```

**Domain Lifecycle:**
```
registerDomain(domain)
    |
    v
[init]  <-- Triggers domain.lifecycle hooks for 'init' stage
    |
    v
(domain active, accepting extensions)
    |
    v
unregisterDomain(domainId)
    |
    v
[destroyed]  <-- Triggers domain.lifecycle hooks for 'destroyed' stage
    |
    v
(domain removed, all extensions unregistered first)
```

**Note**: Domains only have `init` and `destroyed` stages. The `activated`/`deactivated` stages apply only to extensions (which have mount/unmount lifecycle).

---

## LifecycleHook

### Definition

**LifecycleHook**: A binding between a lifecycle stage and an actions chain. When the stage triggers, the system executes the associated actions chain.

### LifecycleHook Schema

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

### TypeScript Interface

```typescript
/**
 * Binds a lifecycle stage to an actions chain
 * GTS Type: gts.hai3.screensets.ext.lifecycle_hook.v1~
 */
interface LifecycleHook {
  /** The lifecycle stage GTS type ID that triggers this hook */
  stage: string;
  /** The actions chain to execute when the stage triggers */
  actions_chain: ActionsChain;
}
```

---

## Extension and ExtensionDomain Lifecycle Field

Both Extension and ExtensionDomain types include an optional `lifecycle` field. Additionally, ExtensionDomain explicitly declares which lifecycle stages it supports.

```typescript
interface Extension {
  id: string;
  domain: string;
  entry: string;
  uiMeta: Record<string, unknown>;
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
}

interface ExtensionDomain {
  id: string;
  sharedProperties: string[];
  actions: string[];
  extensionsActions: string[];
  extensionsUiMeta: JSONSchema;
  defaultActionTimeout: number;
  /** Lifecycle stage type IDs supported for the domain itself */
  lifecycleStages: string[];
  /** Lifecycle stage type IDs supported for extensions in this domain */
  extensionsLifecycleStages: string[];
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
}
```

### Explicit Lifecycle Stage Support

**Design Principle: Forced Explicitness for Lifecycle Stages**

Each ExtensionDomain explicitly declares which lifecycle stages it supports via two fields:

1. **`lifecycleStages`**: Lifecycle stage type IDs supported for the domain itself
2. **`extensionsLifecycleStages`**: Lifecycle stage type IDs supported for extensions in this domain

This follows the same "forced explicitness" pattern as `actions`/`extensionsActions`:
- Custom stages must be explicitly listed as supported
- Validation rejects hooks referencing unsupported stages
- The complete lifecycle contract is visible in one place

**Benefits:**
- No ambiguity about which stages a domain supports
- Custom stages are explicitly part of the domain contract
- Validation catches misconfigured hooks early
- The domain definition shows the complete lifecycle interface

---

## Lifecycle Hook Validation

When registering extensions or domains, the ScreensetsRegistry validates that all lifecycle hooks reference supported stages.

### Validation Rules

**For ExtensionDomain registration:**
- Each hook in `domain.lifecycle` must reference a stage listed in `domain.lifecycleStages`
- Hooks referencing unsupported stages are rejected with `UnsupportedLifecycleStageError`

**For Extension registration:**
- The domain's `extensionsLifecycleStages` defines which stages extensions can use
- Each hook in `extension.lifecycle` must reference a stage listed in the domain's `extensionsLifecycleStages`
- Hooks referencing unsupported stages are rejected with `UnsupportedLifecycleStageError`

### Validation Implementation

```typescript
/**
 * Validate that a domain's lifecycle hooks reference only supported stages.
 */
function validateDomainLifecycleHooks(domain: ExtensionDomain): ValidationResult {
  if (!domain.lifecycle) return { valid: true };

  const errors: string[] = [];
  for (const hook of domain.lifecycle) {
    if (!domain.lifecycleStages.includes(hook.stage)) {
      errors.push(
        `Domain '${domain.id}' has lifecycle hook for unsupported stage '${hook.stage}'. ` +
        `Supported stages: ${domain.lifecycleStages.join(', ')}`
      );
    }
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true };
}

/**
 * Validate that an extension's lifecycle hooks reference only stages
 * supported by its domain.
 */
function validateExtensionLifecycleHooks(
  extension: Extension,
  domain: ExtensionDomain
): ValidationResult {
  if (!extension.lifecycle) return { valid: true };

  const errors: string[] = [];
  for (const hook of extension.lifecycle) {
    if (!domain.extensionsLifecycleStages.includes(hook.stage)) {
      errors.push(
        `Extension '${extension.id}' has lifecycle hook for stage '${hook.stage}' ` +
        `which is not supported by domain '${domain.id}'. ` +
        `Supported stages: ${domain.extensionsLifecycleStages.join(', ')}`
      );
    }
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true };
}
```

### Error Handling

```typescript
/**
 * Thrown when a lifecycle hook references a stage not supported by the domain.
 */
class UnsupportedLifecycleStageError extends Error {
  constructor(
    message: string,
    public readonly stageId: string,
    public readonly entityId: string,
    public readonly supportedStages: string[]
  ) {
    super(message);
    this.name = 'UnsupportedLifecycleStageError';
  }
}
```

---

## Custom Lifecycle Stages

Projects can define custom lifecycle stages as GTS types. Custom stages must derive from the base LifecycleStage type.

### Defining Custom Stages

```typescript
// Example: Dashboard widget refresh stage
// Type ID: gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~

const refreshStage: LifecycleStage = {
  id: 'gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~',
  description: 'Triggered when the dashboard requests all widgets to refresh their data',
};

// Custom stage schema - type ID is in the $id field
const refreshStageSchema: JSONSchema = {
  "$id": "gts://gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.ext.lifecycle_stage.v1~" }
  ],
  "properties": {
    "id": { "const": "gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~" },
    "description": { "type": "string" }
  }
};

// Register the custom stage schema - type ID extracted from $id
plugin.registerSchema(refreshStageSchema);
```

### Triggering Custom Stages

Custom stages are triggered programmatically via the ScreensetsRegistry:

```typescript
// Trigger a custom lifecycle stage for a specific extension
await registry.triggerLifecycleStage(
  extensionId,
  'gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~'
);

// Trigger a custom lifecycle stage for all extensions in a domain
await registry.triggerDomainLifecycleStage(
  domainId,
  'gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~'
);
```

---

## Usage Examples

### Extension with Lifecycle Hooks

```typescript
const analyticsExtension: Extension = {
  id: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.widgets.analytics.v1~',
  domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
  entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  uiMeta: {
    title: 'Analytics Dashboard',
    icon: 'chart-line',
    size: 'large',
  },
  lifecycle: [
    {
      // On init: notify analytics service that widget is registered
      stage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
      actions_chain: {
        action: {
          type: 'gts.hai3.screensets.ext.action.v1~acme.analytics.actions.widget_registered.v1~',
          target: 'gts.hai3.screensets.ext.domain.v1~acme.analytics.service.v1~',
          payload: { widgetId: 'analytics-dashboard' },
        },
      },
    },
    {
      // On activated: start data polling
      stage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~',
      actions_chain: {
        action: {
          type: 'gts.hai3.screensets.ext.action.v1~acme.analytics.actions.start_polling.v1~',
          target: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.widgets.analytics.v1~',
          payload: { interval: 30000 },
        },
      },
    },
    {
      // On deactivated: stop data polling to save resources
      stage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~',
      actions_chain: {
        action: {
          type: 'gts.hai3.screensets.ext.action.v1~acme.analytics.actions.stop_polling.v1~',
          target: 'gts.hai3.screensets.ext.extension.v1~acme.dashboard.widgets.analytics.v1~',
        },
      },
    },
    {
      // On destroyed: cleanup analytics tracking
      stage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~',
      actions_chain: {
        action: {
          type: 'gts.hai3.screensets.ext.action.v1~acme.analytics.actions.widget_destroyed.v1~',
          target: 'gts.hai3.screensets.ext.domain.v1~acme.analytics.service.v1~',
          payload: { widgetId: 'analytics-dashboard' },
        },
      },
    },
  ],
};
```

### Domain with Lifecycle Hooks

```typescript
const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
  sharedProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.user_context.v1~',
  ],
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT],
  extensionsActions: [
    'gts.hai3.screensets.ext.action.v1~acme.dashboard.ext.data_update.v1~',
  ],
  extensionsUiMeta: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      size: { enum: ['small', 'medium', 'large'] },
    },
    required: ['title', 'size'],
  },
  defaultActionTimeout: 30000,
  lifecycleStages: [
    // Domain itself only supports init/destroyed stages
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~',
  ],
  extensionsLifecycleStages: [
    // Extensions support all 4 default stages plus a custom refresh stage
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~acme.dashboard.lifecycle.refresh.v1~',
  ],
  lifecycle: [
    {
      // On init: log domain registration for debugging
      stage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
      actions_chain: {
        action: {
          type: 'gts.hai3.screensets.ext.action.v1~acme.logging.actions.log.v1~',
          target: 'gts.hai3.screensets.ext.domain.v1~acme.logging.service.v1~',
          payload: { message: 'Widget slot domain initialized', level: 'info' },
        },
      },
    },
  ],
};
```

---

## ScreensetsRegistry Lifecycle Methods

The ScreensetsRegistry provides methods for lifecycle management:

```typescript
interface ScreensetsRegistry {
  // ... existing methods ...

  /**
   * Trigger a lifecycle stage for a specific extension.
   * Executes all lifecycle hooks registered for the given stage.
   */
  triggerLifecycleStage(extensionId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Useful for custom stages like "refresh" that affect all widgets.
   */
  triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for a domain itself.
   */
  triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void>;
}
```

### Internal Lifecycle Triggering

The registry automatically triggers default stages at appropriate times:

```typescript
class ScreensetsRegistry {
  async registerExtension(extension: Extension): Promise<void> {
    // ... validation and registration ...

    // Trigger init stage
    await this.triggerLifecycleStageInternal(extension, HAI3_LIFECYCLE_INIT);
  }

  async mountExtension(extensionId: string, container: Element): Promise<MfeBridgeConnection> {
    // ... mounting logic ...

    // Trigger activated stage
    await this.triggerLifecycleStageInternal(extension, HAI3_LIFECYCLE_ACTIVATED);

    return bridge;
  }

  async unmountExtension(extensionId: string): Promise<void> {
    // Trigger deactivated stage
    await this.triggerLifecycleStageInternal(extension, HAI3_LIFECYCLE_DEACTIVATED);

    // ... unmounting logic ...
  }

  async unregisterExtension(extensionId: string): Promise<void> {
    // Trigger destroyed stage
    await this.triggerLifecycleStageInternal(extension, HAI3_LIFECYCLE_DESTROYED);

    // ... unregistration logic ...
  }

  private async triggerLifecycleStageInternal(
    entity: Extension | ExtensionDomain,
    stageId: string
  ): Promise<void> {
    if (!entity.lifecycle) return;

    const hooks = entity.lifecycle.filter(hook => hook.stage === stageId);
    for (const hook of hooks) {
      await this.executeActionsChain(hook.actions_chain);
    }
  }
}
```

---

## Constants

```typescript
// Default lifecycle stage type IDs
const HAI3_LIFECYCLE_INIT = 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~';
const HAI3_LIFECYCLE_ACTIVATED = 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~';
const HAI3_LIFECYCLE_DEACTIVATED = 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~';
const HAI3_LIFECYCLE_DESTROYED = 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~';

// Base lifecycle stage type (for custom stage derivation)
const HAI3_LIFECYCLE_STAGE_BASE = 'gts.hai3.screensets.ext.lifecycle_stage.v1~';
```

---

## Lifecycle Hook Execution Order

When a lifecycle stage triggers:

1. All hooks for that stage are collected from the entity's `lifecycle` array
2. Hooks are executed **in declaration order** (array order)
3. Each hook's actions chain follows standard chain execution (success -> next, failure -> fallback)
4. If a hook's chain fails and has no fallback, execution continues to the next hook
5. The stage is considered complete when all hooks have been processed

```
Extension.lifecycle = [
  { stage: 'init', actions_chain: chainA },  // Executed first
  { stage: 'init', actions_chain: chainB },  // Executed second (after chainA completes)
  { stage: 'activated', actions_chain: chainC },  // Not executed during 'init' stage
]

On 'init' stage trigger:
  1. Execute chainA (with its next/fallback branches)
  2. Execute chainB (with its next/fallback branches)
  3. Done - 'init' stage complete
```

---

## Why This Design?

This design follows the "Forced Explicitness" principle outlined at the beginning of this document:

1. **Explicit and Visible** - Look at an extension definition and see exactly what happens at each lifecycle stage. No searching for scattered event listeners or magic method names.

2. **Type Safety** - Lifecycle stages are GTS types. Invalid stage references are caught at validation time, and custom stages are discoverable via the type system.

3. **Reuses Existing Concepts** - Lifecycle hooks use the same ActionsChain type as all other HAI3 communication, providing consistent execution semantics (success/failure branching, timeout handling) with no new concepts to learn.
