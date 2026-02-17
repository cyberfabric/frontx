# Design: MFE Entry (Module Federation)

This document covers the MfeEntry and MfeEntryMF types and their usage in the MFE system.

---

## Context

MfeEntry defines the contract that an MFE declares with its hosting [domain](./schemas.md#extension-domain-schema). It specifies what [properties](./schemas.md#shared-property-schema) the MFE requires/accepts and what [action types](./mfe-actions.md) it can send (to its domain) and receive (when targeted). The entry is referenced by [Extension](./schemas.md#extension-schema) to bind an MFE implementation to a specific domain.

MfeEntry is abstract - it defines only the communication contract. Derived types add loader-specific fields. HAI3 ships MfeEntryMF (Module Federation) as the default, but companies can create their own derived types with richer contracts.

## Definition

**MfeEntry**: An abstract base GTS type defining the communication contract of an MFE - required/optional properties and bidirectional action capabilities. This is a **thin contract** that focuses purely on communication semantics.

**MfeEntryMF**: HAI3's default derived GTS type extending MfeEntry with Module Federation 2.0 loading configuration - references an MfManifest and specifies the exposed module path. This is also a thin contract suitable for 3rd-party vendors.

**Custom Derived Types**: Companies can create their own derived entry types (e.g., `MfeEntryAcme`) with richer contracts including metadata, translations, preload assets, feature flags, etc. These custom types are handled by custom [MfeHandler](./mfe-loading.md#decision-10-mfehandler-abstraction-and-registry) implementations registered by the company.

---

## MFE Entry Schema (Abstract Base)

MfeEntry is the **abstract base type** for all entry contracts. It defines ONLY the communication contract (properties, actions). Derived types add loader-specific fields.

See [schemas.md - MFE Entry Schema](./schemas.md#mfe-entry-schema-abstract-base) for the JSON Schema definition.

## MFE Entry MF Schema (Derived - Module Federation)

The Module Federation derived type adds fields specific to Webpack 5 / Rspack Module Federation 2.0 implementation.

See [schemas.md - MFE Entry MF Schema](./schemas.md#mfe-entry-mf-schema-derived) for the JSON Schema definition.

## MfeEntry Type Hierarchy

The type hierarchy supports extensibility - companies can create their own derived entry types with richer contracts while maintaining compatibility with the base contract:

```
gts.hai3.mfes.mfe.entry.v1~ (Base - Abstract Contract)
  |-- id: string (GTS type ID)
  |-- requiredProperties: x-gts-ref[] -> gts.hai3.mfes.comm.shared_property.v1~*
  |-- optionalProperties?: x-gts-ref[] -> gts.hai3.mfes.comm.shared_property.v1~*
  |-- actions: x-gts-ref[] -> gts.hai3.mfes.comm.action.v1~*
  |-- domainActions: x-gts-ref[] -> gts.hai3.mfes.comm.action.v1~*
  |
  +-- gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~ (HAI3 Default - Module Federation)
  |     |-- (inherits contract fields from base)
  |     |-- manifest: x-gts-ref -> gts.hai3.mfes.mfe.mf_manifest.v1~*
  |     |-- exposedModule: string
  |
  +-- gts.hai3.mfes.mfe.entry.v1~<company>.<package>.mfe.entry_<name>.v1~ (Company Custom)
        |-- (inherits contract fields from base)
        |-- (company-specific loader fields: manifest, exposedModule, etc.)
        |-- (company-specific metadata: translations, routes, preloadAssets, etc.)

gts.hai3.mfes.mfe.mf_manifest.v1~ (Standalone - Module Federation Config)
  |-- id: string (GTS type ID)
  |-- remoteEntry: string (URL)
  |-- remoteName: string
  |-- sharedDependencies?: SharedDependencyConfig[] (code sharing + optional instance sharing)
  |     |-- name: string
  |     |-- requiredVersion?: string
  |     |-- singleton?: boolean (default: false = isolated instances)
  |-- entries?: x-gts-ref[] -> gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~*
```

### Company Custom Entry Types

Companies can define their own derived entry types that:
1. **Extend the base contract** - Inherit requiredProperties, actions, domainActions
2. **Add loader-specific fields** - manifest, exposedModule (if using MF), or custom loader fields
3. **Add company-specific metadata** - translations, routes, preloadAssets, featureFlags, etc.

These custom entry types are handled by company-registered [MfeHandler](./mfe-loading.md#decision-10-mfehandler-abstraction-and-registry) implementations.

**Example: Company Custom Entry Type**

```typescript
// Company-defined derived entry type
interface MfeEntryAcme extends MfeEntry {
  // Loader fields (still uses Module Federation under the hood)
  manifest: string;
  exposedModule: string;

  // Company-specific metadata
  translations?: Record<string, Record<string, string>>;
  routes?: string[];
  preloadAssets?: string[];
  requiredFeatureFlags?: string[];
}

// GTS Type ID (derived from MfeEntry)
// gts.hai3.mfes.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~
```

See [MFE Loading - Decision 10](./mfe-loading.md#decision-10-mfehandler-abstraction-and-registry) for how custom handlers handle these derived types.

## TypeScript Interface Definitions

```typescript
/**
 * Defines an entry point with its communication contract (PURE CONTRACT - Abstract Base)
 * GTS Type: gts.hai3.mfes.mfe.entry.v1~
 */
interface MfeEntry {
  /** The GTS type ID for this entry */
  id: string;
  /** SharedProperty type IDs that MUST be provided by domain */
  requiredProperties: string[];
  /** SharedProperty type IDs that MAY be provided by domain (optional field) */
  optionalProperties?: string[];
  /** Action type IDs this MFE can send (when targeting its domain) */
  actions: string[];
  /** Action type IDs this MFE can receive (when targeted by actions chains) */
  domainActions: string[];
}

/**
 * Module Federation 2.0 implementation of MfeEntry
 * GTS Type: gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~
 */
interface MfeEntryMF extends MfeEntry {
  /**
   * Module Federation manifest configuration.
   * Can be either:
   * - A type ID reference (string) to a cached manifest
   * - An inline MfManifest object
   *
   * **Design note (JSON schema vs TypeScript):** The GTS JSON schema for MfeEntryMF
   * (in schemas.md) defines `manifest` as an `x-gts-ref` (string reference only),
   * because the JSON schema validates the *persisted* form where manifests are always
   * stored as string references. The TypeScript runtime interface accepts both forms
   * (string reference OR inline MfManifest object) for convenience -- inline objects
   * are resolved at load time by MfeHandlerMF.resolveManifest().
   */
  manifest: string | MfManifest;
  /** Module Federation exposed module name (e.g., './ChartWidget') */
  exposedModule: string;
}
```

## Example MfeEntryMF Instance

```typescript
import { HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE } from '@hai3/react';

const chartEntry: MfeEntryMF = {
  id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  requiredProperties: [
    HAI3_SHARED_PROPERTY_THEME,
    HAI3_SHARED_PROPERTY_LANGUAGE,
  ],
  optionalProperties: [
    'gts.hai3.mfes.comm.shared_property.v1~acme.analytics.comm.selected_date_range.v1',
  ],
  actions: ['gts.hai3.mfes.comm.action.v1~acme.analytics.actions.data_updated.v1'],
  domainActions: ['gts.hai3.mfes.comm.action.v1~acme.analytics.actions.refresh.v1'],
  manifest: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.mfe.manifest.v1',
  exposedModule: './ChartWidget',
};
```
