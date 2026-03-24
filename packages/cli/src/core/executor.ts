// @cpt-state:cpt-hai3-state-cli-tooling-command-lifecycle:p1
// @cpt-dod:cpt-hai3-dod-cli-tooling-command-infra:p1
import type { CommandDefinition, CommandContext } from './command.js';
import type { CommandResult, ExecutionMode } from './types.js';
import { Logger } from './logger.js';
import { createInteractivePrompt, createProgrammaticPrompt } from './prompt.js';
import { findProjectRoot, loadConfig } from '../utils/project.js';

/**
 * Build command context based on execution mode
 */
async function buildContext(mode: ExecutionMode): Promise<CommandContext> {
  const cwd = process.cwd();
  const projectRoot = await findProjectRoot(cwd);
  const configResult = projectRoot ? await loadConfig(projectRoot) : null;
  const config = configResult?.ok ? configResult.config : null;

  const logger = mode.interactive ? new Logger() : Logger.silent();
  const prompt = mode.interactive
    ? createInteractivePrompt()
    : createProgrammaticPrompt(mode.answers ?? {});

  return {
    cwd,
    projectRoot,
    config,
    logger,
    prompt,
  };
}

/**
 * Execute a command with the given arguments and mode
 *
 * @param command - Command definition to execute
 * @param args - Arguments to pass to the command
 * @param mode - Execution mode (interactive or programmatic)
 * @returns Command result with success/failure and data
 */
export async function executeCommand<TArgs, TResult>(
  command: CommandDefinition<TArgs, TResult>,
  args: TArgs,
  mode: ExecutionMode = { interactive: true }
): Promise<CommandResult<TResult>> {
  // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-context-built
  const ctx = await buildContext(mode);
  // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-context-built

  // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-validated
  // Validate arguments
  const validation = command.validate(args, ctx);
  if (!validation.ok) {
    // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-validated-failed
    for (const error of validation.errors) {
      ctx.logger.error(error.message);
    }
    return { success: false, errors: validation.errors };
    // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-validated-failed
  }
  // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-validated

  // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-executing
  // Execute command
  try {
    const result = await command.execute(args, ctx);
    // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-succeeded
    return { success: true, data: result };
    // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-succeeded
  } catch (error) {
    // @cpt-begin:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-failed
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger.error(message);
    return {
      success: false,
      errors: [{ code: 'EXECUTION_ERROR', message }],
    };
    // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-failed
  }
  // @cpt-end:cpt-hai3-state-cli-tooling-command-lifecycle:p1:inst-to-executing
}

/**
 * Build context for testing or external use
 */
export async function buildCommandContext(
  mode: ExecutionMode = { interactive: true }
): Promise<CommandContext> {
  return buildContext(mode);
}
