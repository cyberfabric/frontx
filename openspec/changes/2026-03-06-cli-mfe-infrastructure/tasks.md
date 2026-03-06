## 1. CLI Template Pipeline

- [x] 1.1 Add `src/app/mfe` to `packages/cli/template-sources/manifest.yaml` directories list.
- [x] 1.2 Add `packages/cli/template-sources/project/src/app/mfe/registry.ts` — MFE registry with enabled/port fields.
- [x] 1.3 Add `packages/cli/template-sources/project/src/app/mfe/bootstrap.ts` — dynamic multi-MFE bootstrap with empty-registry guard.
- [x] 1.4 Add `packages/cli/template-sources/project/src/app/mfe/generated-mfe-manifests.ts` — typed empty stub.
- [x] 1.5 Add `packages/cli/template-sources/project/scripts/dev-all.ts` — reads registry, spawns MFE servers + main app via concurrently.
- [x] 1.6 Add `packages/cli/template-sources/project/scripts/generate-mfe-manifests.ts` — scans `src/mfe_packages/*/mfe.json`, writes typed imports.
- [x] 1.7 Add `packages/cli/template-sources/mfe-package/package.json` and `vite.config.ts` — template for `hai3 add-mfe`.

## 2. Project Generator

- [x] 2.1 Update `packages/cli/src/generators/project.ts`: add `generate:mfe-manifests` and `dev:all` scripts to generated `package.json`; prepend `npm run generate:mfe-manifests &&` to `dev`, `build`, `type-check`.
- [x] 2.2 Remove dead screensets copy loop from `project.ts` (referenced non-existent `src/screensets/` directories).
- [x] 2.3 Remove stale template overrides from `packages/cli/scripts/copy-templates.ts`.

## 3. Terminology Fix

- [x] 3.1 Update `packages/cli/src/commands/create/index.ts`: replace `hai3 screenset create` with `hai3 add-mfe` in post-create message; fix log text.
- [x] 3.2 Update all 4 App.tsx variants in `template-sources/project/src/app/`: replace `hai3 screenset create` with `hai3 add-mfe`.

## 4. Monorepo App Update

- [x] 4.1 Add `src/app/mfe/registry.ts` with demo-mfe entry.
- [x] 4.2 Update `src/app/mfe/generated-mfe-manifests.ts` to typed stub (no `any`).
- [x] 4.3 Update `src/app/mfe/bootstrap.ts` to dynamic pattern (reads from registry + generated manifests).
- [x] 4.4 Add `scripts/dev-all.ts` and `scripts/generate-mfe-manifests.ts` to monorepo root.
- [x] 4.5 Update `package.json`: add `generate:mfe-manifests`, `dev:all`; prepend `generate:mfe-manifests` to `dev`, `build`, `type-check`.

## 5. Documentation

- [x] 5.1 Add `.ai/GUIDELINES.hai3-mfe-setup.md`.
- [x] 5.2 Add `.ai/commands/user/hai3-new-mfe.md`.
- [x] 5.3 Add `.ai/commands/user/hai3-dev-all.md`.
- [x] 5.4 Add `.ai/commands/user/hai3-add-mfe-to-registry.md`.
- [x] 5.5 Remove all `user-dashboard-mfe` references from documentation.

## 6. Verification

- [x] 6.1 Run `npm run build --workspace=@hai3/cli` — CLI builds without errors.
- [x] 6.2 Run `npm run arch:check` — architecture validation passes.
- [x] 6.3 Verify `hai3 create` generates project with `src/app/mfe/` directory and MFE scripts.
