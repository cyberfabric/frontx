/**
 * Action Scope — correlation engine for action-first telemetry
 *
 * Every span MUST belong to a named action. This module provides:
 * - Explicit action scopes (useTelemetryAction / runTelemetryAction)
 * - Ambient action fallback (<routeId>.ambient) for orphan prevention
 * - Parent context resolution for child spans
 *
 * The core contract: No span without action.name.
 */

import { context, trace, type Context } from '@opentelemetry/api';
import type { ActionScope, RouteUiScope } from './types';

const activeScopes = new Map<string, ActionScope>();
const activeRouteUiScopes = new Map<string, RouteUiScope>();
let recentScopes: ActionScope[] = [];
const MAX_RECENT_SCOPES = 100;
const RENDER_FOLLOWUP_WINDOW_MS = 2500;

// ─── Ambient Action ──────────────────────────────────────────────────────────
// An ambient action is a synthetic root action that exists when no explicit
// user-triggered action is active. It ensures every span belongs to an action.
// Ambient actions are named after the current route context.

let _ambientScope: ActionScope | null = null;
let _ambientTracer: (() => import('@opentelemetry/api').Tracer) | null = null;

export function setAmbientTracer(factory: () => import('@opentelemetry/api').Tracer): void {
  _ambientTracer = factory;
}

// @cpt-hai3-telemetry-perf-state-ambient-lifecycle
function ensureAmbientAction(routeId: string): ActionScope {
  if (_ambientScope && _ambientScope.routeId === routeId) {
    return _ambientScope;
  }
  if (_ambientScope) {
    _ambientScope.span.end();
    _ambientScope = null;
  }
  if (!_ambientTracer) {
    throw new Error('[Telemetry] Ambient tracer not set. Call setAmbientTracer() during init.');
  }
  const tracer = _ambientTracer();
  const actionName = `${routeId}.ambient`;
  const span = tracer.startSpan(actionName, {
    attributes: {
      'action.name': actionName,
      'route.id': routeId,
      'telemetry.breakdown.kind': 'action.total',
      'action.trigger': 'ambient',
    },
  });
  const spanContext = span.spanContext();
  _ambientScope = {
    span,
    spanId: spanContext.spanId,
    traceId: spanContext.traceId,
    actionName,
    routeId,
    startedAtMs: performance.now(),
  };
  return _ambientScope;
}

export function endAmbientAction(): void {
  if (_ambientScope) {
    _ambientScope.span.end();
    _ambientScope = null;
  }
}

export function getAmbientScope(): ActionScope | null {
  return _ambientScope;
}

// @cpt-hai3-telemetry-perf-flow-action-lifecycle
export function beginActionScope(scope: ActionScope): void {
  activeScopes.set(scope.spanId, scope);
}

export function endActionScope(spanId: string, endedAtMs: number): void {
  const scope = activeScopes.get(spanId);
  if (!scope) return;
  activeScopes.delete(spanId);
  recentScopes = [{ ...scope, endedAtMs }, ...recentScopes].slice(0, MAX_RECENT_SCOPES);
}

export function getActiveActionScopes(): ActionScope[] {
  return Array.from(activeScopes.values());
}

export function beginRouteUiScope(scope: RouteUiScope): void {
  activeRouteUiScopes.set(scope.routeId, scope);
}

export function getActiveRouteUiScope(routeId: string): RouteUiScope | undefined {
  return activeRouteUiScopes.get(routeId);
}

export function endRouteUiScope(routeId: string, endedAtMs: number): RouteUiScope | undefined {
  const scope = activeRouteUiScopes.get(routeId);
  if (!scope) return undefined;
  activeRouteUiScopes.delete(routeId);
  return { ...scope, endedAtMs };
}

// @cpt-hai3-telemetry-perf-algo-scope-resolution
export function findRelatedActionScope(atMs: number, routeId?: string): ActionScope | undefined {
  const matchingActive = Array.from(activeScopes.values())
    .filter((scope) => (!routeId || scope.routeId === routeId) && scope.startedAtMs <= atMs)
    .sort((a, b) => b.startedAtMs - a.startedAtMs);

  if (matchingActive.length > 0) return matchingActive[0];

  const fromRecent = recentScopes.find((scope) => {
    if (routeId && scope.routeId !== routeId) return false;
    if (scope.endedAtMs === undefined) return false;
    return atMs >= scope.startedAtMs && atMs <= scope.endedAtMs + RENDER_FOLLOWUP_WINDOW_MS;
  });

  if (fromRecent) return fromRecent;

  // Fallback: use ambient action so no span is ever orphaned
  if (routeId) return ensureAmbientAction(routeId);

  return undefined;
}

// @cpt-hai3-telemetry-perf-algo-parent-context
export function getActionParentContext(atMs: number, routeId?: string): Context | undefined {
  const scope = findRelatedActionScope(atMs, routeId);
  if (!scope) {
    if (routeId) {
      const ambient = ensureAmbientAction(routeId);
      return trace.setSpan(context.active(), ambient.span);
    }
    return undefined;
  }
  return trace.setSpan(context.active(), scope.span);
}

export function getRouteUiParentContext(routeId: string): Context | undefined {
  const scope = activeRouteUiScopes.get(routeId);
  if (!scope) return undefined;
  return trace.setSpan(context.active(), scope.uiSpan);
}

export function getTelemetryParentContext(routeId: string, atMs: number): Context | undefined {
  return getRouteUiParentContext(routeId) || getActionParentContext(atMs, routeId);
}
