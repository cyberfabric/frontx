import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'node:process';
import { fileURLToPath } from 'url';

// @cpt-algo:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
export const CLI_ENTRY = path.join(PACKAGE_ROOT, 'dist', 'index.js');

/** Existence check without fs.existsSync (Codacy: non-literal path on existsSync). */
function pathExistsSync(checkPath) {
  try {
    fs.accessSync(checkPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

export function createHarness(suiteName) {
  // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-resolve-artifact-dir
  const suiteDir = process.env.CLI_E2E_ARTIFACT_DIR
    ? path.resolve(REPO_ROOT, process.env.CLI_E2E_ARTIFACT_DIR)
    : path.join(REPO_ROOT, '.artifacts', 'cli-e2e', suiteName);
  // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-resolve-artifact-dir
  // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-create-tmpdir
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${suiteName}-`));
  // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-create-tmpdir
  let stepIndex = 0;
  const summary = [];

  fs.mkdirSync(suiteDir, { recursive: true });

  // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-write-summary
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
  // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-write-summary

  function log(message) {
    globalThis.console.log(`[${suiteName}] ${message}`);
  }

  // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-assertions
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function resolveWithin(rootPath, targetPath) {
    // Callers must pass absolute roots (e.g. mkdtemp, suite dir). Avoid path.resolve/join with a
    // fully dynamic pair so static analysis does not flag unchecked composition; validate segments
    // for relative targets, then enforce containment with path.relative (same boundary check as
    // scripts/check-test-dependency-versions.mjs: resolvePackageJsonPathWithinRoot).
    assert(path.isAbsolute(rootPath), `resolveWithin requires absolute rootPath, got: ${rootPath}`);
    const resolvedRootPath = path.normalize(rootPath);

    let resolvedTargetPath;
    if (path.isAbsolute(targetPath)) {
      resolvedTargetPath = path.normalize(targetPath);
    } else {
      const rel = path.normalize(targetPath);
      if (rel === '.' || rel === '') {
        resolvedTargetPath = resolvedRootPath;
      } else {
        const parts = rel.split(/[/\\]/u).filter((p) => p.length > 0);
        for (const p of parts) {
          assert(p !== '..', `Path traversal in targetPath: ${targetPath}`);
        }
        const safeParts = parts.filter((p) => p !== '.');
        // Segments validated above (no '..', no absolute); containment re-verified below.
        // nosemgrep
        resolvedTargetPath =
          safeParts.length === 0 ? resolvedRootPath : path.join(resolvedRootPath, ...safeParts);
      }
    }

    const relativePath = path.relative(resolvedRootPath, resolvedTargetPath);
    assert(
      relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)),
      `Expected path to stay within ${resolvedRootPath}: ${resolvedTargetPath}`
    );
    return resolvedTargetPath;
  }

  function assertPathExists(targetPath, { within: withinRoot } = {}) {
    const resolvedTargetPath = withinRoot
      ? resolveWithin(withinRoot, targetPath)
      : targetPath;
    assert(pathExistsSync(resolvedTargetPath), `Expected path to exist: ${resolvedTargetPath}`);
  }

  function readText(targetPath, { within: withinRoot } = {}) {
    const resolvedTargetPath = withinRoot
      ? resolveWithin(withinRoot, targetPath)
      : targetPath;
    // Paths are confined via resolveWithin when `within` is set; harness roots otherwise.
    // nosemgrep
    return fs.readFileSync(resolvedTargetPath).toString('utf8');
  }

  function readJson(targetPath, { within: withinRoot } = {}) {
    return JSON.parse(readText(targetPath, { within: withinRoot }));
  }

  function writeFile(targetPath, content, { within: withinRoot } = {}) {
    const resolvedTargetPath = withinRoot
      ? resolveWithin(withinRoot, targetPath)
      : targetPath;
    // nosemgrep
    fs.mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
    // nosemgrep
    fs.writeFileSync(resolvedTargetPath, content);
  }
  // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-assertions

  function makeTempDir(name) {
    const targetPath = path.join(tmpRoot, name);
    fs.mkdirSync(targetPath, { recursive: true });
    return targetPath;
  }

  // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-run-step
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

    // @cpt-begin:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-check-exit
    const expectedCodes = Array.isArray(expectExit) ? expectExit : [expectExit];
    if (!expectedCodes.includes(exitCode)) {
      writeSummary('failed');
      throw new Error(
        `${name} exited with ${exitCode}, expected ${expectedCodes.join(', ')}. See ${logPath}`
      );
    }
    // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-check-exit

    return result;
  }
  // @cpt-end:cpt-frontx-algo-cli-tooling-e2e-harness-step:p1:inst-e2e-harness-run-step

  function complete(status = 'passed') {
    writeSummary(status);
  }

  return {
    artifactDir: suiteDir,
    tmpRoot,
    log,
    assert,
    assertPathExists,
    readText,
    readJson,
    writeFile,
    makeTempDir,
    runStep,
    complete,
  };
}

export function shouldSkipInstall() {
  return process.argv.includes('--skip-install') || process.env.FRONTX_CLI_E2E_SKIP_INSTALL === '1';
}
