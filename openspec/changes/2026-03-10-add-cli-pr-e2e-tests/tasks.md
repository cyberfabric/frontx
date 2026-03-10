## 1. GitHub Actions

- [x] 1.1 Add `.github/workflows/cli-pr.yml` with pull request trigger on `main`.
- [x] 1.2 Configure required PR job name as `cli-pr-e2e`.
- [x] 1.3 Pin the PR workflow to `ubuntu-latest` and `Node 24.14.x`.
- [x] 1.4 Add `.github/workflows/cli-nightly.yml` with `schedule` and `workflow_dispatch`.
- [x] 1.5 Upload CLI e2e artifacts in both workflows.

## 2. CLI E2E Harness

- [x] 2.1 Add a shared harness under `packages/cli/scripts/e2e-lib.mjs`.
- [x] 2.2 Add `packages/cli/scripts/e2e-pr-smoke.mjs` for the required PR path.
- [x] 2.3 Add `packages/cli/scripts/e2e-nightly.mjs` for broader non-required scenarios.
- [x] 2.4 Add npm scripts in `packages/cli/package.json` for both e2e entrypoints.
- [x] 2.5 Persist per-step logs and a JSON summary for debugging.

## 3. Required PR Scenario

- [x] 3.1 Verify `hai3 create smoke-app --no-studio --uikit hai3`.
- [x] 3.2 Verify the generated project contains required scaffold files.
- [x] 3.3 Run `git init` before `npm install` to satisfy generated project postinstall expectations.
- [x] 3.4 Verify `npm install --no-audit --no-fund`.
- [x] 3.5 Verify `npm run build`.
- [x] 3.6 Verify `npm run type-check`.
- [x] 3.7 Verify `hai3 validate components` passes on a clean scaffold.
- [x] 3.8 Verify `hai3 validate components` fails after injecting an invalid screen.
- [x] 3.9 Verify `hai3 scaffold layout -f`.
- [x] 3.10 Verify `hai3 ai sync --tool all --diff`.

## 4. Nightly Coverage

- [x] 4.1 Cover app scaffold with `--uikit none`.
- [x] 4.2 Cover `sdk`, `framework`, and `react` layer scaffolds.
- [x] 4.3 Cover `hai3 migrate --list`.
- [x] 4.4 Cover `hai3 migrate --status`.
- [x] 4.5 Cover invalid project name rejection.
- [x] 4.6 Cover repeated `ai sync --diff` idempotency.

## 5. Generated Project Hardening

- [x] 5.1 Fix generated project install flow assumptions found by e2e.
- [x] 5.2 Fix generated project type-check regressions found by e2e.
- [x] 5.3 Ensure generated empty MFE manifest flow remains type-safe.

## 6. Documentation

- [x] 6.1 Document local CLI verification commands in `CONTRIBUTING.md`.
- [x] 6.2 Document required branch-protection checks for `main` in `CONTRIBUTING.md`.

## 7. Verification

- [x] 7.1 Run `npm run build --workspace=@hai3/cli`.
- [x] 7.2 Run `npm run test:e2e:pr --workspace=@hai3/cli`.
- [x] 7.3 Run `npm run test:e2e:nightly --workspace=@hai3/cli -- --skip-install`.
