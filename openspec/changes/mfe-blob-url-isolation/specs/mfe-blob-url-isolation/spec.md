## ADDED Requirements

### Requirement: Blob URL Module Isolation in MfeHandlerMF

MfeHandlerMF SHALL use Blob URLs to achieve per-MFE module isolation for shared dependencies. Each MFE load SHALL receive a fresh module evaluation of each shared dependency, ensuring stateful libraries (React, Redux, @hai3/*) maintain independent state per MFE instance.

#### Scenario: Each MFE gets a fresh module evaluation via Blob URL

- **GIVEN** two MFE entries (MFE-A and MFE-B) both declare `react` in their `sharedDependencies` with a `chunkPath`
- **WHEN** both MFEs are loaded sequentially by MfeHandlerMF
- **THEN** MFE-A's React instance SHALL be a separate module evaluation from MFE-B's React instance
- **AND** module-level state (e.g., React's internal fiber tree, hooks state) SHALL be fully isolated between MFE-A and MFE-B
- **AND** `Object.is(mfeA_React, mfeB_React)` SHALL be `false` (different module objects)

#### Scenario: Blob URL creation per MFE load

- **WHEN** MfeHandlerMF loads an MFE whose `sharedDependencies` include an entry with `chunkPath`
- **THEN** the handler SHALL fetch the source text of the shared dependency chunk from the absolute URL derived from `remoteEntry` base URL + `chunkPath`
- **AND** the handler SHALL create a `Blob` from the (possibly rewritten) source text with type `text/javascript`
- **AND** the handler SHALL call `URL.createObjectURL(blob)` to produce a unique Blob URL
- **AND** the handler SHALL call `import(blobUrl)` to trigger a fresh ES module evaluation
- **AND** the resulting module SHALL be used as the shared dependency for that MFE

#### Scenario: Blob URL revoked after import resolves

- **WHEN** `import(blobUrl)` resolves successfully
- **THEN** the handler SHALL call `URL.revokeObjectURL(blobUrl)` immediately
- **AND** the revocation SHALL occur in a `finally` block to ensure cleanup even on error
- **AND** the module SHALL remain usable after revocation (the ES module registry retains the evaluated module)

#### Scenario: Fetch failure throws MfeLoadError

- **WHEN** fetching the shared dependency chunk source text fails (network error, 404, CORS)
- **THEN** the handler SHALL throw `MfeLoadError` with a message including the chunk URL and the failure reason
- **AND** the MFE load SHALL fail (no silent fallback to shared instances)

### Requirement: Source Text Cache

MfeHandlerMF SHALL maintain an in-memory cache of fetched source text strings, keyed by absolute chunk URL. The cache prevents redundant network requests when multiple MFEs share the same dependency version.

#### Scenario: First fetch populates the cache

- **GIVEN** no prior MFE has loaded `react` with `chunkPath: "__federation_shared_react.js"`
- **WHEN** MFE-A is loaded and the handler fetches `https://cdn.example.com/mfe/assets/__federation_shared_react.js`
- **THEN** the handler SHALL store the fetched source text in the cache keyed by the absolute URL
- **AND** the cache entry SHALL persist for the handler's lifetime

#### Scenario: Subsequent MFE reuses cached source text

- **GIVEN** MFE-A has already loaded and the source text for `react` is cached
- **WHEN** MFE-B is loaded with the same `chunkPath` for `react`
- **THEN** the handler SHALL use the cached source text without making a new network request
- **AND** the handler SHALL still create a NEW Blob URL from the cached source text (producing a fresh module evaluation)

#### Scenario: Cache is scoped to the MfeHandlerMF instance

- **WHEN** the source text cache is accessed
- **THEN** the cache SHALL be a private member of the `MfeHandlerMF` instance
- **AND** the cache SHALL NOT be shared across different `MfeHandlerMF` instances
- **AND** the cache SHALL NOT be exposed via any public API

### Requirement: Source Text Import Rewriting

When creating a Blob URL from shared dependency chunk source text, MfeHandlerMF SHALL rewrite relative import paths to absolute URLs so the blob-evaluated module can resolve its dependencies.

#### Scenario: Federation runtime import rewritten to absolute URL

- **GIVEN** a shared dependency chunk source contains `import { importShared } from './__federation_fn_import-RySFLl55.js'`
- **WHEN** the handler prepares the source text for blob URL creation
- **THEN** the handler SHALL rewrite the relative import to an absolute URL: `import { importShared } from 'https://cdn.example.com/mfe/assets/__federation_fn_import-RySFLl55.js'`
- **AND** the base URL SHALL be derived from the MfManifest's `remoteEntry` URL (same directory)

#### Scenario: All relative imports rewritten

- **WHEN** the handler rewrites source text for blob URL creation
- **THEN** ALL relative imports (starting with `'./` or `"./`) SHALL be rewritten to absolute URLs using the remoteEntry base URL
- **AND** the rewriting SHALL use simple string replacement (no AST parsing, no es-module-lexer)
- **AND** non-relative imports (bare specifiers, absolute URLs) SHALL NOT be modified

#### Scenario: Rewriting preserves module semantics

- **WHEN** the handler rewrites relative imports in source text
- **THEN** only the module specifier string (URL path) SHALL be modified
- **AND** the import binding names, default/named import structure, and all other source text SHALL remain unchanged

### Requirement: chunkPath in SharedDependencyConfig

`SharedDependencyConfig` SHALL support an optional `chunkPath` field that declares the relative path of the built shared dependency chunk within the MFE's assets directory.

#### Scenario: chunkPath used to derive absolute chunk URL

- **GIVEN** an MfManifest with `remoteEntry: "https://cdn.example.com/mfe/assets/remoteEntry.js"` and a shared dependency with `chunkPath: "__federation_shared_react.js"`
- **WHEN** the handler needs to fetch the shared dependency source text
- **THEN** the handler SHALL compute the absolute URL as `new URL(chunkPath, remoteEntryUrl).href`
- **AND** the result SHALL be `"https://cdn.example.com/mfe/assets/__federation_shared_react.js"`

#### Scenario: chunkPath omitted falls back to default federation behavior

- **WHEN** a `sharedDependencies` entry omits `chunkPath`
- **THEN** the handler SHALL pass through the `get()` function from the share scope without blob URL wrapping
- **AND** the dependency SHALL use the default federation behavior (shared instance, no isolation)
- **AND** no error SHALL be thrown

#### Scenario: chunkPath field is optional in TypeScript type

- **WHEN** defining `SharedDependencyConfig` in `packages/screensets/src/mfe/types/mf-manifest.ts`
- **THEN** `chunkPath` SHALL be typed as `chunkPath?: string`
- **AND** existing manifests without `chunkPath` SHALL remain valid

### Requirement: ShareScope get() Wrapper for Blob URL Isolation

When constructing the shareScope for `container.init()`, MfeHandlerMF SHALL wrap the `get()` function for each shared dependency that has a `chunkPath`, replacing the federation runtime's default `get()` (which returns the same module instance) with a blob-URL-based `get()` that returns a fresh module evaluation.

#### Scenario: get() wrapper produces isolated module per MFE

- **GIVEN** a shared dependency with `chunkPath` is included in the shareScope
- **WHEN** the federation runtime calls `get()` on that shareScope entry during MFE initialization
- **THEN** the `get()` function SHALL return a promise resolving to a module factory `() => Module`
- **AND** the module SHALL be a freshly evaluated instance created via Blob URL
- **AND** the module SHALL NOT be the same object as any module returned by previous `get()` calls for other MFEs

#### Scenario: get() wrapper uses cached source text

- **WHEN** the wrapped `get()` function is called
- **THEN** it SHALL check the source text cache first
- **AND** if the source text is not cached, it SHALL fetch it from the absolute chunk URL
- **AND** it SHALL create a new Blob URL from the (cached or freshly fetched) source text
- **AND** it SHALL import the Blob URL and return the module
