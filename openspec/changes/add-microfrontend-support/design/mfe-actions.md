# Design: MFE Actions

This document covers the Action and ActionsChain types and their usage in the MFE system.

---

## Context

**Action types in contracts** define what actions are supported:
- `ExtensionDomain.actions` - Action types that can target extensions in this domain
- `ExtensionDomain.extensionsActions` - Action types that extensions in this domain can send (when targeting the domain)
- `MfeEntry.actions` - Action types this MFE can send (when targeting its domain)
- `MfeEntry.domainActions` - Action types this MFE can receive (when targeted by actions chains)

**ActionsChains are the actual messages** routed by the ActionsChainsMediator to their targets (domains or extensions). Each runtime has its own mediator instance.

## Definition

**Action**: A typed message with a target (domain or extension), self-identifying type ID, optional payload, and optional timeout override.

**ActionsChain**: A linked structure of actions with `next` (on success) and `fallback` (on failure) branches, enabling declarative action workflows.

---

## Action Schema

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
      "$comment": "Optional timeout override in milliseconds. If not specified, uses target domain's defaultActionTimeout."
    }
  },
  "required": ["type", "target"]
}
```

## Actions Chain Schema

ActionsChain contains actual Action INSTANCES (embedded objects), not references. ActionsChain itself is NOT referenced by other types, so it has no `id` field.

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

## TypeScript Interface Definitions

```typescript
/**
 * An action with target, self-identifying type, and optional payload
 * GTS Type: gts.hai3.screensets.ext.action.v1~
 */
interface Action {
  /** Self-reference to this action's type ID */
  type: string;
  /** Target type ID (ExtensionDomain or Extension) */
  target: string;
  /** Optional action payload */
  payload?: unknown;
  /** Optional timeout override in milliseconds (overrides domain's defaultActionTimeout) */
  timeout?: number;
}

/**
 * Defines a mediated chain of actions with success/failure branches
 * GTS Type: gts.hai3.screensets.ext.actions_chain.v1~
 *
 * Contains actual Action INSTANCES (embedded objects).
 * ActionsChain is NOT referenced by other types, so it has NO id field.
 */
interface ActionsChain {
  /** Action instance (embedded object) */
  action: Action;
  /** Next chain to execute on success */
  next?: ActionsChain;
  /** Fallback chain to execute on failure */
  fallback?: ActionsChain;
}
```

---

## Actions Chain Mediation

The **ActionsChainsMediator** delivers action chains to targets and handles success/failure branching. The Type System plugin validates all type IDs and payloads.

### Execution Flow Diagram

```
+---------------------------+
|   Mediator receives       |
|   ActionsChain            |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Validate target         |
|   (typeSystem.isValidId)  |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Resolve target          |
|   (domain or extension)   |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Validate action type    |
|   against contract        |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Validate payload        |
|   (typeSystem.validate)   |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Deliver to target       |
|   (await handler)         |
+-----------+---------------+
            |
            v
      +-----+-----+
      |  Result?  |
      +-----+-----+
           /\
          /  \
         /    \
    SUCCESS   FAILURE/TIMEOUT
       |           |
       v           v
+------+------+   +------+------+
| chain.next  |   | chain.      |
| defined?    |   | fallback    |
+------+------+   | defined?    |
       |          +------+------+
      YES              |
       |              YES
       v               v
+------+------+   +------+------+
| Execute     |   | Execute     |
| next chain  |   | fallback    |
| (recurse)   |   | (recurse)   |
+-------------+   +-------------+
```

**Execution Steps:**
1. ActionsChainsMediator receives chain
2. Validate chain.action.target via typeSystem.isValidTypeId()
3. Resolve target (domain or entry instance)
4. Validate action against target's contract
5. Validate payload via typeSystem.validateInstance()
6. Deliver payload to target
7. Wait for result (Promise<success|failure>)
8. If success AND chain.next: mediator executes chain.next
9. If failure AND chain.fallback: mediator executes chain.fallback
10. Recurse until no next/fallback

### ActionsChainsMediator Interface

```typescript
/**
 * ActionsChainsMediator - Mediates action chain delivery between domains and extensions.
 */
interface ActionsChainsMediator {
  /** The Type System plugin used by this mediator */
  readonly typeSystem: TypeSystemPlugin;

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   * @param chain - The actions chain to execute
   * @param options - Optional per-request execution options (override defaults)
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /** Register an extension's action handler for receiving actions */
  registerExtensionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: ActionHandler
  ): void;

  /** Unregister an extension's action handler */
  unregisterExtensionHandler(extensionId: string): void;

  /** Register a domain's action handler for receiving actions from extensions */
  registerDomainHandler(
    domainId: string,
    handler: ActionHandler
  ): void;
}

interface ActionHandler {
  handleAction(actionTypeId: string, payload: unknown): Promise<void>;
}

