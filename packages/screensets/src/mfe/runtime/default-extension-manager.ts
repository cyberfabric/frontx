/**
 * DefaultExtensionManager - Concrete Extension Manager Implementation
 *
 * Default implementation of ExtensionManager using Maps for storage.
 * Contains all business logic for registration, validation, and lifecycle triggering.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  ExtensionDomain,
  Extension,
  MfeEntry,
  SharedProperty,
} from '../types';
import type { TypeSystemPlugin } from '../plugins/types';
import {
  ExtensionManager,
  type ExtensionDomainState,
  type ExtensionState,
  type LifecycleTriggerCallback,
  type DomainLifecycleTriggerCallback,
} from './extension-manager';
import { validateDomainLifecycleHooks, validateExtensionLifecycleHooks } from '../validation/lifecycle';
import { validateContract } from '../validation/contract';
import { validateExtensionType } from '../validation/extension-type';
import {
  DomainValidationError,
  UnsupportedLifecycleStageError,
  ExtensionValidationError,
  ContractValidationError,
  ExtensionTypeError,
} from '../errors';

/**
 * Default extension manager implementation.
 *
 * Uses Maps to store domain and extension state.
 * Contains all business logic for registration, validation, and lifecycle triggering.
 *
 * @internal
 */
export class DefaultExtensionManager extends ExtensionManager {
  /**
   * Registered extension domains.
   */
  private readonly domains = new Map<string, ExtensionDomainState>();

  /**
   * Registered extensions.
   */
  private readonly extensions = new Map<string, ExtensionState>();

  /**
   * Type System plugin for validation.
   */
  private readonly typeSystem: TypeSystemPlugin;

  /**
   * Lifecycle trigger for extensions.
   */
  private readonly triggerLifecycle: LifecycleTriggerCallback;

  /**
   * Domain lifecycle trigger (domain itself).
   */
  private readonly triggerDomainOwnLifecycle: DomainLifecycleTriggerCallback;

  /**
   * Unmount extension callback.
   */
  private readonly unmountExtension: (extensionId: string) => Promise<void>;

  constructor(config: {
    typeSystem: TypeSystemPlugin;
    triggerLifecycle: LifecycleTriggerCallback;
    triggerDomainOwnLifecycle: DomainLifecycleTriggerCallback;
    unmountExtension: (extensionId: string) => Promise<void>;
  }) {
    super();
    this.typeSystem = config.typeSystem;
    this.triggerLifecycle = config.triggerLifecycle;
    this.triggerDomainOwnLifecycle = config.triggerDomainOwnLifecycle;
    this.unmountExtension = config.unmountExtension;
  }

