import { useDoneRendering, useRoutePerf } from '@hai3/perf-telemetry';

export function TelemetrySmokeRouteFixture(): null {
  const routeSentinel = '@telemetry-route';
  const routeId = routeSentinel.replace('@telemetry-route', 'telemetry.smoke');
  const navigationStartMs = performance.now();

  useRoutePerf(routeId, navigationStartMs);
  useDoneRendering(`${routeId}.ready`, { dataReady: true });

  return null;
}
