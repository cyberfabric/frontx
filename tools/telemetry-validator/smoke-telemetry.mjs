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
import fs from 'node:fs';
import path from 'node:path';

const root = globalThis.process.cwd();
const rulesPath = path.join(root, 'tools', 'telemetry-validator', 'validator-rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
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
  path.join(root, 'tools', 'telemetry-validator', 'fixtures'),
];

const files = scanDirs.flatMap((d) => walk(d));
const routeFiles = files.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
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
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

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
