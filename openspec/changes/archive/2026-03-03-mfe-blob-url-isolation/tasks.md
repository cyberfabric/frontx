## 1. Type Definitions

- [x] 1.1 Add optional `chunkPath?: string` field to `SharedDependencyConfig` in `packages/screensets/src/mfe/types/mf-manifest.ts`. Update the JSDoc to explain that `chunkPath` is the relative path of the built shared dependency chunk (e.g., `__federation_shared_react.js`) and that for `MfeHandlerMF`, all dependencies with `chunkPath` receive blob URL isolation unconditionally. Remove the `singleton?: boolean` field and all its associated JSDoc from `SharedDependencyConfig` — the field is non-functional (Module Federation singleton semantics do not work with this plugin) and with blob URL isolation there is no mechanism for it to have any effect.

- [x] 1.2 Update the GTS schema at `packages/screensets/src/mfe/gts/hai3.mfes/schemas/mfe/mf_manifest.v1.json` — three changes to the shared dependency item schema: (a) remove the `singleton` property (the field is non-functional and removed from the specification entirely); (b) add `"chunkPath": { "type": "string" }` as an optional property to the shared dependency item properties (matches the `chunkPath?: string` field added to `SharedDependencyConfig` in task 1.1); (c) change the `required` array from `["name", "requiredVersion"]` to `["name"]` — `requiredVersion` is optional in the TypeScript interface (`requiredVersion?: string`) and existing `mfe.json` files already omit it for some entries (e.g., `tailwindcss`, `@hai3/uikit`), so the GTS schema must match.

## 2. Blob URL Isolation in MfeHandlerMF

- [x] 2.1 Add a private `sourceTextCache: Map<string, Promise<string>>` field to `MfeHandlerMF` in `packages/screensets/src/mfe/handler/mf-handler.ts`. The cache stores in-flight fetch promises (not just resolved strings) to deduplicate concurrent requests for the same chunk URL. The cache is scoped to the handler instance and never exposed publicly.

- [x] 2.2 Add a private `rewriteRelativeImports(sourceText: string, baseUrl: string): string` method to `MfeHandlerMF`. It replaces ALL relative imports (`from './` and `from "./`) with absolute URLs derived from `baseUrl`. Uses `String.prototype.replace()` — no AST parsing, no `es-module-lexer`. Non-relative imports (bare specifiers, absolute URLs) are not modified.

- [x] 2.3 Add a private `createBlobUrlChain(loadState: LoadBlobState, chunkPath: string, baseUrl: string): Promise<string>` method to `MfeHandlerMF`. It fetches source text for the chunk (using `fetchSourceText`), rewrites relative imports to absolute URLs (using `rewriteRelativeImports`), creates a `Blob` with type `text/javascript`, calls `URL.createObjectURL(blob)` to produce a unique blob URL, stores the blob URL in `loadState.blobUrlMap` keyed by chunk filename (for import rewriting of dependent chunks), and recursively processes any relative imports found in the source text that also need blob URL creation. Blob URLs are NOT revoked — modules with top-level `await` continue evaluating after `import()` returns.

- [x] 2.4 Add a private `fetchSourceText(absoluteChunkUrl: string): Promise<string>` method to `MfeHandlerMF`. It checks `sourceTextCache` first; if not cached, fetches via `fetch()`, stores the promise in the cache (for deduplication), and returns the source text string. On fetch failure, throws `MfeLoadError` with the chunk URL and failure reason.

- [x] 2.5 Add a private `createBlobUrlGet(chunkPath: string, remoteEntryUrl: string): () => Promise<() => unknown>` method to `MfeHandlerMF`. It derives the absolute chunk URL via `new URL(chunkPath, remoteEntryUrl).href`, fetches source text (using `fetchSourceText`), rewrites relative imports (using `rewriteRelativeImports` with the remoteEntry base URL), creates a blob URL via `createBlobUrlChain`, and returns a module factory `() => module`.

- [x] 2.6 Update `buildShareScope()` in `MfeHandlerMF` to wrap the `get()` function with blob URL isolation for shared dependencies that have a `chunkPath`. For each `sharedDependencies` entry: if `chunkPath` is present, replace the original `get()` with the blob-URL-based `get()` wrapper (from task 2.5) using the directory portion of `manifest.remoteEntry` as the base URL. If `chunkPath` is omitted, pass through the original federation `get()` function unchanged.

