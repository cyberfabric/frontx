## Context

The CLI template pipeline works in two stages: `manifest.yaml` declares which directories and files to copy from the monorepo root; `copy-templates.ts` then overlays standalone overrides from `template-sources/project/`. The resulting `templates/` directory is what `generateProject()` uses at runtime.

Before this change, the generated project had no `src/app/mfe/` directory, no dev scripts for MFE orchestration, and `bootstrap.ts` hardcoded a single `demo-mfe` import. Adding a second MFE required manual edits to `bootstrap.ts`, `package.json`, and registry — all in the consuming project.

## Architecture Decisions

### Dynamic bootstrap vs. static hardcoded

**Decision**: Dynamic bootstrap reads from `registry.ts` and `generated-mfe-manifests.ts` at runtime instead of hardcoding MFE imports.

**Rationale**: Allows adding MFEs by editing only `registry.ts` + running `generate:mfe-manifests`. Bootstrap stays unchanged as the project grows.

### MFE opt-in (no federation deps in scaffold)

**Decision**: `@originjs/vite-plugin-federation` and `@globaltypesystem/gts-ts` are NOT added to scaffolded `package.json`.

**Rationale**: `87661b3` established standalone-first scaffolding. MFE infrastructure (registry, bootstrap) is present but dormant. Federation is added when the developer explicitly enables an MFE package.

### generate:mfe-manifests script

**Decision**: A codegen step scans `src/mfe_packages/*/mfe.json` and writes typed static imports to `generated-mfe-manifests.ts`.

**Rationale**: Vite cannot statically analyze dynamic `import()` inside loops. The codegen produces explicit `import mfe0 from '...'` statements that Vite can tree-shake and bundle correctly.

## File Map

```
packages/cli/
  template-sources/
    manifest.yaml                          # Added src/app/mfe to directories
    mfe-package/
      package.json                         # Template for hai3 add-mfe
      vite.config.ts                       # Template for hai3 add-mfe
    project/
      src/app/
        mfe/
          registry.ts                      # MFE registry (enabled/disabled, port)
          bootstrap.ts                     # Dynamic multi-MFE bootstrap
          generated-mfe-manifests.ts       # Auto-generated stub (empty on fresh scaffold)
        App.tsx                            # Updated: "hai3 add-mfe" text
        App.no-studio.tsx
        App.no-uikit.tsx
        App.no-uikit.no-studio.tsx
      scripts/
        dev-all.ts                         # Reads registry, starts MFEs via concurrently
        generate-mfe-manifests.ts          # Codegen: scans mfe.json files
  src/
    generators/project.ts                  # Added MFE scripts, removed screensets loop
    commands/create/index.ts               # Fixed post-create message
    index.ts                               # CLI commands registration

scripts/
  dev-all.ts                               # Monorepo version (same logic)
  generate-mfe-manifests.ts                # Monorepo version (same logic)

src/app/mfe/
  registry.ts                              # Monorepo registry (demo-mfe enabled)
  generated-mfe-manifests.ts               # Monorepo generated file
  bootstrap.ts                             # Updated to dynamic pattern

.ai/
  GUIDELINES.hai3-mfe-setup.md
  commands/user/hai3-new-mfe.md
  commands/user/hai3-dev-all.md
  commands/user/hai3-add-mfe-to-registry.md
```

## Bootstrap Flow (new)

```
main.tsx
  └── bootstrapMFE(app, ref)
        ├── Register domains (screen, sidebar, popup, overlay)
        ├── Set shared properties (theme, language)
        ├── [GUARD] if MFE_REGISTRY empty → warn + return early
        ├── For each enabled MFE in MFE_MANIFESTS:
        │     ├── typeSystem.register(manifest)
        │     ├── typeSystem.register(entries)
        │     └── registerExtension(extensions)
        ├── Mount default extension (by URL route or first)
        ├── Wrap executeActionsChain → sync URL on mount
        └── Handle popstate → restore extension on back/forward
```

## Dev Workflow (new)

```
npm run generate:mfe-manifests   # Scan mfe.json files → generate imports
npm run dev                      # Single app dev server
npm run dev:all                  # generate:mfe-manifests + all MFE servers + main app
```
