# Design: Registry and Runtime Architecture

This document covers the ScreensetsRegistry runtime isolation model, action chain mediation, MFE bridges, and dynamic registration.

**Related Documents:**
- [Type System](./type-system.md) - Type System Plugin interface, GTS types, contract validation
- [MFE Loading](./mfe-loading.md) - Module Federation loading, error handling, manifest fetching

---

## Decisions

### Decision 9: Isolated Runtime Instances (Framework-Agnostic)

Each MFE instance runs with its own FULLY ISOLATED runtime:
- Own @hai3/screensets instance
- Own TypeSystemPlugin instance (with own schema registry)
- Own @hai3/state container
- Can use ANY UI framework (Vue 3, Angular, Svelte, etc.)

The host uses React, but MFEs are NOT required to use React.

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
              |  - Shared Properties (read-only) |
              |  - Actions (bidirectional)       |
              +==================================+
              |                                  |
              |  RuntimeCoordinator (PRIVATE)    |
              |  (WeakMap<Element, Connection>)  |
              +----------------------------------+
```

**Key Points:**
- No direct store access across boundary
- No direct schema registry access across boundary (security)
- Shared properties passed via MfeBridge only
- Actions delivered via ActionsChainsMediator through MfeBridge
- Internal coordination via private RuntimeCoordinator (not exposed to MFE code)
- MFEs can use ANY UI framework - not limited to React

### Decision 10: Actions Chain Mediation

The **ActionsChainsMediator** delivers action chains to targets and handles success/failure branching. The Type System plugin validates all type IDs and payloads.

**Execution Flow:**
```
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
```

**API Contract:**

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
  handleAction(actionId: string, payload: unknown): Promise<void>;
}

interface ChainResult {
  completed: boolean;
  path: string[];  // Action IDs executed
  error?: string;  // If failed
}
```

### Decision 11: Hierarchical Extension Domains

Extension domains can be hierarchical. HAI3 provides base layout domains, and vendor screensets can define their own. Base domains are registered via the Type System plugin.

**Base Layout Domains (registered via plugin):**

When using GTS plugin, base domains follow the format `gts.hai3.screensets.ext.domain.<layout>.v1~`:
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.sidebar.v1~` - Sidebar panels
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1~` - Modal popups
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.screen.v1~` - Full screen views
- `gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.overlay.v1~` - Floating overlays

**Vendor-Defined Domains:**

Vendors define their own domains following the GTS type ID format:

```typescript
// Example: Dashboard screenset defines widget slot domain
// Type ID: gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~

const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
  sharedProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.user_context.v1',
  ],
  actions: [
    'gts.acme.dashboard.ext.action.refresh.v1~',
  ],
  extensionsActions: [
    'gts.acme.dashboard.ext.action.data_update.v1~',
  ],
  extensionsUiMeta: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      icon: { type: 'string' },
      size: { enum: ['small', 'medium', 'large'] },
    },
    required: ['title', 'size'],
  },
};
```

### Decision 13: Framework-Agnostic Isolation Model

**What**: MFEs are completely isolated with their own runtime instances. Each MFE can use ANY UI framework (React, Vue 3, Angular, Svelte, etc.) - the host uses React but MFEs are framework-agnostic.

**Key Architectural Principle**: Complete Isolation

Each MFE runtime instance has:
- Its own `@hai3/screensets` instance (NOT singleton)
- Its own `TypeSystemPlugin` instance (NOT singleton)
- Its own isolated schema registry
- No direct access to host or other MFE internals

**Why Complete GTS Isolation is Required**:

If GTS/TypeSystemPlugin were shared as a singleton:
1. **Security Violation**: MFEs could call `plugin.query('gts.*')` and discover ALL registered types from the host and other MFEs
2. **Information Leakage**: An MFE could learn about host's internal domain structure, other MFE contracts, and business logic encoded in type schemas
3. **Contract Violation**: MFEs should ONLY know about their own contract with the host domain - nothing more

With isolated TypeSystemPlugin per runtime:
- Each MFE's plugin only contains schemas for that MFE's contract types
- Host's plugin contains host-specific schemas (domains, extensions)
- No cross-boundary schema discovery is possible

**Why Framework Agnostic**:

1. **Vendor Extensibility**: Third-party vendors may use Vue 3, Angular, or other frameworks for their MFEs
2. **No React Dependency**: MFEs are NOT required to use React - only the host uses React
3. **Technology Freedom**: Each MFE team chooses their own framework and tooling

**Internal Runtime Coordination**:

Host and MFE runtimes need to coordinate (property updates, action delivery) but this coordination is PRIVATE. The coordination uses a WeakMap-based approach for better encapsulation and automatic garbage collection:

```typescript
// INTERNAL: Not exposed to MFE code - used only by ScreensetsRegistry internals

