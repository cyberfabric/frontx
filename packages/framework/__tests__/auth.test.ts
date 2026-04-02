/**
 * Unit tests for auth plugin
 *
 * Covers:
 * 1. Bearer header attached when provider session is bearer token.
 * 2. Cookie-session credentials enabled only for relative URLs and allowlisted origins.
 * 3. Refresh+retry on 401: calls ctx.retry once with new Authorization.
 * 4. Custom transport binder is used and default binding is not.
 * 5. app.auth surface exists and delegates methods.
 * 6. CSRF header attached when csrfHeaderName + session.csrfToken are set.
 * 7. provider.onTransportError invoked on every transport error.
 * 8. Cookie session refresh path: retry without header override.
 * 9. Refresh dedup: concurrent 401s share a single in-flight refresh promise.
 * 10. provider.destroy() called on app.destroy().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRegistry, RestProtocol } from '@cyberfabric/api';
import { createStore } from '@cyberfabric/state';
import type { RestPlugin, RestPluginHooks, RestRequestContext } from '@cyberfabric/api';
import type { AuthProvider, AuthSession } from '@cyberfabric/auth';
import { createHAI3 } from '../src/createHAI3';
import { auth, hai3ApiTransport } from '../src/plugins/auth';
import type { AuthTransportBinder } from '../src/plugins/auth';

/** Concrete auth transport plugins implement hooks; `RestPlugin` instance type omits optional hook keys. */
type AuthRestPlugin = RestPlugin & Pick<RestPluginHooks, 'onRequest' | 'onError'>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBearerProvider(
  token: string,
  refresh?: AuthProvider['refresh'],
): AuthProvider {
  return {
    getSession: vi.fn().mockResolvedValue({ kind: 'bearer', token } satisfies AuthSession),
    checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
    logout: vi.fn().mockResolvedValue({ type: 'none' }),
    ...(refresh ? { refresh } : {}),
  };
}

function makeCookieProvider(): AuthProvider {
  return {
    getSession: vi.fn().mockResolvedValue({ kind: 'cookie' } satisfies AuthSession),
    checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
    logout: vi.fn().mockResolvedValue({ type: 'none' }),
  };
}

function makeNullSessionProvider(): AuthProvider {
  return {
    getSession: vi.fn().mockResolvedValue(null),
    checkAuth: vi.fn().mockResolvedValue({ authenticated: false }),
    logout: vi.fn().mockResolvedValue({ type: 'none' }),
  };
}

/** Use hai3ApiTransport directly to capture the internal plugin instance. */
function capturePlugin(
  provider: AuthProvider,
  opts?: { allowedCookieOrigins?: string[]; csrfHeaderName?: string },
): AuthRestPlugin {
  const binder = hai3ApiTransport();
  let captured: AuthRestPlugin | null = null;

  binder({
    provider,
    allowedCookieOrigins: opts?.allowedCookieOrigins,
    csrfHeaderName: opts?.csrfHeaderName,
    addRestPlugin: (p: RestPlugin) => {
      captured = p as AuthRestPlugin;
    },
    removeRestPlugin: vi.fn(),
  });

  if (!captured) throw new Error('addRestPlugin was not called by binder');
  return captured;
}

