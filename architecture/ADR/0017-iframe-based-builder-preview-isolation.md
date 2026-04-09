---
status: accepted
date: 2026-04-09
---

# Iframe-Based Isolation for Builder Preview Panel


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Shadow DOM (same as MFE isolation)](#shadow-dom-same-as-mfe-isolation)
  - [In-process rendering with no isolation boundary](#in-process-rendering-with-no-isolation-boundary)
  - [Sandboxed iframe](#sandboxed-iframe)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-frontx-adr-iframe-based-builder-preview-isolation`

## Context and Problem Statement

The Builder Preview Panel must render AI-generated TypeScript/React component code in a way that does not interfere with the Studio host. HAI3 already uses Shadow DOM containers for MFE extension CSS isolation. A choice must be made for the Builder preview, which has different requirements: the generated code is untrusted, it runs a full Vite dev server, and it must be independently reloadable without remounting Studio.

## Decision Drivers

* Generated code is AI-produced and untrusted — it may contain JavaScript that would conflict with or corrupt Studio's own module registry, event listeners, or Redux store if evaluated in the same browsing context
* Shadow DOM (used for MFEs) provides CSS isolation only; it does not create a separate JavaScript module scope
* The preview must be reloadable in response to file changes without affecting the Studio shell
* The preview must reflect the actual standalone rendering of the generated project, not a component embedded inside a foreign React tree

## Considered Options

* Shadow DOM (same as MFE isolation)
* In-process rendering with no isolation boundary
* Sandboxed iframe

## Decision Outcome

Chosen option: "Sandboxed iframe", because it provides a fully separate browsing context — independent JavaScript module registry, independent React root, and independent lifecycle — that can be reloaded without affecting the Studio host. This is the only option that satisfies both the untrusted-code safety requirement and the independent-reload requirement.

### Consequences

* Good, because generated code executes in a fully isolated context; a crash or error in the preview cannot affect Studio
* Good, because the iframe can reload independently (via `iframe.src` reassignment or HMR signal) without remounting Studio
* Good, because the preview reflects actual standalone rendering, giving non-developer actors an accurate impression of the generated UI
* Bad, because cross-origin communication requires `postMessage`; Studio must explicitly forward theme tokens and language selection to the iframe rather than sharing state directly
* Bad, because an additional browsing context increases memory usage compared to in-process rendering

### Confirmation

Preview Panel renders `<iframe sandbox="allow-scripts allow-same-origin">`. Studio forwards the active theme and language to the iframe via `window.postMessage`. Preview reloads are triggered by reassigning `iframe.src` or by a dev server HMR signal after each successful file write.

## Pros and Cons of the Options

### Shadow DOM (same as MFE isolation)

* Good, because consistent with existing MFE isolation approach; no additional communication overhead
* Bad, because Shadow DOM provides CSS isolation only — AI-generated JavaScript still executes in the same module scope as Studio, risking conflicts with Studio's own module registry, event bus, and Redux store
* Bad, because in-process rendering means a crash in generated code can propagate to Studio

### In-process rendering with no isolation boundary

* Good, because simplest implementation; no communication overhead
* Bad, because AI-generated code is untrusted and runs directly in the Studio host context with full access to its globals, event listeners, and store
* Bad, because style conflicts between generated and Studio CSS are likely

### Sandboxed iframe

* Good, because fully separate browsing context — JS module registry, React root, and event listeners are completely independent
* Good, because independently reloadable; the Studio shell is unaffected when the preview refreshes
* Bad, because theme and language state must be forwarded via `postMessage` rather than shared directly

## More Information

The `allow-scripts allow-same-origin` sandbox flags are the minimum needed for a Vite dev server preview to function. `allow-same-origin` is required because the iframe loads from `localhost`, and same-origin allows `localStorage` access in the preview if the generated project uses it.

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:

* `cpt-frontx-fr-studio-builder-preview` — Preview Panel renders AI-generated UI in an isolated context
* `cpt-frontx-component-studio` — Studio package boundary; Builder preview is a sub-system of Studio
