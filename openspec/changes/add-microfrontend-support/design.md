# Design: Microfrontend Architecture

## Context

HAI3 follows a layered SDK architecture where screensets are self-contained vertical slices. This design extends that concept to support **runtime-injectable screensets** deployed as independent microfrontends (MFEs).

**Key Constraint**: Host application has zero build-time knowledge of MFEs. All MFEs are loaded at runtime via Module Federation 2.0, enabling true SaaS multi-tenancy where tenants can have different feature sets.

**Stakeholders**:
- Platform teams (build host applications)
- Feature teams (build MFE screensets independently)
- Partners/vendors (contribute MFEs without source access)

## Goals / Non-Goals

### Goals
- Enable independent deployment of screensets as MFEs
- Maintain ISP-compliant thin contracts between host and MFEs
- Support multiple entries per MFE (screen, popup, sidebar, overlay)
- Provide CSS isolation via Shadow DOM with theme variable passthrough
- Zero build-time coupling between host and MFEs

### Non-Goals
- SSR for MFEs (client-side only in v1)
- Direct MFE-to-MFE communication
- Shared mutable state between MFEs
- Build tool migration (contract layer is bundler-agnostic)

## Decisions

### Decision 1: MFE = Screenset with Multiple Domain Entries

**What**: Each MFE is a complete screenset that exposes multiple entry points - one per layout domain (screen, popup, sidebar, overlay).

**Why**: This aligns with HAI3's existing vertical slice architecture. When an MFE needs to show a popup, it doesn't render it directly. Instead:
1. MFE sends action request: `bridge.requestHostAction('showPopup', { mfeId, entryId: 'confirm-dialog' })`
2. Host receives request, loads MFE's popup entry
3. Host renders MFE popup entry in its popup domain (Shadow DOM isolated)

**Alternatives considered**:
- Single entry per MFE (simpler but loses popup/sidebar capabilities)
- Direct DOM manipulation by MFE (breaks isolation)

### Decision 2: Module Federation 2.0

**What**: Use Webpack 5 / Rspack Module Federation 2.0 for loading remote MFE bundles.

**Why**:
- Mature ecosystem with TypeScript type generation
- Shared dependency deduplication (single React instance)
- Battle-tested at scale (Zara, IKEA, others)
- Works with existing HAI3 Vite build (via `@originjs/vite-plugin-federation`)

**Alternatives considered**:
- Native Federation (ESM + Import Maps): React CommonJS issues, import map constraints
- iframes: Complete isolation but poor UX, heavy performance
- Web Components only: No shared React context

### Decision 3: Shadow DOM for Style Isolation

**What**: Each MFE entry renders inside a Shadow DOM container that isolates its styles.

**Why**:
- Web standard with excellent browser support
- CSS custom properties (theme variables) pierce the shadow boundary
- No build coordination required between host and MFEs
- Declarative Shadow DOM enables future SSR path

**CSS Variables Strategy**:
```css
/* Host defines theme variables */
:root {
  --hai3-color-primary: #3b82f6;
  --hai3-spacing-unit: 4px;
}

/* MFE styles reference variables (they pierce shadow boundary) */
.mfe-button {
  background: var(--hai3-color-primary);
  padding: calc(var(--hai3-spacing-unit) * 2);
}
```

### Decision 4: Thin Bridge Contract (ISP)

**What**: MFEs receive a minimal `HostBridge<TAppState>` interface with:
- `subscribe(selector, callback)` - Read-only access to narrow app state
- `requestHostAction(action, payload)` - Request host to perform actions
- `getAppState()` - Synchronous state snapshot

**Why**:
- ISP compliance: MFEs depend only on what they need
- Runtime injection: All MFEs treated equally (narrow app slice)
- Type safety: Bridge is fully typed via generics
- No coupling: MFEs know nothing about other MFEs or host internals

**App State Shape** (shared with all MFEs):
```typescript
interface AppState {
  tenant: { id: string; name: string } | null;
  user: { id: string; email: string; roles: string[] } | null;
  language: Language;
  theme: string;
}
```

### Decision 5: GTS Type System for Identifiers and Payloads

