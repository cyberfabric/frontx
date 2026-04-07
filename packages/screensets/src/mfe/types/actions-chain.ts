/**
 * Actions Chain Type Definitions
 *
 * ActionsChain defines a linked structure of actions with success/failure branches.
 *
 * @packageDocumentation
 */

import type { Action } from './action';

/**
 * Defines a mediated chain of actions with success/failure branches
 * GTS Type: gts.hai3.mfes.comm.actions_chain.v1~
 *
 * Contains actual Action INSTANCES (embedded objects).
 * ActionsChain is NOT referenced by other types, so it has NO id field.
 */
export interface ActionsChain {
  /** Action instance (embedded object) */
  action: Action;
  /** Next chain to execute on success */
  next?: ActionsChain;
  /** Fallback chain to execute on failure */
  fallback?: ActionsChain;
  /**
   * Opaque per-invocation token for host↔MFE side channels (e.g. serverState handoff).
   * Set by the host framework on the chain link that triggers `mount_ext`; forwarded
   * into `MfeMountContext` so consumers never collide on extension/domain pairs alone.
   */
  mountRuntimeToken?: string;
}
