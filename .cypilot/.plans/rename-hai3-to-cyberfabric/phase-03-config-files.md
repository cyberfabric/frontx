# Phase 3: Config Files — eslint, dependency-cruiser, tsconfig, tsup, vite, tailwind

## What
Update all configuration files that reference `@hai3/` packages or `hai3` identifiers.

## Scope
- `.dependency-cruiser.cjs` (root + `internal/depcruise-config/`)
- `eslint.config.*` (root + template-sources — but template-sources in Phase 5)
- `tsup.config.ts` in each package
- `vite.config.ts` (root + monorepo dev scripts + MFE packages)
- `tailwind.config.ts` (content paths referencing `@hai3/`)
- `knip.json` (ignoreDependencies referencing `@hai3/`)
- `tsconfig.json` (root + all packages) — path mappings like `"@hai3/state": [...]`
- `.gitignore` — comment `# HAI3 migration tracker` and `.hai3/` exclusion entry
- `internal/eslint-config/src/*.ts` — ESLint rule source files referencing `@hai3/`
- `internal/depcruise-config/*.cjs` — dependency-cruiser rule files

## Rules
- `@hai3/` → `@cyberfabric/` in all config string references
- `hai3` → `frontx` in config comments and identifiers where appropriate
- **DO NOT** change GTS-related config values
- Preserve all config logic — only rename string references

## Task
1. Find all config files with hai3 references:
   ```bash
   grep -rn "hai3" --include="*.cjs" --include="*.mjs" --include="*.yaml" --include="*.yml" --include="*.json" \
     --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=templates --exclude-dir=template-sources . \
     | grep -v "package.json" | grep -v "package-lock.json"
   ```
2. Check tsup.config.ts files: `grep -rn "hai3" packages/*/tsup.config.ts`
3. Check tsconfig.json files: `grep -rn "hai3" **/tsconfig.json`
4. Apply `@hai3/` → `@cyberfabric/` in all matched files
5. For tailwind.config.ts: update content scan paths `./node_modules/@hai3/` → `./node_modules/@cyberfabric/`
6. For dependency-cruiser configs: update forbidden dependency rules referencing @hai3
7. For tsconfig.json: update all path mappings `"@hai3/*"` → `"@cyberfabric/*"`
8. For knip.json: update `ignoreDependencies` entries
9. For .gitignore: update `# HAI3` comments → `# FrontX`, `.hai3/` → `.frontx/`
10. For internal/eslint-config/src/*.ts: update `@hai3/` in rule definitions
11. For internal/depcruise-config/*.cjs: update `@hai3/` in rule definitions

## Acceptance Criteria
- [ ] Zero `@hai3/` in config files (excluding node_modules/dist/template-sources)
- [ ] Tailwind content paths scan @cyberfabric packages
- [ ] Dependency-cruiser rules reference @cyberfabric
- [ ] All tsconfig.json path mappings use @cyberfabric
- [ ] knip.json references @cyberfabric
- [ ] .gitignore comments updated
