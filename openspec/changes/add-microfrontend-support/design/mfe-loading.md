# Design: MFE Loading and Error Handling

This document covers Module Federation 2.0 bundle loading, error class hierarchy, and manifest fetching strategies.

**Related Documents:**
- [Type System](./type-system.md) - Type System Plugin interface, GTS types, contract validation
- [Registry and Runtime](./registry-runtime.md) - Runtime isolation, action mediation, bridges

---

## Decisions

### Decision 12: Module Federation 2.0 for Bundle Loading

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
   - This reduces total download size and improves load times

2. **Runtime Instance Control** (Isolation vs Sharing)
   - The `singleton` flag controls whether consumers share the same instance
   - `singleton: false` (DEFAULT): Each consumer gets its OWN instance from the shared code
   - `singleton: true`: All consumers share the SAME instance

**Key Insight**: These benefits are NOT mutually exclusive. With `singleton: false`, you get BOTH:
- Code is shared (bundle optimization)
- Instances are isolated (runtime isolation)

#### Why `singleton: false` is the Correct Default

HAI3's architecture requires runtime isolation between MFEs. Setting `singleton: false` ensures:

1. **React State Isolation**: Each MFE has its own React context, hooks state, and reconciler
2. **TypeSystemPlugin Isolation**: Each MFE's schema registry is isolated (security requirement)
3. **@hai3/screensets Isolation**: Each MFE has its own state container

Without this isolation, MFEs could:
- Corrupt each other's React state
- Discover host schemas via `plugin.query('gts.*')` (security violation)
- Interfere with each other's state management

#### When `singleton: true` is Safe

Only use `singleton: true` for libraries that are **truly stateless**:

| Library | singleton | Reason |
|---------|-----------|--------|
| lodash | `true` | Pure functions, no internal state |
| date-fns | `true` | Pure functions, no internal state |
| uuid | `true` | Pure functions, no internal state |
| React | `false` | Has hooks state, context, reconciler |
| ReactDOM | `false` | Has fiber tree, event system |
| @hai3/* | `false` | Has TypeSystemPlugin, schema registry |
| GTS | `false` | Has schema registry |
| Redux/Zustand | `false` | Has store state |

#### Performance vs Isolation Trade-offs

| Configuration | Bundle Size | Memory | Isolation |
|--------------|-------------|--------|-----------|
| Not in `shared` | Duplicated | Duplicated | Full |
| `shared` + `singleton: false` | Shared | Duplicated | Full |
| `shared` + `singleton: true` | Shared | Shared | None |

**HAI3 Recommendation**: Use `singleton: false` for all stateful libraries. The memory overhead of duplicate instances is negligible compared to the complexity of debugging shared state issues across MFE boundaries.

**MfeLoader (Internal Implementation Detail):**

Note: `MfeLoader` and its return types are **internal implementation details** of the ScreensetsRegistry. The public API is `ScreensetsRegistry.mountExtension()` which handles loading and mounting internally. This documentation is provided for implementers only.

The internal MfeLoader uses the `MfeEntryMF` derived type which references an `MfManifest`:

```typescript
// packages/screensets/src/mfe/loader/index.ts (INTERNAL)

/** @internal */
interface MfeLoaderConfig {
  /** Timeout for bundle loading in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts on load failure (default: 2) */
  retries?: number;
  /** Enable preloading of known MFEs */
  preload?: boolean;
}

/**
 * Lifecycle interface for MFE entries (PUBLIC).
 * Defines lifecycle methods that any MFE entry must implement,
 * regardless of framework (React, Vue, Angular, Vanilla JS).
 *
 * The name "MfeEntryLifecycle" is chosen because:
 * - It focuses on lifecycle semantics (mount/unmount)
 * - It's extensible for future lifecycle methods (onSuspend, onResume, etc.)
 * - It doesn't include implementation details like "Export" or "Module" in the name
 *
 * Example implementations:
 * - React MFE: Uses ReactDOM.createRoot(container).render(<App bridge={bridge} />)
 * - Vue MFE: Uses createApp(App, { bridge }).mount(container)
 * - Angular MFE: Uses platformBrowserDynamic().bootstrapModule(...)
 * - Svelte MFE: Uses new App({ target: container, props: { bridge } })
 * - Vanilla JS: Directly manipulates DOM
 */
interface MfeEntryLifecycle {
  /**
   * Mount the MFE into a container element.
   * @param container - The DOM element to mount into
   * @param bridge - The MfeBridge for host-MFE communication
   */
  mount(container: HTMLElement, bridge: MfeBridge): void;

