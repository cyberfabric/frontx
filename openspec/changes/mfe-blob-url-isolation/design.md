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
6. Blob URL is NOT revoked after `import()` resolves — modules with top-level `await` continue evaluating asynchronously, and `get()` closures create new blob URLs during async evaluation (see Decision 8 revised)

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

### Decision 8: Blob URL Revocation Strategy (REVISED — Bug Fix)

**Original choice:** Revoke Blob URLs immediately after `import()` resolves in a `finally` block.

**Bug discovered during E2E verification:** The original strategy is incorrect. `import()` resolves when the module is **parsed**, not fully **evaluated**. Modules with top-level `await` (like `const react = await importShared('react')`) continue evaluating asynchronously after `import()` returns. The revoked blob URLs are then accessed by `get()` closures in `__federation_shared__` during async evaluation, causing `net::ERR_FILE_NOT_FOUND`.

The failure sequence:
```
[1] writeShareScope()              ← writes get() closures capturing loadState
[2] createBlobUrlChain()           ← creates blob URLs for expose chain
[3] await import(exposeBlobUrl)    ← returns when module is PARSED
[4] finally { revokeObjectURL() }  ← REVOKES all blob URLs (loadState.blobUrls)
[5] (async module eval continues)  ← top-level await still running
[6]   importShared('react')        ← calls get() → createBlobUrlChain → new blob URL
[7]   but step 4 already revoked it (it was added to loadState.blobUrls) → ERR!
```

Additionally, `writeShareScope()` writes `get()` closures to `globalThis.__federation_shared__`, which is a global mutable object. Concurrent loads overlap: Load 2's `writeShareScope` overwrites Load 1's `get()` closures while Load 1's module is still evaluating. Load 1's `importShared()` then picks up Load 2's closures (referencing Load 2's `loadState`). When Load 2's `finally` runs, it revokes blob URLs that Load 1 is still using.

**Revised choice:** Do NOT revoke blob URLs. Remove the `finally` block entirely.

**Why this is safe:**
- Blob URLs are lightweight — each is a `blob:<origin>/<uuid>` string pointing to an in-memory Blob object. The Blob itself is small (source text is already cached separately in `sourceTextCache`).
- The number of blob URLs per load is bounded by the number of shared dependencies + their transitive static deps (typically 20-40 per MFE load).
- When the page is unloaded, all blob URLs are automatically cleaned up by the browser.
- The alternative (deferred revocation via a cleanup method) adds complexity without meaningful memory savings — the Blob objects are small and the handler lives for the app's lifetime.
- Attempting to revoke at the "right time" (after full evaluation including all top-level awaits) is unreliable because there is no browser API to detect when a dynamically imported module has finished all its async evaluation.

**What changes:**
- Remove the `finally` block in `loadExposedModuleIsolated` that iterates `loadState.blobUrls` and calls `URL.revokeObjectURL()`.
- Remove the `blobUrls: string[]` field from `LoadBlobState` (no longer needed — blob URLs are tracked only in `blobUrlMap` for rewriting purposes).
- The `createBlobUrlChain` method no longer pushes to `loadState.blobUrls`.

### Decision 9: Domain-Level Serialization for Screen Swaps (Bug Fix)

**Bug discovered during E2E verification:** `handleScreenSwap` in `ExtensionLifecycleActionHandler` calls `unmountExtension(oldExtId)` followed by `mountExtension(newExtId)`. Each callback routes through `OperationSerializer.serializeOperation(entityId, ...)`, which serializes per **extension entity ID**. A single swap is sequential (the handler `await`s unmount before mount). But concurrent swaps targeting the same domain are NOT serialized against each other because they operate on different entity IDs.

The failure scenario (two rapid `mount_ext` actions targeting the screen domain):

```
Swap A: mount 'helloWorld' onto screen (currently showing 'profile')
Swap B: mount 'settings'   onto screen (arrives before swap A completes)

Both enter handleScreenSwap concurrently (mediator does not serialize domain actions):

Swap A:                                    Swap B:
  getMountedExtension → 'profile'            getMountedExtension → 'profile' (stale!)
  await unmount('profile')                   await unmount('profile') (queued behind A on profile queue)
  ... profile unmounted ...                  ... profile unmount is no-op (already unmounted) ...
  await mount('helloWorld')                  await mount('settings')
    setMountedExtension(screen, 'helloWorld')  setMountedExtension(screen, 'settings')

If mount('settings') completes after mount('helloWorld'):
  screen.mountedExtension = 'settings' ← correct for B
  But 'helloWorld' is still mounted (mountState = 'mounted') — orphaned!

If mount('helloWorld') completes after mount('settings'):
  screen.mountedExtension = 'helloWorld' ← WRONG, B was the latest intent
  'settings' is mounted but domain says 'helloWorld' — state corruption!
```

The core problem: `setMountedExtension(domain, ...)` is a **domain-level** state mutation, but `OperationSerializer` serializes at the **extension entity** level. Multiple swaps on the same domain write to the same domain state from different serializer queues.

**Choice:** Serialize the entire swap as a single domain-level operation in the OperationSerializer using a per-domain queue key.

