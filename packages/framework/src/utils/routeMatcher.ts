/**
 * Route Matcher Utilities
 *
 * Provides route pattern matching and URL generation using path-to-regexp.
 */

import { match, compile } from 'path-to-regexp';
import type { CompiledRoute, RouteMatchResult } from '../types';

/**
 * Compiles a route pattern into a matcher and path generator
 */
export function compileRoute(
  pattern: string,
  screensetId: string,
  screenId: string
): CompiledRoute {
  return {
    pattern,
    screensetId,
    screenId,
    matcher: match<Record<string, string>>(pattern, { decode: decodeURIComponent }),
    toPath: compile<Record<string, string>>(pattern, { encode: encodeURIComponent }),
  };
}

/**
 * Matches a URL path against a list of compiled routes
 * Returns the first matching route with extracted params, or undefined if no match
 */
export function matchPath(
  path: string,
  routes: CompiledRoute[]
): RouteMatchResult | undefined {
  for (const route of routes) {
    const result = route.matcher(path);
    if (result) {
      return {
        screensetId: route.screensetId,
        screenId: route.screenId,
        params: result.params as Record<string, string>,
      };
    }
  }
  return undefined;
}

/**
 * Generates a URL path from a route pattern and params
 */
export function generatePath(
  route: CompiledRoute,
  params: Record<string, string>
): string {
  return route.toPath(params);
}

/**
 * Extract required parameter names from a route pattern
 * @param pattern - Route pattern like '/users/:id/posts/:postId'
 * @returns Array of parameter names like ['id', 'postId']
 */
export function extractRequiredParams(pattern: string): string[] {
  const params: string[] = [];
  const matches = pattern.match(/:([^/]+)/g);
  if (matches) {
    for (const match of matches) {
      params.push(match.slice(1)); // Remove ':'
    }
  }
  return params;
}
