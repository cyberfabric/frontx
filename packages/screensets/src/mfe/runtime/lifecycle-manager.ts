/**
 * Lifecycle Manager - Abstract Interface
 *
 * Abstract lifecycle manager interface defining the contract for lifecycle
 * stage triggering.
 *
 * @packageDocumentation
 * @internal
 */

import type { ExtensionDomain, Extension, ActionsChain } from '../types';

/**
 * Action chain executor function type.
 * Used by LifecycleManager to execute lifecycle hook actions chains.
 */
export type ActionChainExecutor = (chain: ActionsChain) => Promise<void>;

/**
 * Error handler function type.
 * Used to handle errors during lifecycle execution.
 */
export type ErrorHandler = (error: Error, context: Record<string, unknown>) => void;

/**
 * Lifecycle stage internal trigger function type.
 * Used for testing compatibility - allows tests to spy on internal method calls.
 */
export type LifecycleStageInternalTrigger = (
  entity: Extension | ExtensionDomain,
  stageId: string
) => Promise<void>;

/**
 * Abstract lifecycle manager for lifecycle stage triggering.
 *
 * This is the exportable abstraction that defines the contract for
 * lifecycle management. Concrete implementations encapsulate the
 * execution logic for lifecycle hooks.
 *
 * Key Responsibilities:
 * - Trigger lifecycle stages for extensions
 * - Trigger lifecycle stages for domains (all extensions)
 * - Trigger lifecycle stages for domains themselves
 * - Execute lifecycle hook action chains
 *
 * Key Benefits:
 * - Dependency Inversion: ScreensetsRegistry depends on abstraction
 * - Testability: Can inject mock managers for testing
 * - Encapsulation: Execution logic is hidden in concrete class
 */
export abstract class LifecycleManager {
  /**
   * Trigger a lifecycle stage for a specific extension.
   * Executes all lifecycle hooks registered for the given stage.
   *
   * @param extensionId - ID of the extension
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerLifecycleStage(extensionId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for all extensions in a domain.
   * Useful for custom stages like "refresh" that affect all widgets.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void>;

  /**
   * Trigger a lifecycle stage for a domain itself.
   * Executes hooks registered on the domain entity.
   *
   * @param domainId - ID of the domain
   * @param stageId - ID of the lifecycle stage to trigger
   * @returns Promise resolving when all hooks have executed
   */
  abstract triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void>;

  /**
   * Internal helper for triggering lifecycle stages on entities directly.
   * INTERNAL: Used by ScreensetsRegistry for test compatibility.
   *
   * @param entity - Extension or ExtensionDomain entity
   * @param stageId - ID of the lifecycle stage to trigger
   * @param skipCallback - If true, skip the callback and execute directly (used when called from registry shim)
   * @returns Promise resolving when all hooks have executed
   * @internal
   */
  abstract triggerLifecycleStageInternal(
    entity: Extension | ExtensionDomain,
    stageId: string,
    skipCallback?: boolean
  ): Promise<void>;
}
