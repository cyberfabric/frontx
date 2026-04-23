// @cpt-FEATURE:cpt-frontx-feature-auth-plugin:p1
// @cpt-begin:cpt-frontx-dod-auth-plugin:p1:inst-module
// @cpt-begin:cpt-frontx-state-auth-plugin-refresh:p1:inst-module
import type {
  AuthCallbackInput,
  AuthCheckResult,
  AuthContext,
  AccessDecision,
  AccessQuery,
  AuthLoginInput,
  AuthPermissions,
  AuthProvider,
  AuthSession,
  AuthTransportRequest,
  AuthStateListener,
  AuthUnsubscribe,
  AuthTransition,
} from '@cyberfabric/auth';
import {
  RestPlugin,
  RestProtocol,
  type ApiPluginErrorContext,
  type RestRequestContext,
  type RestResponseContext,
} from '@cyberfabric/api';
import type { HAI3Plugin } from '../types';

export type AuthRuntime = {
  provider: AuthProvider;
  getSession: (ctx?: AuthContext) => Promise<AuthSession | null>;
  checkAuth: (ctx?: AuthContext) => Promise<AuthCheckResult>;
  logout: (ctx?: AuthContext) => Promise<AuthTransition>;
  login?: (input: AuthLoginInput, ctx?: AuthContext) => Promise<AuthTransition>;
  handleCallback?: (input: AuthCallbackInput, ctx?: AuthContext) => Promise<AuthTransition>;
  refresh?: (ctx?: AuthContext) => Promise<AuthSession | null>;
  getPermissions?: (ctx?: AuthContext) => Promise<AuthPermissions>;
  canAccess?: <TRecord extends Record<string, string | number | boolean | null> = Record<string, string | number | boolean | null>>(query: AccessQuery<TRecord>, ctx?: AuthContext) => Promise<AccessDecision>;
  subscribe?: (listener: AuthStateListener) => AuthUnsubscribe;
};

export type AuthTransportBinding = {
  destroy: () => void;
};

export type AuthTransportBinder = (args: {
  provider: AuthProvider;
  csrfHeaderName?: string;
  allowedCookieOrigins?: string[];
  addRestPlugin: (plugin: RestPlugin) => void;
  removeRestPlugin: (pluginClass: new (...args: never[]) => RestPlugin) => void;
}) => AuthTransportBinding;

export type Hai3ApiAuthTransportConfig = {
  allowedCookieOrigins?: string[];
  csrfHeaderName?: string;
};

export type AuthPluginConfig = {
  provider: AuthProvider;
  /**
   * Optional transport binder.
   * If omitted, the default `hai3ApiTransport()` binding is used.
   */
  transport?: AuthTransportBinder;
  /**
   * Configuration for the default @cyberfabric/api binding.
   * Ignored when `transport` is provided.
   */
  hai3Api?: Hai3ApiAuthTransportConfig;
};

function isSupportedAuthTransportMethod(
  method: RestRequestContext['method']
): method is AuthTransportRequest['method'] {
  // @cpt-begin:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-method-guard
  return method === 'GET'
    || method === 'POST'
    || method === 'PUT'
    || method === 'DELETE'
    || method === 'PATCH'
    || method === 'HEAD'
    || method === 'OPTIONS';
  // @cpt-end:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-method-guard
}

function toAuthTransportRequest(request: RestRequestContext): AuthTransportRequest | null {
  if (!isSupportedAuthTransportMethod(request.method)) return null;

  // @cpt-begin:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-body-serialize
  let body: string | undefined;
  if (typeof request.body === 'string') {
    body = request.body;
  } else if (request.body !== undefined) {
    try {
      body = JSON.stringify(request.body);
    } catch {
      body = undefined;
    }
  }
  // @cpt-end:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-body-serialize

  // @cpt-begin:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-request-shape
  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  };
  // @cpt-end:cpt-frontx-algo-auth-plugin-transport-request:p1:inst-request-shape
}

function isRelativeUrl(url: string): boolean {
  // @cpt-begin:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-relative-url
  return url.startsWith('/') && !url.startsWith('//');
  // @cpt-end:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-relative-url
}

