---
status: accepted
date: 2026-04-09
---

# Server-Side Proxy for AI Backend Credential Handling


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Direct client-side API call with credentials in environment variables](#direct-client-side-api-call-with-credentials-in-environment-variables)
  - [User-supplied API key stored in browser localStorage](#user-supplied-api-key-stored-in-browser-localstorage)
  - [Local server-side proxy with credentials in server environment only](#local-server-side-proxy-with-credentials-in-server-environment-only)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-frontx-adr-server-side-ai-backend-proxy`

## Context and Problem Statement

The Builder must send prompts and project context to an external AI Backend (Anthropic Claude). A choice must be made about where API credentials are stored and from where requests originate. The credential security requirement (`cpt-frontx-fr-studio-builder-credentials`) states that credentials must never be present in browser network traffic or browser storage. Builder is a development-only feature; a local dev server is already running.

## Decision Drivers

* `cpt-frontx-fr-studio-builder-credentials` — AI Backend credentials must not be exposed to end users or accessible in client-side code at any point
* Builder operates exclusively in development (`import.meta.env.DEV`); a companion server process alongside the Vite dev server is an acceptable constraint in that context
* Vite's dev server supports custom middleware and proxy configuration, making a server-side endpoint a natural extension of the existing dev toolchain

## Considered Options

* Direct client-side API call with credentials in environment variables
* User-supplied API key stored in browser localStorage
* Local server-side proxy with credentials in server environment only

## Decision Outcome

Chosen option: "Local server-side proxy with credentials in server environment only", because it is the only option that satisfies `cpt-frontx-fr-studio-builder-credentials`. Credentials never leave the server process; the browser never sees the key in network requests, responses, or storage. A companion dev server endpoint is an accepted cost in a development-only context where a Vite dev server is already running.

### Consequences

* Good, because credentials exist only in server environment variables and are never transmitted to or stored in the browser
* Good, because the proxy is the natural place to enforce the 30-second timeout and auto-correction logic before returning a response to the client
* Bad, because the Builder requires a companion server process in addition to the Vite dev server; developers must start both
* Bad, because the proxy introduces a network hop between the browser and the AI Backend compared to a direct client call

### Confirmation

A local server-side endpoint (e.g., Vite plugin custom middleware or a lightweight Express companion) handles all AI Backend requests. Credentials are read from server-side environment variables. Browser network traffic contains only the prompt and conversation history — no API keys appear in request headers, response bodies, or browser storage.

## Pros and Cons of the Options

### Direct client-side API call with credentials in environment variables

* Good, because simplest implementation — no server process required
* Bad, because Vite exposes `VITE_`-prefixed environment variables to the browser bundle; any credential stored this way is visible in the compiled JavaScript and in browser DevTools network requests
* Bad, because violates `cpt-frontx-fr-studio-builder-credentials`

### User-supplied API key stored in browser localStorage

* Good, because each developer uses their own credentials; no shared key to protect
* Bad, because any key in `localStorage` is accessible to any JavaScript running on the page, including AI-generated code in the preview context
* Bad, because still violates `cpt-frontx-fr-studio-builder-credentials` — the key is present in browser storage

### Local server-side proxy with credentials in server environment only

* Good, because credentials exist only in the server process environment; they are never part of browser network traffic or storage
* Good, because the proxy can enforce timeouts, validation, and auto-correction in one place
* Bad, because developers must run an additional process; project setup instructions must document the companion server

## More Information

The companion server runs only when `NODE_ENV=development`. Production builds of `@hai3/studio` contain no Builder code (tree-shaken by `import.meta.env.DEV` guard), so the proxy is irrelevant in production.

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:

* `cpt-frontx-fr-studio-builder-credentials` — credential security requirement for the AI Backend
* `cpt-frontx-fr-studio-builder-codegen` — AI code generation flow routed through the proxy
* `cpt-frontx-component-studio` — Studio package boundary; proxy is a dev-only companion to Studio
