// @cpt-flow:cpt-frontx-flow-cli-tooling-e2e-pr:p1
// @cpt-dod:cpt-frontx-dod-cli-tooling-e2e-pr:p1
import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { CLI_ENTRY, createHarness, shouldSkipInstall } from './e2e-lib.mjs';

// @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-trigger
// CI triggers .github/workflows/cli-pr.yml on pull request to main; job cli-pr-e2e starts on ubuntu-latest with Node 24.14.x
// @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-trigger

// @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-cli
// @cyberfabric/cli is built via npm run build --workspace=@cyberfabric/cli before this script runs
// @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-cli

// @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-harness
const harness = createHarness('pr');
// @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-harness
const skipInstall = shouldSkipInstall();
const packageManager = process.env.CLI_E2E_PM || 'npm';
const expectedManagerEngines = {
  npm: '>=10.0.0',
  pnpm: '>=10.0.0',
  yarn: '>=4.0.0',
};

function runScriptArgs(scriptName) {
  if (packageManager === 'yarn') {
    return [scriptName];
  }
  return ['run', scriptName];
}

function installArgs() {
  if (packageManager === 'npm') {
    return ['install', '--no-audit', '--no-fund'];
  }
  if (packageManager === 'pnpm') {
    return ['install', '--no-frozen-lockfile'];
  }
  return ['install', '--no-immutable'];
}

function runProjectValidation(projectRoot) {
  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-clean
  harness.runStep({
    name: 'validate-components-clean',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'validate', 'components'],
  });
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-clean

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-bad
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
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-validate-bad
}

// @cpt-flow:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1
try {
  const workspace = harness.makeTempDir('workspace');
  const projectRoot = path.join(workspace, 'smoke-app');

  // @cpt-begin:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-create-project
  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-app
  harness.runStep({
    name: 'create-app',
    cwd: workspace,
    command: 'node',
    args: [
      CLI_ENTRY,
      'create',
      'smoke-app',
      '--no-studio',
      '--uikit',
      'shadcn',
      '--package-manager',
      packageManager,
    ],
  });
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-create-app
  // @cpt-end:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-create-project

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-files
  harness.assertPathExists(path.join(projectRoot, 'frontx.config.json'));
  harness.assertPathExists(path.join(projectRoot, 'package.json'));
  harness.assertPathExists(path.join(projectRoot, '.ai', 'GUIDELINES.md'));
  harness.assertPathExists(path.join(projectRoot, 'src', 'app', 'layout', 'Layout.tsx'));
  harness.assertPathExists(path.join(projectRoot, 'scripts', 'generate-mfe-manifests.ts'));
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-files

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-engines
  const packageJson = harness.readJson(path.join(projectRoot, 'package.json'));
  harness.assert(
    packageJson.engines?.node === '>=24.14.0',
    'Generated project must pin node >=24.14.0'
  );
  harness.assert(
    packageJson.packageManager?.startsWith(`${packageManager}@`),
    `Generated project must set packageManager to ${packageManager}`
  );
  harness.assert(
    packageJson.engines?.[packageManager] === expectedManagerEngines[packageManager],
    `Generated project engines must require ${packageManager} ${expectedManagerEngines[packageManager]}`
  );
  if (packageManager === 'pnpm') {
    harness.assertPathExists(path.join(projectRoot, 'pnpm-workspace.yaml'));
  }
  if (packageManager === 'yarn') {
    harness.assertPathExists(path.join(projectRoot, '.yarnrc.yml'));
  }
  const frontxConfig = harness.readJson(path.join(projectRoot, 'frontx.config.json'));
  harness.assert(
    frontxConfig.packageManager === packageManager,
    `Generated frontx.config.json must set packageManager to ${packageManager}`
  );
  harness.assert(
    !('packageManagerVersion' in frontxConfig),
    'Generated frontx.config.json must not include packageManagerVersion'
  );
  const readmeContent = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  harness.assert(
    readmeContent.includes(`${packageManager} install`) ||
      (packageManager === 'yarn' && readmeContent.includes('yarn dev')),
    'Generated README must include concrete package-manager setup commands'
  );
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-assert-engines

  // @cpt-begin:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-install-deps
  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-git-init-install
  if (!skipInstall) {
    harness.runStep({
      name: 'git-init-generated-project',
      cwd: projectRoot,
      command: 'git',
      args: ['init'],
    });

    harness.runStep({
      name: `${packageManager}-install`,
      cwd: projectRoot,
      command: packageManager,
      args: installArgs(),
    });
    // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-git-init-install
    // @cpt-end:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-install-deps

    // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-typecheck
    harness.runStep({
      name: 'build-generated-project',
      cwd: projectRoot,
      command: packageManager,
      args: runScriptArgs('build'),
    });

    harness.runStep({
      name: 'type-check-generated-project',
      cwd: projectRoot,
      command: packageManager,
      args: runScriptArgs('type-check'),
    });
    // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-build-typecheck
  } else {
    harness.log(`Skipping ${packageManager} install/build/type-check`);
  }

  // @cpt-begin:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-run-arch-check
  runProjectValidation(projectRoot);
  // @cpt-end:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-run-arch-check
  // @cpt-begin:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-push-ci
  // CI push verification is covered by the generated .github/workflows/ci.yml
  // @cpt-end:cpt-frontx-flow-cli-scaffolding-quality-verify-ootb:p1:inst-push-ci

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-scaffold-layout
  harness.runStep({
    name: 'scaffold-layout-force',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'scaffold', 'layout', '-f'],
  });
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-scaffold-layout

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-ai-sync
  harness.runStep({
    name: 'ai-sync-diff',
    cwd: projectRoot,
    command: 'node',
    args: [CLI_ENTRY, 'ai', 'sync', '--tool', 'all', '--diff'],
  });
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-ai-sync

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-upload-artifacts
  // CI uploads step logs and JSON summary as artifacts (handled in cli-pr.yml workflow)
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-upload-artifacts

  // @cpt-begin:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-return
  harness.complete('passed');
  harness.log(`Completed successfully. Logs: ${harness.artifactDir}`);
  // @cpt-end:cpt-frontx-flow-cli-tooling-e2e-pr:p1:inst-e2e-pr-return
} catch (error) {
  harness.complete('failed');
  globalThis.console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
