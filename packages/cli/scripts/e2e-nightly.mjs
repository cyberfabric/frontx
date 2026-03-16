// @cpt-flow:cpt-hai3-flow-cli-tooling-e2e-nightly:p2
// @cpt-dod:cpt-hai3-dod-cli-tooling-e2e-nightly:p1
import path from 'path';
import process from 'node:process';
import { CLI_ENTRY, createHarness, shouldSkipInstall } from './e2e-lib.mjs';

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-trigger
// CI triggers .github/workflows/cli-nightly.yml on schedule (daily 03:00 UTC) or manual dispatch
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-trigger

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-build-cli
// @hai3/cli is built via npm run build --workspace=@hai3/cli before this script runs
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-build-cli

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-create-harness
const harness = createHarness('nightly');
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-create-harness
const skipInstall = shouldSkipInstall();

function maybeInstallAndCheck(projectRoot, includeTypeCheck = true) {
  if (skipInstall) {
    harness.log(`Skipping npm install/build for ${projectRoot}`);
    return;
  }

  harness.runStep({
    name: `git-init-${path.basename(projectRoot)}`,
    cwd: projectRoot,
    command: 'git',
    args: ['init'],
  });

  harness.runStep({
    name: `npm-install-${path.basename(projectRoot)}`,
    cwd: projectRoot,
    command: 'npm',
    args: ['install', '--no-audit', '--no-fund'],
  });

  harness.runStep({
    name: `build-${path.basename(projectRoot)}`,
    cwd: projectRoot,
    command: 'npm',
    args: ['run', 'build'],
  });

  if (includeTypeCheck) {
    harness.runStep({
      name: `type-check-${path.basename(projectRoot)}`,
      cwd: projectRoot,
      command: 'npm',
      args: ['run', 'type-check'],
    });
  }
}

try {
  const workspace = harness.makeTempDir('workspace');

  const appRoot = path.join(workspace, 'nightly-app');
  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-create-default
  harness.runStep({
    name: 'create-hai3-app',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'nightly-app', '--no-studio', '--uikit', 'hai3'],
  });
  maybeInstallAndCheck(appRoot, true);
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-create-default

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-migrate-commands
  harness.runStep({
    name: 'migrate-list',
    cwd: appRoot,
    command: 'node',
    args: [CLI_ENTRY, 'migrate', '--list'],
  });

  harness.runStep({
    name: 'migrate-status',
    cwd: appRoot,
    command: 'node',
    args: [CLI_ENTRY, 'migrate', '--status'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-migrate-commands

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-ai-sync-idempotent
  harness.runStep({
    name: 'ai-sync-diff-first',
    cwd: appRoot,
    command: 'node',
    args: [CLI_ENTRY, 'ai', 'sync', '--tool', 'all', '--diff'],
  });

  harness.runStep({
    name: 'ai-sync-diff-second',
    cwd: appRoot,
    command: 'node',
    args: [CLI_ENTRY, 'ai', 'sync', '--tool', 'all', '--diff'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-ai-sync-idempotent

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-custom-uikit
  const customRoot = path.join(workspace, 'nightly-custom');
  harness.runStep({
    name: 'create-custom-app',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'nightly-custom', '--no-studio', '--uikit', 'none'],
  });
  const customPackageJson = harness.readJson(path.join(customRoot, 'package.json'));
  harness.assert(
    !('@hai3/uikit' in (customPackageJson.dependencies || {})),
    'Custom app should not depend on @hai3/uikit'
  );
  maybeInstallAndCheck(customRoot, true);
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-custom-uikit

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-layer-scaffolds
  for (const layer of ['sdk', 'framework', 'react']) {
    const projectName = `nightly-${layer}`;
    const projectRoot = path.join(workspace, projectName);
    harness.runStep({
      name: `create-${layer}-layer`,
      cwd: workspace,
      command: 'node',
      args: [CLI_ENTRY, 'create', projectName, '--layer', layer],
    });
    maybeInstallAndCheck(projectRoot, true);
  }
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-layer-scaffolds

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-invalid-name
  harness.runStep({
    name: 'reject-invalid-name',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'Invalid Name'],
    expectExit: 1,
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-invalid-name

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-upload-artifacts
  // CI uploads step logs and JSON summary as artifacts (handled in cli-nightly.yml workflow)
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-upload-artifacts

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-return
  harness.complete('passed');
  harness.log(`Completed successfully. Logs: ${harness.artifactDir}`);
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-nightly:p2:inst-e2e-nightly-return
} catch (error) {
  harness.complete('failed');
  globalThis.console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
