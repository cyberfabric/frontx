// Shared helper used by repo-level dev scripts (dev-all, generate-mfe-manifests,
// run-mfe-type-checks) to enumerate the MFE root directories declared in a
// FrontX project's frontx.config.json.
//
// IMPORTANT: this file is the source of truth for the FrontX monorepo's own
// dev scripts only. The same logic is intentionally inlined inside the
// `template-sources/project/scripts/` copies — those files become standalone
// scripts in scaffolded user projects and cannot import from this directory.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Return the deduplicated list of MFE root directories (relative to projectCwd)
 * to scan. Always starts with the legacy "src/mfe_packages" for backwards
 * compatibility. Adds mfeRoot and each entry from mfeRoots[] from
 * frontx.config.json when present. Falls back to the default list on any
 * config read or parse error.
 *
 * @param {string} projectCwd  Absolute path to the project root.
 * @returns {string[]}         Relative MFE root paths, deduplicated.
 */
export function getMfeRootsSync(projectCwd) {
  const defaults = ['src/mfe_packages'];
  try {
    const configPath = path.join(projectCwd, 'frontx.config.json');
    if (!existsSync(configPath)) return defaults;
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    /** @type {string[]} */
    const extra = [];
    if (typeof config.mfeRoot === 'string' && config.mfeRoot) extra.push(config.mfeRoot);
    if (Array.isArray(config.mfeRoots)) {
      for (const r of config.mfeRoots) {
        if (typeof r === 'string' && r) extra.push(r);
      }
    }
    return [...new Set([...defaults, ...extra])];
  } catch {
    return defaults;
  }
}
