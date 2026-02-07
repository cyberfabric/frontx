/**
 * Shared Properties Provider
 *
 * Framework-agnostic utility for managing shared properties between
 * parent (host) and MFE instances. Properties flow one-way from parent
 * to MFE, and MFEs cannot modify them directly.
 *
 * Key Principles:
 * - Read-only property access from MFE perspective
 * - Property update propagation from host
 * - Framework-agnostic (no React/Vue/etc assumptions)
 * - Subscription-based updates
 *
 * @packageDocumentation
 */

/**
 * Callback function for property updates.
 */
export type PropertyUpdateCallback<TValue = unknown> = (value: TValue) => void;

/**
 * Shared properties provider for MFE instances.
 *
 * This is a framework-agnostic class that manages the flow of
 * shared properties from parent to child MFE instances.
 *
 * Properties are READ-ONLY from the MFE's perspective - they can
 * only be updated by the parent (host) via the domain's property
 * update mechanism.
 */
export class SharedPropertiesProvider {
  /**
   * Current property values, keyed by property type ID.
   */
  private readonly properties = new Map<string, unknown>();

  /**
   * Subscribers for property updates, keyed by property type ID.
   */
  private readonly subscribers = new Map<
    string,
    Set<PropertyUpdateCallback>
  >();

  /**
   * Wildcard subscribers that receive updates for ALL properties.
   */
  private wildcardSubscribers: Set<(propertyTypeId: string, value: unknown) => void> | undefined;

  /**
   * Whether this provider has been disposed.
   */
  private disposed = false;

  /**
   * Get the current value of a property.
   *
   * @param propertyTypeId - The GTS type ID of the property
   * @returns The current property value, or undefined if not set
   *
   * @example
   * ```typescript
   * const theme = provider.getProperty('gts.hai3.mfes.comm.shared_property.v1~acme.ui.theme.v1');
   * ```
   */
  getProperty<TValue = unknown>(propertyTypeId: string): TValue | undefined {
    this.assertNotDisposed();
    return this.properties.get(propertyTypeId) as TValue | undefined;
  }

  /**
   * Get all properties as a read-only map.
   *
   * @returns Map of property type IDs to values
   *
   * @example
   * ```typescript
   * const allProperties = provider.getAllProperties();
   * for (const [typeId, value] of allProperties) {
   *   console.log(`${typeId}: ${value}`);
   * }
   * ```
   */
  getAllProperties(): ReadonlyMap<string, unknown> {
    this.assertNotDisposed();
    return new Map(this.properties);
  }

  /**
   * Subscribe to updates for a specific property.
   *
   * The callback will be invoked whenever the parent updates
   * this property value.
   *
   * @param propertyTypeId - The GTS type ID of the property
   * @param callback - Function to call when property updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = provider.subscribeToProperty(
   *   'gts.hai3.mfes.comm.shared_property.v1~acme.ui.theme.v1',
   *   (theme) => {
   *     console.log('Theme changed:', theme);
   *   }
   * );
   *
   * // Later, cleanup
   * unsubscribe();
   * ```
   */
  subscribeToProperty<TValue = unknown>(
    propertyTypeId: string,
    callback: PropertyUpdateCallback<TValue>
  ): () => void {
    this.assertNotDisposed();

    let subscribers = this.subscribers.get(propertyTypeId);
    if (!subscribers) {
      subscribers = new Set();
      this.subscribers.set(propertyTypeId, subscribers);
    }

    subscribers.add(callback as PropertyUpdateCallback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(propertyTypeId);
      if (subs) {
        subs.delete(callback as PropertyUpdateCallback);
        if (subs.size === 0) {
          this.subscribers.delete(propertyTypeId);
        }
      }
    };
  }

  /**
   * Subscribe to updates for all properties.
   *
   * The callback will be invoked whenever ANY property is updated.
   *
   * @param callback - Function to call when any property updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = provider.subscribeToAllProperties(
   *   (propertyTypeId, value) => {
   *     console.log(`Property ${propertyTypeId} changed:`, value);
   *   }
   * );
   * ```
   */
  subscribeToAllProperties(
    callback: (propertyTypeId: string, value: unknown) => void
  ): () => void {
    this.assertNotDisposed();

    let subscribers = this.wildcardSubscribers;
    if (!subscribers) {
      subscribers = new Set();
      this.wildcardSubscribers = subscribers;
    }

    subscribers.add(callback);

    return () => {
      this.wildcardSubscribers?.delete(callback);
    };
  }

  /**
   * Internal method: Receive a property update from the parent.
   *
   * This is called by the bridge when the parent updates a property.
   * MFE code should NOT call this directly - it's for internal use only.
   *
   * @internal
   * @param propertyTypeId - The GTS type ID of the property
   * @param value - The new property value
   */
  receivePropertyUpdate(propertyTypeId: string, value: unknown): void {
    this.assertNotDisposed();

    // Store the new value
    this.properties.set(propertyTypeId, value);

    // Notify specific subscribers
    const subscribers = this.subscribers.get(propertyTypeId);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(value);
        } catch (error) {
          console.error(
            `Error in property subscriber for ${propertyTypeId}:`,
            error
          );
        }
      });
    }

    // Notify wildcard subscribers
    if (this.wildcardSubscribers) {
      this.wildcardSubscribers.forEach((callback) => {
        try {
          callback(propertyTypeId, value);
        } catch (error) {
          console.error(
            'Error in wildcard property subscriber:',
            error
          );
        }
      });
    }
  }

  /**
   * Dispose the provider and cleanup all subscriptions.
   *
   * Called when the MFE instance is unmounted.
   */
  dispose(): void {
    if (this.disposed) {
      return; // Idempotent
    }

    this.disposed = true;
    this.subscribers.clear();
    this.properties.clear();
  }

  /**
   * Check if this provider has been disposed.
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Assert that the provider has not been disposed.
   * @throws Error if disposed
   */
  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('Cannot use disposed SharedPropertiesProvider');
    }
  }
}
