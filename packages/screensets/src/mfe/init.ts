/**
 * HAI3 MFE Type System Initialization
 *
 * This module exports GTS type ID constants for HAI3 MFE core types.
 * These are exported for reference only - the GTS plugin has all first-class
 * citizen schemas built-in, so no registration is needed.
 *
 * @packageDocumentation
 */

/**
 * GTS Type IDs for HAI3 MFE core types (8 types)
 *
 * These types define the core MFE contract model and are built into the GTS plugin.
 */
export const HAI3_CORE_TYPE_IDS = {
  /** Pure contract type (abstract base) */
  mfeEntry: 'gts.hai3.mfes.mfe.entry.v1~',
  /** Extension point contract */
  extensionDomain: 'gts.hai3.mfes.ext.domain.v1~',
  /** Extension binding */
  extension: 'gts.hai3.mfes.ext.extension.v1~',
  /** Property definition */
  sharedProperty: 'gts.hai3.mfes.comm.shared_property.v1~',
  /** Action type with target and self-id */
  action: 'gts.hai3.mfes.comm.action.v1~',
  /** Action chain for mediation */
  actionsChain: 'gts.hai3.mfes.comm.actions_chain.v1~',
  /** Lifecycle event type */
  lifecycleStage: 'gts.hai3.mfes.lifecycle.stage.v1~',
  /** Lifecycle stage to actions chain binding */
  lifecycleHook: 'gts.hai3.mfes.lifecycle.hook.v1~',
} as const;

/**
 * GTS Type IDs for default lifecycle stages (4 stages)
 *
 * These are the default lifecycle stages that HAI3 provides.
 * Domains and extensions can define additional custom lifecycle stages.
 */
export const HAI3_LIFECYCLE_STAGE_IDS = {
  /** Triggered after extension registration */
  init: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
  /** Triggered after extension mount */
  activated: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
  /** Triggered after extension unmount */
  deactivated: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
  /** Triggered before extension unregistration */
  destroyed: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
} as const;

/**
 * GTS Type IDs for Module Federation types (2 types)
 *
 * These types are specific to Module Federation-based MFE loading.
 */
export const HAI3_MF_TYPE_IDS = {
  /** Module Federation manifest (standalone) */
  mfManifest: 'gts.hai3.mfes.mfe.mf_manifest.v1~',
  /** Module Federation entry (derived from MfeEntry) */
  mfeEntryMf: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
} as const;

/**
 * NOTE: No registerHai3Types() function is needed.
 *
 * The GTS plugin registers all first-class citizen schemas during construction.
 * The gtsPlugin singleton has all HAI3 core types immediately available.
 *
 * See packages/screensets/src/mfe/plugins/gts/index.ts for implementation.
 */
