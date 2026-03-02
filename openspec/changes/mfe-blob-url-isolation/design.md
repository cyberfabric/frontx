## Context

HAI3's MFE system uses `@originjs/vite-plugin-federation` to build and load microfrontend bundles. The target architecture is: **shared code download, isolated instance evaluation per MFE** — each MFE downloads shared dependency code once (HTTP cache) but evaluates it independently so stateful libraries (React, Redux, etc.) get fresh instances per MFE.

The previous change (`fix-mfe-shared-dependencies`) implemented share scope construction and `container.init(shareScope)` correctly, but runtime validation revealed three fundamental problems in the federation plugin:

1. **ES module URL caching**: Browsers cache `import(url)` by URL identity. The federation `get()` functions resolve to the same chunk URL, so every consumer gets the same module instance.
2. **Incomplete externalization**: The plugin only transforms imports to `importShared()` in expose entry files. Code-split chunks retain static imports to bundled copies, bypassing the share scope.
3. **Non-functional post-load registration**: `init()` only writes incoming shareScope into globalThis — it does not add the MFE's own modules back.

These are plugin limitations that cannot be configured away. The handler must take control of both build-time import transformation and runtime module isolation.

### Current Federation Runtime Flow

```
importShared(name)
  ├── moduleCache[name]?                ← per-MFE (module-scoped), correct
  ├── getSharedFromRuntime(name)        ← reads globalThis.__federation_shared__
  │     └── version matching → get()    ← get() returns import(chunkUrl) → SAME instance
  └── getSharedFromLocal(name)          ← moduleMap[name].get() → import(bundledChunkUrl)
```

The moduleCache is already per-MFE (declared in the federation runtime module scope). The problem is exclusively in the `get()` functions: they resolve to the same URL, so `import()` returns the cached module.

## Goals / Non-Goals

