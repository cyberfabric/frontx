/**
 * Child Domain Forwarding Handler
 *
 * Forwards actions targeting a child domain through the bridge transport.
 *
 * When a child MFE registers its own domains, the parent runtime needs a way
 * to route actions to those domains. This handler is registered in the parent's
 * mediator for each child domain ID. When the parent's mediator resolves a target
 * that matches a child domain, it invokes this handler, which wraps the action
 * in an ActionsChain and forwards it via the private bridge transport.
 *
 * @packageDocumentation
 * @internal
 */

import type { ActionHandler } from '../mediator/types';
import type { ParentMfeBridgeImpl } from './ParentMfeBridge';

/**
 * Forwards actions targeting a child domain through the bridge transport.
 *
 * This handler is registered in the parent's mediator for each child domain ID.
 * When the parent's mediator resolves a target that matches a child domain,
 * it invokes this handler, which wraps the action in an ActionsChain and
 * forwards it via the private bridge transport.
 *
 * @internal
 */
export class ChildDomainForwardingHandler implements ActionHandler {
  constructor(
    private readonly parentBridgeImpl: ParentMfeBridgeImpl,
    private readonly childDomainId: string
  ) {}

  /**
   * Handle an action by forwarding it to the child runtime.
   *
   * @param actionTypeId - The type ID of the action
   * @param payload - The action payload
   * @returns Promise that resolves when action is handled
   * @throws Error if chain execution fails in child domain
   */
  async handleAction(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): Promise<void> {
    // Wrap the action in an ActionsChain for bridge transport.
    // The child registry's mediator will unwrap and execute it.
    const chain = {
      action: {
        type: actionTypeId,
        target: this.childDomainId,
        payload,
      },
    };

    // sendActionsChain() returns Promise<ChainResult>.
    // ActionHandler.handleAction() returns Promise<void>.
    // Map ChainResult to the void contract: reject if the chain did not complete.
    const result = await this.parentBridgeImpl.sendActionsChain(chain);
    if (!result.completed) {
      throw new Error(result.error ?? 'Chain execution failed in child domain');
    }
  }
}
