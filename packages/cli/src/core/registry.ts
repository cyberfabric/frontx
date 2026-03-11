// @cpt-dod:cpt-hai3-dod-cli-tooling-command-infra:p1
import type { CommandDefinition } from './command.js';

/**
 * Registry for dynamic command loading and lookup
 */
export class CommandRegistry {
  private commands = new Map<string, CommandDefinition<unknown, unknown>>();

  /**
   * Register a command
   */
  register<TArgs, TResult>(cmd: CommandDefinition<TArgs, TResult>): void {
    if (this.commands.has(cmd.name)) {
      throw new Error(`Command '${cmd.name}' is already registered`);
    }
    this.commands.set(cmd.name, cmd as CommandDefinition<unknown, unknown>);
  }

  /**
   * Get a command by name
   */
  get<TArgs = unknown, TResult = void>(
    name: string
  ): CommandDefinition<TArgs, TResult> | undefined {
    return this.commands.get(name) as
      | CommandDefinition<TArgs, TResult>
      | undefined;
  }

  /**
   * List all registered commands
   */
  list(): CommandDefinition<unknown, unknown>[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }
}

/**
 * Global command registry instance
 */
export const registry = new CommandRegistry();
