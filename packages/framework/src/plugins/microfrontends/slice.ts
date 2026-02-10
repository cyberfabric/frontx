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

/** Extension registration state */
export type ExtensionRegistrationState = 'unregistered' | 'registering' | 'registered' | 'error';

/** State for a single extension */
export interface ExtensionMfeState {
  loadState: MfeLoadState;
  mountState: MfeMountState;
  error?: string;
}

/** MFE slice state */
export interface MfeState {
  extensions: Record<string, ExtensionMfeState>;
  registrationStates: Record<string, ExtensionRegistrationState>;
}

// ============================================================================
// Initial State
// ============================================================================

const SLICE_KEY = 'mfe' as const;

const initialState: MfeState = {
  extensions: {},
  registrationStates: {},
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

    // Registration state reducers
    setExtensionRegistering: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      state.registrationStates[action.payload.extensionId] = 'registering';
    },

    setExtensionRegistered: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      state.registrationStates[action.payload.extensionId] = 'registered';
    },

    setExtensionUnregistered: (state: MfeState, action: ReducerPayload<{ extensionId: string }>) => {
      state.registrationStates[action.payload.extensionId] = 'unregistered';
    },

    setExtensionError: (state: MfeState, action: ReducerPayload<{ extensionId: string; error: string }>) => {
      state.registrationStates[action.payload.extensionId] = 'error';
      const ext = getOrCreateExtension(state, action.payload.extensionId);
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
  setExtensionRegistering,
  setExtensionRegistered,
  setExtensionUnregistered,
  setExtensionError,
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

/**
 * Select extension registration state for an extension.
 * Returns 'unregistered' if extension is not tracked.
 */
export function selectExtensionState(state: { mfe: MfeState }, extensionId: string): ExtensionRegistrationState {
  return state.mfe.registrationStates[extensionId] ?? 'unregistered';
}

/**
 * Select all registered extensions.
 * Returns array of extension IDs with 'registered' state.
 */
export function selectRegisteredExtensions(state: { mfe: MfeState }): string[] {
  return Object.entries(state.mfe.registrationStates)
    .filter(([_, regState]) => regState === 'registered')
    .map(([extensionId]) => extensionId);
}

export default slice.reducer;
