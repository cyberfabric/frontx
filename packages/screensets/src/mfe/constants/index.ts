/**
 * HAI3 MFE Constants
 *
 * Convenience constants for HAI3 MFE type IDs and action IDs.
 * These are ADDITIONAL constants beyond the type ID reference constants
 * already defined in init.ts (HAI3_CORE_TYPE_IDS, HAI3_MF_TYPE_IDS, HAI3_LIFECYCLE_STAGE_IDS).
 *
 * @packageDocumentation
 */

// ============================================================================
// Schema Type IDs (convenience re-exports)
// ============================================================================

/**
 * MfeEntry schema type ID (abstract base contract).
 * All MFE entry points must derive from this type.
 */
export const HAI3_MFE_ENTRY = 'gts.hai3.mfes.mfe.entry.v1~';

/**
 * MfeEntryMF schema type ID (Module Federation variant).
 * Derives from MfeEntry and adds Module Federation-specific properties.
 */
export const HAI3_MFE_ENTRY_MF = 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~';

/**
 * MfManifest schema type ID (Module Federation manifest).
 * Standalone type for Module Federation manifest configuration.
 */
export const HAI3_MF_MANIFEST = 'gts.hai3.mfes.mfe.mf_manifest.v1~';

/**
 * ExtensionDomain schema type ID (extension point contract).
 * Defines an extension point where MFEs can register extensions.
 */
export const HAI3_EXT_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~';

/**
 * Extension schema type ID (extension binding).
 * Binds an MFE entry to an extension domain.
 */
export const HAI3_EXT_EXTENSION = 'gts.hai3.mfes.ext.extension.v1~';

/**
 * Action schema type ID (communication action).
 * Defines a domain action with target and self-id fields.
 */
export const HAI3_EXT_ACTION = 'gts.hai3.mfes.comm.action.v1~';

// ============================================================================
// Action Instance IDs (generic actions for all domains)
// ============================================================================

/**
 * Load extension action instance ID.
 * Generic action used by all domains to load an extension.
 */
export const HAI3_ACTION_LOAD_EXT = 'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1';

/**
 * Unload extension action instance ID.
 * Generic action used by all domains to unload an extension.
 */
export const HAI3_ACTION_UNLOAD_EXT = 'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1';
