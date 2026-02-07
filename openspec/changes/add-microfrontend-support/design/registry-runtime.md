# Design: Registry and Runtime Architecture

This document covers the ScreensetsRegistry runtime isolation model, action chain mediation, MFE bridges, handler registration, and dynamic registration.

**Related Documents:**
- [Type System](./type-system.md) - Type System Plugin interface, GTS types, contract validation
- [MFE Loading](./mfe-loading.md) - MfeHandler abstract class, handler registry, Module Federation loading
- [MFE API](./mfe-api.md) - MfeEntryLifecycle interface
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types
- [MFE Domain](./mfe-domain.md) - ExtensionDomain and Extension types
- [MFE Lifecycle](./mfe-lifecycle.md) - Lifecycle stages and hooks

---

## Design Notes

### Standalone Functions vs Class-Based Capabilities

The Phase 8.4 correction establishes the rule: "NEVER standalone functions, ALWAYS abstract class + concrete class." This rule applies to **stateful capabilities** -- components that manage coordination, state, or property subscriptions using internal storage (e.g., WeakMap coordination, bridge factories, handler registries). These require the abstract class + concrete class pattern for Dependency Inversion, testability, and encapsulation of mutable state.

**Pure validation helpers** are exempt from this rule. The following functions are legitimately standalone because they are stateless -- they take inputs, return results, and have no side effects or internal state:

- `validateContract(entry, domain)` -- checks entry/domain contract compatibility (in `type-system.md`, used by `ScreensetsRegistry`)
- `validateExtensionType(plugin, extension, domain)` -- checks extension type hierarchy against domain's `extensionsTypeId` (in `type-system.md`)
- `validateDomainLifecycleHooks(domain)` -- checks domain lifecycle hooks reference supported stages (in `mfe-lifecycle.md`)
- `validateExtensionLifecycleHooks(extension, domain)` -- checks extension lifecycle hooks reference domain-supported stages (in `mfe-lifecycle.md`)

These functions receive all dependencies as parameters and produce a `ValidationResult` or `ContractValidationResult`. Wrapping them in a class would add indirection without benefit since there is no state to encapsulate and no abstraction to invert.

### ScreensetsRegistry as Facade

`ScreensetsRegistry` has a large public API surface (~15+ methods spanning registration, loading, mounting, property management, action chain execution, lifecycle triggering, and events). This is intentional: it serves as a **facade** that provides a single entry point for the MFE runtime while internally delegating to specialized collaborators:

| Responsibility | Internal Collaborator | Design Document |
|---|---|---|
| Action chain execution | `ActionsChainsMediator` | [mfe-actions.md](./mfe-actions.md) |
| WeakMap runtime coordination | `RuntimeCoordinator` (abstract) / `WeakMapRuntimeCoordinator` (concrete) | Phase 8.4 in this document |
| MFE bundle loading | `MfeHandler` polymorphism (`MfeHandlerMF`, custom handlers) | [mfe-loading.md](./mfe-loading.md) |
| Bridge creation | `MfeBridgeFactory` polymorphism (`MfeBridgeFactoryDefault`, custom factories) | [mfe-loading.md](./mfe-loading.md) |
| Type validation | `TypeSystemPlugin` (injected) | [type-system.md](./type-system.md) |

The public API is cohesive (all methods relate to MFE runtime management), and the internal delegation keeps each collaborator focused on a single responsibility. Consumer code interacts only with `ScreensetsRegistry`; the collaborators are implementation details.

---

## Decisions

### Decision 13: Instance-Level Isolation (Framework-Agnostic, Default Behavior)

