# Design: MFE Loading and Handler Architecture

This document covers the MfeHandler abstraction, handler registry, and Module Federation 2.0 bundle loading.

**Related Documents:**
- [Type System](./type-system.md) - TypeSystemPlugin interface, GTS implementation
- [MFE Entry](./mfe-entry-mf.md) - MfeEntry and MfeEntryMF types
- [MFE Manifest](./mfe-manifest.md) - MfManifest type
- [MFE API](./mfe-api.md) - MfeEntryLifecycle and MfeBridge interfaces
- [MFE Errors](./mfe-errors.md) - Error class hierarchy

---

## Context

MFE loading is the process of fetching and initializing remote MFE bundles at runtime. The system uses Module Federation 2.0 as the underlying mechanism, which provides code sharing, dependency management, and dynamic module resolution. The loader works with [MfeEntryMF](./mfe-entry-mf.md) (which defines the entry contract) and [MfManifest](./mfe-manifest.md) (which defines the Module Federation configuration).

The loading process must handle network failures, validation [errors](./mfe-errors.md), and version mismatches. HAI3's default handler (`MfeHandlerMF`) enforces runtime isolation between MFE instances, while custom handlers can implement different isolation strategies.

## Definitions

**MfeHandler**: An abstract class that handles loading MFE bundles for specific entry types. Handlers use type hierarchy matching to determine which entries they can handle.

**MfeBridgeFactory**: An abstract factory that creates ChildMfeBridge instances for MFEs. Each handler has an associated bridge factory.

