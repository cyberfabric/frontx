/**
 * Profile Domain - Event Declarations
 *
 * Module augmentation for @hai3/react EventPayloadMap.
 * Declares all events emitted and consumed by the profile flux flow.
 *
 * Convention: `mfe/<domain>/<eventName>`
 */

import type { ApiUser } from '../api/types';

declare module '@hai3/react' {
  interface EventPayloadMap {
    /** Emitted when the profile screen requests a user fetch */
    'mfe/profile/user-fetch-requested': undefined;
    /** Emitted when the user data has been successfully fetched */
    'mfe/profile/user-fetched': { user: ApiUser };
    /** Emitted when a user fetch attempt fails */
    'mfe/profile/user-fetch-failed': { error: string };
  }
}