See [Runtime Isolation in overview.md](./overview.md#runtime-isolation-default-behavior) for the complete isolation model, architecture diagrams, and recommendations.

### Decision 14: Framework-Agnostic Isolation Model (Default Behavior)

See [Runtime Isolation in overview.md](./overview.md#runtime-isolation-default-behavior) for the complete isolation model.

**Class-Based ScreensetsRegistry**:

```typescript
// packages/screensets/src/runtime/ScreensetsRegistry.ts

/**
 * State for a registered extension domain.
 * Properties are stored as SharedProperty { id, value } to preserve the
 * property type ID alongside the value during bridge propagation.
 */
interface ExtensionDomainState {
  domain: ExtensionDomain;
  properties: Map<string, SharedProperty>;  // key = propertyTypeId, value = { id: propertyTypeId, value: unknown }
  extensions: Set<string>;
  propertySubscribers: Map<string, Set<(value: SharedProperty) => void>>;
}

class ScreensetsRegistry {
  private readonly domains = new Map<string, ExtensionDomainState>();
  private readonly extensions = new Map<string, ExtensionState>();
  private readonly childBridges = new Map<string, ParentMfeBridge>();
  private readonly actionHandlers = new Map<string, ActionHandler>();
  private readonly handlers: MfeHandler[] = [];
  private readonly coordinator: RuntimeCoordinator; // Dependency Inversion (abstract class)
  private parentBridge: ParentMfeBridge | null = null;
  private readonly state: HAI3State;
  public readonly typeSystem: TypeSystemPlugin;

  constructor(config: ScreensetsRegistryConfig) {
    this.typeSystem = config.typeSystem;
    this.coordinator = config.coordinator ?? new WeakMapRuntimeCoordinator();
    this.state = createHAI3State();
    if (config.mfeHandler) {
      this.registerHandler(config.mfeHandler);
    }
  }

  registerDomain(domain: ExtensionDomain): void {
    // 1. Register the domain as a GTS entity
    this.typeSystem.register(domain);

    // 2. Validate the registered domain instance by its ID
    // Note: domain.id does NOT end with ~ (it's an instance ID, not a schema ID)
    const validation = this.typeSystem.validateInstance(domain.id);
    if (!validation.valid) throw new DomainValidationError(validation.errors, domain.id);

    this.domains.set(domain.id, {
      domain,
      properties: new Map(),  // Map<string, SharedProperty>
      extensions: new Set(),
      propertySubscribers: new Map(),
    });
  }

  // === Domain-Level Shared Property Management ===
  //
  // Domain properties are stored as Map<string, SharedProperty> where SharedProperty
  // is { id: string, value: unknown }. This preserves the property type ID alongside
  // the value, enabling type-safe property propagation through bridges.
  // The public API accepts raw `value: unknown` for convenience; the registry wraps
  // it in a SharedProperty internally.

  updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void {
    const domainState = this.domains.get(domainId);
    if (!domainState) throw new Error(`Domain '${domainId}' not registered`);
    if (!domainState.domain.sharedProperties.includes(propertyTypeId)) {
      throw new Error(`Property '${propertyTypeId}' not declared in domain`);
    }

    // Store as SharedProperty { id, value } to preserve type ID alongside value
    const sharedProperty: SharedProperty = { id: propertyTypeId, value };
    domainState.properties.set(propertyTypeId, sharedProperty);

    // Notify all subscribed extensions in this domain
    for (const extensionId of domainState.extensions) {
      const extensionState = this.extensions.get(extensionId);
      if (!extensionState?.bridge) continue;

      const entry = extensionState.entry;
      const subscribes =
        entry.requiredProperties?.includes(propertyTypeId) ||
        entry.optionalProperties?.includes(propertyTypeId);

      if (subscribes) {
        (extensionState.bridge as ParentMfeBridgeInternal).receivePropertyUpdate(propertyTypeId, value);
      }
    }
  }

  getDomainProperty(domainId: string, propertyTypeId: string): unknown {
    const sharedProperty = this.domains.get(domainId)?.properties.get(propertyTypeId);
    return sharedProperty?.value;
  }

  updateDomainProperties(domainId: string, properties: Map<string, unknown>): void {
    for (const [propertyTypeId, value] of properties) {
      this.updateDomainProperty(domainId, propertyTypeId, value);
    }
  }

  mountExtension(extensionId: string, container: Element): Promise<ParentMfeBridge> {
    const extension = this.extensions.get(extensionId)?.extension;
    if (!extension) throw new Error(`Extension '${extensionId}' not registered`);

    // Extension was already registered and validated during registerExtension()
    // Re-validate the registered instance by its ID (optional, for safety)
    // Note: extensionId does NOT end with ~ (it's an instance ID)
    const validation = this.typeSystem.validateInstance(extensionId);
    if (!validation.valid) throw new ExtensionValidationError(validation.errors, extensionId);

    const domainState = this.domains.get(extension.domain);
    if (!domainState) throw new Error(`Domain '${extension.domain}' not registered`);

    const entry = this.getEntry(extension.entry);
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) throw new ContractValidationError(contractResult.errors, extension.entry, extension.domain);

    const typeResult = validateExtensionType(this.typeSystem, extension, domainState.domain);
    if (!typeResult.valid) throw new ExtensionTypeError(extension.id, domainState.domain.extensionsTypeId!);

    const instanceId = generateInstanceId();
    const bridge = this.createBridge(domainState, entry, instanceId);

    this.extensions.set(instanceId, { extension, entry, bridge });
    this.childBridges.set(instanceId, bridge);
    domainState.extensions.add(instanceId);

    return bridge;
  }

  async executeActionsChain(chain: ActionsChain): Promise<ChainResult> {
    const { target, type, payload } = chain.action;

    // For action payload validation, we register and validate the action itself
    // Note: Action instances have a `type` field (self-reference) instead of `id`
    // The action's type field serves as its instance identifier
    this.typeSystem.register(chain.action);
    const validation = this.typeSystem.validateInstance(type);
    if (!validation.valid) return this.handleChainFailure(chain, validation.errors);

    try {
      if (this.domains.has(target)) {
        await this.deliverToDomain(target, chain.action);
      } else if (this.childBridges.has(target)) {
        await this.deliverToChild(target, chain.action);
      } else if (this.parentBridge && target === this.parentBridge.domainId) {
        return this.parentBridge.sendActionsChain(chain);
      } else {
        throw new Error(`Unknown target: ${target}`);
      }

      if (chain.next) return this.executeActionsChain(chain.next);
      return { completed: true, path: [chain.action.type] };
    } catch (error) {
      return this.handleChainFailure(chain, error);
    }
  }

  registerHandler(handler: MfeHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  // === Lifecycle Stage Triggering ===

  /**
   * Trigger a lifecycle stage for a specific extension.
   * Executes all lifecycle hooks registered for the given stage.
   */
  async triggerLifecycleStage(extensionId: string, stageId: string): Promise<void> {
    const extensionState = this.extensions.get(extensionId);
    if (!extensionState) throw new Error(`Extension '${extensionId}' not registered`);
    await this.triggerLifecycleStageInternal(extensionState.extension, stageId);
  }

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Useful for custom stages like "refresh" that affect all widgets.
   */
  async triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void> {
    const domainState = this.domains.get(domainId);
    if (!domainState) throw new Error(`Domain '${domainId}' not registered`);

    for (const extensionId of domainState.extensions) {
      const extensionState = this.extensions.get(extensionId);
      if (extensionState) {
        await this.triggerLifecycleStageInternal(extensionState.extension, stageId);
      }
    }
  }

  /**
   * Trigger a lifecycle stage for a domain itself.
   */
  async triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void> {
    const domainState = this.domains.get(domainId);
    if (!domainState) throw new Error(`Domain '${domainId}' not registered`);
    await this.triggerLifecycleStageInternal(domainState.domain, stageId);
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

  dispose(): void {
    this.parentBridge?.dispose();
    for (const bridge of this.childBridges.values()) bridge.dispose();
    this.childBridges.clear();
    this.domains.clear();
    this.extensions.clear();
  }
}
```

### Decision 15: Error Class Hierarchy

The MFE system defines a hierarchy of error classes for specific failure scenarios. See [mfe-errors.md](./mfe-errors.md) for the complete error class definitions.

### Decision 16: Shadow DOM Utilities

Shadow DOM utilities are provided by `@hai3/screensets` for style isolation.

```typescript
// packages/screensets/src/mfe/shadow/index.ts

interface ShadowRootOptions {
  mode?: 'open' | 'closed';
  delegatesFocus?: boolean;
}

function createShadowRoot(element: HTMLElement, options: ShadowRootOptions = {}): ShadowRoot;
function injectCssVariables(shadowRoot: ShadowRoot, variables: Record<string, string>): void;
function injectStylesheet(shadowRoot: ShadowRoot, css: string, id?: string): void;
```

### Decision 17: Dynamic Registration Model

**What**: Extensions and MFEs can be registered at ANY time during the application lifecycle.

**Why**:
- Extensions are NOT known at app initialization time
- Enables runtime configuration, feature flags, and permission-based extensibility

**Boundary**: The MFE system's scope is **registration and lifecycle**, NOT fetching. How entities are obtained from backends is outside the MFE system scope. Entities become the MFE system's concern only AFTER they are registered.

#### ScreensetsRegistry Dynamic API

```typescript
class ScreensetsRegistry {
  // === Type System ===

  /** The Type System plugin instance */
  public readonly typeSystem: TypeSystemPlugin;

  // === Dynamic Registration (anytime during runtime) ===

  async registerExtension(extension: Extension): Promise<void> {
    // Validate, verify domain exists, validate contract, verify type hierarchy, register
    // Trigger 'init' lifecycle stage
  }

  async unregisterExtension(extensionId: string): Promise<void> {
    // Trigger 'destroyed' lifecycle stage
    // Unmount if mounted, remove from registry and domain, emit event
  }

  async registerDomain(domain: ExtensionDomain): Promise<void> {
    // Validate, register, emit event
    // Trigger 'init' lifecycle stage
  }

  async unregisterDomain(domainId: string): Promise<void> {
    // Trigger 'destroyed' lifecycle stage
    // Unregister all extensions first, remove domain, emit event
  }

  // === Bundle Loading (MFE system responsibility) ===

  async loadExtension(extensionId: string): Promise<void> {
    // Get extension, resolve entry, find handler via registry
    // Load bundle using handler.load(entry)
    // Cache loaded lifecycle for mounting
    // Does NOT mount to DOM
  }

  async preloadExtension(extensionId: string): Promise<void> {
    // Same as loadExtension but semantically for preloading
    // Useful for hover preload before user clicks
    // Uses handler.preload() if available for batch optimization
  }

  // === Mounting (lifecycle) ===

  async mountExtension(extensionId: string, container: Element): Promise<ParentMfeBridge> {
    // If not loaded, load first
    // Create bridge, register runtime, mount
    // Trigger 'activated' lifecycle stage
  }

  async unmountExtension(extensionId: string): Promise<void> {
    // Trigger 'deactivated' lifecycle stage
    // Dispose bridge, unregister runtime, update state
    // Does NOT unload bundle (stays cached for remounting)
  }

  // === Lifecycle Stage Triggering ===

  async triggerLifecycleStage(extensionId: string, stageId: string): Promise<void> {
    // Trigger custom lifecycle stage for a specific extension
  }

  async triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void> {
    // Trigger custom lifecycle stage for all extensions in a domain
  }

  async triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void> {
    // Trigger custom lifecycle stage for the domain itself
  }

  // === Events ===

  on(event: string, callback: Function): void {
    // Subscribe to registry events
  }

  off(event: string, callback: Function): void {
    // Unsubscribe from registry events
  }
}
```

**System Boundary:** Entity fetching is outside MFE system scope. See [System Boundary](./overview.md#system-boundary) for details.

<a name="load-vs-mount"></a>
**Load vs Mount:** Loading fetches the JavaScript bundle; mounting renders to DOM. An extension can be loaded but not mounted (preloading scenario). `mountExtension()` auto-loads if not already loaded. `unmountExtension()` does NOT unload the bundle (stays cached for remounting).

**Manifest Handling:** MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf) for details.

#### Usage Examples

```typescript
// Dynamic registration after user action
settingsButton.onClick = async () => {
  // Extension using derived type that includes domain-specific fields
  // Note: Instance IDs do NOT end with ~ (only schema IDs do)
  await runtime.registerExtension({
    id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics_widget.v1',
    domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
    entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    // Domain-specific fields from derived Extension type (no uiMeta wrapper)
    title: 'Analytics',
    size: 'medium',
  });

  const container = document.getElementById('widget-slot-1');
  const bridge = await runtime.mountExtension(extensionId, container);
};

// Registration after backend API response (application handles fetching)
async function onUserLogin(user: User) {
  // Application code fetches entities - this is OUTSIDE MFE system scope
  const response = await fetch('/api/extensions', {
    headers: { 'Authorization': `Bearer ${user.token}` }
  });
  const { domains, extensions } = await response.json();

  // MFE system only handles registration of already-fetched entities
  for (const domain of domains) {
    await runtime.registerDomain(domain);
  }
  for (const extension of extensions) {
    await runtime.registerExtension(extension);
  }
}

// Domain-level shared property updates
runtime.updateDomainProperty(domainId, themePropertyId, 'dark');
runtime.updateDomainProperties(domainId, new Map([
  [themePropertyId, 'dark'],
  [userContextPropertyId, { userId: '123' }],
]));
```
