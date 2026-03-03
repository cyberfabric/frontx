## MODIFIED Requirements

### Requirement: MfeHandlerMF Share Scope Construction

MfeHandlerMF SHALL construct a `shareScope` object from the manifest's `sharedDependencies` and write it to `globalThis.__federation_shared__` via `writeShareScope()`. For shared dependencies that declare a `chunkPath`, the handler SHALL create blob-URL-based `get()` closures that produce isolated module evaluations.

#### Scenario: Handler constructs shareScope via buildShareScope and writeShareScope

- **WHEN** `MfeHandlerMF.loadExposedModuleIsolated()` loads an MFE
- **THEN** the handler SHALL call `buildShareScope(manifest)` to construct the scope from `manifest.sharedDependencies`
- **AND** for each entry in `sharedDependencies` that has a `chunkPath`, the handler SHALL create a `get()` closure that fetches source text from `new URL(chunkPath, remoteEntryBaseUrl).href`, rewrites relative imports, creates a Blob URL, and returns the imported module as a factory `() => module`
- **AND** for entries without a `chunkPath`, the handler SHALL use the original federation `get()` function from `globalThis.__federation_shared__` (no isolation)
- **AND** the handler SHALL call `writeShareScope(shareScope)` to write the constructed entries to `globalThis.__federation_shared__['default']`
- **AND** the base URL for deriving absolute chunk URLs SHALL be the directory portion of `manifest.remoteEntry`

#### Scenario: Missing requiredVersion treated as any-version match

- **WHEN** a `sharedDependencies` entry omits `requiredVersion`
- **THEN** the handler SHALL treat it as "any version matches"
- **AND** the first available version in the global scope for that package name SHALL be used

#### Scenario: Empty sharedDependencies results in empty shareScope

- **WHEN** `manifest.sharedDependencies` is empty or undefined
- **THEN** the handler SHALL write an empty scope to `globalThis.__federation_shared__`
- **AND** the MFE SHALL fall back to its own bundled copies for all dependencies
- **AND** no error SHALL be thrown

#### Scenario: Source text cache deduplication across MFE loads

- **WHEN** multiple MFE loads reference the same `chunkPath` for a shared dependency
- **THEN** the handler SHALL fetch the source text at most once (stored in the handler's `sourceTextCache`)
- **AND** subsequent loads SHALL reuse the cached source text
- **AND** each load SHALL still create a NEW Blob URL from the cached text (producing a fresh module evaluation)

### Requirement: Share Scope Object Format

The shareScope entries written to `globalThis.__federation_shared__` via `writeShareScope()` SHALL conform to the format expected by the `@originjs/vite-plugin-federation` runtime.

#### Scenario: ShareScope entry structure

- **WHEN** the handler constructs a shareScope entry for a package
- **THEN** the entry SHALL have the structure: `{ [packageName]: { [version]: { get: () => Promise<() => Module>, loaded?: 1, scope?: string } } }`
- **AND** `get` SHALL be a function that returns a promise resolving to a module factory
- **AND** for entries with a `chunkPath`, `get` SHALL be a blob-URL-based closure that fetches source text, creates a Blob URL, and imports it for a fresh evaluation
- **AND** for entries without a `chunkPath`, `get` SHALL be the original federation `get()` function (shared instance)
- **AND** `scope` SHALL default to `'default'` if omitted

### Requirement: writeShareScope Global Mutation

`writeShareScope()` SHALL write shareScope entries to `globalThis.__federation_shared__` so the federation runtime's `importShared()` can resolve shared dependencies during MFE module evaluation.

#### Scenario: writeShareScope writes to globalThis.__federation_shared__

- **WHEN** `writeShareScope(shareScope)` is called
- **THEN** it SHALL write each entry to `globalThis.__federation_shared__['default'][packageName]`
- **AND** the `get()` closures in each entry SHALL capture per-load `LoadBlobState` (including the per-load `blobUrlMap`)
- **AND** when the federation runtime's `importShared(name)` is called during MFE module evaluation, it SHALL find the entry written by `writeShareScope` and invoke its `get()` closure
- **AND** the `get()` closure SHALL use `createBlobUrlChain` to produce a blob URL for the dependency, ensuring isolation

#### Scenario: Concurrent loads and globalThis.__federation_shared__ mutation

- **GIVEN** `globalThis.__federation_shared__` is a global mutable object
- **WHEN** multiple MFE loads call `writeShareScope()` concurrently
- **THEN** each load's `get()` closures SHALL capture their own `LoadBlobState` instance
- **AND** even if a later load overwrites a `get()` closure in `globalThis.__federation_shared__`, the earlier load's already-resolved `importShared()` calls SHALL have completed with their own blob URLs
- **AND** each `get()` closure's `createBlobUrlChain` call SHALL use the `loadState.blobUrlMap` from its own load, not from another load

## REMOVED Requirements

### Requirement: Post-Load Registration of MFE Bundles

**Reason**: The federation plugin's `init()` function only writes incoming shareScope entries into `globalThis.__federation_shared__` — it does NOT add the MFE's own bundled modules back into the shareScope. The `registerMfeSharedModules()` method and `snapshotScopeKeys()` helper perform a diff that always finds zero new entries, making the entire post-load registration mechanism non-functional dead code. With blob URL isolation, each MFE gets fresh module evaluations from source text — there is no need for MFE-to-MFE module registration in the global scope.

**Migration**: Remove `registerMfeSharedModules()` and `snapshotScopeKeys()` private methods from `MfeHandlerMF`. Remove the snapshot-before-init and diff-after-init logic from `loadExposedModuleIsolated()`. No replacement is needed — blob URL isolation handles per-MFE module creation directly.

The following scenarios from the existing spec become invalid with this removal and are also removed:
- "Subsequent MFE reuses previously registered modules" — MFE-to-MFE sharing via global scope registration no longer occurs; each MFE fetches and blob-URLs its own source text.
- "Concurrent MFE loading results in independent fallback" — replaced by blob URL isolation behavior (see replacement scenario below).
- "Registration does not overwrite host-provided modules" — host bootstrap is removed entirely (see `host-share-scope-bootstrap` delta spec).

## ADDED Requirements

### Requirement: Concurrent MFE Loading under Blob URL Isolation

When multiple MFEs are loaded concurrently, each SHALL independently fetch and evaluate shared dependencies via blob URLs, using the source text cache to avoid redundant network requests.

#### Scenario: Concurrent MFE loads share source text cache

- **GIVEN** MFE-A and MFE-B are loaded concurrently and both declare `react` with the same `chunkPath`
- **WHEN** both MFEs' blob URL `get()` wrappers request the react source text
- **THEN** at most ONE network fetch SHALL occur for that chunk URL (the source text cache prevents duplicates)
- **AND** both MFEs SHALL receive their own unique Blob URL and fresh module evaluation
- **AND** no error SHALL be thrown in the concurrent case
