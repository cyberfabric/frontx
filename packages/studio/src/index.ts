/**
 * HAI3 Studio Package
 * Development tools overlay for HAI3 applications
 *
 * This package should ONLY be imported in development mode
 * Use conditional imports to ensure it's tree-shaken in production
 *
 * Translations are registered automatically when StudioProvider is imported
 */

export { StudioOverlay } from './StudioOverlay';
export { StudioProvider, useStudioContext } from './StudioProvider';
export type { Position, Size, StudioState } from './types';
