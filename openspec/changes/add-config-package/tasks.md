## 1. Create @hai3/config Package

- [ ] 1.1 Create `packages/config/` directory structure
- [ ] 1.2 Create `package.json` with c12 dependency and subpath exports (`@hai3/config`, `@hai3/config/vite`)
- [ ] 1.3 Create `tsconfig.json` extending base config
- [ ] 1.4 Create `src/types.ts` with empty `Hai3Config` interface
- [ ] 1.5 Create `src/index.ts` with `Hai3Config`, `defineConfig`, and `getConfig` exports
- [ ] 1.6 Create `src/vite.ts` with `hai3` Vite plugin (uses c12 `loadConfig` internally, includes dev watch)
- [ ] 1.7 Add package to workspace in root `package.json`
- [ ] 1.8 Configure tsup build for both entry points

## 2. Update @hai3/uicore for Module Augmentation

- [ ] 2.1 Create `src/config.ts` with Module Augmentation for `uicore` section
- [ ] 2.2 Define `UicoreConfig` interface with `router` and `layout` sections
- [ ] 2.3 Add `@hai3/config` as dependency
- [ ] 2.4 Export config types from package index

## 3. Update CLI Project Generator

- [ ] 3.1 Update `generators/project.ts` to generate `hai3.config.ts` instead of `.json`
- [ ] 3.2 Update `vite.config.ts` template to include `@hai3/config/vite` plugin
- [ ] 3.3 Add `@hai3/config` to generated project dependencies
- [ ] 3.4 Update project detection to support both `.ts` and `.json` config files

## 4. Documentation and Testing

- [ ] 4.1 Create `packages/config/README.md`
- [ ] 4.2 Update monorepo README with new package
- [ ] 4.3 Test package build order: config → uicore → cli
- [ ] 4.4 Verify Vite plugin config injection works
- [ ] 4.5 Run `npm run arch:check` to validate architecture
