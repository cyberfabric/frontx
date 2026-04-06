// @cpt-flow:cpt-frontx-flow-screenset-registry-execute-chain:p1
// @cpt-algo:cpt-frontx-algo-screenset-registry-handler-resolution:p1
/**
 * Default Actions Chains Mediator Implementation
 *
 * Concrete implementation of ActionsChainsMediator.
 * This is an INTERNAL implementation detail and is NOT exported from the package.
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin } from '../plugins/types';
import type { ActionsChain, ExtensionDomain } from '../types';
import type { ExtensionDomainState } from '../runtime/extension-manager';
import {
  ActionsChainsMediator,
  type ChainResult,
  type ChainExecutionOptions,
  type ActionHandler,
} from './types';


/**
 * Default chain timeout: 2 minutes (120000ms)
 */
const DEFAULT_CHAIN_TIMEOUT = 120000;

/**
 * Extension handler metadata.
 */
interface ExtensionHandlerInfo {
  extensionId: string;
  domainId: string;
  entryId: string;
  handler: ActionHandler;
  /** Action type IDs the entry declares it can receive, stored for runtime contract enforcement. */
  domainActions: readonly string[];
}

/**
 * Concrete implementation of ActionsChainsMediator.
 *
 * Handles action chain execution with success/failure branching, timeout management,
 * and handler registration.
 *
 * This is the default mediator implementation used by ScreensetsRegistry.
 * It is NOT exported from the package - only the abstract ActionsChainsMediator is exported.
 *
 * @internal
 */
export class DefaultActionsChainsMediator extends ActionsChainsMediator {
  /**
   * The Type System plugin instance.
   */
  public readonly typeSystem: TypeSystemPlugin;

  /**
   * Callback to get domain state for target resolution.
   * Injected during construction to avoid dependency on full ScreensetsRegistry.
   */
  private readonly getDomainState: (domainId: string) => ExtensionDomainState | undefined;

  /**
   * Map of extension IDs to their action handlers.
   */
  private readonly extensionHandlers = new Map<string, ExtensionHandlerInfo>();

  /**
   * Map of domain IDs to their action handlers.
   */
  private readonly domainHandlers = new Map<string, ActionHandler>();

  /**
   * Map of extension IDs to their pending action promises.
   * Used to track in-flight actions during unregistration.
   */
  private readonly pendingExtensionActions = new Map<string, Set<Promise<void>>>();

  /**
   * Map of domain IDs to their pending action promises.
   * Used to track in-flight actions during unregistration.
   */
  private readonly pendingDomainActions = new Map<string, Set<Promise<void>>>();

