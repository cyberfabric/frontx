import type { Logger } from './logger.js';
import type { PromptFn } from './prompt.js';
import type {
  Hai3Config,
  ArgDefinition,
  OptionDefinition,
  ValidationResult,
} from './types.js';

/**
 * Context available to all commands during execution
 */
export interface CommandContext {
  /** Current working directory */
  cwd: string;
  /** HAI3 project root (null if outside project) */
  projectRoot: string | null;
  /** HAI3 config (null if outside project) */
  config: Hai3Config | null;
  /** Logger for output */
  logger: Logger;
  /** Prompt function for user input */
  prompt: PromptFn;
}

/**
 * Command definition interface
 * All commands must implement this interface
 */
export interface CommandDefinition<TArgs = unknown, TResult = void> {
  /** Command name (used in CLI and registry) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Positional arguments */
  args: ArgDefinition[];
  /** Named options/flags */
  options: OptionDefinition[];

  /**
   * Validate arguments before execution
   * @param args - Parsed arguments
   * @param ctx - Command context
   * @returns Validation result
   */
  validate(args: TArgs, ctx: CommandContext): ValidationResult;

  /**
   * Execute the command
   * @param args - Validated arguments
   * @param ctx - Command context
   * @returns Command result for programmatic use
   */
  execute(args: TArgs, ctx: CommandContext): Promise<TResult>;
}
