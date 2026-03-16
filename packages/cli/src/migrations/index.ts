/**
 * Migrations Public API
 *
 * Re-exports from registry and runner modules.
 */

// Re-export registry functions
export { getMigrations } from './registry.js';

// Re-export types
export type {
  Migration,
  Transform,
  TransformChange,
  TransformResult,
  MigrationPreview,
  MigrationResult,
  MigrationStatus,
  MigrationTracker,
  MigrationOptions,
  MigrationLogger,
  FilePreview,
  FileResult,
  AppliedMigration,
} from './types.js';

// Re-export runner functions
export {
  getMigrationStatus,
  previewMigration,
  applyMigration,
  runMigrations,
  formatResult,
} from './runner.js';