// Module-level WeakMap instead of window global
const runtimeConnections = new WeakMap<Element, RuntimeConnection>();

interface RuntimeConnection {
  hostRuntime: ScreensetsRegistry;
  bridges: Map<string, MfeBridgeConnection>; // entryTypeId -> bridge
}

// Register when mounting MFE to a container element
function registerRuntime(container: Element, connection: RuntimeConnection): void;

// Lookup by container element
function getRuntime(container: Element): RuntimeConnection | undefined;

// Cleanup when unmounting
function unregisterRuntime(container: Element): void;

interface RuntimeCoordinator {
  sendToChild(instanceId: string, message: CoordinatorMessage): void;
  sendToParent(message: CoordinatorMessage): void;
  onMessage(handler: (message: CoordinatorMessage) => void): () => void;
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

**Communication Layers**:

```
+------------------+     Contract (MfeBridge)      +------------------+
|   HOST RUNTIME   | <===========================> |   MFE RUNTIME    |
| (React + GTS A)  |     Properties & Actions      | (Vue 3 + GTS B)  |
+--------+---------+                               +--------+---------+
         |                                                  |
         |  Internal Coordination (PRIVATE)                 |
         |  (window.__hai3_runtime_coordinator)             |
         +--------------------------------------------------+
```

**Module Federation Shared Configuration**:

Module Federation provides TWO independent benefits:
1. **Code/bundle sharing** - Download code once, cache it (always enabled when dep is in `shared`)
2. **Runtime instance isolation** - Controlled by `singleton` flag

With `singleton: false` (the default in HAI3), you get BOTH benefits:
- Code is downloaded and cached once (performance)
- Each MFE gets its OWN instance (isolation)

```javascript
// Host and ALL MFEs webpack/rspack/vite config
shared: {
  // React/ReactDOM: Share CODE but NOT instance (singleton: false)
  // This gives bundle optimization while preserving isolation
  'react': {
    requiredVersion: '^18.0.0',
    singleton: false,  // Each MFE gets own React instance
  },
  'react-dom': {
    requiredVersion: '^18.0.0',
    singleton: false,
  },

  // GTS: Share CODE but NOT instance (isolation required for security)
  '@globaltypesystem/gts-ts': {
    requiredVersion: '^1.0.0',
    singleton: false,  // Each runtime has isolated schema registry
  },

  // @hai3/screensets: Share CODE but NOT instance
  '@hai3/screensets': {
    requiredVersion: '^1.0.0',
    singleton: false,  // Each MFE has isolated TypeSystemPlugin
  },

  // Stateless utilities: Can safely use singleton: true
  'lodash': {
    requiredVersion: '^4.17.0',
    singleton: true,   // No state, safe to share instance
  },
  'date-fns': {
    requiredVersion: '^2.30.0',
    singleton: true,
  },
}
```

**Summary of singleton usage:**
| Package Type | singleton | Reason |
|--------------|-----------|--------|
| React/ReactDOM | `false` | Has internal state (hooks, context) |
| @hai3/* | `false` | Has runtime state (TypeSystemPlugin, schema registry) |
| GTS | `false` | Has schema registry state |
| lodash, date-fns | `true` | Purely functional, no state |

**Class-Based ScreensetsRegistry**:

```typescript
// packages/screensets/src/runtime/ScreensetsRegistry.ts

/**
 * ScreensetsRegistry - FULLY isolated instance per MFE.
 * Each instance has:
 * - Its own TypeSystemPlugin instance (NOT shared)
 * - Its own schema registry (isolated from other runtimes)
 * - Its own state, domains, extensions, bridges
 *
 * Can operate as:
 * - Connect to a parent host (be a child MFE)
 * - Define extension domains and host nested MFEs (be a host)
 * - Both simultaneously (intermediate host pattern)
 */
class ScreensetsRegistry {
  // === Isolated State (per instance) ===
  private readonly domains = new Map<string, ExtensionDomainState>();
  private readonly extensions = new Map<string, ExtensionState>();
  private readonly childBridges = new Map<string, MfeBridgeConnection>();
  private readonly actionHandlers = new Map<string, ActionHandler>();

  // Parent connection (if this runtime is an MFE)
  private parentBridge: MfeBridgeConnection | null = null;

  // Isolated HAI3 state for this runtime
  private readonly state: HAI3State;

  // ISOLATED Type System instance - NOT shared across runtimes
  // Each runtime has its own TypeSystemPlugin with its own schema registry
  // This prevents MFEs from discovering host/other MFE types via plugin.query()
  public readonly typeSystem: TypeSystemPlugin;

