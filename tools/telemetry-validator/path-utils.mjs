/**
 * Path safety helpers for telemetry validator scripts.
 *
 * Codacy's file-access rules flag any fs operation whose path argument is not
 * a literal. These validators only ever read files under the repo root, but
 * the static analyzer cannot prove that. The helpers here resolve the input
 * path against an allowed base, fail fast on traversal, and return an
 * untainted absolute path that fs operations can safely consume.
 */

import path from 'node:path';
import fs from 'node:fs';

/** Resolve `input` against `base` and require the result to live under `base`. */
export function safeResolve(base, input) {
  const absoluteBase = path.resolve(base);
  const absoluteTarget = path.resolve(absoluteBase, input);
  const rel = path.relative(absoluteBase, absoluteTarget);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes allowed root: ${input}`);
  }
  return absoluteTarget;
}

export function safeExists(base, input) {
  return fs.existsSync(safeResolve(base, input));
}

export function safeReadFile(base, input, encoding = 'utf8') {
  return fs.readFileSync(safeResolve(base, input), encoding);
}

export function safeReaddir(base, input, options) {
  return fs.readdirSync(safeResolve(base, input), options);
}
