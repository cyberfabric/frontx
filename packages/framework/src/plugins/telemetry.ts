/**
 * Telemetry Plugin - Performance telemetry via @hai3/perf-telemetry
 *
 * Framework Layer: L2
 * Provides: OTel initialization, API auto-instrumentation, dev panel data
 */

import type { HAI3Plugin } from '../types';

/**
 * Telemetry Plugin Configuration
 */
export type TelemetryPluginConfig = {
  /** OTel service name */
  serviceName?: string;
  /** OTel service version */
  serviceVersion?: string;
  /** OTel collector URL (OTLP/HTTP endpoint) */
  collectorUrl?: string;
  /** Deployment environment */
  environment?: string;
  /** Enable/disable telemetry */
  enabled?: boolean;
};

/**
 * Telemetry plugin factory.
 *
 * Provides performance telemetry integration via @hai3/perf-telemetry.
 * When enabled, initializes OTel Browser SDK and registers a TelemetryStoreProcessor
 * for the dev panel.
 *
 * @param config - Telemetry configuration
 * @returns Telemetry plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(telemetry({
 *     serviceName: 'my-app',
 *     collectorUrl: 'http://localhost:14318',
 *     environment: 'development',
 *   }))
 *   .build();
 * ```
 */
export function telemetry(config?: TelemetryPluginConfig): HAI3Plugin {
  return {
    name: 'telemetry',
    dependencies: [],

    provides: {},

    onInit() {
      const enabled = config?.enabled ?? true;
      if (!enabled) return;

      try {
        // Dynamic import to keep @hai3/perf-telemetry optional
        // Consumers must install @hai3/perf-telemetry and its OTel peer deps
        const perfTelemetry = require('@hai3/perf-telemetry');

        perfTelemetry.initOtel({
          serviceName: config?.serviceName ?? 'hai3-app',
          serviceVersion: config?.serviceVersion ?? '1.0.0',
          collectorUrl: config?.collectorUrl ?? 'http://localhost:14318',
          environment: config?.environment ?? 'development',
          enabled: true,
        });
      } catch {
        // Fail-open: if @hai3/perf-telemetry is not installed, silently skip
        // This allows the plugin to be in the preset without requiring the package
      }
    },

    onDestroy() {
      try {
        const perfTelemetry = require('@hai3/perf-telemetry');
        if (perfTelemetry.isOtelInitialized()) {
          void perfTelemetry.flushOtel();
        }
      } catch {
        // Fail-open
      }
    },
  };
}