  constructor(config: ScreensetsRegistryConfig) {
    this.typeSystem = config.typeSystem;
    this.state = createHAI3State();  // Fresh isolated state

    if (config.mfeLoader) {
      this.mfeLoader = new MfeLoader(this.typeSystem, config.mfeLoader);
    }
  }

  /**
   * Register an extension domain.
   */
  registerDomain(domain: ExtensionDomain): void {
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.domain.v1~',
      domain
    );
    if (!validation.valid) {
      throw new DomainValidationError(validation.errors);
    }

    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
    });
  }

  /**
   * Mount an extension into a domain.
   */
  mountExtension(extension: Extension): MfeBridgeConnection {
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.extension.v1~',
      extension
    );
    if (!validation.valid) {
      throw new ExtensionValidationError(validation.errors);
    }

    const domainState = this.domains.get(extension.domain);
    if (!domainState) {
      throw new Error(`Domain '${extension.domain}' not registered`);
    }

    // Contract validation
    const entry = this.getEntry(extension.entry);
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) {
      throw new ContractValidationError(contractResult.errors);
    }

    // Dynamic uiMeta validation
    const uiMetaResult = validateExtensionUiMeta(this.typeSystem, extension);
    if (!uiMetaResult.valid) {
      throw new UiMetaValidationError(uiMetaResult.errors);
    }

    // Create domain-scoped bridge for this extension
    const instanceId = generateInstanceId();
    const bridge = this.createBridge(domainState, entry, instanceId);

    this.extensions.set(instanceId, { extension, entry, bridge });
    this.childBridges.set(instanceId, bridge);
    domainState.extensions.add(instanceId);

    return bridge;
  }

  /**
   * Connect this runtime to a parent host via bridge.
   */
  connectToParent(bridge: MfeBridgeConnection): void {
    this.parentBridge = bridge;
    bridge.subscribeToAllProperties((props) => {
      this.handleParentProperties(props);
    });
    this.registerDomainActionHandlers(bridge);
  }

  /**
   * Execute an actions chain.
   */
  async executeActionsChain(chain: ActionsChain): Promise<ChainResult> {
    const { target, type, payload } = chain.action;

    const validation = this.typeSystem.validateInstance(type, payload);
    if (!validation.valid) {
      return this.handleChainFailure(chain, validation.errors);
    }

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

      if (chain.next) {
        return this.executeActionsChain(chain.next);
      }
      return { completed: true, path: [chain.action.type] };

    } catch (error) {
      return this.handleChainFailure(chain, error);
    }
  }

  private async handleChainFailure(
    chain: ActionsChain,
    error: unknown
  ): Promise<ChainResult> {
    if (chain.fallback) {
      return this.executeActionsChain(chain.fallback);
    }
    return { completed: false, path: [], error: String(error) };
  }

  dispose(): void {
    this.parentBridge?.dispose();
    this.parentBridge = null;
    for (const bridge of this.childBridges.values()) {
      bridge.dispose();
    }
    this.childBridges.clear();
    this.domains.clear();
    this.extensions.clear();
    this.actionHandlers.clear();
  }
}
```

### Decision 14: MFE Bridge Interfaces

The MFE Bridge provides a bidirectional communication channel between host and MFE. The bridge is created by the host when mounting an extension and passed to the MFE component via props.

#### Bridge Interface Definitions

```typescript
// packages/screensets/src/mfe/bridge/types.ts

/**
 * Read-only bridge interface exposed to MFE components.
 * MFEs use this to communicate with the host.
 */
interface MfeBridge {
  /** The entry type ID for this MFE instance */
  readonly entryTypeId: string;

  /** The domain type ID this MFE is mounted in */
  readonly domainId: string;

  /**
   * Request an action from the host.
   * The bridge validates the payload against the action's schema before sending.
   * @param actionTypeId - Action type ID (must be in entry's actions list)
   * @param payload - Action payload (validated against action schema)
   * @returns Promise that resolves when host acknowledges receipt
   */
  requestHostAction(actionTypeId: string, payload?: unknown): Promise<void>;

  /**
   * Subscribe to a shared property from the domain.
   * @param propertyTypeId - SharedProperty type ID
   * @param callback - Called with current value and on subsequent updates
   * @returns Unsubscribe function
   */
  subscribeToProperty(
    propertyTypeId: string,
    callback: (value: unknown) => void
  ): () => void;

  /**
   * Get current value of a shared property.
   * @param propertyTypeId - SharedProperty type ID
   * @returns Current value or undefined if not set
   */
  getProperty(propertyTypeId: string): unknown;

