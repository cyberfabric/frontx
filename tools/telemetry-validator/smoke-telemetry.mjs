#!/usr/bin/env node
/**
 * Telemetry Smoke Test — validates that instrumented screen examples exist
 * and contain the required telemetry hooks.
 *
 * Scans src/mfe_packages/ for files marked with @telemetry-route sentinel
 * and checks they contain the minimum required instrumentation.
 *
 * Usage: node tools/telemetry-validator/smoke-telemetry.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SOURCE_EXT = new Set(['.ts', '.tsx']);

/**
 * Recursively collects .ts/.tsx files from a directory, skipping node_modules and dist.
 * @param {string} dir - Root directory to walk
 * @param {string[]} out - Accumulator array
 * @returns {string[]} Absolute paths of all matching source files
 */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); continue; }
    if (SOURCE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

// Scan app source and MFE packages
const scanDirs = [
  path.join(root, 'src'),
];

const files = scanDirs.flatMap((d) => walk(d));
const routeFiles = files.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
  return content.includes('@telemetry-route');
});

const strictMode = process.argv.includes('--strict');

if (routeFiles.length === 0) {
  if (strictMode) {
    console.error('Telemetry smoke: no @telemetry-route files found (strict mode).');
    process.exit(1);
  }
  console.log('Telemetry smoke: no @telemetry-route files found. Skipping (use --strict to enforce).');
  process.exit(0);
}

const errors = [];

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  if (!content.includes('useRoutePerf(')) {
    errors.push(`${rel}: marked @telemetry-route but missing useRoutePerf()`);
  }
  if (!content.includes('useDoneRendering(')) {
    errors.push(`${rel}: marked @telemetry-route but missing useDoneRendering()`);
  }
}

if (errors.length > 0) {
  console.error('\nTelemetry smoke failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Telemetry smoke passed (${routeFiles.length} instrumented route files validated).`);
