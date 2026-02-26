/**
 * Profile Domain - Event Declarations
 *
 * Module augmentation for @hai3/react EventPayloadMap.
 * Declares all events emitted and consumed by the profile flux flow.
 *
 * Convention: `mfe/<domain>/<eventName>`
 */

declare module '@hai3/react' {
  interface EventPayloadMap {
    /** Emitted when the profile screen requests a user fetch */
    'mfe/profile/user-fetch-requested': undefined;
  }
}
