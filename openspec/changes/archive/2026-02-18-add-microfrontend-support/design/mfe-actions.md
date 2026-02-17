# Design: MFE Actions

This document covers the Action and ActionsChain types and their usage in the MFE system.

**Related Documents:**
- [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) - `load_ext`, `mount_ext`, `unmount_ext` action types and domain support matrix

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

See [schemas.md - Action Schema](./schemas.md#action-schema) for the JSON Schema definition.

## Actions Chain Schema

ActionsChain contains actual Action INSTANCES (embedded objects), not references. ActionsChain itself is NOT referenced by other types, so it has no `id` field.

See [schemas.md - Actions Chain Schema](./schemas.md#actions-chain-schema) for the JSON Schema definition.

## TypeScript Interface Definitions

```typescript
/**
 * An action with target, self-identifying type, and optional payload
 * GTS Type: gts.hai3.mfes.comm.action.v1~
 */
interface Action {
  /** Self-reference to this action's type ID */
  type: string;
  /** Target type ID (ExtensionDomain or Extension) */
  target: string;
  /** Optional action payload */
  payload?: Record<string, unknown>;
  /** Optional timeout override in milliseconds (overrides domain's defaultActionTimeout) */
  timeout?: number;
}

/**
 * Defines a mediated chain of actions with success/failure branches
 * GTS Type: gts.hai3.mfes.comm.actions_chain.v1~
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

## Action Registration Strategy: `type` as GTS Entity ID

Actions use `type` as their identifier rather than `id`. The Action schema annotates the `type` field with `x-gts-ref: "/$id"`, which signals that `type` serves as the GTS entity identifier for registration and validation purposes.

**When registering an Action as a GTS entity:**
- The `type` field serves as the GTS entity ID (not a synthetic ID)
- The implementation must register the action using `type` as the entity identifier
- `typeSystem.register(action)` uses `action.type` as the entity key
- `typeSystem.validateInstance(action.type)` validates the registered action

**Why `type` and not `id`:**
- Actions are self-identifying messages; the `type` field IS the action's identity
- The `type` field follows the GTS type ID format (e.g., `gts.hai3.mfes.comm.action.v1~acme.dashboard.actions.refresh.v1`)
- Using `type` directly as the entity ID avoids the need for synthetic IDs (no `Date.now()` or `Math.random()` composition)
- This is consistent with the `x-gts-ref: "/$id"` annotation on the `type` field in the Action JSON schema

**Important:** The implementation MUST NOT generate synthetic IDs like `${action.type}:${Date.now()}:${Math.random()}` to register actions. The `type` field alone is the entity identifier.

---

## Actions Chain Mediation

The **ActionsChainsMediator** delivers action chains to targets and handles success/failure branching. The Type System plugin validates all type IDs and payloads. For targets in child runtimes (hierarchical composition), a `ChildDomainForwardingHandler` bridges the parent mediator to the child mediator -- see [MFE API - Cross-Runtime Action Chain Routing](./mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition).

### Execution Flow Diagram

```
+---------------------------+
|   Mediator receives       |
|   ActionsChain            |
+-----------+---------------+
            |
            v
+-----------+---------------------+
|   Resolve target                |
|   (domain or extension)         |
+-----------+---------------+
            |
            v
+-----------+---------------+
|   Validate action type    |
|   against contract        |
+-----------+---------------+
            |
            v
+-----------+-------------------------+
|   Validate payload                  |
|   (typeSystem.validateInstance)     |
+-----------+-------------------------+
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
2. Resolve target (domain or entry instance) from registered handlers
3. Validate action against target's contract
4. Validate payload via typeSystem.validateInstance()
5. Deliver payload to target
6. Wait for result (Promise<success|failure>)
7. If success AND chain.next: mediator executes chain.next
8. If failure AND chain.fallback: mediator executes chain.fallback
9. Recurse until no next/fallback

### ActionsChainsMediator

`ActionsChainsMediator` is an `@internal` abstract class. Its primary method is `executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>`, which returns a `ChainResult` containing `completed`, `path`, optional `error`, `timedOut`, and `executionTime` fields. `ScreensetsRegistry`'s public `executeActionsChain(chain): Promise<void>` wraps this -- it delegates to the mediator and logs `console.error` when `ChainResult.completed === false` (including the error message and execution path), providing failure visibility without changing the public `Promise<void>` contract. The method does NOT throw on chain failure because actions chains use the `fallback` mechanism for error recovery, and throwing would break fire-and-forget callers. Handler registration/unregistration methods are internal. The `ActionHandler` interface (`handleAction(actionTypeId, payload): Promise<void>`) is also internal -- used by domain and extension handlers. See [registry-runtime.md - Decision 18](./registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) for the abstract/concrete class pattern.

### Action Support Validation

The ActionsChainsMediator validates that the target domain supports the action before delivery. The action's `type` must be present in the domain's `actions` array. If not, [`UnsupportedDomainActionError`](./mfe-errors.md) is thrown with the action type ID and domain type ID.

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

The only mediator-level configuration is `chainTimeout` (default: 120000ms / 2 minutes) -- a safety limit for total chain execution time. `ChainResult`, `ChainExecutionOptions`, and `ActionsChainsConfig` are internal to `DefaultActionsChainsMediator` and not part of the public API.

### Usage Example

```typescript
// Domain defines default timeout in its type definition
const dashboardDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.main.v1',
  sharedProperties: [...],
  actions: [...],
  extensionsActions: [...],
  extensionsTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~',  // Derived Extension type (schema reference, ends with ~)
  defaultActionTimeout: 30000,  // 30 seconds default for all actions
};

// Action uses domain's default timeout
const refreshAction: Action = {
  type: 'gts.hai3.mfes.comm.action.v1~acme.dashboard.actions.refresh.v1',
  target: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.main.v1',
  // No timeout specified - uses domain's 30000ms default
};

// Action overrides for a long-running operation
const exportAction: Action = {
  type: 'gts.hai3.mfes.comm.action.v1~acme.dashboard.actions.export.v1',
  target: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.main.v1',
  timeout: 120000,  // 2 minutes for this specific action
  // On timeout: executes fallback chain if defined (same as any other failure)
};

// Execute chain - timeouts come from type definitions
// On timeout or any failure: fallback chain is executed if defined
const result = await mediator.executeActionsChain(chain);
// result: ChainResult { completed, path, error?, timedOut?, executionTime? }

// Chain-level timeout can be overridden per-request via ChainExecutionOptions:
const result2 = await mediator.executeActionsChain(chain, { chainTimeout: 60000 });

// Note: ScreensetsRegistry.executeActionsChain(chain) wraps this as Promise<void>.
// It logs console.error when ChainResult.completed === false (error visibility).
// The mediator's richer return type is internal.
```
