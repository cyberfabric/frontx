## 1. Type Definitions

- [ ] 1.1 Add optional `chunkPath?: string` field to `SharedDependencyConfig` in `packages/screensets/src/mfe/types/mf-manifest.ts`. Update the JSDoc to explain that `chunkPath` is the relative path of the built shared dependency chunk (e.g., `__federation_shared_react.js`) and that for `MfeHandlerMF`, all dependencies with `chunkPath` receive blob URL isolation unconditionally. Remove the `singleton?: boolean` field and all its associated JSDoc from `SharedDependencyConfig` — the field is non-functional (Module Federation singleton semantics do not work with this plugin) and with blob URL isolation there is no mechanism for it to have any effect.

- [ ] 1.2 Update the GTS schema at `packages/screensets/src/mfe/gts/hai3.mfes/schemas/mfe/mf_manifest.v1.json` — three changes to the shared dependency item schema: (a) remove the `singleton` property (the field is non-functional and removed from the specification entirely); (b) add `"chunkPath": { "type": "string" }` as an optional property to the shared dependency item properties (matches the `chunkPath?: string` field added to `SharedDependencyConfig` in task 1.1); (c) change the `required` array from `["name", "requiredVersion"]` to `["name"]` — `requiredVersion` is optional in the TypeScript interface (`requiredVersion?: string`) and existing `mfe.json` files already omit it for some entries (e.g., `tailwindcss`, `@hai3/uikit`), so the GTS schema must match.

## 2. Blob URL Isolation in MfeHandlerMF

- [ ] 2.1 Add a private `sourceTextCache: Map<string, Promise<string>>` field to `MfeHandlerMF` in `packages/screensets/src/mfe/handler/mf-handler.ts`. The cache stores in-flight fetch promises (not just resolved strings) to deduplicate concurrent requests for the same chunk URL. The cache is scoped to the handler instance and never exposed publicly.

- [ ] 2.2 Add a private `rewriteRelativeImports(sourceText: string, baseUrl: string): string` method to `MfeHandlerMF`. It replaces ALL relative imports (`from './` and `from "./`) with absolute URLs derived from `baseUrl`. Uses `String.prototype.replace()` — no AST parsing, no `es-module-lexer`. Non-relative imports (bare specifiers, absolute URLs) are not modified.

- [ ] 2.3 Add a private `importViaBlobUrl(sourceText: string): Promise<unknown>` method to `MfeHandlerMF`. It creates a `Blob` from the source text with type `text/javascript`, calls `URL.createObjectURL(blob)`, calls `import(blobUrl)`, and revokes the blob URL in a `finally` block. Returns the imported module.

- [ ] 2.4 Add a private `fetchSourceText(absoluteChunkUrl: string): Promise<string>` method to `MfeHandlerMF`. It checks `sourceTextCache` first; if not cached, fetches via `fetch()`, stores the promise in the cache (for deduplication), and returns the source text string. On fetch failure, throws `MfeLoadError` with the chunk URL and failure reason.

- [ ] 2.5 Add a private `createBlobUrlGet(chunkPath: string, remoteEntryUrl: string): () => Promise<() => unknown>` method to `MfeHandlerMF`. It derives the absolute chunk URL via `new URL(chunkPath, remoteEntryUrl).href`, fetches source text (using `fetchSourceText`), rewrites relative imports (using `rewriteRelativeImports` with the remoteEntry base URL), imports via blob URL (using `importViaBlobUrl`), and returns a module factory `() => module`.

- [ ] 2.6 Update `buildShareScope()` in `MfeHandlerMF` to wrap the `get()` function with blob URL isolation for shared dependencies that have a `chunkPath`. For each `sharedDependencies` entry: if `chunkPath` is present, replace the original `get()` with the blob-URL-based `get()` wrapper (from task 2.5) using the directory portion of `manifest.remoteEntry` as the base URL. If `chunkPath` is omitted, pass through the original federation `get()` function unchanged.

## 3. Remove Dead Code from MfeHandlerMF

- [ ] 3.1 Remove the `snapshotScopeKeys()` private method from `MfeHandlerMF`.

- [ ] 3.2 Remove the `registerMfeSharedModules()` private method from `MfeHandlerMF`.

- [ ] 3.3 Remove the snapshot-before-init and registration-after-init logic from `loadRemoteContainer()`. The method should: build share scope, call `container.init(shareScope)`, cache the container, and return — no snapshot/diff/registration.

- [ ] 3.4 Remove the `setFederationShared` import from `mf-handler.ts` (it is only used by `registerMfeSharedModules`). Keep `getFederationShared` (used by `buildShareScope`).

## 4. Remove Host Bootstrap from Microfrontends Plugin

- [ ] 4.1 Remove the `HostSharedDependency` interface export from `packages/framework/src/plugins/microfrontends/index.ts`.

- [ ] 4.2 Remove the `hostSharedDependencies` field from the `MicrofrontendsConfig` interface.

