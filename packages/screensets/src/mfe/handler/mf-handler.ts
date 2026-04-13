/**
 * Module Federation MFE Handler Implementation
 *
 * Achieves per-runtime isolation by blob-URL'ing the entire module dependency
 * chain for each load() call. Each screen/extension load gets fresh evaluations
 * of the federation runtime (fresh moduleCache), code-split chunks, and shared
 * dependencies — no module instances are shared between runtimes.
 *
 * Manifest-based loading:
 * - baseUrl is derived from manifest.metaData.publicPath
 * - expose chunk filename comes from entry.exposeAssets.js.sync[0]
 * - CSS paths come from entry.exposeAssets.css.sync/async
 * - shared dep chunk paths come from manifest.shared[].chunkPath (GTS manifest)
 * No remoteEntry.js regex parsing is required.
 *
 * MF 2.0 FederationHost instance (Phase 7+):
 * - MF 2.0 `__loadShare__` proxy chunks await globalThis[mfInitKey].initPromise
 *   to obtain a FederationHost instance, then call instance.loadShare(pkgName).
 * - The handler creates a real per-load FederationHost via createInstance() from
 *   @module-federation/runtime, configured with blob-URL get() factories per dep.
 * - The instance is resolved on globalThis[manifest.mfInitKey] BEFORE importing
 *   the expose blob URL, ensuring shared dependencies resolve correctly.
 * - mfInitKey is extracted from remoteEntry.js at build time by frontx-mf-gts.
 * - globalThis.__federation_shared__ is never written to — MF 2.0 never reads it.
 *
 * @packageDocumentation
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-blob-core:p1

import { createInstance } from '@module-federation/runtime';
import type { ModuleFederation } from '@module-federation/runtime';
import type { MfeEntryMF, MfManifest, MfManifestShared } from '../types';
import {
  MfeHandler,
  ChildMfeBridge,
  MfeEntryLifecycle,
} from './types';
import { MfeLoadError } from '../errors';
import { RetryHandler } from '../errors/error-handler';
import { MfeBridgeFactoryDefault } from './mfe-bridge-factory-default';

const RUNTIME_STYLE_ID_PREFIX = '__hai3-mfe-runtime-style-';

/**
 * Per-load shared state for blob URL chain creation.
 *
 * Shared across all blob URL chains within a single load() call so that
 * common transitive dependencies (e.g., the bundled React CJS module) are
 * blob-URL'd once and reused by all modules within the same load.
 */
// @cpt-state:cpt-frontx-state-mfe-isolation-load-blob-state:p1
interface LoadBlobState {
  readonly blobUrlMap: Map<string, string>;
  readonly inFlight: Map<string, Promise<void>>;
  readonly baseUrl: string;
  /** MFE entry ID for this load; used in error messages. */
  readonly entryId: string;
}

/**
 * Shape of the `__mf_init__` global that MF 2.0 proxy chunks read.
 *
 * The handler writes `{ initPromise: Promise.resolve(instance) }` to this
 * global before importing the expose blob URL. The proxy chunks await this
 * promise and call `instance.loadShare(pkgName)` to obtain shared modules.
 */
interface MfInitGlobal {
  initPromise: Promise<ModuleFederation>;
  /** Optional resolver for when remoteEntry.js pre-created this global. */
  initResolve?: (instance: ModuleFederation) => void;
}

/**
 * Internal cache for Module Federation manifests.
 */
class ManifestCache {
  private readonly manifests = new Map<string, MfManifest>();

  cacheManifest(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  getManifest(manifestId: string): MfManifest | undefined {
    return this.manifests.get(manifestId);
  }
}

/**
 * Configuration for MFE loading behavior.
 */
interface MfeLoaderConfig {
  timeout?: number;
  retries?: number;
}

/**
 * Module Federation handler for loading MFE bundles.
 *
 * For each load() call:
 *  1. Resolves the MfManifest (validates metaData.publicPath and shared[])
 *  2. Derives baseUrl from manifest.metaData.publicPath
 *  3. Reads the expose chunk filename from entry.exposeAssets.js.sync[0]
 *  4. Builds a shareScope with per-load blob URL get() functions for each
 *     shared dep that has a bundled sync chunk
 *  5. Creates a blob URL chain for the expose chunk and all its static deps
 *     (fresh moduleCache per load — no shared evaluation state between loads)
 *  6. All blob URLs share a per-load map so common transitive deps are
 *     evaluated once within the same load
 */
class MfeHandlerMF extends MfeHandler<MfeEntryMF, ChildMfeBridge> {
  readonly bridgeFactory: MfeBridgeFactoryDefault;
  private readonly manifestCache: ManifestCache;
  private readonly config: MfeLoaderConfig;
  private readonly retryHandler: RetryHandler;
  // @cpt-state:cpt-frontx-state-mfe-isolation-source-cache:p1
  private readonly sourceTextCache = new Map<string, Promise<string>>();

