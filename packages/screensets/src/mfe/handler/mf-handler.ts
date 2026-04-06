/**
 * Module Federation MFE Handler Implementation
 *
 * Achieves per-runtime isolation by blob-URL'ing the entire module dependency
 * chain for each load() call. Each screen/extension load gets fresh evaluations
 * of the federation runtime (fresh moduleCache), code-split chunks, and shared
 * dependencies — no module instances are shared between runtimes.
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
import type {
  FederationPackageVersions,
} from './federation-types';

const RUNTIME_STYLE_ID_PREFIX = '__hai3-mfe-runtime-style-';

interface ExposedModuleMetadata {
  readonly chunkFilename: string;
  readonly stylesheetPaths: string[];
}

/**
 * A shareScope object written to globalThis.__federation_shared__.
 * Format: { [packageName]: { [version]: { get, loaded?, scope? } } }
 */
type ShareScope = Record<string, FederationPackageVersions>;

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
 *  1. Parses remoteEntry.js (fetched as text) to find the expose chunk
 *  2. Builds a shareScope with per-load blob URL get() functions
 *  3. Creates a blob URL chain for the expose chunk and all its static deps
 *     (fresh __federation_fn_import → fresh moduleCache)
 *  4. During evaluation, importShared() calls trigger the blob URL get()
 *     functions which also create blob URL chains for shared dep chunks
 *  5. All blob URLs share a per-load map so common deps are evaluated once
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
   *  - The expose chunk and all its static deps are blob-URL'd (fresh
   *    __federation_fn_import → fresh moduleCache per load)
   *  - Shared dep chunks are also blob-URL'd via get() closures that share
   *    the same per-load blobUrlMap (so React and ReactDOM get the same React)
   *  - Blob URLs are NOT revoked — modules with top-level await continue
   *    evaluating after import() resolves, and revoking during async evaluation
   *    causes ERR_FILE_NOT_FOUND. Blob URLs are cleaned up by the browser on
   *    page unload.
   */
  private async loadExposedModuleIsolated(
    manifest: MfManifest,
    exposedModule: string,
    entryId: string
  ): Promise<{
    moduleFactory: () => unknown;
    stylesheetPaths: string[];
    baseUrl: string;
  }> {
    const remoteEntryUrl = manifest.remoteEntry;
    const baseUrl = remoteEntryUrl.substring(
      0,
      remoteEntryUrl.lastIndexOf('/') + 1
    );

    const loadState: LoadBlobState = {
      blobUrlMap: new Map(),
      inFlight: new Map(),
      baseUrl,
      entryId,
    };

    // Build shareScope with per-load isolated get() functions
    const shareScope = this.buildShareScope(manifest, loadState);
    this.writeShareScope(shareScope);

    // Parse remoteEntry to find the expose chunk filename
    const remoteEntrySource = await this.fetchSourceText(remoteEntryUrl);
    const exposeMetadata = this.parseExposeMetadata(
      remoteEntrySource,
      exposedModule
    );
    if (!exposeMetadata) {
      throw new MfeLoadError(
        `Cannot find expose chunk for '${exposedModule}' in remoteEntry`,
        entryId
      );
    }

    // Build blob URL chain for the expose chunk and all its static deps
    await this.createBlobUrlChain(loadState, exposeMetadata.chunkFilename);

    const exposeBlobUrl = loadState.blobUrlMap.get(exposeMetadata.chunkFilename);
    if (!exposeBlobUrl) {
      throw new MfeLoadError(
        `Failed to create blob URL for expose chunk '${exposeMetadata.chunkFilename}'`,
        entryId
      );
    }

    const exposeModule = await import(/* @vite-ignore */ exposeBlobUrl);

    // Extract module factory (replicates container's moduleMap handler)
    const exportSet = new Set([
      'Module', '__esModule', 'default', '_export_sfc',
    ]);
    const keys = Object.keys(exposeModule as object);
    return {
      moduleFactory: keys.every((k) => exportSet.has(k))
        ? () => (exposeModule as Record<string, unknown>).default
        : () => exposeModule,
      stylesheetPaths: exposeMetadata.stylesheetPaths,
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

  private removeInjectedStylesheets(container: Element | ShadowRoot): void {
    const injectedStyles = container.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      `link[id^="${RUNTIME_STYLE_ID_PREFIX}"], style[id^="${RUNTIME_STYLE_ID_PREFIX}"]`
    );
    injectedStyles.forEach((styleElement) => styleElement.remove());
  }

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
   */
  private async resolveManifest(manifestRef: string | MfManifest): Promise<MfManifest> {
    if (typeof manifestRef === 'object' && manifestRef !== null) {
      if (typeof manifestRef.id !== 'string') {
        throw new MfeLoadError(
          'Inline manifest must have a valid "id" field',
          'inline-manifest'
        );
      }
      if (typeof manifestRef.remoteEntry !== 'string') {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a valid "remoteEntry" field`,
          manifestRef.id
        );
      }
      if (typeof manifestRef.remoteName !== 'string') {
        throw new MfeLoadError(
          `Inline manifest '${manifestRef.id}' must have a valid "remoteName" field`,
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

  // ---- Share scope construction ----

  /**
   * Build a shareScope for the given manifest.
   *
   * Every dependency with a chunkPath gets a fresh per-load blob URL get().
   * Dependencies without chunkPath are omitted — the MFE falls back to its
   * own bundled copy via the federation runtime's getSharedFromLocal().
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-build-share-scope:p1
  private buildShareScope(
    manifest: MfManifest,
    loadState: LoadBlobState
  ): ShareScope {
    const shareScope: ShareScope = {};

    const deps = manifest.sharedDependencies;
    if (!deps || deps.length === 0) {
      return shareScope;
    }

    for (const dep of deps) {
      if (dep.chunkPath) {
        const blobGet = this.createBlobUrlGet(dep.chunkPath, loadState);
        shareScope[dep.name] = {
          '*': { get: blobGet },
        };
      }
    }

    return shareScope;
  }

  /**
   * Write share scope entries to globalThis.__federation_shared__.
   * Replicates the behavior of container.init(shareScope).
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-write-share-scope:p1
  private writeShareScope(shareScope: ShareScope): void {
    const g = globalThis as Record<string, unknown>;
    const globalShared = (g.__federation_shared__ ?? {}) as Record<
      string,
      Record<string, FederationPackageVersions>
    >;
    g.__federation_shared__ = globalShared;

    for (const [packageName, versions] of Object.entries(shareScope)) {
      for (const [versionKey, versionValue] of Object.entries(versions)) {
        const scope = versionValue.scope || 'default';
        if (!globalShared[scope]) {
          globalShared[scope] = {};
        }
        if (!globalShared[scope][packageName]) {
          globalShared[scope][packageName] = {};
        }
        globalShared[scope][packageName][versionKey] = versionValue;
      }
    }
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
    const source = await this.fetchSourceText(loadState.baseUrl + filename);
    const deps = this.parseStaticImportFilenames(source, filename);

    for (const dep of deps) {
      await this.createBlobUrlChain(loadState, dep);
    }

    const rewritten = this.rewriteModuleImports(
      source,
      loadState.baseUrl,
      loadState.blobUrlMap,
      filename
    );
    const blob = new Blob([rewritten], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    loadState.blobUrlMap.set(filename, blobUrl);
  }

  /**
   * Create a blob-URL get() for a shared dependency chunk.
   *
   * The closure captures the per-load shared state so that common transitive
   * dependencies are blob-URL'd once. Each call to get() within the same
   * load reuses existing blob URLs for already-processed modules.
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-blob-url-get:p1
  private createBlobUrlGet(
    chunkPath: string,
    loadState: LoadBlobState
  ): () => Promise<() => unknown> {
    return async (): Promise<() => unknown> => {
      await this.createBlobUrlChain(loadState, chunkPath);
      const blobUrl = loadState.blobUrlMap.get(chunkPath);
      if (!blobUrl) {
        const attemptedUrl = loadState.baseUrl + chunkPath;
        throw new MfeLoadError(
          `Failed to create blob URL for shared dependency '${chunkPath}' (tried: ${attemptedUrl}). ` +
            'Ensure the MFE dev server is running and serving shared chunks (e.g. run "npm run dev:all" or start the MFE separately).',
          loadState.entryId
        );
      }
      const module = await import(/* @vite-ignore */ blobUrl);
      return () => module;
    };
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
        return response.text();
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
   * Parse the remoteEntry source to find the expose chunk filename.
   *
   * Matches the moduleMap entry pattern (dev / pretty-print):
   *   "./lifecycle-helloworld":()=>{
   *     ...
   *     return __federation_import('./__federation_expose_Lifecycle-helloworld-CeX0Lwd2.js')...
   *   }
   *
   * Production builds minify the entry to an arrow expression body and rename helpers, e.g.:
   *   "./lifecycle":()=>(E([],!1,"./lifecycle"),w("./__federation_expose_Lifecycle-….js").then(...))
   */
  // @cpt-algo:cpt-frontx-algo-mfe-isolation-parse-expose-chunk:p1
  private parseExposeMetadata(
    remoteEntrySource: string,
    exposedModule: string
  ): ExposedModuleMetadata | null {
    const body = this.findExposeModuleBody(remoteEntrySource, exposedModule);
    if (body === null) {
      return null;
    }

    const chunkFilename = this.parseExposeChunkFilename(body);
    if (!chunkFilename) {
      return null;
    }

    const stylesheetPaths = this.parseStylesheetPaths(body, exposedModule);
    return {
      chunkFilename,
      stylesheetPaths,
    };
  }

  /**
   * Resolve the expose chunk file inside the moduleMap callback body.
   * Prefers stable `__federation_expose_*` paths; falls back to __federation_import().
   */
  private parseExposeChunkFilename(exposeBody: string): string | null {
    const exposeRef = /['"]\.\/(__federation_expose_[^'"]+\.js)['"]/.exec(exposeBody);
    if (exposeRef) {
      return exposeRef[1];
    }
    const importMatch = /__federation_import\(\s*['"]\.\/([^'"]+)['"]\s*\)/.exec(
      exposeBody
    );
    return importMatch ? importMatch[1] : null;
  }

  private findExposeModuleBody(
    remoteEntrySource: string,
    exposedModule: string
  ): string | null {
    const escaped = exposedModule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startRegex = new RegExp(
      String.raw`["']${escaped}["']\s*:\s*\(\)\s*=>\s*(\{|\()`,
      'g'
    );
    const match = startRegex.exec(remoteEntrySource);
    if (!match) {
      return null;
    }

    const delimiter = match[1] as '{' | '(';
    const bodyStart = match.index + match[0].length;
    if (delimiter === '{') {
      return this.scanBalancedDelimiter(remoteEntrySource, bodyStart, '{', '}');
    }
    return this.scanBalancedDelimiter(remoteEntrySource, bodyStart, '(', ')');
  }

  /**
   * Slice `source` from `startIndex` up to (but not including) the closing delimiter
   * that balances the opening `{` or `(` at startIndex-1 context (caller positions
   * startIndex immediately after the opening delimiter).
   */
  private scanBalancedDelimiter(
    source: string,
    startIndex: number,
    openChar: string,
    closeChar: string
  ): string | null {
    let depth = 1;
    let quote: '"' | "'" | '`' | null = null;
    let escapedChar = false;

    for (let index = startIndex; index < source.length; index++) {
      const char = source[index];

      if (quote !== null) {
        const next = this.advanceQuotedString(char, quote, escapedChar);
        escapedChar = next.escapedChar;
        if (next.exitQuote) {
          quote = null;
        }
        continue;
      }

      const startedQuote = this.parseQuoteStart(char);
      if (startedQuote !== null) {
        quote = startedQuote;
        continue;
      }
      if (char === openChar) {
        depth += 1;
        continue;
      }
      if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, index);
        }
      }
    }

    return null;
  }

  private advanceQuotedString(
    char: string,
    quote: '"' | "'" | '`',
    escapedChar: boolean
  ): { escapedChar: boolean; exitQuote: boolean } {
    if (escapedChar) {
      return { escapedChar: false, exitQuote: false };
    }
    if (char === '\\') {
      return { escapedChar: true, exitQuote: false };
    }
    if (char === quote) {
      return { escapedChar: false, exitQuote: true };
    }
    return { escapedChar: false, exitQuote: false };
  }

  private parseQuoteStart(char: string): '"' | "'" | '`' | null {
    if (char === '"' || char === '\'' || char === '`') {
      return char as '"' | "'" | '`';
    }
    return null;
  }

  /**
   * Extract CSS asset paths from the expose callback. Pretty builds call
   * `dynamicLoadingCss([...], …)`; minified output uses a short alias with the same
   * argument shape: `([...], <bool>, "<exposeKey>")`.
   */
  private parseStylesheetPaths(
    exposeBody: string,
    exposedModule: string
  ): string[] {
    const legacy = /dynamicLoadingCss\(\s*\[([\s\S]*?)\]\s*,/.exec(exposeBody);
    if (legacy) {
      return this.extractCssStringPaths(legacy[1]);
    }

    const escaped = exposedModule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const minified = new RegExp(
      `\\[([\\s\\S]*?)\\]\\s*,\\s*[^,]+\\s*,\\s*["']${escaped}["']`
    ).exec(exposeBody);
    if (!minified) {
      return [];
    }
    return this.extractCssStringPaths(minified[1]);
  }

  private extractCssStringPaths(bracketInner: string): string[] {
    const paths: string[] = [];
    const stringRegex = /['"]([^'"]+\.css[^'"]*)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = stringRegex.exec(bracketInner)) !== null) {
      paths.push(match[1]);
    }
    return paths;
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