function makeReqCtx(url: string, headers: Record<string, string> = {}): RestRequestContext {
  return { method: 'GET', url, headers };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('auth plugin', () => {
  beforeEach(() => {
    apiRegistry.reset();
    createStore({});
  });

  afterEach(() => {
    apiRegistry.reset();
  });

  // -------------------------------------------------------------------------
  // 1. Bearer header
  // -------------------------------------------------------------------------
  describe('bearer session', () => {
    it('attaches Authorization: Bearer header when provider returns bearer token', async () => {
      const plugin = capturePlugin(makeBearerProvider('tok-abc'));

      const result = (await plugin.onRequest?.(makeReqCtx('/api'))) as RestRequestContext;

      expect(result.headers['Authorization']).toBe('Bearer tok-abc');
    });

    it('passes through unmodified when session is null', async () => {
      const plugin = capturePlugin(makeNullSessionProvider());
      const ctx = makeReqCtx('/api');

      const result = (await plugin.onRequest?.(ctx)) as RestRequestContext;

      expect(result.headers['Authorization']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Cookie-session credentials
  // -------------------------------------------------------------------------
  describe('cookie session credentials', () => {
    it('sets withCredentials=true for relative URLs', async () => {
      const plugin = capturePlugin(makeCookieProvider());

      const result = (await plugin.onRequest?.(makeReqCtx('/relative/path'))) as RestRequestContext;

      expect(result.withCredentials).toBe(true);
    });

    it('does NOT set withCredentials for absolute URLs not in allowlist', async () => {
      const plugin = capturePlugin(makeCookieProvider(), {
        allowedCookieOrigins: ['https://trusted.example.com'],
      });

      const result = (await plugin.onRequest?.(
        makeReqCtx('https://other.example.com/api'),
      )) as RestRequestContext;

      expect(result.withCredentials).toBeFalsy();
    });

    it('sets withCredentials=true for absolute URLs from allowlisted origins', async () => {
      const plugin = capturePlugin(makeCookieProvider(), {
        allowedCookieOrigins: ['https://trusted.example.com'],
      });

      const result = (await plugin.onRequest?.(
        makeReqCtx('https://trusted.example.com/api'),
      )) as RestRequestContext;

      expect(result.withCredentials).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 6. CSRF header
    // -----------------------------------------------------------------------
    it('attaches csrfHeaderName header when csrfHeaderName is configured and session has csrfToken', async () => {
      const provider: AuthProvider = {
        getSession: vi.fn().mockResolvedValue({ kind: 'cookie', csrfToken: 'csrf-abc' } satisfies AuthSession),
        checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
        logout: vi.fn().mockResolvedValue({ type: 'none' }),
      };
      const plugin = capturePlugin(provider, { csrfHeaderName: 'X-CSRF-Token' });

      const result = (await plugin.onRequest?.(makeReqCtx('/api'))) as RestRequestContext;

      expect(result.withCredentials).toBe(true);
      expect(result.headers['X-CSRF-Token']).toBe('csrf-abc');
    });

    it('does not attach csrf header when csrfToken is absent', async () => {
      const plugin = capturePlugin(makeCookieProvider(), { csrfHeaderName: 'X-CSRF-Token' });

      const result = (await plugin.onRequest?.(makeReqCtx('/api'))) as RestRequestContext;

      expect(result.withCredentials).toBe(true);
      expect(result.headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. 401 refresh + retry
  // -------------------------------------------------------------------------
  describe('401 refresh and retry', () => {
    it('calls provider.refresh then ctx.retry with refreshed credentials on 401 (retryCount=0)', async () => {
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'bearer', token: 'new-tok' } satisfies AuthSession);
      const plugin = capturePlugin(makeBearerProvider('old-tok', refreshFn));

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} }),
      };

      await plugin.onError?.(errCtx);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(errCtx.retry).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer new-tok' } });
    });

    it('returns error without retry on 401 when retryCount > 0', async () => {
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'bearer', token: 'new-tok' } satisfies AuthSession);
      const plugin = capturePlugin(makeBearerProvider('old-tok', refreshFn));

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 1,
        retry: vi.fn(),
      };

      const result = await plugin.onError?.(errCtx);

      expect(errCtx.retry).not.toHaveBeenCalled();
      expect(result).toBe(errCtx.error);
    });

    it('returns error without retry for non-401 status', async () => {
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'bearer', token: 'new-tok' } satisfies AuthSession);
      const plugin = capturePlugin(makeBearerProvider('old-tok', refreshFn));

      const errCtx = {
        error: new Error('HTTP 500'),
        request: makeReqCtx('/api'),
        response: { status: 500, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      };

      const result = await plugin.onError?.(errCtx);

      expect(errCtx.retry).not.toHaveBeenCalled();
      expect(result).toBe(errCtx.error);
    });

    it('returns error when provider has no refresh method', async () => {
      const plugin = capturePlugin(makeBearerProvider('tok')); // no refresh

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      };

      const result = await plugin.onError?.(errCtx);

      expect(errCtx.retry).not.toHaveBeenCalled();
      expect(result).toBe(errCtx.error);
    });

    // -----------------------------------------------------------------------
    // 8. Cookie session refresh path
    // -----------------------------------------------------------------------
    it('calls provider.refresh and retries without header override on 401 with cookie session', async () => {
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'cookie' } satisfies AuthSession);
      const provider: AuthProvider = {
        getSession: vi.fn().mockResolvedValue({ kind: 'cookie' } satisfies AuthSession),
        checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
        logout: vi.fn().mockResolvedValue({ type: 'none' }),
        refresh: refreshFn,
      };
      const plugin = capturePlugin(provider);

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} }),
      };

      await plugin.onError?.(errCtx);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(errCtx.retry).toHaveBeenCalledTimes(1);
      // Cookie retry must not inject any Authorization header
      expect(errCtx.retry).toHaveBeenCalledWith();
    });

    // -----------------------------------------------------------------------
    // 9. Refresh dedup
    // -----------------------------------------------------------------------
    it('deduplicates concurrent 401 refresh calls into a single in-flight promise', async () => {
      let resolveRefresh!: (value: AuthSession) => void;
      const pendingRefresh = new Promise<AuthSession>((resolve) => {
        resolveRefresh = resolve;
      });
      const refreshFn = vi.fn().mockReturnValue(pendingRefresh);
      const plugin = capturePlugin(makeBearerProvider('old-tok', refreshFn));

      const makeErrCtx = () => {
        return {
          error: new Error('HTTP 401'),
          request: makeReqCtx('/api'),
          response: { status: 401, headers: {}, data: null },
          retryCount: 0,
          retry: vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} }),
        };
      };

      const errCtx1 = makeErrCtx();
      const errCtx2 = makeErrCtx();

      // Start both concurrently before resolving refresh
      const p1 = plugin.onError?.(errCtx1);
      const p2 = plugin.onError?.(errCtx2);

      resolveRefresh({ kind: 'bearer', token: 'new-tok' });

      await Promise.all([p1, p2]);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(errCtx1.retry).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer new-tok' } });
      expect(errCtx2.retry).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer new-tok' } });
    });
  });

  // -------------------------------------------------------------------------
  // 4. Custom transport binder
  // -------------------------------------------------------------------------
  describe('custom transport binder', () => {
    it('invokes the custom binder on app init instead of default', () => {
      const customBinder: AuthTransportBinder = vi.fn().mockReturnValue({ destroy: vi.fn() });
      const provider = makeBearerProvider('tok');

      const app = createHAI3().use(auth({ provider, transport: customBinder })).build();

      expect(customBinder).toHaveBeenCalledTimes(1);
      expect(customBinder).toHaveBeenCalledWith(expect.objectContaining({ provider }));

      app.destroy();
    });

    it('does not add default AuthRestPlugin when custom binder does not call addRestPlugin', () => {
      // Custom binder that intentionally does not call addRestPlugin
      const customBinder: AuthTransportBinder = (_args: Parameters<AuthTransportBinder>[0]) => {
        return { destroy: vi.fn() };
      };
      const provider = makeBearerProvider('tok');

      const app = createHAI3().use(auth({ provider, transport: customBinder })).build();

      expect(apiRegistry.plugins.getAll(RestProtocol)).toHaveLength(0);

      app.destroy();
    });

    it('default binding registers one RestPlugin in apiRegistry when no custom binder given', () => {
      const provider = makeBearerProvider('tok');

      const app = createHAI3().use(auth({ provider })).build();

      expect(apiRegistry.plugins.getAll(RestProtocol)).toHaveLength(1);

      app.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // 5. app.auth surface
  // -------------------------------------------------------------------------
  describe('app.auth surface', () => {
    it('is defined on the built app', () => {
      const provider = makeBearerProvider('tok');
      const app = createHAI3().use(auth({ provider })).build();

      expect(app.auth).toBeDefined();

      app.destroy();
    });

    it('exposes provider reference via app.auth.provider', () => {
      const provider = makeBearerProvider('tok');
      const app = createHAI3().use(auth({ provider })).build();

      expect(app.auth?.provider).toBe(provider);

      app.destroy();
    });

    it('app.auth.getSession delegates to provider.getSession', async () => {
      const provider = makeBearerProvider('tok');
      const app = createHAI3().use(auth({ provider })).build();
      const ctx = {};

      await app.auth?.getSession(ctx);

      expect(provider.getSession).toHaveBeenCalledWith(ctx);

      app.destroy();
    });

    it('app.auth.checkAuth delegates to provider.checkAuth', async () => {
      const provider = makeBearerProvider('tok');
      const app = createHAI3().use(auth({ provider })).build();

      await app.auth?.checkAuth();

      expect(provider.checkAuth).toHaveBeenCalled();

      app.destroy();
    });

    it('app.auth.logout delegates to provider.logout', async () => {
      const provider = makeBearerProvider('tok');
      const app = createHAI3().use(auth({ provider })).build();

      await app.auth?.logout();

      expect(provider.logout).toHaveBeenCalled();

      app.destroy();
    });

    it('passes through optional canAccess and subscribe when implemented', async () => {
      const unsubscribe = vi.fn();
      const provider: AuthProvider = {
        ...makeBearerProvider('tok'),
        canAccess: vi.fn().mockResolvedValue('allow'),
        subscribe: vi.fn().mockReturnValue(unsubscribe),
      };
      const app = createHAI3().use(auth({ provider })).build();

      const decision = await app.auth?.canAccess?.({ action: 'read', resource: 'x' });
      expect(decision).toBe('allow');
      expect(provider.canAccess).toHaveBeenCalledTimes(1);

      const unsub = app.auth?.subscribe?.(() => undefined);
      expect(unsub).toBe(unsubscribe);
      expect(provider.subscribe).toHaveBeenCalledTimes(1);

      app.destroy();
    });

    // -----------------------------------------------------------------------
    // 10. provider.destroy() on app.destroy()
    // -----------------------------------------------------------------------
    it('calls provider.destroy() when app.destroy() is called', () => {
      const destroyFn = vi.fn();
      const provider: AuthProvider = { ...makeBearerProvider('tok'), destroy: destroyFn };
      const app = createHAI3().use(auth({ provider })).build();

      app.destroy();

      expect(destroyFn).toHaveBeenCalledTimes(1);
    });

    it('does not throw when provider has no destroy method', () => {
      const provider = makeBearerProvider('tok'); // no destroy
      const app = createHAI3().use(auth({ provider })).build();

      expect(() => {
        app.destroy();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Transport error hooks
  // -------------------------------------------------------------------------
  describe('transport error hooks', () => {
    it('calls provider.onTransportError for every transport error', async () => {
      const onTransportError = vi.fn();
      const provider: AuthProvider = { ...makeBearerProvider('tok'), onTransportError };
      const plugin = capturePlugin(provider);

      const err = new Error('Network failure');
      const errCtx = {
        error: err,
        request: makeReqCtx('/api'),
        response: { status: 500, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      };

      await plugin.onError?.(errCtx);

      expect(onTransportError).toHaveBeenCalledTimes(1);
      expect(onTransportError).toHaveBeenCalledWith(
        expect.objectContaining({ error: err, status: 500 }),
      );
    });

    it('calls provider.onTransportError even for 401 errors that will be retried', async () => {
      const onTransportError = vi.fn();
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'bearer', token: 'new-tok' } satisfies AuthSession);
      const provider: AuthProvider = {
        ...makeBearerProvider('old-tok', refreshFn),
        onTransportError,
      };
      const plugin = capturePlugin(provider);

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} }),
      };

      await plugin.onError?.(errCtx);

      expect(onTransportError).toHaveBeenCalledTimes(1);
      expect(errCtx.retry).toHaveBeenCalledTimes(1);
    });

    it('does not throw when provider has no onTransportError hook', async () => {
      const plugin = capturePlugin(makeBearerProvider('tok')); // no onTransportError

      const errCtx = {
        error: new Error('HTTP 500'),
        request: makeReqCtx('/api'),
        response: { status: 500, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      };

      const result = await plugin.onError?.(errCtx);
      expect(result).toBe(errCtx.error);
    });
  });

  // -------------------------------------------------------------------------
  // 11. Protocol-relative URL credential leak
  // -------------------------------------------------------------------------
  describe('protocol-relative URL', () => {
    it('does NOT set withCredentials for protocol-relative URLs', async () => {
      const plugin = capturePlugin(makeCookieProvider());

      const result = (await plugin.onRequest?.(makeReqCtx('//cdn.example.com/asset'))) as RestRequestContext;

      expect(result.withCredentials).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 12. Opaque origin "null" (sandboxed iframe / file://)
  // -------------------------------------------------------------------------
  describe('opaque origin', () => {
    it('does NOT match opaque "null" origin against URL origins', async () => {
      const saved = (globalThis as Record<string, unknown>).location;
      (globalThis as Record<string, unknown>).location = { origin: 'null' };

      try {
        const plugin = capturePlugin(makeCookieProvider());

        // An absolute URL whose origin happens to be 'https://null' should NOT get credentials
        const result = (await plugin.onRequest?.(makeReqCtx('https://null/api'))) as RestRequestContext;

        expect(result.withCredentials).toBeUndefined();
      } finally {
        (globalThis as Record<string, unknown>).location = saved;
      }
    });
  });

  // -------------------------------------------------------------------------
  // 13. Custom session kind (pass-through)
  // -------------------------------------------------------------------------
  describe('custom session kind', () => {
    it('does not modify request for custom sessions', async () => {
      const provider: AuthProvider = {
        getSession: vi.fn().mockResolvedValue({ kind: 'custom' } satisfies AuthSession),
        checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
        logout: vi.fn().mockResolvedValue({ type: 'none' }),
      };
      const plugin = capturePlugin(provider);

      const original = makeReqCtx('/api');
      const result = (await plugin.onRequest?.(original)) as RestRequestContext;

      expect(result.headers['Authorization']).toBeUndefined();
      expect(result.withCredentials).toBeUndefined();
    });

    it('returns error without retry for refreshed custom sessions', async () => {
      const refreshFn = vi.fn().mockResolvedValue({ kind: 'custom' } satisfies AuthSession);
      const provider: AuthProvider = {
        getSession: vi.fn().mockResolvedValue({ kind: 'custom' } satisfies AuthSession),
        checkAuth: vi.fn().mockResolvedValue({ authenticated: true }),
        logout: vi.fn().mockResolvedValue({ type: 'none' }),
        refresh: refreshFn,
      };
      const plugin = capturePlugin(provider);

      const errCtx = {
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      };

      const result = await plugin.onError?.(errCtx);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(errCtx.retry).not.toHaveBeenCalled();
      expect(result).toBe(errCtx.error);
    });
  });

  // -------------------------------------------------------------------------
  // 14a. Shared refresh must not bind to any single request's AbortSignal
  // -------------------------------------------------------------------------
  describe('shared refresh signal isolation', () => {
    it('does not pass first caller AbortSignal to provider.refresh (shared promise safety)', async () => {
      const refreshFn = vi
        .fn()
        .mockResolvedValue({ kind: 'bearer', token: 'new-tok' } satisfies AuthSession);
      const plugin = capturePlugin(makeBearerProvider('old-tok', refreshFn));

      const firstController = new AbortController();
      const errCtx = {
        error: new Error('HTTP 401'),
        request: { ...makeReqCtx('/api'), signal: firstController.signal },
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn().mockResolvedValue({ status: 200, headers: {}, data: {} }),
      };

      await plugin.onError?.(errCtx);

      // Regression: shared refresh must not inherit the first caller's signal,
      // otherwise aborting one waiter cancels refresh for all.
      expect(refreshFn).toHaveBeenCalledWith();
      expect(refreshFn.mock.calls[0]?.[0]).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 14. Refresh rejection safety (concurrent waiters)
  // -------------------------------------------------------------------------
  describe('refresh rejection safety', () => {
    it('returns error for all concurrent waiters when refresh rejects', async () => {
      const refreshFn = vi.fn().mockRejectedValue(new Error('refresh failed'));
      const plugin = capturePlugin(makeBearerProvider('tok', refreshFn));

      const makeErrCtx = () => ({
        error: new Error('HTTP 401'),
        request: makeReqCtx('/api'),
        response: { status: 401, headers: {}, data: null },
        retryCount: 0,
        retry: vi.fn(),
      });

      const ctx1 = makeErrCtx();
      const ctx2 = makeErrCtx();

      const [result1, result2] = await Promise.all([
        plugin.onError?.(ctx1),
        plugin.onError?.(ctx2),
      ]);

      expect(result1).toBe(ctx1.error);
      expect(result2).toBe(ctx2.error);
      expect(ctx1.retry).not.toHaveBeenCalled();
      expect(ctx2.retry).not.toHaveBeenCalled();
      // Single refresh call (deduped)
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });
  });
});
