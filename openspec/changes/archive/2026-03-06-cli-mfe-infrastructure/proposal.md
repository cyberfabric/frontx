## Why

The `hai3 create` CLI command scaffolded projects without MFE infrastructure, requiring developers to manually wire registry, bootstrap, and dev scripts every time a new MFE was added. Additionally, the command referenced non-existent `src/screensets/demo` and `_blank` directories, hardcoded monorepo-specific imports in `bootstrap.ts`, and used outdated `hai3 screenset create` terminology in generated files and post-create messages.

## What Changes

- **Add MFE template infrastructure**: `src/app/mfe/registry.ts`, `src/app/mfe/bootstrap.ts` (dynamic, multi-MFE), `src/app/mfe/generated-mfe-manifests.ts` (auto-generated stub) added to the CLI template pipeline via `manifest.yaml`.
- **Add MFE package template**: `packages/cli/template-sources/mfe-package/` with `package.json` and `vite.config.ts` for `hai3 add-mfe` scaffolding.
- **Add monorepo scripts**: `scripts/dev-all.ts` (reads registry, auto-starts all enabled MFE dev servers via concurrently), `scripts/generate-mfe-manifests.ts` (scans `src/mfe_packages/*/mfe.json`, generates typed import list).
- **Update generated `package.json` scripts**: `dev`, `build`, `type-check` now prepend `generate:mfe-manifests`; add `generate:mfe-manifests` and `dev:all` scripts.
- **Remove dead code**: `screensets` copy loop removed from `project.ts` generator (referenced non-existent `src/screensets/` directories). Stale template overrides removed from `copy-templates.ts`.
- **Fix terminology**: All `hai3 screenset create` references in App.tsx variants and post-create messages replaced with `hai3 add-mfe`.
- **Empty-registry guard**: `bootstrap.ts` returns early with a warning when no MFEs are registered, preventing crash on fresh projects.
- **Add `.ai/` guidelines**: `GUIDELINES.hai3-mfe-setup.md` and user commands for `hai3-new-mfe`, `hai3-dev-all`, `hai3-add-mfe-to-registry` workflows.

## Capabilities

### New Capabilities

- `mfe-scaffold`: Scaffolded projects include MFE infrastructure out of the box (registry, bootstrap, manifests stub, dev scripts).
- `mfe-dev-all`: `npm run dev:all` auto-discovers enabled MFEs from registry and starts all servers via concurrently.
- `mfe-manifest-generation`: `npm run generate:mfe-manifests` scans packages and generates typed import list, avoiding Vite dynamic import warnings.

### Modified Capabilities

- `cli-create`: Generated project structure now includes `src/app/mfe/` directory and MFE-aware scripts.

## Impact

- **@hai3/cli**: `src/generators/project.ts`, `src/commands/create/index.ts`, `src/index.ts`, `scripts/copy-templates.ts`, `template-sources/manifest.yaml`, new `template-sources/mfe-package/`.
- **Monorepo app** (`src/`): `src/app/mfe/registry.ts`, `src/app/mfe/generated-mfe-manifests.ts`, `src/app/mfe/bootstrap.ts` updated to dynamic multi-MFE pattern.
- **MFE opt-in**: Federation plugin (`@originjs/vite-plugin-federation`) and `@globaltypesystem/gts-ts` are NOT added to default scaffold deps — MFE is infrastructure-ready but federation is opt-in.
- **No breaking changes** to existing MFE packages or `@hai3/screensets` API.
