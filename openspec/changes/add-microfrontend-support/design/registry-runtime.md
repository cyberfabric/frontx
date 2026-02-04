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

## Decisions

### Decision 13: Instance-Level Isolation (Framework-Agnostic, Default Behavior)

HAI3's default handler (`MfeHandlerMF`) enforces instance-level isolation by default. Each MFE **instance** runs with its own isolated runtime - even multiple instances of the **same** MFE entry are isolated from each other. Custom handlers can implement different strategies:

- Own @hai3/screensets instance
- Own TypeSystemPlugin instance (with own schema registry)
- Own @hai3/state container
- Can use ANY UI framework (Vue 3, Angular, Svelte, etc.)

The host uses React, but MFEs are NOT required to use React.

**Example (default behavior)**: If "ChartWidget" MFE entry is mounted twice (Extension A and Extension B), each instance has its own isolated runtime. Instance A cannot access Instance B's state, even though they share the same MFE entry code.

**Custom handlers can implement different isolation strategies:**
- Strict isolation (like default) - recommended for 3rd-party MFEs
- Shared state between internal MFE instances for coordination
- Hybrid approaches based on enterprise requirements

**Architecture:**
```
+---------------------------+      +---------------------------+
|      HOST RUNTIME         |      |       MFE RUNTIME         |
|  (React + TypeSystemA)    |      |  (Vue 3 + TypeSystemB)    |
+---------------------------+      +---------------------------+
|   TypeSystemPlugin A      |      |   TypeSystemPlugin B      |
|   (host schemas only)     |      |   (MFE schemas only)      |
+---------------------------+      +---------------------------+
|   HAI3 State Instance A   |      |   HAI3 State Instance B   |
+---------------------------+      +---------------------------+
|   React Host Component    |      |   Vue 3 MFE Component     |
+-------------+-------------+      +-------------+-------------+
              |                                  |
              |    MfeBridge (Contract)          |
              +==================================+
              |  - Shared Properties (host->MFE) |
              |  - Actions Chains (bidirectional)|
              +==================================+
```

**Key Points:**
- No direct store access across boundary
- No direct schema registry access across boundary (security)
- Shared properties passed via MfeBridge only
- Actions delivered via ActionsChainsMediator through MfeBridge

### Decision 14: Framework-Agnostic Isolation Model (Default Behavior)

**What**: HAI3's default handler enforces complete isolation by default where each MFE **instance** has its own runtime. This isolation applies even between multiple instances of the same MFE entry. Each MFE instance can use ANY UI framework. Custom handlers can implement different isolation strategies for internal MFEs.

**Why Complete GTS Isolation is the Default**:

With the default handler, GTS/TypeSystemPlugin isolation is enforced because:
1. MFEs could call `plugin.query('gts.*')` and discover ALL registered types (security violation)
2. MFEs could learn about host's internal domain structure
3. MFEs should ONLY know about their own contract with the host domain

**Custom handlers for internal MFEs** may choose to relax this isolation when security is not a concern (e.g., all MFEs are from the same trusted codebase).

**Internal Runtime Coordination**:

```typescript
// INTERNAL: Not exposed to MFE code
const runtimeConnections = new WeakMap<Element, RuntimeConnection>();

interface RuntimeConnection {
  hostRuntime: ScreensetsRegistry;
  bridges: Map<string, MfeBridgeConnection>;
}

// WHAT MFE CODE SEES: Only the MfeBridge interface
interface MfeBridge {
  readonly entryTypeId: string;
  readonly domainId: string;
  requestHostAction(actionTypeId: string, payload?: unknown): Promise<void>;
  subscribeToProperty(propertyTypeId: string, callback: (value: unknown) => void): () => void;
  getProperty(propertyTypeId: string): unknown;
  subscribeToAllProperties(callback: (properties: Map<string, unknown>) => void): () => void;
}
```

**Module Federation Shared Configuration**:

```javascript
// Host and ALL MFEs config
shared: {
  'react': { requiredVersion: '^18.0.0', singleton: false },
  'react-dom': { requiredVersion: '^18.0.0', singleton: false },
  '@globaltypesystem/gts-ts': { requiredVersion: '^1.0.0', singleton: false },
  '@hai3/screensets': { requiredVersion: '^1.0.0', singleton: false },
  'lodash': { requiredVersion: '^4.17.0', singleton: true },
  'date-fns': { requiredVersion: '^2.30.0', singleton: true },
}
```

**Class-Based ScreensetsRegistry**:

