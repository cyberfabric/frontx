/**
 * Bootstrap Actions
 *
 * Actions for app-level bootstrap operations.
 * Following flux architecture: Actions emit events, Effects listen and dispatch.
 */

import { eventBus } from '@hai3/react';
import type { ApiUser } from '@/app/api';

/**
 * Fetch current user
 * Emits 'app/user/fetch' event
 */
export function fetchCurrentUser(): void {
  eventBus.emit('app/user/fetch');
}

/**
 * Notify that user data has been loaded
 * Called by screens after successfully fetching user data.
 * Emits 'app/user/loaded' event so header state updates.
 */
export function notifyUserLoaded(user: ApiUser): void {
  eventBus.emit('app/user/loaded', { user });
}
