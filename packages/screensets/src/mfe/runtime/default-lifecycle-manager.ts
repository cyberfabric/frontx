/**
 * DefaultLifecycleManager - Concrete Lifecycle Manager Implementation
 *
 * Default implementation of LifecycleManager.
 * Contains all business logic for triggering lifecycle stages and executing hooks.
 *
 * @packageDocumentation
 * @internal
 */

import type { ExtensionDomain, Extension } from '../types';
import { DefaultExtensionManager } from './default-extension-manager';
import {
  LifecycleManager,
  type ActionChainExecutor,
} from './lifecycle-manager';

/**
 * Default lifecycle manager implementation.
 *
 * Manages lifecycle stage triggering for extensions and domains.
 *
 * @internal
 */
export class DefaultLifecycleManager extends LifecycleManager {
  /**
   * Extension manager for accessing extension and domain state.
   */
  private readonly extensionManager: DefaultExtensionManager;

  /**
   * Action chain executor for executing lifecycle hook action chains.
   */
  private readonly executeActionsChain: ActionChainExecutor;

  constructor(
    extensionManager: DefaultExtensionManager,
    executeActionsChain: ActionChainExecutor
  ) {
    super();
    this.extensionManager = extensionManager;
    this.executeActionsChain = executeActionsChain;
  }

  /**
   * Trigger a lifecycle stage for a specific extension.
   * Executes all lifecycle hooks registered for the given stage.
   *
   * @param extensionId - ID of the extension
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerLifecycleStage(extensionId: string, stageId: string): Promise<void> {
    const extensionState = this.extensionManager.getExtensionState(extensionId);
    if (!extensionState) {
      throw new Error(`Cannot trigger lifecycle stage: extension '${extensionId}' is not registered`);
    }

    await this.triggerLifecycleStageInternal(extensionState.extension, stageId);
  }

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Useful for custom stages like "refresh" that affect all widgets.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void> {
    const domainState = this.extensionManager.getDomainState(domainId);
    if (!domainState) {
      throw new Error(`Cannot trigger lifecycle stage: domain '${domainId}' is not registered`);
    }

    const extensionStates = this.extensionManager.getExtensionStatesForDomain(domainId);
    for (const extensionState of extensionStates) {
      await this.triggerLifecycleStageInternal(extensionState.extension, stageId);
    }
  }

  /**
   * Trigger a lifecycle stage for a domain itself.
   * Executes hooks registered on the domain entity.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  async triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void> {
    const domainState = this.extensionManager.getDomainState(domainId);
    if (!domainState) {
      throw new Error(`Cannot trigger lifecycle stage: domain '${domainId}' is not registered`);
    }

    await this.triggerLifecycleStageInternal(domainState.domain, stageId);
  }

  /**
   * Internal helper for triggering lifecycle stages.
   * Collects hooks matching the stage and executes their actions chains in declaration order.
   *
   * @param entity - Extension or ExtensionDomain entity
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   * @private
   */
  private async triggerLifecycleStageInternal(
    entity: Extension | ExtensionDomain,
    stageId: string
  ): Promise<void> {
    if (!entity.lifecycle) {
      return; // No hooks to execute
    }

    // Collect hooks matching the stage
    const hooks = entity.lifecycle.filter(hook => hook.stage === stageId);
    if (hooks.length === 0) {
      return; // No hooks for this stage
    }

    // Execute actions chains in declaration order
    for (const hook of hooks) {
      try {
        await this.executeActionsChain(hook.actions_chain);
      } catch (error) {
        // Log error but don't stop execution of remaining hooks
        const errorObj = error instanceof Error ? error : new Error(String(error));
        console.error('[DefaultLifecycleManager] Lifecycle hook error:', errorObj, {
          entityId: entity.id,
          stageId,
          hookStage: hook.stage
        });
      }
    }
  }
}
