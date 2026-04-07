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
import type { ActionHandler } from '../mediator/types';

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
   * @param domainActions - Action type IDs the entry declares it can receive
   * @param executeActionsChain - Callback for executing actions chains
   * @param registerCatchAllActionHandler - Callback for registering catch-all handlers (child domain forwarding)
   * @param unregisterCatchAllActionHandler - Callback for unregistering catch-all handlers
   * @param registerExtensionActionHandler - Callback for registering per-(extensionId, actionTypeId) handlers
   * @param unregisterExtensionActionHandler - Callback for unregistering all extension handlers
   * @returns Object containing parent and child bridge instances
   */
  abstract createBridge(
    domainState: ExtensionDomainState,
    extensionId: string,
    entryTypeId: string,
    domainActions: readonly string[],
    executeActionsChain: (chain: ActionsChain) => Promise<void>,
    registerCatchAllActionHandler: (domainId: string, handler: ActionHandler) => void,
    unregisterCatchAllActionHandler: (domainId: string) => void,
    registerExtensionActionHandler: (extensionId: string, actionTypeId: string, handler: ActionHandler) => void,
    unregisterExtensionActionHandler: (extensionId: string) => void
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
