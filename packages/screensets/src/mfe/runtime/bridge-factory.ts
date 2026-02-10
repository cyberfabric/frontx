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
import type { SharedProperty } from '../types';
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
 * @returns Object containing parent and child bridge instances
 */
export function createBridge(
  domainState: ExtensionDomainState,
  extensionId: string,
  entryTypeId: string
): { parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge } {

  // Generate unique instance ID
  const instanceId = `${extensionId}:${Date.now()}`;

  // Create child bridge
  const childBridge = new ChildMfeBridgeImpl(domainState.domain.id, entryTypeId, instanceId);

  // Create parent bridge
  const parentBridge = new ParentMfeBridgeImpl(childBridge);

  // Connect child to parent
  childBridge.setParentBridge(parentBridge);

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
      parentBridge.receivePropertyUpdate(value.id, value.value);
    };
    domainState.propertySubscribers.get(propertyTypeId)!.add(subscriber);

    // Track subscriber in parent bridge for cleanup on disposal
    parentBridge.registerPropertySubscriber(propertyTypeId, subscriber);
  }

  return { parentBridge, childBridge };
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
  // Remove property subscribers from domain before disposing bridge
  const subscribers = parentBridge.getPropertySubscribers();
  for (const [propertyTypeId, subscriber] of subscribers) {
    const domainSubscribers = domainState.propertySubscribers.get(propertyTypeId);
    if (domainSubscribers) {
      domainSubscribers.delete(subscriber);
    }
  }

  // Now dispose the bridge
  parentBridge.dispose();
}
