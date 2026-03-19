---
status: accepted
date: 2026-03-19
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
  - [CI script: replace `"*"` with exact version in peer deps at publish time](#ci-script-replace-with-exact-version-in-peer-deps-at-publish-time)
  - [Migrate to pnpm with `workspace:*` protocol](#migrate-to-pnpm-with-workspace-protocol)
  - [Installation documentation](#installation-documentation)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-hai3-adr-peer-dep-version-pinning`
## Context and Problem Statement

When consumers install `@hai3/*` packages from the alpha dist-tag, npm auto-resolves `"*"` peer dependencies using the `latest` dist-tag, which points to the previous stable release. A user running `npm install @hai3/react@alpha` receives `@hai3/react@0.4.0-alpha.0` paired with `@hai3/framework@0.3.x` — an incompatible combination. The root cause is that all internal `@hai3/*` peer dependencies declare `"*"` as their version range, which gives npm no signal that alpha versions must be installed together.

## Decision Drivers

* Installing from the alpha channel must produce a fully compatible package set without manual intervention
* Fix must not require consumers to list every `@hai3/*` package explicitly when installing
* Solution must be reversible if a pnpm migration is done later
* Change complexity must be proportional to the problem — a narrow publishing fix, not an infrastructure overhaul

## Considered Options

* CI script: replace `"*"` with exact version in peer deps at publish time
* Migrate to pnpm with `workspace:*` protocol
* Installation documentation

## Decision Outcome

Chosen option: "CI script: replace `\"*\"` with exact version in peer deps at publish time", because it directly solves the incompatible resolution with a single pre-publish step in the existing CI workflow, requires no package manager migration, and produces the same published artefact as the pnpm `workspace:*` approach. If pnpm migration happens later, `workspace:*` replaces this script automatically with no behavioural change to consumers.

### Consequences

* Good, because alpha channel installs produce a compatible package set without any change to consumer workflow
* Good, because the fix is scoped to one CI file — low blast radius and easy to revert
* Good, because the same mechanism applies uniformly to all pre-release channels (alpha, beta, rc) and to stable releases
* Bad, because the script is custom code that duplicates what pnpm's `workspace:*` does natively; it requires maintenance if new internal peer deps are added
* Bad, because source `package.json` files continue to show `"*"`, which does not reflect the actual published constraint and can mislead developers reading the file locally

### Confirmation

Confirmed when `npm install @hai3/react@alpha` automatically installs `@hai3/framework` at the matching alpha version rather than the latest stable. Verified by inspecting the published `package.json` on the NPM registry — `peerDependencies["@hai3/framework"]` must equal the package's own version string (e.g., `"0.4.0-alpha.0"`).

## Pros and Cons of the Options

### CI script: replace `"*"` with exact version in peer deps at publish time

A Node.js one-liner in `.github/workflows/publish-packages.yml` runs inside each package directory before `npm publish`. It reads `package.json`, replaces `"*"` with the package's own version for all internal `@hai3/*` peer dependencies, and writes the file back. The change is local to the CI runner — source files are never modified.

* Good, because it is narrow, reversible, and requires no tooling changes
* Good, because the published artefact has an exact peer dep range, guiding both npm auto-install and manual installers
* Neutral, because the source `package.json` still shows `"*"` — consistent with how `workspace:*` works in pnpm (source vs. published differ by design)
* Bad, because it is custom logic that must be updated if the set of internal packages changes

### Migrate to pnpm with `workspace:*` protocol

Replace npm workspaces with pnpm. Declare internal peer deps as `"workspace:*"`. At `pnpm publish`, pnpm automatically replaces `workspace:*` with the exact version — the industry-standard solution for monorepos.

* Good, because `workspace:*` is a first-class language feature, not custom code
* Good, because it brings additional benefits: faster installs, strict dependency isolation, disk-space deduplication
* Bad, because migration requires ~70 changes across 10+ files (scripts, CI workflows, templates, lock files) and carries moderate risk

### Installation documentation

Document that users installing alpha packages must explicitly specify every peer dependency with the `@alpha` tag: `npm install @hai3/react@alpha @hai3/framework@alpha @hai3/state@alpha ...`.

* Good, because no code change is required
* Bad, because it shifts the burden to consumers and is brittle — the list of packages must be maintained separately
* Bad, because it is not a real fix; consumers who miss the documentation will still get a broken install

## More Information

- Related ADR: `cpt-hai3-adr-automated-layer-ordered-publishing` — the CI publishing workflow this decision extends
- Workflow: `.github/workflows/publish-packages.yml`

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:

* `cpt-hai3-fr-pub-ci` — the CI publish workflow is where the fix is implemented
* `cpt-hai3-fr-pub-metadata` — peer dependency declarations are part of the package metadata contract
