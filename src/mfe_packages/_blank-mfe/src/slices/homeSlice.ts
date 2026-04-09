/**
 * Home Domain - Slice
 * Add your domain state, reducers, and selectors here.
 * Replace '_blank/home' with your screenset/domain name.
 */

import { createSlice } from '@cyberfabric/react';

const { slice } = createSlice({
  name: '_blank/home',
  initialState: {},
  reducers: {},
});

export const homeSlice = slice;

/**
 * RootState augmentation for type-safe selectors
 * Update the state type when you add your domain state shape.
 */
declare module '@cyberfabric/react' {
  interface RootState {
    '_blank/home': Record<string, never>;
  }
}