  /**
   * Subscribe to all shared properties at once.
   * @param callback - Called with property map on any property update
   * @returns Unsubscribe function
   */
  subscribeToAllProperties(
    callback: (properties: Map<string, unknown>) => void
  ): () => void;
}

/**
 * Extended bridge interface used by the host to manage MFE communication.
 * Created by ScreensetsRegistry when mounting an extension.
 */
interface MfeBridgeConnection extends MfeBridge {
  /** Unique instance ID for this bridge connection */
  readonly instanceId: string;

  /**
   * Send an actions chain to the MFE.
   * Used for domain-to-extension communication.
   * @param chain - ActionsChain to deliver
   * @param options - Optional per-request execution options (override defaults)
   * @returns ChainResult indicating execution outcome
   */
  sendActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /**
   * Update a shared property value.
   * Notifies all subscribers in the MFE.
   * @param propertyTypeId - SharedProperty type ID
   * @param value - New property value
   */
  updateProperty(propertyTypeId: string, value: unknown): void;

  /**
   * Register handler for actions coming from the MFE.
   * @param handler - Callback invoked when MFE requests host action
   */
  onHostAction(
    handler: (actionTypeId: string, payload: unknown) => Promise<void>
  ): void;

  /**
   * Clean up the bridge connection.
   * Unsubscribes all listeners and releases resources.
   */
  dispose(): void;
}

/**
 * Props interface for MFE entry components.
 * All MFE entry components must accept these props.
 */
interface MfeBridgeProps {
  /** Bridge for host-MFE communication */
  bridge: MfeBridge;
}
```

#### Bridge Creation Flow

```typescript
// When mounting an extension
const bridge = runtime.mountExtension(extension);

// Bridge is passed to MFE component via props
<MfeComponent bridge={bridge} />

// MFE uses bridge to communicate
const MyMfeEntry: React.FC<MfeBridgeProps> = ({ bridge }) => {
  const [theme, setTheme] = useState<Theme>();

  useEffect(() => {
    // Subscribe to shared property
    const unsubscribe = bridge.subscribeToProperty(
      'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.theme.v1',
      (value) => setTheme(value as Theme)
    );
    return unsubscribe;
  }, [bridge]);

  const handleClick = () => {
    // Request action from host
    bridge.requestHostAction(
      'gts.hai3.screensets.ext.action.v1~acme.analytics.actions.data_updated.v1',
      { timestamp: Date.now() }
    );
  };

  return <div>...</div>;
};
```

### Decision 15: Shadow DOM Utilities

Shadow DOM utilities are provided by `@hai3/screensets` for style isolation. The `@hai3/framework` uses these utilities in its `ShadowDomContainer` component.

#### Shadow DOM API

```typescript
// packages/screensets/src/mfe/shadow/index.ts

/**
 * Options for creating a shadow root
 */
interface ShadowRootOptions {
  /** Shadow DOM mode (default: 'open') */
  mode?: 'open' | 'closed';
  /** Enable delegatesFocus for accessibility */
  delegatesFocus?: boolean;
}

/**
 * Create a shadow root attached to an element.
 * Handles edge cases like already-attached shadow roots.
 *
 * @param element - Host element for the shadow root
 * @param options - Shadow root configuration
 * @returns The created or existing ShadowRoot
 * @throws Error if element cannot host shadow DOM
 */
function createShadowRoot(
  element: HTMLElement,
  options: ShadowRootOptions = {}
): ShadowRoot {
  const { mode = 'open', delegatesFocus = false } = options;

  // Return existing shadow root if present
  if (element.shadowRoot && mode === 'open') {
    return element.shadowRoot;
  }

  return element.attachShadow({ mode, delegatesFocus });
}

/**
 * CSS variable map type
 */
type CssVariables = Record<string, string>;

/**
 * Inject CSS custom properties into a shadow root.
 * Variables are set on the :host element and cascade to all children.
 *
 * @param shadowRoot - Target shadow root
 * @param variables - Map of CSS variable names to values
 */
function injectCssVariables(
  shadowRoot: ShadowRoot,
  variables: CssVariables
): void {
  const styleId = '__hai3_css_variables__';
  let styleElement = shadowRoot.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    shadowRoot.prepend(styleElement);
  }

  const cssText = Object.entries(variables)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n');

  styleElement.textContent = `:host {\n${cssText}\n}`;
}

/**
 * Inject a stylesheet into a shadow root.
 * Supports both CSS text and URLs.
 *
 * @param shadowRoot - Target shadow root
 * @param css - CSS text or URL to stylesheet
 * @param id - Optional ID for the style element (for updates)
 */
