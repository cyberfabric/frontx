import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { UICORE_ID } from '../../../core/constants';
import { LAYOUT_DOMAINS } from '../../layoutSlice';

/**
 * Header slice for managing header configuration
 */

const DOMAIN_ID = LAYOUT_DOMAINS.HEADER;
const SLICE_KEY = `${UICORE_ID}/${DOMAIN_ID}` as const;

export interface HeaderState {
  visible: boolean;
}

const initialState: HeaderState = {
  visible: true,
};

const headerSlice = createSlice({
  name: SLICE_KEY,
  initialState,
  reducers: {
    setHeaderVisible: (state, action: PayloadAction<boolean>) => {
      state.visible = action.payload;
    },
    setHeaderConfig: (state, action: PayloadAction<Partial<HeaderState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setHeaderVisible, setHeaderConfig } = headerSlice.actions;

export default headerSlice.reducer;
