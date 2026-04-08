// @cpt-dod:cpt-hai3-dod-perf-telemetry-fail-open:p1
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

/** Shape of the @hai3/perf-telemetry module (avoids require + unknown). */
type PerfTelemetryModule = {
  initOtel: (config: { serviceName: string; serviceVersion: string; collectorUrl: string; environment: string; enabled: boolean }) => void;
  isOtelInitialized: () => boolean;
  flushOtel: () => Promise<void>;
  shutdownOtel: () => Promise<void>;
  telemetryStore: Record<string, (...args: never[]) => void>;
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
  let resolvedStore: PerfTelemetryModule['telemetryStore'] | null = null;
  let _mod: PerfTelemetryModule | null = null;

  return {
    name: 'telemetry',
    dependencies: [],

    provides: {
      registries: {
        /** telemetryStore from @hai3/perf-telemetry, available after onInit. */
        get telemetryStore() { return resolvedStore; },
      },
    },

    async onInit() {
      const enabled = config?.enabled ?? true;
      if (!enabled) return;

      try {
        // Dynamic import to keep @hai3/perf-telemetry optional — cached for onDestroy
        _mod = await import('@hai3/perf-telemetry') as PerfTelemetryModule;

        _mod.initOtel({
          serviceName: config?.serviceName ?? 'hai3-app',
          serviceVersion: config?.serviceVersion ?? '1.0.0',
          collectorUrl: config?.collectorUrl ?? 'http://localhost:14318',
          environment: config?.environment ?? 'development',
          enabled: true,
        });

        resolvedStore = _mod.telemetryStore ?? null;
      } catch {
        // Fail-open: if @hai3/perf-telemetry is not installed, silently skip
      }
    },

    onDestroy() {
      if (!_mod) return;
      try {
        if (_mod.isOtelInitialized()) {
          _mod.flushOtel()
            .catch(() => undefined)
            .finally(() => _mod?.shutdownOtel().catch(() => { /* fail-open */ }));
        }
      } catch {
        // Fail-open
      }
    },
  };
}