function injectStylesheet(
  shadowRoot: ShadowRoot,
  css: string,
  id?: string
): void {
  if (id) {
    const existing = shadowRoot.getElementById(id);
    if (existing) {
      existing.textContent = css;
      return;
    }
  }

  const styleElement = document.createElement('style');
  if (id) styleElement.id = id;
  styleElement.textContent = css;
  shadowRoot.appendChild(styleElement);
}

// Export utilities
export { createShadowRoot, injectCssVariables, injectStylesheet };
export type { ShadowRootOptions, CssVariables };
```

### Decision 17: Explicit Timeout Configuration in Types

Action timeouts are configured **explicitly in type definitions**, not as implicit code defaults. This ensures the platform is fully runtime-configurable and declarative.

#### Timeout Resolution Model

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

#### Chain-Level Configuration

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

#### Method Signatures

```typescript
/**
 * ActionsChainsMediator interface
 *
 * Action-level timeouts are resolved from type definitions:
 * - domain.defaultActionTimeout (required)
 * - action.timeout (optional override)
 *
 * Timeout is treated as a failure - the ActionsChain.fallback handles all failures uniformly.
 */
interface ActionsChainsMediator {
  /** The Type System plugin used by this mediator */
  readonly typeSystem: TypeSystemPlugin;

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   *
   * Action timeouts are determined by:
   *   action.timeout ?? domain.defaultActionTimeout
   *
   * On timeout or any other failure: execute fallback chain if defined.
   *
   * @param chain - The actions chain to execute
   * @param options - Optional chain-level execution options
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /**
   * Deliver an action chain (internal routing).
   * @param chain - The actions chain to deliver
   * @param options - Optional chain-level execution options
   */
  deliver(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  // ... other methods unchanged
}

/**
 * MfeBridgeConnection interface
 */
interface MfeBridgeConnection extends MfeBridge {
  /** Unique instance ID for this bridge connection */
  readonly instanceId: string;

  /**
   * Send an actions chain to the MFE.
   * Used for domain-to-extension communication.
   *
   * Action timeouts come from the Action and domain type definitions.
   *
   * @param chain - ActionsChain to deliver
   * @param options - Optional chain-level execution options
   * @returns ChainResult indicating execution outcome
   */
  sendActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  // ... other methods unchanged
}
```

#### Usage Example

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
  type: 'gts.acme.dashboard.ext.action.refresh.v1~',
  target: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.main.v1~',
  // No timeout specified - uses domain's 30000ms default
};

// Action overrides for a long-running operation
const exportAction: Action = {
  type: 'gts.acme.dashboard.ext.action.export.v1~',
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

### Decision 19: Dynamic Registration Model

**What**: Extensions and MFEs can be registered at ANY time during the application lifecycle, not just at initialization.

**Why**:
- Extensions are NOT known at app initialization time
- GTS types and instances will be obtained from backend API in the future
- Enables runtime configuration, feature flags, and permission-based extensibility
- Supports hot-swapping extensions for A/B testing

#### ScreensetsRegistry Dynamic API

The ScreensetsRegistry provides a complete API for dynamic registration and unregistration:

```typescript
/**
 * ScreensetsRegistry - Supports dynamic registration at any time
 */
class ScreensetsRegistry {
  // === Dynamic Registration (anytime during runtime) ===

  /**
   * Register extension dynamically.
   * Can be called at any time, not just initialization.
   * Validates contract compatibility before registration.
   */
  async registerExtension(extension: Extension): Promise<void> {
    // 1. Validate extension against schema
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.extension.v1~',
      extension
    );
    if (!validation.valid) {
      throw new ExtensionValidationError(validation.errors, extension.id);
    }

    // 2. Verify domain exists (may have been registered earlier or dynamically)
    const domainState = this.domains.get(extension.domain);
    if (!domainState) {
      throw new Error(`Domain '${extension.domain}' not registered. Register domain first.`);
    }

    // 3. Resolve entry (may need to fetch from provider)
    const entry = await this.resolveEntry(extension.entry);

    // 4. Validate contract
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) {
      throw new ContractValidationError(contractResult.errors);
    }

    // 5. Validate uiMeta
    const uiMetaResult = validateExtensionUiMeta(this.typeSystem, extension);
    if (!uiMetaResult.valid) {
      throw new UiMetaValidationError(uiMetaResult.errors, extension.id, extension.domain);
    }

    // 6. Register extension
    this.extensions.set(extension.id, {
      extension,
      entry,
      mounted: false,
      bridge: null,
    });

