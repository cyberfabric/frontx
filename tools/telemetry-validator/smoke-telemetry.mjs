#!/usr/bin/env node
/**
 * Telemetry Smoke Test — validates that instrumented screen examples exist
 * and contain the required telemetry hooks.
 *
 * Scans src/ for files marked with @telemetry-route sentinel and checks
 * they contain the minimum required instrumentation.
 *
 * Usage: node tools/telemetry-validator/smoke-telemetry.mjs
 */
import path from 'node:path';
import { safeExists, safeReadFile, safeReaddir } from './path-utils.mjs';

const root = globalThis.process.cwd();
const rules = JSON.parse(safeReadFile(root, 'tools/telemetry-validator/validator-rules.json'));
const SOURCE_EXT = new Set(['.ts', '.tsx']);

/**
 * Recursively collects .ts/.tsx files from a directory under `root`, skipping
 * node_modules and dist. `relDir` is always resolved against `root` via
 * safeReaddir, so callers cannot escape the repo root.
 * @param {string} relDir - Relative directory to walk, anchored at `root`
 * @param {string[]} out - Accumulator array of relative paths
 * @returns {string[]}
 */
function walk(relDir, out = []) {
  if (!safeExists(root, relDir)) return out;
  const entries = safeReaddir(root, relDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const childRel = path.join(relDir, entry.name);
    if (entry.isDirectory()) { walk(childRel, out); continue; }
    if (SOURCE_EXT.has(path.extname(entry.name))) out.push(childRel);
  }
  return out;
}

// Scan app source and MFE packages — paths are repo-relative so safeReaddir can lock them down.
const scanDirs = ['src', 'tools/telemetry-validator/fixtures'];

const files = scanDirs.flatMap((d) => walk(d));
const routeFiles = files.filter((f) => {
  const content = safeReadFile(root, f);
  return content.includes(rules.routeSentinel);
});

const strictMode = globalThis.process.argv.includes('--strict');

if (routeFiles.length === 0) {
  if (strictMode) {
    globalThis.console.error('Telemetry smoke: no @telemetry-route files found (strict mode).');
    globalThis.process.exit(1);
  }
  globalThis.console.log('Telemetry smoke: no @telemetry-route files found. Skipping (use --strict to enforce).');
  globalThis.process.exit(0);
}

const errors = [];

for (const file of routeFiles) {
  const content = safeReadFile(root, file);
  const rel = file;

  for (const pattern of rules.requiredRoutePatterns) {
    if (!content.includes(pattern)) {
      errors.push(`${rel}: marked ${rules.routeSentinel} but missing ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  globalThis.console.error('\nTelemetry smoke failed:\n');
  for (const error of errors) globalThis.console.error(`- ${error}`);
  globalThis.process.exit(1);
}

globalThis.console.log(`Telemetry smoke passed (${routeFiles.length} instrumented route files validated).`);
