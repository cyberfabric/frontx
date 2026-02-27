## 1. Remove MfeVersionMismatchError

- [x] 1.1 Delete `MfeVersionMismatchError` class from `packages/screensets/src/mfe/errors/index.ts` (lines 96-112)
- [x] 1.2 Remove `MfeVersionMismatchError` import and test cases from `packages/screensets/__tests__/mfe/errors/error-classes.test.ts`
- [x] 1.3 Remove any re-exports of `MfeVersionMismatchError` from package barrel files (check `packages/screensets/src/index.ts` and `packages/framework/src/index.ts`)

## 2. Share Scope Construction in MfeHandlerMF

- [x] 2.1 Make `SharedDependencyConfig.requiredVersion` optional (`requiredVersion?: string`) in `packages/screensets/src/mfe/types/mf-manifest.ts` to align the TypeScript type with the base spec ("MAY include requiredVersion") and existing manifests that omit it
- [x] 2.2 Add a private method `buildShareScope(manifest: MfManifest)` to `MfeHandlerMF` in `packages/screensets/src/mfe/handler/mf-handler.ts` that reads `manifest.sharedDependencies`, checks `globalThis.__federation_shared__['default']` for matching packages, applies inline caret-range version matching against `requiredVersion` (no `semver` library — major must match, minor+patch >= required; missing `requiredVersion` means "any version matches"), and returns a shareScope object in the format `{ [packageName]: { [version]: { get, loaded?, scope? } } }`
- [x] 2.3 Replace `await remoteModule.init({})` (line 253) with `await remoteModule.init(this.buildShareScope(manifest))` in `loadRemoteContainer()`
- [x] 2.4 Handle edge case: when `globalThis.__federation_shared__` is empty or undefined, `buildShareScope` returns an empty object (no error thrown)
- [x] 2.5 Bare version strings without caret prefix (e.g., `"3.4.1"`) SHALL be treated as exact match
- [x] 2.6 Add a TypeScript global augmentation for `globalThis.__federation_shared__` in a types file (e.g., `packages/screensets/src/mfe/handler/federation-types.ts`) to avoid `as any` casts

## 3. Post-Load Registration of MFE Bundles

- [x] 3.1 In `loadRemoteContainer()`: snapshot the shareScope keys before `init()`, call `init(shareScope)`, then after init completes compare the mutated shareScope against the snapshot to find NEW entries added by the container
- [x] 3.2 Add a private method `registerMfeSharedModules(shareScope, snapshotBeforeInit)` to `MfeHandlerMF` that copies new entries (added by `init()`) from the shareScope into `globalThis.__federation_shared__['default']`
- [x] 3.3 Ensure registration does not overwrite existing entries (first-loaded wins): only register a package+version if no entry already exists in the global scope

## 4. Host Share Scope Bootstrap

- [x] 4.1 Add `HostSharedDependency` type (`{ name: string; version: string; get: () => Promise<() => unknown> }`) matching the shareScope `get` format (returns a promise resolving to a module factory), and add optional `hostSharedDependencies?: HostSharedDependency[]` to `MicrofrontendsConfig` in `packages/framework/src/plugins/microfrontends/index.ts`
- [x] 4.2 In the microfrontends plugin `onInit()` hook, add bootstrap logic: if `hostSharedDependencies` is provided, initialize `globalThis.__federation_shared__` with a `'default'` scope and write each entry with `{ get: dep.get, loaded: 1 }` (passing the getter through directly) — before any MFE loading actions are dispatched
- [x] 4.3 Ensure `onInit()` does not modify `globalThis.__federation_shared__` when `hostSharedDependencies` is omitted or empty

## 5. Update Guidelines

- [x] 5.1 Update `.ai/targets/EVENTS.md` lines 76-77: replace "Each MFE package bundles its own copy of @hai3/react (NOT in Module Federation shared config)" with explanation that each MFE gets isolated instances because `singleton: false` causes independent module evaluation per MFE (shared code, isolated instances)

## 6. Expand MFE Shared Dependencies

- [x] 6.1 Update `src/mfe_packages/demo-mfe/mfe.json` `sharedDependencies` to add: `@hai3/react`, `@hai3/framework`, `@hai3/state`, `@hai3/screensets`, `@hai3/api`, `@hai3/i18n`, `@reduxjs/toolkit`, `react-redux` (all with `singleton: false`)
- [x] 6.2 Update `src/mfe_packages/demo-mfe/vite.config.ts` `shared` array to match the expanded `sharedDependencies` list
- [x] 6.3 Update `src/mfe_packages/_blank-mfe/mfe.json` `sharedDependencies` with the same expanded list
- [x] 6.4 Update `src/mfe_packages/_blank-mfe/vite.config.ts` `shared` array to match

## 7. Host App Configuration

- [x] 7.1 Update the host app's `microfrontends()` call to include `hostSharedDependencies` with entries for react, react-dom, tailwindcss, @hai3/uikit, @hai3/react, @hai3/framework, @hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n, @reduxjs/toolkit, react-redux

## 8. Tests

- [x] 8.1 Add unit tests for `buildShareScope()`: matching entry found, no match (fallback), missing `requiredVersion` (any-version), empty global scope, bare version (exact match)
- [x] 8.2 Add unit tests for `registerMfeSharedModules()`: registers new entries from init(), does not overwrite existing entries, handles empty shareScope
- [x] 8.3 Add unit tests for host bootstrap in microfrontends plugin `onInit()`: populates global scope when `hostSharedDependencies` provided, no-op when omitted
- [x] 8.4 Add integration test: load two MFEs sequentially — second MFE reuses first MFE's registered modules

## 9. Build and Verify

- [x] 9.1 Rebuild `@hai3/screensets` (`npm run build --workspace=@hai3/screensets`)
- [x] 9.2 Rebuild `@hai3/framework` (`npm run build --workspace=@hai3/framework`)
- [x] 9.3 Run screensets tests (`cd packages/screensets && npx vitest run`)
- [x] 9.4 Run framework tests (`cd packages/framework && npx vitest run`)
