/**
 * Actions Chains Mediator Types
 *
 * Defines the abstract mediator interface for action chain execution.
 * This follows HAI3's SOLID OOP pattern: abstract class (exportable contract)
 * + concrete implementation (private).
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { ActionsChain } from '../types';

/**
 * Result of action chain execution.
 */
export interface ChainResult {
  /** Whether the chain completed successfully */
  completed: boolean;
  /** Array of action type IDs that were executed */
  path: string[];
  /** Error message if the chain failed */
  error?: string;
  /** Whether the chain timed out */
  timedOut?: boolean;
  /** Total execution time in milliseconds */
  executionTime?: number;
}

/**
 * Per-request execution options (chain-level only)
 *
 * NOTE: Action-level timeouts are defined in:
 * - ExtensionDomain.defaultActionTimeout (required)
 * - Action.timeout (optional override)
 *
 * Timeout is treated as a failure - the ActionsChain.fallback handles all failures uniformly.
 */
export interface ChainExecutionOptions {
  /**
   * Override chain timeout for this execution (ms)
   * This limits the total time for the entire chain execution.
   */
  chainTimeout?: number;
}

/**
 * Action handler interface for receiving actions.
 *
 * Extensions and domains implement this to handle incoming actions.
 */
export interface ActionHandler {
  /**
   * Handle an action.
   *
   * @param actionTypeId - The type ID of the action
   * @param payload - The action payload
   * @returns Promise that resolves when action is handled
   */
  handleAction(actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void>;
}

/**
 * Abstract mediator for action chain execution.
 *
 * This is the exportable abstraction that defines the contract for
 * action chain mediation. Concrete implementations encapsulate the
 * actual execution logic, handler registration, and timeout handling.
 *
 * Key Responsibilities:
 * - Execute action chains with success/failure branching
 * - Validate actions against target contracts
 * - Manage extension and domain action handlers
 * - Handle timeouts with fallback execution
 *
 * Key Benefits:
 * - Dependency Inversion: ScreensetsRegistry depends on abstraction, not concrete implementation
 * - Testability: Can inject mock mediators for testing
 * - Encapsulation: Execution logic is hidden in concrete class
 *
 * @example
 * ```typescript
 * class ScreensetsRegistry {
 *   private readonly mediator: ActionsChainsMediator;
 *
 *   constructor(config: ScreensetsRegistryConfig) {
 *     this.mediator = new ActionsChainsMediator(config.typeSystem, this);
 *   }
 * }
 * ```
 */
export abstract class ActionsChainsMediator {
  /**
   * The Type System plugin used by this mediator.
   */
  abstract readonly typeSystem: TypeSystemPlugin;

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   *
   * @param chain - The actions chain to execute
   * @param options - Optional per-request execution options (override defaults)
   * @returns Promise resolving to chain result
   */
  abstract executeActionsChain(
    chain: ActionsChain,
    options?: ChainExecutionOptions
  ): Promise<ChainResult>;

  /**
   * Register an extension's action handler for receiving actions.
   *
   * @param extensionId - ID of the extension
   * @param domainId - ID of the domain the extension belongs to
   * @param entryId - ID of the MFE entry
   * @param handler - The action handler
   */
  abstract registerExtensionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: ActionHandler
  ): void;

  /**
   * Unregister an extension's action handler.
   *
   * Handles any pending actions before unregistration.
   *
   * @param extensionId - ID of the extension to unregister
   */
  abstract unregisterExtensionHandler(extensionId: string): void;

  /**
   * Register a domain's action handler for receiving actions from extensions.
   *
   * @param domainId - ID of the domain
   * @param handler - The action handler
   */
  abstract registerDomainHandler(domainId: string, handler: ActionHandler): void;

  /**
   * Unregister a domain's action handler.
   *
   * @param domainId - ID of the domain to unregister
   */
  abstract unregisterDomainHandler(domainId: string): void;
}
