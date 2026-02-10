/**
 * MFE Runtime - ScreensetsRegistry and Configuration
 *
 * This module exports the core runtime components for the MFE system.
 *
 * Key exports:
 * - ScreensetsRegistry (abstract class) - The public API contract
 * - createScreensetsRegistry (factory function) - Create registry instances
 * - ScreensetsRegistryConfig (interface) - Registry configuration
 *
 * NOTE: DefaultScreensetsRegistry (concrete class) is NOT exported.
 * It is an internal implementation detail hidden behind the factory.
 *
 * @packageDocumentation
 */

export { ScreensetsRegistry } from './ScreensetsRegistry';
export type { ExtensionDomainState } from './ScreensetsRegistry';
export { createScreensetsRegistry } from './create-screensets-registry';
export type { ScreensetsRegistryConfig } from './config';
