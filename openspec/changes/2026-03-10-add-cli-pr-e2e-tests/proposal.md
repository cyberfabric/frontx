# Change: CLI PR E2E Tests

## Why

The repository had CLI functionality with real project scaffolding behavior, but no dedicated GitHub PR gate that proved the main commands still worked after changes landed. The existing CI only covered architecture validation and path-scoped AI checks. That left high-risk regressions undetected in the actual CLI user path:

- `hai3 create` could generate a project that fails during `npm install`, `build`, or `type-check`
- generated template scripts could drift from the real monorepo runtime
- `validate components`, `scaffold layout`, and `ai sync` could break without any required PR signal

The gap is especially important because the generated app now contains MFE bootstrap and manifest-generation scripts. A green package build alone is not enough; the generated project itself must be executable.

## What Changes

- Add a dedicated required GitHub Actions workflow for CLI end-to-end verification on pull requests.
- Add a dedicated nightly/manual GitHub Actions workflow for broader CLI scenario coverage.
- Add scripted CLI e2e runners under `packages/cli/scripts/` so the same scenarios can run locally and in CI.
- Verify the fresh scaffold path end-to-end:
  - `hai3 create`
  - `git init`
  - `npm install`
  - `npm run build`
  - `npm run type-check`
  - `hai3 validate components`
  - negative validation case
  - `hai3 scaffold layout -f`
  - `hai3 ai sync --diff`
- Add artifact logging for every e2e step to simplify debugging in GitHub Actions.
- Harden generated project template behavior as needed so the tested scaffold path is actually green.

## Impact

- **@hai3/cli**: new e2e scripts and package scripts for local/CI execution
- **GitHub Actions**: new required PR workflow and a separate nightly/manual workflow
- **Generated projects**: must remain installable, buildable, and type-check clean on Node 24.14.x
- **Documentation**: contributing guide must document the required check and local CLI verification commands

## Non-Goals

- Adding new CLI product commands
- Expanding MFE product scope
- Making nightly checks required for merge
