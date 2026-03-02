## Why

The current `fix-mfe-shared-dependencies` implementation correctly constructs and passes a share scope to `container.init(shareScope)`, but runtime validation revealed three fundamental problems with `@originjs/vite-plugin-federation` that prevent the target architecture (shared code download, isolated instance evaluation per MFE) from working:

1. **ES module URL caching**: `import(url)` always returns the same module object for a given URL — the browser caches by URL identity. The federation runtime's `get()` functions return promises that resolve via `import()` of the same chunk URL, so every MFE that "shares" a dependency gets the **same instance**, preventing per-MFE isolation.
2. **Incomplete externalization**: The federation plugin only transforms `import` statements to `importShared()` in expose entry files. Code-split chunks (e.g., `useScreenTranslations.js`) retain **static imports** to bundled copies (e.g., `import { r as requireReact } from './index-MCx4YXC7.js'`), bypassing the share scope entirely.
3. **No MFE-to-MFE registration**: `init()` in `remoteEntry.js` only writes incoming shareScope entries into globalThis — it does **not** add the MFE's own bundled modules back. The `registerMfeSharedModules()` post-load diff finds nothing new.

These are limitations of the federation plugin itself, not of the HAI3 handler code. The fix requires the handler to take control of module isolation by fetching shared dependency source text and evaluating it via Blob URLs (unique URL = fresh module evaluation), and requires a custom Vite plugin to ensure ALL imports of shared deps are routed through `importShared()`.

## What Changes

- **Blob URL isolation in MfeHandlerMF**: Instead of passing through federation `get()` functions directly, the handler wraps them to fetch source text, create a unique Blob URL per MFE load, and `import()` the Blob URL. This gives each MFE a genuinely fresh module evaluation while sharing the downloaded source text across MFEs (cached by the browser's HTTP cache or an in-memory source cache).
- **Add `chunkPath` to `SharedDependencyConfig`**: Each shared dependency in the manifest gains an optional `chunkPath` field pointing to the relative path of the built chunk file (e.g., `__federation_shared_react.js`). This makes the manifest the single source of truth for loading — the handler can derive absolute URLs from `remoteEntry` base URL + `chunkPath`. Chunk filenames are deterministic (no content hashes) because `mfe.json` is a GTS entity declaration served from the backend — embedding build-specific hashes would couple the backend to every rebuild. Cache busting is handled at the deployment URL level (e.g., versioned paths).
- **Custom Vite plugin (`hai3-mfe-externalize`)**: A build-time plugin that transforms ALL `import` statements for shared dependencies into `importShared()` calls across the entire MFE bundle (not just expose entries). This eliminates the "incomplete externalization" problem and ensures every shared dep access routes through the federation runtime's `moduleCache` (which is per-MFE).
- **Source text rewriting**: When blob-URL-ing a chunk, the handler rewrites ALL relative imports (`from './...'`) to absolute URLs using the `remoteEntry` base URL. Blob URLs have no path context, so every relative import in the chunk source text must be converted to an absolute URL for the blob-evaluated module to resolve its dependencies (federation runtime, helper modules, etc.).
- **Remove `registerMfeSharedModules()` and snapshot logic**: Since MFE-to-MFE registration via `init()` mutation is non-functional with this plugin, remove the dead code path (snapshot before init, diff after init, register new entries).
- **Remove host bootstrap (`hostSharedDependencies`)**: The blob URL approach handles isolation at the handler level. Host-provided entries in globalThis would still return shared instances (same `get()` → same URL problem). Host bootstrap becomes unnecessary — remove `HostSharedDependency`, `bootstrapHostSharedDependencies()`, and the `hostSharedDependencies` config option from the microfrontends plugin.
- **Remove `singleton` field from `SharedDependencyConfig`**: The `singleton` field was based on Module Federation's singleton semantics, which are non-functional with `@originjs/vite-plugin-federation` (the runtime uses the same URL for shared dep chunks, and the browser's ES module cache returns the same module). With blob URL isolation, all dependencies with `chunkPath` get isolated instances unconditionally — there is no mechanism for `singleton: true` to mean anything. Remove the field from the GTS schema, TypeScript interface, and `mfe.json` files.

## Capabilities

### New Capabilities
- `mfe-blob-url-isolation`: MfeHandlerMF uses Blob URLs to achieve per-MFE module isolation for shared dependencies. Covers source text fetching, Blob URL creation, import rewriting, and per-MFE `get()` wrapper generation.
- `mfe-externalize-plugin`: Custom Vite build plugin that transforms all imports of shared dependencies to `importShared()` calls across the entire MFE bundle, ensuring complete externalization.

### Modified Capabilities
- `mfe-share-scope-management`: Remove `registerMfeSharedModules()` and snapshot logic (non-functional with this plugin). Simplify `buildShareScope()` to construct the scope for `init()` without expecting post-init mutations. Add `chunkPath` to `SharedDependencyConfig`.
- `host-share-scope-bootstrap`: Remove entirely — host bootstrap is unnecessary with blob URL isolation.
- `microfrontends`: Update the "Dynamic MFE isolation principles" scenario to reflect that isolation is achieved via Blob URL evaluation, not `singleton: false` configuration. Remove `hostSharedDependencies` from `MicrofrontendsConfig`. Remove the `singleton` field from `SharedDependencyConfig` entirely — it was based on Module Federation singleton semantics that are non-functional with this plugin, and with blob URL isolation all dependencies with `chunkPath` get isolated instances unconditionally.
- `mfe-internal-dataflow`: Update the "MFE store isolation via singleton false semantics" scenario to reference blob URL evaluation as the causal mechanism for store isolation. The `singleton` field is removed entirely — store isolation is a structural consequence of blob URL evaluation, not a configuration option.

## Impact

- **@hai3/screensets** (`packages/screensets/src/mfe/handler/mf-handler.ts`): Primary change location. MfeHandlerMF gains blob URL wrapping logic, source text cache, and import rewriting. `registerMfeSharedModules()` and `snapshotScopeKeys()` are removed.
- **@hai3/screensets** (`packages/screensets/src/mfe/types/mf-manifest.ts`): `SharedDependencyConfig` gains optional `chunkPath` field.
- **@hai3/framework** (`packages/framework/src/plugins/microfrontends/index.ts`): `HostSharedDependency`, `bootstrapHostSharedDependencies()`, and `hostSharedDependencies` config removed. **BREAKING** for any consumer that passes `hostSharedDependencies` (currently only the host app config).
- **MFE build tooling**: New `hai3-mfe-externalize` Vite plugin added to MFE vite configs. Transforms imports at build time.
- **MFE manifests** (`src/mfe_packages/*/mfe.json`): `sharedDependencies` entries gain `chunkPath` values derived from the build output.
- **Host app config** (`src/main.ts` or equivalent): Remove `hostSharedDependencies` from `microfrontends()` call.
- **Rollback**: Revert blob URL wrapping → shared deps fall back to federation default behavior (shared instances, not isolated). MFEs still work but with shared state across instances. Revert the Vite plugin → code-split chunks use static imports again (no isolation for those paths). Both are safe rollbacks — functionality degrades but doesn't break.
- **Bundle size**: No change — the same chunks are downloaded. The blob URL approach changes evaluation strategy, not download size.
- **Performance**: First load of each shared dep per MFE adds ~1-5ms for Blob URL creation + evaluation. Source text is cached in memory after first fetch, so subsequent MFE loads of the same version skip the network entirely.
