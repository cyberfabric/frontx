/**
 * Command exports
 */

export { createCommand } from './create/index.js';
export type { CreateCommandArgs, CreateCommandResult } from './create/index.js';

export { updateCommand } from './update/index.js';
export type { UpdateCommandArgs, UpdateCommandResult } from './update/index.js';

export { validateComponentsCommand } from './validate/index.js';
export type {
  ValidateComponentsArgs,
  ValidateComponentsResult,
  ComponentViolation,
} from './validate/index.js';

export { scaffoldLayoutCommand } from './scaffold/layout.js';
export type {
  ScaffoldLayoutArgs,
  ScaffoldLayoutResult,
} from './scaffold/layout.js';

export { aiSyncCommand } from './ai/sync.js';
export type {
  AiSyncArgs,
  AiSyncResult,
  AiTool,
} from './ai/sync.js';

export { updateLayoutCommand } from './update/layout.js';
export type {
  UpdateLayoutArgs,
  UpdateLayoutResult,
} from './update/layout.js';

export { migrateCommand } from './migrate/index.js';
export type {
  MigrateCommandArgs,
  MigrateCommandResult,
} from './migrate/index.js';
