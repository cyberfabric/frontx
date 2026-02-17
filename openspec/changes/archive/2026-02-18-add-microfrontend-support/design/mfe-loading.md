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
    |   (thin, stable)                          |   handledBaseTypeId: gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~
    |                                           |   bridgeFactory: MfeBridgeFactoryDefault
    |                                           |
    +-- MfeEntryAcme                            +-- MfeHandlerAcme
        (richer contract)                           handledBaseTypeId: gts.hai3.mfes.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~
                                                    bridgeFactory: MfeBridgeFactoryAcme (with shared services)
```

#### MfeHandler Abstract Class

```typescript
// packages/screensets/src/mfe/handler/types.ts (re-exported from handler/index.ts barrel)

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
  abstract load(entry: TEntry): Promise<MfeEntryLifecycle<TBridge>>;
}
```

#### MfeBridgeFactory Abstract Class

`MfeBridgeFactory<TBridge>` is a public abstract factory that each `MfeHandler` associates with for creating bridge instances. It defines `create(domainId, entryTypeId, instanceId): TBridge` and `dispose(bridge): void`. `MfeBridgeFactoryDefault` is the concrete implementation used by `MfeHandlerMF`. Companies extend `MfeBridgeFactory` to implement custom factories with richer bridges (shared services, routing, etc.) -- see `MfeBridgeFactoryAcme` example in the handler architecture diagram above.

#### Type ID Matching in Handlers

Each handler's `canHandle()` method (inherited from base class) uses the type system to determine if it can handle an entry:

```typescript
// HAI3's default MF handler - handles MfeEntryMF
class MfeHandlerMF extends MfeHandler<MfeEntryMF, ChildMfeBridge> {
  readonly bridgeFactory: MfeBridgeFactoryDefault;
  private readonly manifestCache: ManifestCache;