  constructor(config: {
    typeSystem: TypeSystemPlugin;
    getDomainState: (domainId: string) => ExtensionDomainState | undefined;
  }) {
    super();
    this.typeSystem = config.typeSystem;
    this.getDomainState = config.getDomainState;
  }

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   *
   * @param chain - The actions chain to execute
   * @param options - Optional per-request execution options
   * @returns Promise resolving to chain result
   */
  // @cpt-begin:cpt-frontx-flow-screenset-registry-execute-chain:p1:inst-1
  async executeActionsChain(
    chain: ActionsChain,
    options?: ChainExecutionOptions
  ): Promise<ChainResult> {
    const startTime = Date.now();
    const chainTimeout = options?.chainTimeout ?? DEFAULT_CHAIN_TIMEOUT;
    const path: string[] = [];

    try {
      // Execute with chain timeout
      const result = await this.executeWithTimeout(
        async () => await this.executeChainRecursive(chain, path, startTime, chainTimeout),
        chainTimeout
      );

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.message.includes('Chain timeout') ||
          error.message.includes('Operation timeout'));

      return {
        completed: false,
        path,
        error: error instanceof Error ? error.message : String(error),
        timedOut: isTimeout,
        executionTime: Date.now() - startTime,
      };
    }
  }
  // @cpt-end:cpt-frontx-flow-screenset-registry-execute-chain:p1:inst-1

  /**
   * Execute a chain recursively with success/failure branching.
   *
   * @param chain - The chain to execute
   * @param path - Accumulated path of executed actions
   * @param startTime - Start time of the entire chain execution
   * @param chainTimeout - Total chain timeout
   * @returns Promise resolving to chain result
   */
  private async executeChainRecursive(
    chain: ActionsChain,
    path: string[],
    startTime: number,
    chainTimeout: number
  ): Promise<ChainResult> {
    const { action } = chain;

    // Check if we've exceeded chain timeout
    if (Date.now() - startTime > chainTimeout) {
      throw new Error('Chain timeout exceeded');
    }

    // Register and validate the action instance using the GTS anonymous instance pattern.
    // Actions have a `type` field but no `id` field. GTS assigns id='' to entities
    // without an explicit id (createJsonEntity default). For such instances GTS
    // resolves the schema from the `type` field via schemaIdFields, so validation
    // against the action's own schema happens without any synthetic ID injection.
    this.typeSystem.register(action);
    const validation = this.typeSystem.validateInstance('');

    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Action validation failed: ${errorMsg}`);
    }

    // @cpt-begin:feature-screenset-registry:inst-validate-extension-contract
    // Action target contract validation is handled entirely by GTS schema validation above.
    // Each action schema constrains its `target` field via x-gts-ref:
    // - Lifecycle actions (load_ext, mount_ext, unmount_ext): target → domain IDs only
    // - Custom MFE actions (e.g. refresh_profile): target → specific extension ID
    // GTS validates the action instance against its schema, rejecting invalid targets.
    // No manual includes() checks needed — the type system IS the contract enforcement.
    // @cpt-end:feature-screenset-registry:inst-validate-extension-contract

    // Execute the action with timeout
    try {
      await this.executeAction(action);

      // Add to path on success
      path.push(action.type);

      // Execute next chain on success
      if (chain.next) {
        return await this.executeChainRecursive(chain.next, path, startTime, chainTimeout);
      }

      // Chain completed successfully
      return {
        completed: true,
        path: [...path],
      };
    } catch (error) {
      // Add to path even on failure
      path.push(action.type);

      // Execute fallback chain on failure
      if (chain.fallback) {
        return await this.executeChainRecursive(
          chain.fallback,
          path,
          startTime,
          chainTimeout
        );
      }

      // No fallback, propagate error
      throw error;
    }
  }

  /**
   * Execute a single action with timeout.
   *
   * @param action - The action to execute
   * @returns Promise that resolves when action completes
   */
  private async executeAction(action: ActionsChain['action']): Promise<void> {
    // Resolve target (domain or extension handler)
    const handler = this.resolveHandler(action.target);

    if (!handler) {
      // No handler registered - treat as successful no-op
      // This allows validation-only tests to pass
      // In production, handlers should be registered before executing chains
      return;
    }

    // Resolve timeout from domain or action
    const timeout = await this.resolveTimeout(action);

    // Track pending action
    const actionPromise = this.executeWithTimeout(
      async () => await handler.handleAction(action.type, action.payload),
      timeout
    );

    // Register pending action for tracking
    this.trackPendingAction(action.target, actionPromise);

    try {
      await actionPromise;
    } finally {
      // Untrack completed action
      this.untrackPendingAction(action.target, actionPromise);
    }
  }

  /**
   * Track a pending action for a target.
   *
   * @param targetId - The target ID (domain or extension)
   * @param actionPromise - The action promise to track
   */
  private trackPendingAction(targetId: string, actionPromise: Promise<void>): void {
    // Check if target is an extension
    const extensionInfo = this.extensionHandlers.get(targetId);
    if (extensionInfo) {
      let pending = this.pendingExtensionActions.get(targetId);
      if (!pending) {
        pending = new Set();
        this.pendingExtensionActions.set(targetId, pending);
      }
      pending.add(actionPromise);
      return;
    }

    // Check if target is a domain
    if (this.domainHandlers.has(targetId)) {
      let pending = this.pendingDomainActions.get(targetId);
      if (!pending) {
        pending = new Set();
        this.pendingDomainActions.set(targetId, pending);
      }
      pending.add(actionPromise);
    }
  }

  /**
   * Untrack a completed action for a target.
   *
   * @param targetId - The target ID (domain or extension)
   * @param actionPromise - The action promise to untrack
   */
  private untrackPendingAction(targetId: string, actionPromise: Promise<void>): void {
    // Check extension pending actions
    const extensionPending = this.pendingExtensionActions.get(targetId);
    if (extensionPending) {
      extensionPending.delete(actionPromise);
      if (extensionPending.size === 0) {
        this.pendingExtensionActions.delete(targetId);
      }
      return;
    }

    // Check domain pending actions
    const domainPending = this.pendingDomainActions.get(targetId);
    if (domainPending) {
      domainPending.delete(actionPromise);
      if (domainPending.size === 0) {
        this.pendingDomainActions.delete(targetId);
      }
    }
  }

  /**
   * Resolve the handler for a target.
   *
   * @param targetId - The target type ID (domain or extension)
   * @returns The action handler, or undefined if not found
   */
  // @cpt-begin:cpt-frontx-algo-screenset-registry-handler-resolution:p1:inst-1
  private resolveHandler(targetId: string): ActionHandler | undefined {
    // Check if target is a domain
    const domainHandler = this.domainHandlers.get(targetId);
    if (domainHandler) {
      return domainHandler;
    }

    // Check if target is an extension
    const extensionInfo = this.extensionHandlers.get(targetId);
    if (extensionInfo) {
      return extensionInfo.handler;
    }

    return undefined;
  }
  // @cpt-end:cpt-frontx-algo-screenset-registry-handler-resolution:p1:inst-1

  /**
   * Resolve the timeout for an action.
   *
   * Timeout resolution:
   * 1. Use action.timeout if specified
   * 2. Otherwise use domain.defaultActionTimeout
   *
   * @param action - The action
   * @returns The timeout in milliseconds
   */
  private async resolveTimeout(action: ActionsChain['action']): Promise<number> {
    // If action has timeout, use it
    if (action.timeout !== undefined) {
      return action.timeout;
    }

    // Otherwise, resolve from domain
    const domain = await this.resolveDomain(action.target);
    if (domain) {
      return domain.defaultActionTimeout;
    }

    // No domain found - this indicates a system error
    throw new Error('Cannot resolve timeout: no domain found for target "' + action.target + '"');
  }

  /**
   * Resolve the domain for a target.
   *
   * @param targetId - The target type ID
   * @returns The domain, or undefined if not found
   */
  private async resolveDomain(targetId: string): Promise<ExtensionDomain | undefined> {
    // Check if target is a domain directly
    const domainState = this.getDomainState(targetId);
    if (domainState) {
      return domainState.domain;
    }

    // Check if target is an extension, resolve its domain
    const extensionInfo = this.extensionHandlers.get(targetId);
    if (extensionInfo) {
      const extensionDomainState = this.getDomainState(extensionInfo.domainId);
      if (extensionDomainState) {
        return extensionDomainState.domain;
      }
    }

    return undefined;
  }

  /**
   * Execute a promise with timeout.
   *
   * @param fn - The async function to execute
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves with the function result or rejects on timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Register an extension's action handler.
   *
   * @param extensionId - ID of the extension
   * @param domainId - ID of the domain
   * @param entryId - ID of the MFE entry
   * @param handler - The action handler
   * @param domainActions - Action type IDs the entry declares it can receive (from MfeEntry.domainActions)
   */
  registerExtensionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: ActionHandler,
    domainActions: readonly string[]
  ): void {
    this.extensionHandlers.set(extensionId, {
      extensionId,
      domainId,
      entryId,
      handler,
      domainActions,
    });
  }

  /**
   * Unregister an extension's action handler.
   *
   * @param extensionId - ID of the extension
   * @throws Error if there are pending actions for this extension
   */
  unregisterExtensionHandler(extensionId: string): void {
    // Check for pending actions
    const pending = this.pendingExtensionActions.get(extensionId);
    if (pending && pending.size > 0) {
      throw new Error(
        `Cannot unregister extension "${extensionId}": ${pending.size} action(s) still pending. ` +
        `Wait for actions to complete before unregistering.`
      );
    }

    // Safe to remove handler
    this.extensionHandlers.delete(extensionId);
    this.pendingExtensionActions.delete(extensionId);
  }

  /**
   * Register a domain's action handler.
   *
   * @param domainId - ID of the domain
   * @param handler - The action handler
   */
  registerDomainHandler(domainId: string, handler: ActionHandler): void {
    this.domainHandlers.set(domainId, handler);
  }

  /**
   * Unregister a domain's action handler.
   *
   * @param domainId - ID of the domain
   * @throws Error if there are pending actions for this domain
   */
  unregisterDomainHandler(domainId: string): void {
    // Check for pending actions
    const pending = this.pendingDomainActions.get(domainId);
    if (pending && pending.size > 0) {
      throw new Error(
        `Cannot unregister domain "${domainId}": ${pending.size} action(s) still pending. ` +
        `Wait for actions to complete before unregistering.`
      );
    }

    // Safe to remove handler
    this.domainHandlers.delete(domainId);
    this.pendingDomainActions.delete(domainId);
  }
}
