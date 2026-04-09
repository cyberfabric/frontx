import { useRef } from 'react';
import { useDoneRendering, useRoutePerf } from '@hai3/perf-telemetry';

export function TelemetrySmokeRouteFixture(): null {
  const routeSentinel = '@telemetry-route';
  const routeId = routeSentinel.replace('@telemetry-route', 'telemetry.smoke');
  const navigationStartMsRef = useRef<number | null>(null);
  if (navigationStartMsRef.current === null) {
    navigationStartMsRef.current = performance.now();
  }

  useRoutePerf(routeId, navigationStartMsRef.current);
  useDoneRendering(`${routeId}.ready`, { dataReady: true });

  return null;
}
