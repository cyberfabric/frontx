/**
 * Home Domain - Actions
 * Replace with your domain actions.
 */

import { eventBus } from '@hai3/react';
import '../events/homeEvents';

/**
 * Fetch data from the API
 * Emits 'mfe/home/data-fetch-requested' event
 */
export function fetchData(): void {
  eventBus.emit('mfe/home/data-fetch-requested');
}
