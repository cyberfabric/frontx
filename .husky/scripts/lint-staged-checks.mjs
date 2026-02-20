#!/usr/bin/env node
/**
 * File-quality checks for lint-staged (replaces prek built-in hooks).
 * Usage: node scripts/lint-staged-checks.mjs <check> <file1> [file2 ...]
 * Checks: trailing-whitespace | end-of-file | check-json | check-yaml
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const [, , check, ...files] = process.argv;

if (!check || files.length === 0) {
  console.error('Usage: lint-staged-checks.mjs <check> <file...>');
  process.exit(1);
}

let failed = false;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    console.error(`Cannot read: ${file}`);
    failed = true;
    continue;
  }

  if (check === 'trailing-whitespace') {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/[ \t]+$/.test(lines[i])) {
        console.error(`${file}:${i + 1}: trailing whitespace`);
        failed = true;
      }
    }
  } else if (check === 'end-of-file') {
    if (content.length > 0 && !content.endsWith('\n')) {
      console.error(`${file}: no newline at end of file`);
      failed = true;
    }
  } else if (check === 'check-json') {
    try {
      JSON.parse(content);
    } catch (e) {
      console.error(`${file}: invalid JSON — ${e.message}`);
      failed = true;
    }
  } else if (check === 'check-yaml') {
    const require = createRequire(import.meta.url);
    let jsYaml;
    try {
      jsYaml = require('js-yaml');
    } catch {
      console.error('js-yaml not found in node_modules');
      process.exit(1);
    }
    try {
      jsYaml.loadAll(content);
    } catch (e) {
      console.error(`${file}: invalid YAML — ${e.message}`);
      failed = true;
    }
  } else {
    console.error(`Unknown check: ${check}`);
    process.exit(1);
  }
}

process.exit(failed ? 1 : 0);
