/**
 * Core CLI infrastructure exports
 */

export type { CommandContext, CommandDefinition } from './command.js';
export type {
  Hai3Config,
  ConfigLoadResult,
  PackageManager,
  ScreensetCategory,
  ArgDefinition,
  OptionDefinition,
  ValidationError,
  ValidationResult,
  CommandResult,
  ExecutionMode,
  GeneratedFile,
} from './types.js';
export { validationOk, validationError } from './types.js';
export {
  SUPPORTED_PACKAGE_MANAGERS,
  DEFAULT_PACKAGE_MANAGER,
  PACKAGE_MANAGER_POLICY,
  isSupportedPackageManager,
  parsePackageManagerField,
  packageManagerFieldValue,
  getPackageManagerEngineRange,
  getPackageManagerEngines,
  detectPackageManager,
  getInstallCommand,
  getCiInstallCommand,
  getRunScriptCommand,
  getWorkspaceRunScriptCommand,
  getExecCommand,
  getAddPackagesCommand,
  getGlobalInstallCommand,
  getManagerWorkspaceFiles,
  transformPackageManagerText,
} from './packageManager.js';
export { Logger } from './logger.js';
export type { PromptFn, PromptQuestion } from './prompt.js';
export { createInteractivePrompt, createProgrammaticPrompt } from './prompt.js';
export { CommandRegistry, registry } from './registry.js';
export { executeCommand, buildCommandContext } from './executor.js';
export type { TemplateLogger } from './templates.js';
export { getTemplatesDir, syncTemplates } from './templates.js';
