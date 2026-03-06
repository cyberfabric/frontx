# CLI MFE Scaffold Spec

## Requirements

### R1 — MFE infrastructure in scaffold

The `hai3 create` command SHALL include `src/app/mfe/registry.ts`, `src/app/mfe/bootstrap.ts`, and `src/app/mfe/generated-mfe-manifests.ts` in every generated project.

### R2 — MFE scripts in generated package.json

The generated `package.json` SHALL include:
- `"generate:mfe-manifests": "npx tsx scripts/generate-mfe-manifests.ts"`
- `"dev:all": "npm run generate:mfe-manifests && npx tsx scripts/dev-all.ts"`
- `dev`, `build`, `type-check` SHALL prepend `npm run generate:mfe-manifests &&`

### R3 — Empty-registry guard

Given a freshly scaffolded project with no MFEs registered,
When `bootstrapMFE()` is called,
Then it SHALL log a warning and return early without throwing.

### R4 — Correct post-create message

Given `uikit === 'none'`,
When `hai3 create` completes,
Then the message SHALL reference `hai3 add-mfe`, not `hai3 screenset create`.

### R5 — MFE package template

The CLI SHALL provide `packages/cli/template-sources/mfe-package/` containing `package.json` and `vite.config.ts` for use by `hai3 add-mfe`.

### R6 — MFE opt-in

The scaffolded project SHALL NOT include `@originjs/vite-plugin-federation` or `@globaltypesystem/gts-ts` in default dependencies.

## Scenarios

### Scenario: Fresh scaffold, no MFEs

Given a project created with `hai3 create`,
When `npm run dev` is started for the first time,
Then `generate:mfe-manifests` runs and writes an empty `MFE_MANIFESTS = []` stub,
And the app boots without errors,
And bootstrap logs `[MFE Bootstrap] No MFE extensions registered`.

### Scenario: Adding first MFE

Given a developer adds an MFE package to `src/mfe_packages/my-mfe/`,
When `npm run generate:mfe-manifests` runs,
Then `generated-mfe-manifests.ts` gains `import mfe0 from '@/mfe_packages/my-mfe/mfe.json'`,
And `MFE_MANIFESTS = [mfe0]`,
And `npm run dev:all` starts both the MFE dev server and the main app.

### Scenario: dev:all with multiple MFEs

Given `MFE_REGISTRY` has two enabled entries (`demo-mfe` port 3001, `my-mfe` port 3010),
When `npm run dev:all` runs,
Then `scripts/dev-all.ts` reads the registry,
And starts `cd src/mfe_packages/demo-mfe && npm run dev` and `cd src/mfe_packages/my-mfe && npm run dev` via concurrently,
And starts the main Vite app server,
And all three processes are killed together on Ctrl-C (`--kill-others`).
