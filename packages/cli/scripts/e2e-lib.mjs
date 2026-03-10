import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'node:process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
export const CLI_ENTRY = path.join(PACKAGE_ROOT, 'dist', 'index.js');

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

export function createHarness(suiteName) {
  const suiteDir = process.env.CLI_E2E_ARTIFACT_DIR
    ? path.resolve(REPO_ROOT, process.env.CLI_E2E_ARTIFACT_DIR)
    : path.join(REPO_ROOT, '.artifacts', 'cli-e2e', suiteName);
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${suiteName}-`));
  let stepIndex = 0;
  const summary = [];

  fs.mkdirSync(suiteDir, { recursive: true });

  function writeSummary(status) {
    const summaryPath = path.join(suiteDir, 'summary.json');
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          suite: suiteName,
          status,
          tmpRoot,
          generatedAt: new Date().toISOString(),
          steps: summary,
        },
        null,
        2
      ) + '\n'
    );
  }

  function log(message) {
    globalThis.console.log(`[${suiteName}] ${message}`);
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function assertPathExists(targetPath) {
    assert(fs.existsSync(targetPath), `Expected path to exist: ${targetPath}`);
  }

  function readJson(targetPath) {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  }

  function writeFile(targetPath, content) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }

  function makeTempDir(name) {
    const targetPath = path.join(tmpRoot, name);
    fs.mkdirSync(targetPath, { recursive: true });
    return targetPath;
  }

  function runStep({
    name,
    cwd,
    command,
    args = [],
    expectExit = 0,
    env = {},
  }) {
    stepIndex += 1;
    const slug = `${String(stepIndex).padStart(2, '0')}-${toSlug(name)}`;
    const logPath = path.join(suiteDir, `${slug}.log`);
    const startedAt = Date.now();

    log(`Running ${name}`);

    const result = spawnSync(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const durationMs = Date.now() - startedAt;
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const commandLine = formatCommand(command, args);
    const content = [
      `name: ${name}`,
      `cwd: ${cwd}`,
      `command: ${commandLine}`,
      `exitCode: ${exitCode}`,
      `durationMs: ${durationMs}`,
      '',
      'stdout:',
      result.stdout || '',
      '',
      'stderr:',
      result.stderr || '',
      '',
    ].join('\n');

    fs.writeFileSync(logPath, content);

    summary.push({
      name,
      cwd,
      command: commandLine,
      exitCode,
      durationMs,
      logPath,
    });

    if (result.error) {
      writeSummary('failed');
      throw result.error;
    }

    const expectedCodes = Array.isArray(expectExit) ? expectExit : [expectExit];
    if (!expectedCodes.includes(exitCode)) {
      writeSummary('failed');
      throw new Error(
        `${name} exited with ${exitCode}, expected ${expectedCodes.join(', ')}. See ${logPath}`
      );
    }

    return result;
  }

  function complete(status = 'passed') {
    writeSummary(status);
  }

  return {
    artifactDir: suiteDir,
    tmpRoot,
    log,
    assert,
    assertPathExists,
    readJson,
    writeFile,
    makeTempDir,
    runStep,
    complete,
  };
}

export function shouldSkipInstall() {
  return process.argv.includes('--skip-install') || process.env.HAI3_CLI_E2E_SKIP_INSTALL === '1';
}