**How it works:**
- `handleScreenSwap` wraps the entire unmount-then-mount sequence in a single `serializeOnDomain(domainId, ...)` call, using the **domain ID** as the serialization key.
- Inside the domain-serialized block, the existing `this.callbacks.unmountExtension` and `this.callbacks.mountExtension` are called as-is. There is NO deadlock because `OperationSerializer` uses the key as the queue identity — the domain queue key (e.g., `"screen-domain-id"`) is different from the extension entity queue keys (e.g., `"extension-id"`), so the inner per-entity serialization does not contend with the outer domain-level lock.
- This ensures that concurrent swaps on the same domain are queued and execute one at a time, preventing interleaved `setMountedExtension` calls.

**What changes:**
- `ExtensionLifecycleCallbacks` gains ONE new callback: `serializeOnDomain: (domainId: string, operation: () => Promise<void>) => Promise<void>` — this calls `OperationSerializer.serializeOperation(domainId, operation)`, exposing the existing serializer under a domain key.
- `handleScreenSwap` wraps its entire body in `this.callbacks.serializeOnDomain(this.domainId, async () => { ... })`.
- Inside the serialized block, `this.callbacks.unmountExtension` and `this.callbacks.mountExtension` are used unchanged — no bypass, no direct methods.
- `DefaultScreensetsRegistry.registerDomain()` wires the new callback: `serializeOnDomain: (domainId, op) => this.operationSerializer.serializeOperation(domainId, op)`.

**Why no deadlock:** `OperationSerializer.serializeOperation(key, ...)` serializes per key. The outer call uses the domain ID as the key. The inner `unmountExtension`/`mountExtension` calls use the extension entity ID as their key. Different keys = different queues = no contention.

**Why not serialize at the mediator level:** The mediator dispatches actions to domain handlers. Adding domain-level serialization in the mediator would block ALL domain actions (including toggle-semantic domains like sidebar/popup that correctly support concurrent operations). The serialization must be scoped to swap-semantic operations only, which is why it lives in `handleScreenSwap`.

## Risks / Trade-offs

### [Risk] Blob URL `import()` may not work in all environments
**Mitigation:** Blob URL `import()` has been empirically verified to work in Chrome (Chromium). It is part of the ES module spec and supported in all modern browsers. Node.js (SSR) does not support Blob URLs for `import()`, but HAI3 MFEs are client-side only — SSR is a Non-Goal.

### [Risk] Source text rewriting is fragile if federation plugin changes output format
**Mitigation:** The rewriting targets a specific, deterministic pattern (`import ... from './__federation_fn_import-*.js'`). If the plugin changes this pattern, the rewriting will fail gracefully (the original relative import remains, which means the Blob URL module fails to resolve its dependency — a clear, debuggable error). The pattern is unlikely to change without a major version bump of the federation plugin.

### [Risk] Custom Vite plugin increases build complexity
**Mitigation:** The plugin is intentionally minimal — it transforms `import` statements for a known list of package names. It does not perform AST parsing (uses string/regex matching on the Vite `transform` hook output). The plugin is shared across MFE packages via a common location (`src/mfe_packages/shared/`).

### [Risk] `chunkPath` must be manually maintained in mfe.json
**Mitigation:** In the monorepo, chunk paths are deterministic from the build output. A future improvement could auto-populate `chunkPath` via a post-build script or the custom Vite plugin itself. For now, manual maintenance is acceptable because: (a) shared dependencies change rarely, (b) the build output includes the chunk filename in the terminal output, (c) a missing or wrong `chunkPath` causes a clear fetch error.

### [Risk] Blob URLs are never revoked (Decision 8 revision)
**Mitigation:** Blob URLs are not revoked because there is no reliable way to detect when a dynamically imported ES module has finished all async evaluation (including transitive top-level awaits). The memory impact is negligible: each blob URL is a short string, and the underlying Blob objects are small (source text is already cached separately). The count is bounded (20-40 per MFE load). All blob URLs are cleaned up automatically on page unload. In a long-running SPA with many MFE loads, the cumulative blob URL count grows linearly but remains small (e.g., 10 MFE loads x 30 deps = 300 blob URLs, each referencing a few KB).

### [Trade-off] Memory usage from source text cache
Source text strings are held in memory for the handler's lifetime. For 12 shared dependencies averaging ~100KB each, this is ~1.2MB. This is acceptable for a modern web application. The trade-off is memory vs. re-fetching source text for every MFE load.

### [Trade-off] ~1-5ms per-dependency per-MFE overhead
Blob URL creation + `import()` evaluation adds a small overhead per shared dependency per MFE load. For 12 dependencies, this is ~12-60ms per MFE — negligible compared to the network time saved by not downloading duplicate bundles.

### [Trade-off] Domain-level serialization blocks concurrent swaps (Decision 9)
Concurrent `mount_ext` actions targeting the same swap-semantic domain (e.g., screen) are now serialized. This means the second swap waits for the first to complete. This is the correct behavior — screen swaps are inherently sequential (only one extension can be mounted at a time). The serialization does NOT affect toggle-semantic domains (sidebar, popup, overlay) which continue to support concurrent mount/unmount operations.

### [BREAKING] Removing hostSharedDependencies from MicrofrontendsConfig
Consumers that pass `hostSharedDependencies` to `microfrontends()` will get a TypeScript error. Migration: remove the property from the config object. Blob URL isolation handles dependency isolation without host bootstrap.
