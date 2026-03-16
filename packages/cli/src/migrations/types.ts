/**
 * Migration System Types
 *
 * Defines interfaces for HAI3's codemod-based migration system.
 * Uses ts-morph for TypeScript-native AST manipulation.
 */

import type { SourceFile } from 'ts-morph';

/**
 * A single code transformation within a migration
 */
export interface Transform {
  /** Unique identifier within the migration (e.g., "uicore-to-react") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this transform does */
  description: string;
  /**
   * Check if this transform applies to a source file
   * @returns true if the file should be transformed
   */
  canApply: (sourceFile: SourceFile) => boolean;
  /**
   * Preview changes without modifying the file
   * @returns Array of changes that would be made
   */
  preview: (sourceFile: SourceFile) => TransformChange[];
  /**
   * Apply the transformation to a source file
   * @returns Result of the transformation
   */
  apply: (sourceFile: SourceFile) => TransformResult;
}

/**
 * A change to be made or that was made to a file
 */
export interface TransformChange {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column?: number;
  /** Original code */
  before: string;
  /** New code */
  after: string;
  /** Description of the change */
  description: string;
}

/**
 * Result of applying a transform to a file
 */
export interface TransformResult {
  /** Whether the transform was applied successfully */
  success: boolean;
  /** Number of changes made */
  changesApplied: number;
  /** Warnings encountered */
  warnings: string[];
  /** Errors encountered */
  errors: string[];
}

/**
 * A versioned migration containing multiple transforms
 */
export interface Migration {
  /** Migration identifier (e.g., "0.2.0-sdk-architecture") */
  id: string;
  /** Semantic version this migration targets */
  version: string;
  /** Human-readable name */
  name: string;
  /** Description of what this migration does */
  description: string;
  /** Ordered list of transforms to apply */
  transforms: Transform[];
}

/**
 * Result of a dry-run (preview) operation
 */
export interface MigrationPreview {
  /** Migration being previewed */
  migrationId: string;
  /** Files that would be affected */
  files: FilePreview[];
  /** Total number of files that would be modified */
  totalFilesAffected: number;
  /** Total number of changes that would be made */
  totalChanges: number;
}

/**
 * Preview of changes to a single file
 */
export interface FilePreview {
  /** Relative file path */
  path: string;
  /** Changes that would be made */
  changes: TransformChange[];
  /** Which transforms would apply */
  transforms: string[];
}

/**
 * Result of applying a migration
 */
export interface MigrationResult {
  /** Whether the migration completed successfully */
  success: boolean;
  /** Migration that was applied */
  migrationId: string;
  /** Number of files modified */
  filesModified: number;
  /** Total changes applied */
  totalChanges: number;
  /** Details per file */
  files: FileResult[];
  /** Warnings encountered */
  warnings: string[];
  /** Errors encountered */
  errors: string[];
  /** Timestamp when migration was applied */
  appliedAt: string;
}

/**
 * Result of applying transforms to a single file
 */
export interface FileResult {
  /** Relative file path */
  path: string;
  /** Whether all transforms succeeded */
  success: boolean;
  /** Number of changes applied */
  changesApplied: number;
  /** Transforms that were applied */
  transforms: string[];
}

/**
 * Record of an applied migration (stored in .hai3/migrations.json)
 */
export interface AppliedMigration {
  /** Migration ID */
  id: string;
  /** When the migration was applied */
  appliedAt: string;
  /** Number of files modified */
  filesModified: number;
  /** Per-transform statistics */
  transforms: AppliedTransformRecord[];
  /** Git commit SHA if available */
  commitSha?: string;
}

/**
 * Record of an applied transform
 */
export interface AppliedTransformRecord {
  /** Transform ID */
  id: string;
  /** Number of files this transform modified */
  filesModified: number;
}

/**
 * Migration tracker stored in .hai3/migrations.json
 */
export interface MigrationTracker {
  /** Schema version for the tracker file */
  version: '1.0.0';
  /** List of applied migrations */
  applied: AppliedMigration[];
}

/**
 * Options for running migrations
 */
export interface MigrationOptions {
  /** Target directory to migrate (default: current directory) */
  targetPath?: string;
  /** If true, preview changes without applying */
  dryRun?: boolean;
  /** Target version to migrate to */
  targetVersion?: string;
  /** Glob patterns to include */
  include?: string[];
  /** Glob patterns to exclude */
  exclude?: string[];
}

/**
 * Status of migrations for a project
 */
export interface MigrationStatus {
  /** Migrations that have been applied */
  applied: AppliedMigration[];
  /** Migrations that are available but not applied */
  pending: Migration[];
  /** Current detected project version (from package.json) */
  currentVersion?: string;
}

/**
 * Logger interface for migration output
 */
export interface MigrationLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  debug: (message: string) => void;
}
