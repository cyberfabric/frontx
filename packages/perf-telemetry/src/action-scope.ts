// @cpt-algo:cpt-hai3-algo-perf-telemetry-scope-resolution:p1
// @cpt-algo:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1
// @cpt-flow:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1
// @cpt-state:cpt-hai3-state-perf-telemetry-action-scope:p1
// @cpt-state:cpt-hai3-state-perf-telemetry-ambient-action:p1
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

function getRouteUiScopeKey(routeId: string, signalName: string): string {
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-build-route-ui-key
  return `${routeId}:${signalName}`;
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-build-route-ui-key
}

// ─── Ambient Action ──────────────────────────────────────────────────────────
// An ambient action is a synthetic root action that exists when no explicit
// user-triggered action is active. It ensures every span belongs to an action.
// Ambient actions are named after the current route context.

let _ambientScope: ActionScope | null = null;
let _ambientTracer: (() => import('@opentelemetry/api').Tracer) | null = null;

/** Registers the tracer factory used to create ambient action spans. Must be called before any ambient scope is needed. */
export function setAmbientTracer(factory: () => import('@opentelemetry/api').Tracer): void {
  _ambientTracer = factory;
}

export function clearAmbientTracer(): void {
  _ambientTracer = null;
}

// @cpt-hai3-telemetry-perf-state-ambient-lifecycle
function ensureAmbientAction(routeId: string, atMs?: number): ActionScope {
  // @cpt-begin:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-reuse-matching-ambient
  if (_ambientScope?.routeId === routeId) {
    return _ambientScope;
  }
  // @cpt-end:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-reuse-matching-ambient
  // @cpt-begin:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-close-previous-ambient
  if (_ambientScope) {
    _ambientScope.span.end();
    _ambientScope = null;
  }
  // @cpt-end:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-close-previous-ambient
  // @cpt-begin:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-guard-ambient-tracer
  if (!_ambientTracer) {
    throw new Error('[Telemetry] Ambient tracer not set. Call setAmbientTracer() during init.');
  }
  // @cpt-end:cpt-hai3-algo-perf-telemetry-ambient-lifecycle:p1:inst-guard-ambient-tracer
  const tracer = _ambientTracer();
  const actionName = `${routeId}.ambient`;
  const startedAtMs = atMs ?? performance.now();
  // @cpt-begin:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-start-ambient-action-span
  const span = tracer.startSpan(actionName, {
    startTime: startedAtMs,
    attributes: {
      'action.name': actionName,
      'route.id': routeId,
      'telemetry.breakdown.kind': 'action.total',
      'action.trigger': 'ambient',
    },
  });
  // @cpt-end:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-start-ambient-action-span
  const spanContext = span.spanContext();
  // @cpt-begin:cpt-hai3-state-perf-telemetry-ambient-action:p1:inst-cache-ambient-scope
  _ambientScope = {
    span,
    spanId: spanContext.spanId,
    traceId: spanContext.traceId,
    actionName,
    routeId,
    startedAtMs,
  };
  // @cpt-end:cpt-hai3-state-perf-telemetry-ambient-action:p1:inst-cache-ambient-scope
  return _ambientScope;
}

/** Ends the current ambient action span and clears the ambient scope. */
export function endAmbientAction(): void {
  // @cpt-begin:cpt-hai3-state-perf-telemetry-ambient-action:p1:inst-clear-ambient-scope
  if (_ambientScope) {
    _ambientScope.span.end();
    _ambientScope = null;
  }
  // @cpt-end:cpt-hai3-state-perf-telemetry-ambient-action:p1:inst-clear-ambient-scope
}

/** Returns the currently active ambient scope, or null if none exists. */
export function getAmbientScope(): ActionScope | null {
  return _ambientScope;
}

// @cpt-hai3-telemetry-perf-flow-action-lifecycle
/** Registers an active action scope for span correlation. */
export function beginActionScope(scope: ActionScope): void {
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-register-active-scope
  activeScopes.set(scope.spanId, scope);
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-register-active-scope
}

/** Removes an active scope by spanId and archives it in the recent-scopes ring buffer. */
export function endActionScope(spanId: string, endedAtMs: number): void {
  const scope = activeScopes.get(spanId);
  if (!scope) return;
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-archive-ended-scope
  activeScopes.delete(spanId);
  recentScopes = [{ ...scope, endedAtMs }, ...recentScopes].slice(0, MAX_RECENT_SCOPES);
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-archive-ended-scope
}

/** Returns all currently active (in-flight) action scopes. */
export function getActiveActionScopes(): ActionScope[] {
  return Array.from(activeScopes.values());
}