interface ChainResult {
  completed: boolean;
  path: string[];  // Action IDs executed
  error?: string;  // If failed
}
```

### Action Support Validation

The ActionsChainsMediator validates that the target domain supports the action before delivery, throwing [`UnsupportedDomainActionError`](./mfe-errors.md) if not:

```typescript
/**
 * Validate that the target domain supports the action.
 */
function validateDomainActionSupport(
  domain: ExtensionDomain,
  actionTypeId: string
): boolean {
  return domain.actions.includes(actionTypeId);
}

// In ActionsChainsMediator.executeActionsChain():
const targetDomain = this.domains.get(action.target);
if (targetDomain && !validateDomainActionSupport(targetDomain, action.type)) {
  throw new UnsupportedDomainActionError(
    `Domain '${action.target}' does not support action '${action.type}'`,
    action.type,
    targetDomain.id
  );
}
```

---

## Explicit Timeout Configuration

Action timeouts are configured **explicitly in type definitions**, not as implicit code defaults. This ensures the platform is fully runtime-configurable and declarative.

### Timeout Resolution Model

Timeouts are resolved from two levels:

1. **ExtensionDomain** - Defines the default timeout for all actions targeting this domain
2. **Action** - Can optionally override the domain's default for specific actions

```
Effective timeout = action.timeout ?? domain.defaultActionTimeout
On timeout: execute fallback chain if defined (same as any other failure)
```

**Timeout as Failure**: Timeout is treated as just another failure case. The `ActionsChain.fallback` field handles all failures uniformly, including timeouts. There is no separate `fallbackOnTimeout` flag - the existing fallback mechanism provides complete failure handling.

This model ensures:
- **Explicit Configuration**: All timeouts are visible in type definitions
- **Runtime Configurability**: Domains define their timeout contracts
- **Action-Level Override**: Individual actions can specify different timeouts when needed
- **No Hidden Defaults**: No implicit code defaults for action timeouts
- **Unified Failure Handling**: Timeout triggers the same fallback mechanism as any other failure

### Chain-Level Configuration

The only mediator-level configuration is the total chain execution limit:

```typescript
// packages/screensets/src/mfe/mediator/config.ts

/**
 * Configuration for ActionsChain execution (mediator-level)
 *
 * NOTE: Individual action timeouts are NOT configured here.
 * Action timeouts are defined explicitly in ExtensionDomain (defaultActionTimeout)
 * and can be overridden per-action via Action.timeout field.
 */
interface ActionsChainsConfig {
  /**
   * Maximum total time for entire chain execution (ms)
   * This is a safety limit for the entire chain, not individual actions.
   * Default: 120000 (2 minutes)
   */
  chainTimeout?: number;
}

const DEFAULT_CONFIG: Required<ActionsChainsConfig> = {
  chainTimeout: 120000,
};

/**
 * Per-request execution options (chain-level only)
 *
 * NOTE: Action-level timeouts are defined in:
 * - ExtensionDomain.defaultActionTimeout (required)
 * - Action.timeout (optional override)
 *
 * Timeout is treated as a failure - the ActionsChain.fallback handles all failures uniformly.
 */
interface ChainExecutionOptions {
  /**
   * Override chain timeout for this execution (ms)
   * This limits the total time for the entire chain execution.
   */
  chainTimeout?: number;
}

/**
 * Extended ChainResult with timing information
 */
interface ChainResult {
  completed: boolean;
  path: string[];  // Action type IDs executed
  error?: string;
  timedOut?: boolean;
  executionTime?: number;  // Total execution time in ms
}
```

### Timeout Resolution in ActionsChainsMediator

The `ActionsChainsMediator` interface (defined above) resolves action timeouts from type definitions:
- `domain.defaultActionTimeout` (required) - default for all actions targeting the domain
- `action.timeout` (optional) - override for a specific action

Timeout is treated as a failure - the `ActionsChain.fallback` handles all failures uniformly.

See [MFE API](./mfe-api.md) for the complete `MfeBridgeConnection` interface.

### Usage Example

```typescript
// Domain defines default timeout in its type definition
const dashboardDomain: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.main.v1~',
  sharedProperties: [...],
  actions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,  // 30 seconds default for all actions
};

// Action uses domain's default timeout
const refreshAction: Action = {
  type: 'gts.hai3.screensets.ext.action.v1~acme.dashboard.ext.refresh.v1~',
  target: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.main.v1~',
  // No timeout specified - uses domain's 30000ms default
};

// Action overrides for a long-running operation
const exportAction: Action = {
  type: 'gts.hai3.screensets.ext.action.v1~acme.dashboard.ext.export.v1~',
  target: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.main.v1~',
  timeout: 120000,  // 2 minutes for this specific action
  // On timeout: executes fallback chain if defined (same as any other failure)
};

// Execute chain - timeouts come from type definitions
// On timeout or any failure: fallback chain is executed if defined
await mediator.executeActionsChain(chain);

// Override total chain timeout only (not individual action timeouts)
await mediator.executeActionsChain(chain, {
  chainTimeout: 300000,  // 5 minutes total for entire chain
});
```