## 3. Remove Dead Code from MfeHandlerMF

- [x] 3.1 Remove the `snapshotScopeKeys()` private method from `MfeHandlerMF`.

- [x] 3.2 Remove the `registerMfeSharedModules()` private method from `MfeHandlerMF`.

- [x] 3.3 Remove the snapshot-before-init and registration-after-init logic from `loadExposedModuleIsolated()`. The method uses `buildShareScope()` to construct the scope and `writeShareScope()` to write entries to `globalThis.__federation_shared__` — no snapshot/diff/registration. Container loading uses the remote entry's default export directly.

- [x] 3.4 Remove the `setFederationShared` import from `mf-handler.ts` (it is only used by `registerMfeSharedModules`). Keep `getFederationShared` (used by `buildShareScope`).

## 4. Remove Host Bootstrap from Microfrontends Plugin

- [x] 4.1 Remove the `HostSharedDependency` interface export from `packages/framework/src/plugins/microfrontends/index.ts`.

- [x] 4.2 Remove the `hostSharedDependencies` field from the `MicrofrontendsConfig` interface.

- [x] 4.3 Remove the `bootstrapHostSharedDependencies()` function and its call from `onInit()`.

- [x] 4.4 Remove the host-local federation types (`FederationEntry`, `FederationMap`, `readFederationShared`, `writeFederationShared`) from `packages/framework/src/plugins/microfrontends/index.ts` since they are only used by the bootstrap logic.

- [x] 4.5 Remove the `hostSharedDependencies` configuration from `src/app/main.tsx` (the host app).

## 5. Update Tests

- [x] 5.1 Update `packages/screensets/__tests__/mfe/handler/share-scope.test.ts`: remove the `8.2 registerMfeSharedModules` test group (3 tests) and the `8.4 Integration — second MFE reuses modules registered by first MFE` test. These test the removed `registerMfeSharedModules` behavior.

- [x] 5.2 Add new tests to `share-scope.test.ts` for blob URL isolation: (a) shared dep with `chunkPath` gets a blob-URL-wrapped `get()` in the shareScope; (b) shared dep without `chunkPath` passes through the original federation `get()`; (c) source text cache prevents duplicate network fetches for the same chunk URL; (d) `MfeLoadError` is thrown when chunk fetch fails.

- [x] 5.3 Remove the entire `packages/framework/__tests__/plugins/microfrontends/host-bootstrap.test.ts` test file (tests the removed `hostSharedDependencies` / `bootstrapHostSharedDependencies` feature).

- [x] 5.4 Update `packages/framework/__tests__/plugins/microfrontends/plugin.test.ts` and `packages/framework/__tests__/plugins/microfrontends.test.ts` if they reference `hostSharedDependencies` in plugin construction — remove those references.

- [x] 5.5 Run the full screensets test suite (`cd packages/screensets && npx vitest run`) and framework test suite (`cd packages/framework && npx vitest run`) to verify all tests pass.

## 6. Custom Vite Plugin

- [x] 6.1 Create `src/mfe_packages/shared/vite-plugin-hai3-externalize.ts` — the custom Vite plugin that transforms ALL `import` statements for shared dependencies into `importShared()` calls across the entire MFE bundle. The plugin reads the shared package list from the federation plugin's `shared` configuration. It runs during `vite build` only (no-op in dev mode). It does not transform files that already contain `importShared()` calls for the target package.

- [x] 6.2 Add deterministic chunk filename configuration to the plugin: shared dependency chunks are emitted as `__federation_shared_<packageName>.js` (no content hashes). Non-shared chunks may retain content hashes. Scoped packages use the full name (e.g., `__federation_shared_@hai3/uikit.js`).

- [x] 6.3 Add the `hai3-mfe-externalize` plugin to `src/mfe_packages/demo-mfe/vite.config.ts` — import from the shared location and add to the plugins array after the federation plugin.

- [x] 6.4 Add the `hai3-mfe-externalize` plugin to `src/mfe_packages/_blank-mfe/vite.config.ts`.

