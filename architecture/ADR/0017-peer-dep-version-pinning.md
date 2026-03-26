---
status: proposed
date: 2026-03-18
---

# Pin Internal Peer Dependency Versions at Publish Time


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Migrate to pnpm with `workspace:*` protocol](#migrate-to-pnpm-with-workspace-protocol)
  - [CI script: pin exact version in peer deps at publish time](#ci-script-pin-exact-version-in-peer-deps-at-publish-time)
  - [Installation documentation](#installation-documentation)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-hai3-adr-peer-dep-version-pinning`
## Context and Problem Statement

All `@hai3/*` packages declare internal peer dependencies with the wildcard range `"*"` (e.g., `@hai3/react` declares `"@hai3/framework": "*"`). When a consumer installs a package from the alpha dist-tag (`npm install @hai3/react@alpha`), npm v7+ auto-installs peer dependencies by resolving `"*"` against the `latest` dist-tag. Because `latest` points to the previous stable release (e.g., `0.3.x`) while the alpha package is at `0.4.0-alpha.0`, the consumer ends up with an incompatible combination of package versions. There is no way to obtain a working alpha installation without manually installing every `@hai3/*` package individually with `@alpha`.

## Decision Drivers

* Installing from any dist-tag (alpha, beta, next) must produce a fully compatible package set without manual intervention
* The fix must be zero-maintenance — not custom code that must be updated with every version bump
* The solution should also eliminate phantom dependency risks from npm's non-strict hoisting
* Migration complexity must be justified by the benefits gained beyond just fixing the peer dep problem

## Considered Options

* **Migrate to pnpm with `workspace:*` protocol**
* **CI script: pin exact version in peer deps at publish time**
* **Installation documentation**

## Decision Outcome

Chosen option: **"Migrate to pnpm with `workspace:*` protocol"**, because it solves the peer dep resolution problem natively — `pnpm publish` automatically replaces `workspace:*` with the exact version of each package at publish time, requiring zero custom maintenance code. The migration also brings additional structural benefits: strict dependency hoisting eliminates phantom dependency access, the content-addressable store reduces disk usage and speeds up CI installs, and `workspace:*` in source code makes the inter-package coupling explicit and machine-verified.

### Consequences

* Good, because alpha and other pre-release channel installs produce a compatible package set without any consumer workflow change
* Good, because `workspace:*` resolution is maintained by pnpm — no custom CI scripts to update
* Good, because strict hoisting prevents accidental reliance on undeclared transitive dependencies
* Good, because content-addressable store reduces disk usage and speeds up CI across branches
* Bad, because migration requires updating ~70 locations: CI workflow files, root `package.json` scripts, `.husky/pre-commit`, and CLI template sources
* Bad, because pnpm's stricter hoisting may surface previously hidden phantom dependency issues that must be resolved during migration

### Confirmation

Confirmed when: (1) `pnpm-lock.yaml` replaces `package-lock.json` and all CI workflows use `pnpm install`; (2) `pnpm publish` on any `@hai3/*` package produces a registry `package.json` where internal `peerDependencies` contain the exact version string instead of `"*"`; (3) `npm install @hai3/react@alpha` installs the matching alpha version of all internal peer dependencies automatically.

## Pros and Cons of the Options

### Migrate to pnpm with `workspace:*` protocol

In source: `"@hai3/framework": "workspace:*"`. At publish time pnpm replaces it with `"@hai3/framework": "0.4.0-alpha.0"`. Consumer npm/pnpm resolves the exact version directly without any dist-tag lookup.

* Good, because version pinning is native to the package manager — zero custom code
* Good, because `workspace:*` in source is explicit and self-documenting
* Good, because pnpm's strict hoisting and content-addressable store are additional structural improvements
* Neutral, because the migration is systematic but requires coordinated changes across CI, scripts, and config
* Bad, because migration scope is ~70 changes with moderate coordination effort

### CI script: pin exact version in peer deps at publish time

A pre-publish Node.js script in `.github/workflows/publish-packages.yml` replaces `"*"` with the package's own version in internal `peerDependencies` before `npm publish`. Produces the same published result as option 1.

* Good, because it is a narrow, targeted fix (~15 lines in one CI file)
* Bad, because the script is custom code that must be maintained alongside the pipeline
* Bad, because `"*"` remains in source files, misleading developers who inspect `package.json` locally
* Bad, because it does not deliver any of the structural benefits pnpm migration provides

### Installation documentation

Document that consumers installing from alpha must run: `npm install @hai3/react@alpha @hai3/framework@alpha @hai3/state@alpha ...`

* Good, because zero code changes required
* Bad, because poor developer experience — every alpha consumer must know and maintain the full package list
* Bad, because fragile — any new package added to the stack silently breaks the documented command

## More Information

- Related: `.github/workflows/publish-packages.yml` — CI workflow to be migrated
- Related ADR: `cpt-hai3-adr-automated-layer-ordered-publishing` — the publishing strategy this decision extends
- pnpm workspace protocol: https://pnpm.io/workspaces#workspace-protocol-workspace

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses the following requirements or design elements:

* `cpt-hai3-fr-pub-ci` — CI workflow migrates from npm to pnpm; `pnpm install` and `pnpm publish` replace npm equivalents
* `cpt-hai3-fr-pub-metadata` — `workspace:*` becomes the canonical peer dependency declaration in source; exact version is resolved at publish time
* `cpt-hai3-adr-automated-layer-ordered-publishing` — this decision extends the publishing strategy by fixing cross-channel peer dependency resolution
