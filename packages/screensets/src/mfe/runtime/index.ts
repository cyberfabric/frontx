/**
 * MFE Runtime - MfeRegistry Factory and Configuration
 *
 * This module exports the core runtime components for the MFE system.
 *
 * Key exports:
 * - MfeRegistry (abstract class) - The public API contract
 * - MfeRegistryFactory (abstract class) - Factory contract
 * - mfeRegistryFactory (singleton) - Factory instance for building registry
 * - MfeRegistryConfig (interface) - Registry configuration
 *
 * NOTE: DefaultMfeRegistry and DefaultMfeRegistryFactory (concrete classes)
 * are NOT exported. They are internal implementation details.
 *
 * @packageDocumentation
 */

import { DefaultMfeRegistryFactory } from './DefaultMfeRegistryFactory';
import type { MfeRegistryFactory } from './MfeRegistryFactory';

export { MfeRegistry } from './MfeRegistry';
export type { RegisterDomainOptions } from './MfeRegistry';
export { MfeRegistryFactory } from './MfeRegistryFactory';
export { ContainerProvider } from './container-provider';
export type { MfeRegistryConfig } from './config';

/**
 * Singleton MfeRegistryFactory instance.
 *
 * This is the primary way to obtain a MfeRegistry instance.
 * The factory accepts configuration (including TypeSystemPlugin) and returns
 * the registry singleton. After the first build(), subsequent calls return
 * the cached instance.
 *
 * This factory pattern enables TypeSystemPlugin pluggability by deferring
 * the binding of the type system plugin to application wiring time.
 *
 * @example
 * ```typescript
 * import { mfeRegistryFactory, gtsPlugin } from '@cyberfabric/screensets';
 *
 * // Build the registry with GTS plugin at application wiring time
 * const registry = mfeRegistryFactory.build({ typeSystem: gtsPlugin });
 *
 * // Register a domain with container provider
 * registry.registerDomain(myDomain, containerProvider);
 *
 * // Register an extension
 * await registry.registerExtension(myExtension);
 * ```
 */
export const mfeRegistryFactory: MfeRegistryFactory = new DefaultMfeRegistryFactory();
