/**
 * Core type definitions for HAI3 CLI
 */

/**
 * Layer types for SDK architecture
 */
export type LayerType = 'sdk' | 'framework' | 'react' | 'app';

/**
 * HAI3 project configuration stored in hai3.config.json
 * This file serves as a project marker for CLI detection.
 */
export interface Hai3Config {
  /** Marker to identify HAI3 projects */
  hai3: true;
  /** Project layer (SDK architecture tier) */
  layer?: LayerType;
  /** UI Kit selection: 'none' means no UIKit, any other string is the UIKit identifier */
  uikit?: string;
}

/**
 * Screenset category enum matching uicore's ScreensetCategory
 */
export type ScreensetCategory = 'drafts' | 'mockups' | 'production';

/**
 * Argument definition for commands
 */
export interface ArgDefinition {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Option definition for commands
 */
export interface OptionDefinition {
  name: string;
  shortName?: string;
  description: string;
  type: 'string' | 'boolean';
  defaultValue?: string | boolean;
  choices?: string[];
}

/**
 * Validation error with code for programmatic handling
 */
export interface ValidationError {
  code: string;
  message: string;
}

/**
 * Result of command validation
 */
export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

/**
 * Successful validation result
 */
export function validationOk(): ValidationResult {
  return { ok: true, errors: [] };
}

/**
 * Failed validation result
 */
export function validationError(code: string, message: string): ValidationResult {
  return { ok: false, errors: [{ code, message }] };
}

/**
 * Command execution result
 */
export type CommandResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Execution mode for commands
 */
export interface ExecutionMode {
  /** If false, skip interactive prompts and use provided answers */
  interactive: boolean;
  /** Pre-filled answers for prompts (used when interactive: false) */
  answers?: Record<string, unknown>;
}

/**
 * Generated file output
 */
export interface GeneratedFile {
  path: string;
  content: string;
}
