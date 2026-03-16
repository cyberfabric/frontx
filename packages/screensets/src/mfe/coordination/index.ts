/**
 * Runtime Coordination Module
 *
 * Exports for internal package use.
 * Only the abstract RuntimeCoordinator class and RuntimeConnection interface
 * are exported from the main package (@hai3/screensets).
 * The concrete WeakMapRuntimeCoordinator is internal only.
 *
 * @packageDocumentation
 */

export { RuntimeCoordinator, type RuntimeConnection } from './types';
export { WeakMapRuntimeCoordinator } from './weak-map-runtime-coordinator';
