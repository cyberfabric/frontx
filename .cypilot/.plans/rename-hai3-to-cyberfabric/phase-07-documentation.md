# Phase 7: Documentation — CLAUDE.md, llms.txt, Architecture, README, CONTRIBUTING, i18n

## What
Update all documentation files, i18n translation strings, and create CONTRIBUTING.md with new versioning, branching, and publishing flow.

## Scope

### Package documentation
- `packages/*/CLAUDE.md` (7 files) — update `@hai3/` → `@cyberfabric/`, `HAI3` → `FrontX` in descriptions
- `packages/*/llms.txt` (5 files) — same
- `packages/docs/` — rename `src/hai3/` directory to `src/frontx/`, update all references

### i18n translation files
- `packages/studio/src/i18n/*.json` — update "HAI3" product name → "FrontX" in UI strings
- Any other `packages/*/src/i18n/*.json` with "HAI3" product name references

### Architecture documentation
- `architecture/PRD.md`
- `architecture/DESIGN.md`
- `architecture/DECOMPOSITION.md`
- `architecture/ADR/*.md` (15+ files)
- `architecture/features/*/FEATURE.md` (11 files)
- `architecture/explorations/*.md`
- Replace `@hai3/` → `@cyberfabric/` in code examples
- Replace `HAI3` → `FrontX` in product name references
- **DO NOT** change GTS identifiers or architectural decision content substance

### Root documentation
- `README.md` — full update: product name, install instructions, package list
- `QUICK_START.md` — update install commands and package names

### New: CONTRIBUTING.md
Create comprehensive CONTRIBUTING.md covering:

#### Branching Model (Gitflow)
- `main` — stable releases, publishes to `latest` npm dist-tag
- `develop` — active development, publishes to `alpha` npm dist-tag
- `release/*` — release preparation branches (from develop → main)
- `feature/*` — feature branches (from develop)
- `hotfix/*` — hotfix branches (from main)

#### Versioning (0.x Semver + Alpha Tags)
- Project is pre-1.0: backward compatibility not guaranteed
- `0.y.z` on main (latest channel)
- `0.y.z-alpha.N` on develop (alpha channel)
- Minor bump (0.1 → 0.2) = may contain breaking changes
- Patch bump (0.1.0 → 0.1.1) = non-breaking fixes/features
- Alpha increment (alpha.0 → alpha.1) = each merge to develop

#### Publishing
- **Alpha (automatic)**: merges to `develop` → CI detects version changes → publishes with `--tag alpha`
- **Latest (via release branch)**: `release/*` from develop → version bump to `0.y.z` → merge to `main` → CI publishes with `--tag latest`
- Packages published in dependency order (L1 SDK → L2 framework → L3 react → L4 studio/cli)
- Independent versioning within a single major version

#### Package Scope
- npm scope: `@cyberfabric/*`
- CLI binary: `frontx`

## Task
1. Bulk replace `@hai3/` → `@cyberfabric/` in all docs
2. Replace `HAI3` → `FrontX` in product name contexts (not GTS identifiers)
3. Rename `packages/docs/src/hai3/` → `packages/docs/src/frontx/`
4. Update README.md with new package names and install instructions
5. Create CONTRIBUTING.md with the content above
6. Verify cross-references in architecture docs

## Acceptance Criteria
- [ ] Zero `@hai3/` in documentation (except GTS identifiers)
- [ ] CONTRIBUTING.md exists with gitflow, versioning, and publishing docs
- [ ] README.md references @cyberfabric packages
- [ ] docs/ directory renamed from hai3 to frontx
