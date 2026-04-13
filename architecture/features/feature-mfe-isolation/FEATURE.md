# Feature: MFE Blob URL Isolation

<!-- version: 1.5 -->


<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [MFE Load via Blob URL Isolation](#mfe-load-via-blob-url-isolation)
  - [MFE Build with Module Federation Plugin](#mfe-build-with-module-federation-plugin)
  - [MFE-Internal Bootstrap](#mfe-internal-bootstrap)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Create Per-Load Federation Instance](#create-per-load-federation-instance)
  - [Blob URL Get Factory](#blob-url-get-factory)
  - [Fetch Source Text (with Cache)](#fetch-source-text-with-cache)
  - [Recursive Blob URL Chain](#recursive-blob-url-chain)
  - [Parse Static Import Filenames](#parse-static-import-filenames)
  - [Rewrite Module Imports](#rewrite-module-imports)
  - [Read Entry Expose Assets](#read-entry-expose-assets)
  - [Wrap Lifecycle With Remote Stylesheets](#wrap-lifecycle-with-remote-stylesheets)
  - [Inject Remote Stylesheets](#inject-remote-stylesheets)
  - [Remove Injected Stylesheets](#remove-injected-stylesheets)
  - [Upsert Mount Style Element](#upsert-mount-style-element)
  - [Generation Script: Produce mfe.generated.json](#generation-script-produce-mfegeneratedjson)
  - [Resolve MF Init Promise](#resolve-mf-init-promise)
- [4. States (CDSL)](#4-states-cdsl)
  - [LoadBlobState (Per-Load Isolation Map)](#loadblobstate-per-load-isolation-map)
  - [SourceTextCache (Handler-Level)](#sourcetextcache-handler-level)
  - [SharedDepProviders (Handler-Level)](#shareddepproviders-handler-level)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Blob URL Isolation Core](#blob-url-isolation-core)
  - [Module Federation Vite Plugin and frontx-mf-gts](#module-federation-vite-plugin-and-frontx-mf-gts)
  - [MFE-Internal Dataflow](#mfe-internal-dataflow)
  - [MfManifest Type and GTS Schema Update](#mfmanifest-type-and-gts-schema-update)
  - [ChildMfeBridge Abstract Class Contract](#childmfebridge-abstract-class-contract)
- [6. Acceptance Criteria](#6-acceptance-criteria)
- [Additional Context](#additional-context)

<!-- /toc -->

- [ ] `p1` - **ID**: `cpt-frontx-featstatus-mfe-isolation`

- [x] `p2` - `cpt-frontx-feature-mfe-isolation`
---

## 1. Feature Context

### 1.1 Overview

MFE Blob URL Isolation delivers per-microfrontend JavaScript module isolation by evaluating each MFE bundle in a fresh module scope via the browser's blob URL mechanism. Without this, dynamically loaded MFE bundles share the same module registry as the host application: two MFEs that each depend on `react` would receive the same React instance, meaning their fiber trees, hooks state, and Redux stores bleed into each other.

The isolation is achieved through five coordinated responsibilities:

1. **Manifest resolution and source text fetching** — the handler resolves the `MfManifest` GTS entity (registered before load) to extract expose chunk paths, shared dependency chunk paths, and CSS asset paths; each shared dependency chunk is fetched at most once across all MFE packages via a canonical provider mechanism (the first MFE to provide a given `name@version` registers its base URL; subsequent MFEs resolve to the same canonical URL, producing `sourceTextCache` hits); each expose chunk and its MFE-specific dependencies are fetched from the originating MFE's server.
2. **Import rewriting** — relative specifiers in fetched source text are resolved to either existing blob URLs (from the per-load map) or absolute HTTP URLs, so blob-evaluated modules can locate their dependencies.
3. **Recursive blob URL chain** — the expose chunk and every static dependency it imports are processed depth-first; common transitive dependencies within one load are blob-URL'd once, then reused by the shared map.
4. **Per-load federation instance creation** — a real `FederationHost` instance is created per load via `createInstance()` from `@module-federation/runtime` with `shared` entries whose `get()` factories produce blob-URL'd modules using `manifest.shared[].unwrapKey`; the instance is resolved into `globalThis[manifest.mfInitKey].initPromise` before any blob-URL'd chunk evaluates, so `__loadShare__` proxy chunks call `instance.loadShare(pkgName)` natively through the MF 2.0 runtime; no writes to `globalThis.__federation_shared__` are performed.
5. **Build-time manifest generation** — at build time, `@module-federation/vite` produces a `mf-manifest.json` alongside chunk files; all shared dependency chunk paths are declared in the manifest, and shared dependency transforms across all chunks are handled natively by the plugin.

The MFE-internal dataflow completes the isolation: each MFE creates its own `HAI3App` with an isolated store via the blob-URL-evaluated `@cyberfabric/react`; no direct `react-redux` or `@reduxjs/toolkit` imports are permitted.

**Primary value**: MFEs maintain fully independent module-level state — React fiber trees, hooks, stores — regardless of shared dependencies.

**Key assumptions**: The host application runs in a browser with support for `Blob`, `URL.createObjectURL`, and dynamic `import()`. MFE builds use `@module-federation/vite`, which auto-generates `mf-manifest.json` as part of every build.

### 1.2 Purpose

Enable multiple independently deployed MFE bundles to coexist in the same browser page without module state leakage, while minimizing redundant network requests through source text caching.

**Success criteria**: `Object.is(mfeA_React, mfeB_React)` is `false` for any two concurrently loaded MFEs that both declare `react` in their shared dependency list.

### 1.3 Actors

- `cpt-frontx-actor-microfrontend`
- `cpt-frontx-actor-build-system`
- `cpt-frontx-actor-host-app`
- `cpt-frontx-actor-runtime`

### 1.4 References

- Overall Design: [DESIGN.md](../../DESIGN.md)
- Decomposition entry: [DECOMPOSITION.md §2.3](../../DECOMPOSITION.md)
- PRD: [PRD.md](../../PRD.md) — sections 5.6 (MFE Blob URL Isolation), 5.7 (MFE Build Plugin), 5.8 (MFE Internal Dataflow), 5.9 (MFE Share Scope Management)
- ADR: `cpt-frontx-adr-blob-url-mfe-isolation`
- ADR: `cpt-frontx-adr-mf2-manifest-discovery`
- Depends on feature: `cpt-frontx-feature-screenset-registry`

#### Non-Applicable Domains

- **OPS**: Client-side library, no server deployment
- **COMPL**: No regulatory data handling
- **UX**: Infrastructure capability, no direct user interface
- **DATA**: No database persistence (client-side state only)
- **INT**: No external service integrations (browser APIs only)
- **BIZ**: Infrastructure capability; business value derived transitively through consuming applications
- **MAINT**: No formal SLA or support tier — maintained under FrontX iterative development model
- **SEC**: No authentication or authorization implementation; CSP configuration (`blob:` in `script-src`) is the sole security-adjacent concern and is documented in `cpt-frontx-nfr-sec-csp-blob`

---

## 2. Actor Flows (CDSL)

### MFE Load via Blob URL Isolation

- [x] `p1` - **ID**: `cpt-frontx-flow-mfe-isolation-load`

**Actors**:
- `cpt-frontx-actor-host-app`
- `cpt-frontx-actor-microfrontend`
- `cpt-frontx-actor-runtime`

1. [x] - `p1` - Host requests load of an `MfeEntryMF` through the screensets registry — `inst-host-request-load`
2. [x] - `p1` - `MfeHandlerMF.load()` delegates to `loadInternal()` wrapped in retry logic — `inst-retry-wrapper`
3. [x] - `p1` - `loadInternal()` resolves the `MfManifest` from the entry's `manifest` field (inline object validated and cached, or string GTS ID looked up in ManifestCache); the manifest is a pre-registered GTS entity populated from `mfe.generated.json` at bootstrap time — it is never fetched from the network at load time; **IF** not found **RETURN** `MfeLoadError` — `inst-resolve-manifest`
4. [x] - `p1` - **IF** `entry.schemas` is present and non-empty: FOR EACH schema in `entry.schemas`, call `typeSystem.registerSchema(schema)` — this step runs before entry or extension registration so action schema validation is available when entries are processed — `inst-register-mfe-schemas`
5. [x] - `p1` - Read expose chunk path and CSS asset paths from `entry.exposeAssets` (per-module data, set at registration time from `mf-manifest.json`'s `exposes[]`); **IF** `exposeAssets` is absent or expose chunk path is empty **RETURN** `MfeLoadError` — `inst-read-expose-assets`
6. [x] - `p1` - `loadExposedModuleIsolated()` derives `baseUrl` from `manifest.metaData.publicPath` for chunk URL resolution — `inst-derive-base-url`
7. [x] - `p1` - A fresh `LoadBlobState` is created with an empty `blobUrlMap` and `visited` set scoped to this load — `inst-create-load-state`
8. [x] - `p1` - Algorithm: create per-load federation instance via `cpt-frontx-algo-mfe-isolation-build-share-scope` — `inst-build-share-scope`
9. [x] - `p1` - Algorithm: resolve MF init promise via `cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise` — resolves `globalThis[manifest.mfInitKey].initPromise` with the real `FederationHost` instance so `__loadShare__` proxy chunks can call `instance.loadShare(pkgName)` natively during evaluation — `inst-resolve-mf-init`
10. [x] - `p1` - Algorithm: build blob URL chain for expose chunk via `cpt-frontx-algo-mfe-isolation-blob-url-chain` — `inst-blob-url-chain`
11. [x] - `p1` - **IF** expose blob URL is absent from `blobUrlMap` **RETURN** `MfeLoadError` — `inst-check-expose-blob`
12. [x] - `p1` - Dynamic `import()` of the expose blob URL produces the expose module — `inst-import-expose-blob`
13. [x] - `p1` - Read the lifecycle from the expose module's default export; result validated as `MfeEntryLifecycle` (must have `mount` and `unmount`) — `inst-validate-lifecycle`
14. [x] - `p1` - **IF** lifecycle interface not satisfied **RETURN** `MfeLoadError` — `inst-check-lifecycle`
15. [x] - `p1` - Algorithm: when stylesheet paths are non-empty, wrap lifecycle so `mount` injects remote CSS (`cpt-frontx-algo-mfe-isolation-wrap-lifecycle-stylesheets`) and `unmount` removes injected `<link>` / `<style>` nodes — `inst-wrap-stylesheets`
16. [x] - `p1` - **RETURN** `MfeEntryLifecycle<ChildMfeBridge>` to caller — `inst-return-lifecycle`

### MFE Build with Module Federation Plugin

- [x] `p2` - **ID**: `cpt-frontx-flow-mfe-isolation-build-v2`

**Actors**:
- `cpt-frontx-actor-build-system`

1. [x] - `p1` - MFE `vite.config.ts` registers the `@module-federation/vite` plugin with expose entries and shared dependency declarations — `inst-vite-config`
2. [x] - `p1` - On `vite build`, the plugin processes expose entry files and all code-split chunks, applying shared dependency transforms natively across all chunks without a separate post-processing step — `inst-federation-plugin-runs`
3. [x] - `p1` - The plugin emits `mf-manifest.json` alongside the built chunk files; the manifest declares each expose entry with its primary JS chunk path in `exposes[].assets.js.sync`, CSS asset paths in `exposes[].assets.css.sync` and `exposes[].assets.css.async`, and each shared dependency with its chunk path in `shared[].assets.js.sync` — `inst-manifest-emitted`
4. [x] - `p1` - Shared dependency chunk paths in `mf-manifest.json` are stable across rebuilds; the manifest is the authoritative source of chunk paths — `inst-stable-chunk-paths`
5. [x] - `p1` - Resulting bundle contains `mf-manifest.json` with complete expose and shared dependency metadata required by the generation script to produce `mfe.generated.json` — `inst-build-output`
6. [ ] - `p1` - The `frontx-mf-gts` Vite plugin runs in the `closeBundle` hook (after `@module-federation/vite`): it reads `mfe.json` (for `sharedDependencies` names), `dist/mf-manifest.json` (for shared dep chunk paths and expose assets), `dist/remoteEntry.js` (to extract `mfInitKey`), and `dist/assets/localSharedImportMap-*.js` (to extract per-dep `unwrapKey`); it emits `dist/mfe.gts-manifest.json` with `mfInitKey`, per-dep `unwrapKey` and `chunkPath`, and entries with `exposeAssets` — `inst-frontx-mf-gts-plugin`
7. [ ] - `p1` - The generation script reads `dist/mfe.gts-manifest.json` and `mfe.json`, receives `--base-url` as a CLI parameter, and produces `mfe.generated.json` with: the complete `MfManifest` GTS entity (including `metaData.publicPath` set to `--base-url`, `mfInitKey`, and per-dep `unwrapKey`/`chunkPath` on each shared entry), all entries with `exposeAssets`, all extensions, and all schemas from `mfe.json` — `inst-gen-script-runs`
8. [ ] - `p1` - `mf-manifest.json` is NOT imported or fetched by the host at runtime; `frontx-mf-gts` and the generation script are the sole consumers of `mf-manifest.json` — `inst-manifest-not-runtime`
9. [ ] - `p1` - The bootstrap loader imports `mfe.generated.json` to register the `MfManifest` GTS entity and MFE entries with the runtime; `mfe.json` is not read at runtime — `inst-bootstrap-imports-generated`

### MFE-Internal Bootstrap

> **Cross-reference**: The formal algorithm for bootstrap pre-registration (registering the `MfManifest` GTS entity and MFE entries before load) is described in the screenset-registry FEATURE DoD (`cpt-frontx-dod-screenset-registry-mfe-schema-registration`). That feature owns the registration protocol; this flow covers only MFE-internal state bootstrapping after the expose chunk is evaluated.

- [x] `p1` - **ID**: `cpt-frontx-flow-mfe-isolation-mfe-bootstrap`

**Actors**:
- `cpt-frontx-actor-microfrontend`
- `cpt-frontx-actor-runtime`

1. [x] - `p1` - The MFE's `init.ts` module is evaluated as a module-level side effect when the expose chunk is first imported — `inst-init-side-effect`
2. [x] - `p1` - `init.ts` calls `apiRegistry.register()` and `apiRegistry.initialize()` to register API services before the store is built — `inst-register-api`
3. [x] - `p1` - `createHAI3().use(effects()).use(queryCacheShared()).use(mock()).build()` creates a minimal `HAI3App` with an isolated store singleton and joins the host-owned QueryClient — `inst-create-mfe-app`
4. [x] - `p1` - `registerSlice(slice, effectInitializer)` wires domain state into the MFE-local store — `inst-register-slice`
5. [x] - `p1` - `mfeApp` is exported for use by lifecycle React components as the `<HAI3Provider app={mfeApp}>` prop — `inst-export-mfe-app`
6. [x] - `p1` - **IF** any lifecycle component imports `react-redux`, `redux`, or `@reduxjs/toolkit` directly, the architecture constraint is violated — `inst-no-direct-redux`

---

## 3. Processes / Business Logic (CDSL)

### Create Per-Load Federation Instance

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-build-share-scope`

Creates a real per-load `FederationHost` instance using `createInstance()` from `@module-federation/runtime`. MF 2.0 `__loadShare__` proxy chunks await `globalThis[manifest.mfInitKey].initPromise`, receive the instance, and call `instance.loadShare("react")` (or any other declared shared dependency name) to obtain a blob-URL'd module. The `FederationHost` is configured with `shared` entries whose `get()` factories fetch the chunk, create a blob URL, import it, unwrap using `manifest.shared[].unwrapKey`, wrap with `__esModule`, and return `() => module`. All `mfInitKey` and `unwrapKey` values are extracted at build time by the `frontx-mf-gts` plugin — no heuristics are applied at runtime.

1. [x] - `p1` - **IF** the manifest shared dependency list is empty or absent **RETURN** a `createInstance()` result with an empty `shared` config — `inst-empty-deps`
2. [x] - `p1` - Build a `shared` config array from the manifest shared dependency list:
   - **FOR EACH** dependency in the shared dependency list:
     - Read `dep.chunkPath` and `dep.unwrapKey` from the manifest entry — `inst-resolve-chunk-path`
     - Resolve the canonical provider for `dep.name@dep.version` via the handler-level `sharedDepProviders` map: **IF** no entry exists, register the current load's `baseUrl` and `chunkPath` as the canonical provider; **IF** an entry exists, use the existing provider's `baseUrl` and `chunkPath` — `inst-resolve-canonical-provider`
     - **IF** `dep.chunkPath` is present: add a shared entry with `lib: { get() }` factory that uses the canonical provider's `baseUrl` to fetch `chunkPath`, creates a blob URL, imports it, reads `mod[dep.unwrapKey ?? 'default']`, wraps with `{ __esModule: true, default: module }`, and returns `() => module` — `inst-build-get-factory`
     - **IF** `dep.chunkPath` is absent: skip (MFE falls back to its own bundled copy) — `inst-skip-no-chunk-path`
3. [x] - `p1` - Call `createInstance({ name: uniquePerLoadName, shared: sharedConfig })` and **RETURN** the real `FederationHost` instance — `inst-create-instance`

### Blob URL Get Factory

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-blob-url-get`

The `get()` factory function embedded in a shared entry's `lib` config is invoked when `FederationHost.loadShare(pkgName)` is called by a `__loadShare__` proxy chunk. The factory uses the canonical provider's `baseUrl` and `chunkPath` (resolved during share scope construction) so that all MFE packages sharing the same `name@version` resolve to the same source text via the handler-level `sourceTextCache`. The factory uses `unwrapKey` from the manifest to extract the module from the imported chunk without heuristics.

1. [x] - `p1` - When invoked: create a `depLoadState` using the canonical provider's `baseUrl` (sharing the per-load `blobUrlMap` and `inFlight` maps); call `createBlobUrlChain(depLoadState, canonical.chunkPath)` to ensure the chunk and its dependencies are blob-URL'd from the canonical provider's server — `inst-trigger-chain`
2. [x] - `p1` - Retrieve the resulting blob URL from `loadState.blobUrlMap.get(canonical.chunkPath)` — `inst-get-blob-url`
3. [x] - `p1` - **IF** blob URL is absent **RETURN** `MfeLoadError` — `inst-missing-blob-url`
4. [x] - `p1` - Dynamic `import()` of the blob URL produces a fresh module evaluation — `inst-import-blob`
5. [x] - `p1` - Read `mod[unwrapKey ?? 'default']` to extract the module; wrap as `{ __esModule: true, default: module }` — `inst-unwrap-module`
6. [x] - `p1` - **RETURN** a module factory `() => wrappedModule` so the `FederationHost` receives the expected shape — `inst-return-factory`

### Fetch Source Text (with Cache)

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-fetch-source`

All source text fetches go through the `MfeHandlerMF`-level `sourceTextCache` (keyed by absolute URL), ensuring at most one network request per chunk across all loads.

1. [x] - `p1` - **IF** `sourceTextCache` contains an entry for `absoluteChunkUrl` **RETURN** the cached `Promise<string>` — `inst-cache-hit`
2. [x] - `p1` - **TRY**: issue `fetch(absoluteChunkUrl)` — `inst-fetch-request`
   - **IF** `response.ok` is false **RETURN** `MfeLoadError` with HTTP status and URL — `inst-http-error`
   - **RETURN** `response.text()` — `inst-return-text`
3. [x] - `p1` - **CATCH**: remove the failed entry from `sourceTextCache` (prevents a stuck negative cache entry), then **RETURN** `MfeLoadError` wrapping the original error — `inst-cache-evict-on-error`
4. [x] - `p1` - Store the `Promise<string>` in `sourceTextCache` keyed by `absoluteChunkUrl` before awaiting — `inst-cache-store`
5. [x] - `p1` - **RETURN** the stored promise — `inst-return-promise`

### Recursive Blob URL Chain

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-blob-url-chain`

Processes a chunk and all its static relative imports depth-first. Within a single load, each filename is processed at most once.

1. [x] - `p1` - **IF** `loadState.blobUrlMap` already has `filename` OR `loadState.visited` contains `filename` **RETURN** (already processed) — `inst-already-processed`
2. [x] - `p1` - Add `filename` to `loadState.visited` — `inst-mark-visited`
3. [x] - `p1` - Fetch source text for `loadState.baseUrl + filename` via `cpt-frontx-algo-mfe-isolation-fetch-source` — `inst-fetch-chunk`
4. [x] - `p1` - Parse static import filenames via `cpt-frontx-algo-mfe-isolation-parse-imports` — `inst-parse-deps`
5. [x] - `p1` - **FOR EACH** dependency filename: recursively call `createBlobUrlChain(loadState, dep)` — `inst-recurse-deps`
6. [x] - `p1` - Rewrite module imports in the source text via `cpt-frontx-algo-mfe-isolation-rewrite-module-imports`, using `loadState.blobUrlMap` for already-processed deps and `loadState.baseUrl` for the rest — `inst-rewrite-source`
7. [x] - `p1` - Create a `Blob` from the rewritten source with MIME type `text/javascript` — `inst-create-blob`
8. [x] - `p1` - Call `URL.createObjectURL(blob)` to produce a blob URL — `inst-create-object-url`
9. [x] - `p2` - Do NOT call `URL.revokeObjectURL()` at any point — modules with top-level `await` continue evaluating asynchronously after `import()` resolves, and premature revocation causes `ERR_FILE_NOT_FOUND` — `inst-no-revoke`
10. [x] - `p1` - Store the blob URL in `loadState.blobUrlMap` keyed by `filename` — `inst-store-blob-url`

### Parse Static Import Filenames

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-parse-imports`

Extracts normalized dependency filenames from a chunk's source text so the recursive chain knows which sub-chunks to process.

1. [x] - `p1` - Match all `from './...'` and `from '../...'` patterns in the source text — `inst-match-relative`
2. [x] - `p1` - **FOR EACH** match: resolve the relative specifier against `chunkFilename` using URL-based path resolution (synthetic `http://r/` base, then strip the leading `/`) — `inst-resolve-path`
3. [x] - `p1` - Deduplicate the resulting filename list — `inst-dedupe`
4. [x] - `p1` - **RETURN** the deduplicated list of resolved filenames — `inst-return-filenames`

### Rewrite Module Imports

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-rewrite-module-imports`

Replaces relative specifiers in a chunk's source text with either a blob URL (if the dependency has already been processed in the current load) or an absolute HTTP URL. Also rewrites `import.meta.url` occurrences to the real base URL.

1. [x] - `p1` - For each relative specifier (both `./` and `../`) in static `from '...'` patterns: resolve the relative specifier against `chunkFilename`; look up the resolved key in `blobUrlMap`; if found, replace with the blob URL; otherwise replace with `baseUrl + resolvedKey` — `inst-static-imports`
2. [x] - `p1` - Apply the same resolution and replacement to dynamic `import('./...')` and `import('../...')` patterns — `inst-dynamic-imports`
3. [x] - `p1` - Non-relative specifiers (bare package names, absolute URLs) are not modified — `inst-skip-non-relative`
4. [x] - `p1` - Replace all occurrences of `import.meta.url` with the string literal of `baseUrl` so that preload helper code inside the blob-evaluated chunk resolves absolute URLs against the real deployment origin rather than the blob URL — `inst-rewrite-import-meta-url`
5. [x] - `p1` - **RETURN** the fully rewritten source text — `inst-return-rewritten`

### Read Entry Expose Assets

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-parse-manifest-expose-metadata`

Reads the expose chunk path and CSS asset paths from `entry.exposeAssets`. This data is set at registration time — the registration code splits `mf-manifest.json`'s `exposes[]` array so that per-module assets travel with the entry, not the manifest.

1. [x] - `p1` - Read `entry.exposeAssets.js.sync[0]` as the primary expose chunk path — `inst-read-chunk-path`
2. [x] - `p1` - Read `entry.exposeAssets.css.sync` and `entry.exposeAssets.css.async` as CSS asset paths for mount-time injection — `inst-read-css-paths`
3. [x] - `p1` - **IF** chunk path is absent or empty **RETURN** null — `inst-no-chunk-path`
4. [x] - `p1` - **RETURN** `{ chunkPath, stylesheetPaths }` — `inst-return-metadata`

### Wrap Lifecycle With Remote Stylesheets

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-wrap-lifecycle-stylesheets`

When the remote emitted CSS paths, returns a lifecycle proxy that injects styles before `mount` and removes them on `unmount`.

1. [x] - `p1` - **IF** `stylesheetPaths` is empty **RETURN** the original lifecycle — `inst-no-css-proxy`
2. [x] - `p1` - **ELSE** **RETURN** object whose `mount` awaits `cpt-frontx-algo-mfe-isolation-inject-remote-stylesheets` then delegates — `inst-proxy-mount`
3. [x] - `p1` - `unmount` calls `cpt-frontx-algo-mfe-isolation-remove-injected-stylesheets` then delegates — `inst-proxy-unmount`

### Inject Remote Stylesheets

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-inject-remote-stylesheets`

For each path, resolves absolute URL with `baseUrl` and upserts a `<link rel="stylesheet">` under the mount container with a deterministic id prefix.

1. [x] - `p1` - **FOR EACH** path: `cpt-frontx-algo-mfe-isolation-upsert-mount-style-element` with `href` — `inst-inject-each-link`

### Remove Injected Stylesheets

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-remove-injected-stylesheets`

Queries `link[id^=prefix], style[id^=prefix]` within the mount container and removes each node.

1. [x] - `p1` - **RETURN** after removal (idempotent) — `inst-cleanup-styles`

### Upsert Mount Style Element

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-upsert-mount-style-element`

Creates or updates a `<link rel="stylesheet">` (href) or `<style>` (inline css) under `Element` or `ShadowRoot`, keyed by id.

1. [x] - `p1` - Locate existing node by id (`getElementById` or `querySelector`) — `inst-find-existing`
2. [x] - `p1` - **IF** href: ensure `LINK` element; set `href` — `inst-upsert-link`
3. [x] - `p1` - **ELSE** ensure `STYLE` element; set `textContent` — `inst-upsert-inline`

### Generation Script: Produce mfe.generated.json

- [ ] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-generate-mfe-config`

Reads `mfe.json` and `dist/mfe.gts-manifest.json` (produced by the `frontx-mf-gts` plugin), applies the `--base-url` CLI parameter, and writes `mfe.generated.json` with the complete GTS registration payload.

**Inputs**: `mfe.json` (human-authored MFE config), `dist/mfe.gts-manifest.json` (plugin artifact with `mfInitKey`, per-dep `unwrapKey`/`chunkPath`, and `exposeAssets`), `--base-url` (CLI parameter, sets `metaData.publicPath`)

1. [ ] - `p1` - Read `mfe.json`: extract entries array, extensions array, and schemas array — `inst-read-mfe-json`
2. [ ] - `p1` - Read `dist/mfe.gts-manifest.json`: extract `mfInitKey`, `shared` entries (each with `chunkPath`, `unwrapKey`), and `exposes` (per-module chunk/asset paths); **IF** `dist/mfe.gts-manifest.json` is absent or unreadable **FAIL** with descriptive error — `inst-read-gts-manifest`
3. [ ] - `p1` - Build the `MfManifest` GTS entity: set `metaData.publicPath` to `--base-url`, copy `mfInitKey`, copy `shared` entries (with `chunkPath` and `unwrapKey`), copy `metaData.remoteEntry`, `name`, and other top-level metadata fields from `mfe.gts-manifest.json` — `inst-build-mf-manifest-entity`
4. [ ] - `p1` - **FOR EACH** entry in `mfe.json`: resolve `entry.exposedModule` against `mfe.gts-manifest.json`'s `exposes[]` array by matching `exposedModule` against each `exposes[].path`; **IF** no match is found **FAIL** with the unmatched expose name; inject the matched expose's `assets` as `entry.exposeAssets` — `inst-inject-expose-assets`
5. [ ] - `p1` - Assemble `mfe.generated.json`: `{ manifest: <MfManifest entity>, entries: <enriched entries>, extensions: <from mfe.json>, schemas: <from mfe.json> }` — `inst-assemble-output`
6. [ ] - `p1` - Write the assembled object to `mfe.generated.json` — `inst-write-output`

### Resolve MF Init Promise

- [x] `p1` - **ID**: `cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise`

Resolves the MF 2.0 `__mf_init__` global promise with the per-load `FederationHost` instance so `__loadShare__` proxy chunks emitted by `@module-federation/vite` can call `instance.loadShare(pkgName)` natively during their evaluation. This MUST happen before any blob-URL'd chunk is dynamically imported.

The `mfInitKey` is extracted from `remoteEntry.js` at build time by the `frontx-mf-gts` plugin and stored in `manifest.mfInitKey`. No key derivation formula is applied at runtime.

1. [x] - `p1` - Read `mfInitKey` directly from `manifest.mfInitKey` (set at build time by the `frontx-mf-gts` plugin) — `inst-read-key`
2. [x] - `p1` - Read `globalThis[mfInitKey]`; **IF** absent or `initPromise` is absent **RETURN** `MfeLoadError` (the MFE bundle expects this global to be present) — `inst-check-global`
3. [x] - `p1` - Call the resolver function stored at `globalThis[mfInitKey].initResolve(federationHostInstance)` to deliver the real `FederationHost` instance — `inst-resolve-instance`
4. [x] - `p1` - Each load uses its own manifest's `mfInitKey`; distinct keys guarantee that concurrent loads resolve independent `__mf_init__` entries without interfering with each other — `inst-concurrent-safety`

---

## 4. States (CDSL)

### LoadBlobState (Per-Load Isolation Map)

- [x] `p1` - **ID**: `cpt-frontx-state-mfe-isolation-load-blob-state`

Tracks the blob URL map and visitation set for a single MFE load call. Created fresh for each `loadExposedModuleIsolated()` invocation. The initial metadata is sourced from the resolved `MfManifest` GTS entity.

1. [x] - `p1` - **FROM** INIT **TO** ACTIVE **WHEN** the `MfManifest` has been resolved and `loadExposedModuleIsolated()` creates a new `LoadBlobState` with empty `blobUrlMap` and `visited` set — `inst-state-init`
2. [x] - `p1` - **FROM** ACTIVE **TO** ACTIVE (VISITED) **WHEN** `createBlobUrlChain` adds a filename to `visited` — `inst-state-visited`
3. [x] - `p1` - **FROM** ACTIVE (VISITED) **TO** ACTIVE (MAPPED) **WHEN** a blob URL is inserted into `blobUrlMap` for the visited filename — `inst-state-mapped`
4. [x] - `p1` - **FROM** ACTIVE **TO** COMPLETE **WHEN** the expose blob URL is successfully imported and the lifecycle module is returned — `inst-state-complete`
5. [x] - `p1` - **FROM** ACTIVE **TO** FAILED **WHEN** any step throws `MfeLoadError` — `inst-state-failed`
6. [x] - `p2` - `LoadBlobState` instances are not retained after the load completes; blob URLs in `blobUrlMap` are never revoked and persist for the page lifetime — `inst-state-gc`

### SourceTextCache (Handler-Level)

- [x] `p1` - **ID**: `cpt-frontx-state-mfe-isolation-source-cache`

Tracks the fetch state of each individual chunk URL across all loads for the lifetime of the `MfeHandlerMF` instance. The cache stores source text for chunk files (JS modules in the blob URL chain). Manifest content is resolved from GTS entities and cached in the handler's `ManifestCache`, not in this source text cache.

1. [x] - `p1` - **FROM** ABSENT **TO** PENDING **WHEN** a fetch for `absoluteChunkUrl` is initiated and the `Promise<string>` is stored in `sourceTextCache` — `inst-cache-pending`
2. [x] - `p1` - **FROM** PENDING **TO** RESOLVED **WHEN** `fetch()` succeeds and the promise resolves with source text — `inst-cache-resolved`
3. [x] - `p1` - **FROM** PENDING **TO** ABSENT **WHEN** `fetch()` fails; the entry is removed from `sourceTextCache` to avoid a stuck negative cache — `inst-cache-evicted`
4. [x] - `p1` - **FROM** RESOLVED **TO** RESOLVED **WHEN** subsequent loads request the same URL (cache hit; no new fetch) — `inst-cache-hit-state`

### SharedDepProviders (Handler-Level)

- [x] `p1` - **ID**: `cpt-frontx-state-mfe-isolation-shared-dep-providers`

Tracks the canonical provider URL for each shared dependency `name@version` across all MFE packages for the handler lifetime. The first MFE to provide a given shared dep registers its `baseUrl` and `chunkPath` as canonical. Subsequent MFEs resolve to the same canonical URL, ensuring `sourceTextCache` hits and at most one network fetch per unique shared dep regardless of how many MFE packages declare it. Each load still creates fresh blob URLs from the cached source text — isolation is preserved.

1. [x] - `p1` - **FROM** ABSENT **TO** REGISTERED **WHEN** `buildSharedEntry()` encounters a `dep.name@dep.version` not yet in `sharedDepProviders` and registers `{ baseUrl: loadState.baseUrl, chunkPath: dep.chunkPath }` — `inst-provider-register`
2. [x] - `p1` - **FROM** REGISTERED **TO** REGISTERED (HIT) **WHEN** a subsequent MFE load calls `buildSharedEntry()` for the same `name@version` and reuses the existing canonical provider — `inst-provider-hit`

---

## 5. Definitions of Done

### Blob URL Isolation Core

- [x] `p1` - **ID**: `cpt-frontx-dod-mfe-isolation-blob-core`

`MfeHandlerMF` achieves per-load module isolation through the blob URL chain mechanism. Each load produces independent module evaluations with no shared object references between MFEs.

**Implementation details**:
- File: `packages/screensets/src/mfe/handler/mf-handler.ts`
- Key types: `LoadBlobState` (per-load), `ManifestCache`, `MfeLoaderConfig`
- Constructor: `MfeHandlerMF(handledBaseTypeId: string, config?: MfeLoaderConfig)` — does NOT take `typeSystem`; the registry owns type hierarchy checks. Consumer passes the GTS base type ID constant (e.g., `HAI3_MFE_ENTRY_MF`) at instantiation.
- Public entry: `MfeHandlerMF.load(entry: MfeEntryMF): Promise<MfeEntryLifecycle<ChildMfeBridge>>`

**Implements**:
- `cpt-frontx-flow-mfe-isolation-load`
- `cpt-frontx-algo-mfe-isolation-parse-manifest-expose-metadata`
- `cpt-frontx-algo-mfe-isolation-build-share-scope`
- `cpt-frontx-algo-mfe-isolation-resolve-mf-init-promise`
- `cpt-frontx-algo-mfe-isolation-blob-url-get`
- `cpt-frontx-algo-mfe-isolation-fetch-source`
- `cpt-frontx-algo-mfe-isolation-blob-url-chain`
- `cpt-frontx-algo-mfe-isolation-parse-imports`
- `cpt-frontx-algo-mfe-isolation-rewrite-module-imports`
- `cpt-frontx-algo-mfe-isolation-wrap-lifecycle-stylesheets`
- `cpt-frontx-algo-mfe-isolation-inject-remote-stylesheets`
- `cpt-frontx-algo-mfe-isolation-remove-injected-stylesheets`
- `cpt-frontx-algo-mfe-isolation-upsert-mount-style-element`
- `cpt-frontx-state-mfe-isolation-load-blob-state`
- `cpt-frontx-state-mfe-isolation-source-cache`
- `cpt-frontx-state-mfe-isolation-shared-dep-providers`

**Covers (PRD)**:
- `cpt-frontx-fr-blob-fresh-eval`
- `cpt-frontx-fr-blob-no-revoke`
- `cpt-frontx-fr-blob-source-cache`
- `cpt-frontx-fr-blob-import-rewriting`
- `cpt-frontx-fr-blob-recursive-chain`
- `cpt-frontx-fr-blob-per-load-map`
- `cpt-frontx-fr-sharescope-construction` (createInstance() + get() factories with unwrapKey)
- `cpt-frontx-fr-sharescope-concurrent`
- `cpt-frontx-nfr-perf-blob-overhead`
- `cpt-frontx-nfr-sec-csp-blob`

**Covers (DESIGN)**:
- `cpt-frontx-principle-mfe-isolation`
- `cpt-frontx-constraint-zero-cross-deps-at-l1`
- `cpt-frontx-component-screensets` (blob loader subsystem)
- `cpt-frontx-seq-mfe-loading`

### Module Federation Vite Plugin and frontx-mf-gts

- [x] `p1` - **ID**: `cpt-frontx-dod-mfe-isolation-mf-vite-plugin`

The `@module-federation/vite` build plugin produces MFE bundles where all shared dependency imports are transformed natively, and a declarative `mf-manifest.json` is emitted alongside chunk files with stable chunk paths. The `frontx-mf-gts` Vite plugin runs in `closeBundle` after `@module-federation/vite` and emits `dist/mfe.gts-manifest.json` — the complete build-time metadata artifact consumed by the generation script.

**Implementation details**:
- Dependency: `@module-federation/vite` (base build plugin)
- `frontx-mf-gts` Vite plugin: reads `mf-manifest.json`, `remoteEntry.js`, `localSharedImportMap-*.js`, and `mfe.json`; emits `dist/mfe.gts-manifest.json` with `mfInitKey`, per-dep `unwrapKey`/`chunkPath`, and `exposeAssets` per entry
- Both plugins are registered in each MFE's `vite.config.ts`; the generation script consumes only `mfe.gts-manifest.json`

**Implements**:
- `cpt-frontx-flow-mfe-isolation-build-v2` (steps 1-9)
- `cpt-frontx-algo-mfe-isolation-generate-mfe-config`

**Covers (PRD)**:
- `cpt-frontx-fr-externalize-filenames`
- `cpt-frontx-fr-externalize-build-only`

**Covers (DESIGN)**:
- `cpt-frontx-principle-mfe-isolation` (build-side enforcement)
- `cpt-frontx-component-screensets` (shared Vite tooling)
- `cpt-frontx-contract-federation-runtime`

### MFE-Internal Dataflow

- [x] `p1` - **ID**: `cpt-frontx-dod-mfe-isolation-internal-dataflow`

Each MFE package bootstraps its own isolated `HAI3App` and exposes it for use by lifecycle React components. No direct Redux imports appear in MFE source code.

**Implementation details**:
- Files: `src/mfe_packages/<mfe-name>/src/init.ts` (module-level bootstrap)
- Pattern: `createHAI3().use(effects()).use(queryCacheShared()).use(mock()).build()` — `queryCacheShared()` joins the host `queryCache()` runtime; do not use `queryCache()` in MFE `init.ts`
- MFE lifecycle components wrap their React tree in `<HAI3Provider app={mfeApp}>`

**Implements**:
- `cpt-frontx-flow-mfe-isolation-mfe-bootstrap`

**Covers (PRD)**:
- `cpt-frontx-fr-dataflow-internal-app`
- `cpt-frontx-fr-dataflow-no-redux`

**Covers (DESIGN)**:
- `cpt-frontx-principle-mfe-isolation` (runtime-side enforcement)
- `cpt-frontx-constraint-zero-cross-deps-at-l1`

### MfManifest Type and GTS Schema Update

- [x] `p1` - **ID**: `cpt-frontx-dod-mfe-isolation-mfmanifest-type`

The `MfManifest` TypeScript interface and the GTS schema `mf_manifest.v1.json` (registered as `gts://gts.hai3.mfes.mfe.mf_manifest.v1~`) are updated to include the fields produced by the `frontx-mf-gts` Vite plugin. There is no envelope field, no version detection, and no backward compatibility path. The GTS schema `mf_manifest.v1.json` keeps its current identifier — "v1" is simply the schema's stable ID, not a version in a backward-compat sense.

Two fields added by the `frontx-mf-gts` plugin (from the handler's perspective):
- `mfInitKey: string` — the key under which the MFE bundle stores its `__mf_init__` global; extracted from `remoteEntry.js` at build time; used by the handler to read `globalThis[mfInitKey].initPromise`
- Per-shared-dep: `chunkPath: string` — relative chunk filename; and `unwrapKey: string | null` — the export key to access the module inside the chunk (`null` means `'default'` is used)

> **Cross-reference**: The authoritative field listing for `MfManifest` (including `shared`, `metaData`, `exposes`, and their sub-fields) is maintained in the screenset-registry FEATURE DoD `cpt-frontx-dod-screenset-registry-mfmanifest-schema-update`. This isolation FEATURE DoD covers only the runtime handler's perspective on the type.

**Implementation details**:
- File: `packages/screensets/src/mfe/types/mf-manifest.ts`
- The `GtsPlugin` registers `mf_manifest.v1.json` as a first-class schema alongside all other built-in schemas
- All runtime code (`MfeHandlerMF`, `ManifestCache`, `resolveManifest()`) works exclusively with the `MfManifest` TypeScript interface; no runtime code imports or references GTS schemas directly

**Covers (PRD)**:
- `cpt-frontx-fr-blob-source-cache` (chunk paths from manifest enable cache keying)
- `cpt-frontx-fr-sharescope-construction` (chunk path determines whether blob get() is created)
- `cpt-frontx-fr-externalize-filenames` (manifest provides stable chunk paths)

**Covers (DESIGN)**:
- `cpt-frontx-contract-mfe-manifest`

---

### ChildMfeBridge Abstract Class Contract

- [x] `p1` - **ID**: `cpt-frontx-dod-mfe-isolation-child-bridge-contract`

`ChildMfeBridge` is the object passed to the MFE by the host when `MfeEntryLifecycle.mount(bridge)` is called. The MFE receives it and may use it to communicate back with the host. It is an abstract class (consistent with all other public abstractions: `MfeHandler`, `MfeBridgeFactory`, `ScreensetsRegistry`, `ActionsChainsMediator`, `RuntimeCoordinator`) — concrete implementations are `@internal`. The abstract class defines six members:

- `domainId` — the ID of the domain this extension belongs to; provided by the registry at bridge creation
- `instanceId` — the extension instance ID; used as the routing key for extension-level action delivery
- `executeActionsChain` — allows the child MFE to send actions back to the host mediator
- `subscribeToProperty` / `getProperty` — read-only access to shared property values broadcast by the host
- `registerActionHandler(actionTypeId, handler)` — registers an `ActionHandler` abstract class instance for a specific action type so the mediator can route actions targeted at `instanceId` and `actionTypeId`; the bridge wires each call to `mediator.registerHandler(extensionId, actionTypeId, handler)`; all handlers are automatically unregistered when the bridge is disposed. The MFE may call this multiple times — once per action type it handles.

`ActionHandler` is an abstract class: `abstract handleAction(actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void>`. It is the only handler contract — no `ActionHandlerFn` function alias, no `ActionHandler` interface. The MFE subclasses `ActionHandler` for each action type it wishes to handle; the system manages routing and lifecycle. Handlers are invoked by the mediator via `handler.handleAction(actionTypeId, payload)` when an actions chain targets this extension.

**`domainActions` field semantics**: The `domainActions` array on `MfeEntry` declares **all action types this entry can receive**, regardless of delivery path. The field name is a legacy from the era when only domain-level delivery existed, but it now covers both paths:
- **Domain-level delivery** — the domain's per-action-type `ActionHandler` instances route lifecycle actions to all mounted extensions in the domain
- **Extension-targeted delivery** — the mediator calls `handler.handleAction(actionTypeId, payload)` directly on the registered `ActionHandler` instance when `action.target` equals the extension instance ID

Action target contract enforcement is handled by GTS schema validation: each action schema constrains its `target` field via `x-gts-ref`. Lifecycle action schemas restrict `target` to domain IDs only; custom MFE action schemas restrict `target` to specific extension IDs. The mediator validates each action instance against its schema before routing — invalid targets are rejected by the type system. No runtime `includes()` checks are needed.

**Implements**:
- `cpt-frontx-flow-screenset-registry-register-extension-handler`

**Covers (DESIGN)**:
- `cpt-frontx-interface-child-mfe-bridge`
- `cpt-frontx-seq-extension-action-delivery`

---

## 6. Acceptance Criteria

- [x] Two MFEs loaded sequentially with the same shared dependency chunk path produce module instances where `Object.is(mfeA_React, mfeB_React)` is `false`
- [x] Two MFEs loaded with the same chunk path result in at most one network fetch for that chunk URL (source text cache deduplication)
- [x] Two MFEs loaded concurrently each receive their own unique blob URL and fresh module evaluation; no `MfeLoadError` is thrown in the concurrent case
- [x] `import.meta.url` occurrences in blob-URL'd chunk source text are replaced with the manifest base URL before the blob is created; post-rewrite source text does not contain `import.meta.url`
- [x] Before any blob-URL'd chunk is dynamically imported, `globalThis[manifest.mfInitKey].initPromise` is resolved with the per-load `FederationHost` instance (created via `createInstance()`); `__loadShare__` proxy chunks that call `instance.loadShare(pkgName)` receive a blob-URL'd module via the `get()` factory using `unwrapKey` from the manifest
- [x] `globalThis.__federation_shared__` is never written to during an MFE load
- [x] After `import(blobUrl)` resolves, `URL.revokeObjectURL` is never called for any blob URL created during an MFE load
- [x] A missing or unresolvable manifest GTS reference throws `MfeLoadError` before any chunk fetch is attempted
- [x] A manifest missing required fields (shared, metaData) or an entry missing `exposeAssets` throws `MfeLoadError` before any chunk fetch is attempted
- [x] The registration layer MUST split `mf-manifest.json` content so that the `MfManifest` GTS entity carries shared data and each `MfeEntryMF` carries per-module `exposeAssets`
- [x] A 404 or network error fetching any chunk source text throws `MfeLoadError` with the chunk URL and failure reason; the failed fetch is removed from the source text cache
- [x] After `vite build` with `@module-federation/vite`, a `mf-manifest.json` file is emitted alongside chunk files; it contains `exposes` entries with `assets.js.sync` chunk paths and `shared` entries with `assets.js.sync` chunk paths
- [x] After `vite build` with `@module-federation/vite`, shared dependency transforms are applied natively across all chunks without a separate post-processing step
- [x] MFE `init.ts` files contain no direct imports from `react-redux`, `redux`, or `@reduxjs/toolkit`; all store access goes through `@cyberfabric/react` APIs
- [ ] Running the generation script with a valid `mfe.json`, `dist/mfe.gts-manifest.json`, and `--base-url` produces `mfe.generated.json` containing: a `MfManifest` GTS entity with `metaData.publicPath` equal to the supplied `--base-url`, `mfInitKey` from the plugin manifest, per-dep `unwrapKey`/`chunkPath` on each shared entry, entries with `exposeAssets.js.sync` populated from `mfe.gts-manifest.json`'s `exposes[]`, and the same `extensions` and `schemas` arrays as `mfe.json`
- [ ] Running the generation script when `dist/mfe.gts-manifest.json` is absent exits with a non-zero status and a descriptive error message
- [ ] Running the generation script when an entry's `exposedModule` has no matching path in `mfe.gts-manifest.json`'s `exposes[]` exits with a non-zero status naming the unmatched module

---

## Additional Context

**Never-revoke policy rationale**: The `import()` function resolves when a module is parsed and its top-level synchronous code has run. Modules with top-level `await` (such as `__loadShare__` proxy chunks that `await instance.loadShare('react')`) continue evaluating asynchronously after the `import()` promise resolves. If the blob URL is revoked at this point, the async continuation cannot fetch the already-queued sub-module evaluation and fails with `ERR_FILE_NOT_FOUND`. Blob URLs are cleaned up automatically by the browser on page unload; no manual revocation is needed.

**Per-load map vs. handler-level source cache**: The `blobUrlMap` is intentionally scoped to a single load because each MFE must get a unique `URL.createObjectURL()` result (even from the same source text) to achieve a fresh module evaluation. The `sourceTextCache` is intentionally handler-level to avoid redundant network fetches across multiple loads that share a dependency version.

**Shared dependency chunk resolution**: `mfe.gts-manifest.json` (produced by the `frontx-mf-gts` plugin) provides `chunkPath` and `unwrapKey` directly on each shared dependency entry. The blob URL isolation pipeline reads these fields; any dependency without a `chunkPath` is skipped and the MFE falls back to its own bundled copy. `unwrapKey` eliminates the single-export heuristic — the exact module export key is known at build time.

**CSP compatibility**: The isolation mechanism uses `Blob` objects and `URL.createObjectURL`, not `eval()` or `new Function()`. The only required CSP directive addition is `blob:` in `script-src`. The `cpt-frontx-nfr-sec-csp-blob` requirement is satisfied by construction.

**Per-load instance isolation for concurrent loads**: Each load creates an independent `FederationHost` instance via `createInstance()` and resolves a distinct `globalThis[mfInitKey]` entry where `mfInitKey` is read directly from `manifest.mfInitKey` (extracted at build time by the `frontx-mf-gts` plugin). Because different MFEs have different `mfInitKey` values, their `__mf_init__` globals do not overlap and concurrent loads never overwrite each other's instance. The `FederationHost` instance captures its own `LoadBlobState` through the `get()` factory closures, so `loadShare()` calls from any `__loadShare__` proxy chunk always reference the correct per-load blob URL map regardless of concurrency. `globalThis.__federation_shared__` is never written to because MF 2.0 chunks do not read it.

**`import.meta.url` rewriting**: The blob URL mechanism assigns blob URLs as the module's `import.meta.url`, not the original deployment origin. MFE chunks produced by `@module-federation/vite` may include preload helper code that constructs absolute URLs from `import.meta.url`. To fix this, the handler replaces every `import.meta.url` occurrence in the source text with the resolved absolute base URL (from `manifest.metaData.publicPath`) before creating the `Blob`. This is applied in the same rewriting pass as relative import specifier replacement.
