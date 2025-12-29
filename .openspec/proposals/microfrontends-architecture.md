# OpenSpec Proposal: Microfrontends Architecture for HAI3

| Field          | Value                                           |
|----------------|-------------------------------------------------|
| **Proposal ID**| MFE-001                                         |
| **Status**     | Draft                                           |
| **Author**     | HAI3 Architecture Team                          |
| **Created**    | 2025-12-29                                      |
| **Updated**    | 2025-12-29                                      |

---

## Summary

This proposal introduces a microfrontend (MFE) architecture for HAI3 that allows screensets to be deployed as independently built and loaded vertical slices. The architecture extends existing HAI3 contracts at the SDK layer (@hai3/screensets, @hai3/state) with thin communication interfaces, and provides integration glue at the framework layer (@hai3/framework) via a new `microfrontends()` plugin.

---

## Problem Statement

### Current Limitations

1. **Monolithic Build**: All screensets are currently bundled together, requiring full rebuilds for any screenset change
2. **Deployment Coupling**: Changes to one screenset require redeploying the entire host application
3. **Team Scalability**: Multiple teams cannot independently develop, test, and deploy screensets
4. **Runtime Flexibility**: Cannot load screensets dynamically based on user permissions or feature flags
5. **Performance**: Initial bundle includes all screensets regardless of actual usage

### Why This Matters

- **Enterprise Adoption**: Large organizations require independent team velocity and deployment autonomy
- **Feature Flagging**: Business needs to selectively enable/disable functionality per tenant or user segment
- **Performance at Scale**: Applications with 20+ screensets suffer from excessive bundle sizes
- **Third-Party Extensibility**: Partners may want to contribute screensets without access to host codebase

---

## Non-Goals

The following are explicitly out of scope for this proposal:

1. **Server-Side Rendering (SSR) for MFEs**: Initial implementation is client-side only
2. **Cross-MFE Routing**: Each MFE manages its own internal routing; cross-MFE navigation goes through host
3. **Shared State Between MFEs**: MFEs only access their dedicated host slice; no direct MFE-to-MFE state sharing
4. **Hot Module Replacement for Remote MFEs**: Development workflow changes are out of scope
5. **Build Tool Migration**: This proposal is bundler-agnostic; specific Webpack/Vite configs are implementation details
6. **Authentication/Authorization Contracts**: Security contracts are a separate concern

---

## User-Facing Behavior

### Host Application Developer

```typescript
// 1. Register remote MFEs in HAI3 configuration
const app = createHAI3()
  .use(screensets())
  .use(microfrontends({
    remotes: [
      {
        id: 'analytics' as MicrofrontendId,
        url: 'https://mfe.example.com/analytics/remoteEntry.js',
        shared: ['react', 'react-dom', '@hai3/state', '@hai3/screensets']
      },
      {
        id: 'billing' as MicrofrontendId,
        url: '/mfe/billing/remoteEntry.js', // Local or CDN
        shared: ['react', 'react-dom', '@hai3/state', '@hai3/screensets']
      }
    ],
    styleIsolation: 'shadow-dom'
  }))
  .use(layout())
  .build();

// 2. MFEs appear as screensets in the menu automatically
// 3. Navigation works seamlessly: app.actions.navigateToScreenset({ screensetId: 'analytics' })
```

### MFE Developer

```typescript
// 1. Define MFE using HAI3 contracts
import { defineMicrofrontend, type HostBridge } from '@hai3/screensets';
import { createMfeBridge } from '@hai3/state';

export const analyticsMfe = defineMicrofrontend({
  id: 'analytics' as MicrofrontendId,
  name: 'Analytics Dashboard',
  version: '1.0.0',

  // Mount lifecycle
  mount(container: HTMLElement, bridge: HostBridge<AnalyticsState, HostActions>) {
    // Subscribe to host state (read-only)
    bridge.subscribe(
      (state) => state.user.tenant,
      (tenant) => console.log('Tenant changed:', tenant)
    );

    // Request host actions
    bridge.requestHostAction('showPopup', { id: 'confirm-export' });

    // React rendering
    const root = createRoot(container);
    root.render(<AnalyticsApp bridge={bridge} />);

    return {
      unmount: () => root.unmount()
    };
  },

  // Handle action requests from host
  onActionRequest: {
    refreshDashboard: async (payload) => {
      await refetchAnalytics(payload.dateRange);
    },
    exportReport: async (payload) => {
      return generatePdfReport(payload.format);
    }
  }
});
```

### End User

