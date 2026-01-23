/**
 * Bootstrap Events
 * App-level events for bootstrap operations
 */

import '@hai3/react';
import type { ApiUser } from '@/app/api';

/**
 * Module augmentation for type-safe event payloads
 * Define payload types for each event
 *
 * NOTE: We augment @hai3/react's EventPayloadMap interface.
 * This maintains layer architecture by not importing from L1 packages directly.
 * The @hai3/react package re-declares EventPayloadMap to enable this pattern.
 */
declare module '@hai3/react' {
  interface EventPayloadMap {
    /** Fetch current user - no payload needed */
    'app/user/fetch': void;
    /** User data loaded - carries user payload for header update */
    'app/user/loaded': { user: ApiUser };
  }
}
