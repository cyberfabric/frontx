// ---------------------------------------------------------------------------
// Core identity & session
// ---------------------------------------------------------------------------

export interface AuthIdentity {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  /** Provider-specific claims */
  attributes?: Record<string, string | number | boolean | null>;
}

export interface AuthSession {
  /**
   * Session mechanism.
   * - bearer: Authorization header
   * - cookie: cookie-session (credentials)
   * - custom: provider-defined
   */
  kind: 'bearer' | 'cookie' | 'custom';
  /**
   * Bearer access token.
   * FORBIDDEN: assume this exists for cookie-session.
   */
  token?: string;
  /** Bearer refresh token (if applicable) */
  refreshToken?: string;
  /** Expiry as Unix ms */
  expiresAt?: number;
  /** CSRF token for cookie-session (if server requires it) */
  csrfToken?: string;
}

// ---------------------------------------------------------------------------
// Context (carries cancellation signal into every provider call)
// ---------------------------------------------------------------------------

export interface AuthContext {
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

export interface AccessQuery<TRecord extends Record<string, string | number | boolean | null> = Record<string, string | number | boolean | null>> {
  action: string;
  resource: string;
  record?: TRecord;
}

export type AccessDecision = 'allow' | 'deny';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface AuthLoginInput {
  /** e.g. 'password' | 'oauth' | 'saml' | 'magic-link' */
  type: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface AuthCallbackInput {
  /** Raw query params or hash fragment from the redirect URI */
  params: Record<string, string>;
  /** CSRF / PKCE state token */
  state?: string;
}

// ---------------------------------------------------------------------------
// Results & transitions
// ---------------------------------------------------------------------------

export interface AuthCheckResult {
  authenticated: boolean;
  session?: AuthSession;
  identity?: AuthIdentity;
}

export type AuthTransitionType = 'redirect' | 'none';

export interface AuthTransition {
  type: AuthTransitionType;
  /** Plain URL / path — no router semantics */
  redirectUrl?: string;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export interface AuthPermissions {
  roles?: string[];
  permissions?: string[];
}

// ---------------------------------------------------------------------------
// Transport adapter (interfaces only — for future @cyberfabric/api binding)
// ---------------------------------------------------------------------------

export interface AuthTransportRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface AuthTransportResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface AuthTransportAdapter {
  request(req: AuthTransportRequest): Promise<AuthTransportResponse>;
}

export interface AuthTransportErrorEvent {
  request: AuthTransportRequest;
  error: Error;
  status?: number;
}

// ---------------------------------------------------------------------------
// Capabilities (optional metadata)
// ---------------------------------------------------------------------------

export interface AuthCapabilities {
  canLogin?: boolean;
  canRefresh?: boolean;
  canLogout?: boolean;
  canCallback?: boolean;
  supportsPermissions?: boolean;
  supportsCanAccess?: boolean;
}

// ---------------------------------------------------------------------------
// State subscription
// ---------------------------------------------------------------------------

export type AuthState = 'authenticated' | 'unauthenticated' | 'loading' | 'error';

export interface AuthStateEvent {
  state: AuthState;
  session?: AuthSession;
  identity?: AuthIdentity;
  error?: Error;
}

export type AuthStateListener = (event: AuthStateEvent) => void;
export type AuthUnsubscribe = () => void;

// ---------------------------------------------------------------------------
// AuthProvider contract
// ---------------------------------------------------------------------------

export interface AuthProvider {
  // --- Required ---
  getSession(ctx?: AuthContext): Promise<AuthSession | null>;
  checkAuth(ctx?: AuthContext): Promise<AuthCheckResult>;
  logout(ctx?: AuthContext): Promise<AuthTransition>;

  // --- Optional lifecycle ---
  login?(input: AuthLoginInput, ctx?: AuthContext): Promise<AuthTransition>;
  handleCallback?(input: AuthCallbackInput, ctx?: AuthContext): Promise<AuthTransition>;
  refresh?(ctx?: AuthContext): Promise<AuthSession | null>;
  destroy?(): void | Promise<void>;

  // --- Optional identity & permissions ---
  getIdentity?(ctx?: AuthContext): Promise<AuthIdentity | null>;
  getPermissions?(ctx?: AuthContext): Promise<AuthPermissions>;
  canAccess?<TRecord extends Record<string, string | number | boolean | null> = Record<string, string | number | boolean | null>>(
    query: AccessQuery<TRecord>,
    ctx?: AuthContext,
  ): Promise<AccessDecision>;

  // --- Optional events ---
  onTransportError?(event: AuthTransportErrorEvent): void;
  subscribe?(listener: AuthStateListener): AuthUnsubscribe;

  // --- Optional metadata ---
  capabilities?: AuthCapabilities;
}
