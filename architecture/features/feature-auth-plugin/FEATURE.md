# Feature: Auth Plugin

<!-- artifact-version: 1.0 -->

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Session Header Attach](#session-header-attach)
  - [Refresh and Retry on Unauthorized](#refresh-and-retry-on-unauthorized)
  - [Transport Lifecycle Binding](#transport-lifecycle-binding)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Transport Request Conversion](#transport-request-conversion)
  - [Credential Scope Resolution](#credential-scope-resolution)
  - [Shared Refresh Promise Deduplication](#shared-refresh-promise-deduplication)
- [4. States (CDSL)](#4-states-cdsl)
  - [In-Flight Refresh State](#in-flight-refresh-state)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Auth Plugin Implementation](#auth-plugin-implementation)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

- [x] `p1` - **ID**: `cpt-frontx-featstatus-auth-plugin`

---

## 1. Feature Context

### 1.1 Overview

The Auth Plugin wires a headless `AuthProvider` from `@cyberfabric/auth` into the `@cyberfabric/api` REST transport layer and exposes an `app.auth` runtime surface on the `HAI3App` instance. It attaches session credentials to outgoing requests, intercepts 401 responses to trigger token refresh, and deduplicates concurrent refresh calls. Scope is REST-only; SSE auth is out-of-scope for the default binding.

### 1.2 Purpose

Enable applications to integrate authentication transparently into the HTTP transport without coupling service code to auth concerns. The plugin manages session header injection, refresh-retry lifecycle, and binding teardown as a first-class HAI3 plugin.

### 1.3 Actors

- `cpt-frontx-actor-host-app`
- `cpt-frontx-actor-runtime`
- `cpt-frontx-actor-framework-plugin`

### 1.4 References

- Overall Design: [DESIGN.md](../../DESIGN.md)
- Auth SDK: `@cyberfabric/auth`
- API SDK: `@cyberfabric/api` (RestPlugin, RestProtocol)

---

## 2. Actor Flows (CDSL)

### Session Header Attach

- [x] `p1` - **ID**: `cpt-frontx-flow-auth-plugin-session-attach`

**Actors**: `cpt-frontx-actor-runtime`, `cpt-frontx-actor-framework-plugin`

1. [ ] `p1` - `AuthRestPlugin.onRequest` is invoked for every outgoing REST request - `inst-session-fetch`
2. [ ] `p1` - Call `provider.getSession({ signal: ctx.signal })` to fetch the current session - `inst-session-fetch`
3. [ ] `p1` - **IF** session is null **RETURN** ctx unchanged - `inst-no-session`
4. [ ] `p1` - **IF** `session.kind === 'cookie'`: call `shouldIncludeCredentials` to scope the domain; set `withCredentials: true`; **IF** csrfHeaderName and csrfToken present: inject CSRF header - `inst-cookie-credentials`
5. [ ] `p1` - **IF** `session.kind === 'bearer'` and token present: inject `Authorization: Bearer <token>` header - `inst-bearer-header`
6. [ ] `p1` - **IF** `session.kind` is neither cookie nor bearer: return ctx unchanged (custom session passthrough) - `inst-custom-passthrough`

### Refresh and Retry on Unauthorized

- [x] `p1` - **ID**: `cpt-frontx-flow-auth-plugin-refresh-retry`

**Actors**: `cpt-frontx-actor-runtime`, `cpt-frontx-actor-framework-plugin`

1. [ ] `p1` - `AuthRestPlugin.onError` is invoked on request error - `inst-error-notify`
2. [ ] `p1` - Notify provider via `provider.onTransportError?.(...)` regardless of status - `inst-error-notify`
3. [ ] `p1` - **IF** response status is not 401 OR retry count is not 0 OR provider has no refresh **RETURN** original error - `inst-no-retry-guard`
4. [ ] `p1` - Deduplicate concurrent 401 refresh via shared promise - `inst-refresh-dedup`
5. [ ] `p1` - Await the shared refresh promise - `inst-refresh-await`
6. [ ] `p1` - **IF** `refreshed.kind === 'bearer'`: retry with updated Authorization header - `inst-retry-bearer`
7. [ ] `p1` - **IF** `refreshed.kind === 'cookie'`: retry without header override (withCredentials) - `inst-retry-cookie`
8. [ ] `p1` - **IF** custom kind: return original error (no standard retry mechanism) - `inst-retry-custom`

### Transport Lifecycle Binding

- [x] `p1` - **ID**: `cpt-frontx-flow-auth-plugin-transport-binding`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-runtime`

1. [ ] `p1` - `auth(config)` plugin factory is called; selects transport (custom or default `hai3ApiTransport()`) - `inst-plugin-factory`
2. [ ] `p1` - `provides.app.auth` object is assembled delegating all AuthProvider methods - `inst-provides`
3. [ ] `p1` - `onInit(app)` binds the transport binder; adds the `AuthRestPlugin` to the API registry - `inst-on-init`
4. [ ] `p1` - `onDestroy(_app)` removes the REST plugin, calls `provider.destroy?.()` if present, and nulls the binding - `inst-on-destroy`

---

## 3. Processes / Business Logic (CDSL)

### Transport Request Conversion

- [x] `p1` - **ID**: `cpt-frontx-algo-auth-plugin-transport-request`

1. [ ] `p1` - Guard: **IF** method is not one of GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS **RETURN** null - `inst-method-guard`
2. [ ] `p1` - Serialize body: if string pass through; if object JSON.stringify; if neither leave undefined - `inst-body-serialize`
3. [ ] `p1` - **RETURN** `{ url, method, headers, body, signal }` shaped as `AuthTransportRequest` - `inst-request-shape`

### Credential Scope Resolution

- [x] `p1` - **ID**: `cpt-frontx-algo-auth-plugin-credentials-scope`

1. [ ] `p1` - **IF** URL is relative (starts with `/` not `//`) **RETURN** true - `inst-relative-url`
2. [ ] `p1` - Parse URL origin; **IF** parsing fails **RETURN** false - `inst-get-origin`
3. [ ] `p1` - Compare to `getRuntimeOrigin()` (globalThis.location.origin); **IF** match **RETURN** true - `inst-runtime-origin`
4. [ ] `p1` - Check `allowedOrigins` list; **RETURN** true if included, false otherwise - `inst-scope-check`

### Shared Refresh Promise Deduplication

- [x] `p1` - **ID**: `cpt-frontx-algo-auth-plugin-refresh-dedup`

1. [ ] `p1` - **IF** `this.refreshPromise` is null: call `provider.refresh()` and store the promise with a `.finally()` that nulls `refreshPromise` - `inst-refresh-dedup`
2. [ ] `p1` - **AWAIT** `this.refreshPromise`; **IF** throws **RETURN** original error - `inst-refresh-await`
3. [ ] `p1` - The shared promise is NOT bound to any request AbortSignal — cancelling one caller must not cancel the shared refresh - `inst-refresh-signal-note`

---

## 4. States (CDSL)

### In-Flight Refresh State

- [x] `p1` - **ID**: `cpt-frontx-state-auth-plugin-refresh`

Tracked as `AuthRestPlugin.refreshPromise: Promise<AuthSession | null> | null`.

1. [ ] `p1` - **FROM** `null` **TO** `Promise` **WHEN** first 401 triggers `provider.refresh()` — subsequent concurrent 401s await the same promise - `inst-refresh-start`
2. [ ] `p1` - **FROM** `Promise` **TO** `null` **WHEN** `provider.refresh()` settles (resolve or reject) via `.finally()` cleanup - `inst-refresh-settle`

---

## 5. Definitions of Done

### Auth Plugin Implementation

- [x] `p1` - **ID**: `cpt-frontx-dod-auth-plugin`

`auth(config)` is a valid `HAI3Plugin` that when composed with `createHAI3()` exposes `app.auth` with all `AuthProvider` methods delegated. Session credentials are injected into REST requests transparently. 401 responses trigger a single shared refresh; concurrent 401s await the same promise. Transport is removed on `app.destroy()`.

**Implements**:
- `cpt-frontx-flow-auth-plugin-session-attach`
- `cpt-frontx-flow-auth-plugin-refresh-retry`
- `cpt-frontx-flow-auth-plugin-transport-binding`
- `cpt-frontx-algo-auth-plugin-transport-request`
- `cpt-frontx-algo-auth-plugin-credentials-scope`
- `cpt-frontx-algo-auth-plugin-refresh-dedup`
- `cpt-frontx-state-auth-plugin-refresh`

---

## 6. Acceptance Criteria

- [x] Bearer session injects `Authorization: Bearer <token>` header on every request
- [x] Cookie session with CSRF token injects the CSRF header and sets `withCredentials: true`
- [x] Cookie session without configured CSRF header name sets `withCredentials: true` only
- [x] Request to an origin not in `allowedCookieOrigins` and not the runtime origin skips credential injection for cookie sessions
- [x] 401 with retry count 0 triggers refresh; a second concurrent 401 awaits the same promise
- [x] Bearer refresh result retries with updated Authorization header
- [x] Cookie refresh result retries without header override
- [x] `provider.onTransportError` is called for every transport error regardless of status
- [x] `onDestroy` removes the REST plugin from the API registry and calls `provider.destroy()` if defined
- [x] Custom session kind passes through without modification on request and returns error on 401 retry