- No visible change in UX; screensets load transparently
- Potential improvement: faster initial load due to lazy MFE loading
- Seamless navigation between host and MFE screensets

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                                 | Priority |
|-------|-----------------------------------------------------------------------------|----------|
| FR-1  | Host can register MFEs declaratively with URL and shared dependencies       | Must     |
| FR-2  | MFEs load lazily on first navigation to their screenset                     | Must     |
| FR-3  | Host exposes reactive state slice to MFE (read-only subscription)           | Must     |
| FR-4  | MFE can request host to execute actions via callback bridge                 | Must     |
| FR-5  | Host can request MFE to execute actions via callback bridge                 | Must     |
| FR-6  | MFE CSS is isolated from host CSS (Shadow DOM or scoped)                    | Must     |
| FR-7  | Shared dependencies (React, @hai3/*) use single instance                    | Must     |
| FR-8  | MFE can register its own screenset definition with host                     | Must     |
| FR-9  | Failed MFE load shows error boundary, does not crash host                   | Must     |
| FR-10 | MFE unmount triggers cleanup of subscriptions and DOM                       | Must     |
| FR-11 | Host EventBus events can be forwarded to MFE (configurable)                 | Should   |
| FR-12 | MFE can emit events to host EventBus (configurable whitelist)               | Should   |
| FR-13 | Version mismatch detection between host and MFE shared deps                 | Should   |
| FR-14 | MFE preloading based on user navigation patterns                            | Could    |
| FR-15 | MFE health check endpoint for monitoring                                    | Could    |

### Non-Functional Requirements

| ID     | Requirement                                                                | Target         |
|--------|----------------------------------------------------------------------------|----------------|
| NFR-1  | MFE initial load time (after host loaded)                                  | < 500ms (p95)  |
| NFR-2  | Bridge communication latency (action request/response)                     | < 10ms         |
| NFR-3  | Memory overhead per loaded MFE                                             | < 2MB          |
| NFR-4  | TypeScript type inference for bridge contracts                             | Full coverage  |
| NFR-5  | Zero breaking changes to existing screenset API                            | Mandatory      |
| NFR-6  | SDK layer contracts must have zero runtime dependencies                    | Mandatory      |

---

## Scenarios / User Journeys

### Scenario 1: Initial MFE Load

**Actors**: End User, Host Application, MFE Remote

**Preconditions**: User is authenticated, analytics MFE is registered but not loaded

**Flow**:
1. User clicks "Analytics" menu item
2. Host dispatches `navigateToScreenset({ screensetId: 'analytics' })`
3. Navigation plugin detects screenset is MFE (not local)
4. MFE plugin initiates remote load from configured URL
5. While loading: Host displays loading skeleton in screen domain
6. On load success: MFE's `mount()` is called with container and bridge
7. MFE renders its React tree into Shadow DOM container
8. MFE subscribes to tenant state via bridge
9. Screen domain shows MFE content; loading skeleton removed

**Postconditions**: MFE is mounted, subscriptions active, user sees analytics dashboard

**Error Cases**:
- Network failure: Show error boundary with retry button
- Script error: Log to monitoring, show friendly error message
- Timeout (> 10s): Abort load, show timeout message

### Scenario 2: Host-to-MFE Action Request

**Actors**: Host Application, MFE

**Preconditions**: MFE is mounted and registered action handlers

**Flow**:
1. User clicks "Refresh All" button in host header
2. Host action handler calls `mfeBridge.requestMfeAction('analytics', 'refreshDashboard', { dateRange: 'last7days' })`
3. Bridge serializes payload and invokes MFE's registered handler
4. MFE handler executes refresh logic
5. Handler returns result (or void)
6. Bridge resolves promise with result

**Postconditions**: MFE dashboard shows refreshed data

**Error Cases**:
- MFE not mounted: Bridge throws `MfeNotMountedError`
- Action not registered: Bridge throws `ActionNotRegisteredError`
- Handler throws: Error propagated to host with stack trace

### Scenario 3: MFE-to-Host Action Request

**Actors**: MFE, Host Application

**Preconditions**: MFE needs to show a popup (host-owned UI)

**Flow**:
1. User clicks "Export Report" in MFE
2. MFE action calls `bridge.requestHostAction('showPopup', { id: 'export-confirm', title: 'Confirm Export' })`
3. Bridge validates action is in allowlist
4. Bridge invokes host's `showPopup` action
5. Host popup domain renders the popup
6. User confirms in popup
7. Popup dispatches confirmation event
8. If MFE subscribed to popup events: MFE receives confirmation

**Postconditions**: Host popup shown, MFE can react to user choice

**Error Cases**:
- Action not in allowlist: Bridge throws `ActionNotAllowedError`
- Host action fails: Error propagated to MFE

### Scenario 4: State Synchronization

**Actors**: Host Application, Multiple MFEs

**Preconditions**: Two MFEs mounted, both subscribed to `user.tenant` state

**Flow**:
1. Admin switches tenant in host header dropdown
2. Host dispatches `setTenant({ tenantId: 'acme-corp' })`
3. Effect updates `user.tenant` in store
4. Bridge's subscription mechanism detects change
5. Each subscribed MFE's callback is invoked with new tenant
6. MFEs independently refetch their data for new tenant

**Postconditions**: All MFEs reflect new tenant context

**Error Cases**:
- MFE callback throws: Log error, continue notifying other MFEs
- Rapid changes (debounce): Bridge debounces by default (configurable)

### Scenario 5: MFE Unmount and Cleanup

**Actors**: End User, Host Application, MFE

**Preconditions**: Analytics MFE is mounted with active subscriptions

**Flow**:
1. User navigates away from analytics screenset
2. Host dispatches `navigateToScreenset({ screensetId: 'dashboard' })`
3. Navigation plugin triggers MFE unmount sequence
4. Bridge invokes MFE's unmount callback (returned from mount)
5. MFE unmounts React tree
6. Bridge automatically unsubscribes all MFE's state subscriptions
7. Bridge clears action handlers for this MFE
8. Shadow DOM container is removed from DOM

**Postconditions**: MFE fully cleaned up, no memory leaks, no orphan subscriptions

---

## Technical Design / Architecture

### System Overview and Boundaries

```
+-----------------------------------------------------------------------+
|                           HAI3 Host Application                        |
|-----------------------------------------------------------------------|
|  +------------------+  +------------------+  +--------------------+    |
|  | @hai3/framework  |  |  @hai3/state     |  | @hai3/screensets   |    |
|  |------------------|  |------------------|  |--------------------|    |
|  | microfrontends() |  | MfeBridge        |  | MfeDefinition      |    |
|  | plugin           |  | EventBus         |  | MfeRegistry        |    |
|  | MfeLoader        |  | createMfeBridge  |  | HostBridge<S,A>    |    |
|  +--------+---------+  +--------+---------+  +----------+---------+    |
|           |                     |                       |              |
|           +---------------------+-----------------------+              |
|                                 |                                      |
|                    +------------v-----------+                          |
|                    |    Bridge Instance     |                          |
|                    |  - State subscriptions |                          |
|                    |  - Action routing      |                          |
|                    |  - Event forwarding    |                          |
|                    +------------+-----------+                          |
|                                 |                                      |
+-----------------------------------------------------------------------+
                                  |
                    +-------------v-------------+
                    |     Shadow DOM Boundary    |
                    +---------------------------+
                    |                           |
          +---------v---------+       +---------v---------+
          |   Analytics MFE   |       |   Billing MFE     |
          |-------------------|       |-------------------|
          | React 18          |       | React 18          |
          | @hai3/state (shr) |       | @hai3/state (shr) |
          | Local Redux slice |       | Local Redux slice |
          +-------------------+       +-------------------+
```

### Component Responsibilities

| Component              | Responsibility                                                         |
|------------------------|------------------------------------------------------------------------|
| `@hai3/screensets`     | Pure contracts: `MicrofrontendDefinition`, `HostBridge`, `MfeContract` |
| `@hai3/state`          | Bridge implementation: `createMfeBridge()`, subscription management    |
| `@hai3/framework`      | Plugin: `microfrontends()`, loader, Shadow DOM wrapper, lifecycle      |
| `MfeBridge`            | Central communication hub between host and all loaded MFEs             |
| `MfeLoader`            | Dynamic import of remote MFE bundles via Module Federation / ESM       |
| `ShadowDomContainer`   | Style isolation wrapper with CSS variable passthrough                  |

### Dependency Direction and Layering

```
         Zero Dependencies
               |
               v
    +----------------------+
    |  @hai3/screensets    |  <-- Pure types and contracts
    |  (SDK Layer L1)      |      MicrofrontendDefinition, HostBridge<S,A>
    +----------+-----------+
               |
               v
    +----------------------+
    |  @hai3/state         |  <-- Bridge implementation
    |  (SDK Layer L1)      |      createMfeBridge(), MfeBridgeImpl
    +----------+-----------+
               |
               v
    +----------------------+
    |  @hai3/framework     |  <-- Plugin, loader, Shadow DOM
    |  (Framework Layer)   |      microfrontends(), MfeLoader
    +----------+-----------+
               |
               v
    +----------------------+
    |  @hai3/react         |  <-- React hooks for MFE usage
    |  (React Layer)       |      useMfeBridge(), MfeProvider
    +----------------------+
```

**Key Principle**: Contracts flow UP (SDK defines, Framework implements). MFEs depend ONLY on SDK contracts, never on Framework internals.

### Data Flow / Events / State Transitions

#### State Subscription Flow

```
Host Store (Redux)
    |
    | (selector change detected)
    v
MfeBridge.notifySubscribers(mfeId, newState)
    |
    | (serialized state snapshot)
    v
MFE callback(newState)
    |
    v
MFE local state update / re-render
```

#### Action Request Flow (MFE -> Host)

```
MFE Component
    |
    | bridge.requestHostAction('showPopup', payload)
    v
MfeBridge.validateAction('showPopup', allowlist)
    |
    | (if allowed)
    v
Host HAI3Actions.showPopup(payload)
    |
    v
Host EventBus.emit('uicore/popup/shown', ...)
    |
    v
Host Effects -> Store Update
```

#### Action Request Flow (Host -> MFE)

```
Host Component/Action
    |
    | mfeBridge.requestMfeAction('analytics', 'refreshDashboard', payload)
    v
MfeBridge.getMfeHandler('analytics', 'refreshDashboard')
    |
    | (handler found)
    v
MFE Handler(payload) -> Promise<Result>
    |
    v
Host receives result/error
```

#### MFE Lifecycle State Machine

```
                    +----------+
                    |   Idle   |
                    +----+-----+
                         |
            navigateToMfeScreenset
                         |
                         v
                    +----------+
                    | Loading  |
                    +----+-----+
                         |
         +---------+-----+---------+
         |                         |
    load success              load failure
         |                         |
         v                         v
    +----------+              +----------+
    | Mounting |              |  Error   |
    +----+-----+              +----+-----+
         |                         |
    mount success                retry
         |                         |
         v                         |
    +----------+                   |
    | Mounted  |<------------------+
    +----+-----+
         |
    navigateAway
         |
         v
    +-----------+
    | Unmounting|
    +----+------+
         |
    cleanup done
         |
         v
    +----------+
    |   Idle   |
    +----------+
```

### API / Contracts

#### SDK Layer (@hai3/screensets) - Pure Contracts

```typescript
// ============================================================================
// Branded Types
// ============================================================================

/**
 * Branded type for Microfrontend IDs
 */
export type MicrofrontendId = string & { readonly __brand: 'MicrofrontendId' };

// ============================================================================
// Host Bridge Contract (ISP - Interface Segregation)
// ============================================================================

/**
 * What the host exposes to MFEs (read-only state + action requests)
 *
 * @template TState - Shape of state slice MFE can subscribe to
 * @template THostActions - Subset of HAI3Actions MFE can request
 */
export interface HostBridge<
  TState,
  THostActions extends Partial<HAI3Actions> = Partial<HAI3Actions>
> {
  /**
   * Subscribe to a slice of host state (read-only)
   *
   * @param selector - Function to select state slice
   * @param callback - Called when selected state changes
   * @param options - Subscription options (debounce, immediate)
   * @returns Subscription object for cleanup
   */
  subscribe<TSelected>(
    selector: (state: TState) => TSelected,
    callback: (selected: TSelected) => void,
    options?: SubscribeOptions
  ): Subscription;

  /**
   * Request host to execute an action
   *
   * @param action - Action name from allowed set
   * @param payload - Action payload
   * @returns Promise resolving when action completes
   */
  requestHostAction<K extends keyof THostActions>(
    action: K,
    payload: Parameters<THostActions[K]>[0]
  ): Promise<void>;

  /**
   * Get current snapshot of subscribed state (non-reactive)
   */
  getState(): TState;

  /**
   * MFE identifier for this bridge instance
   */
  readonly mfeId: MicrofrontendId;
}

/**
 * Subscription options
 */
export interface SubscribeOptions {
  /** Debounce rapid changes (ms) */
  debounceMs?: number;
  /** Call immediately with current value */
  immediate?: boolean;
}

// ============================================================================
// MFE Contract (what MFE exposes to host)
// ============================================================================

/**
 * Handler for action requests from host
 */
export type MfeActionHandler<TPayload, TResult = void> =
  (payload: TPayload) => Promise<TResult> | TResult;

/**
 * Map of action names to their handlers
 */
export type MfeActionHandlers = Record<string, MfeActionHandler<unknown, unknown>>;

/**
 * Result of MFE mount - includes cleanup callback
 */
export interface MfeMountResult {
  /** Called when MFE should unmount */
  unmount: () => void | Promise<void>;
}

/**
 * What an MFE exposes to the host
 *
 * @template THostState - State shape MFE expects from host
 * @template THostActions - Host actions MFE needs to call
 * @template TMfeActions - Actions MFE can handle
 */
export interface MfeContract<
  THostState = unknown,
  THostActions extends Partial<HAI3Actions> = Partial<HAI3Actions>,
  TMfeActions extends MfeActionHandlers = MfeActionHandlers
> {
  /**
   * Mount the MFE into a container
   *
   * @param container - DOM element to render into
   * @param bridge - Communication bridge to host
   * @returns Mount result with unmount callback
   */
  mount(
    container: HTMLElement,
    bridge: HostBridge<THostState, THostActions>
  ): MfeMountResult | Promise<MfeMountResult>;

  /**
   * Action handlers that host can invoke
   */
  readonly actionHandlers?: TMfeActions;
}

// ============================================================================
// Microfrontend Definition
// ============================================================================

/**
 * Complete definition of a microfrontend
 * Analogous to ScreensetDefinition but for remote MFEs
 */
export interface MicrofrontendDefinition<
  THostState = unknown,
  THostActions extends Partial<HAI3Actions> = Partial<HAI3Actions>,
  TMfeActions extends MfeActionHandlers = MfeActionHandlers
> {
  /** Unique identifier for the MFE */
  id: MicrofrontendId;

  /** Human-readable name */
  name: string;

  /** SemVer version string */
  version: string;

  /** Description (for dev tools / registry) */
  description?: string;

  /** Menu configuration for host menu integration */
  menu?: MfeMenuConfig;

  /** Default screen to show when MFE loads */
  defaultScreen?: string;

  /** The MFE contract implementation */
  contract: MfeContract<THostState, THostActions, TMfeActions>;

  /** State slice shape declaration (for type inference) */
  stateShape?: THostState;

  /** Host actions this MFE needs (for validation) */
  requiredHostActions?: Array<keyof THostActions>;
}

/**
 * Menu configuration for MFE integration with host menu
 */
export interface MfeMenuConfig {
  /** Menu item ID */
  id: string;
  /** Translation key for label */
  label: string;
  /** Icon identifier */
  icon?: string;
  /** Position in menu (default: append) */
  position?: 'prepend' | 'append' | { after: string } | { before: string };
}

// ============================================================================
// MFE Registry Contract
// ============================================================================

/**
 * Registry for microfrontend definitions
 * Pure storage, analogous to ScreensetRegistry
 */
export interface MicrofrontendRegistry {
  /** Register an MFE definition */
  register(definition: MicrofrontendDefinition): void;

  /** Get MFE by ID */
  get(id: MicrofrontendId): MicrofrontendDefinition | undefined;

  /** Get all registered MFEs */
  getAll(): MicrofrontendDefinition[];

  /** Check if MFE is registered */
  has(id: MicrofrontendId): boolean;

  /** Unregister MFE */
  unregister(id: MicrofrontendId): boolean;

  /** Clear all (for testing) */
  clear(): void;
}

// ============================================================================
// Helper: defineMicrofrontend
// ============================================================================

/**
 * Type-safe helper to define a microfrontend
 * Provides better type inference than raw object literal
 */
export function defineMicrofrontend<
  THostState,
  THostActions extends Partial<HAI3Actions>,
  TMfeActions extends MfeActionHandlers
>(
  definition: MicrofrontendDefinition<THostState, THostActions, TMfeActions>
): MicrofrontendDefinition<THostState, THostActions, TMfeActions> {
  return definition;
}
```

#### SDK Layer (@hai3/state) - Bridge Implementation

```typescript
// ============================================================================
// Bridge Factory
// ============================================================================

import type {
  HostBridge,
  MicrofrontendId,
  Subscription,
  SubscribeOptions,
  MfeActionHandlers,
  MfeActionHandler
} from '@hai3/screensets';
import type { RootState, HAI3Store } from './types';

/**
 * Configuration for creating an MFE bridge
 */
export interface MfeBridgeConfig<
  TState,
  THostActions extends Partial<HAI3Actions>
> {
  /** MFE identifier */
  mfeId: MicrofrontendId;

  /** Selector to extract MFE's state slice from RootState */
  stateSelector: (root: RootState) => TState;

  /** Allowed host actions this MFE can request */
  allowedHostActions: Array<keyof THostActions>;

  /** Reference to host actions */
  hostActions: HAI3Actions;

  /** Store reference for subscriptions */
  store: HAI3Store;

  /** Default debounce for subscriptions (ms) */
  defaultDebounceMs?: number;
}

/**
 * Create a bridge instance for an MFE
 *
 * @example
 * ```typescript
 * const bridge = createMfeBridge({
 *   mfeId: 'analytics' as MicrofrontendId,
 *   stateSelector: (root) => ({ tenant: root.user.tenant }),
 *   allowedHostActions: ['showPopup', 'hidePopup'],
 *   hostActions: app.actions,
 *   store: app.store
 * });
 * ```
 */
export function createMfeBridge<
  TState,
  THostActions extends Partial<HAI3Actions>
>(
  config: MfeBridgeConfig<TState, THostActions>
): HostBridge<TState, THostActions>;

// ============================================================================
// Bridge Manager (for host to manage multiple MFE bridges)
// ============================================================================

/**
 * Manages all active MFE bridges
 */
export interface MfeBridgeManager {
  /**
   * Create and register a bridge for an MFE
   */
  createBridge<TState, THostActions extends Partial<HAI3Actions>>(
    config: MfeBridgeConfig<TState, THostActions>
  ): HostBridge<TState, THostActions>;

  /**
   * Request an MFE to execute an action
   */
  requestMfeAction<TPayload, TResult>(
    mfeId: MicrofrontendId,
    action: string,
    payload: TPayload
  ): Promise<TResult>;

  /**
   * Register MFE's action handlers (called during mount)
   */
  registerMfeHandlers(
    mfeId: MicrofrontendId,
    handlers: MfeActionHandlers
  ): void;

  /**
   * Cleanup bridge and subscriptions for an MFE
   */
  destroyBridge(mfeId: MicrofrontendId): void;

  /**
   * Get bridge for an MFE
   */
  getBridge(mfeId: MicrofrontendId): HostBridge<unknown, Partial<HAI3Actions>> | undefined;

  /**
   * Check if MFE is currently mounted
   */
  isMounted(mfeId: MicrofrontendId): boolean;
}

/**
 * Create bridge manager singleton
 */
export function createMfeBridgeManager(
  store: HAI3Store,
  actions: HAI3Actions
): MfeBridgeManager;

// ============================================================================
// Module Augmentation for MFE Events
// ============================================================================

declare module '@hai3/state' {
  interface EventPayloadMap {
    // MFE lifecycle events
    'mfe/loading': { mfeId: MicrofrontendId };
    'mfe/loaded': { mfeId: MicrofrontendId; version: string };
    'mfe/loadError': { mfeId: MicrofrontendId; error: string };
    'mfe/mounted': { mfeId: MicrofrontendId };
    'mfe/unmounted': { mfeId: MicrofrontendId };

    // Bridge events
    'mfe/actionRequested': {
      mfeId: MicrofrontendId;
      action: string;
      direction: 'toHost' | 'toMfe'
    };
    'mfe/actionCompleted': {
      mfeId: MicrofrontendId;
      action: string;
      direction: 'toHost' | 'toMfe';
      durationMs: number;
    };
    'mfe/actionFailed': {
      mfeId: MicrofrontendId;
      action: string;
      direction: 'toHost' | 'toMfe';
      error: string;
    };
  }
}
```

#### Framework Layer (@hai3/framework) - Plugin

```typescript
// ============================================================================
// Microfrontends Plugin Configuration
// ============================================================================

import type { MicrofrontendId } from '@hai3/screensets';

/**
 * Remote MFE configuration
 */
export interface MfeRemoteConfig {
  /** MFE identifier (must match MicrofrontendDefinition.id) */
  id: MicrofrontendId;

  /** URL to remote entry point */
  url: string;

  /** Shared dependencies (prevent duplication) */
  shared?: string[];

  /** State slice selector path (dot notation or function) */
  stateSlice?: string | ((state: RootState) => unknown);

  /** Allowed host actions for this MFE */
  allowedActions?: Array<keyof HAI3Actions>;

  /** Module name in federation container (default: same as id) */
  moduleName?: string;

  /** Timeout for loading (ms, default: 10000) */
  loadTimeout?: number;

  /** Preload strategy */
  preload?: 'none' | 'hover' | 'visible' | 'immediate';
}

/**
 * Style isolation strategy
 */
export type StyleIsolation =
  | 'shadow-dom'           // Full Shadow DOM encapsulation
  | 'scoped-css'           // CSS Modules / scoped class names
  | 'none';                // No isolation (MFE manages own)

/**
 * Microfrontends plugin configuration
 */
export interface MicrofrontendsConfig {
  /** Remote MFE definitions */
  remotes?: MfeRemoteConfig[];

  /** Style isolation strategy */
  styleIsolation?: StyleIsolation;

  /** CSS custom properties to pass through Shadow DOM */
  cssVariables?: string[];

  /** Default shared dependencies */
  defaultShared?: string[];

  /** Global load timeout (ms) */
  loadTimeout?: number;

  /** Error boundary component */
  errorBoundary?: React.ComponentType<{ error: Error; mfeId: MicrofrontendId; retry: () => void }>;

  /** Loading component */
  loadingComponent?: React.ComponentType<{ mfeId: MicrofrontendId }>;
}

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Create microfrontends plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(microfrontends({
 *     remotes: [
 *       { id: 'analytics', url: '/mfe/analytics/remoteEntry.js' }
 *     ],
 *     styleIsolation: 'shadow-dom',
 *     cssVariables: ['--color-primary', '--spacing-unit']
 *   }))
 *   .build();
 * ```
 */
export function microfrontends(config?: MicrofrontendsConfig): HAI3Plugin;

// ============================================================================
// MFE Loader Interface
// ============================================================================

/**
 * Loader for fetching and initializing remote MFEs
 */
export interface MfeLoader {
  /**
   * Load a remote MFE module
   *
   * @param config - Remote configuration
   * @returns Loaded MFE definition
   */
  load(config: MfeRemoteConfig): Promise<MicrofrontendDefinition>;

  /**
   * Preload MFE (fetch but don't mount)
   */
  preload(mfeId: MicrofrontendId): Promise<void>;

  /**
   * Check if MFE is loaded
   */
  isLoaded(mfeId: MicrofrontendId): boolean;

  /**
   * Get loading state
   */
  getLoadState(mfeId: MicrofrontendId): 'idle' | 'loading' | 'loaded' | 'error';

  /**
   * Get load error if any
   */
  getError(mfeId: MicrofrontendId): Error | undefined;
}

// ============================================================================
// Shadow DOM Container Props
// ============================================================================

/**
 * Props for Shadow DOM container component
 */
export interface ShadowContainerProps {
  /** MFE identifier */
  mfeId: MicrofrontendId;

  /** CSS custom properties to inject */
  cssVariables?: Record<string, string>;

  /** Children to render in shadow root */
  children?: React.ReactNode;

  /** Mode for shadow root */
  mode?: 'open' | 'closed';

  /** Additional styles to inject */
  styles?: string;
}
```

### Key Decisions + Alternatives Considered + Rationale

#### Decision 1: Module Federation vs Native Federation

**Chosen**: Module Federation 2.0 (with Rspack compatibility)

**Alternatives**:
1. **Native Federation (ESM + Import Maps)**: Browser-native, lighter
2. **iframe isolation**: Complete isolation but poor UX
3. **Web Components only**: No shared React context

**Rationale**:
- Module Federation has mature TypeScript support (MF 2.0)
- Battle-tested in production at scale
- Works with existing Webpack/Rspack toolchains
- Native Federation's import map constraints ("init = final") make dynamic loading harder
- React's CommonJS issues with Native Federation require extra workarounds

#### Decision 2: Shadow DOM for Style Isolation

**Chosen**: Shadow DOM with CSS custom properties passthrough

**Alternatives**:
1. **CSS Modules**: Build-time scoping, requires MFE build coordination
2. **CSS-in-JS namespacing**: Runtime overhead, library coupling
3. **iframe**: Complete isolation but heavy performance cost

**Rationale**:
- Shadow DOM is a web standard with excellent browser support
- CSS custom properties naturally pierce shadow boundary for theming
- No build coordination required between host and MFEs
- Declarative Shadow DOM enables SSR path in future

#### Decision 3: Bridge Pattern for Communication

**Chosen**: Thin bridge interface with typed contracts

**Alternatives**:
1. **Shared Redux store slice**: Tight coupling, MFE can mutate
2. **Custom events only**: No type safety, ad-hoc
3. **PostMessage**: Over-engineering for same-origin MFEs

**Rationale**:
- Aligns with HAI3's ISP principle (thin contracts)
- Type-safe at compile time via generics
- Read-only state subscription prevents MFE from corrupting host state
- Action request/response pattern maintains loose coupling
- Easy to add event forwarding later without contract change

#### Decision 4: Contracts in SDK, Implementation in Framework

**Chosen**: `@hai3/screensets` holds pure contracts, `@hai3/state` holds bridge implementation

**Alternatives**:
1. **All in @hai3/framework**: MFEs would need to depend on framework
2. **New @hai3/mfe package**: Additional package to maintain
3. **All in @hai3/screensets**: Would add runtime code to pure contracts package

**Rationale**:
- MFEs only need SDK layer dependencies (lighter)
- Maintains HAI3's layering principle
- `@hai3/screensets` stays zero-dependency for contracts
- `@hai3/state` already handles EventBus/store, bridge is natural extension

### Migration / Rollout Strategy

#### Phase 1: SDK Contracts (Non-Breaking)
1. Add types to `@hai3/screensets` - no runtime changes
2. Add `createMfeBridge` to `@hai3/state` - additive API
3. Release as minor version (0.3.0)

#### Phase 2: Framework Plugin (Opt-In)
1. Add `microfrontends()` plugin to `@hai3/framework`
2. Add `MfeLoader` and Shadow DOM components
3. Plugin is optional - no impact to existing apps
4. Release as minor version

#### Phase 3: Documentation and Examples
1. Create example MFE project template
2. Add CLI command: `hai3 create --mfe`
3. Document shared dependency configuration

#### Phase 4: Production Hardening
1. Add telemetry hooks (load time, errors)
2. Add health check endpoints for MFEs
3. Performance optimization (preloading strategies)

#### Backward Compatibility
- All changes are additive
- Existing screensets work unchanged
- MFE mode is opt-in via plugin configuration
- No breaking changes to public API

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Version mismatch between host and MFE shared deps (React) | Critical - runtime errors | Medium | Shared dependency version validation at load time; clear error messages; documentation |
| MFE CSS leaks into host despite Shadow DOM | High - visual bugs | Low | Strict Shadow DOM mode; CSS reset in shadow root; automated visual regression tests |
| Bridge subscription memory leaks | High - app degradation | Medium | Automatic cleanup on unmount; subscription tracking; leak detection in dev mode |
| Slow MFE loads impact perceived performance | Medium - poor UX | Medium | Preloading strategies; loading skeletons; timeout with retry |
| MFE action handlers block host | Medium - poor UX | Low | Action timeout (5s default); async execution; error boundaries |
| Bundle size increase from bridge code | Low - minor impact | High | Tree-shakable implementation; bridge code ~5KB gzipped |
| TypeScript complexity from generics | Low - dev friction | Medium | Helper functions (`defineMicrofrontend`); comprehensive examples; IDE support |

---

## Error Cases

### Load Errors

| Error | Condition | Handling |
|-------|-----------|----------|
| `MfeLoadTimeoutError` | Load exceeds timeout | Show error boundary with retry button |
| `MfeNetworkError` | Network request failed | Show offline state; retry on reconnection |
| `MfeScriptError` | JavaScript execution error | Log to monitoring; show friendly error |
| `MfeVersionMismatchError` | Shared dep version incompatible | Block load; log details; notify developer |
| `MfeContractError` | MFE doesn't implement required contract | Block mount; detailed error in console |

### Runtime Errors

| Error | Condition | Handling |
|-------|-----------|----------|
| `MfeNotMountedError` | Action requested to unmounted MFE | Return rejected promise; log warning |
| `ActionNotAllowedError` | MFE requests non-whitelisted action | Reject; log security warning |
| `ActionNotRegisteredError` | Host requests action MFE doesn't handle | Reject; log missing handler |
| `ActionTimeoutError` | Action handler exceeds timeout | Reject; handler can still complete async |
| `SubscriptionError` | Selector throws during evaluation | Log error; skip update; continue other subscriptions |

### Cleanup Errors

| Error | Condition | Handling |
|-------|-----------|----------|
| `UnmountTimeoutError` | Unmount callback exceeds 5s | Force cleanup; log warning; continue navigation |
| `LeakedSubscriptionError` | Subscriptions remain after unmount | Auto-cleanup; log warning in dev mode |

---

## Acceptance Criteria

### SDK Contracts (@hai3/screensets)

- [ ] `MicrofrontendId` branded type is exported
- [ ] `HostBridge<TState, THostActions>` interface is exported with full type inference
- [ ] `MfeContract<THostState, THostActions, TMfeActions>` interface is exported
- [ ] `MicrofrontendDefinition` interface is exported with all required fields
- [ ] `MicrofrontendRegistry` interface matches `ScreensetRegistry` pattern
- [ ] `defineMicrofrontend()` helper provides correct type inference
- [ ] Package has zero runtime dependencies (types only)
- [ ] TypeScript compilation succeeds with `strict: true`

### Bridge Implementation (@hai3/state)

- [ ] `createMfeBridge()` returns correctly typed `HostBridge`
- [ ] State subscription fires on relevant state changes only
- [ ] State subscription respects `debounceMs` option
- [ ] State subscription calls immediately when `immediate: true`
- [ ] `requestHostAction()` validates against allowlist
- [ ] `requestHostAction()` throws `ActionNotAllowedError` for disallowed actions
- [ ] `MfeBridgeManager` tracks all active bridges
- [ ] `requestMfeAction()` invokes correct MFE handler
- [ ] `destroyBridge()` cleans up all subscriptions
- [ ] MFE lifecycle events are emitted correctly
- [ ] All subscriptions are cleaned up on bridge destroy (no memory leaks)

### Framework Plugin (@hai3/framework)

- [ ] `microfrontends()` plugin can be added to app builder
- [ ] Remote MFE loads from configured URL
- [ ] Load timeout triggers `MfeLoadTimeoutError`
- [ ] Shadow DOM container isolates MFE styles
- [ ] CSS custom properties pass through Shadow DOM
- [ ] MFE menu items appear in host menu
- [ ] Navigation to MFE screenset triggers load and mount
- [ ] Navigation away from MFE triggers unmount
- [ ] Error boundary catches and displays MFE load errors
- [ ] Loading component displays during MFE load
- [ ] Preload strategy works for `hover` and `visible` modes

### Integration Tests

- [ ] Host can register and load remote MFE
- [ ] MFE subscribes to host state and receives updates
- [ ] MFE requests host action successfully
- [ ] Host requests MFE action successfully
- [ ] MFE unmounts cleanly on navigation
- [ ] Multiple MFEs can be mounted concurrently
- [ ] Shared React instance used (no duplicate React)
- [ ] CSS isolation prevents style leakage (both directions)

### Performance Tests

- [ ] MFE load time < 500ms (p95) after host loaded
- [ ] Bridge action round-trip < 10ms
- [ ] No memory leaks after 100 mount/unmount cycles
- [ ] Bridge subscription update < 5ms

---

## Tasks

See `tasks.md` for detailed implementation tasks.

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **MFE** | Microfrontend - independently deployable frontend module |
| **Host** | The main HAI3 application that loads and orchestrates MFEs |
| **Bridge** | Communication interface between host and MFE |
| **Remote** | MFE loaded from external URL via Module Federation |
| **Shared Dependency** | Library loaded once and shared (e.g., React) |
| **Shadow DOM** | Browser API for style encapsulation |
| **Module Federation** | Webpack feature for runtime module sharing |

### B. References

- [Module Federation 2.0 Documentation](https://module-federation.io/)
- [Micro Frontends - Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- [Shadow DOM - MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [redux-micro-frontend (Microsoft)](https://github.com/nickmccurdy/redux-micro-frontend)
- [HAI3 Event-Driven Architecture](.ai/targets/EVENTS.md)

### C. Open Questions

1. **SSR Strategy**: Should we support Declarative Shadow DOM for SSR in future iterations?
2. **Authentication Tokens**: How should MFEs access auth context? Token in bridge? Separate auth MFE?
3. **Routing Coordination**: Should deep links within MFEs be supported at host level?
4. **MFE-to-MFE Communication**: If needed in future, should it go through host or direct?