**MfeLoader**: A conceptual reference implementation shown below for documentation purposes. In practice, the loading logic (manifest resolution, container loading, retry, timeout) is **absorbed into `MfeHandlerMF`** rather than existing as a separate class. See [Relationship to MfeHandlerMF](#mfeloader-relationship-to-mfehandlermf) for details.

---

## Decisions

### Decision 10: MfeHandler Abstraction and Registry

The GTS type system enables companies to create custom derived entry types with richer contracts. The MfeHandler Registry uses type hierarchy matching to route entries to the correct handler.

#### Handler Architecture

```
TYPE SYSTEM (GTS)                           HANDLER REGISTRY
================                            ================

MfeEntry (abstract)                         MfeHandler (abstract class)
    |                                           |
    +-- MfeEntryMF                              +-- MfeHandlerMF
    |   (thin, stable)                          |   handledBaseTypeId: ~hai3.mfes.mfe.entry_mf.*
    |                                           |   bridgeFactory: MfeBridgeFactoryDefault
    |                                           |
    +-- MfeEntryAcme                            +-- MfeHandlerAcme
        (richer contract)                           handledBaseTypeId: ~acme.corp.mfe.entry_acme.*
                                                    bridgeFactory: MfeBridgeFactoryAcme (with shared services)
```

#### MfeHandler Abstract Class

```typescript
// packages/screensets/src/mfe/handler/index.ts

/**
 * Abstract handler for loading MFE bundles.
 * Subclasses implement loading logic for specific entry types.
 */
abstract class MfeHandler<TEntry extends MfeEntry = MfeEntry, TBridge extends ChildMfeBridge = ChildMfeBridge> {
  /** The base type ID this handler can handle */
  readonly handledBaseTypeId: string;

  /** Priority for handler selection (higher = checked first) */
  readonly priority: number;

  /** Factory for creating bridges for loaded MFEs */
  abstract readonly bridgeFactory: MfeBridgeFactory<TBridge>;

  constructor(
    protected readonly typeSystem: TypeSystemPlugin,
    handledBaseTypeId: string,
    priority: number = 0
  ) {
    this.handledBaseTypeId = handledBaseTypeId;
    this.priority = priority;
  }

  /**
   * Check if this handler can handle the given entry type.
   * Uses type system hierarchy matching.
   */
  canHandle(entryTypeId: string): boolean {
    return this.typeSystem.isTypeOf(entryTypeId, this.handledBaseTypeId);
  }

  /**
   * Load an MFE bundle and return its lifecycle interface.
   */
  abstract load(entry: TEntry): Promise<MfeEntryLifecycle<ChildMfeBridge>>;

  /**
   * Preload MFE bundles for faster mounting.
   */
  abstract preload(entries: TEntry[]): Promise<void>;
}
```

#### MfeBridgeFactory Abstract Class

```typescript
// packages/screensets/src/mfe/handler/types.ts

/**
 * Abstract factory for creating MFE bridges.
 * Companies can implement rich factories with shared services.
 */
abstract class MfeBridgeFactory<TBridge extends ChildMfeBridge = ChildMfeBridge> {
  /**
   * Create a bridge for an MFE.
   * @param domainId - The domain the MFE is mounted in
   * @param entryTypeId - The entry type ID
   * @param instanceId - Unique instance ID for this bridge
   */
  abstract create(
    domainId: string,
    entryTypeId: string,
    instanceId: string
  ): TBridge;

  /**
   * Dispose a bridge and clean up resources.
   */
  abstract dispose(bridge: TBridge): void;
}

/**
 * Default bridge factory - creates minimal ChildMfeBridge instances.
 * ChildMfeBridgeImpl is the internal concrete class implementing ChildMfeBridge
 * (defined in packages/screensets/src/mfe/bridge/ChildMfeBridge.ts).
 */
class MfeBridgeFactoryDefault extends MfeBridgeFactory<ChildMfeBridge> {
  create(domainId: string, entryTypeId: string, instanceId: string): ChildMfeBridge {
    return new ChildMfeBridgeImpl(domainId, entryTypeId, instanceId);
  }

  dispose(bridge: ChildMfeBridge): void {
    (bridge as ChildMfeBridgeImpl).cleanup();
  }
}
```

#### Type ID Matching in Handlers

Each handler's `canHandle()` method (inherited from base class) uses the type system to determine if it can handle an entry:

```typescript
// HAI3's default MF handler - handles MfeEntryMF
class MfeHandlerMF extends MfeHandler<MfeEntryMF, ChildMfeBridge> {
  readonly bridgeFactory = new MfeBridgeFactoryDefault();
  private readonly manifestCache: ManifestCache;

  constructor(typeSystem: TypeSystemPlugin) {
    // Pass the base type ID this handler handles
    super(typeSystem, 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~');
    // ManifestCache is created internally - not passed in
    this.manifestCache = new ManifestCache();
  }

  // canHandle() inherited from base class uses:
  // this.typeSystem.isTypeOf(entryTypeId, this.handledBaseTypeId)

  async load(entry: MfeEntryMF): Promise<MfeEntryLifecycle<ChildMfeBridge>> {
    // Resolve manifest from entry - manifest info is embedded in MfeEntryMF
    // or referenced by type ID and resolved internally
    const manifest = await this.resolveManifest(entry.manifest);
    // Cache manifest for reuse by other entries from same remote
    this.manifestCache.cacheManifest(manifest);
    const container = await this.loadRemoteContainer(manifest);
    const moduleFactory = await container.get(entry.exposedModule);
    return moduleFactory();
  }

  private async resolveManifest(manifestRef: string): Promise<MfManifest> {
    // Check cache first
    const cached = this.manifestCache.getManifest(manifestRef);
    if (cached) {
      return cached;
    }
    // Manifest must be provided inline or already cached from previous entry
    throw new MfeLoadError(
      `Manifest '${manifestRef}' not found. Provide manifest inline in MfeEntryMF or ensure another entry from the same remote was loaded first.`,
      manifestRef
    );
  }

  async preload(entries: MfeEntryMF[]): Promise<void> {
    // Preload containers for registered manifests
  }
}

// Company's custom handler - handles MfeEntryAcme with rich bridges
class MfeHandlerAcme extends MfeHandler<MfeEntryAcme, ChildMfeBridgeAcme> {
  readonly bridgeFactory: MfeBridgeFactoryAcme;

  constructor(typeSystem: TypeSystemPlugin, router: Router, apiClient: ApiClient) {
    super(typeSystem, 'gts.hai3.mfes.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~', 100);
    this.bridgeFactory = new MfeBridgeFactoryAcme(router, apiClient);
  }

  async load(entry: MfeEntryAcme): Promise<MfeEntryLifecycle<ChildMfeBridge>> {
    // Custom loading with preload assets, feature flags, etc.
  }
}
```

#### Priority-Based Selection

When multiple handlers can handle an entry (e.g., a company handler extends MfeHandlerMF), priority determines which is used:

| Handler | Priority | Handles | Bridge |
|---------|----------|---------|--------|
| MfeHandlerAcme | 100 | Company's richer entries | Rich (with shared services) |
| MfeHandlerMF | 0 | HAI3's thin entries, fallback for others | Thin (minimal contract) |

Company handlers use higher priority to ensure their derived types are handled by their custom handlers, not the generic MfeHandlerMF. This also ensures internal MFEs get rich bridges with shared services.

#### Handler Registry

```typescript
// packages/screensets/src/mfe/handler/registry.ts

class MfeHandlerRegistry {
  private handlers: MfeHandler[] = [];

  /**
   * Register a handler. Handlers are sorted by priority (highest first).
   */
  register(handler: MfeHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find the handler for an entry type.
   * Returns the first handler (highest priority) that can handle the entry.
   */
  getHandler(entryTypeId: string): MfeHandler | undefined {
    return this.handlers.find(h => h.canHandle(entryTypeId));
  }

  /**
   * Load an entry using the appropriate handler.
   */
  async load(entry: MfeEntry): Promise<MfeEntryLifecycle<ChildMfeBridge>> {
    // GTS instance IDs embed the schema ID prefix, so isTypeOf() within
    // canHandle() can match entry.id against the handler's base type hierarchy.
    const handler = this.getHandler(entry.id);
    if (!handler) {
      throw new MfeLoadError(`No handler found for entry type`, entry.id);
    }
    return handler.load(entry);
  }
}
```

### Decision 11: Module Federation 2.0 for Bundle Loading

**What**: Use Webpack 5 / Rspack Module Federation 2.0 for loading remote MFE bundles.

**Why**:
- Mature ecosystem with TypeScript type generation
- Shared dependency configuration with independent control over code sharing and instance isolation
- Battle-tested at scale (Zara, IKEA, others)
- Works with existing HAI3 Vite build (via `@originjs/vite-plugin-federation`)

#### Shared Dependencies Model

Module Federation's shared dependencies provide TWO independent benefits:

1. **Code/Bundle Sharing** (Performance)
   - When a dependency is listed in `shared`, the code is downloaded once and cached
   - All consumers (host and MFEs) use the cached bundle

2. **Runtime Instance Control** (Isolation vs Sharing)
   - `singleton: false` (DEFAULT): Each consumer gets its OWN instance from the shared code
   - `singleton: true`: All consumers share the SAME instance

**Key Insight**: With `singleton: false`, you get BOTH code sharing AND instance isolation.

#### Why `singleton: false` is the Correct Default

`singleton: false` gives both code sharing and instance isolation. See [Runtime Isolation in overview.md](./overview.md#runtime-isolation-default-behavior) for the full isolation model and recommendations.

#### When `singleton: true` is Safe

| Library | singleton | Reason |
|---------|-----------|--------|
| lodash | `true` | Pure functions, no internal state |
| date-fns | `true` | Pure functions, no internal state |
| React | `false` | Has hooks state, context, reconciler |
| ReactDOM | `false` | Has fiber tree, event system |
| @hai3/* | `false` | Has TypeSystemPlugin, schema registry |

#### MfeLoader (Internal Implementation Detail)

> **REFERENCE ONLY -- NOT A RUNTIME CLASS**
>
> The `MfeLoader` class below is a **conceptual reference** for documentation purposes only.
> It does NOT exist at runtime. All loading logic is absorbed into `MfeHandlerMF`
> (see [Relationship to MfeHandlerMF](#mfeloader-relationship-to-mfehandlermf) below).
> Do NOT implement this as a standalone class.

**Loading algorithm (pseudocode):**

```
load(entry: MfeEntryMF):
  1. Resolve manifest via typeSystem (cached by manifest type ID)
  2. Load remote container via Module Federation (cached by remoteName)
     - On failure: throw MfeLoadError with entryTypeId and cause
     - Retry up to config.retries (default: 2) with config.timeout (default: 30s)
  3. Get exposed module factory: container.get(entry.exposedModule)
  4. Execute factory and validate mount/unmount exist on the returned module
     - If missing: throw MfeLoadError ("must implement MfeEntryLifecycle")
  5. Return { lifecycle, entry, manifest, unload }

preload(entries: MfeEntryMF[]):
  - Group entries by manifest, resolve and cache containers in parallel
    (uses Promise.allSettled -- individual failures do not block others)
```

Configuration: `timeout` (default 30000ms), `retries` (default 2), `preload` (boolean).

Internal caches: `Map<string, MfManifest>` for resolved manifests, `Map<string, Container>` for loaded containers. Both keyed by `remoteName`.

<a name="mfeloader-relationship-to-mfehandlermf"></a>
#### MfeLoader: Relationship to MfeHandlerMF

The `MfeLoader` class shown above is a **conceptual reference** that documents the loading concerns (manifest resolution, container caching, retry/timeout, lifecycle validation). In the actual implementation, these responsibilities are **absorbed into `MfeHandlerMF`** rather than existing as a separate delegated class:

- `MfeHandlerMF.load(entry)` performs manifest resolution, container loading, and module factory extraction directly (shown in the `MfeHandlerMF` code above)
- `MfeHandlerMF.preload(entries)` batches container preloading directly
- `ManifestCache` is an internal helper class **inside** `mf-handler.ts` (see Decision 12 below), not a standalone module
- Retry and timeout configuration are handled within `MfeHandlerMF`'s private methods

This means there is **no separate `MfeLoader` class at runtime**. The `MfeLoader` code block above serves as documentation of the loading algorithm and concerns. All loading logic lives in `MfeHandlerMF` (file: `packages/screensets/src/mfe/handler/mf-handler.ts`), keeping the handler self-contained and avoiding an unnecessary indirection layer.

<a name="decision-12"></a>
### Decision 12: Manifest as Internal Implementation Detail of MfeHandlerMF

MfManifest is NOT a first-class citizen of the MFE system. It is an **internal implementation detail** of the Module Federation handler (`MfeHandlerMF`). Other handler types (iframe, ESM) would not use manifests at all.

**Key Principle**: The ScreensetsRegistry does NOT expose `registerManifest()` publicly. When an Extension references an MfeEntryMF, the handler internally resolves and caches the manifest.

#### Internal Manifest Registry (Private to MfeHandlerMF)

```typescript
// packages/screensets/src/mfe/handler/mf-handler.ts (INTERNAL)

/**
 * Internal registry for MfManifest instances.
 * Used only by MfeHandlerMF - not exposed publicly.
 */
class ManifestCache {
  private readonly manifests = new Map<string, MfManifest>();
  private readonly containers = new Map<string, Container>();

  /** Cache a manifest for reuse */
  cacheManifest(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  /** Get a cached manifest by ID */
  getManifest(manifestId: string): MfManifest | undefined {
    return this.manifests.get(manifestId);
  }

  /** Cache a loaded container */
  cacheContainer(remoteName: string, container: Container): void {
    this.containers.set(remoteName, container);
  }

  /** Get a cached container */
  getContainer(remoteName: string): Container | undefined {
    return this.containers.get(remoteName);
  }
}
```

#### How Manifests are Resolved

When the load operation is triggered (via `HAI3_ACTION_LOAD_EXT` action, routed to `MountManager.loadExtension()`) for an extension referencing MfeEntryMF:

1. MfeHandlerMF receives the entry with `manifest` field (a type ID or inline manifest)
2. Handler resolves the manifest internally (from cache or by parsing the entry)
3. Handler loads the Module Federation container
4. Manifest is cached for subsequent loads of entries from the same remote

```typescript
// Application registers extension (manifest info is embedded in MfeEntryMF)
// Extension using derived type that includes domain-specific fields
runtime.registerExtension({
  id: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.ext.screen_extension.v1~acme.analytics.dashboard.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields from derived Extension type (no uiMeta wrapper)
  title: 'Analytics Dashboard',
});

// Loading and mounting are handled via actions chains (not direct registry methods).
// Internally, ExtensionLifecycleActionHandler routes to MountManager which uses
// MfeHandlerMF to resolve manifests and load bundles.
await runtime.executeActionsChain({
  action: { type: HAI3_ACTION_MOUNT_EXT, target: domainId, payload: { extensionId } }, // Domain's ContainerProvider supplies the container
});
```

**Note**: The MfeEntryMF type includes a `manifest` field that can be:
- A manifest type ID reference (resolved from a manifest registry or API)
- An inline manifest object with remoteEntry and remoteName

How the manifest data is obtained (backend API, static config, etc.) is outside MFE system scope. The MfeEntryMF carries the manifest reference, and MfeHandlerMF resolves it internally.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Type System plugin complexity | Provide comprehensive GTS plugin as reference implementation |
| Contract validation overhead | Cache validation results, validate once at registration |
| Module Federation bundle size | Tree-shaking, shared dependencies, lazy loading |
| Manifest availability | Clear error messages when manifest not registered |
| Dynamic registration race conditions | Sequential registration with async/await, per-entity operation serialization |

## Testing Strategy

1. **Unit Tests**: Plugin interface, contract validation, type validation, bridge communication
2. **Integration Tests**: MFE loading, domain registration, action chain execution, Shadow DOM isolation
3. **E2E Tests**: Full MFE lifecycle with real Module Federation bundles
