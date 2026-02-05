/**
 * Extension Type Definitions
 *
 * Extension binds an MFE entry to an extension domain, creating a concrete MFE instance.
 *
 * @packageDocumentation
 */

import type { LifecycleHook } from './lifecycle';

/**
 * Binds an MFE entry to an extension domain
 * GTS Type: gts.hai3.screensets.ext.extension.v1~
 */
export interface Extension {
  /** The GTS type ID for this extension */
  id: string;
  /** ExtensionDomain type ID to mount into */
  domain: string;
  /** MfeEntry type ID to mount */
  entry: string;
  /**
   * Optional UI metadata instance.
   * If domain has extensionsUiMetaTypeId, this must conform to that schema.
   * Validated using plugin.validateInstance(domain.extensionsUiMetaTypeId, uiMeta).
   */
  uiMeta?: Record<string, unknown>;
  /** Optional lifecycle hooks - explicitly declared actions for each stage */
  lifecycle?: LifecycleHook[];
}
