// @cpt-flow:cpt-hai3-flow-cli-tooling-e2e-nightly:p2
import path from 'path';
import process from 'node:process';
import { CLI_ENTRY, createHarness, shouldSkipInstall } from './e2e-lib.mjs';

const harness = createHarness('nightly');
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
  harness.runStep({
    name: 'create-hai3-app',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'nightly-app', '--no-studio', '--uikit', 'hai3'],
  });
  maybeInstallAndCheck(appRoot, true);

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

  harness.runStep({
    name: 'reject-invalid-name',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'Invalid Name'],
    expectExit: 1,
  });

  harness.complete('passed');
  harness.log(`Completed successfully. Logs: ${harness.artifactDir}`);
} catch (error) {
  harness.complete('failed');
  globalThis.console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