    // 7. Emit registration event for observers
    this.emit('extensionRegistered', { extensionId: extension.id });
  }

  /**
   * Unregister extension dynamically.
   * Unmounts MFE if currently mounted, cleans up bridge.
   */
  async unregisterExtension(extensionId: string): Promise<void> {
    const state = this.extensions.get(extensionId);
    if (!state) {
      return; // Already unregistered, idempotent
    }

    // 1. Unmount if mounted
    if (state.mounted && state.bridge) {
      await this.unmountExtension(extensionId);
    }

    // 2. Remove from registry
    this.extensions.delete(extensionId);

    // 3. Remove from domain
    const domainState = this.domains.get(state.extension.domain);
    if (domainState) {
      domainState.extensions.delete(extensionId);
    }

    // 4. Emit unregistration event
    this.emit('extensionUnregistered', { extensionId });
  }

  /**
   * Register domain dynamically.
   * Can be called at any time to add new extension points.
   */
  async registerDomain(domain: ExtensionDomain): Promise<void> {
    // 1. Validate domain
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.domain.v1~',
      domain
    );
    if (!validation.valid) {
      throw new DomainValidationError(validation.errors, domain.id);
    }

    // 2. Register domain
    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
    });

    // 3. Emit event
    this.emit('domainRegistered', { domainId: domain.id });
  }

  /**
   * Unregister domain dynamically.
   * Unregisters all extensions in the domain first.
   */
  async unregisterDomain(domainId: string): Promise<void> {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      return; // Already unregistered, idempotent
    }

    // 1. Unregister all extensions in this domain
    for (const extensionId of domainState.extensions) {
      await this.unregisterExtension(extensionId);
    }

    // 2. Remove domain
    this.domains.delete(domainId);

    // 3. Emit event
    this.emit('domainUnregistered', { domainId });
  }

  // === Extension Mounting (on-demand) ===

  /**
   * Mount extension on demand.
   * Extension must be registered before mounting.
   */
  async mountExtension(extensionId: string, container: Element): Promise<MfeBridgeConnection> {
    // Get extension state
    const extensionState = this.extensions.get(extensionId);
    if (!extensionState) {
      throw new Error(`Extension '${extensionId}' not registered`);
    }

    const { extension, entry } = extensionState;
    const domainState = this.domains.get(extension.domain);
    if (!domainState) {
      throw new Error(`Domain '${extension.domain}' not found`);
    }

    // Load MFE bundle if not cached
    const loaded = await this.mfeLoader.load(entry as MfeEntryMF);

    // Create bridge
    const bridge = this.createBridge(domainState, entry, extensionId);

    // Register with runtime coordinator
    registerRuntime(container, {
      hostRuntime: this,
      bridges: new Map([[extensionId, bridge]]),
    });

    // Mount component
    // (Component mounting is framework-specific, handled by caller)

    // Update state
    extensionState.mounted = true;
    extensionState.bridge = bridge;
    extensionState.container = container;

    return bridge;
  }

  /**
   * Unmount extension.
   */
  async unmountExtension(extensionId: string): Promise<void> {
    const extensionState = this.extensions.get(extensionId);
    if (!extensionState || !extensionState.mounted) {
      return;
    }

    // Dispose bridge
    if (extensionState.bridge) {
      extensionState.bridge.dispose();
    }

    // Unregister from coordinator
    if (extensionState.container) {
      unregisterRuntime(extensionState.container);
    }

    // Update state
    extensionState.mounted = false;
    extensionState.bridge = null;
    extensionState.container = undefined;
  }

  // === Type Instance Provider (future backend integration) ===

  private typeInstanceProvider: TypeInstanceProvider | null = null;

  /**
   * Set the provider for fetching GTS type instances from backend.
   * Current: in-memory registry
   * Future: backend API calls
   */
  setTypeInstanceProvider(provider: TypeInstanceProvider): void {
    this.typeInstanceProvider = provider;

    // Subscribe to updates for real-time sync
    provider.subscribeToUpdates(async (update) => {
      if (update.type === 'added' && update.instance) {
        // Auto-register new extensions/domains from backend
        if (this.isExtension(update.instance)) {
          await this.registerExtension(update.instance as Extension);
        } else if (this.isDomain(update.instance)) {
          await this.registerDomain(update.instance as ExtensionDomain);
        }
      } else if (update.type === 'removed') {
        // Auto-unregister removed extensions/domains
        if (this.extensions.has(update.typeId)) {
          await this.unregisterExtension(update.typeId);
        } else if (this.domains.has(update.typeId)) {
          await this.unregisterDomain(update.typeId);
        }
      }
    });
  }

  /**
   * Refresh extensions from backend.
   * Fetches all extensions/domains from provider and syncs local registry.
   */
  async refreshExtensionsFromBackend(): Promise<void> {
    if (!this.typeInstanceProvider) {
      throw new Error('No TypeInstanceProvider configured. Call setTypeInstanceProvider() first.');
    }

    // Fetch domains first (extensions depend on domains)
    const domains = await this.typeInstanceProvider.fetchDomains();
    for (const domain of domains) {
      if (!this.domains.has(domain.id)) {
        await this.registerDomain(domain);
      }
    }

    // Then fetch extensions
    const extensions = await this.typeInstanceProvider.fetchExtensions();
    for (const extension of extensions) {
      if (!this.extensions.has(extension.id)) {
        await this.registerExtension(extension);
      }
    }
  }

  /**
   * Resolve entry - tries local cache first, then provider.
   */
  private async resolveEntry(entryId: string): Promise<MfeEntry> {
    // Try local cache first
    const cached = this.entryCache.get(entryId);
    if (cached) {
      return cached;
    }

    // Try provider if available
    if (this.typeInstanceProvider) {
      const entry = await this.typeInstanceProvider.fetchInstance<MfeEntry>(entryId);
      if (entry) {
        this.entryCache.set(entryId, entry);
        return entry;
      }
    }

    throw new Error(`Entry '${entryId}' not found. Ensure entry is registered or provider is configured.`);
  }
}
```

#### TypeInstanceProvider Interface

```typescript
/**
 * Provider for fetching GTS type instances from backend.
 *
 * CURRENT IMPLEMENTATION: InMemoryTypeInstanceProvider
 * - Uses local Map for storage
 * - Manual registration via register() methods
 *
 * FUTURE IMPLEMENTATION: BackendTypeInstanceProvider
 * - Fetches from REST API or GraphQL endpoint
 * - Supports real-time updates via WebSocket/SSE
 * - Caches with TTL and invalidation
 */
