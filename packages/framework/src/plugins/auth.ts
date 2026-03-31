import type {
  AuthCallbackInput,
  AuthCheckResult,
  AuthContext,
  AuthIdentity,
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
} from '@hai3/auth';
import {
  RestPlugin,
  RestProtocol,
  type ApiPluginErrorContext,
  type RestRequestContext,
  type RestResponseContext,
} from '@hai3/api';
import type { HAI3Plugin } from '../types';

export type AuthRuntime = {
  provider: AuthProvider;
  getSession: (ctx?: AuthContext) => Promise<AuthSession | null>;
  checkAuth: (ctx?: AuthContext) => Promise<AuthCheckResult>;
  logout: (ctx?: AuthContext) => Promise<AuthTransition>;
  login?: (input: AuthLoginInput, ctx?: AuthContext) => Promise<AuthTransition>;
  handleCallback?: (input: AuthCallbackInput, ctx?: AuthContext) => Promise<AuthTransition>;
  refresh?: (ctx?: AuthContext) => Promise<AuthSession | null>;
  getIdentity?: (ctx?: AuthContext) => Promise<AuthIdentity | null>;
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
   * Configuration for the default @hai3/api binding.
   * Ignored when `transport` is provided.
   */
  hai3Api?: Hai3ApiAuthTransportConfig;
};

function isSupportedAuthTransportMethod(
  method: RestRequestContext['method']
): method is AuthTransportRequest['method'] {
  return method === 'GET'
    || method === 'POST'
    || method === 'PUT'
    || method === 'DELETE'
    || method === 'PATCH';
}

function toAuthTransportRequest(request: RestRequestContext): AuthTransportRequest | null {
  if (!isSupportedAuthTransportMethod(request.method)) return null;

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

  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  };
}

function isRelativeUrl(url: string): boolean {
  return url.startsWith('/');
}

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function getRuntimeOrigin(): string | null {
  const maybeLocation = (globalThis as { location?: { origin?: string } }).location;
  if (!maybeLocation?.origin) return null;
  return maybeLocation.origin;
}

function shouldIncludeCredentials(url: string, allowedOrigins: readonly string[] | undefined): boolean {
  if (isRelativeUrl(url)) return true;

  const origin = getOrigin(url);
  if (!origin) return false;

  const runtimeOrigin = getRuntimeOrigin();
  if (runtimeOrigin && origin === runtimeOrigin) return true;

  if (!allowedOrigins || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
}

class AuthRestPlugin extends RestPlugin {
  /** Shared in-flight refresh promise — deduplicates concurrent 401 refresh calls. */
  private refreshPromise: Promise<AuthSession | null> | null = null;

  constructor(private readonly config: AuthPluginConfig) {
    super();
  }

  async onRequest(ctx: RestRequestContext): Promise<RestRequestContext> {
    const session = await this.config.provider.getSession({ signal: ctx.signal });
    if (!session) return ctx;

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

    if (session.kind === 'bearer' && session.token) {
      return {
        ...ctx,
        headers: {
          ...ctx.headers,
          Authorization: `Bearer ${session.token}`,
        },
      };
    }

    return ctx;
  }

  async onError(ctx: ApiPluginErrorContext): Promise<Error | RestResponseContext> {
    // Notify provider of every transport error (informational; called before retry decisions).
    const requestForHook = toAuthTransportRequest(ctx.request);
    if (requestForHook) {
      this.config.provider.onTransportError?.({
        request: requestForHook,
        error: ctx.error,
        status: ctx.response?.status,
      });
    }

    if (ctx.response?.status !== 401) return ctx.error;
    if (ctx.retryCount !== 0) return ctx.error;
    if (!this.config.provider.refresh) return ctx.error;

    // Dedup concurrent 401 refresh calls into a single in-flight promise.
    if (!this.refreshPromise) {
      this.refreshPromise = this.config.provider
        .refresh({ signal: ctx.request.signal })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    const refreshed = await this.refreshPromise;
    if (!refreshed) return ctx.error;

    if (refreshed.kind === 'bearer') {
      if (!refreshed.token) return ctx.error;
      return ctx.retry({
        headers: { Authorization: `Bearer ${refreshed.token}` },
      });
    }

    if (refreshed.kind === 'cookie') {
      // Cookie credentials are sent automatically via withCredentials.
      // No Authorization header override needed after refresh.
      return ctx.retry();
    }

    return ctx.error;
  }
}

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
      destroy: () => args.removeRestPlugin(AuthRestPlugin),
    };
  };
}

/**
 * Auth plugin.
 *
 * Wires a headless AuthProvider into @hai3/api protocol plugins and exposes `app.auth`.
 */
export function auth(config: AuthPluginConfig): HAI3Plugin {
  const transport = config.transport ?? hai3ApiTransport();
  let binding: AuthTransportBinding | null = null;

  return {
    name: 'auth',
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
          getIdentity: config.provider.getIdentity?.bind(config.provider),
          getPermissions: config.provider.getPermissions?.bind(config.provider),
          canAccess: config.provider.canAccess?.bind(config.provider),
          subscribe: config.provider.subscribe?.bind(config.provider),
        } satisfies AuthRuntime,
      },
    },
    onInit(app) {
      binding = transport({
        provider: config.provider,
        allowedCookieOrigins: config.hai3Api?.allowedCookieOrigins,
        csrfHeaderName: config.hai3Api?.csrfHeaderName,
        addRestPlugin: (plugin) => app.apiRegistry.plugins.add(RestProtocol, plugin),
        removeRestPlugin: (pluginClass) => app.apiRegistry.plugins.remove(RestProtocol, pluginClass),
      });
    },
    onDestroy(_app) {
      binding?.destroy();
      binding = null;
      const providerDestroyResult = config.provider.destroy?.();
      if (providerDestroyResult && typeof providerDestroyResult === 'object' && 'catch' in providerDestroyResult) {
        void providerDestroyResult.catch(() => undefined);
      }
    },
  };
}

declare module '../types' {
  interface HAI3AppRuntimeExtensions {
    auth?: AuthRuntime;
  }
}
