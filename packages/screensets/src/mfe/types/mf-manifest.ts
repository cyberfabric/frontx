/**
 * Module Federation Manifest Type Definitions
 *
 * MfManifest contains package-level Module Federation 2.0 metadata shared
 * across all entries from the same MFE package. Per-module data (expose chunk
 * paths) is carried by MfeEntryMF.exposeAssets, not here.
 *
 * @packageDocumentation
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-chunk-path-type:p1

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
 * A single shared dependency entry from mfe.gts-manifest.json shared[].
 * Enriched at build time by the frontx-mf-gts Vite plugin with chunk path
 * and unwrap key data extracted from localSharedImportMap.
 */
export interface MfManifestShared {
  /** Unique identifier, typically "{mfeName}:{packageName}". */
  id: string;
  /** npm package name (e.g. 'react', '@cyberfabric/screensets'). */
  name: string;
  /** Concrete version bundled in this MFE (e.g. '19.2.4'). */
  version: string;
  /** Semver range required (e.g. '^19.2.4'). */
  requiredVersion: string;
  /**
   * Path or URL of the sync JS chunk for this dependency.
   * May be relative to publicPath (e.g. "assets/index-BGSiT06-.js") or an
   * absolute URL for portable shared deps (e.g. "http://host/portable/react.js").
   * Null when the package has no bundled chunk (peer-provided external).
   * Populated by the frontx-mf-gts build plugin; portable chunks are resolved
   * to absolute URLs by the generation script.
   */
  chunkPath: string | null;
  /**
   * Named export key to unwrap the module from the chunk.
   * The localSharedImportMap uses .then(t => t.KEY) for some packages.
   * Null when the chunk exports the module directly (no unwrap needed).
   * Populated by the frontx-mf-gts build plugin.
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
 * Package-level metadata from mf-manifest.json metaData.
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
  /** Global variable name used by the MF 2.0 runtime. */
  globalName: string;
  /** Version of the @module-federation plugin that produced this manifest. */
  pluginVersion: string;
  /**
   * Public URL base path for all chunk assets.
   * All relative chunk paths in shared[].assets and expose assets are
   * resolved against this value (e.g. 'http://localhost:3001/' or '/').
   */
  publicPath: string;
}

/**
 * Module Federation 2.0 GTS manifest — package-level metadata only.
 *
 * Represents the content of mfe.gts-manifest.json emitted by the
 * frontx-mf-gts Vite plugin. Enriches the raw mf-manifest.json with
 * mfInitKey (extracted from remoteEntry.js) and per-shared chunkPath /
 * unwrapKey data (extracted from localSharedImportMap).
 *
 * Per-module expose chunk paths are stored separately on MfeEntryMF.exposeAssets.
 *
 * GTS Type: gts.hai3.mfes.mfe.mf_manifest.v1~
 */
export interface MfManifest {
  /** The GTS type ID for this manifest (also the MFE name / container ID). */
  id: string;
  /** Human-readable MFE name, matches metaData.name. */
  name: string;
  /** Package-level metadata: publicPath, remoteEntry descriptor, etc. */
  metaData: MfManifestMetaData;
  /** Shared dependency declarations with chunk paths and unwrap keys. */
  shared: MfManifestShared[];
  /**
   * The globalThis key under which MF 2.0 proxy chunks register the
   * __mf_init__ promise (e.g. '__mf_init____mf__virtual/demoMfe__...').
   * Extracted from remoteEntry.js at build time by the frontx-mf-gts plugin.
   * Used by the handler to resolve the initPromise with the real FederationHost
   * instance before importing the expose blob URL.
   */
  mfInitKey: string;
}