```typescript
// packages/screensets/src/runtime/ScreensetsRegistry.ts

class ScreensetsRegistry {
  private readonly domains = new Map<string, ExtensionDomainState>();
  private readonly extensions = new Map<string, ExtensionState>();
  private readonly childBridges = new Map<string, MfeBridgeConnection>();
  private readonly actionHandlers = new Map<string, ActionHandler>();
  private readonly handlers: MfeHandler[] = [];
  private parentBridge: MfeBridgeConnection | null = null;
  private readonly state: HAI3State;
  public readonly typeSystem: TypeSystemPlugin;

  constructor(config: ScreensetsRegistryConfig) {
    this.typeSystem = config.typeSystem;
    this.state = createHAI3State();
    if (config.mfeHandler) {
      this.registerHandler(new MfeHandlerMF(this.typeSystem, config.mfeHandler));
    }
  }

  registerDomain(domain: ExtensionDomain): void {
    const validation = this.typeSystem.validateInstance('gts.hai3.screensets.ext.domain.v1~', domain);
    if (!validation.valid) throw new DomainValidationError(validation.errors);

    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
      propertySubscribers: new Map(),
    });
  }

  // === Domain-Level Shared Property Management ===

  updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void {
    const domainState = this.domains.get(domainId);
    if (!domainState) throw new Error(`Domain '${domainId}' not registered`);
    if (!domainState.domain.sharedProperties.includes(propertyTypeId)) {
      throw new Error(`Property '${propertyTypeId}' not declared in domain`);
    }

    domainState.properties.set(propertyTypeId, value);

    // Notify all subscribed extensions in this domain
    for (const extensionId of domainState.extensions) {
      const extensionState = this.extensions.get(extensionId);
      if (!extensionState?.bridge) continue;

      const entry = extensionState.entry;
      const subscribes =
        entry.requiredProperties?.includes(propertyTypeId) ||
        entry.optionalProperties?.includes(propertyTypeId);

      if (subscribes) {
        (extensionState.bridge as MfeBridgeConnectionInternal).receivePropertyUpdate(propertyTypeId, value);
      }
    }
  }

  getDomainProperty(domainId: string, propertyTypeId: string): unknown {
    return this.domains.get(domainId)?.properties.get(propertyTypeId);
  }

  updateDomainProperties(domainId: string, properties: Map<string, unknown>): void {
    for (const [propertyTypeId, value] of properties) {
      this.updateDomainProperty(domainId, propertyTypeId, value);
    }
  }

  mountExtension(extension: Extension): MfeBridgeConnection {
    const validation = this.typeSystem.validateInstance('gts.hai3.screensets.ext.extension.v1~', extension);
    if (!validation.valid) throw new ExtensionValidationError(validation.errors);

    const domainState = this.domains.get(extension.domain);
    if (!domainState) throw new Error(`Domain '${extension.domain}' not registered`);

    const entry = this.getEntry(extension.entry);
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) throw new ContractValidationError(contractResult.errors);

    const uiMetaResult = validateExtensionUiMeta(this.typeSystem, extension);
    if (!uiMetaResult.valid) throw new UiMetaValidationError(uiMetaResult.errors);

    const instanceId = generateInstanceId();
    const bridge = this.createBridge(domainState, entry, instanceId);

    this.extensions.set(instanceId, { extension, entry, bridge });
    this.childBridges.set(instanceId, bridge);
    domainState.extensions.add(instanceId);

    return bridge;
  }

  async executeActionsChain(chain: ActionsChain): Promise<ChainResult> {
    const { target, type, payload } = chain.action;

    const validation = this.typeSystem.validateInstance(type, payload);
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
- GTS types and instances will be obtained from backend API in the future
- Enables runtime configuration, feature flags, and permission-based extensibility

#### ScreensetsRegistry Dynamic API

```typescript
class ScreensetsRegistry {
  async registerExtension(extension: Extension): Promise<void> {
    // Validate, verify domain exists, resolve entry, validate contract, validate uiMeta, register
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

  async mountExtension(extensionId: string, container: Element): Promise<MfeBridgeConnection> {
    // Get handler, load bundle, create bridge, register runtime, mount
    // Trigger 'activated' lifecycle stage
  }

  async unmountExtension(extensionId: string): Promise<void> {
    // Trigger 'deactivated' lifecycle stage
    // Dispose bridge, unregister runtime, update state
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
}
```

#### TypeInstanceProvider Interface

```typescript
interface TypeInstanceProvider {
  fetchExtensions(): Promise<Extension[]>;
  fetchDomains(): Promise<ExtensionDomain[]>;
  fetchInstance<T>(typeId: string): Promise<T | undefined>;
  subscribeToUpdates(callback: (update: InstanceUpdate) => void): () => void;
}

interface InstanceUpdate {
  type: 'added' | 'updated' | 'removed';
  typeId: string;
  instance?: unknown;
}

class InMemoryTypeInstanceProvider implements TypeInstanceProvider {
  registerExtension(extension: Extension): void;
  registerDomain(domain: ExtensionDomain): void;
  registerInstance(typeId: string, instance: unknown): void;
}
```

#### Usage Examples

```typescript
// Dynamic registration after user action
settingsButton.onClick = async () => {
  await runtime.registerExtension({
    id: 'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1~',
    domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
    entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    uiMeta: { title: 'Analytics', size: 'medium' },
  });

  const container = document.getElementById('widget-slot-1');
  const bridge = await runtime.mountExtension(extensionId, container);
};

// Registration after backend API response
async function onUserLogin(user: User) {
  runtime.setTypeInstanceProvider(new BackendTypeInstanceProvider({
    apiUrl: '/api/extensions',
    authToken: user.token,
  }));
  await runtime.refreshExtensionsFromBackend();
}

// Domain-level shared property updates
runtime.updateDomainProperty(domainId, themePropertyId, 'dark');
runtime.updateDomainProperties(domainId, new Map([
  [themePropertyId, 'dark'],
  [userContextPropertyId, { userId: '123' }],
]));
```
