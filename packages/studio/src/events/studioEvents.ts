import type { Position, Size } from '../types';

/**
 * Studio UI Event Payloads
 * These events track changes to Studio UI state (position, size, visibility)
 */

export interface PositionChangedPayload {
  position: Position;
}

export interface SizeChangedPayload {
  size: Size;
}

export interface ButtonPositionChangedPayload {
  position: Position;
}

/**
 * Payload when user selects a GTS Package in the control panel.
 * Used for persistence only; framework does not subscribe.
 */
export interface ActivePackageChangedPayload {
  activePackageId: string;
}

/**
 * Studio Event Names
 * Namespace: studio/
 */
export const StudioEvents = {
  PositionChanged: 'studio/positionChanged',
  SizeChanged: 'studio/sizeChanged',
  ButtonPositionChanged: 'studio/buttonPositionChanged',
  ActivePackageChanged: 'studio/activePackageChanged',
} as const;

/**
 * Module Augmentation
 * Extend EventPayloadMap from @hai3/state for type safety
 */
declare module '@hai3/state' {
  interface EventPayloadMap {
    'studio/positionChanged': PositionChangedPayload;
    'studio/sizeChanged': SizeChangedPayload;
    'studio/buttonPositionChanged': ButtonPositionChangedPayload;
    'studio/activePackageChanged': ActivePackageChangedPayload;
  }
}
