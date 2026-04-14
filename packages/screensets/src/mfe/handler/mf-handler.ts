/**
 * Module Federation MFE Handler Implementation
 *
 * Achieves per-runtime isolation by blob-URL'ing the entire module dependency
 * chain for each load() call. Each screen/extension load gets fresh evaluations
 * of all code-split chunks and shared dependencies — no module instances are
 * shared between runtimes.
 *
 * Manifest-based loading:
 * - baseUrl is derived from manifest.metaData.publicPath
 * - expose chunk filename comes from entry.exposeAssets.js.sync[0]
 * - CSS paths come from entry.exposeAssets.css.sync/async
 * - shared dep standalone ESM files are served from publicPath + 'shared/' + normalizedName + '.js'
 * No remoteEntry.js parsing is required.
 *
 * Bare specifier rewriting for shared deps:
 * - Shared deps are fetched as standalone ESM files from the 'shared/' subdirectory.
 * - manifest.shared[] must be in dependency order (leaves first) so that each dep's
 *   blob URL is ready before any dep that imports it is processed.
 * - Within expose chunks and their dependency chains, bare specifiers (e.g. from "react")
 *   are rewritten to the pre-built blob URLs for the corresponding shared dep.
 * - This gives per-load isolation without any MF 2.0 runtime involvement.
 *
 * @packageDocumentation
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-blob-core:p1

import type { MfeEntryMF, MfManifest } from '../types';
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
  /** Shared dep blob URLs: package name → blob URL. Built before the expose chain. */
  readonly sharedDepBlobUrls: Map<string, string>;
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
 *  4. Builds blob URLs for shared deps from standalone ESM files (leaves first)
 *  5. Creates a blob URL chain for the expose chunk and all its static deps,
 *     rewriting bare specifiers to the pre-built shared dep blob URLs
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
   *  1. Shared dep standalone ESM files are blob-URL'd first (leaves first, dependency order)
   *  2. The expose chunk and all its static deps are blob-URL'd with bare specifiers
   *     rewritten to shared dep blob URLs
   *
   * baseUrl is derived from manifest.metaData.publicPath rather than parsing
   * remoteEntry.js — the publicPath field gives the exact chunk base URL.
   *
   * Blob URLs are NOT revoked — modules with top-level await continue
   * evaluating after import() resolves, and revoking during async evaluation
   * causes ERR_FILE_NOT_FOUND. Blob URLs are cleaned up by the browser on
   * page unload.
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
    const baseUrl = manifest.metaData.publicPath;

    // Build shared dep blob URLs first (leaves first, dependency order).
    // Each dep's standalone ESM may import other shared deps as bare specifiers;
    // those are rewritten to already-resolved blob URLs before creating the blob.
    const sharedDepBlobUrls = await this.buildSharedDepBlobUrls(manifest);

    const loadState: LoadBlobState = {
      blobUrlMap: new Map(),
      inFlight: new Map(),
      baseUrl,
      entryId,
      sharedDepBlobUrls,
    };

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

    // Build blob URL chain for the expose chunk and all its static deps.
    // Bare specifiers within those chunks are rewritten to shared dep blob URLs.
    await this.createBlobUrlChain(loadState, exposeChunkFilename);

    const exposeBlobUrl = loadState.blobUrlMap.get(exposeChunkFilename);
    if (!exposeBlobUrl) {
      throw new MfeLoadError(
        `Failed to create blob URL for expose chunk '${exposeChunkFilename}'`,
        entryId
      );
    }

    const exposeModule = await import(/* @vite-ignore */ exposeBlobUrl);

    // The expose chunk exports the lifecycle object as `default`. Fall back to
    // the full module if default is absent (non-MF ESM expose pattern).
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
   * mfInitKey may be an empty string — the field must be present but its
   * value is no longer used by the handler (MF 2.0 runtime removed).
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
      if (typeof manifestRef.mfInitKey !== 'string') {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a "mfInitKey" field (may be empty string)`,
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

  // ---- Shared dep blob URL construction ----

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-build-shared-dep-blob-urls:p1
  /**
   * Build blob URLs for all shared dependencies from standalone ESM files.
   *
   * Processes shared deps in manifest order (must be dependency-ordered: leaves first).
   * Each dep's standalone ESM may import other shared deps as bare specifiers —
   * those are rewritten to already-resolved blob URLs before creating the blob.
   * Per-load fresh blob URLs ensure isolated module instances.
   */
  private async buildSharedDepBlobUrls(
    manifest: MfManifest
  ): Promise<Map<string, string>> {
    const blobUrls = new Map<string, string>();
    const sharedBaseUrl = manifest.metaData.publicPath + 'shared/';
    const sharedNames = new Set(manifest.shared.map((d) => d.name));

    // Pass 1: Fetch all source texts (sourceTextCache deduplicates across MFEs).
    const sources = new Map<string, string>();
    for (const dep of manifest.shared) {
      const depUrl = dep.chunkPath !== null
        ? dep.chunkPath
        : sharedBaseUrl + MfeHandlerMF.normalizeDepName(dep.name) + '.js';
      sources.set(dep.name, await this.fetchSourceText(depUrl));
    }

    // Pass 2: Create blob URLs in dependency order.
    // Each iteration processes deps whose shared dep imports are all resolved.
    // Leaf deps (no shared imports) are processed first; dependents follow.
    const pending = new Map(sources);
    while (pending.size > 0) {
      const before = pending.size;
      for (const [name, source] of pending) {
        const allResolved = [...sharedNames].every(
          (other) =>
            other === name ||
            blobUrls.has(other) ||
            !MfeHandlerMF.sourceImports(source, other)
        );
        if (allResolved) {
          const rewritten = this.rewriteBareSpecifiers(source, blobUrls);
          const blob = new Blob([rewritten], { type: 'text/javascript' });
          blobUrls.set(name, URL.createObjectURL(blob));
          pending.delete(name);
        }
      }
      if (pending.size === before) {
        // No progress — circular dependency; process remaining with partial rewrites.
        for (const [name, source] of pending) {
          const rewritten = this.rewriteBareSpecifiers(source, blobUrls);
          const blob = new Blob([rewritten], { type: 'text/javascript' });
          blobUrls.set(name, URL.createObjectURL(blob));
        }
        break;
      }
    }

    return blobUrls;
  }

  /**
   * Check whether a source text imports the given package as a bare specifier.
   * Detects both `from "pkg"` (static) and `import "pkg"` (side-effect) forms.
   */
  private static sourceImports(source: string, packageName: string): boolean {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:from|import)\\s*["']${escaped}["']`).test(source);
  }

  /**
   * Normalize a package name for use as a filename.
   * Mirrors build-shared-deps.ts convention: @scope/pkg → scope-pkg
   */
  private static normalizeDepName(name: string): string {
    return name.replace(/^@/, '').replace(/\//g, '-');
  }

  /**
   * Rewrite a single bare specifier in source text.
   *
   * Handles two ESM import forms:
   *   Static:      from "react"       → from "blob:xxx"
   *   Side-effect: import "react-dom"  → import "blob:xxx"
   *
   * Matches exact package names only (not substrings):
   *   from "react-dom" is NOT affected by a "react" rewrite
   * Handles both single and double quotes. Handles scoped packages.
   */
  private rewriteBareSpecifier(
    source: string,
    packageName: string,
    replacement: string
  ): string {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Rewrite `from "pkg"` (static imports and re-exports)
    const fromPattern = new RegExp(
      `(from\\s*["'])${escaped}(["'])`,
      'g'
    );
    let result = source.replace(fromPattern, `$1${replacement}$2`);
    // Rewrite `import "pkg"` (side-effect imports, no `from` keyword)
    const sideEffectPattern = new RegExp(
      `(import\\s*["'])${escaped}(["'])`,
      'g'
    );
    result = result.replace(sideEffectPattern, `$1${replacement}$2`);
    return result;
  }

  // @cpt-algo:cpt-frontx-algo-mfe-isolation-rewrite-bare-specifiers:p1
  /**
   * Apply all shared dep bare specifier rewrites to a source text.
   */
  private rewriteBareSpecifiers(
    source: string,
    sharedDepBlobUrls: Map<string, string>
  ): string {
    let rewritten = source;
    for (const [name, blobUrl] of sharedDepBlobUrls) {
      rewritten = this.rewriteBareSpecifier(rewritten, name, blobUrl);
    }
    return rewritten;
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
    // Portable shared dep chunks use absolute URLs (resolved at generation time
    // to a canonical shared base). Use as-is to ensure sourceTextCache dedup.
    const chunkUrl = filename.startsWith('http://') || filename.startsWith('https://')
      ? filename
      : loadState.baseUrl + filename;
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

    // Rewrite bare specifiers (from "react" → from "blob:xxx") using
    // the pre-built shared dep blob URL map.
    rewritten = this.rewriteBareSpecifiers(rewritten, loadState.sharedDepBlobUrls);

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
      if (blobUrl) return blobUrl;
      // If resolved is already absolute (dep of a cross-origin portable chunk),
      // use the URL as-is instead of prepending baseUrl.
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        return resolved;
      }
      return `${baseUrl}${resolved}`;
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
    // When the importing chunk has an absolute URL (portable shared dep served
    // from a canonical origin), resolve imports against that origin and return
    // the full URL. This ensures deps of cross-origin portable chunks are
    // fetched from the correct server, not the current MFE's baseUrl.
    if (fromChunkFilename.startsWith('http://') || fromChunkFilename.startsWith('https://')) {
      return new URL(relativeSpecifier, fromChunkFilename).href;
    }
    const syntheticBase = 'http://r/';
    const fromUrl = new URL(fromChunkFilename, syntheticBase);
    const resolved = new URL(relativeSpecifier, fromUrl);
    return resolved.pathname.slice(1); // strip leading '/'
  }
}

export { MfeHandlerMF };
