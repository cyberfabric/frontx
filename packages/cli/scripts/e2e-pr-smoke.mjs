import path from 'path';
import process from 'node:process';
import { CLI_ENTRY, createHarness, shouldSkipInstall } from './e2e-lib.mjs';

const harness = createHarness('pr');
const skipInstall = shouldSkipInstall();

function runProjectValidation(projectRoot) {
  harness.runStep({
    name: 'validate-components-clean',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'validate', 'components'],
  });

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
}

try {
  const workspace = harness.makeTempDir('workspace');
  const projectRoot = path.join(workspace, 'smoke-app');

  harness.runStep({
    name: 'create-app',
    cwd: workspace,
    command: 'node',
    args: [CLI_ENTRY, 'create', 'smoke-app', '--no-studio', '--uikit', 'hai3'],
  });

  harness.assertPathExists(path.join(projectRoot, 'hai3.config.json'));
  harness.assertPathExists(path.join(projectRoot, 'package.json'));
  harness.assertPathExists(path.join(projectRoot, '.ai', 'GUIDELINES.md'));
  harness.assertPathExists(path.join(projectRoot, 'src', 'app', 'layout', 'Layout.tsx'));
  harness.assertPathExists(path.join(projectRoot, 'scripts', 'generate-mfe-manifests.ts'));

  const packageJson = harness.readJson(path.join(projectRoot, 'package.json'));
  harness.assert(
    packageJson.engines?.node === '>=24.14.0',
    'Generated project must pin node >=24.14.0'
  );

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
  } else {
    harness.log('Skipping npm install/build/type-check');
  }

  runProjectValidation(projectRoot);

  harness.runStep({
    name: 'scaffold-layout-force',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'scaffold', 'layout', '-f'],
  });

  harness.runStep({
    name: 'ai-sync-diff',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'ai', 'sync', '--tool', 'all', '--diff'],
  });

  harness.complete('passed');
  harness.log(`Completed successfully. Logs: ${harness.artifactDir}`);
} catch (error) {
  harness.complete('failed');
  globalThis.console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
