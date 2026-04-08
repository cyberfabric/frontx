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
  // Resolved lazily on init — null if @hai3/perf-telemetry is not installed
  let resolvedStore: unknown = null;
  let _mod: Record<string, (...args: never[]) => unknown> | null = null;

  return {
    name: 'telemetry',
    dependencies: [],

    provides: {
      registries: {
        /** telemetryStore from @hai3/perf-telemetry, available after onInit. Studio reads this via useHAI3(). */
        get telemetryStore() { return resolvedStore; },
      },
    },

    onInit() {
      const enabled = config?.enabled ?? true;
      if (!enabled) return;

      try {
        // Dynamic import to keep @hai3/perf-telemetry optional — cached for onDestroy
        _mod = require('@hai3/perf-telemetry');
        if (!_mod) return;

        _mod.initOtel({
          serviceName: config?.serviceName ?? 'hai3-app',
          serviceVersion: config?.serviceVersion ?? '1.0.0',
          collectorUrl: config?.collectorUrl ?? 'http://localhost:14318',
          environment: config?.environment ?? 'development',
          enabled: true,
        } as never);

        // Expose telemetryStore for Studio dev panel
        resolvedStore = (_mod as Record<string, unknown>).telemetryStore ?? null;
      } catch {
        // Fail-open: if @hai3/perf-telemetry is not installed, silently skip
      }
    },

    onDestroy() {
      try {
        const mod = _mod ?? require('@hai3/perf-telemetry');
        if (mod?.isOtelInitialized?.()) {
          (mod.flushOtel() as Promise<void>)
            .finally(() => (mod.shutdownOtel() as Promise<void>).catch(() => { /* fail-open */ }));
        }
      } catch {
        // Fail-open
      }
    },
  };
}
