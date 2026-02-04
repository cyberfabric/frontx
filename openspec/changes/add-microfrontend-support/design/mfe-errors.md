# Design: MFE Error Class Hierarchy

This document covers the error class hierarchy for the MFE system.

---

## Context

The MFE system has multiple failure points: [bundle loading](./mfe-loading.md), contract validation, [action chain](./mfe-actions.md) execution, and [domain/extension](./mfe-domain.md) registration. Each failure type requires specific error information for debugging and recovery. The error hierarchy provides typed errors with contextual data for each scenario.

All MFE errors extend MfeError, which provides a base with error code and message. Specific errors add relevant context (type IDs, validation errors, chain execution state).

## Definition

**MfeError**: Base error class for all MFE-related errors, providing a `code` property for programmatic error handling.

**Derived Errors**: Specialized error classes (MfeLoadError, ContractValidationError, ChainExecutionError, etc.) that extend MfeError with scenario-specific context and structured error data.

---

## Decisions

### Decision 15: Error Class Hierarchy

The MFE system defines a hierarchy of error classes for specific failure scenarios.

#### Error Classes

```typescript
// packages/screensets/src/mfe/errors/index.ts

/**
 * Base error class for all MFE errors
 */
class MfeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MfeError';
  }
}

/**
 * Error thrown when MFE bundle fails to load
 */
class MfeLoadError extends MfeError {
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
class ContractValidationError extends MfeError {
  constructor(
    public readonly errors: ContractError[],
    public readonly entryTypeId?: string,
    public readonly domainTypeId?: string
  ) {
    const details = errors.map(e => `  - ${e.type}: ${e.details}`).join('\n');
    super(
      `Contract validation failed:\n${details}`,
      'CONTRACT_VALIDATION_ERROR'
    );
    this.name = 'ContractValidationError';
  }
}

/**
 * Error thrown when uiMeta validation fails
 */
class UiMetaValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string,
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `uiMeta validation failed for extension '${extensionTypeId}' against domain '${domainTypeId}':\n${details}`,
      'UI_META_VALIDATION_ERROR'
    );
    this.name = 'UiMetaValidationError';
  }
}

/**
 * Error thrown when actions chain execution fails
 */
class ChainExecutionError extends MfeError {
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
class MfeVersionMismatchError extends MfeError {
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
class MfeTypeConformanceError extends MfeError {
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
class DomainValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
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
class ExtensionValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
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
class UnsupportedDomainActionError extends MfeError {
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
class UnsupportedLifecycleStageError extends MfeError {
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

export {
  MfeError,
  MfeLoadError,
  ContractValidationError,
  UiMetaValidationError,
  ChainExecutionError,
  MfeVersionMismatchError,
  MfeTypeConformanceError,
  DomainValidationError,
  ExtensionValidationError,
  UnsupportedDomainActionError,
  UnsupportedLifecycleStageError,
};
```