  constructor(typeSystem: TypeSystemPlugin) {
    // Pass the base type ID this handler handles
    super(typeSystem, 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~');
    this.bridgeFactory = new MfeBridgeFactoryDefault();
    this.manifestCache = new ManifestCache();
  }

  // canHandle() inherited from base class uses:
  // this.typeSystem.isTypeOf(entryTypeId, this.handledBaseTypeId)

  async load(entry: MfeEntryMF): Promise<MfeEntryLifecycle<ChildMfeBridge>> { // TBridge = ChildMfeBridge for MfeHandlerMF
    // Resolve manifest from entry - manifest info is embedded in MfeEntryMF
    // or referenced by type ID and resolved internally
    const manifest = await this.resolveManifest(entry.manifest);
    // Cache manifest for reuse by other entries from same remote
    this.manifestCache.cacheManifest(manifest);
    // loadRemoteContainer uses ESM dynamic import(manifest.remoteEntry) internally,
    // NOT script tag injection. The Vite federation plugin produces ESM remoteEntry.js
    // files with named exports (get/init). See task 34.2.5 for the ESM adaptation.
    const container = await this.loadRemoteContainer(manifest);
    const moduleFactory = await container.get(entry.exposedModule);
    return moduleFactory();
  }

  private async resolveManifest(manifestRef: string | MfManifest): Promise<MfManifest> {
    // If manifestRef is an inline MfManifest object, validate and return it
    if (typeof manifestRef === 'object' && manifestRef !== null) {
      if (typeof manifestRef.id !== 'string' || typeof manifestRef.remoteEntry !== 'string') {
        throw new MfeLoadError('Inline manifest missing required fields (id, remoteEntry)', '');
      }
      return manifestRef;
    }

    // String reference: check cache first
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

}

// Company's custom handler - handles MfeEntryAcme with rich bridges
class MfeHandlerAcme extends MfeHandler<MfeEntryAcme, ChildMfeBridgeAcme> {
  readonly bridgeFactory: MfeBridgeFactoryAcme;

  constructor(typeSystem: TypeSystemPlugin, router: Router, apiClient: ApiClient) {
    super(typeSystem, 'gts.hai3.mfes.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~', 100);
    this.bridgeFactory = new MfeBridgeFactoryAcme(router, apiClient);
  }

  async load(entry: MfeEntryAcme): Promise<MfeEntryLifecycle<ChildMfeBridgeAcme>> { // TBridge = ChildMfeBridgeAcme for MfeHandlerAcme
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

The internal `MfeHandlerRegistry` maintains handlers sorted by priority (highest first). When loading an entry, it iterates handlers and calls `canHandle(entryTypeId)` on each until a match is found. The first matching handler loads the entry. If no handler matches, `MfeLoadError` is thrown. Handlers are provided via `ScreensetsRegistryConfig.mfeHandlers` (optional). No handlers are registered by default -- applications must explicitly provide the handlers they need.

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
| tailwindcss | `false` | Styles must be initialized per Shadow DOM root |
| @hai3/uikit | `false` | Component styles must be initialized per Shadow DOM root |

#### Required Shared Dependencies for MFEs

Every MFE built with the default handler (`MfeHandlerMF`) MUST include the following in its Module Federation `shared` config:

| Dependency | singleton | Reason |
|-----------|-----------|--------|
| react | `false` | Instance isolation |
| react-dom | `false` | Instance isolation |
| tailwindcss | `false` | Styles initialized per Shadow DOM root |
| @hai3/uikit | `false` | Component styles initialized per Shadow DOM root |

Since MFEs mount inside Shadow DOM boundaries (enforced by `MfeHandlerMF`), host styles do NOT penetrate into MFE shadow roots. Each MFE must initialize its own styles inside its shadow root at mount time. See [Principles - Shadow DOM Style Isolation](./principles.md#shadow-dom-style-isolation-default-handler) for the canonical description.

#### Shadow DOM Mount Flow (Default Handler)

Shadow DOM isolation for the default handler is defined in [Principles - Shadow DOM Style Isolation](./principles.md#shadow-dom-style-isolation-default-handler). The key loading-specific detail: Shadow DOM creation is performed by `DefaultMountManager` (internal to the registry), NOT by `MfeHandlerMF.load()`. The handler only loads the bundle; the mount manager handles DOM isolation. This separation means custom handlers can override loading behavior without affecting the mount isolation strategy.

#### Loading Algorithm

All loading logic is internal to `MfeHandlerMF`. The `MfeHandlerMF.load(entry)` method performs manifest resolution, container loading, and module factory extraction. `ManifestCache` is a private helper class inside `mf-handler.ts` (see Decision 12 below). Configuration: `timeout` (default 30000ms), `retries` (default 2). **Note**: Retry logic is already implemented via `RetryHandler` (in `packages/screensets/src/mfe/errors/error-handler.ts`) and is wired into `MfeHandlerMF.load()` from prior phases. Phase 34 does not need to re-implement retry; the existing `RetryHandler` handles transient load failures with the configured retry count and timeout.

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
  private readonly containers = new Map<string, ModuleFederationContainer>();

  /** Cache a manifest for reuse */
  cacheManifest(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  /** Get a cached manifest by ID */
  getManifest(manifestId: string): MfManifest | undefined {
    return this.manifests.get(manifestId);
  }

  /** Cache a loaded container */
  cacheContainer(remoteName: string, container: ModuleFederationContainer): void {
    this.containers.set(remoteName, container);
  }

  /** Get a cached container */
  getContainer(remoteName: string): ModuleFederationContainer | undefined {
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
  id: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.analytics.screens.dashboard.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields from derived ScreenExtension type (no uiMeta wrapper)
  presentation: { label: 'Analytics Dashboard', route: '/analytics', icon: 'lucide:chart-bar', order: 50 },
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

### Multi-Entry mfe.json Format

When an MFE package contains multiple entries (e.g., a consolidated screenset with multiple screens), the `mfe.json` file uses a top-level structure with arrays for entries and extensions that all share a single manifest:

```json
{
  "manifest": {
    "id": "gts.hai3.mfes.mfe.mf_manifest.v1~acme.demo.mfe.manifest.v1",
    "remoteEntry": "http://localhost:3001/remoteEntry.js",
    "remoteName": "demoMfe",
    "sharedDependencies": [
      { "name": "react", "singleton": false },
      { "name": "react-dom", "singleton": false }
    ]
  },
  "entries": [
    {
      "id": "gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.demo.mfe.helloworld.v1",
      "manifest": "gts.hai3.mfes.mfe.mf_manifest.v1~acme.demo.mfe.manifest.v1",
      "exposedModule": "./lifecycle-helloworld",
      "requiredProperties": ["..."],
      "actions": [],
      "domainActions": ["..."]
    }
  ],
  "extensions": [
    {
      "id": "gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.demo.screens.helloworld.v1",
      "domain": "gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1",
      "entry": "gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.demo.mfe.helloworld.v1",
      "presentation": { "label": "Hello World", "icon": "lucide:globe", "route": "/hello-world", "order": 10 }
    }
  ]
}
```

The host bootstrap code imports this file and registers the single manifest, all entries, and all extensions with the registry. This follows the ONE SCREENSET = ONE MFE principle: a screenset with N screens becomes 1 MFE package with 1 manifest, N entries (each with its own `exposedModule`), and N extensions.
