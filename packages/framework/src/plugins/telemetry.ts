// @cpt-dod:cpt-hai3-dod-perf-telemetry-fail-open:p1
/**
 * Telemetry Plugin - Performance telemetry via @cyberfabric/perf-telemetry
 *
 * Framework Layer: L2
 * Provides: OTel initialization + lifecycle. The `telemetryStore` is read directly
 * from `@cyberfabric/perf-telemetry` (which delegates to the cross-runtime
 * `globalThis[Symbol.for('frontx:telemetry-registry')]` store) — Studio resolves
 * it via dynamic import, not via this plugin's `provides`.
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

/** Shape of the @cyberfabric/perf-telemetry module (avoids require + unknown). */
type PerfTelemetryModule = {
  initOtel: (config: { serviceName: string; serviceVersion: string; collectorUrl: string; environment: string; enabled: boolean }) => void;
  isOtelInitialized: () => boolean;
  flushOtel: () => Promise<void>;
  shutdownOtel: () => Promise<void>;
};

/**
 * Telemetry plugin factory.
 *
 * Provides performance telemetry integration via @cyberfabric/perf-telemetry.
 * When enabled, initializes OTel Browser SDK and joins the cross-runtime
 * shared telemetry registry so MFE child runtimes converge on the host store.
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
  let _mod: PerfTelemetryModule | null = null;

  return {
    name: 'telemetry',
    dependencies: [],

    async onInit() {
      const enabled = config?.enabled ?? true;
      if (!enabled) return;

      try {
        // Dynamic import to keep @cyberfabric/perf-telemetry optional — cached for onDestroy
        _mod = await import('@cyberfabric/perf-telemetry') as PerfTelemetryModule;

        _mod.initOtel({
          serviceName: config?.serviceName ?? 'frontx-app',
          serviceVersion: config?.serviceVersion ?? '1.0.0',
          collectorUrl: config?.collectorUrl ?? 'http://localhost:14318',
          environment: config?.environment ?? 'development',
          enabled: true,
        });
      } catch {
        // Fail-open: if @cyberfabric/perf-telemetry is not installed, silently skip
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
