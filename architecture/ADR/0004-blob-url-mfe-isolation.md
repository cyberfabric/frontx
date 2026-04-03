---
status: accepted
date: 2026-03-03
---

# Blob URL Isolation for Microfrontends


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Fetch source text and create a unique Blob URL per MFE load](#fetch-source-text-and-create-a-unique-blob-url-per-mfe-load)
  - [Module Federation singleton/shared mechanism](#module-federation-singletonshared-mechanism)
  - [Service Worker URL interception](#service-worker-url-interception)
  - [`Function()` re-evaluation of module source](#function-re-evaluation-of-module-source)
  - [Import maps with per-MFE scope overrides](#import-maps-with-per-mfe-scope-overrides)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-frontx-adr-blob-url-mfe-isolation`
## Context and Problem Statement

Browsers cache ES modules by URL identity — when multiple MFEs share dependencies via Module Federation's shareScope, they receive the same module instance. This breaks per-MFE isolation: module-level state such as each MFE's EventBus instance and Redux store is shared rather than scoped. The previous approach using Module Federation's singleton/shared mechanism could not achieve true per-runtime isolation because it was designed to prevent duplicate instances, not to guarantee separate ones.

## Decision Drivers

* Each MFE load must produce its own module-level state instances (EventBus, store, i18n) regardless of caching
* The solution must not introduce `@cyberfabric/*` dependencies into L1 packages (zero-dependency constraint)
* Blob URLs must not be revoked while a load is still in flight or modules may still be evaluating — `import()` resolves before top-level await finishes, so premature revocation causes `ERR_FAILED`; revocation is deferred until load failure or lifecycle cleanup after `unmount()` (see [More Information](#more-information))

## Considered Options

* Fetch source text and create a unique Blob URL per MFE load via `URL.createObjectURL`
* Module Federation singleton/shared mechanism
* Service Worker URL interception
* `Function()` re-evaluation of module source
* Import maps with per-MFE scope overrides

## Decision Outcome

Chosen option: "Fetch source text and create a unique Blob URL per MFE load via `URL.createObjectURL`", because Blob URLs are unique by construction (`blob:<origin>/<uuid>`), forcing fresh module evaluation with its own module-level state per the ES module spec. Simple string replacement for import specifier rewriting respects the L1 zero-dependency constraint without introducing a parser dependency.

### Consequences

* Good, because each MFE load has true module-level isolation — EventBus instances, stores, and singletons are independent regardless of the number of MFEs loaded simultaneously
* Bad, because blob URL chains and source text still consume memory while a load is active; the `hai3-mfe-externalize` Vite plugin adds build-time complexity for MFE authors

### Confirmation

`packages/screensets/src/mfe/blobLoader.ts` implements blob URL creation and import specifier rewriting. `packages/screensets/src/mfe/sourceCache.ts` caches fetched source text. The `hai3-mfe-externalize` Vite plugin is configured in MFE build configs to ensure all shared dependency imports use `importShared()` across the entire bundle. Host share-scope bootstrap code has been removed.

## Pros and Cons of the Options

### Fetch source text and create a unique Blob URL per MFE load

* Good, because the UUID embedded in every blob URL guarantees no two loads share a module instance, and no browser or bundler workaround is required
* Bad, because memory usage still grows with the number of concurrently mounted MFEs and the size of their shared dependency graph

### Module Federation singleton/shared mechanism

* Good, because it is the built-in Module Federation solution with wide community documentation
* Bad, because singleton sharing is designed to prevent duplicate instances — it cannot produce isolated instances per MFE load by design

### Service Worker URL interception

* Good, because interception is transparent to the MFE bundle and requires no build-time changes
* Bad, because Module Federation's runtime never makes network requests for shared modules after the first load, so Service Worker interception has no opportunity to act

### `Function()` re-evaluation of module source

* Good, because `new Function(source)()` always produces a fresh evaluation
* Bad, because `Function()` does not support ES module syntax (`import`/`export`), making it incompatible with ESM-first packages

### Import maps with per-MFE scope overrides

* Good, because import maps are a web standard with clean URL remapping semantics
* Bad, because import maps are static after the first `<script type="importmap">` is parsed — dynamically adding per-MFE scopes at runtime is not supported

## More Information

- The no-premature-revoke rule: `URL.createObjectURL` returns a URL that persists until explicitly revoked. Revoking the blob URL before dependent modules finish loading can cause `ERR_FAILED`; revocation is therefore deferred until load failure or lifecycle cleanup after `unmount()`
- The `hai3-mfe-externalize` Vite plugin rewrites all `import { X } from '@cyberfabric/...'` statements in MFE bundles to `const { X } = await importShared('@cyberfabric/...')`, which is then intercepted by the blob loader to inject per-load instances
- Related: ADR 0001 (Four-Layer SDK Architecture) — blob loader lives in `packages/screensets` (L1) and must not import other `@cyberfabric/*` packages
- Related: ADR 0002 (Event-Driven Flux Data Flow) — EventBus isolation is the primary motivation for per-MFE module scope

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:
* `cpt-frontx-fr-blob-fresh-eval` — fresh evaluation via unique blob URL per load
* `cpt-frontx-fr-blob-no-revoke` — prohibition on revoking blob URLs before load cleanup
* `cpt-frontx-fr-blob-source-cache` — source text caching strategy
* `cpt-frontx-fr-blob-import-rewriting` — string-based import specifier rewriting
* `cpt-frontx-fr-blob-recursive-chain` — recursive resolution of transitive shared dependencies
* `cpt-frontx-fr-blob-per-load-map` — per-load blob URL map preventing duplicate fetches within a single load
* `cpt-frontx-fr-externalize-transform` — build-time Vite plugin transforming MFE shared imports
* `cpt-frontx-nfr-perf-blob-overhead` — accepted performance cost of blob URL accumulation
* `cpt-frontx-nfr-sec-csp-blob` — CSP configuration requirements for blob: URI scheme
* `cpt-frontx-principle-mfe-isolation` — architectural principle mandating per-MFE module scope
* `cpt-frontx-seq-mfe-loading` — sequence diagram for MFE load with blob URL resolution
