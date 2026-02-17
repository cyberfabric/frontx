# Design: MFE Manifest

This document covers the MfManifest type and its usage in the MFE system.

---

## Context

MfManifest is a standalone configuration type that contains Module Federation-specific settings for [loading](./mfe-loading.md) MFE bundles. While [MfeEntryMF](./mfe-entry-mf.md) defines the communication contract of an MFE, MfManifest provides the technical details needed to load and initialize the remote bundle (URL, container name, shared dependencies).

Multiple MfeEntryMF instances can reference the same MfManifest when they are exposed modules from the same federated container.

**Important**: MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf) for the rationale and how manifests are resolved.

## Definition

**MfManifest**: A GTS type containing Module Federation 2.0 configuration - the remote entry URL, container name, shared dependency settings, and an optional list of entry type IDs for discovery. This type is specific to `MfeHandlerMF` and `MfeEntryMF`.

---

## MF Manifest Schema (Standalone)

MfManifest is a **standalone type** containing Module Federation configuration.

See [schemas.md - MF Manifest Schema](./schemas.md#mf-manifest-schema) for the JSON Schema definition.

## TypeScript Interface Definitions

```typescript
/**
 * Module Federation manifest containing shared configuration
 * GTS Type: gts.hai3.mfes.mfe.mf_manifest.v1~
 */
interface MfManifest {
  /** The GTS type ID for this manifest */
  id: string;
  /** URL to the remoteEntry.js file */
  remoteEntry: string;
  /** Module Federation container name */
  remoteName: string;
  /** Optional override for shared dependency configuration */
  sharedDependencies?: SharedDependencyConfig[];
  /** Convenience field for discovery - lists MfeEntryMF type IDs */
  entries?: string[];
}

/**
 * Configuration for a shared dependency in Module Federation.
 * Controls code sharing (always on) and instance isolation (via `singleton` flag).
 * See overview.md#runtime-isolation-default-behavior for the full isolation model.
 */
interface SharedDependencyConfig {
  /** Package name (e.g., 'react', 'lodash', '@hai3/screensets') */
  name: string;
  /** Semver range (e.g., '^19.0.0', '^4.17.0'). Optional -- not all shared dependencies are semver packages (e.g., Tailwind CSS utilities, UIKit component libraries). */
  requiredVersion?: string;
  /** false (default): isolated instances per MFE; true: shared instance. */
  singleton?: boolean;
}
```

## Example MfManifest Instance

```typescript
const analyticsManifest: MfManifest = {
  id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.mfe.manifest.v1',
  remoteEntry: 'https://cdn.acme.com/analytics/remoteEntry.js',
  remoteName: 'acme_analytics',
  // sharedDependencies configures Module Federation code sharing.
  // Two benefits are controlled independently:
  // 1. Code sharing (always) - download once, cache it
  // 2. Instance sharing (singleton flag) - share instance or isolate
  //
  // This example uses MfeHandlerMF defaults (strict isolation).
  // Custom handlers for internal MFEs may use different settings.
  sharedDependencies: [
    // React/ReactDOM: Code shared for bundle optimization, but singleton: false
    // ensures each MFE instance gets its own React instance (MfeHandlerMF default)
    { name: 'react', requiredVersion: '^19.0.0', singleton: false },
    { name: 'react-dom', requiredVersion: '^19.0.0', singleton: false },
    // Stateless utilities: singleton: true is safe (no state to isolate)
    { name: 'lodash', requiredVersion: '^4.17.0', singleton: true },
    { name: 'date-fns', requiredVersion: '^2.30.0', singleton: true },
    // @hai3/* packages: MfeHandlerMF uses singleton: false for runtime isolation
    // Custom handlers for internal MFEs may use singleton: true if sharing is needed
    // { name: '@hai3/screensets', requiredVersion: '^1.0.0', singleton: false },
  ],
  entries: [
    'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.metrics.v1',
  ],
};
```
