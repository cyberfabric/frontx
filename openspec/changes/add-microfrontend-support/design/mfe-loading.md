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

**MfeBridgeFactory**: An abstract factory that creates bridge instances for MFEs. Each handler has an associated bridge factory.

**MfeLoader**: An internal implementation component that loads MFE bundles using Module Federation 2.0.

**ManifestFetcher**: A strategy interface for resolving MfManifest instances from their type IDs.

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
    |   (thin, stable)                          |   handledBaseTypeId: ~hai3.screensets.mfe.entry_mf.*
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
abstract class MfeHandler<TEntry extends MfeEntry = MfeEntry, TBridge extends MfeBridge = MfeBridge> {
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
  abstract load(entry: TEntry): Promise<MfeEntryLifecycle>;

  /**
   * Preload MFE bundles for faster mounting.
   */
  abstract preload(entries: TEntry[]): Promise<void>;
}
```

#### MfeBridgeFactory Abstract Class

```typescript
// packages/screensets/src/mfe/bridge/factory.ts

/**
 * Abstract factory for creating MFE bridges.
 * Companies can implement rich factories with shared services.
 */
abstract class MfeBridgeFactory<TBridge extends MfeBridge = MfeBridge> {
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
 * Default bridge factory - creates minimal MfeBridge instances.
 */
class MfeBridgeFactoryDefault extends MfeBridgeFactory<MfeBridge> {
  create(domainId: string, entryTypeId: string, instanceId: string): MfeBridge {
    return new MfeBridgeImpl(domainId, entryTypeId, instanceId);
  }

  dispose(bridge: MfeBridge): void {
    (bridge as MfeBridgeImpl).cleanup();
  }
}
```

#### Type ID Matching in Handlers

Each handler's `canHandle()` method (inherited from base class) uses the type system to determine if it can handle an entry:

```typescript
// HAI3's default MF handler - handles MfeEntryMF
class MfeHandlerMF extends MfeHandler<MfeEntryMF, MfeBridge> {
  readonly bridgeFactory = new MfeBridgeFactoryDefault();

  constructor(typeSystem: TypeSystemPlugin) {
    // Pass the base type ID this handler handles
    super(typeSystem, 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~');
  }

  // canHandle() inherited from base class uses:
  // this.typeSystem.isTypeOf(entryTypeId, this.handledBaseTypeId)

  async load(entry: MfeEntryMF): Promise<MfeEntryLifecycle> {
    // Module Federation loading logic
    const manifest = await this.resolveManifest(entry.manifest);
    const container = await this.loadRemoteContainer(manifest);
    const moduleFactory = await container.get(entry.exposedModule);
    return moduleFactory();
  }

  async preload(entries: MfeEntryMF[]): Promise<void> {
    // Preload manifests and containers
  }
}

// Company's custom handler - handles MfeEntryAcme with rich bridges
class MfeHandlerAcme extends MfeHandler<MfeEntryAcme, MfeBridgeAcme> {
  readonly bridgeFactory: MfeBridgeFactoryAcme;

  constructor(typeSystem: TypeSystemPlugin, router: Router, apiClient: ApiClient) {
    super(typeSystem, 'gts.hai3.screensets.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~', 100);
    this.bridgeFactory = new MfeBridgeFactoryAcme(router, apiClient);
  }

