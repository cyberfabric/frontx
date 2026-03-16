/**
 * Migrations Registry
 *
 * Central registry of all available migrations.
 * Migrations are organized by version and applied in order.
 *
 * NOTE: This file is separated from index.ts to avoid circular dependencies
 * with runner.ts
 */
// @cpt-dod:cpt-hai3-dod-cli-tooling-migrations:p2
// @cpt-state:cpt-hai3-state-cli-tooling-migration-tracker:p2

import type { Migration } from './types.js';
import { migration020 } from './0.2.0/index.js';

/**
 * All available migrations, sorted by version
 */
const migrations: Migration[] = [
  migration020,
  // Future migrations will be added here:
  // migration030,
  // migration100,
];

/**
 * Get all available migrations
 */
export function getMigrations(): Migration[] {
  return [...migrations];
}
