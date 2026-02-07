/**
 * MFE State Container Factory
 *
 * Provides framework-agnostic state container creation for MFE instances.
 * Each call to createMfeStateContainer() creates an independent store instance,
 * ensuring instance-level isolation (default handler behavior).
 *
 * Key Principles:
 * - Framework-agnostic (no Redux, no React assumptions)
 * - Instance-level isolation (each MFE gets its own store)
 * - Proper disposal on unmount
 *
 * @packageDocumentation
 */

/**
 * Simple state container for MFE instances.
 *
 * This is a minimal framework-agnostic state container that provides:
 * - State storage
 * - State updates
 * - Subscription mechanism
 * - Disposal
 */
export interface MfeStateContainer<TState = unknown> {
  /**
   * Get the current state.
   */
  getState(): TState;

  /**
   * Update the state.
   * @param updater - Function to compute new state from current state
   */
  setState(updater: (state: TState) => TState): void;

  /**
   * Subscribe to state changes.
   * @param listener - Function called when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: TState) => void): () => void;

  /**
   * Dispose the container and cleanup all subscriptions.
   */
  dispose(): void;
}

/**
 * Configuration for creating an MFE state container.
 */
export interface MfeStateContainerConfig<TState = unknown> {
  /**
   * Initial state for the container.
   */
  initialState: TState;
}

/**
 * Create an independent MFE state container.
 *
 * Each call creates a completely isolated store instance.
 * This is the default handler behavior for instance-level isolation.
 *
 * **Framework-agnostic:** This is a pure TypeScript implementation
 * with no dependencies on React, Redux, or any specific framework.
 *
 * @param config - Configuration for the state container
 * @returns A new isolated state container
 *
 * @example
 * ```typescript
 * // Create isolated state for an MFE instance
 * const stateContainer = createMfeStateContainer({
 *   initialState: { count: 0, user: null }
 * });
 *
 * // Subscribe to changes
 * const unsubscribe = stateContainer.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 *
 * // Update state
 * stateContainer.setState((state) => ({ ...state, count: state.count + 1 }));
 *
 * // Cleanup on unmount
 * stateContainer.dispose();
 * ```
 */
export function createMfeStateContainer<TState = unknown>(
  config: MfeStateContainerConfig<TState>
): MfeStateContainer<TState> {
  let state: TState | null = config.initialState;
  const listeners = new Set<(state: TState) => void>();
  let disposed = false;

  return {
    getState(): TState {
      if (disposed || state === null) {
        throw new Error('Cannot get state from disposed container');
      }
      return state;
    },

    setState(updater: (state: TState) => TState): void {
      if (disposed || state === null) {
        throw new Error('Cannot set state on disposed container');
      }

      const newState = updater(state);
      if (newState !== state) {
        state = newState;
        // Notify all listeners
        listeners.forEach((listener) => {
          try {
            listener(state as TState);
          } catch (error) {
            console.error('Error in state listener:', error);
          }
        });
      }
    },

    subscribe(listener: (state: TState) => void): () => void {
      if (disposed) {
        throw new Error('Cannot subscribe to disposed container');
      }

      listeners.add(listener);

      // Return unsubscribe function
      return () => {
        listeners.delete(listener);
      };
    },

    dispose(): void {
      if (disposed) {
        return; // Idempotent
      }

      disposed = true;
      listeners.clear();
      state = null;
    },
  };
}

/**
 * Type guard to check if a container is disposed.
 *
 * @param container - The container to check
 * @returns True if the container is disposed (attempts to use will throw)
 */
export function isMfeStateContainerDisposed<TState>(
  container: MfeStateContainer<TState>
): boolean {
  try {
    container.getState();
    return false;
  } catch {
    return true;
  }
}