## 7. MFE Manifest Updates

- [x] 7.1 Add `chunkPath` values to each `sharedDependencies` entry in `src/mfe_packages/demo-mfe/mfe.json`. Use deterministic filenames: `__federation_shared_react.js`, `__federation_shared_react-dom.js`, `__federation_shared_tailwindcss.js`, `__federation_shared_@hai3/uikit.js`, etc. Remove `"singleton": false` from every shared dependency entry in the file — the field is removed from the specification entirely.

- [x] 7.2 Add `chunkPath` values to each `sharedDependencies` entry in `src/mfe_packages/_blank-mfe/mfe.json` using the same deterministic filename pattern. Remove `"singleton": false` from every shared dependency entry in the file.

## 8. Build Verification

- [x] 8.1 Build the demo-mfe (`cd src/mfe_packages/demo-mfe && npx vite build`) and verify that shared dependency chunks are emitted with deterministic filenames (no content hashes) matching the `chunkPath` values in `mfe.json`.

- [x] 8.2 Rebuild `@hai3/screensets` (`npm run build --workspace=@hai3/screensets`) and `@hai3/framework` (`npm run build --workspace=@hai3/framework`) to ensure the type and implementation changes compile correctly.

- [x] 8.3 Run the full test suites again after all changes: screensets (`cd packages/screensets && npx vitest run`), framework (`cd packages/framework && npx vitest run`), react (`cd packages/react && npx vitest run`).

## 9. Dead Code Cleanup

- [x] 9.1 Check if `setFederationShared` in `packages/screensets/src/mfe/handler/federation-types.ts` has any remaining callers after removing `registerMfeSharedModules`. If unused, remove the export. Keep `getFederationShared` (used by `buildShareScope`).

- [x] 9.2 Remove any leftover references to `snapshotScopeKeys`, `registerMfeSharedModules`, `HostSharedDependency`, or `bootstrapHostSharedDependencies` from JSDoc comments, type re-exports, or barrel files across the codebase.

## 10. Bug Fix: Blob URL Revocation Timing

Addresses: Design Decision 8 (revised). Root cause: the `finally` block in `loadExposedModuleIsolated` revokes all blob URLs immediately after `await import(exposeBlobUrl)` returns, but `import()` resolves at parse time, not after full async evaluation. Modules with top-level `await` (e.g., `await importShared('react')`) continue evaluating after `import()` returns, and their `get()` closures create new blob URLs that are immediately revoked by the `finally` block, causing `net::ERR_FILE_NOT_FOUND`. Additionally, concurrent loads overwrite `globalThis.__federation_shared__` entries, creating cross-load blob URL reference corruption.

- [x] 10.1 Remove the `blobUrls: string[]` field from the `LoadBlobState` interface in `packages/screensets/src/mfe/handler/mf-handler.ts` (line 41). This array was used solely to track blob URLs for revocation. With revocation removed, the field is dead code. Update the `loadState` initialization in `loadExposedModuleIsolated` (line 164-169) to remove the `blobUrls: []` entry.

- [x] 10.2 Remove the `finally` block from `loadExposedModuleIsolated` in `packages/screensets/src/mfe/handler/mf-handler.ts` (lines 210-214). The entire `for (const url of loadState.blobUrls) { URL.revokeObjectURL(url); }` loop must be deleted. The `try` keyword on line 171 becomes unnecessary — remove it so the method body is a flat sequence of statements (no try/finally). Keep all other logic in the method unchanged.

- [x] 10.3 Remove the `loadState.blobUrls.push(blobUrl)` line from `createBlobUrlChain` in `packages/screensets/src/mfe/handler/mf-handler.ts` (line 365). The blob URL is still stored in `loadState.blobUrlMap` for import rewriting — only the revocation tracking array reference is removed.

- [x] 10.4 Update the JSDoc comment on `loadExposedModuleIsolated` (lines 143-152) to remove the statement "After import resolves (all modules evaluated), blob URLs are revoked". Replace with: "Blob URLs are NOT revoked — modules with top-level await continue evaluating after import() resolves, and revoking during async evaluation causes ERR_FILE_NOT_FOUND. Blob URLs are cleaned up by the browser on page unload."