interface TypeInstanceProvider {
  /** Fetch all available extensions from backend */
  fetchExtensions(): Promise<Extension[]>;

  /** Fetch all available domains from backend */
  fetchDomains(): Promise<ExtensionDomain[]>;

  /** Fetch specific type instance by ID */
  fetchInstance<T>(typeId: string): Promise<T | undefined>;

  /** Subscribe to instance updates (real-time sync) */
  subscribeToUpdates(callback: (update: InstanceUpdate) => void): () => void;
}

interface InstanceUpdate {
  type: 'added' | 'updated' | 'removed';
  typeId: string;
  instance?: unknown;
}

/**
 * In-memory implementation for current use.
 * Future: Replace with BackendTypeInstanceProvider.
 */
class InMemoryTypeInstanceProvider implements TypeInstanceProvider {
  private extensions = new Map<string, Extension>();
  private domains = new Map<string, ExtensionDomain>();
  private instances = new Map<string, unknown>();
  private subscribers = new Set<(update: InstanceUpdate) => void>();

  // Manual registration methods (current use)
  registerExtension(extension: Extension): void {
    this.extensions.set(extension.id, extension);
    this.notifySubscribers({ type: 'added', typeId: extension.id, instance: extension });
  }

  registerDomain(domain: ExtensionDomain): void {
    this.domains.set(domain.id, domain);
    this.notifySubscribers({ type: 'added', typeId: domain.id, instance: domain });
  }

  registerInstance(typeId: string, instance: unknown): void {
    this.instances.set(typeId, instance);
    this.notifySubscribers({ type: 'added', typeId, instance });
  }

  // TypeInstanceProvider implementation
  async fetchExtensions(): Promise<Extension[]> {
    return Array.from(this.extensions.values());
  }

  async fetchDomains(): Promise<ExtensionDomain[]> {
    return Array.from(this.domains.values());
  }

  async fetchInstance<T>(typeId: string): Promise<T | undefined> {
    return this.instances.get(typeId) as T | undefined;
  }

