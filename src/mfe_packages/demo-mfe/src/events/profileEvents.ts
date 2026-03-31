/**
 * Profile Domain - Event Declarations
 *
 * Module augmentation for @cyberfabric/react EventPayloadMap.
 * Declares all events emitted and consumed by the profile flux flow.
 *
 * Convention: `mfe/<domain>/<eventName>`
 */

export {};

declare module '@cyberfabric/react' {
  interface EventPayloadMap {
    /** Emitted when the profile screen requests a user fetch */
    'mfe/profile/user-fetch-requested': undefined;
  }
}
