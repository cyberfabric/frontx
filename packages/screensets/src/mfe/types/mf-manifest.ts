/**
 * Module Federation Manifest Type Definitions
 *
 * MfManifest contains Module Federation 2.0 configuration for loading MFE bundles.
 *
 * @packageDocumentation
 */

/**
 * Configuration for a shared dependency in Module Federation.
 *
 * Module Federation shared dependencies provide TWO independent benefits:
 * 1. **Code/bundle sharing** - Download the code once, cache it (performance)
 * 2. **Runtime instance isolation** - Control whether instances are shared or isolated
 *
 * These benefits are NOT mutually exclusive! The `singleton` parameter controls
 * instance behavior while code sharing always provides the bundle optimization.
 *
 * - `singleton: false` (DEFAULT for MfeHandlerMF) = Code shared, instances ISOLATED per MFE
 * - `singleton: true` = Code shared, instance SHARED across all consumers
 *
 * HAI3 Default Handler (MfeHandlerMF) Recommendation:
 * - Use `singleton: false` (default) for anything with state (React, @hai3/*, GTS)
 * - Use `singleton: true` ONLY for truly stateless utilities (lodash, date-fns)
 *
 * Custom Handlers:
 * - May use `singleton: true` for internal MFEs that need to share state
 * - 3rd-party MFEs should ALWAYS use `singleton: false` (security)
 */
export interface SharedDependencyConfig {
  /** Package name (e.g., 'react', 'lodash', '@hai3/screensets') */
  name: string;
  /** Semver range (e.g., '^18.0.0', '^4.17.0') */
  requiredVersion: string;
  /**
   * Whether to share a single instance across all consumers.
   * Default: false (with MfeHandlerMF, each consumer gets its own isolated instance)
   *
   * - false: Code is shared (cached), but each MFE instance gets its OWN runtime instance
   * - true: Code is shared AND the same instance is used everywhere
   *
   * IMPORTANT for MfeHandlerMF (default handler):
   * - Only set to true for truly stateless utilities (lodash, date-fns)
   * - Libraries with state (React, state management libraries, GTS, @hai3/*) should use false
   *
   * Custom handlers may use different defaults based on isolation requirements.
   */
  singleton?: boolean;
}

/**
 * Module Federation manifest containing shared configuration
 * GTS Type: gts.hai3.mfes.mfe.mf_manifest.v1~
 */
export interface MfManifest {
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
