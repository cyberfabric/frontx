/**
 * Default Runtime Bridge Factory Implementation
 *
 * Concrete runtime bridge factory that handles all internal bridge wiring:
 * creates bridge pairs, connects property subscriptions, wires action chain
 * callbacks, and sets up child domain forwarding.
 *
 * @packageDocumentation
 * @internal
 */

import type { ParentMfeBridge, ChildMfeBridge } from '../handler/types';
import type { SharedProperty, ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator/types';
import type { ExtensionDomainState } from './extension-manager';
import { RuntimeBridgeFactory } from './runtime-bridge-factory';
import { ChildMfeBridgeImpl } from '../bridge/ChildMfeBridge';
import { ParentMfeBridgeImpl } from '../bridge/ParentMfeBridge';
import { ChildDomainForwardingHandler } from '../bridge/ChildDomainForwardingHandler';

/**
 * Default runtime bridge factory implementation.
 *
 * Handles all internal bridge wiring: creates bridge pairs, connects
 * property subscriptions, wires action chain callbacks, and sets up
 * child domain forwarding.
 *
 * @internal
 */
export class DefaultRuntimeBridgeFactory extends RuntimeBridgeFactory {
  /**
   * Create a bridge connection between host and child MFE.
   * INTERNAL: Called by mountExtension.
   *
   * @param domainState - Domain state containing properties and subscribers
   * @param extensionId - ID of the extension
   * @param entryTypeId - Type ID of the MFE entry
   * @param executeActionsChain - Callback for executing actions chains from child to parent
   * @param registerDomainActionHandler - Callback for registering child domain action handlers in parent mediator
   * @param unregisterDomainActionHandler - Callback for unregistering child domain action handlers from parent mediator
   * @returns Object containing parent and child bridge instances
   */
  createBridge(
    domainState: ExtensionDomainState,
    extensionId: string,
    entryTypeId: string,
    executeActionsChain: (chain: ActionsChain, options?: ChainExecutionOptions) => Promise<ChainResult>,
    registerDomainActionHandler: (domainId: string, handler: ActionHandler) => void,
    unregisterDomainActionHandler: (domainId: string) => void
  ): { parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge } {

    // Generate unique instance ID
    const instanceId = `${extensionId}:${Date.now()}`;

    // Create child bridge
    const childBridge = new ChildMfeBridgeImpl(domainState.domain.id, entryTypeId, instanceId);

    // Create parent bridge (concrete type for access to internal methods)
    const parentBridgeImpl = new ParentMfeBridgeImpl(childBridge);

    // Connect child to parent
    childBridge.setParentBridge(parentBridgeImpl);

    // Wire child action handler (internal wiring, not on public interface)
    parentBridgeImpl.onChildAction(executeActionsChain);

    // Wire registry's executeActionsChain to child bridge as capability pass-through
    childBridge.setExecuteActionsChainCallback(executeActionsChain);

    // Wire child domain forwarding callbacks
    const registerChildDomainCallback = (domainId: string) => {
      const handler = new ChildDomainForwardingHandler(parentBridgeImpl, domainId);
      registerDomainActionHandler(domainId, handler);
    };

    const unregisterChildDomainCallback = (domainId: string) => {
      unregisterDomainActionHandler(domainId);
    };

    childBridge.setChildDomainCallbacks(registerChildDomainCallback, unregisterChildDomainCallback);

    // Populate initial properties from domain state
    for (const [propertyTypeId, sharedProperty] of domainState.properties) {
      childBridge.receivePropertyUpdate(propertyTypeId, sharedProperty);
    }

    // Subscribe to domain property updates and track subscribers for cleanup
    for (const propertyTypeId of domainState.domain.sharedProperties) {
      if (!domainState.propertySubscribers.has(propertyTypeId)) {
        domainState.propertySubscribers.set(propertyTypeId, new Set());
      }
      const subscriber = (value: SharedProperty) => {
        parentBridgeImpl.receivePropertyUpdate(value.id, value.value);
      };
      domainState.propertySubscribers.get(propertyTypeId)!.add(subscriber);

      // Track subscriber in parent bridge for cleanup on disposal
      parentBridgeImpl.registerPropertySubscriber(propertyTypeId, subscriber);
    }

    return { parentBridge: parentBridgeImpl, childBridge };
  }

  /**
   * Dispose a bridge connection and clean up domain subscribers.
   * INTERNAL: Called by unmountExtension.
   *
   * @param domainState - Domain state containing property subscribers
   * @param parentBridge - Parent bridge to dispose
   */
  disposeBridge(
    domainState: ExtensionDomainState,
    parentBridge: ParentMfeBridge
  ): void {
    // Access concrete type for internal methods
    if (!(parentBridge instanceof ParentMfeBridgeImpl)) {
      throw new Error('disposeBridge requires a ParentMfeBridgeImpl instance');
    }
    const impl = parentBridge;

    // Remove property subscribers from domain before disposing bridge
    const subscribers = impl.getPropertySubscribers();
    for (const [propertyTypeId, subscriber] of subscribers) {
      const domainSubscribers = domainState.propertySubscribers.get(propertyTypeId);
      if (domainSubscribers) {
        domainSubscribers.delete(subscriber);
      }
    }

    // Now dispose the bridge
    parentBridge.dispose();
  }
}
