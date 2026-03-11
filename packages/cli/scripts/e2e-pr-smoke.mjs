// @cpt-flow:cpt-hai3-flow-cli-tooling-e2e-pr:p1
// @cpt-dod:cpt-hai3-dod-cli-tooling-e2e-pr:p1
import path from 'path';
import process from 'node:process';
import { CLI_ENTRY, createHarness, shouldSkipInstall } from './e2e-lib.mjs';

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-trigger
// CI triggers .github/workflows/cli-pr.yml on pull request to main; job cli-pr-e2e starts on ubuntu-latest with Node 24.14.x
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-trigger

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-cli
// @hai3/cli is built via npm run build --workspace=@hai3/cli before this script runs
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-cli

// @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-harness
const harness = createHarness('pr');
// @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-harness
const skipInstall = shouldSkipInstall();

function runProjectValidation(projectRoot) {
  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-clean
  harness.runStep({
    name: 'validate-components-clean',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'validate', 'components'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-clean

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-bad
  const badScreenPath = path.join(
    projectRoot,
    'src',
    'screensets',
    'test',
    'screens',
    'bad',
    'BadScreen.tsx'
  );
  harness.writeFile(
    badScreenPath,
    [
      "import React from 'react';",
      '',
      "const BadScreen: React.FC = () => <div style={{ color: '#ff0000' }}>bad</div>;",
      '',
      'export default BadScreen;',
      '',
    ].join('\n')
  );

  harness.runStep({
    name: 'validate-components-bad-screen',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'validate', 'components'],
    expectExit: 1,
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-bad
}

try {
  const workspace = harness.makeTempDir('workspace');
  const projectRoot = path.join(workspace, 'smoke-app');

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-app
  harness.runStep({
    name: 'create-app',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'smoke-app', '--no-studio', '--uikit', 'hai3'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-app

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-files
  harness.assertPathExists(path.join(projectRoot, 'hai3.config.json'));
  harness.assertPathExists(path.join(projectRoot, 'package.json'));
  harness.assertPathExists(path.join(projectRoot, '.ai', 'GUIDELINES.md'));
  harness.assertPathExists(path.join(projectRoot, 'src', 'app', 'layout', 'Layout.tsx'));
  harness.assertPathExists(path.join(projectRoot, 'scripts', 'generate-mfe-manifests.ts'));
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-files

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-engines
  const packageJson = harness.readJson(path.join(projectRoot, 'package.json'));
  harness.assert(
    packageJson.engines?.node === '>=24.14.0',
    'Generated project must pin node >=24.14.0'
  );
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-engines

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-git-init-install
  if (!skipInstall) {
    harness.runStep({
      name: 'git-init-generated-project',
      cwd: projectRoot,
      command: 'git',
      args: ['init'],
    });

    harness.runStep({
      name: 'npm-install',
      cwd: projectRoot,
      command: 'npm',
      args: ['install', '--no-audit', '--no-fund'],
    });
    // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-git-init-install

    // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-typecheck
    harness.runStep({
      name: 'build-generated-project',
      cwd: projectRoot,
      command: 'npm',
      args: ['run', 'build'],
    });

    harness.runStep({
      name: 'type-check-generated-project',
      cwd: projectRoot,
      command: 'npm',
      args: ['run', 'type-check'],
    });
    // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-typecheck
  } else {
    harness.log('Skipping npm install/build/type-check');
  }

  runProjectValidation(projectRoot);

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-scaffold-layout
  harness.runStep({
    name: 'scaffold-layout-force',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'scaffold', 'layout', '-f'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-scaffold-layout

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-ai-sync
  harness.runStep({
    name: 'ai-sync-diff',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'ai', 'sync', '--tool', 'all', '--diff'],
  });
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-ai-sync

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-upload-artifacts
  // CI uploads step logs and JSON summary as artifacts (handled in cli-pr.yml workflow)
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-upload-artifacts

  // @cpt-begin:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-return
  harness.complete('passed');
  harness.log(`Completed successfully. Logs: ${harness.artifactDir}`);
  // @cpt-end:cpt-hai3-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-return
} catch (error) {
  harness.complete('failed');
  globalThis.console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
