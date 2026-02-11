/**
 * Bridge Factory for ScreensetsRegistry
 *
 * Creates bridge connections between host and child MFEs.
 * This is extracted to avoid unused code warnings.
 *
 * @packageDocumentation
 * @internal
 */

import type { ParentMfeBridge, ChildMfeBridge } from '../handler/types';
import type { SharedProperty, ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions } from '../mediator/types';
import type { ExtensionDomainState } from './extension-manager';
import { ChildMfeBridgeImpl } from '../bridge/ChildMfeBridge';
import { ParentMfeBridgeImpl } from '../bridge/ParentMfeBridge';

/**
 * Create a bridge connection between host and child MFE.
 * INTERNAL: Called by mountExtension.
 *
 * @param domainState - Domain state containing properties and subscribers
 * @param extensionId - ID of the extension
 * @param entryTypeId - Type ID of the MFE entry
 * @param executeActionsChain - Callback for executing actions chains from child to parent
 * @returns Object containing parent and child bridge instances
 */
export function createBridge(
  domainState: ExtensionDomainState,
  extensionId: string,
  entryTypeId: string,
  executeActionsChain: (chain: ActionsChain, options?: ChainExecutionOptions) => Promise<ChainResult>
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
export function disposeBridge(
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