  subscribeToUpdates(callback: (update: InstanceUpdate) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(update: InstanceUpdate): void {
    for (const callback of this.subscribers) {
      callback(update);
    }
  }
}
```

#### Usage Examples

**Example 1: Dynamic registration after user action**
```typescript
// User enables analytics widget in settings
settingsButton.onClick = async () => {
  // Register the extension dynamically
  await runtime.registerExtension({
    id: 'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1',
    domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
    entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    uiMeta: { title: 'Analytics', size: 'medium' },
  });

  // Mount the extension
  const container = document.getElementById('widget-slot-1');
  const bridge = await runtime.mountExtension(
    'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1',
    container
  );
};
```

**Example 2: Registration after backend API response**
```typescript
// After user login, fetch available extensions from backend
async function onUserLogin(user: User) {
  // Configure backend provider
  runtime.setTypeInstanceProvider(new BackendTypeInstanceProvider({
    apiUrl: '/api/extensions',
    authToken: user.token,
  }));

  // Fetch and register all extensions from backend
  await runtime.refreshExtensionsFromBackend();

  // Now extensions are available for mounting
}
```

**Example 3: Unregistration when user disables feature**
```typescript
// User disables analytics widget
disableButton.onClick = async () => {
  // Unregister - this also unmounts if currently mounted
  await runtime.unregisterExtension('gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1');
};
```

**Example 4: Hot-swap extensions at runtime**
```typescript
// A/B testing: swap implementation at runtime
async function swapToVariantB() {
  const extensionId = 'gts.hai3.screensets.ext.extension.v1~acme.user.widgets.analytics_widget.v1';

  // 1. Unregister current implementation
  await runtime.unregisterExtension(extensionId);

  // 2. Register variant B
  await runtime.registerExtension({
    id: extensionId,
    domain: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1~',
    entry: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart_v2.v1', // Different entry
    uiMeta: { title: 'Analytics (New)', size: 'medium' },
  });

  // 3. Mount extension with new implementation
  const container = document.getElementById('widget-slot-1');
  await runtime.mountExtension(extensionId, container);
}
```

### Decision 20: Domain-Specific Supported Actions

**What**: Each extension domain declares which HAI3 actions it supports, allowing domains to have different action support based on their layout semantics.

**Why**:
- Not all domains can support all actions semantically
- Screen domain cannot support `unload_ext` - you cannot have "no screen selected"
- Popup, Sidebar, Overlay domains can support both `load_ext` and `unload_ext`
- This enables the mediator to validate action support before delivery

#### Domain Actions Field

The `ExtensionDomain` type includes an `actions` field that lists which HAI3 actions (like `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_UNLOAD_EXT`) the domain supports:

```typescript
interface ExtensionDomain {
  id: string;
  sharedProperties: string[];
  /** HAI3 actions this domain supports (e.g., load_ext, unload_ext) */
  actions: string[];  // <-- Domain declares supported HAI3 actions
  /** Action type IDs domain can emit to extensions */
  domainActions: string[];
  /** Action type IDs domain can receive from extensions */
  extensionsActions: string[];
  extensionsUiMeta: JSONSchema;
  defaultActionTimeout: number;
}
```

#### Base Domain Definitions with Supported Actions

**Popup Domain** - Supports both load and unload (modal can be shown/hidden):
```typescript
const HAI3_POPUP_DOMAIN: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1~',
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT],  // Both supported
  sharedProperties: [...],
  domainActions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,
};
```

**Sidebar Domain** - Supports both load and unload (panel can be shown/hidden):
```typescript
const HAI3_SIDEBAR_DOMAIN: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.sidebar.v1~',
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT],  // Both supported
  sharedProperties: [...],
  domainActions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,
};
```

**Overlay Domain** - Supports both load and unload (overlay can be shown/hidden):
```typescript
const HAI3_OVERLAY_DOMAIN: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.overlay.v1~',
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT],  // Both supported
  sharedProperties: [...],
  domainActions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,
};
```

**Screen Domain** - Only supports load (you can navigate TO a screen, but cannot have "no screen"):
```typescript
const HAI3_SCREEN_DOMAIN: ExtensionDomain = {
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.screen.v1~',
  actions: [HAI3_ACTION_LOAD_EXT],  // NO unload - can't have "no screen selected"
  sharedProperties: [...],
  domainActions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,
};
```

#### Action Support Validation

The ActionsChainsMediator validates that the target domain supports the action before delivery:

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

#### Key Principles

1. **`load_ext` is universal**: All domains MUST support `HAI3_ACTION_LOAD_EXT` (it's how extensions are loaded)
2. **`unload_ext` is optional**: Some domains (like screen) cannot semantically support unloading
3. **Domains declare support**: Each domain explicitly lists which HAI3 actions it can handle
4. **Mediator validates**: ActionsChainsMediator checks action support before delivery
5. **Clear error messages**: When an unsupported action is attempted, a clear error is thrown

#### UnsupportedDomainActionError

```typescript
/**
 * Error thrown when an action is not supported by the target domain
 */
class UnsupportedDomainActionError extends MfeError {
  constructor(
    message: string,
    public readonly actionTypeId: string,
    public readonly domainTypeId: string
  ) {
    super(message, 'UNSUPPORTED_DOMAIN_ACTION');
    this.name = 'UnsupportedDomainActionError';
  }
}
```
