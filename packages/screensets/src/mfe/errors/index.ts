/**
 * MFE Error Class Hierarchy
 *
 * Error classes for MFE system failures.
 *
 * @packageDocumentation
 */

import type { ValidationError } from '../plugins/types';
import type { Action, ActionsChain } from '../types';

/**
 * Contract validation error details
 */
export interface ContractError {
  /** Error type */
  type: 'missing_property' | 'unsupported_action' | 'unhandled_domain_action';
  /** Human-readable error details */
  details: string;
}

/**
 * Base error class for all MFE errors
 */
export class MfeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MfeError';
  }
}

/**
 * Error thrown when MFE bundle fails to load
 */
export class MfeLoadError extends MfeError {
  constructor(
    message: string,
    public readonly entryTypeId: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load MFE '${entryTypeId}': ${message}`, 'MFE_LOAD_ERROR');
    this.name = 'MfeLoadError';
  }
}

/**
 * Error thrown when contract validation fails
 */
export class ContractValidationError extends MfeError {
  constructor(
    public readonly errors: ContractError[],
    public readonly entryTypeId?: string,
    public readonly domainTypeId?: string
  ) {
    const details = errors.map((e) => `  - ${e.type}: ${e.details}`).join('\n');
    super(`Contract validation failed:\n${details}`, 'CONTRACT_VALIDATION_ERROR');
    this.name = 'ContractValidationError';
  }
}

/**
 * Error thrown when extension type hierarchy validation fails
 */
export class ExtensionTypeError extends MfeError {
  constructor(
    public readonly extensionTypeId: string,
    public readonly requiredBaseTypeId: string
  ) {
    super(
      `Extension type '${extensionTypeId}' does not derive from required base type '${requiredBaseTypeId}'`,
      'EXTENSION_TYPE_ERROR'
    );
    this.name = 'ExtensionTypeError';
  }
}

/**
 * Error thrown when actions chain execution fails
 */
export class ChainExecutionError extends MfeError {
  constructor(
    message: string,
    public readonly chain: ActionsChain,
    public readonly failedAction: Action,
    public readonly executedPath: string[],
    public readonly cause?: Error
  ) {
    super(
      `Actions chain execution failed at '${failedAction.type}': ${message}`,
      'CHAIN_EXECUTION_ERROR'
    );
    this.name = 'ChainExecutionError';
  }
}

/**
 * Error thrown when shared dependency version validation fails
 */
export class MfeVersionMismatchError extends MfeError {
  constructor(
    public readonly manifestTypeId: string,
    public readonly dependency: string,
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(
      `Version mismatch for '${dependency}' in MFE '${manifestTypeId}': expected ${expected}, got ${actual}`,
      'MFE_VERSION_MISMATCH_ERROR'
    );
    this.name = 'MfeVersionMismatchError';
  }
}

/**
 * Error thrown when type conformance check fails
 */
export class MfeTypeConformanceError extends MfeError {
  constructor(
    public readonly typeId: string,
    public readonly expectedBaseType: string
  ) {
    super(
      `Type '${typeId}' does not conform to base type '${expectedBaseType}'`,
      'MFE_TYPE_CONFORMANCE_ERROR'
    );
    this.name = 'MfeTypeConformanceError';
  }
}

/**
 * Error thrown when domain validation fails
 */
export class DomainValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly domainTypeId: string
  ) {
    const details = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Domain validation failed for '${domainTypeId}':\n${details}`,
      'DOMAIN_VALIDATION_ERROR'
    );
    this.name = 'DomainValidationError';
  }
}

/**
 * Error thrown when extension validation fails
 */
export class ExtensionValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string
  ) {
    const details = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Extension validation failed for '${extensionTypeId}':\n${details}`,
      'EXTENSION_VALIDATION_ERROR'
    );
    this.name = 'ExtensionValidationError';
  }
}

/**
 * Error thrown when an action is not supported by the target domain
 */
export class UnsupportedDomainActionError extends MfeError {
  constructor(
    message: string,
    public readonly actionTypeId: string,
    public readonly domainTypeId: string
  ) {
    super(message, 'UNSUPPORTED_DOMAIN_ACTION');
    this.name = 'UnsupportedDomainActionError';
  }
}

/**
 * Error thrown when a lifecycle hook references a stage not supported by the domain
 */
export class UnsupportedLifecycleStageError extends MfeError {
  constructor(
    message: string,
    public readonly stageId: string,
    public readonly entityId: string,
    public readonly supportedStages: string[]
  ) {
    super(message, 'UNSUPPORTED_LIFECYCLE_STAGE');
    this.name = 'UnsupportedLifecycleStageError';
  }
}

/**
 * Error thrown when no actions chain handler is registered on a child bridge
 */
export class NoActionsChainHandlerError extends MfeError {
  constructor(
    public readonly instanceId: string
  ) {
    super(
      `No actions chain handler registered for instance '${instanceId}'. Child MFEs must call bridge.onActionsChain() to receive parent actions chains.`,
      'NO_ACTIONS_CHAIN_HANDLER'
    );
    this.name = 'NoActionsChainHandlerError';
  }
}

/**
 * Error thrown when attempting to use a disposed bridge
 */
export class BridgeDisposedError extends MfeError {
  constructor(
    public readonly instanceId: string
  ) {
    super(
      `Bridge has been disposed for instance '${instanceId}'`,
      'BRIDGE_DISPOSED'
    );
    this.name = 'BridgeDisposedError';
  }
}

// NOTE: MfeErrorHandler, RetryHandler, and ErrorHandlerConfig are NOT re-exported here
// to avoid circular dependency (error-handler.ts imports from this file).
// Import them directly from '@hai3/screensets' or from './error-handler'.
