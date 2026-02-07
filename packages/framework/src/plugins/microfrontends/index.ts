/**
 * Microfrontends Plugin
 *
 * Enables MFE capabilities in HAI3 applications.
 * This plugin accepts NO configuration parameters.
 * All MFE registration happens dynamically at runtime.
 *
 * @packageDocumentation
 */

import { createGtsPlugin } from '@hai3/screensets/plugins/gts';
import { createScreensetsRegistry } from '@hai3/screensets';
import type { HAI3Plugin } from '../../types';

/**
 * Microfrontends plugin factory.
 *
 * Enables MFE capabilities in HAI3 applications with NO static configuration.
 * All MFE registration (domains, extensions, entries) happens dynamically at
 * runtime via actions or direct API calls.
 *
 * **Key Principles:**
 * - NO configuration parameters - plugin accepts nothing
 * - NO static domain registration - domains are registered at runtime
 * - Creates GTS plugin and ScreensetsRegistry during plugin initialization
 * - Same TypeSystemPlugin instance is propagated throughout
 *
 * @throws Error if any configuration is passed
 *
 * @example
 * ```typescript
 * import { createHAI3, microfrontends } from '@hai3/framework';
 *
 * const app = createHAI3()
 *   .use(microfrontends())  // No config - just enables MFE capabilities
 *   .build();
 *
 * // Register domains dynamically at runtime:
 * const sidebarDomain = createSidebarDomain();
 * app.screensetsRegistry.registerDomain(sidebarDomain);
 * ```
 */
export function microfrontends(): HAI3Plugin {
  // Validate no config was passed
  // Function signature accepts no parameters, but TypeScript can't prevent
  // runtime calls like microfrontends({ anything: true })
  if (arguments.length > 0) {
    throw new Error(
      'microfrontends() plugin accepts NO configuration parameters. ' +
      'All MFE registration happens dynamically at runtime. ' +
      'Remove any configuration and call microfrontends() with no arguments.'
    );
  }

  // Create GTS plugin instance - this will be shared across all MFE operations
  // The same plugin instance ensures consistent type validation throughout
  const gtsPlugin = createGtsPlugin();

  // Create ScreensetsRegistry with the GTS plugin
  // This registry handles all MFE lifecycle: domains, extensions, actions, etc.
  const screensetsRegistry = createScreensetsRegistry({
    typeSystem: gtsPlugin,
    debug: false, // Will be set based on app.config.devMode in onInit
  });

  return {
    name: 'microfrontends',
    dependencies: ['screensets'], // Requires screensets to be initialized

    provides: {
      registries: {
        // Expose the MFE-enabled ScreensetsRegistry
        // This registry has registerDomain(), registerExtension(), etc.
        screensetsRegistry,
      },
    },

    onInit(app): void {
      // Update debug mode based on app config
      if (app.config.devMode) {
        console.log('[microfrontends] Plugin initialized');
        console.log('[microfrontends] TypeSystemPlugin:', gtsPlugin.name, gtsPlugin.version);
        console.log('[microfrontends] Base domains are NOT pre-registered');
        console.log('[microfrontends] Register domains at runtime via app.screensetsRegistry.registerDomain()');
      }

      // Plugin is now ready
      // Base domains are NOT registered here - they are registered dynamically
      // at runtime via app.screensetsRegistry.registerDomain() or actions
    },
  };
}

// Re-export base domain factories for convenience
export {
  createSidebarDomain,
  createPopupDomain,
  createScreenDomain,
  createOverlayDomain,
} from './base-domains';