  async load(entry: MfeEntryAcme): Promise<MfeEntryLifecycle> {
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
  async load(entry: MfeEntry): Promise<MfeEntryLifecycle> {
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

HAI3's default handler (`MfeHandlerMF`) enforces runtime isolation between MFE **instances**. This is achieved through `singleton: false` in Module Federation configuration:

1. **React State Isolation**: Each MFE instance has its own React context, hooks state, and reconciler
2. **TypeSystemPlugin Isolation**: Each MFE instance's schema registry is isolated (security requirement for 3rd-party MFEs)
3. **@hai3/screensets Isolation**: Each MFE instance has its own state container

**Custom handlers** can choose to use `singleton: true` for internal MFE instances when isolation is not required, allowing shared state for coordination between trusted MFEs.

**Isolation Recommendations:**

| MFE Source | Isolation Strategy | Reason |
|------------|-------------------|--------|
| 3rd-party/vendor MFEs | Always `singleton: false` | Security - untrusted code must not share state |
| Internal MFEs (custom handler) | Handler's choice | Trusted code can share if beneficial |

#### When `singleton: true` is Safe

| Library | singleton | Reason |
|---------|-----------|--------|
| lodash | `true` | Pure functions, no internal state |
| date-fns | `true` | Pure functions, no internal state |
| React | `false` | Has hooks state, context, reconciler |
| ReactDOM | `false` | Has fiber tree, event system |
| @hai3/* | `false` | Has TypeSystemPlugin, schema registry |

#### MfeLoader (Internal Implementation Detail)

```typescript
// packages/screensets/src/mfe/loader/index.ts (INTERNAL)

/** @internal */
interface MfeLoaderConfig {
  timeout?: number;   // default: 30000
  retries?: number;   // default: 2
  preload?: boolean;
}

interface MfeEntryLifecycle {
  mount(container: HTMLElement, bridge: MfeBridge): void;
  unmount(container: HTMLElement): void;
}

/** @internal */
interface LoadedMfeInternal {
  lifecycle: MfeEntryLifecycle;
  entry: MfeEntryMF;
  manifest: MfManifest;
  unload: () => void;
}

/** @internal */
class MfeLoader {
  private loadedManifests = new Map<string, MfManifest>();
  private loadedContainers = new Map<string, Container>();

  constructor(
    private typeSystem: TypeSystemPlugin,
    private config: MfeLoaderConfig = {}
  ) {}

  async load(entry: MfeEntryMF): Promise<LoadedMfeInternal> {
    // 1. Validate entry against Module Federation entry schema
    // 2. Resolve and validate manifest
    // 3. Load remote container (cached per remoteName)
    // 4. Get the exposed module using entry.exposedModule
    // 5. Validate the module exports mount/unmount functions
    const manifest = await this.resolveManifest(entry.manifest);
    const container = await this.loadRemoteContainer(manifest);
    const moduleFactory = await container.get(entry.exposedModule);
    const loadedModule = moduleFactory();

    if (typeof loadedModule.mount !== 'function' || typeof loadedModule.unmount !== 'function') {
      throw new MfeLoadError(
        `Module '${entry.exposedModule}' must implement MfeEntryLifecycle interface`,
        []
      );
    }

    return {
      lifecycle: loadedModule as MfeEntryLifecycle,
      entry,
      manifest,
      unload: () => this.unloadIfUnused(manifest.remoteName),
    };
  }

  async preload(entries: MfeEntryMF[]): Promise<void> {
    const byManifest = new Map<string, MfeEntryMF[]>();
    for (const entry of entries) {
      const existing = byManifest.get(entry.manifest) || [];
      existing.push(entry);
      byManifest.set(entry.manifest, existing);
    }

    await Promise.allSettled(
      Array.from(byManifest.keys()).map(async (manifestId) => {
        const manifest = await this.resolveManifest(manifestId);
        await this.loadRemoteContainer(manifest);
      })
    );
  }

  private async resolveManifest(manifestTypeId: string): Promise<MfManifest>;
  private async loadRemoteContainer(manifest: MfManifest): Promise<Container>;
  private async loadScript(url: string): Promise<void>;
  private unloadIfUnused(remoteName: string): void;
}
```

### Decision 12: Manifest Fetching Strategy

The MfeLoader requires a strategy for fetching MfManifest instances from their type IDs.

#### Manifest Fetching Design

```typescript
// packages/screensets/src/mfe/loader/manifest-fetcher.ts

interface ManifestFetcher {
  fetch(manifestTypeId: string): Promise<MfManifest>;
}

class UrlManifestFetcher implements ManifestFetcher {
  constructor(
    private readonly urlResolver: (manifestTypeId: string) => string,
    private readonly fetchOptions?: RequestInit
  ) {}

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const url = this.urlResolver(manifestTypeId);
    const response = await fetch(url, this.fetchOptions);
    if (!response.ok) {
      throw new MfeLoadError(`Failed to fetch manifest: ${response.status}`, manifestTypeId);
    }
    return response.json();
  }
}

class RegistryManifestFetcher implements ManifestFetcher {
  private readonly manifests = new Map<string, MfManifest>();

  register(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const manifest = this.manifests.get(manifestTypeId);
    if (!manifest) {
      throw new MfeLoadError(`Manifest not found in registry`, manifestTypeId);
    }
    return manifest;
  }
}

class CompositeManifestFetcher implements ManifestFetcher {
  constructor(private readonly fetchers: ManifestFetcher[]) {}

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    for (const fetcher of this.fetchers) {
      try {
        return await fetcher.fetch(manifestTypeId);
      } catch {
        continue;
      }
    }
    throw new MfeLoadError(`Manifest not found by any fetcher`, manifestTypeId);
  }
}
```

#### Usage Example

```typescript
// URL-based fetching
const loader = new MfeLoader(typeSystem, {
  manifestFetcher: new UrlManifestFetcher(
    (typeId) => `https://mfe-registry.example.com/manifests/${encodeURIComponent(typeId)}.json`
  ),
});

// Pre-registered manifests
const registryFetcher = new RegistryManifestFetcher();
registryFetcher.register(analyticsManifest);

// Composite strategy (try registry first, then URL)
const loader = new MfeLoader(typeSystem, {
  manifestFetcher: new CompositeManifestFetcher([
    registryFetcher,
    new UrlManifestFetcher((typeId) => `https://cdn.example.com/manifests/${typeId}.json`),
  ]),
});
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Type System plugin complexity | Provide comprehensive GTS plugin as reference implementation |
| Contract validation overhead | Cache validation results, validate once at registration |
| Module Federation bundle size | Tree-shaking, shared dependencies, lazy loading |
| Manifest discovery | Multiple fetching strategies (registry, URL, composite) |
| Dynamic registration race conditions | Sequential registration with async/await, event-based coordination |

## Testing Strategy

1. **Unit Tests**: Plugin interface, contract validation, type validation, bridge communication
2. **Integration Tests**: MFE loading, domain registration, action chain execution, Shadow DOM isolation
3. **E2E Tests**: Full MFE lifecycle with real Module Federation bundles