  /**
   * Unmount the MFE from a container element.
   * Called when the extension is unloaded or the container is removed.
   * @param container - The DOM element to unmount from
   */
  unmount(container: HTMLElement): void;
}

/**
 * @internal - Not part of public API
 * Result of loading an MFE bundle internally
 */
interface LoadedMfeInternal {
  /** The loaded MFE lifecycle interface */
  lifecycle: MfeEntryLifecycle;
  /** The entry that was loaded (Module Federation variant) */
  entry: MfeEntryMF;
  /** The manifest used for loading */
  manifest: MfManifest;
  /** Cleanup function to unload the MFE */
  unload: () => void;
}

/**
 * @internal - Not part of public API
 * MFE Loader using Module Federation 2.0
 */
class MfeLoader {
  /** GTS Type ID for Module Federation MFE entries */
  private static readonly MF_ENTRY_TYPE_ID =
    'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~';

  /** GTS Type ID for Module Federation manifests */
  private static readonly MF_MANIFEST_TYPE_ID =
    'gts.hai3.screensets.mfe.mf.v1~';

  // Cache of loaded manifests by type ID
  private loadedManifests = new Map<string, MfManifest>();
  // Cache of loaded containers by remoteName
  private loadedContainers = new Map<string, Container>();

  constructor(
    private typeSystem: TypeSystemPlugin,
    private config: MfeLoaderConfig = {}
  ) {}

  /**
   * @internal
   * Load an MFE from its MfeEntryMF definition
   */
  async load(entry: MfeEntryMF): Promise<LoadedMfeInternal> {
    // 1. Validate entry against Module Federation entry schema
    const entryValidation = this.typeSystem.validateInstance(
      MfeLoader.MF_ENTRY_TYPE_ID,
      entry
    );
    if (!entryValidation.valid) {
      throw new MfeLoadError('Invalid MfeEntryMF', entryValidation.errors);
    }

    // 2. Resolve and validate manifest
    const manifest = await this.resolveManifest(entry.manifest);

    // 3. Load remote container (cached per remoteName)
    const container = await this.loadRemoteContainer(manifest);

    // 4. Get the exposed module using entry.exposedModule
    const moduleFactory = await container.get(entry.exposedModule);
    if (!moduleFactory) {
      throw new MfeLoadError(
        `Module '${entry.exposedModule}' not found in container '${manifest.remoteName}'`,
        []
      );
    }
    const loadedModule = moduleFactory();

    // 5. Validate the module exports the required MfeEntryLifecycle interface (mount/unmount)
    if (typeof loadedModule.mount !== 'function' || typeof loadedModule.unmount !== 'function') {
      throw new MfeLoadError(
        `Module '${entry.exposedModule}' must implement MfeEntryLifecycle interface with mount(container, bridge) and unmount(container) functions`,
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

  private async resolveManifest(manifestTypeId: string): Promise<MfManifest> {
    if (this.loadedManifests.has(manifestTypeId)) {
      return this.loadedManifests.get(manifestTypeId)!;
    }

    const manifest = await this.fetchManifestInstance(manifestTypeId);

    const validation = this.typeSystem.validateInstance(
      MfeLoader.MF_MANIFEST_TYPE_ID,
      manifest
    );
    if (!validation.valid) {
      throw new MfeLoadError('Invalid MfManifest', validation.errors);
    }

    this.loadedManifests.set(manifestTypeId, manifest);
    return manifest;
  }

  private async loadRemoteContainer(manifest: MfManifest): Promise<Container> {
    if (this.loadedContainers.has(manifest.remoteName)) {
      return this.loadedContainers.get(manifest.remoteName)!;
    }

    await this.loadScript(manifest.remoteEntry);

    const container = (window as any)[manifest.remoteName];
    if (!container) {
      throw new MfeLoadError(
        `Container '${manifest.remoteName}' not found after loading ${manifest.remoteEntry}`,
        []
      );
    }

    await container.init(__webpack_share_scopes__.default);

    this.loadedContainers.set(manifest.remoteName, container);
    return container;
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

  private async loadScript(url: string): Promise<void> {
    // Script loading with timeout and error handling
  }

  private unloadIfUnused(remoteName: string): void {
    // Cleanup logic
  }

  private async fetchManifestInstance(manifestTypeId: string): Promise<MfManifest> {
    // Fetch manifest from registry or remote endpoint
    throw new Error('Not implemented');
  }
}
```

**Example MfManifest Instance:**

```typescript
const analyticsManifest: MfManifest = {
  id: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics.mfe.manifest.v1',
  remoteEntry: 'https://cdn.acme.com/analytics/remoteEntry.js',
  remoteName: 'acme_analytics',
  // sharedDependencies configures Module Federation code sharing.
  // Two benefits are controlled independently:
  // 1. Code sharing (always) - download once, cache it
  // 2. Instance sharing (singleton flag) - share instance or isolate
  sharedDependencies: [
    // React/ReactDOM: Code shared for bundle optimization, but singleton: false
    // ensures each MFE gets its own React instance (isolation preserved)
    { name: 'react', requiredVersion: '^18.0.0', singleton: false },
    { name: 'react-dom', requiredVersion: '^18.0.0', singleton: false },
    // Stateless utilities: singleton: true is safe (no state to isolate)
    { name: 'lodash', requiredVersion: '^4.17.0', singleton: true },
    { name: 'date-fns', requiredVersion: '^2.30.0', singleton: true },
    // @hai3/* packages: Must use singleton: false for runtime isolation
    // Or omit entirely if this MFE doesn't need to share code with host
    // { name: '@hai3/screensets', requiredVersion: '^1.0.0', singleton: false },
  ],
  entries: [
    'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.metrics.v1',
  ],
};
```

**Example MfeEntryMF Instance:**

```typescript
const chartEntry: MfeEntryMF = {
  id: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  requiredProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.user_context.v1',
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.selected_date_range.v1',
  ],
  optionalProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.theme.v1',
  ],
  actions: ['gts.hai3.screensets.ext.action.v1~acme.analytics.ext.data_updated.v1~'],
  domainActions: ['gts.hai3.screensets.ext.action.v1~acme.analytics.ext.refresh.v1~'],
  manifest: 'gts.hai3.screensets.mfe.mf.v1~acme.analytics.mfe.manifest.v1',
  exposedModule: './ChartWidget',
};
```

### Decision 16: Error Class Hierarchy

The MFE system defines a hierarchy of error classes for specific failure scenarios.

#### Error Classes

```typescript
// packages/screensets/src/mfe/errors/index.ts

/**
 * Base error class for all MFE errors
 */
class MfeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MfeError';
  }
}