  /**
   * Canonical provider URLs for shared dependencies.
   *
   * Keyed by `packageName@version`. The first MFE to provide a shared dep
   * registers its base URL and chunk path as canonical. Subsequent MFEs
   * loading the same dep@version reuse the canonical provider's URL,
   * ensuring only one network fetch for each unique shared dep across all
   * MFE packages. Each evaluation still creates a fresh blob URL from the
   * cached source text — isolation is preserved.
   */
  // @cpt-state:cpt-frontx-state-mfe-isolation-shared-dep-providers:p1
  private readonly sharedDepProviders = new Map<string, { baseUrl: string; chunkPath: string }>();

  constructor(
    handledBaseTypeId: string,
    config: MfeLoaderConfig = {}
  ) {
    super(handledBaseTypeId, 0);
    this.bridgeFactory = new MfeBridgeFactoryDefault();
    this.manifestCache = new ManifestCache();
    this.retryHandler = new RetryHandler();
    this.config = {
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 2,
    };
  }

  /**
   * Load an MFE bundle using Module Federation.
   */
  // @cpt-flow:cpt-frontx-flow-mfe-isolation-load:p1
  async load(entry: MfeEntryMF): Promise<MfeEntryLifecycle<ChildMfeBridge>> {
    return this.retryHandler.retry(
      () => this.loadInternal(entry),
      this.config.retries ?? 0,
      1000
    );
  }

  /**
   * Internal load implementation.
   * Each call creates a fully isolated module evaluation chain via blob URLs.
   */
  private async loadInternal(entry: MfeEntryMF): Promise<MfeEntryLifecycle<ChildMfeBridge>> {
    const manifest = await this.resolveManifest(entry.manifest);
    this.manifestCache.cacheManifest(manifest);

    const { moduleFactory, stylesheetPaths, baseUrl } = await this.loadExposedModuleIsolated(
      manifest,
      entry.exposedModule,
      entry.exposeAssets,
      entry.id
    );

    const loadedModule = moduleFactory();

    if (!this.isValidLifecycleModule(loadedModule)) {
      throw new MfeLoadError(
        `Module '${entry.exposedModule}' must implement MfeEntryLifecycle interface (mount/unmount)`,
        entry.id
      );
    }

    return this.wrapLifecycleWithStylesheets(
      loadedModule,
      stylesheetPaths,
      baseUrl
    );
  }

