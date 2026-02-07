/**
 * MFE Slice
 *
 * Redux slice for managing MFE load and mount states.
 * Tracks separate load state (bundle loading) and mount state (DOM mounting) per extension.
 */

import { createSlice, type ReducerPayload } from '@hai3/state';

// ============================================================================
// State Types
// ============================================================================

/** MFE load state for an extension */
export type MfeLoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** MFE mount state for an extension */
export type MfeMountState = 'unmounted' | 'mounting' | 'mounted' | 'error';

/** State for a single extension */
export interface ExtensionMfeState {
  loadState: MfeLoadState;
  mountState: MfeMountState;
  error?: string;
}

/** MFE slice state */
export interface MfeState {
  extensions: Record<string, ExtensionMfeState>;
}

// ============================================================================
// Initial State
// ============================================================================

const SLICE_KEY = 'mfe' as const;

const initialState: MfeState = {
  extensions: {},
};

// ============================================================================
// Helper Function
// ============================================================================

/**
 * Get or create extension state.
 */
function getOrCreateExtension(state: MfeState, extensionId: string): ExtensionMfeState {
  if (!state.extensions[extensionId]) {
    state.extensions[extensionId] = {
      loadState: 'idle',
      mountState: 'unmounted',
    };
  }
  return state.extensions[extensionId];
}

// ============================================================================
// Slice Definition
// ============================================================================

const { slice, ...actions } = createSlice({
  name: SLICE_KEY,
  initialState,
  reducers: {
    // Load state reducers
    setLoading: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.loadState = 'loading';
      ext.error = undefined;
    },

    setBundleLoaded: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.loadState = 'loaded';
      ext.error = undefined;
    },

    setLoadError: (state: MfeState, action: ReducerPayload<{ extensionId: string; error: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.loadState = 'error';
      ext.error = action.payload.error;
    },

    // Mount state reducers
    setMounting: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.mountState = 'mounting';
      ext.error = undefined;
    },

    setMounted: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.mountState = 'mounted';
      ext.error = undefined;
    },

    setUnmounted: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.mountState = 'unmounted';
      ext.error = undefined;
    },

    setMountError: (state: MfeState, action: ReducerPayload<{ extensionId: string; error: string }>) => {
      const ext = getOrCreateExtension(state, action.payload.extensionId);
      ext.mountState = 'error';
      ext.error = action.payload.error;
    },
  },
});

// ============================================================================
// Exports
// ============================================================================

export const mfeSlice = slice;
export const mfeActions = actions;

// Individual actions for convenience
export const {
  setLoading,
  setBundleLoaded,
  setLoadError,
  setMounting,
  setMounted,
  setUnmounted,
  setMountError,
} = actions;

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select MFE load state for an extension.
 * Returns 'idle' if extension is not tracked.
 */
export function selectMfeLoadState(state: { mfe: MfeState }, extensionId: string): MfeLoadState {
  return state.mfe.extensions[extensionId]?.loadState ?? 'idle';
}

/**
 * Select MFE mount state for an extension.
 * Returns 'unmounted' if extension is not tracked.
 */
export function selectMfeMountState(state: { mfe: MfeState }, extensionId: string): MfeMountState {
  return state.mfe.extensions[extensionId]?.mountState ?? 'unmounted';
}

/**
 * Select MFE error for an extension.
 * Returns undefined if no error.
 */
export function selectMfeError(state: { mfe: MfeState }, extensionId: string): string | undefined {
  return state.mfe.extensions[extensionId]?.error;
}

/**
 * Select all extensions with their states.
 */
export function selectAllExtensionStates(state: { mfe: MfeState }): Record<string, ExtensionMfeState> {
  return state.mfe.extensions;
}

export default slice.reducer;
