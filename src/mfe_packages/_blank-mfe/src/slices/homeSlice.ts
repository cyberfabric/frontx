/**
 * Home Domain - Slice
 * Replace with your domain state.
 */

import { createSlice, type ReducerPayload } from '@hai3/react';

/**
 * Home domain state shape
 */
interface HomeState {
  data: Record<string, string> | null;
  loading: boolean;
  error: string | null;
}

const initialState: HomeState = {
  data: null,
  loading: false,
  error: null,
};

const { slice, setData, setLoading, setError } = createSlice({
  name: '_blank/home',
  initialState,
  reducers: {
    setData: (state, action: ReducerPayload<Record<string, string> | null>) => {
      state.data = action.payload;
    },
    setLoading: (state, action: ReducerPayload<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: ReducerPayload<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const homeSlice = slice;
export { setData, setLoading, setError };

/**
 * RootState augmentation for type-safe selectors
 */
declare module '@hai3/react' {
  interface RootState {
    '_blank/home': HomeState;
  }
}