**What**: Adopt the [Global Type System (GTS)](https://github.com/GlobalTypeSystem/gts-spec) for:
- MFE and entry identification (hierarchical, versioned, vendor-namespaced)
- **Full type definitions** - MFEs and entries have JSON Schemas, not just identifiers
- Action payload typing with JSON Schema validation
- Schema registry for runtime conformance checking

**GTS Identifier Format**:
```
gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~
```

**HAI3 Base Types** (platform-defined, all with JSON Schemas):
```
gts.hai3.mfe.type.v1~                    # MicrofrontendDefinition schema
gts.hai3.mfe.entry.v1~                   # Base MfeEntry schema
gts.hai3.mfe.entry.screen.v1~            # Screen entry schema (extends entry.v1)
gts.hai3.mfe.entry.popup.v1~             # Popup entry schema (extends entry.v1)
gts.hai3.mfe.entry.sidebar.v1~           # Sidebar entry schema (extends entry.v1)
gts.hai3.mfe.entry.overlay.v1~           # Overlay entry schema (extends entry.v1)
gts.hai3.action.host.show_popup.v1~      # Host action payload schema
```

**Vendor MFE Example** (validated against base schema):
```
gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~
```

**Why**:
- **Scalability**: Simple string IDs don't work in multi-vendor ecosystems
- **Versioning**: Breaking changes in MFE contract → new MAJOR version of schema
- **Vendor namespacing**: Clear ownership (`acme.*` vs `bigcorp.*`)
- **Runtime validation**: Loaded MFE bundles validated against schema before mounting
- **Discovery**: Query all types conforming to `gts.hai3.mfe.type.v1~*`
- **Access control**: Grant permissions via patterns like `gts.hai3.mfe.type.v1~acme.*`

**Alternatives considered**:
- UUID-only: No semantic meaning, no versioning
- URN/URI: More complex, not designed for inheritance chains
- Custom namespace system: Would need to design from scratch

### Decision 6: MFEs and Entries as Full GTS Types

**What**: `MicrofrontendDefinition` and `MfeEntry` are not just objects with GTS identifiers - they ARE full GTS types with JSON Schemas registered in `gtsRegistry`.

**MFE Type Schema** (`gts.hai3.mfe.type.v1~`):
```json
{
  "$id": "gts://gts.hai3.mfe.type.v1~",
  "type": "object",
  "properties": {
    "typeId": { "type": "string", "pattern": "^gts\\.hai3\\.mfe\\.type\\.v1~" },
    "name": { "type": "string", "minLength": 1 },
    "entries": {
      "type": "array",
      "items": { "$ref": "gts://gts.hai3.mfe.entry.v1~" },
      "minItems": 1
    },
    "contract": {
      "type": "object",
      "properties": {
        "mount": { "type": "object" }
      },
      "required": ["mount"]
    },
    "actionTypes": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["typeId", "name", "entries", "contract"]
}
```

**Entry Base Schema** (`gts.hai3.mfe.entry.v1~`):
```json
{
  "$id": "gts://gts.hai3.mfe.entry.v1~",
  "type": "object",
  "properties": {
    "typeId": { "type": "string", "pattern": "^gts\\.hai3\\.mfe\\.entry\\." },
    "domain": { "enum": ["screen", "popup", "sidebar", "overlay"] },
    "component": { "type": "object" }
  },
  "required": ["typeId", "domain", "component"]
}
```

**Screen Entry Schema** (`gts.hai3.mfe.entry.screen.v1~`):
```json
{
  "$id": "gts://gts.hai3.mfe.entry.screen.v1~",
  "allOf": [{ "$ref": "gts://gts.hai3.mfe.entry.v1~" }],
  "properties": {
    "domain": { "const": "screen" }
  }
}
```

**Why**:
- **Runtime trust boundary**: Host validates MFE structure before mounting unknown code
- **Contract versioning**: New required fields = new major version, clear compatibility
- **Partner guidance**: Vendors query schema to understand required structure
- **Better errors**: "Missing required field 'entries'" vs "Load failed"

### Decision 7: Schema Registry with Runtime Validation

**What**: `@hai3/screensets` includes a GTS schema registry that:
- Stores JSON Schemas by GTS type identifier
- Validates MFE definitions on load
- Validates entry structures on mount
- Validates action payloads before execution
- Checks type conformance (derived types inherit from base schema)

**Why**:
- Catches malformed MFE bundles at runtime (before they cause failures)
- Enables schema discovery for tooling
- Supports backward/forward compatibility checking

**Validation Flow**:
```
1. MFE Bundle Loaded
   ↓
Loader validates MicrofrontendDefinition against gts.hai3.mfe.type.v1~ schema
   ↓
If invalid: throw MfeSchemaValidationError with details
   ↓
2. Entry Mounted
   ↓
Orchestrator validates MfeEntry against domain-specific schema (e.g., gts.hai3.mfe.entry.screen.v1~)
   ↓
If invalid: throw MfeEntrySchemaValidationError with details
   ↓
3. Action Invoked
   ↓
Bridge validates payload against action's schema
   ↓
If invalid: throw PayloadValidationError with details
If valid: execute action
```

### Decision 8: Full Implementation in SDK, Flux Wiring in Framework

**What**:
- `@hai3/screensets` (L1 SDK): **Complete MFE orchestration library**, state-management agnostic
  - GTS utilities: `GtsTypeId`, `parseGtsId()`, `gts()` builder, `gtsRegistry`, `conformsTo()`
  - MFE types: `MicrofrontendDefinition`, `HostBridgeConfig`, `MfeContract`, `MfeEntry`
  - MFE implementation: `MfeBridge` class, `MfeOrchestrator` class, `MfeLoader` class
  - DOM utilities: `createShadowRoot()`, `injectCssVariables()`
  - Error types: `PayloadValidationError`, `MfeNotMountedError`, `ActionNotAllowedError`
  - Event payload types: `MfeEventPayloads` for augmentation
- `@hai3/framework` (L2): **Only Flux integration** (actions emit events, effects dispatch)
  - MFE Actions: `loadMfe`, `mountMfeEntry`, `unmountMfe`, `showMfePopup`, `hideMfePopup`
  - MFE Effects: subscribe to events, call orchestrator methods, dispatch to mfeSlice
  - `mfeSlice`: load states (`idle`, `loading`, `loaded`, `error`)
  - `microfrontends()` plugin: wires orchestrator callbacks to actions
  - Bridge callback wiring: when MFE calls `bridge.requestHostAction()`, the callback invokes a Framework action which emits an event

**Why**:
- `@hai3/screensets` is a **complete MFE orchestration library** usable without any state management
- Its API is **props/callbacks based** - no references to store, state, dispatch, or events
- `@hai3/framework` only provides the **Flux integration glue**
- Framework actions emit events (per HAI3 Flux rules), effects call orchestrator and dispatch
- MFEs only need `@hai3/screensets` dependency (lighter bundles, no @hai3/state needed)
- Clear separation: orchestration library (SDK) ≠ event-driven integration (Framework)

## Data Flow

**HAI3 Flux Pattern**: Component → Action → Event → Effect → Slice → Store

### MFE Loading Flow (Flux-Compliant)
```
Component calls loadMfe action
    ↓
loadMfe action emits 'mfe/loadRequested' event (action returns void)
    ↓
mfeLoadEffect subscribes to 'mfe/loadRequested' event
    ↓
Effect calls orchestrator.load(mfeTypeId) (from @hai3/screensets)
    ↓
Orchestrator uses MfeLoader (Module Federation) to fetch bundle
    ↓
Effect dispatches to mfeSlice: setMfeLoaded or setMfeError
    ↓
Effect emits 'mfe/loaded' or 'mfe/loadError' event
```

### MFE → Host Action Request Flow (Flux-Compliant)
```
MFE component calls bridge.requestHostAction(actionTypeId, payload)
    ↓
Bridge (from @hai3/screensets) validates payload against GTS schema
    ↓
Bridge invokes onHostAction callback (set by framework during wiring)
    ↓
Callback is a Framework action (e.g., handleMfeHostAction)
    ↓
Action emits 'mfe/hostActionRequested' event (action returns void)
    ↓
mfeActionEffect subscribes to event
    ↓
Effect handles the action (e.g., calls orchestrator.showPopup())
    ↓
Effect dispatches to relevant slice
    ↓
Effect emits completion event (e.g., 'mfe/popupShown')
```

### Host → MFE Action Request Flow (Flux-Compliant)
```
Component calls requestMfeAction action
    ↓
requestMfeAction action emits 'mfe/mfeActionRequested' event
    ↓
mfeMfeActionEffect subscribes to event
    ↓
Effect calls orchestrator.requestMfeAction(mfeTypeId, actionTypeId, payload)
    ↓
Orchestrator validates payload against GTS schema
    ↓
Orchestrator invokes MFE's registered action handler
    ↓
Effect receives result, dispatches to slice
    ↓
Effect emits 'mfe/mfeActionCompleted' or 'mfe/mfeActionFailed' event
```

### Key Data Flow Rules

1. **Actions emit events only** - No async, no side effects, must return void
2. **Effects subscribe to events** - They call orchestrator methods, dispatch to slices
3. **Effects may NOT call actions** - Prevents infinite loops
4. **Bridge callbacks are Actions** - When framework wires orchestrator, callbacks become action invocations

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     HAI3 Host Application                        │
├─────────────────────────────────────────────────────────────────┤
│  @hai3/framework (Flux Integration Only)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ microfrontends() plugin                                    │  │
│  │  - mfeActions (emit events, return void)                   │  │
│  │  - mfeEffects (subscribe, call orchestrator, dispatch)     │  │
│  │  - mfeSlice (load states)                                  │  │
│  │  - Wires orchestrator callbacks → actions                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  @hai3/screensets (MFE Orchestration Library)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ MfeOrchestrator                                            │  │
│  │  - MfeLoader (Module Federation)                           │  │
│  │  - MfeBridge (props/callbacks, state-agnostic)             │  │
│  │  - createShadowRoot, injectCssVariables                    │  │
│  │  - GTS utilities, registry, validation                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layout Domains (each can host MFE entries in Shadow DOM)        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │ screen  │ │ popup   │ │ sidebar │ │ overlay │                │
│  │ domain  │ │ domain  │ │ domain  │ │ domain  │                │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                │
│       │           │           │           │                      │
│  ┌────▼───────────▼───────────▼───────────▼────┐                │
│  │         Shadow DOM Boundary                  │                │
│  └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Bridge Communication
                       (props/callbacks)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Remote MFE Screenset                          │
│                    (only depends on @hai3/screensets)            │
├─────────────────────────────────────────────────────────────────┤
│  Entries:                                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ screen      │ │ popup       │ │ sidebar     │                │
│  │ entry       │ │ entries     │ │ entry       │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                  │
│  Contract Implementation:                                        │
│  - mount(container, bridge): MfeMountResult                      │
│  - actionHandlers: { refresh, export, ... }                      │
│  - subscribes to app state via bridge.subscribe()               │
└─────────────────────────────────────────────────────────────────┘
```

## API Contracts

### SDK Layer (@hai3/screensets) - Complete MFE Orchestration Library

**Key principle**: This package is a complete, state-management agnostic MFE orchestration library.
Its API is props/callbacks based with ZERO references to store, state, dispatch, or events.

```typescript
// ============================================================================
// GTS Type System
// ============================================================================

// GTS type identifier (ends with ~)
type GtsTypeId = string & { readonly __brand: 'GtsTypeId' };

// Parsed GTS identifier
interface ParsedGtsId {
  vendor: string;
  package: string;
  namespace: string;
  type: string;
  majorVersion: number;
  minorVersion?: number;
  isType: boolean;  // true if ends with ~
  chain: string[];  // inheritance chain segments
}

// GTS builder for constructing identifiers
interface GtsBuilder {
  vendor(v: string): GtsBuilder;
  package(p: string): GtsBuilder;
  namespace(n: string): GtsBuilder;
  type(t: string): GtsBuilder;
  version(major: number, minor?: number): GtsBuilder;
  extend(baseTypeId: GtsTypeId): GtsBuilder;
  build(): GtsTypeId;
}

// GTS utilities
function parseGtsId(id: string): ParsedGtsId;
function gts(): GtsBuilder;
function conformsTo(derived: GtsTypeId, base: GtsTypeId): boolean;

// ============================================================================
// GTS Schema Registry
// ============================================================================

interface GtsRegistry {
  register(typeId: GtsTypeId, schema: JSONSchema): void;
  get(typeId: GtsTypeId): JSONSchema | undefined;
  validate(payload: unknown, typeId: GtsTypeId): ValidationResult;
  listTypes(pattern?: string): GtsTypeId[];
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
}

// Singleton registry
const gtsRegistry: GtsRegistry;

// ============================================================================
// MFE Contracts (using GTS)
// ============================================================================

// Entry point for a specific layout domain
interface MfeEntry {
  // GTS type: e.g., 'gts.hai3.mfe.entry.screen.v1~acme.analytics.screens.main.v1~'
  typeId: GtsTypeId;
  domain: LayoutDomain;
  component: () => Promise<{ default: React.ComponentType<MfeEntryProps> }>;
}

// What host exposes to MFE (ISP - thin interface)
interface HostBridge<TAppState = AppState> {
  subscribe<T>(selector: (state: TAppState) => T, callback: (value: T) => void): Subscription;
  // Action type is a GTS type ID, payload validated against its schema
  requestHostAction(actionTypeId: GtsTypeId, payload: unknown): Promise<void>;
  getAppState(): TAppState;
  readonly mfeTypeId: GtsTypeId;
}

// What MFE exposes to host
interface MfeContract {
  mount(container: HTMLElement, bridge: HostBridge): MfeMountResult;
  // Action handlers keyed by GTS type ID
  actionHandlers?: Record<GtsTypeId, (payload: unknown) => Promise<unknown>>;
}

// Complete MFE definition
interface MicrofrontendDefinition {
  // GTS type: e.g., 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~'
  typeId: GtsTypeId;
  name: string;
  entries: MfeEntry[];
  contract: MfeContract;
  // MFE-specific action types (registered with gtsRegistry)
  actionTypes?: GtsTypeId[];
  menu?: MenuItemConfig;
}

// ============================================================================
// MFE Error Types
// ============================================================================

// Schema validation errors (thrown during load/mount)
class MfeSchemaValidationError extends Error {
  readonly mfeTypeId: GtsTypeId;
  readonly schemaTypeId: GtsTypeId;  // e.g., 'gts.hai3.mfe.type.v1~'
  readonly errors: ValidationError[];
}

class MfeEntrySchemaValidationError extends Error {
  readonly entryTypeId: GtsTypeId;
  readonly schemaTypeId: GtsTypeId;  // e.g., 'gts.hai3.mfe.entry.screen.v1~'
  readonly errors: ValidationError[];
}

// Action validation errors
class PayloadValidationError extends Error {
  readonly actionTypeId: GtsTypeId;
  readonly errors: ValidationError[];
}

class MfeNotMountedError extends Error {
  readonly mfeTypeId: GtsTypeId;
}

class ActionNotAllowedError extends Error {
  readonly actionTypeId: GtsTypeId;
}

class ActionNotRegisteredError extends Error {
  readonly mfeTypeId: GtsTypeId;
  readonly actionTypeId: GtsTypeId;
}

// ============================================================================
// MFE Event Payload Types (for EventPayloadMap augmentation)
// ============================================================================

interface MfeEventPayloads {
  'mfe/loadRequested': { mfeTypeId: GtsTypeId };
  'mfe/loaded': { mfeTypeId: GtsTypeId };
  'mfe/loadError': { mfeTypeId: GtsTypeId; error: string };
  'mfe/mounted': { mfeTypeId: GtsTypeId; entryTypeId: GtsTypeId; domain: LayoutDomain };
  'mfe/unmounted': { mfeTypeId: GtsTypeId };
  'mfe/hostActionRequested': { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; payload: unknown };
  'mfe/mfeActionRequested': { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; payload: unknown };
  'mfe/actionCompleted': { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; durationMs: number };
  'mfe/actionFailed': { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; error: string };
  'mfe/validationFailed': { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; errors: ValidationError[] };
}

// ============================================================================
// MFE Bridge (State-Agnostic Implementation)
// ============================================================================

// Configuration for creating a bridge (props/callbacks interface)
interface MfeBridgeConfig<TAppState> {
  mfeTypeId: GtsTypeId;
  getAppState: () => TAppState;                                           // Callback to get current state
  subscribeToState: (callback: (state: TAppState) => void) => Unsubscribe; // Callback to subscribe
  onHostAction: (actionTypeId: GtsTypeId, payload: unknown) => void;       // Callback when MFE requests host action
  registry: GtsRegistry;                                                   // For payload validation
}

// Bridge class - state-agnostic, uses callbacks
class MfeBridge<TAppState = AppState> implements HostBridge<TAppState> {
  constructor(config: MfeBridgeConfig<TAppState>);

  readonly mfeTypeId: GtsTypeId;

  getAppState(): TAppState;

  subscribe<T>(
    selector: (state: TAppState) => T,
    callback: (value: T) => void,
    options?: SubscribeOptions
  ): Subscription;

  // Validates payload, then invokes onHostAction callback
  requestHostAction(actionTypeId: GtsTypeId, payload: unknown): Promise<void>;
}

// ============================================================================
// MFE Loader (Module Federation)
// ============================================================================

interface MfeLoaderConfig {
  loadTimeout?: number;
  shared?: string[];
}

class MfeLoader {
  constructor(config?: MfeLoaderConfig);

  load(remote: MfeRemoteConfig): Promise<MicrofrontendDefinition>;
  preload(remote: MfeRemoteConfig): void;
  isLoaded(mfeTypeId: GtsTypeId): boolean;
  getDefinition(mfeTypeId: GtsTypeId): MicrofrontendDefinition | undefined;
}

// ============================================================================
// MFE Orchestrator (Main Coordination Class)
// ============================================================================

interface MfeOrchestratorConfig<TAppState> {
  loader: MfeLoader;
  registry: GtsRegistry;
  createBridge: (mfeTypeId: GtsTypeId) => MfeBridge<TAppState>;  // Factory callback
  createShadowContainer: (mfeTypeId: GtsTypeId) => HTMLElement;  // Factory callback
  cssVariables?: Record<string, string>;

  // Lifecycle callbacks (wired to Framework actions)
  onLoadStart?: (mfeTypeId: GtsTypeId) => void;
  onLoadComplete?: (mfeTypeId: GtsTypeId) => void;
  onLoadError?: (mfeTypeId: GtsTypeId, error: Error) => void;
  onMounted?: (mfeTypeId: GtsTypeId, entryTypeId: GtsTypeId, domain: LayoutDomain) => void;
  onUnmounted?: (mfeTypeId: GtsTypeId) => void;
}

class MfeOrchestrator<TAppState = AppState> {
  constructor(config: MfeOrchestratorConfig<TAppState>);

  // Load an MFE bundle (does not mount)
  async load(mfeTypeId: GtsTypeId): Promise<MicrofrontendDefinition>;

  // Mount an entry in a container
  mount(mfeTypeId: GtsTypeId, entryTypeId: GtsTypeId, container: HTMLElement): MfeMountResult;

  // Unmount a mounted MFE
  unmount(mfeTypeId: GtsTypeId): void;

  // Request action from host to MFE
  async requestMfeAction(mfeTypeId: GtsTypeId, actionTypeId: GtsTypeId, payload: unknown): Promise<unknown>;

  // State queries
  isLoaded(mfeTypeId: GtsTypeId): boolean;
  isMounted(mfeTypeId: GtsTypeId): boolean;
  getMountedMfes(): GtsTypeId[];
}

// ============================================================================
// Shadow DOM Utilities
// ============================================================================

function createShadowRoot(container: HTMLElement, options?: { mode?: 'open' | 'closed' }): ShadowRoot;
function injectCssVariables(shadowRoot: ShadowRoot, variables: Record<string, string>): void;
```

### Framework Layer (@hai3/framework) - Flux Integration Only

**Key principle**: This package ONLY provides Flux integration. It wires the orchestrator callbacks
to actions that emit events, and provides effects that call orchestrator methods and dispatch to slices.

```typescript
// ============================================================================
// Plugin Configuration
// ============================================================================

interface MicrofrontendsConfig {
  remotes?: MfeRemoteConfig[];
  styleIsolation?: 'shadow-dom' | 'none';
  cssVariablePrefix?: string;
  loadTimeout?: number;
  errorBoundary?: React.ComponentType<MfeErrorBoundaryProps>;
  loadingComponent?: React.ComponentType<MfeLoadingProps>;
}

// Remote MFE configuration (using GTS type ID)
interface MfeRemoteConfig {
  typeId: GtsTypeId;  // e.g., 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~'
  url: string;
  shared?: string[];
  preload?: 'none' | 'hover' | 'immediate';
  loadTimeout?: number;
}

// Plugin factory
function microfrontends(config?: MicrofrontendsConfig): HAI3Plugin;

// ============================================================================
// MFE Actions (emit events only, return void, no async)
// ============================================================================

// Actions follow HAI3 Flux rules: emit event, return void, no async
const mfeActions = {
  loadMfe(mfeTypeId: GtsTypeId): void {
    emit('mfe/loadRequested', { mfeTypeId });
  },

  mountMfeEntry(mfeTypeId: GtsTypeId, entryTypeId: GtsTypeId, domain: LayoutDomain): void {
    emit('mfe/mountRequested', { mfeTypeId, entryTypeId, domain });
  },

  unmountMfe(mfeTypeId: GtsTypeId): void {
    emit('mfe/unmountRequested', { mfeTypeId });
  },

  // Called by bridge onHostAction callback
  handleMfeHostAction(mfeTypeId: GtsTypeId, actionTypeId: GtsTypeId, payload: unknown): void {
    emit('mfe/hostActionRequested', { mfeTypeId, actionTypeId, payload });
  },

  requestMfeAction(mfeTypeId: GtsTypeId, actionTypeId: GtsTypeId, payload: unknown): void {
    emit('mfe/mfeActionRequested', { mfeTypeId, actionTypeId, payload });
  },
};

// ============================================================================
// MFE Effects (subscribe to events, call orchestrator, dispatch to slice)
// ============================================================================

// Effects follow HAI3 Flux rules: subscribe to events, dispatch to slice, may NOT call actions
function initMfeEffects(orchestrator: MfeOrchestrator, dispatch: Dispatch) {

  // Load effect
  eventBus.on('mfe/loadRequested', async ({ mfeTypeId }) => {
    dispatch(mfeSlice.actions.setLoading({ mfeTypeId }));
    try {
      await orchestrator.load(mfeTypeId);
      dispatch(mfeSlice.actions.setLoaded({ mfeTypeId }));
    } catch (error) {
      dispatch(mfeSlice.actions.setError({ mfeTypeId, error: error.message }));
    }
  });

  // Mount effect
  eventBus.on('mfe/mountRequested', ({ mfeTypeId, entryTypeId, domain }) => {
    const container = document.getElementById(`mfe-${domain}`);
    orchestrator.mount(mfeTypeId, entryTypeId, container);
    dispatch(mfeSlice.actions.setMounted({ mfeTypeId, entryTypeId, domain }));
  });

  // Host action effect (handles MFE→Host requests)
  eventBus.on('mfe/hostActionRequested', async ({ mfeTypeId, actionTypeId, payload }) => {
    // Effect handles the action based on actionTypeId
    if (conformsTo(actionTypeId, HAI3_ACTION_SHOW_POPUP)) {
      const { entryTypeId, props } = payload as ShowPopupPayload;
      orchestrator.mount(mfeTypeId, entryTypeId, popupContainer);
      dispatch(layoutSlice.actions.showPopup({ mfeTypeId, entryTypeId }));
    }
    // ... handle other host actions
  });

  // MFE action effect (handles Host→MFE requests)
  eventBus.on('mfe/mfeActionRequested', async ({ mfeTypeId, actionTypeId, payload }) => {
    try {
      const result = await orchestrator.requestMfeAction(mfeTypeId, actionTypeId, payload);
      dispatch(mfeSlice.actions.setActionCompleted({ mfeTypeId, actionTypeId, result }));
    } catch (error) {
      dispatch(mfeSlice.actions.setActionFailed({ mfeTypeId, actionTypeId, error: error.message }));
    }
  });
}

// ============================================================================
// MFE Slice (Redux state for load tracking)
// ============================================================================

interface MfeSliceState {
  loadStates: Record<GtsTypeId, 'idle' | 'loading' | 'loaded' | 'error'>;
  errors: Record<GtsTypeId, string>;
  mounted: Record<GtsTypeId, { entryTypeId: GtsTypeId; domain: LayoutDomain }>;
}

const mfeSlice = createSlice({
  name: 'mfe',
  initialState: { loadStates: {}, errors: {}, mounted: {} },
  reducers: {
    setLoading: (state, { mfeTypeId }) => { state.loadStates[mfeTypeId] = 'loading'; },
    setLoaded: (state, { mfeTypeId }) => { state.loadStates[mfeTypeId] = 'loaded'; },
    setError: (state, { mfeTypeId, error }) => {
      state.loadStates[mfeTypeId] = 'error';
      state.errors[mfeTypeId] = error;
    },
    setMounted: (state, { mfeTypeId, entryTypeId, domain }) => {
      state.mounted[mfeTypeId] = { entryTypeId, domain };
    },
    setUnmounted: (state, { mfeTypeId }) => {
      delete state.mounted[mfeTypeId];
    },
  },
});

// Selectors
const selectMfeLoadState = (state, mfeTypeId: GtsTypeId) => state.mfe.loadStates[mfeTypeId] ?? 'idle';
const selectMfeError = (state, mfeTypeId: GtsTypeId) => state.mfe.errors[mfeTypeId];
const selectMountedMfes = (state) => Object.keys(state.mfe.mounted) as GtsTypeId[];

// ============================================================================
// Load Errors (framework-specific)
// ============================================================================

class MfeLoadTimeoutError extends Error {
  readonly mfeTypeId: GtsTypeId;
  readonly timeoutMs: number;
}

class MfeNetworkError extends Error {
  readonly mfeTypeId: GtsTypeId;
  readonly cause: Error;
}

class MfeVersionMismatchError extends Error {
  readonly mfeTypeId: GtsTypeId;
  readonly dependency: string;
  readonly hostVersion: string;
  readonly mfeVersion: string;
}

class MfeTypeConformanceError extends Error {
  readonly typeId: GtsTypeId;
  readonly expectedBase: GtsTypeId;
}
```

### Predefined HAI3 GTS Types

```typescript
// Base types (defined by HAI3 platform)
const HAI3_MFE_TYPE = 'gts.hai3.mfe.type.v1~' as GtsTypeId;
const HAI3_MFE_ENTRY_SCREEN = 'gts.hai3.mfe.entry.screen.v1~' as GtsTypeId;
const HAI3_MFE_ENTRY_POPUP = 'gts.hai3.mfe.entry.popup.v1~' as GtsTypeId;
const HAI3_MFE_ENTRY_SIDEBAR = 'gts.hai3.mfe.entry.sidebar.v1~' as GtsTypeId;
const HAI3_MFE_ENTRY_OVERLAY = 'gts.hai3.mfe.entry.overlay.v1~' as GtsTypeId;

// Host action types
const HAI3_ACTION_SHOW_POPUP = 'gts.hai3.action.host.show_popup.v1~' as GtsTypeId;
const HAI3_ACTION_HIDE_POPUP = 'gts.hai3.action.host.hide_popup.v1~' as GtsTypeId;
const HAI3_ACTION_SHOW_SIDEBAR = 'gts.hai3.action.host.show_sidebar.v1~' as GtsTypeId;
const HAI3_ACTION_NAVIGATE = 'gts.hai3.action.host.navigate.v1~' as GtsTypeId;
const HAI3_ACTION_SET_LANGUAGE = 'gts.hai3.action.host.set_language.v1~' as GtsTypeId;
const HAI3_ACTION_CHANGE_THEME = 'gts.hai3.action.host.change_theme.v1~' as GtsTypeId;

// App state type
const HAI3_APP_STATE = 'gts.hai3.state.app.v1~' as GtsTypeId;
```

## Risks / Trade-offs

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| React version mismatch host/MFE | Critical (runtime crash) | Medium | Strict shared dep version validation at load time |
| CSS leakage despite Shadow DOM | Medium (visual bugs) | Low | CSS reset in shadow root, automated visual regression |
| Bridge subscription memory leaks | High (app degradation) | Medium | Auto-cleanup on unmount, dev mode leak detection |
| Slow MFE loads | Medium (poor UX) | Medium | Preloading strategies, loading skeletons, timeouts |
| TypeScript type drift | Medium (dev friction) | Medium | Generate types from MFE at build, validate at load |

## Migration Plan

### Phase 1: SDK Contracts (Non-Breaking)
- Add types to `@hai3/screensets` (zero runtime impact)
- GTS utilities, MFE contracts, error types, event payloads
- Release as minor version

### Phase 2: Framework Plugin (Opt-In)
- Add `microfrontends()` plugin (optional, no impact to existing apps)
- Bridge implementation, `MfeLoader`, Shadow DOM components
- Release as minor version

### Phase 3: Documentation & Tooling
- CLI command: `hai3 create --mfe` for MFE screenset template
- Documentation for MFE development workflow
- Example MFE project

### Phase 4: Production Hardening
- Telemetry hooks (load times, errors)
- Health check endpoints
- Preloading optimization

## Open Questions

1. **Authentication tokens**: Should MFEs receive auth tokens via bridge, or use separate auth MFE pattern?
2. **Deep linking**: Should host support deep links into MFE internal routes?
3. **Error reporting**: Should MFE errors bubble to host error boundary, or stay isolated?
4. **Versioning strategy**: How to handle breaking changes in bridge contract?