- [ ] 4.3 Remove the `bootstrapHostSharedDependencies()` function and its call from `onInit()`.

- [ ] 4.4 Remove the host-local federation types (`FederationEntry`, `FederationMap`, `readFederationShared`, `writeFederationShared`) from `packages/framework/src/plugins/microfrontends/index.ts` since they are only used by the bootstrap logic.

- [ ] 4.5 Remove the `hostSharedDependencies` configuration from `src/app/main.tsx` (the host app).

## 5. Update Tests

- [ ] 5.1 Update `packages/screensets/__tests__/mfe/handler/share-scope.test.ts`: remove the `8.2 registerMfeSharedModules` test group (3 tests) and the `8.4 Integration — second MFE reuses modules registered by first MFE` test. These test the removed `registerMfeSharedModules` behavior.

- [ ] 5.2 Add new tests to `share-scope.test.ts` for blob URL isolation: (a) shared dep with `chunkPath` gets a blob-URL-wrapped `get()` in the shareScope; (b) shared dep without `chunkPath` passes through the original federation `get()`; (c) source text cache prevents duplicate network fetches for the same chunk URL; (d) `MfeLoadError` is thrown when chunk fetch fails.

- [ ] 5.3 Remove the entire `packages/framework/__tests__/plugins/microfrontends/host-bootstrap.test.ts` test file (tests the removed `hostSharedDependencies` / `bootstrapHostSharedDependencies` feature).

- [ ] 5.4 Update `packages/framework/__tests__/plugins/microfrontends/plugin.test.ts` and `packages/framework/__tests__/plugins/microfrontends.test.ts` if they reference `hostSharedDependencies` in plugin construction — remove those references.

- [ ] 5.5 Run the full screensets test suite (`cd packages/screensets && npx vitest run`) and framework test suite (`cd packages/framework && npx vitest run`) to verify all tests pass.

## 6. Custom Vite Plugin

- [ ] 6.1 Create `src/mfe_packages/shared/vite-plugin-hai3-externalize.ts` — the custom Vite plugin that transforms ALL `import` statements for shared dependencies into `importShared()` calls across the entire MFE bundle. The plugin reads the shared package list from the federation plugin's `shared` configuration. It runs during `vite build` only (no-op in dev mode). It does not transform files that already contain `importShared()` calls for the target package.

- [ ] 6.2 Add deterministic chunk filename configuration to the plugin: shared dependency chunks are emitted as `__federation_shared_<packageName>.js` (no content hashes). Non-shared chunks may retain content hashes. Scoped packages use the full name (e.g., `__federation_shared_@hai3/uikit.js`).

- [ ] 6.3 Add the `hai3-mfe-externalize` plugin to `src/mfe_packages/demo-mfe/vite.config.ts` — import from the shared location and add to the plugins array after the federation plugin.

- [ ] 6.4 Add the `hai3-mfe-externalize` plugin to `src/mfe_packages/_blank-mfe/vite.config.ts`.

## 7. MFE Manifest Updates

- [ ] 7.1 Add `chunkPath` values to each `sharedDependencies` entry in `src/mfe_packages/demo-mfe/mfe.json`. Use deterministic filenames: `__federation_shared_react.js`, `__federation_shared_react-dom.js`, `__federation_shared_tailwindcss.js`, `__federation_shared_@hai3/uikit.js`, etc. Remove `"singleton": false` from every shared dependency entry in the file — the field is removed from the specification entirely.

- [ ] 7.2 Add `chunkPath` values to each `sharedDependencies` entry in `src/mfe_packages/_blank-mfe/mfe.json` using the same deterministic filename pattern. Remove `"singleton": false` from every shared dependency entry in the file.

## 8. Build Verification

- [ ] 8.1 Build the demo-mfe (`cd src/mfe_packages/demo-mfe && npx vite build`) and verify that shared dependency chunks are emitted with deterministic filenames (no content hashes) matching the `chunkPath` values in `mfe.json`.

- [ ] 8.2 Rebuild `@hai3/screensets` (`npm run build --workspace=@hai3/screensets`) and `@hai3/framework` (`npm run build --workspace=@hai3/framework`) to ensure the type and implementation changes compile correctly.

- [ ] 8.3 Run the full test suites again after all changes: screensets (`cd packages/screensets && npx vitest run`), framework (`cd packages/framework && npx vitest run`), react (`cd packages/react && npx vitest run`).

## 9. Dead Code Cleanup

- [ ] 9.1 Check if `setFederationShared` in `packages/screensets/src/mfe/handler/federation-types.ts` has any remaining callers after removing `registerMfeSharedModules`. If unused, remove the export. Keep `getFederationShared` (used by `buildShareScope`).

- [ ] 9.2 Remove any leftover references to `snapshotScopeKeys`, `registerMfeSharedModules`, `HostSharedDependency`, or `bootstrapHostSharedDependencies` from JSDoc comments, type re-exports, or barrel files across the codebase.