- [x] 10.5 Update `packages/screensets/__tests__/mfe/handler/mf-handler.test.ts` — find and update any test assertions that verify `URL.revokeObjectURL` is called after load. Remove those assertions or replace them with assertions that `revokeObjectURL` is NOT called. If a test specifically validates the revocation behavior (e.g., "blob URLs are revoked after import"), update its description and assertions to verify that blob URLs are NOT revoked.

- [x] 10.6 Run the screensets test suite (`cd packages/screensets && npx vitest run`) to verify all tests pass with the revocation removal.

## 11. Bug Fix: Domain State Corruption from Independent Serialization Queues

Addresses: Design Decision 9. Root cause: `handleScreenSwap` calls `unmountExtension(oldExtId)` then `mountExtension(newExtId)`, each serialized on different entity ID queues via `OperationSerializer`. Concurrent swaps targeting the same domain execute on different serializer queues, causing interleaved `setMountedExtension(domain, ...)` calls that corrupt domain-level state.

- [x] 11.1 Add ONE new callback to the `ExtensionLifecycleCallbacks` interface in `packages/screensets/src/mfe/runtime/extension-lifecycle-action-handler.ts`:
  - `serializeOnDomain: (domainId: string, operation: () => Promise<void>) => Promise<void>` — calls `OperationSerializer.serializeOperation(domainId, operation)`. Serializes the entire swap as a single domain-level operation.
  Add JSDoc explaining that this exposes the existing `OperationSerializer.serializeOperation` under a domain key, and that there is no deadlock because the domain queue key is different from the extension entity queue keys used by `unmountExtension`/`mountExtension`.

- [x] 11.2 Update `handleScreenSwap` in `ExtensionLifecycleActionHandler` to wrap the entire unmount-then-mount sequence inside `this.callbacks.serializeOnDomain(this.domainId, async () => { ... })`. Inside the serialized block:
  - Use the EXISTING `this.callbacks.unmountExtension(currentExtId)` for the unmount (no bypass, no direct method).
  - Use the EXISTING `this.callbacks.mountExtension(newExtensionId, container)` for the mount (no bypass, no direct method).
  - There is NO deadlock because the domain queue key (e.g., `"screen-domain-id"`) is different from the entity queue keys (e.g., `"extension-id"`) — `OperationSerializer` serializes per key, and different keys use independent queues.
  - The `getMountedExtension` call and the `containerProvider.getContainer`/`releaseContainer` calls remain unchanged.

- [x] 11.3 Wire the new callback in `DefaultScreensetsRegistry.registerDomain()` (around line 291 in `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`). Add to the `lifecycleCallbacks` object:
  - `serializeOnDomain: (domainId, operation) => this.operationSerializer.serializeOperation(domainId, operation)` — serializes on domain ID.

- [x] 11.4 Update `packages/screensets/__tests__/mfe/runtime/extension-lifecycle-action-handler.test.ts` (or the relevant test file for `ExtensionLifecycleActionHandler`):
  - Add a test that verifies concurrent `mount_ext` actions on a swap-semantic domain are serialized (second swap waits for first to complete). Create two mount_ext actions that target the same domain with different extension IDs, fire them concurrently, and verify that the final `getMountedExtension` returns the second extension (not the first).
  - Add a test that verifies `serializeOnDomain` is called with the domain ID when `handleScreenSwap` executes. Mock the callbacks and verify that `unmountExtension` and `mountExtension` (the standard callbacks) are called inside the serialized block.
  - Add a test that verifies toggle-semantic domains are NOT affected — concurrent mount actions on a toggle domain still execute independently.

- [x] 11.5 Run the full screensets test suite (`cd packages/screensets && npx vitest run`) to verify all tests pass with the domain-level serialization change.

## 12. Bug Fix Verification

- [x] 12.1 Rebuild `@hai3/screensets` (`npm run build --workspace=@hai3/screensets`) to verify the type and implementation changes compile correctly.

- [x] 12.2 Run the full test suites: screensets (`cd packages/screensets && npx vitest run`), framework (`cd packages/framework && npx vitest run`), react (`cd packages/react && npx vitest run`) to verify no regressions.
