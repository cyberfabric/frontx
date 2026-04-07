#!/usr/bin/env node
/**
 * Telemetry Validator — lint source files for required instrumentation patterns.
 *
 * Scans src/ and src/mfe_packages/ for files annotated with telemetry sentinels
 * and checks that they include the required hooks/wrappers.
 *
 * Usage: node tools/telemetry-validator/telemetry-validator.mjs --mode=lint
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rulesPath = path.join(root, 'tools/telemetry-validator/validator-rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'lint';

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
// Skip telemetry package internals — we only lint consumer code
const SKIP_PATHS = ['packages/perf-telemetry', 'tools/telemetry-validator'];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_PATHS.some((skip) => full.includes(skip))) continue;
      walk(full, out);
      continue;
    }
    if (SOURCE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function hasAny(content, patterns) {
  return patterns.some((p) => content.includes(p));
}

function rel(file) {
  return path.relative(root, file);
}

// Scan src/ and src/mfe_packages/ for consumer code
const scanDirs = [
  path.join(root, 'src'),
].filter((d) => fs.existsSync(d));

const files = scanDirs.flatMap((d) => walk(d));
const errors = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Check route sentinel
  if (content.includes(rules.routeSentinel)) {
    for (const pat of rules.requiredRoutePatterns) {
      if (!content.includes(pat)) {
        errors.push(`${rel(file)}: missing route instrumentation pattern: ${pat}`);
      }
    }
  }

  // Check critical action sentinel
  if (content.includes(rules.criticalActionSentinel)) {
    for (const pat of rules.requiredActionPatterns) {
      if (!content.includes(pat)) {
        errors.push(`${rel(file)}: missing critical action instrumentation pattern: ${pat}`);
      }
    }
  }

  // Check for raw first-party fetch without wrapper
  const hasForbiddenFetch = hasAny(content, rules.forbiddenFirstPartyFetchPatterns);
  const hasAllowedWrapper = hasAny(content, rules.allowedApiWrapperPatterns);
  if (hasForbiddenFetch && !hasAllowedWrapper) {
    errors.push(`${rel(file)}: raw first-party fetch detected without instrumented wrapper`);
  }
}

if (mode !== 'lint') {
  console.log(`[telemetry-validator] unknown mode '${mode}', running lint checks.`);
}

if (errors.length > 0) {
  console.error('\nTelemetry lint failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Telemetry lint passed (${files.length} source files scanned).`);
