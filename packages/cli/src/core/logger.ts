import chalk from 'chalk';

/**
 * Logger with colored output, can be silenced for programmatic use
 */
export class Logger {
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  /**
   * Create a silent logger (for programmatic use)
   */
  static silent(): Logger {
    return new Logger(true);
  }

  /**
   * Informational message
   */
  info(message: string): void {
    if (!this.silent) {
      console.log(chalk.blue('info'), message);
    }
  }

  /**
   * Success message
   */
  success(message: string): void {
    if (!this.silent) {
      console.log(chalk.green('success'), message);
    }
  }

  /**
   * Warning message
   */
  warn(message: string): void {
    if (!this.silent) {
      console.log(chalk.yellow('warn'), message);
    }
  }

  /**
   * Error message
   */
  error(message: string): void {
    if (!this.silent) {
      console.error(chalk.red('error'), message);
    }
  }

  /**
   * Plain message without prefix
   */
  log(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  /**
   * Newline
   */
  newline(): void {
    if (!this.silent) {
      console.log();
    }
  }

  /**
   * Step indicator for multi-step operations
   */
  step(current: number, total: number, message: string): void {
    if (!this.silent) {
      console.log(chalk.cyan(`[${current}/${total}]`), message);
    }
  }

  /**
   * Debug message (dimmed, only shown in verbose mode)
   */
  debug(message: string): void {
    if (!this.silent) {
      console.log(chalk.dim('debug'), chalk.dim(message));
    }
  }
}
