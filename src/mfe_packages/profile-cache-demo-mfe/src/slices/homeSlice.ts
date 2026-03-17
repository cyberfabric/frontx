/**
 * Home Domain - Slice
 * Add your domain state, reducers, and selectors here.
 * Replace 'profileCacheDemo/home' with your screenset/domain name.
 */

import { createSlice } from '@hai3/react';

const { slice } = createSlice({
  name: 'profileCacheDemo/home',
  initialState: {},
  reducers: {},
});

export const homeSlice = slice;

/**
 * RootState augmentation for type-safe selectors
 * Update the state type when you add your domain state shape.
 */
declare module '@hai3/react' {
  interface RootState {
    'profileCacheDemo/home': Record<string, never>;
  }
}
