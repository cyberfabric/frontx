/**
 * Bootstrap Events
 * App-level events for bootstrap operations
 */

import '@hai3/state';
import type { ApiUser } from '@/app/api';

/**
 * Module augmentation for type-safe event payloads
 * Define payload types for each event
 */
declare module '@hai3/state' {
  interface EventPayloadMap {
    /** Fetch current user - no payload needed */
    'app/user/fetch': void;
    /** User data loaded - carries user payload for header update */
    'app/user/loaded': { user: ApiUser };
  }
}