**Goals:**
- Each MFE gets genuinely isolated instances of shared dependencies (React, @hai3/*, etc.)
- Shared dependency source text is downloaded once and reused across MFEs (HTTP cache + in-memory cache)
- The MfManifest is the single source of truth for loading — no implicit contracts, no external infrastructure
- ALL imports of shared dependencies route through `importShared()` (not just expose entries)
- Zero new runtime dependencies (no `semver`, no `es-module-lexer` at runtime)
- Clean removal of non-functional code paths (snapshot/registration, host bootstrap)

**Non-Goals:**
- Replacing `@originjs/vite-plugin-federation` — we work within its constraints
- Instance sharing across MFEs — blob URL isolation produces fresh evaluations unconditionally; the default handler does not support sharing module instances across MFE boundaries
- Shared dependency resolution without a manifest `chunkPath` — 3rd-party MFEs that don't include `chunkPath` fall back to federation default behavior (shared instances)
- Runtime `es-module-lexer` for import analysis — import rewriting uses simple string replacement targeting a known single-import pattern

## Decisions

### Decision 1: Blob URL for Per-MFE Module Isolation

**Choice:** Fetch shared dependency source text, create a unique Blob URL per MFE load, `import(blobUrl)` for fresh evaluation.

**Why:** Browsers cache ES modules by URL identity. Two `import()` calls to the same URL return the same module object — this is the ES module specification. Blob URLs are unique by construction (`blob:<origin>/<uuid>`), so each `import(blobUrl)` triggers a fresh module evaluation with its own module-level state.

**Alternatives considered:**
- **Service Worker interception**: SW intercepts module requests, rewrites URLs with MFE-specific tags, serves cached source under unique URLs. Rejected because: (a) the federation runtime's `importShared()` resolves from `globalThis.__federation_shared__` in-memory — it never hits the network, so SW cannot intercept it; (b) introduces implicit contracts (SW must be registered, correct scope) outside the manifest.
- **Re-evaluation via `new Function()`**: Parse source text and evaluate via `new Function()`. Rejected because ES module syntax (`import`/`export`) is not supported in `new Function()` — would require a full module bundler at runtime.
- **Import maps**: Dynamically create `<script type="importmap">` entries with MFE-specific URLs. Rejected because import maps are static once set and cannot be updated after the first module load in most browsers.

**How it works:**
1. Handler fetches the shared dependency chunk source text via `fetch(absoluteChunkUrl)`
2. Source text is cached in an in-memory `Map<string, string>` keyed by absolute URL (first-fetch-wins)
3. For each MFE load, handler creates a Blob from the (possibly cached) source text
4. `URL.createObjectURL(blob)` produces a unique URL
5. `import(blobUrl)` triggers a fresh module evaluation
6. Blob URL is revoked after `import()` resolves (the module is already evaluated; the URL is no longer needed)

### Decision 2: Source Text Import Rewriting

**Choice:** Simple string replacement of all relative imports in shared dependency chunk source text.

**Why:** Shared dependency chunks (e.g., `__federation_shared_react.js`) may contain relative imports to other modules — the federation runtime (`__federation_fn_import-*.js`), helper modules (`_commonjsHelpers-*.js`), etc. When the source is blob-URL'd, ALL relative imports break because Blob URLs have no path context (a Blob URL is `blob:<origin>/<uuid>` — there is no directory to resolve `./` against). The handler must rewrite every relative import to an absolute URL.

**Pattern in built chunks (before custom plugin):**
```javascript
import { g as getDefaultExportFromCjs } from './_commonjsHelpers-D5KtpA0t.js';
import { r as requireReact } from './index-MCx4YXC7.js';
```

**After the custom Vite plugin transforms shared dependency imports (Decision 4):**
```javascript
import { importShared } from './__federation_fn_import-RySFLl55.js';
import { g as getDefaultExportFromCjs } from './_commonjsHelpers-D5KtpA0t.js';
const react = await importShared('react');
```

Note: The plugin only transforms imports of shared packages. Non-shared relative imports (like `_commonjsHelpers`) remain as-is.

**The handler rewrites ALL relative imports to absolute:**
```javascript
import { importShared } from 'https://cdn.example.com/mfe/assets/__federation_fn_import-RySFLl55.js';
import { g as getDefaultExportFromCjs } from 'https://cdn.example.com/mfe/assets/_commonjsHelpers-D5KtpA0t.js';
const react = await importShared('react');
```

The base URL is derived from the MfManifest's `remoteEntry` URL (same directory).

**Why not `es-module-lexer`:** The L1 SDK (`@hai3/screensets`) has a zero-dependency policy. Adding `es-module-lexer` (~4KB + WASM) would break this constraint. Simple string replacement targeting `from './` and `from "./` is sufficient because the build output uses a deterministic pattern for relative imports.

**Why simple string replacement works:** The rewriting targets a known, deterministic pattern: `from './` or `from "./` followed by a filename. The federation plugin and Vite always emit relative imports in this format. Non-relative imports (bare specifiers like `'react'`, absolute URLs) are never prefixed with `./` and are not affected.

### Decision 3: `chunkPath` in SharedDependencyConfig

**Choice:** Add optional `chunkPath: string` field to `SharedDependencyConfig` in the manifest.

**Why:** The handler needs to know the URL of the shared dependency chunk to fetch its source text. Without `chunkPath`, the handler would need to:
- Parse `remoteEntry.js` to extract chunk URLs (fragile, breaks with minification changes)
- Or rely on a naming convention (fragile, plugin-specific)

With `chunkPath`, the manifest declares the chunk location explicitly:
```json
{
  "name": "react",
  "requiredVersion": "^19.0.0",
  "chunkPath": "__federation_shared_react.js"
}
```

The handler derives the absolute URL: `new URL(chunkPath, remoteEntryBaseUrl).href`.

**Deterministic filenames (no content hashes):** `mfe.json` is a GTS entity declaration that will be stored in and served from the backend at runtime. Embedding build-specific content hashes (e.g., `react-DMgTugcw.js`) would couple the backend entity to every rebuild — any build would require updating the backend record. Instead, the `hai3-mfe-externalize` Vite plugin configures shared dependency chunks to use deterministic filenames without hashes (e.g., `__federation_shared_react.js`). Cache busting is handled at the deployment URL level (versioned paths, CDN cache headers), not at the filename level. This makes `chunkPath` a stable structural declaration that only changes when the shared dependency list itself changes.

**When `chunkPath` is omitted:** The handler falls back to default federation behavior — it passes through the `get()` function from the shareScope without blob URL wrapping. This means no isolation for that dependency (shared instance), which is acceptable for truly stateless utilities or for backward compatibility with 3rd-party MFEs that haven't adopted `chunkPath`.

### Decision 4: Custom Vite Plugin for Complete Externalization

**Choice:** A custom Vite plugin (`hai3-mfe-externalize`) that transforms ALL `import` statements for shared dependencies to `importShared()` calls across the entire MFE bundle — not just expose entries.

**Why:** The federation plugin's `transformImport` only runs on expose entry files (condition: `builderInfo.isHost || builderInfo.isShared`). Code-split chunks like `useScreenTranslations-*.js` retain static imports to bundled copies:
```javascript
import { r as requireReact } from './index-MCx4YXC7.js';  // bypasses importShared!
```

The custom plugin ensures these become:
```javascript
const { r: requireReact } = await importShared('react');
```

This is critical because `importShared()` routes through the per-MFE `moduleCache`, which is where blob URL evaluation results are stored. Without complete externalization, some code paths would use the bundled copy while others use the blob-evaluated copy — causing dual-instance bugs.

**Plugin location:** `src/mfe_packages/shared/vite-plugin-hai3-externalize.ts` (shared across MFE packages). The plugin reads the `shared` array from the federation config to know which packages to transform.

**Build-time only:** This plugin runs during `vite build` — it does not affect the development server or add runtime dependencies.

### Decision 5: `singleton` Field Removed Entirely

**Choice:** Remove the `singleton` field from `SharedDependencyConfig` in the GTS schema, TypeScript interface, and all `mfe.json` files.

**Why:** The `singleton` field was inherited from Module Federation's singleton semantics, but those semantics are non-functional with `@originjs/vite-plugin-federation`. The federation runtime uses the same URL for shared dependency chunks, and the browser's ES module cache returns the same module object for a given URL -- `singleton: true` vs `singleton: false` has no effect at the runtime level.

With blob URL isolation, the situation is even clearer: all shared dependencies with a `chunkPath` get isolated instances unconditionally (each MFE load creates a unique Blob URL, triggering a fresh module evaluation). There is no mechanism for `singleton: true` to mean anything -- the handler cannot "share" a module instance across MFEs because the entire isolation architecture is built on producing fresh evaluations.

Retaining the field as "advisory" or "documentation of intent" would be misleading -- it would suggest the field has (or could have) runtime significance, encouraging consumers to set it without any effect. Dead configuration fields that do nothing are a maintenance burden and a source of confusion. If a future handler needs a sharing hint, it can introduce its own configuration at that time with semantics that actually work.

**What is removed:**
- `singleton` property from the GTS schema (`mf_manifest.v1.json`)
- `singleton?: boolean` field and its JSDoc from `SharedDependencyConfig` in `mf-manifest.ts`
- `"singleton": false` entries from all `mfe.json` files (`demo-mfe/mfe.json`, `_blank-mfe/mfe.json`)

### Decision 6: Remove Host Bootstrap and Post-Load Registration

**Choice:** Remove `hostSharedDependencies`, `HostSharedDependency`, `bootstrapHostSharedDependencies()` from the microfrontends plugin. Remove `registerMfeSharedModules()`, `snapshotScopeKeys()` from MfeHandlerMF.

**Why:**
- **Host bootstrap is counterproductive:** Host-provided `get()` functions return `import('react').then(m => () => m)` — the same host React instance every time. With blob URL isolation, the handler wraps `get()` to fetch source and create unique Blob URLs. But host `get()` functions don't point to a fetchable chunk URL — they point to the host's own bundled module. The handler cannot blob-URL the host's modules without knowing their chunk paths.
- **Post-load registration is non-functional:** `init()` only writes incoming shareScope entries into globalThis. It does NOT add the MFE's own bundled modules back. The snapshot-before/diff-after pattern finds nothing new. This is dead code.

**What replaces host bootstrap:** Nothing. The handler uses `chunkPath` from the manifest to fetch source text directly. If a dependency has a `chunkPath`, the handler fetches it from the MFE's own assets. The first MFE to load fetches the source; subsequent MFEs reuse the cached source text (but get fresh evaluations via new Blob URLs). HTTP caching further reduces redundant downloads.

**Migration:** Remove `hostSharedDependencies` from the `microfrontends()` call in the host app. No replacement needed — blob URL isolation handles everything.

### Decision 7: Source Text Cache Lifecycle

**Choice:** The source text cache (`Map<string, Promise<string>>`) is owned by the `MfeHandlerMF` instance and lives for the handler's lifetime. No eviction, no TTL.

**Why:**
- Source text is effectively immutable within a deployment: chunk filenames are deterministic (no hashes), and content only changes when a new version of the MFE is deployed (at which point the `remoteEntry` URL changes, invalidating the entire cache)
- The cache holds string source text, not module instances — size is bounded by the number of unique shared dependencies across all loaded MFEs (typically 10-20 entries, ~500KB-2MB total)
- Handler lifetime = application lifetime in HAI3 (created at init, never destroyed until page unload)
- Adding LRU/TTL complexity is unjustified given the bounded size and deployment-scoped immutability

### Decision 8: Blob URL Revocation Strategy

**Choice:** Revoke Blob URLs immediately after `import()` resolves.

**Why:** Once `import(blobUrl)` resolves, the browser has finished parsing and evaluating the module. The Blob URL is no longer needed — the module's exports are held in the module registry by the (now-revoked) URL key, but this doesn't affect the module's usability. Revoking immediately prevents unbounded Blob URL accumulation in long-running SPAs.

```typescript
const blobUrl = URL.createObjectURL(blob);
try {
  const module = await import(blobUrl);
  return module;
} finally {
  URL.revokeObjectURL(blobUrl);
}
```

## Risks / Trade-offs

### [Risk] Blob URL `import()` may not work in all environments
**Mitigation:** Blob URL `import()` has been empirically verified to work in Chrome (Chromium). It is part of the ES module spec and supported in all modern browsers. Node.js (SSR) does not support Blob URLs for `import()`, but HAI3 MFEs are client-side only — SSR is a Non-Goal.

### [Risk] Source text rewriting is fragile if federation plugin changes output format
**Mitigation:** The rewriting targets a specific, deterministic pattern (`import ... from './__federation_fn_import-*.js'`). If the plugin changes this pattern, the rewriting will fail gracefully (the original relative import remains, which means the Blob URL module fails to resolve its dependency — a clear, debuggable error). The pattern is unlikely to change without a major version bump of the federation plugin.

### [Risk] Custom Vite plugin increases build complexity
**Mitigation:** The plugin is intentionally minimal — it transforms `import` statements for a known list of package names. It does not perform AST parsing (uses string/regex matching on the Vite `transform` hook output). The plugin is shared across MFE packages via a common location (`src/mfe_packages/shared/`).

### [Risk] `chunkPath` must be manually maintained in mfe.json
**Mitigation:** In the monorepo, chunk paths are deterministic from the build output. A future improvement could auto-populate `chunkPath` via a post-build script or the custom Vite plugin itself. For now, manual maintenance is acceptable because: (a) shared dependencies change rarely, (b) the build output includes the chunk filename in the terminal output, (c) a missing or wrong `chunkPath` causes a clear fetch error.

### [Trade-off] Memory usage from source text cache
Source text strings are held in memory for the handler's lifetime. For 12 shared dependencies averaging ~100KB each, this is ~1.2MB. This is acceptable for a modern web application. The trade-off is memory vs. re-fetching source text for every MFE load.

### [Trade-off] ~1-5ms per-dependency per-MFE overhead
Blob URL creation + `import()` evaluation adds a small overhead per shared dependency per MFE load. For 12 dependencies, this is ~12-60ms per MFE — negligible compared to the network time saved by not downloading duplicate bundles.

### [BREAKING] Removing hostSharedDependencies from MicrofrontendsConfig
Consumers that pass `hostSharedDependencies` to `microfrontends()` will get a TypeScript error. Migration: remove the property from the config object. Blob URL isolation handles dependency isolation without host bootstrap.
