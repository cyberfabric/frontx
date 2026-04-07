/**
 * useTelemetryRuntimeConfig — reactive hook for runtime telemetry config.
 *
 * Re-renders when updateTelemetryRuntimeConfig() is called anywhere.
 */

import { useEffect, useState } from 'react';
import { getTelemetryRuntimeConfig, subscribeTelemetryRuntimeConfig } from './runtime-config';
import type { TelemetryRuntimeConfig } from './types';

export function useTelemetryRuntimeConfig(): TelemetryRuntimeConfig {
  const [config, setConfig] = useState<TelemetryRuntimeConfig>(() => getTelemetryRuntimeConfig());

  useEffect(() => {
    return subscribeTelemetryRuntimeConfig(() => {
      setConfig(getTelemetryRuntimeConfig());
    });
  }, []);

  return config;
}
