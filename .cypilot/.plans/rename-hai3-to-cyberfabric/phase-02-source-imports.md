# Phase 2: Source Code Imports — Bulk @hai3/ to @cyberfabric/

## What
Replace all `@hai3/` import paths with `@cyberfabric/` in TypeScript/JavaScript source files across the monorepo.

## Scope
- All `.ts`, `.tsx`, `.js`, `.mjs` files in `packages/*/src/`
- All `.ts`, `.tsx` files in `src/` (monorepo app source)
- All `.ts`, `.js`, `.mjs` files in `scripts/`
- All `.ts`, `.tsx`, `.js`, `.mjs` files in `src/mfe_packages/`
- All `.mjs` files in `packages/cli/scripts/` (E2E test scripts: `e2e-*.mjs`)
- **EXCLUDE**: `node_modules/`, `dist/`, `templates/`, `template-sources/` (handled in Phase 5)
- **EXCLUDE**: GTS schema directories (`hai3.screensets/`, `hai3.mfes/`) — protocol identifiers stay as-is

## Rules
- `from '@hai3/` → `from '@cyberfabric/`
- `from "@hai3/` → `from "@cyberfabric/`
- `import('@hai3/` → `import('@cyberfabric/`
- `require('@hai3/` → `require('@cyberfabric/`
- String literals referencing packages: `'@hai3/` → `'@cyberfabric/` (e.g., in eslint rules, error messages)
- **DO NOT** rename: class names, function names, variable names, type names (HAI3Provider, createHAI3, etc.)
- **DO NOT** rename: GTS type identifiers (gts.hai3.mfes.*, hai3.screensets.*, hai3.mfes.*)
- **DO NOT** touch files in `packages/cli/template-sources/` (Phase 4)

## Task
1. Run bulk sed replacement across all source files (including .mjs):
   ```bash
   find packages/*/src packages/cli/scripts src scripts src/mfe_packages -type f \
     \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" \) \
     -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/templates/*" -not -path "*/template-sources/*" \
     -exec sed -i '' "s/@hai3\//@cyberfabric\//g" {} +
   ```
2. Rename file: `src/mfe_packages/shared/vite-plugin-hai3-externalize.ts` → `vite-plugin-frontx-externalize.ts`
3. Update all imports of the renamed file across MFE vite configs
4. Verify GTS identifiers were NOT changed: `grep -rn "gts\.cyberfabric\." packages/` should return 0 results
5. Count remaining `@hai3/` in source: should be zero outside template-sources
6. Write count of changed files to `out/phase-02-import-count.md`

## Acceptance Criteria
- [ ] Zero `@hai3/` import paths in source files (excluding template-sources, node_modules, dist)
- [ ] `vite-plugin-hai3-externalize.ts` renamed to `vite-plugin-frontx-externalize.ts`
- [ ] All imports of the vite plugin updated
- [ ] GTS protocol identifiers unchanged (gts.hai3.*, hai3.screensets.*, hai3.mfes.*)
- [ ] TypeScript compilation not broken by import renames (verified in Phase 9)
