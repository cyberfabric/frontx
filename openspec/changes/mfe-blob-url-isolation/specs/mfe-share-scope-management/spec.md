## MODIFIED Requirements

### Requirement: MfeHandlerMF Share Scope Construction

MfeHandlerMF SHALL construct a `shareScope` object from `globalThis.__federation_shared__` filtered by the manifest's `sharedDependencies`, and pass it to `container.init(shareScope)` instead of an empty object. For shared dependencies that declare a `chunkPath`, the handler SHALL wrap the `get()` function with blob URL isolation logic.

#### Scenario: Handler constructs shareScope from manifest and global scope

- **WHEN** `MfeHandlerMF.loadRemoteContainer()` loads a new container (not cached)
- **THEN** the handler SHALL read `manifest.sharedDependencies` from the resolved MfManifest
- **AND** for each entry in `sharedDependencies`, the handler SHALL check `globalThis.__federation_shared__['default']` for a matching package name
- **AND** if a matching package is found, the handler SHALL use semver matching against the entry's `requiredVersion` to find a compatible version
- **AND** compatible entries SHALL be included in the `shareScope` object passed to `container.init(shareScope)`
- **AND** incompatible or missing entries SHALL be omitted from the `shareScope` (the MFE falls back to its own bundled copy)
- **AND** for entries with a `chunkPath`, the handler SHALL replace the original `get()` function with a blob-URL-based `get()` wrapper that produces isolated module evaluations
- **AND** the base URL for deriving absolute chunk URLs SHALL be the directory portion of `manifest.remoteEntry`

#### Scenario: Missing requiredVersion treated as any-version match

- **WHEN** a `sharedDependencies` entry omits `requiredVersion`
- **THEN** the handler SHALL treat it as "any version matches"
- **AND** the first available version in the global scope for that package name SHALL be used

#### Scenario: Empty global scope results in empty shareScope

- **WHEN** `globalThis.__federation_shared__` is empty or undefined
- **THEN** the handler SHALL pass an empty `shareScope` object to `container.init()`
- **AND** the MFE SHALL fall back to its own bundled copies for all dependencies
- **AND** no error SHALL be thrown

#### Scenario: Cached container skips init

- **WHEN** a container for the same `remoteName` is already cached
- **THEN** the handler SHALL return the cached container without calling `init()` again
- **AND** share scope construction SHALL NOT be repeated

### Requirement: Share Scope Object Format

The `shareScope` object passed to `container.init()` SHALL conform to the format expected by the `@originjs/vite-plugin-federation` runtime.

#### Scenario: ShareScope entry structure

- **WHEN** the handler constructs a shareScope entry for a package
- **THEN** the entry SHALL have the structure: `{ [packageName]: { [version]: { get: () => Promise<() => Module>, loaded?: 1, scope?: string } } }`
- **AND** `get` SHALL be a function that returns a promise resolving to a module factory
- **AND** for entries with a `chunkPath`, `get` SHALL be a blob-URL-based wrapper (producing isolated evaluations)
- **AND** for entries without a `chunkPath`, `get` SHALL be the original federation `get()` function (shared instance)
- **AND** `scope` SHALL default to `'default'` if omitted

## REMOVED Requirements

### Requirement: Post-Load Registration of MFE Bundles

**Reason**: The federation plugin's `init()` function only writes incoming shareScope entries into `globalThis.__federation_shared__` — it does NOT add the MFE's own bundled modules back into the shareScope. The `registerMfeSharedModules()` method and `snapshotScopeKeys()` helper perform a diff that always finds zero new entries, making the entire post-load registration mechanism non-functional dead code. With blob URL isolation, each MFE gets fresh module evaluations from source text — there is no need for MFE-to-MFE module registration in the global scope.

**Migration**: Remove `registerMfeSharedModules()` and `snapshotScopeKeys()` private methods from `MfeHandlerMF`. Remove the snapshot-before-init and diff-after-init logic from `loadRemoteContainer()`. No replacement is needed — blob URL isolation handles per-MFE module creation directly.

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