  /**
   * Load an exposed module with full per-runtime isolation.
   *
   * Creates a per-load blob URL chain:
   *  - The expose chunk (from exposeAssets.js.sync[0]) and all its static deps
   *    are blob-URL'd (fresh moduleCache per load)
   *  - Shared dep chunks are blob-URL'd via get() closures that share the
   *    same per-load blobUrlMap (so React and ReactDOM get the same React)
   *  - Blob URLs are NOT revoked — modules with top-level await continue
   *    evaluating after import() resolves, and revoking during async evaluation
   *    causes ERR_FILE_NOT_FOUND. Blob URLs are cleaned up by the browser on
   *    page unload.
   *
   * baseUrl is derived from manifest.metaData.publicPath rather than parsing
   * remoteEntry.js — the publicPath field gives the exact chunk base URL.
   */
  private async loadExposedModuleIsolated(
    manifest: MfManifest,
    exposedModule: string,
    exposeAssets: MfeEntryMF['exposeAssets'],
    entryId: string
  ): Promise<{
    moduleFactory: () => unknown;
    stylesheetPaths: string[];
    baseUrl: string;
  }> {
    // publicPath is the authoritative base URL for all chunks in this MFE.
    // It may be an absolute URL (e.g. 'http://localhost:3001/') or a root-
    // relative path ('/') — both are valid for URL.resolve usage.
    const baseUrl = manifest.metaData.publicPath;

    const loadState: LoadBlobState = {
      blobUrlMap: new Map(),
      inFlight: new Map(),
      baseUrl,
      entryId,
    };

    // Create a real per-load FederationHost instance configured with blob-URL
    // get() factories for each shared dep. Proxy chunks call instance.loadShare()
    // to obtain isolated module instances.
    // @cpt-begin:cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise:p1:inst-1
    const instance = await this.createFederationInstance(manifest, loadState);

    // Resolve the __mf_init__ promise BEFORE importing the expose chunk.
    // __loadShare__ proxy chunks await this promise at module evaluation time;
    // if it is not resolved when the expose blob is imported, they deadlock.
    this.resolveMfInitPromise(manifest.mfInitKey, instance);
    // @cpt-end:cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise:p1:inst-1

    // Derive expose chunk filename directly from entry metadata — no regex needed.
    const exposeChunkFilename = exposeAssets.js.sync[0];
    if (!exposeChunkFilename) {
      throw new MfeLoadError(
        `Cannot resolve expose chunk for '${exposedModule}': exposeAssets.js.sync is empty`,
        entryId
      );
    }

    // Collect CSS paths from exposeAssets (sync injected at mount; async lazy).
    const stylesheetPaths = [
      ...exposeAssets.css.sync,
      ...exposeAssets.css.async,
    ];

    // Build blob URL chain for the expose chunk and all its static deps
    await this.createBlobUrlChain(loadState, exposeChunkFilename);

    const exposeBlobUrl = loadState.blobUrlMap.get(exposeChunkFilename);
    if (!exposeBlobUrl) {
      throw new MfeLoadError(
        `Failed to create blob URL for expose chunk '${exposeChunkFilename}'`,
        entryId
      );
    }

    const exposeModule = await import(/* @vite-ignore */ exposeBlobUrl);

    // Clean up the __mf_init__ global after evaluation completes.
    // The instance is no longer needed once the expose module has been evaluated.
    this.cleanupMfInitGlobal(manifest.mfInitKey);

    // The expose chunk is a Module Federation container module that exports the
    // lifecycle object as `default`. Fall back to the full module if default
    // is absent (non-MF ESM expose pattern).
    const moduleRecord = exposeModule as Record<string, unknown>;
    return {
      moduleFactory: () => moduleRecord['default'] ?? exposeModule,
      stylesheetPaths,
      baseUrl,
    };
  }

  private isValidLifecycleModule(
    module: unknown
  ): module is MfeEntryLifecycle<ChildMfeBridge> {
    if (typeof module !== 'object' || module === null) {
      return false;
    }
    const candidate = module as Record<string, unknown>;
    return (
      typeof candidate.mount === 'function' &&
      typeof candidate.unmount === 'function'
    );
  }

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-wrap-lifecycle-stylesheets:p1
  private wrapLifecycleWithStylesheets(
    lifecycle: MfeEntryLifecycle<ChildMfeBridge>,
    stylesheetPaths: string[],
    baseUrl: string
  ): MfeEntryLifecycle<ChildMfeBridge> {
    if (stylesheetPaths.length === 0) {
      return lifecycle;
    }

    return {
      mount: async (container, bridge) => {
        await this.injectRemoteStylesheets(container, stylesheetPaths, baseUrl);
        await lifecycle.mount(container, bridge);
      },
      unmount: async (container) => {
        this.removeInjectedStylesheets(container);
        await lifecycle.unmount(container);
      },
    };
  }

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-inject-remote-stylesheets:p1
  private async injectRemoteStylesheets(
    container: Element | ShadowRoot,
    stylesheetPaths: string[],
    baseUrl: string
  ): Promise<void> {
    stylesheetPaths.forEach((path, index) => {
      const targetId = `${RUNTIME_STYLE_ID_PREFIX}${index}`;
      this.upsertStyleElement(
        container,
        { href: new URL(path, baseUrl).href },
        targetId
      );
    });
  }

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-remove-injected-stylesheets:p1
  private removeInjectedStylesheets(container: Element | ShadowRoot): void {
    const injectedStyles = container.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      `link[id^="${RUNTIME_STYLE_ID_PREFIX}"], style[id^="${RUNTIME_STYLE_ID_PREFIX}"]`
    );
    injectedStyles.forEach((styleElement) => styleElement.remove());
  }

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-upsert-mount-style-element:p1
  private upsertStyleElement(
    container: Element | ShadowRoot,
    stylesheet: { css?: string; href?: string },
    id: string
  ): void {
    let styleElement: HTMLLinkElement | HTMLStyleElement | null = null;
    if ('getElementById' in container && typeof container.getElementById === 'function') {
      styleElement = container.getElementById(id) as HTMLLinkElement | HTMLStyleElement | null;
    } else if (container instanceof Element) {
      styleElement = container.querySelector(`[id="${id}"]`);
    }

    if (stylesheet.href) {
      if (!styleElement || styleElement.tagName !== 'LINK') {
        styleElement?.remove();
        const linkElement = document.createElement('link');
        linkElement.id = id;
        linkElement.rel = 'stylesheet';
        container.appendChild(linkElement);
        styleElement = linkElement;
      }

      const linkElement = styleElement as HTMLLinkElement;
      linkElement.href = stylesheet.href;
      return;
    }

    if (!styleElement || styleElement.tagName !== 'STYLE') {
      styleElement?.remove();
      const inlineStyleElement = document.createElement('style');
      inlineStyleElement.id = id;
      container.appendChild(inlineStyleElement);
      styleElement = inlineStyleElement;
    }

    styleElement.textContent = stylesheet.css ?? '';
  }

