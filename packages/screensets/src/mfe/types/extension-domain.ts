/**
 * Extension Domain Type Definitions
 *
 * ExtensionDomain defines an extension point where MFEs can be mounted.
 *
 * @packageDocumentation
 */

import type { LifecycleHook } from './lifecycle';

/**
 * Defines an extension point (domain) where MFEs can be mounted
 * GTS Type: gts.hai3.screensets.ext.domain.v1~
 */
export interface ExtensionDomain {
  /** The GTS type ID for this domain */
  id: string;
  /** SharedProperty type IDs provided to MFEs in this domain */
  sharedProperties: string[];
  /** Action type IDs that can target extensions in this domain */
  actions: string[];
  /** Action type IDs extensions can send when targeting this domain */
  extensionsActions: string[];
  /**
   * Optional GTS type ID for extension uiMeta schema validation.
   * If specified, extensions must have their uiMeta validated against this type.
   * Uses standard plugin.validateInstance(typeId, instance) - no pre-registration needed.
   */
  extensionsUiMetaTypeId?: string;
  /** Default timeout for actions targeting this domain (milliseconds, REQUIRED) */
  defaultActionTimeout: number;
  /** Lifecycle stage type IDs supported for the domain itself */
  lifecycleStages: string[];
  /** Lifecycle stage type IDs supported for extensions in this domain */
  extensionsLifecycleStages: string[];
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
}
