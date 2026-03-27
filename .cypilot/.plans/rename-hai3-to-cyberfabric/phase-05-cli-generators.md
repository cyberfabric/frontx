# Phase 5: CLI Generators, Template Sources, and Build-Time Version Injection

## What
1. Update all CLI generator code and template sources to use @cyberfabric scope
2. Implement build-time version injection so CLI always ships with correct dependency versions for its channel
3. Rename `hai3.config.json` → `frontx.config.json`
4. Update `_npmrc` template (already done in 0.1.x)

## Part A: Build-Time Version Injection

### Design
Create `packages/cli/scripts/generate-versions.ts` that:
1. Reads all `packages/*/package.json` files
2. Extracts package names and versions
3. Writes `packages/cli/src/generated/versions.ts`:
   ```typescript
   // AUTO-GENERATED — do not edit. Run `npm run generate-versions` to update.
   export const PACKAGE_VERSIONS: Record<string, string> = {
     '@cyberfabric/react': '0.2.0-alpha.0',
     '@cyberfabric/framework': '0.2.0-alpha.0',
     '@cyberfabric/uikit': '0.2.0-alpha.0',
     '@cyberfabric/studio': '0.2.0-alpha.0',
     '@cyberfabric/cli': '0.2.0-alpha.0',
     '@cyberfabric/state': '0.2.0-alpha.0',
     '@cyberfabric/screensets': '0.2.0-alpha.0',
     '@cyberfabric/api': '0.2.0-alpha.0',
     '@cyberfabric/i18n': '0.2.0-alpha.0',
   };

   export const CLI_VERSION = '0.2.0-alpha.0';
   ```
4. Add `generate-versions` to CLI build script: `"build": "npm run generate-versions && npm run copy-templates && tsup"`
5. Add to .gitignore: `packages/cli/src/generated/`

### Update generators to use PACKAGE_VERSIONS
- `packages/cli/src/generators/project.ts`: import from `../generated/versions.js` instead of hardcoded strings
- `packages/cli/src/generators/layerPackage.ts`: same
- `packages/cli/src/index.ts`: import `CLI_VERSION` from `./generated/versions.js` instead of hardcoded `VERSION`

## Part B: Template Sources Rename

### Files to update (content)
- All files in `packages/cli/template-sources/` with `@hai3/` or `hai3` references
- `packages/cli/template-sources/manifest.yaml`
- `packages/cli/template-sources/project/configs/eslint.config.js`
- `packages/cli/template-sources/project/eslint-plugin-local/src/rules/*.ts`
- `packages/cli/template-sources/ai-overrides/**/*.md`
- `packages/cli/template-sources/mfe-package/package.json`

### Content replacements
- `@hai3/` → `@cyberfabric/` in imports, dependencies, string literals
- `hai3 screenset` → `frontx screenset` in CLI command references
- `hai3 create` → `frontx create`
- `hai3 update` → `frontx update`
- `hai3 --version` → `frontx --version`
- `npx hai3` → `npx frontx`
- `HAI3 CLI` → `FrontX CLI`
- `hai3.config.json` → `frontx.config.json`
- `npm install -g @hai3/cli` → `npm install -g @cyberfabric/cli`

## Part C: Generator Source Code
- `packages/cli/src/generators/project.ts`: update all `@hai3/` → `@cyberfabric/`, replace hardcoded versions with PACKAGE_VERSIONS import
- `packages/cli/src/generators/layerPackage.ts`: same
- `packages/cli/src/generators/screenset.ts`: update references
- `packages/cli/src/commands/**/*.ts`: update all `@hai3/` string references
- `packages/cli/src/utils/project.ts`: update `@hai3/` detection to `@cyberfabric/`
- `packages/cli/src/core/templates.ts`: update references
- `packages/cli/src/index.ts`: update `.name('hai3')` → `.name('frontx')`, descriptions
- `packages/cli/src/migrations/`: update `@hai3/` references (these are historical migrations — may need to keep old refs for backward compat, decide per file)

## Part D: hai3.config.json → frontx.config.json
- Update `layerPackage.ts` to generate `frontx.config.json`
- Update `project.ts` detection logic
- Update `utils/project.ts` to look for `frontx.config.json`

## Acceptance Criteria
- [ ] `generate-versions.ts` script created and working
- [ ] CLI build produces `src/generated/versions.ts` with current package versions
- [ ] Generators use imported versions, not hardcoded strings
- [ ] Zero `@hai3/` in template-sources (except GTS identifiers)
- [ ] CLI commands reference `frontx` not `hai3`
- [ ] `hai3.config.json` → `frontx.config.json` in all generator code