/** Registers the render scope (readySpan + uiSpan) for a route. */
export function beginRouteUiScope(scope: RouteUiScope): void {
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-register-route-ui-scope
  activeRouteUiScopes.set(getRouteUiScopeKey(scope.routeId, scope.signalName), scope);
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-register-route-ui-scope
}

/** Returns the active render scope for a route, or undefined if none is open. */
export function getActiveRouteUiScope(routeId: string, signalName: string): RouteUiScope | undefined {
  return activeRouteUiScopes.get(getRouteUiScopeKey(routeId, signalName));
}

/** Closes the render scope for a route and returns it with the end timestamp attached. */
export function endRouteUiScope(routeId: string, signalName: string, endedAtMs: number): RouteUiScope | undefined {
  const key = getRouteUiScopeKey(routeId, signalName);
  const scope = activeRouteUiScopes.get(key);
  if (!scope) return undefined;
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-close-route-ui-scope
  activeRouteUiScopes.delete(key);
  return { ...scope, endedAtMs };
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-close-route-ui-scope
}

// @cpt-hai3-telemetry-perf-algo-scope-resolution
/**
 * Finds the most relevant action scope for a given timestamp.
 * Checks active scopes first, then recent (within RENDER_FOLLOWUP_WINDOW_MS), then ambient fallback.
 */
export function findRelatedActionScope(atMs: number, routeId?: string): ActionScope | undefined {
  // @cpt-begin:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-find-active-scope
  const matchingActive = Array.from(activeScopes.values())
    .filter((scope) => (!routeId || scope.routeId === routeId) && scope.startedAtMs <= atMs)
    .sort((a, b) => b.startedAtMs - a.startedAtMs);
  // @cpt-end:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-find-active-scope

  // @cpt-begin:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-return-active-scope
  if (matchingActive.length > 0) return matchingActive[0];
  // @cpt-end:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-return-active-scope

  // @cpt-begin:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-find-recent-scope
  const fromRecent = recentScopes.find((scope) => {
    if (routeId && scope.routeId !== routeId) return false;
    if (scope.endedAtMs === undefined) return false;
    return atMs >= scope.startedAtMs && atMs <= scope.endedAtMs + RENDER_FOLLOWUP_WINDOW_MS;
  });
  // @cpt-end:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-find-recent-scope

  // @cpt-begin:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-return-recent-scope
  if (fromRecent) return fromRecent;
  // @cpt-end:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-return-recent-scope

  // Fallback: use ambient action so no span is ever orphaned
  // @cpt-begin:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-fallback-to-ambient-action
  if (routeId) return ensureAmbientAction(routeId, atMs);
  // @cpt-end:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-fallback-to-ambient-action

  return undefined;
}

// @cpt-hai3-telemetry-perf-algo-parent-context
/** Returns an OTel Context parented to the nearest action scope for the given timestamp. */
export function getActionParentContext(atMs: number, routeId?: string): Context | undefined {
  // @cpt-begin:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-resolve-parent-scope
  const scope = findRelatedActionScope(atMs, routeId);
  // @cpt-end:cpt-hai3-algo-perf-telemetry-scope-resolution:p1:inst-resolve-parent-scope
  if (!scope) {
    if (routeId) {
      // @cpt-begin:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-parent-context-from-ambient
      const ambient = ensureAmbientAction(routeId, atMs);
      return trace.setSpan(context.active(), ambient.span);
      // @cpt-end:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-parent-context-from-ambient
    }
    return undefined;
  }
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-parent-context-from-scope
  return trace.setSpan(context.active(), scope.span);
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-parent-context-from-scope
}

/** Returns an OTel Context parented to the active uiSpan for a route, or undefined if no render scope is open. */
export function getRouteUiParentContext(routeId: string): Context | undefined {
  let latestScope: RouteUiScope | undefined;
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-select-latest-route-ui-scope
  for (const scope of activeRouteUiScopes.values()) {
    if (scope.routeId !== routeId) continue;
    if (!latestScope || scope.startedAtMs > latestScope.startedAtMs) {
      latestScope = scope;
    }
  }
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-select-latest-route-ui-scope
  if (!latestScope) return undefined;
  // @cpt-begin:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-parent-context-from-route-ui
  return trace.setSpan(context.active(), latestScope.uiSpan);
  // @cpt-end:cpt-hai3-state-perf-telemetry-action-scope:p1:inst-parent-context-from-route-ui
}

/** Prefers routeUiScope context for child spans; falls back to action parent context. */
export function getTelemetryParentContext(routeId: string, atMs: number): Context | undefined {
  // @cpt-begin:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-prefer-route-ui-parent-context
  return getRouteUiParentContext(routeId) || getActionParentContext(atMs, routeId);
  // @cpt-end:cpt-hai3-flow-perf-telemetry-ambient-fallback:p1:inst-prefer-route-ui-parent-context
}
