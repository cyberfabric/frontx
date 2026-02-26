/**
 * Home Domain - Effects
 * Replace with your domain effects.
 */

import { eventBus, apiRegistry, type AppDispatch } from '@hai3/react';
import { _BlankApiService } from '../api/_BlankApiService';
import { setData, setLoading, setError } from '../slices/homeSlice';
import '../events/homeEvents';

/**
 * Initialize home domain effects
 */
export function initHomeEffects(dispatch: AppDispatch): void {
  eventBus.on('mfe/home/data-fetch-requested', async () => {
    try {
      dispatch(setLoading(true));
      const response = await apiRegistry.getService(_BlankApiService).getData();
      dispatch(setData(response.data));
      dispatch(setLoading(false));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      dispatch(setError(message));
      dispatch(setLoading(false));
    }
  });
}
