/**
 * Runtime Bridge Factory
 *
 * Abstract runtime bridge factory -- contract for internal bridge wiring.
 * Creates bidirectional bridge connections between host and child MFEs,
 * including property subscription wiring, action chain callback injection,
 * and child domain forwarding setup.
 *
 * This is NOT the same as MfeBridgeFactory in handler/types.ts, which is
 * a public abstraction for custom handler bridge implementations.
 *
 * @packageDocumentation
 * @internal
 */

import type { ParentMfeBridge, ChildMfeBridge } from '../handler/types';
import type { ExtensionDomainState } from './extension-manager';
import type { ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator/types';

/**
 * Abstract runtime bridge factory -- contract for internal bridge wiring.
 *
 * Creates bidirectional bridge connections between host and child MFEs,
 * including property subscription wiring, action chain callback injection,
 * and child domain forwarding setup.
 *
 * This is NOT the same as MfeBridgeFactory in handler/types.ts, which is
 * a public abstraction for custom handler bridge implementations.
 *
 * @internal
 */
export abstract class RuntimeBridgeFactory {
  /**
   * Create a bridge connection between host and child MFE.
   *
   * @param domainState - Domain state containing properties and subscribers
   * @param extensionId - ID of the extension
   * @param entryTypeId - Type ID of the MFE entry
   * @param executeActionsChain - Callback for executing actions chains
   * @param registerDomainActionHandler - Callback for registering child domain action handlers
   * @param unregisterDomainActionHandler - Callback for unregistering child domain action handlers
   * @returns Object containing parent and child bridge instances
   */
  abstract createBridge(
    domainState: ExtensionDomainState,
    extensionId: string,
    entryTypeId: string,
    executeActionsChain: (chain: ActionsChain, options?: ChainExecutionOptions) => Promise<ChainResult>,
    registerDomainActionHandler: (domainId: string, handler: ActionHandler) => void,
    unregisterDomainActionHandler: (domainId: string) => void
  ): { parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge };

  /**
   * Dispose a bridge connection and clean up domain subscribers.
   *
   * @param domainState - Domain state containing property subscribers
   * @param parentBridge - Parent bridge to dispose
   */
  abstract disposeBridge(
    domainState: ExtensionDomainState,
    parentBridge: ParentMfeBridge
  ): void;
}