/**
 * Error thrown when MFE bundle fails to load
 */
class MfeLoadError extends MfeError {
  constructor(
    message: string,
    public readonly entryTypeId: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load MFE '${entryTypeId}': ${message}`, 'MFE_LOAD_ERROR');
    this.name = 'MfeLoadError';
  }
}

/**
 * Error thrown when contract validation fails
 */
class ContractValidationError extends MfeError {
  constructor(
    public readonly errors: ContractError[],
    public readonly entryTypeId?: string,
    public readonly domainTypeId?: string
  ) {
    const details = errors.map(e => `  - ${e.type}: ${e.details}`).join('\n');
    super(
      `Contract validation failed:\n${details}`,
      'CONTRACT_VALIDATION_ERROR'
    );
    this.name = 'ContractValidationError';
  }
}

/**
 * Error thrown when uiMeta validation fails
 */
class UiMetaValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string,
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `uiMeta validation failed for extension '${extensionTypeId}' against domain '${domainTypeId}':\n${details}`,
      'UI_META_VALIDATION_ERROR'
    );
    this.name = 'UiMetaValidationError';
  }
}

/**
 * Error thrown when actions chain execution fails
 */
class ChainExecutionError extends MfeError {
  constructor(
    message: string,
    public readonly chain: ActionsChain,
    public readonly failedAction: Action,
    public readonly executedPath: string[],
    public readonly cause?: Error
  ) {
    super(
      `Actions chain execution failed at '${failedAction.type}': ${message}`,
      'CHAIN_EXECUTION_ERROR'
    );
    this.name = 'ChainExecutionError';
  }
}

/**
 * Error thrown when shared dependency version validation fails
 */
class MfeVersionMismatchError extends MfeError {
  constructor(
    public readonly manifestTypeId: string,
    public readonly dependency: string,
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(
      `Version mismatch for '${dependency}' in MFE '${manifestTypeId}': expected ${expected}, got ${actual}`,
      'MFE_VERSION_MISMATCH_ERROR'
    );
    this.name = 'MfeVersionMismatchError';
  }
}

/**
 * Error thrown when type conformance check fails
 */
class MfeTypeConformanceError extends MfeError {
  constructor(
    public readonly typeId: string,
    public readonly expectedBaseType: string
  ) {
    super(
      `Type '${typeId}' does not conform to base type '${expectedBaseType}'`,
      'MFE_TYPE_CONFORMANCE_ERROR'
    );
    this.name = 'MfeTypeConformanceError';
  }
}

/**
 * Error thrown when domain validation fails
 */
class DomainValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Domain validation failed for '${domainTypeId}':\n${details}`,
      'DOMAIN_VALIDATION_ERROR'
    );
    this.name = 'DomainValidationError';
  }
}

