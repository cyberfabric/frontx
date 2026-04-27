#!/usr/bin/env node
/**
 * Telemetry Validator — lint source files for required instrumentation patterns.
 *
 * Scans src/ and src/mfe_packages/ for files annotated with telemetry sentinels
 * and checks that they include the required hooks/wrappers.
 *
 * Usage: node tools/telemetry-validator/telemetry-validator.mjs --mode=lint
 */
import path from 'node:path';
import { safeExists, safeReadFile, safeReaddir } from './path-utils.mjs';

const root = globalThis.process.cwd();
const rules = JSON.parse(safeReadFile(root, 'tools/telemetry-validator/validator-rules.json'));

const modeArg = globalThis.process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'lint';

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
// Skip telemetry package internals — we only lint consumer code
const SKIP_PATHS = ['packages/perf-telemetry', 'tools/telemetry-validator'];

/**
 * Recursively collects source files from a repo-relative directory, skipping
 * node_modules, dist, and telemetry internals. Paths are anchored at `root`
 * via safeReaddir so callers cannot traverse outside the repo.
 * @param {string} relDir - Repo-relative directory to walk
 * @param {string[]} out - Accumulator of repo-relative paths
 * @returns {string[]}
 */
function walk(relDir, out = []) {
  const entries = safeReaddir(root, relDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const childRel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_PATHS.some((skip) => childRel.includes(skip))) continue;
      walk(childRel, out);
      continue;
    }
    if (SOURCE_EXT.has(path.extname(entry.name))) out.push(childRel);
  }
  return out;
}

// Scan src/ and workspace packages for consumer code (repo-relative paths only).
const scanDirs = [
  'src',
  ...safeReaddir(root, 'packages').map((p) => path.join('packages', p, 'src')),
].filter((d) => safeExists(root, d));

const files = scanDirs.flatMap((d) => walk(d));
const errors = [];

for (const file of files) {
  const content = safeReadFile(root, file);

  // Check route sentinel
  if (content.includes(rules.routeSentinel)) {
    for (const pat of rules.requiredRoutePatterns) {
      if (!content.includes(pat)) {
        errors.push(`${file}: missing route instrumentation pattern: ${pat}`);
      }
    }
  }

  // Check critical action sentinel
  if (content.includes(rules.criticalActionSentinel)) {
    for (const pat of rules.requiredActionPatterns) {
      if (!content.includes(pat)) {
        errors.push(`${file}: missing critical action instrumentation pattern: ${pat}`);
      }
    }
  }

  // Check each line for raw first-party fetch without wrapper (per-occurrence, not per-file)
  const lines = content.split('\n');
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = Reflect.get(lines, lineNum);
    if (typeof line !== 'string') continue;
    const hasForbidden = rules.forbiddenFirstPartyFetchPatterns.some((p) => line.includes(p));
    if (hasForbidden) {
      const hasWrapper = rules.allowedApiWrapperPatterns.some((p) => line.includes(p));
      if (!hasWrapper) {
        errors.push(`${file}:${lineNum + 1}: raw first-party fetch detected without instrumented wrapper`);
      }
    }
  }
}

if (mode !== 'lint') {
  globalThis.console.log(`[telemetry-validator] unknown mode '${mode}', running lint checks.`);
}

if (errors.length > 0) {
  globalThis.console.error('\nTelemetry lint failed:\n');
  for (const error of errors) globalThis.console.error(`- ${error}`);
  globalThis.process.exit(1);
}

globalThis.console.log(`Telemetry lint passed (${files.length} source files scanned).`);