  /**
   * Resolve manifest from reference.
   *
   * Validates the GTS manifest shape: requires id, name, metaData
   * (with publicPath and remoteEntry), shared[], and mfInitKey.
   * mfInitKey is extracted at build time by the frontx-mf-gts plugin —
   * it must be present in every valid GTS manifest.
   */
  private async resolveManifest(manifestRef: string | MfManifest): Promise<MfManifest> {
    if (typeof manifestRef === 'object' && manifestRef !== null) {
      if (typeof manifestRef.id !== 'string') {
        throw new MfeLoadError(
          'Inline manifest must have a valid "id" field',
          'inline-manifest'
        );
      }
      if (
        typeof manifestRef.metaData !== 'object' ||
        manifestRef.metaData === null ||
        typeof manifestRef.metaData.publicPath !== 'string'
      ) {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a valid "metaData.publicPath" field`,
          manifestRef.id
        );
      }
      if (
        typeof manifestRef.metaData.remoteEntry !== 'object' ||
        manifestRef.metaData.remoteEntry === null ||
        typeof manifestRef.metaData.remoteEntry.name !== 'string'
      ) {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a valid "metaData.remoteEntry.name" field`,
          manifestRef.id
        );
      }
      if (!Array.isArray(manifestRef.shared)) {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a "shared" array`,
          manifestRef.id
        );
      }
      if (typeof manifestRef.mfInitKey !== 'string' || manifestRef.mfInitKey.length === 0) {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a non-empty "mfInitKey" field. ` +
            'Ensure the MFE was built with the FrontxMfGtsPlugin which extracts this key from remoteEntry.js.',
          manifestRef.id
        );
      }
      this.manifestCache.cacheManifest(manifestRef);
      return manifestRef;
    }

    if (typeof manifestRef === 'string') {
      const cached = this.manifestCache.getManifest(manifestRef);
      if (cached) {
        return cached;
      }
      throw new MfeLoadError(
        `Manifest '${manifestRef}' not found. Provide manifest inline in MfeEntryMF or ensure another entry from the same remote was loaded first.`,
        manifestRef
      );
    }

    throw new MfeLoadError(
      'Manifest reference must be a string (type ID) or MfManifest object',
      'invalid-manifest-ref'
    );
  }

  // ---- MF 2.0 FederationHost instance construction ----

  /**
   * Create a per-load FederationHost instance configured with blob-URL get()
   * factories for each shared dependency.
   *
   * Each load() call creates a fresh instance with a unique name so that
   * concurrent loads of the same MFE do not corrupt each other's module cache.
   * The get() factories use manifest.shared[].unwrapKey for explicit unwrapping —
   * no heuristic on export shape.
   *
   * Deps with chunkPath === null (no bundled chunk, peer-provided externals) are
   * excluded from the shared config; the __loadShare__ proxy's customShareInfo
   * fallback handles them independently.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-build-share-scope:p1
  private async createFederationInstance(
    manifest: MfManifest,
    loadState: LoadBlobState
  ): Promise<ModuleFederation> {
    // Unique name per load prevents different loads' module caches from merging.
    const instanceName = `${manifest.name}_load_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const shared: Record<string, {
      version: string;
      scope: string[];
      shareConfig: { requiredVersion: string; singleton: boolean };
      get: () => Promise<() => Record<string, unknown>>;
    }> = {};

    for (const dep of manifest.shared) {
      if (dep.chunkPath === null) {
        // No bundled chunk for this dep — skip; proxy's customShareInfo handles it.
        continue;
      }
      shared[dep.name] = this.buildSharedEntry(dep, loadState);
    }

    return createInstance({ name: instanceName, shared, remotes: [] });
  }

  /**
   * Build the shared entry config for a single dependency.
   *
   * The get() factory blob-URLs the chunk, imports it, and applies the
   * manifest-provided unwrapKey for deterministic module extraction —
   * no heuristic on export count or shape.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-build-share-scope:p2
  private buildSharedEntry(
    dep: MfManifestShared,
    loadState: LoadBlobState
  ): {
    version: string;
    scope: string[];
    shareConfig: { requiredVersion: string; singleton: boolean };
    get: () => Promise<() => Record<string, unknown>>;
  } {
    // chunkPath is guaranteed non-null by the caller.
    const chunkPath = dep.chunkPath as string;
    const unwrapKey = dep.unwrapKey;

    // @cpt-begin:cpt-frontx-algo-mfe-isolation-build-share-scope:p2:inst-resolve-canonical-provider
    // Register canonical provider for this shared dep (first-provider wins).
    // All MFEs loading the same dep@version will resolve to the same URL,
    // hitting the handler-level sourceTextCache. One download, N evaluations.
    const canonicalKey = `${dep.name}@${dep.version}`;
    if (!this.sharedDepProviders.has(canonicalKey)) {
      this.sharedDepProviders.set(canonicalKey, {
        baseUrl: loadState.baseUrl,
        chunkPath,
      });
    }
    const canonical = this.sharedDepProviders.get(canonicalKey)!;
    // @cpt-end:cpt-frontx-algo-mfe-isolation-build-share-scope:p2:inst-resolve-canonical-provider

    return {
      version: dep.version,
      scope: ['default'],
      shareConfig: {
        requiredVersion: dep.requiredVersion,
        singleton: false,
      },
      get: async (): Promise<() => Record<string, unknown>> => {
        // @cpt-begin:cpt-frontx-algo-mfe-isolation-blob-url-get:p1:inst-trigger-chain
        // Use the canonical provider's base URL for blob URL chain creation.
        // This ensures sourceTextCache hits for the same dep across all MFEs:
        // MFE A (first) fetches react from its server and caches the source text.
        // MFE B (second) resolves to MFE A's URL → cache hit → no network fetch.
        // Each get() call still creates a fresh blob URL → fresh evaluation → isolation.
        const depLoadState: LoadBlobState = {
          blobUrlMap: loadState.blobUrlMap,
          inFlight: loadState.inFlight,
          baseUrl: canonical.baseUrl,
          entryId: loadState.entryId,
        };

        await this.createBlobUrlChain(depLoadState, canonical.chunkPath);
        // @cpt-end:cpt-frontx-algo-mfe-isolation-blob-url-get:p1:inst-trigger-chain
        const blobUrl = loadState.blobUrlMap.get(canonical.chunkPath);
        if (!blobUrl) {
          throw new MfeLoadError(
            `Failed to create blob URL for shared dep '${dep.name}' (chunk: ${canonical.chunkPath})`,
            loadState.entryId
          );
        }
        const mod = await import(/* @vite-ignore */ blobUrl) as Record<string, unknown>;
        // unwrapKey is the named export that carries the actual module object.
        // It is extracted at build time from localSharedImportMap by frontx-mf-gts.
        const unwrapped: Record<string, unknown> =
          unwrapKey !== null && typeof mod[unwrapKey] === 'object' && mod[unwrapKey] !== null
            ? mod[unwrapKey] as Record<string, unknown>
            : mod;
        const wrapped = { ...unwrapped };
        Object.defineProperty(wrapped, '__esModule', { value: true, enumerable: false });
        return () => wrapped;
      },
    };
  }

  /**
   * Resolve the __mf_init__ promise with the per-load FederationHost instance.
   *
   * The key comes from manifest.mfInitKey (extracted from remoteEntry.js at
   * build time by the frontx-mf-gts plugin) — no runtime derivation needed.
   *
   * If the global was pre-created by remoteEntry.js with an initResolve callback,
   * we call it. Otherwise we create it with an already-resolved promise.
   * Either way, __loadShare__ proxy chunks that await initPromise will get the
   * real FederationHost instance with blob-URL'd get() factories.
   *
   * Concurrent loads of different MFEs are safe because each manifest has a
   * distinct mfInitKey. Concurrent loads of the same MFE write to the same key
   * but both instances are equivalent (each carries its own isolated blob URLs).
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise:p1
  private resolveMfInitPromise(mfInitKey: string, instance: ModuleFederation): void {
    const g = globalThis as Record<string, unknown>;
    const existing = g[mfInitKey] as MfInitGlobal | undefined;

    if (existing?.initResolve) {
      // remoteEntry.js created this global with a pending promise — resolve it.
      existing.initResolve(instance);
    } else {
      // Handler bypasses remoteEntry.js: create the global with a pre-resolved promise.
      g[mfInitKey] = { initPromise: Promise.resolve(instance) } satisfies MfInitGlobal;
    }
  }

  /**
   * Remove the __mf_init__ global after the expose module has been evaluated.
   *
   * The shim is only needed during the synchronous evaluation of the expose
   * chunk and its __loadShare__ proxy dependencies. Once evaluation completes,
   * keeping the global alive would prevent GC of the shim and its closure state.
   */
  private cleanupMfInitGlobal(mfInitKey: string): void {
    const g = globalThis as Record<string, unknown>;
    delete g[mfInitKey];
  }

  // ---- Blob URL chain creation ----

  /**
   * Recursively create blob URLs for a module and all its static dependencies.
   *
   * Processes dependencies depth-first so that when a module's imports are
   * rewritten, all its dependencies already have blob URLs in the shared map.
   * Common dependencies are processed once per load (shared blobUrlMap).
   *
   * Concurrent calls for the same filename are deduplicated via the inFlight
   * map — callers await the same promise rather than returning early with no
   * result. This prevents a race where sibling ESM modules with top-level
   * await trigger overlapping importShared() calls for the same dependency.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-blob-url-chain:p1
  private createBlobUrlChain(
    loadState: LoadBlobState,
    filename: string
  ): Promise<void> {
    if (loadState.blobUrlMap.has(filename)) {
      return Promise.resolve();
    }

    const existing = loadState.inFlight.get(filename);
    if (existing) {
      return existing;
    }

    const promise = this.createBlobUrlChainInternal(loadState, filename);
    loadState.inFlight.set(filename, promise);
    return promise;
  }

  private async createBlobUrlChainInternal(
    loadState: LoadBlobState,
    filename: string
  ): Promise<void> {
    const chunkUrl = loadState.baseUrl + filename;
    const source = await this.fetchSourceText(chunkUrl);
    const deps = this.parseStaticImportFilenames(source, filename);

    for (const dep of deps) {
      await this.createBlobUrlChain(loadState, dep);
    }

    let rewritten = this.rewriteModuleImports(
      source,
      loadState.baseUrl,
      loadState.blobUrlMap,
      filename
    );

    // Phase 19: Replace import.meta.url with the real chunk base URL string.
    // When a chunk is blob-URL'd, import.meta.url becomes a blob: URL, which
    // breaks new URL("../path", import.meta.url) — blob: URLs have no directory
    // component. Replacing with the HTTP base URL (directory of the chunk)
    // restores correct relative URL resolution (e.g. in preload-helper.js).
    // We target 'import.meta.url' specifically to leave import.meta.env intact.
    rewritten = this.rewriteImportMetaUrl(rewritten, chunkUrl);

    const blob = new Blob([rewritten], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    loadState.blobUrlMap.set(filename, blobUrl);
  }

  /**
   * Replace all `import.meta.url` references with the chunk's real base URL.
   *
   * The base URL is the directory containing the chunk (trailing slash included),
   * derived by stripping the filename from the full chunk URL. This is the URL
   * that relative `new URL("../x", import.meta.url)` calls should resolve against.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-rewrite-module-imports:p2
  private rewriteImportMetaUrl(source: string, chunkAbsoluteUrl: string): string {
    // Derive the directory containing this chunk by stripping the filename.
    // e.g. "http://localhost:3001/assets/preload-helper.js" → "http://localhost:3001/assets/"
    const lastSlash = chunkAbsoluteUrl.lastIndexOf('/');
    const chunkBaseUrl = lastSlash >= 0
      ? chunkAbsoluteUrl.slice(0, lastSlash + 1)
      : chunkAbsoluteUrl;

    // Use a regex replacement targeting the exact token 'import.meta.url'
    // (word-boundary anchored to avoid matching 'import.meta.url.something').
    // JSON.stringify ensures the URL is properly quoted and special chars escaped.
    return source.replace(/import\.meta\.url/g, JSON.stringify(chunkBaseUrl));
  }

  // ---- Source text fetching and parsing ----

  /**
   * Fetch the source text of a chunk. Uses an in-memory cache so each URL
   * is fetched at most once across all loads.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-fetch-source:p1
  private fetchSourceText(absoluteChunkUrl: string): Promise<string> {
    const cached = this.sourceTextCache.get(absoluteChunkUrl);
    if (cached !== undefined) {
      return cached;
    }

    const fetchPromise = fetch(absoluteChunkUrl)
      .then((response) => {
        if (!response.ok) {
          throw new MfeLoadError(
            `HTTP ${response.status} fetching chunk source: ${absoluteChunkUrl}`,
            absoluteChunkUrl
          );
        }
        // SPA dev servers (e.g. Vite) return a 200 HTML document for unknown
        // paths. Detecting this early gives a clear error instead of a cryptic
        // SyntaxError when the HTML is imported as JavaScript.
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) {
          throw new MfeLoadError(
            `Server returned HTML for chunk URL (Content-Type: ${contentType}). ` +
              `The chunk does not exist at the expected path: ${absoluteChunkUrl}. ` +
              'Run "npm run generate:mfe-manifests" to synchronize chunk paths with the current MFE build.',
            absoluteChunkUrl
          );
        }
        return response.text();
      })
      .then((text) => {
        // Belt-and-suspenders: reject any response that looks like HTML regardless
        // of the Content-Type header (some servers omit or misreport it).
        if (text.trimStart().startsWith('<')) {
          throw new MfeLoadError(
            `Chunk response starts with "<" — server returned HTML instead of JavaScript: ${absoluteChunkUrl}. ` +
              'Run "npm run generate:mfe-manifests" to synchronize chunk paths with the current MFE build.',
            absoluteChunkUrl
          );
        }
        return text;
      })
      .catch((error) => {
        this.sourceTextCache.delete(absoluteChunkUrl);
        if (error instanceof MfeLoadError) {
          throw error;
        }
        throw new MfeLoadError(
          `Network error fetching chunk source: ${absoluteChunkUrl}: ${error instanceof Error ? error.message : String(error)}`,
          absoluteChunkUrl,
          error instanceof Error ? error : undefined
        );
      });

    this.sourceTextCache.set(absoluteChunkUrl, fetchPromise);
    return fetchPromise;
  }

  /**
   * Extract resolved filenames from static import statements.
   *
   * Matches all relative imports (both './' and '../' prefixed) and resolves
   * them relative to the importing chunk's path. For example, a chunk at
   * '__federation_shared_@cyberfabric/react.js' importing '../runtime.js' resolves
   * to 'runtime.js' (relative to baseUrl).
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-parse-imports:p1
  private parseStaticImportFilenames(
    source: string,
    chunkFilename: string
  ): string[] {
    const filenames: string[] = [];

    // Named imports: import { x } from './dep.js'  /  export { x } from './dep.js'
    const namedRegex = /from\s*['"](\.\.?\/[^'"]+)['"]/g;
    let match;
    while ((match = namedRegex.exec(source)) !== null) {
      filenames.push(this.resolveRelativePath(chunkFilename, match[1]));
    }

    filenames.push(
      ...this.parseBareSideEffectImportFilenames(source, chunkFilename)
    );

    return [...new Set(filenames)];
  }

  private parseBareSideEffectImportFilenames(
    source: string,
    chunkFilename: string
  ): string[] {
    const filenames: string[] = [];
    let cursor = 0;

    while (cursor < source.length) {
      const importIndex = source.indexOf('import', cursor);
      if (importIndex === -1) {
        break;
      }

      if (!this.hasBareImportBoundary(source, importIndex)) {
        cursor = importIndex + 'import'.length;
        continue;
      }

      let specifierIndex = this.skipImportWhitespace(
        source,
        importIndex + 'import'.length
      );
      const quote = source[specifierIndex];
      if (quote !== '"' && quote !== '\'') {
        cursor = importIndex + 'import'.length;
        continue;
      }

      specifierIndex += 1;
      if (!this.isRelativeImportSpecifier(source, specifierIndex)) {
        cursor = specifierIndex;
        continue;
      }

      let specifierEnd = specifierIndex;
      while (
        specifierEnd < source.length &&
        source[specifierEnd] !== quote
      ) {
        specifierEnd += 1;
      }

      if (specifierEnd >= source.length) {
        break;
      }

      filenames.push(
        this.resolveRelativePath(
          chunkFilename,
          source.slice(specifierIndex, specifierEnd)
        )
      );
      cursor = specifierEnd + 1;
    }

    return filenames;
  }

  private hasBareImportBoundary(source: string, importIndex: number): boolean {
    let boundaryIndex = importIndex - 1;
    while (
      boundaryIndex >= 0 &&
      this.isBareImportWhitespace(source[boundaryIndex])
    ) {
      boundaryIndex -= 1;
    }

    return (
      boundaryIndex < 0 ||
      source[boundaryIndex] === ';' ||
      source[boundaryIndex] === '\n'
    );
  }

  private skipImportWhitespace(source: string, index: number): number {
    let cursor = index;
    while (
      cursor < source.length &&
      this.isImportWhitespace(source[cursor])
    ) {
      cursor += 1;
    }
    return cursor;
  }

  private isRelativeImportSpecifier(source: string, index: number): boolean {
    return (
      source[index] === '.' &&
      (
        source[index + 1] === '/' ||
        (source[index + 1] === '.' && source[index + 2] === '/')
      )
    );
  }

  private isBareImportWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r';
  }

  private isImportWhitespace(char: string): boolean {
    return this.isBareImportWhitespace(char) || char === '\n';
  }

  /**
   * Rewrite all relative imports in a module's source text.
   *
   * Handles both './' and '../' relative imports. Each relative specifier
   * is resolved against the chunk's own path to produce a normalized key
   * for the blobUrlMap lookup. Unmatched imports fall back to absolute URLs.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-rewrite-module-imports:p1
  private rewriteModuleImports(
    source: string,
    baseUrl: string,
    blobUrlMap: Map<string, string>,
    chunkFilename: string
  ): string {
    const resolve = (relPath: string): string => {
      const resolved = this.resolveRelativePath(chunkFilename, relPath);
      const blobUrl = blobUrlMap.get(resolved);
      return blobUrl ?? `${baseUrl}${resolved}`;
    };

    // Static imports: from './...' or from '../...'
    let result = source.replace(
      /from\s*'(\.\.?\/[^']+)'/g,
      (_match, relPath: string) => `from '${resolve(relPath)}'`
    );
    result = result.replace(
      /from\s*"(\.\.?\/[^"]+)"/g,
      (_match, relPath: string) => `from "${resolve(relPath)}"`
    );

    // Dynamic imports: import('./...') or import('../...')
    result = result.replace(
      /import\(\s*'(\.\.?\/[^']+)'\s*\)/g,
      (_match, relPath: string) => `import('${resolve(relPath)}')`
    );
    result = result.replace(
      /import\(\s*"(\.\.?\/[^"]+)"\s*\)/g,
      (_match, relPath: string) => `import("${resolve(relPath)}")`
    );

    // Bare side-effect imports: import './dep.js'
    result = result.replace(
      /import\s*'(\.\.?\/[^']+)'\s*;?/g,
      (_match, relPath: string) => `import '${resolve(relPath)}';`
    );
    result = result.replace(
      /import\s*"(\.\.?\/[^"]+)"\s*;?/g,
      (_match, relPath: string) => `import "${resolve(relPath)}";`
    );

    return result;
  }

  /**
   * Resolve a relative import path against the importing chunk's filename.
   *
   * Uses URL resolution to correctly handle '../' traversals. For example:
   *  - resolveRelativePath('__federation_shared_@cyberfabric/react.js', '../runtime.js')
   *    → 'runtime.js'
   *  - resolveRelativePath('expose-Widget1.js', './dep.js')
   *    → 'dep.js'
   */
  private resolveRelativePath(
    fromChunkFilename: string,
    relativeSpecifier: string
  ): string {
    const syntheticBase = 'http://r/';
    const fromUrl = new URL(fromChunkFilename, syntheticBase);
    const resolved = new URL(relativeSpecifier, fromUrl);
    return resolved.pathname.slice(1); // strip leading '/'
  }
}

export { MfeHandlerMF };