/**
 * Error thrown when extension validation fails
 */
class ExtensionValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Extension validation failed for '${extensionTypeId}':\n${details}`,
      'EXTENSION_VALIDATION_ERROR'
    );
    this.name = 'ExtensionValidationError';
  }
}

export {
  MfeError,
  MfeLoadError,
  ContractValidationError,
  UiMetaValidationError,
  ChainExecutionError,
  MfeVersionMismatchError,
  MfeTypeConformanceError,
  DomainValidationError,
  ExtensionValidationError,
};
```

### Decision 18: Manifest Fetching Strategy

The MfeLoader requires a strategy for fetching MfManifest instances from their type IDs.

#### Manifest Fetching Design

```typescript
// packages/screensets/src/mfe/loader/manifest-fetcher.ts

/**
 * Strategy for fetching MfManifest instances
 */
interface ManifestFetcher {
  /**
   * Fetch a manifest by its type ID
   * @param manifestTypeId - GTS type ID for the MfManifest
   * @returns The manifest instance
   */
  fetch(manifestTypeId: string): Promise<MfManifest>;
}

/**
 * URL-based manifest fetcher - fetches manifest JSON from a URL pattern
 */
class UrlManifestFetcher implements ManifestFetcher {
  constructor(
    private readonly urlResolver: (manifestTypeId: string) => string,
    private readonly fetchOptions?: RequestInit
  ) {}

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const url = this.urlResolver(manifestTypeId);
    const response = await fetch(url, this.fetchOptions);

    if (!response.ok) {
      throw new MfeLoadError(
        `Failed to fetch manifest: ${response.status} ${response.statusText}`,
        manifestTypeId
      );
    }

    const manifest = await response.json();
    return manifest as MfManifest;
  }
}

/**
 * Registry-based manifest fetcher - looks up manifests from a pre-registered map
 */
class RegistryManifestFetcher implements ManifestFetcher {
  private readonly manifests = new Map<string, MfManifest>();

  register(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const manifest = this.manifests.get(manifestTypeId);
    if (!manifest) {
      throw new MfeLoadError(
        `Manifest not found in registry`,
        manifestTypeId
      );
    }
    return manifest;
  }
}

/**
 * Composite fetcher - tries multiple strategies in order
 */
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
    throw new MfeLoadError(
      `Manifest not found by any fetcher`,
      manifestTypeId
    );
  }
}

/**
 * MfeLoader configuration with manifest fetching
 */
interface MfeLoaderConfig {
  /** Timeout for bundle loading in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts on load failure (default: 2) */
  retries?: number;
  /** Enable preloading of known MFEs */
  preload?: boolean;
  /** Strategy for fetching manifests */
  manifestFetcher: ManifestFetcher;
}
```

#### Usage Example

```typescript
// Configure loader with URL-based fetching
const loader = new MfeLoader(typeSystem, {
  manifestFetcher: new UrlManifestFetcher(
    (typeId) => `https://mfe-registry.example.com/manifests/${encodeURIComponent(typeId)}.json`
  ),
});

// Or with pre-registered manifests
const registryFetcher = new RegistryManifestFetcher();
registryFetcher.register(analyticsManifest);
registryFetcher.register(billingManifest);

const loader = new MfeLoader(typeSystem, {
  manifestFetcher: registryFetcher,
});

// Or composite strategy (try registry first, then URL)
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
| Hierarchical domain complexity | Clear documentation, example implementations |
| Actions chain timeout | Configurable timeouts with fallback support |
| Manifest discovery | Multiple fetching strategies (registry, URL, composite) |
| Dynamic registration race conditions | Sequential registration with async/await, event-based coordination |
| Backend provider latency | Local caching, optimistic updates, loading states |

## Testing Strategy

1. **Unit Tests**: Plugin interface, contract validation, type validation, bridge communication
2. **Integration Tests**: MFE loading, domain registration, action chain execution, Shadow DOM isolation
3. **E2E Tests**: Full MFE lifecycle with real Module Federation bundles