function getOrigin(url: string): string | null {
  // @cpt-begin:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-get-origin
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
  // @cpt-end:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-get-origin
}

function getRuntimeOrigin(): string | null {
  // @cpt-begin:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-runtime-origin
  const maybeLocation = (globalThis as { location?: { origin?: string } }).location;
  if (!maybeLocation?.origin || maybeLocation.origin === 'null') return null;
  return maybeLocation.origin;
  // @cpt-end:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-runtime-origin
}

function shouldIncludeCredentials(url: string, allowedOrigins: readonly string[] | undefined): boolean {
  // @cpt-begin:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-scope-check
  if (isRelativeUrl(url)) return true;

  const origin = getOrigin(url);
  if (!origin) return false;

  const runtimeOrigin = getRuntimeOrigin();
  if (runtimeOrigin && origin === runtimeOrigin) return true;

  if (!allowedOrigins || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
  // @cpt-end:cpt-frontx-algo-auth-plugin-credentials-scope:p1:inst-scope-check
}

class AuthRestPlugin extends RestPlugin {
  /** Shared in-flight refresh promise — deduplicates concurrent 401 refresh calls. */
  private refreshPromise: Promise<AuthSession | null> | null = null;

  constructor(private readonly config: AuthPluginConfig) {
    super();
  }

  async onRequest(ctx: RestRequestContext): Promise<RestRequestContext> {
    // @cpt-begin:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-session-fetch
    const session = await this.config.provider.getSession({ signal: ctx.signal });
    if (!session) return ctx;
    // @cpt-end:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-session-fetch

    // @cpt-begin:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-cookie-credentials
    if (session.kind === 'cookie') {
      if (!shouldIncludeCredentials(ctx.url, this.config.hai3Api?.allowedCookieOrigins)) return ctx;

      const next: RestRequestContext = { ...ctx, withCredentials: true };
      const csrfHeaderName = this.config.hai3Api?.csrfHeaderName;
      if (csrfHeaderName && session.csrfToken) {
        return {
          ...next,
          headers: {
            ...next.headers,
            [csrfHeaderName]: session.csrfToken,
          },
        };
      }
      return next;
    }
    // @cpt-end:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-cookie-credentials

    // @cpt-begin:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-bearer-header
    if (session.kind === 'bearer' && session.token) {
      return {
        ...ctx,
        headers: {
          ...ctx.headers,
          Authorization: `Bearer ${session.token}`,
        },
      };
    }
    // @cpt-end:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-bearer-header

    // @cpt-begin:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-custom-passthrough
    // Custom sessions: no standard transport mechanism — use a custom transport binder for retry.
    return ctx;
    // @cpt-end:cpt-frontx-flow-auth-plugin-session-attach:p1:inst-custom-passthrough
  }

  async onError(ctx: ApiPluginErrorContext): Promise<Error | RestResponseContext> {
    // @cpt-begin:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-error-notify
    // Notify provider of every transport error (informational; called before retry decisions).
    const requestForHook = toAuthTransportRequest(ctx.request);
    if (requestForHook) {
      this.config.provider.onTransportError?.({
        request: requestForHook,
        error: ctx.error,
        status: ctx.response?.status,
      });
    }
    // @cpt-end:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-error-notify

    if (ctx.response?.status !== 401) return ctx.error;
    if (ctx.retryCount !== 0) return ctx.error;
    if (!this.config.provider.refresh) return ctx.error;

    // @cpt-begin:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-refresh-dedup
    // Dedup concurrent 401 refresh calls into a single in-flight promise.
    // NOTE: shared refresh must NOT be bound to any single request's AbortSignal —
    // otherwise aborting the first caller would cancel refresh for all concurrent
    // waiters on the same promise. Cancellation of the refresh call itself is the
    // provider's responsibility (timeout / internal lifecycle).
    if (!this.refreshPromise) {
      this.refreshPromise = this.config.provider
        .refresh()
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    // @cpt-end:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-refresh-dedup

    // @cpt-begin:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-refresh-await
    let refreshed: AuthSession | null;
    try {
      refreshed = await this.refreshPromise;
    } catch {
      return ctx.error;
    }
    if (!refreshed) return ctx.error;
    // @cpt-end:cpt-frontx-algo-auth-plugin-refresh-dedup:p1:inst-refresh-await

    // @cpt-begin:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-retry-bearer
    if (refreshed.kind === 'bearer') {
      if (!refreshed.token) return ctx.error;
      return ctx.retry({
        headers: { Authorization: `Bearer ${refreshed.token}` },
      });
    }
    // @cpt-end:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-retry-bearer

    // @cpt-begin:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-retry-cookie
    if (refreshed.kind === 'cookie') {
      // Cookie credentials are sent automatically via withCredentials.
      // No Authorization header override needed after refresh.
      return ctx.retry();
    }
    // @cpt-end:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-retry-cookie

    // Custom sessions: no standard retry mechanism — use a custom transport binder.
    return ctx.error;
  }
}

// @cpt-begin:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-plugin-factory
export function hai3ApiTransport(): AuthTransportBinder {
  return (args) => {
    const restPlugin = new AuthRestPlugin({
      provider: args.provider,
      hai3Api: {
        allowedCookieOrigins: args.allowedCookieOrigins,
        csrfHeaderName: args.csrfHeaderName,
      },
    });
    args.addRestPlugin(restPlugin);
    return {
      destroy: () => {
        args.removeRestPlugin(AuthRestPlugin);
      },
    };
  };
}
// @cpt-end:cpt-frontx-flow-auth-plugin-refresh-retry:p1:inst-plugin-factory

/**
 * Auth plugin.
 *
 * Wires a headless AuthProvider into @cyberfabric/api protocol plugins and exposes `app.auth`.
 *
 * **Scope:** REST transport only. SSE (Server-Sent Events) auth is out-of-scope for the
 * default `hai3ApiTransport()` binding. SSE connections requiring auth should use a custom
 * transport binder via the `transport` option.
 */
export function auth(config: AuthPluginConfig): HAI3Plugin {
  const transport = config.transport ?? hai3ApiTransport();
  let binding: AuthTransportBinding | null = null;

  return {
    name: 'auth',
    // @cpt-begin:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-provides
    provides: {
      app: {
        auth: {
          provider: config.provider,
          getSession: (ctx?: AuthContext) => config.provider.getSession(ctx),
          checkAuth: (ctx?: AuthContext) => config.provider.checkAuth(ctx),
          logout: (ctx?: AuthContext) => config.provider.logout(ctx),
          login: config.provider.login?.bind(config.provider),
          handleCallback: config.provider.handleCallback?.bind(config.provider),
          refresh: config.provider.refresh?.bind(config.provider),

          getPermissions: config.provider.getPermissions?.bind(config.provider),
          canAccess: config.provider.canAccess?.bind(config.provider),
          subscribe: config.provider.subscribe?.bind(config.provider),
        } satisfies AuthRuntime,
      },
    },
    // @cpt-end:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-provides
    // @cpt-begin:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-on-init
    onInit(app) {
      binding = transport({
        provider: config.provider,
        allowedCookieOrigins: config.hai3Api?.allowedCookieOrigins,
        csrfHeaderName: config.hai3Api?.csrfHeaderName,
        addRestPlugin: (plugin) => app.apiRegistry.plugins.add(RestProtocol, plugin),
        removeRestPlugin: (pluginClass) => app.apiRegistry.plugins.remove(RestProtocol, pluginClass),
      });
    },
    // @cpt-end:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-on-init
    // @cpt-begin:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-on-destroy
    onDestroy(_app) {
      binding?.destroy();
      binding = null;
      const providerDestroyResult = config.provider.destroy?.();
      if (providerDestroyResult && typeof providerDestroyResult === 'object' && 'catch' in providerDestroyResult) {
        void providerDestroyResult.catch(() => undefined);
      }
    },
    // @cpt-end:cpt-frontx-flow-auth-plugin-transport-binding:p1:inst-on-destroy
  };
}

// @cpt-end:cpt-frontx-state-auth-plugin-refresh:p1:inst-module
// @cpt-end:cpt-frontx-dod-auth-plugin:p1:inst-module

declare module '../types' {
  interface HAI3AppRuntimeExtensions {
    auth?: AuthRuntime;
  }
}
