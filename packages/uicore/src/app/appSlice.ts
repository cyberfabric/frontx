import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiUser } from '../api/services/accounts/api';
import { Language } from '../i18n/types';
import { UICORE_ID } from '../core/constants';
import type { Tenant } from './types';

/**
 * App Slice - Application-level state
 * Manages user authentication, tenant, loading/error states, API configuration, and language preference
 * Updated by appEffects based on events
 */

const DOMAIN_ID = 'app';
const SLICE_KEY = `${UICORE_ID}/${DOMAIN_ID}` as const;

export interface AppState {
  user: ApiUser | null;
  tenant: Tenant | null;
  language: Language | null; // User's language preference (null until determined)
  translationsReady: boolean; // Whether current language translations are loaded
  screenTranslationsVersion: number; // Incremented when screen translations load (triggers re-render)
  loading: boolean;
  error: string | null;
  useMockApi: boolean;
}

const initialState: AppState = {
  user: null,
  tenant: null,
  language: null, // No default - wait for user preference/browser detection
  translationsReady: false, // Set to true after translations load
  screenTranslationsVersion: 0, // Incremented when screen translations load
  loading: false,
  error: null,
  useMockApi: true, // Default to mock API
};

const appSlice = createSlice({
  name: SLICE_KEY,
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<ApiUser | null>) => {
      state.user = action.payload;
    },
    setTenant: (state, action: PayloadAction<Tenant | null>) => {
      state.tenant = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUseMockApi: (state, action: PayloadAction<boolean>) => {
      state.useMockApi = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setTranslationsReady: (state, action: PayloadAction<boolean>) => {
      state.translationsReady = action.payload;
    },
    incrementScreenTranslationsVersion: (state) => {
      state.screenTranslationsVersion += 1;
    },
  },
});

export const { setUser, setTenant, setLoading, setError, clearError, setUseMockApi, setLanguage, setTranslationsReady, incrementScreenTranslationsVersion } = appSlice.actions;

export default appSlice.reducer;
