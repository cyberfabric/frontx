/**
 * Module Federation Manifest Type Definitions
 *
 * MfManifest contains package-level Module Federation 2.0 metadata shared
 * across all entries from the same MFE package. Per-module data (expose chunk
 * paths) is carried by MfeEntryMF.exposeAssets, not here.
 *
 * @packageDocumentation
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-mfmanifest-type:p1
// @cpt-dod:cpt-frontx-dod-screenset-registry-mfmanifest-schema-update:p1

/**
 * Asset file lists for a module or shared dependency.
 * Mirrors the `assets` shape emitted by @module-federation/vite in mf-manifest.json.
 */
export interface MfManifestAssets {
  js: {
    /** Synchronous JS chunks loaded eagerly at module evaluation time. */
    sync: string[];
    /** Asynchronous (lazy) JS chunks. */
    async: string[];
  };
  css: {
    /** Synchronous CSS files injected at mount time. */
    sync: string[];
    /** Asynchronous CSS files. */
    async: string[];
  };
}

/**
 * A single shared dependency entry from enriched mfe.json shared[].
 * Built at build time by the frontx-mf-gts Vite plugin from
 * rollupOptions.external with resolved versions from node_modules
 * and MFE-relative chunkPath values.
 */
export interface MfManifestShared {
  /** npm package name (e.g. 'react', '@cyberfabric/screensets'). */
  name: string;
  /** Concrete version resolved from node_modules (e.g. '19.2.4'). */
  version: string;
  /**
   * Path to the standalone ESM file for this dependency, relative to
   * the MFE's publicPath (e.g. "shared/react.js"). Built by
   * StandaloneEsmBuilder in the frontx-mf-gts plugin. The handler
   * resolves this against publicPath to form the fetch URL.
   */
  chunkPath: string;
  /**
   * Named export key to unwrap the module from the chunk.
   * Null when the chunk exports the module directly (no unwrap needed).
   */
  unwrapKey: string | null;
}

/**
 * RemoteEntry descriptor from mf-manifest.json metaData.remoteEntry.
 */
export interface MfManifestRemoteEntry {
  /** Filename of the remote entry (e.g. 'remoteEntry.js'). */
  name: string;
  /** Path prefix relative to publicPath. Empty string means publicPath root. */
  path: string;
  /** Module type: 'module' (ESM) or 'global' (IIFE/UMD). */
  type: string;
}

/**
 * Build information from mf-manifest.json metaData.buildInfo.
 */
export interface MfManifestBuildInfo {
  buildVersion: string;
  buildName: string;
}

/**
 * Package-level metadata from enriched mfe.json manifest.metaData.
 * Contains everything needed to locate and load remote chunks.
 */
export interface MfManifestMetaData {
  /** MFE application/library name. */
  name: string;
  /** Application type (e.g. 'app', 'lib'). */
  type: string;
  /** Build metadata. */
  buildInfo: MfManifestBuildInfo;
  /** Remote entry file descriptor. */
  remoteEntry: MfManifestRemoteEntry;
  /**
   * Global variable name used by the MF 2.0 runtime, when emitted.
   * Optional to match the `mf_manifest.v1` GTS schema, which does not
   * require this field.
   */
  globalName?: string;
  /**
   * Public URL base path for all chunk assets.
   * All relative chunk paths in shared[].assets and expose assets are
   * resolved against this value (e.g. 'http://localhost:3001/' or '/').
   */
  publicPath: string;
}

/**
 * MFE manifest — package-level metadata for an MFE package.
 *
 * Represents the manifest field from enriched mfe.json, produced by
 * the frontx-mf-gts Vite plugin. Contains metaData (from mf-manifest.json),
 * and shared[] (standalone ESM deps with resolved versions and chunkPaths).
 *
 * Per-module expose chunk paths are stored separately on MfeEntryMF.exposeAssets.
 *
 * GTS Type: gts.hai3.mfes.mfe.mf_manifest.v1~
 */
export interface MfManifest {
  /** The GTS type ID for this manifest. */
  id: string;
  /** Human-readable MFE name, matches metaData.name. */
  name: string;
  /** Package-level metadata: publicPath, remoteEntry descriptor, etc. */
  metaData: MfManifestMetaData;
  /** Shared dependency declarations with chunk paths and unwrap keys. */
  shared: MfManifestShared[];
}
