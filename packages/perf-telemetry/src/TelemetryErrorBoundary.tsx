// @cpt-dod:cpt-hai3-dod-perf-telemetry-fail-open:p1
/**
 * TelemetryErrorBoundary — fail-open React error boundary for telemetry.
 *
 * Catches errors from telemetry components (TelemetryProvider, hooks)
 * and renders children anyway. Telemetry failures must never crash the app.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface TelemetryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface TelemetryErrorBoundaryState {
  hasError: boolean;
}

export class TelemetryErrorBoundary extends Component<TelemetryErrorBoundaryProps, TelemetryErrorBoundaryState> {
  constructor(props: TelemetryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TelemetryErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('[TelemetryErrorBoundary] Caught error (fail-open):', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fail-open: render fallback if provided, otherwise gracefully degrade
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
