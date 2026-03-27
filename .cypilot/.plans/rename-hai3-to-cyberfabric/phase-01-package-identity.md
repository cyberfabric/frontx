# Phase 1: Package Identity — package.json Renames and Version Reset

## What
Rename all package names from `@hai3/*` to `@cyberfabric/*`, reset versions to `0.2.0-alpha.0`, update author/URLs/keywords/descriptions in every package.json.

## Scope
- Root `package.json` (name, description, workspace references, dependency references)
- All `packages/*/package.json` (name, version, description, author, repository, bugs, homepage, keywords, peer deps, dev deps)
- All `internal/*/package.json` (name, version, description, keywords)
- `packages/cli/template-sources/mfe-package/package.json`
- `packages/cli/template-sources/project/eslint-plugin-local/package.json`

## Rules
- `@hai3/*` → `@cyberfabric/*` in package names, dependencies, peerDependencies, devDependencies
- `hai3-monorepo` → `frontx-monorepo`
- All publishable package versions → `0.2.0-alpha.0`
- Root monorepo version stays `0.1.0` (private, not published)
- Internal packages (private: true) versions → `0.2.0-alpha.0`
- Author: `HAI3` / `HAI3org` / `HAI3 Team` → `Cyber Fabric`
- Keywords: `hai3` → `frontx`
- Descriptions: `HAI3` → `FrontX` (case-sensitive contexts), `hai3` → `frontx` (lowercase)
- Repository URLs: `github.com/HAI3org/HAI3` → `github.com/cyberfabric/frontx`
- CLI binary name: `hai3` → `frontx`
- **DO NOT** change peerDependency version ranges (keep `*` or whatever exists)

## Task
1. Find all package.json files: `find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/templates/*"`
2. For each file, apply the replacements listed in Rules
3. Verify no `@hai3/` or `"hai3` references remain in any package.json (except inside `node_modules/` and `dist/`)
4. Write the list of changed files to `out/phase-01-package-list.md`

## Acceptance Criteria
- [ ] Zero `@hai3/` references in any package.json (excluding node_modules/dist)
- [ ] All publishable packages at version `0.2.0-alpha.0`
- [ ] CLI binary name is `frontx`
- [ ] All URLs point to `cyberfabric/frontx`
- [ ] Author is `Cyber Fabric` everywhere