  /**
   * Register a domain.
   * Performs validation, stores state, and triggers init lifecycle.
   *
   * @param domain - Domain to register
   * @param onInitError - Optional callback for handling fire-and-forget init lifecycle errors
   */
  registerDomain(domain: ExtensionDomain, onInitError?: (error: Error) => void): void {
    // Step 1: GTS-native validation - register then validate by ID
    this.typeSystem.register(domain);
    const validation = this.typeSystem.validateInstance(domain.id);

    if (!validation.valid) {
      throw new DomainValidationError(validation.errors, domain.id);
    }

    // Step 2: Validate lifecycle hooks reference supported stages
    const lifecycleValidation = validateDomainLifecycleHooks(domain);
    if (!lifecycleValidation.valid) {
      const firstError = lifecycleValidation.errors[0];
      const stageId = firstError?.stage ?? 'unknown';
      const message = firstError?.message ?? `Unsupported lifecycle stage '${stageId}'`;
      throw new UnsupportedLifecycleStageError(
        message,
        stageId,
        domain.id,
        domain.lifecycleStages
      );
    }

    // Step 3: Store domain state
    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
      propertySubscribers: new Map(),
      mountedExtension: undefined,
    });

    // Step 4: Trigger 'init' lifecycle stage (fire-and-forget)
    // Since registerDomain is synchronous but lifecycle is async,
    // we fire-and-forget and handle errors via onInitError callback
    this.triggerDomainOwnLifecycle(
      domain.id,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1'
    ).catch(error => {
      const mfeError = error instanceof Error ? error : new Error(String(error));
      if (onInitError) {
        onInitError(mfeError);
      } else {
        // Minimal fallback: log to console.error
        console.error('[DefaultExtensionManager] Domain init error:', mfeError, { domainId: domain.id });
      }
    });
  }

  /**
   * Unregister a domain.
   * Cascade-unregisters all extensions and triggers destroyed lifecycle.
   *
   * @param domainId - ID of the domain to unregister
   * @returns Promise resolving when unregistration is complete
   */
  async unregisterDomain(domainId: string): Promise<void> {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      // Idempotent - no-op if already unregistered
      return;
    }

    // 1. Cascade unregister all extensions in domain
    const extensionIds = Array.from(domainState.extensions);
    for (const extensionId of extensionIds) {
      await this.unregisterExtension(extensionId);
    }

    // 2. Trigger 'destroyed' lifecycle stage for domain itself
    await this.triggerDomainOwnLifecycle(
      domainId,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1'
    );

    // 3. Remove domain
    this.domains.delete(domainId);
  }

  /**
   * Register an extension.
   * Performs validation, stores state, and triggers init lifecycle.
   *
   * @param extension - Extension to register
   * @returns Promise resolving when registration is complete
   */
  async registerExtension(extension: Extension): Promise<void> {
    // 1. Validate extension against GTS schema
    this.typeSystem.register(extension);
    const validation = this.typeSystem.validateInstance(extension.id);
    if (!validation.valid) {
      throw new ExtensionValidationError(validation.errors, extension.id);
    }

    // 2. Check domain exists
    const domainState = this.domains.get(extension.domain);
    if (!domainState) {
      throw new Error(
        `Cannot register extension '${extension.id}': ` +
        `domain '${extension.domain}' is not registered. ` +
        `Register the domain first using registerDomain().`
      );
    }

    // 3. Validate contract (entry vs domain)
    const entry = this.resolveEntry(extension.entry);
    if (!entry) {
      throw new Error(
        `Entry '${extension.entry}' not found. ` +
        `Entries must be resolved before extension registration.`
      );
    }
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) {
      throw new ContractValidationError(
        contractResult.errors,
        extension.entry,
        extension.domain
      );
    }

    // 4. Validate extension type (if domain specifies extensionsTypeId)
    const typeResult = validateExtensionType(
      this.typeSystem,
      domainState.domain,
      extension
    );
    if (!typeResult.valid) {
      throw new ExtensionTypeError(
        extension.id,
        domainState.domain.extensionsTypeId!
      );
    }

    // 5. Validate extension lifecycle hooks
    const lifecycleValidation = validateExtensionLifecycleHooks(
      extension,
      domainState.domain
    );
    if (!lifecycleValidation.valid) {
      const firstError = lifecycleValidation.errors[0];
      throw new UnsupportedLifecycleStageError(
        firstError?.message ?? `Unsupported lifecycle stage`,
        firstError?.stage ?? 'unknown',
        extension.id,
        domainState.domain.extensionsLifecycleStages
      );
    }

    // 6. Register in internal state
    const extensionState: ExtensionState = {
      extension,
      entry,
      bridge: null,
      loadState: 'idle',
      mountState: 'unmounted',
      container: null,
      lifecycle: null,
      error: undefined,
    };
    this.extensions.set(extension.id, extensionState);

    // Add to domain's extensions set
    domainState.extensions.add(extension.id);

    // 7. Trigger 'init' lifecycle stage
    await this.triggerLifecycle(
      extension.id,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1'
    );
  }

  /**
   * Unregister an extension.
   * Auto-unmounts if mounted and triggers destroyed lifecycle.
   *
   * @param extensionId - ID of the extension to unregister
   * @returns Promise resolving when unregistration is complete
   */
  async unregisterExtension(extensionId: string): Promise<void> {
    const extensionState = this.extensions.get(extensionId);
    if (!extensionState) {
      // Idempotent - no-op if already unregistered
      return;
    }

    // 1. Auto-unmount if currently mounted
    if (extensionState.mountState === 'mounted') {
      await this.unmountExtension(extensionId);
    }

    // 2. Trigger 'destroyed' lifecycle stage
    await this.triggerLifecycle(
      extensionId,
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1'
    );

    // 3. Remove from registry
    // Remove from domain's extensions set
    const domainState = this.domains.get(extensionState.extension.domain);
    if (domainState) {
      domainState.extensions.delete(extensionId);
    }

    this.extensions.delete(extensionId);
  }

  /**
   * Get domain state by ID.
   *
   * @param domainId - Domain ID
   * @returns Domain state, or undefined if not found
   */
  getDomainState(domainId: string): ExtensionDomainState | undefined {
    return this.domains.get(domainId);
  }

  /**
   * Get extension state by ID.
   *
   * @param extensionId - Extension ID
   * @returns Extension state, or undefined if not found
   */
  getExtensionState(extensionId: string): ExtensionState | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Get all extension states for a domain.
   *
   * @param domainId - Domain ID
   * @returns Array of extension states
   */
  getExtensionStatesForDomain(domainId: string): ExtensionState[] {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      return [];
    }

    const states: ExtensionState[] = [];
    for (const extensionId of domainState.extensions) {
      const extensionState = this.extensions.get(extensionId);
      if (extensionState) {
        states.push(extensionState);
      }
    }
    return states;
  }

  /**
   * Update a single domain property.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to update
   * @param value - New property value
   */
  updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      throw new Error(`Domain '${domainId}' not registered`);
    }

    if (!domainState.domain.sharedProperties.includes(propertyTypeId)) {
      throw new Error(`Property '${propertyTypeId}' not declared in domain '${domainId}'`);
    }

    // Store as SharedProperty { id, value } to preserve type ID alongside value
    const sharedProperty: SharedProperty = { id: propertyTypeId, value };
    domainState.properties.set(propertyTypeId, sharedProperty);

    // Notify property subscribers
    const subscribers = domainState.propertySubscribers.get(propertyTypeId);
    if (subscribers) {
      for (const callback of subscribers) {
        callback(sharedProperty);
      }
    }
  }

  /**
   * Get a domain property value.
   *
   * @param domainId - ID of the domain
   * @param propertyTypeId - Type ID of the property to get
   * @returns Property value, or undefined if not set
   */
  getDomainProperty(domainId: string, propertyTypeId: string): unknown {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      throw new Error(`Domain '${domainId}' not registered`);
    }

    const sharedProperty = domainState.properties.get(propertyTypeId);
    return sharedProperty?.value;
  }

  /**
   * Resolve an MfeEntry from its ID by looking up in extension states or the type system.
   *
   * @param entryId - Entry ID to resolve
   * @returns The MfeEntry, or undefined if not found
   * @private
   */
  private resolveEntry(entryId: string): MfeEntry | undefined {
    // First, check existing extension states
    for (const state of this.extensions.values()) {
      if (state.entry.id === entryId) {
        return state.entry;
      }
    }

    // If not found in extensions, try to resolve from type system
    // This allows newly registered entries (via gtsPlugin.register/typeSystem.register) to be used
    // getSchema() returns the entity's content, which for instances is the instance data itself
    const schema = this.typeSystem.getSchema(entryId);
    if (schema && this.isMfeEntry(schema)) {
      return schema;
    }

    return undefined;
  }

  /**
   * Runtime type guard for MfeEntry.
   * Validates that the value has the required structural shape.
   */
  private isMfeEntry(value: unknown): value is MfeEntry {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.id === 'string' &&
      Array.isArray(candidate.requiredProperties) &&
      Array.isArray(candidate.actions) &&
      Array.isArray(candidate.domainActions)
    );
  }

  /**
   * Clear all state.
   * Called during disposal to cleanup internal state.
   */
  clear(): void {
    this.domains.clear();
    this.extensions.clear();
  }


  /**
   * Get the currently mounted extension in a domain.
   * Each domain supports at most one mounted extension at a time.
   *
   * @param domainId - ID of the domain
   * @returns Extension ID if mounted, undefined otherwise
   */
  getMountedExtension(domainId: string): string | undefined {
    const domainState = this.domains.get(domainId);
    return domainState?.mountedExtension;
  }

  /**
   * Set the mounted extension for a domain.
   * Called by MountManager when an extension is mounted.
   *
   * @param domainId - ID of the domain
   * @param extensionId - ID of the mounted extension, or undefined to clear
   */
  setMountedExtension(domainId: string, extensionId: string | undefined): void {
    const domainState = this.domains.get(domainId);
    if (!domainState) {
      throw new Error(`Domain '${domainId}' not registered`);
    }
    domainState.mountedExtension = extensionId;
  }
}
