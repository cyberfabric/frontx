/**
 * Event Type Map - Unified type safety for all events
 * Combines all namespace event maps into single type
 * Provides compile-time safety: event type <-> payload mismatch caught at build time
 *
 * EXTENSIBLE: Screensets can add their own events via module augmentation
 */

import type { ApiEventPayloadMap } from './apiEvents';
import type { UserEventPayloadMap } from './userEvents';
import type { MenuEventPayloadMap } from './menuEvents';
import type { ThemeEventPayloadMap } from './themeEvents';
import type { NavigationEventPayloadMap } from './navigationEvents';
import type { ScreensetEventPayloadMap } from './screensetEvents';
import type { I18nEventPayloadMap } from './i18nEvents';
import type { TenantEventPayloadMap } from './tenantEvents';

/**
 * Global Event Payload Map
 * Central registry of ALL events in the app
 * Maps event keys (strings) to payload types
 *
 * Screensets can augment this via module augmentation:
 * ```typescript
 * // In your screenset code
 * declare module '@hai3/uicore' {
 *   interface EventPayloadMap {
 *     'myScreenset/dataLoaded': { data: MyData[] };
 *   }
 * }
 * ```
 *
 * Design: Interface (not type) to support declaration merging
 * Naming: PascalCase per TypeScript interface convention
 */
export interface EventPayloadMap {
  // Base interface - can be augmented by screensets
}

export interface EventPayloadMap
  extends ApiEventPayloadMap,
    UserEventPayloadMap,
    MenuEventPayloadMap,
    ThemeEventPayloadMap,
    NavigationEventPayloadMap,
    ScreensetEventPayloadMap,
    I18nEventPayloadMap,
    TenantEventPayloadMap {}

/**
 * Event Key Type
 * Union of all event keys from EventPayloadMap
 * Used in EventBus generic constraints for type-safe event emission
 */
export type EventKey = keyof EventPayloadMap;
