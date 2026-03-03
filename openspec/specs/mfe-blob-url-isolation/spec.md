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

#### Scenario: Blob URLs are NOT revoked after import resolves

- **WHEN** `import(blobUrl)` resolves successfully
- **THEN** the handler SHALL NOT call `URL.revokeObjectURL(blobUrl)`
- **AND** blob URLs SHALL remain valid for the lifetime of the page
- **BECAUSE** `import()` resolves when the module is parsed, not fully evaluated — modules with top-level `await` (e.g., `const react = await importShared('react')`) continue evaluating asynchronously after `import()` returns, and `get()` closures written to `globalThis.__federation_shared__` by `writeShareScope()` create new blob URLs during async evaluation that would be revoked prematurely
- **AND** blob URLs are cleaned up automatically by the browser on page unload

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

When constructing the shareScope, MfeHandlerMF SHALL create `get()` closures for each shared dependency that has a `chunkPath`. These closures replace the federation runtime's default `get()` (which returns the same module instance) with a blob-URL-based `get()` that returns a fresh module evaluation.

#### Scenario: get() wrapper produces isolated module per MFE

- **GIVEN** a shared dependency with `chunkPath` is included in the shareScope
- **WHEN** the federation runtime calls `get()` on that shareScope entry during MFE module evaluation
- **THEN** the `get()` function SHALL return a promise resolving to a module factory `() => Module`
- **AND** the module SHALL be a freshly evaluated instance created via Blob URL
- **AND** the module SHALL NOT be the same object as any module returned by previous `get()` calls for other MFEs

#### Scenario: get() wrapper uses cached source text

- **WHEN** the wrapped `get()` function is called
- **THEN** it SHALL check the source text cache first
- **AND** if the source text is not cached, it SHALL fetch it from the absolute chunk URL
- **AND** it SHALL create a new Blob URL from the (cached or freshly fetched) source text
- **AND** it SHALL import the Blob URL and return the module

### Requirement: Recursive Blob URL Chain Creation (createBlobUrlChain)

MfeHandlerMF SHALL use `createBlobUrlChain` as the core isolation mechanism. It SHALL recursively create blob URLs for a chunk and all its expose-pattern dependencies, building a chain of blob-URL-evaluated modules that form the MFE's isolated dependency tree.

#### Scenario: Recursive blob URL chain for expose chunk with shared dependencies

- **GIVEN** an expose chunk `helloWorld.js` contains `import { importShared } from './__federation_fn_import-RySFLl55.js'`
- **AND** the expose chunk is loaded via `createBlobUrlChain(loadState, 'helloWorld.js', baseUrl)`
- **WHEN** `createBlobUrlChain` processes the expose chunk
- **THEN** it SHALL fetch the source text for `helloWorld.js`
- **AND** it SHALL parse relative imports from the source text using `parseExposeChunkFilename`
- **AND** for each relative import that matches an expose-pattern filename (e.g., federation runtime files), it SHALL recursively call `createBlobUrlChain` for that dependency
- **AND** it SHALL rewrite relative imports in the source text to use blob URLs from `loadState.blobUrlMap` for dependencies that have already been blob-URL'd
- **AND** remaining relative imports (non-expose-pattern files like `_commonjsHelpers`) SHALL be rewritten to absolute URLs using the base URL
- **AND** it SHALL create a Blob from the rewritten source text, produce a blob URL, and store it in `loadState.blobUrlMap` keyed by the chunk filename

#### Scenario: Shared blobUrlMap per load ensures consistent blob URL references

- **GIVEN** a single MFE load creates a `LoadBlobState` with an empty `blobUrlMap: Map<string, string>`
- **WHEN** `createBlobUrlChain` is called for the expose chunk and recursively for its dependencies
- **THEN** each blob URL created SHALL be stored in `loadState.blobUrlMap` keyed by chunk filename
- **AND** when a later chunk in the same load references a dependency that was already blob-URL'd, the rewriting step SHALL use the blob URL from `blobUrlMap` instead of creating a duplicate
- **AND** the `blobUrlMap` SHALL be scoped to a single load — different MFE loads SHALL have independent `blobUrlMap` instances

#### Scenario: parseExposeChunkFilename extracts chunk filename from import specifier

- **GIVEN** a source text line `import { importShared } from './__federation_fn_import-RySFLl55.js'`
- **WHEN** `parseExposeChunkFilename` processes this import specifier
- **THEN** it SHALL extract the filename `__federation_fn_import-RySFLl55.js` from the relative path
- **AND** it SHALL return the filename for use as a key in `blobUrlMap` and for recursive `createBlobUrlChain` calls
- **AND** for non-relative imports (bare specifiers, absolute URLs), it SHALL return `null` (not a candidate for blob URL chaining)
