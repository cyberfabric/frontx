import { execSync } from 'child_process';
import type { Logger } from '../core/logger.js';

/**
 * Result of a single validation step
 */
export interface ValidationStepResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Result of running all validations
 */
export interface ProjectValidationResult {
  success: boolean;
  steps: ValidationStepResult[];
}

/**
 * Options for project validation
 */
export interface ProjectValidationOptions {
  /** Project root directory */
  projectRoot: string;
  /** Logger for output */
  logger: Logger;
  /** Skip validation entirely */
  skip?: boolean;
  /** Which validations to run (defaults to all) */
  checks?: ('typeCheck' | 'lint' | 'archCheck')[];
}

/**
 * Run a single validation command
 */
function runCheck(
  name: string,
  command: string,
  projectRoot: string
): ValidationStepResult {
  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { name, success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      name,
      success: false,
      output: err.stdout,
      error: err.stderr || err.message,
    };
  }
}

/**
 * Run project validation after scaffolding commands
 *
 * This runs:
 * 1. TypeScript type checking (npm run type-check)
 * 2. ESLint (npm run lint)
 * 3. Architecture checks (npm run arch:check)
 *
 * @param options - Validation options
 * @returns Validation result
 */
export async function runProjectValidation(
  options: ProjectValidationOptions
): Promise<ProjectValidationResult> {
  const { projectRoot, logger, skip = false, checks } = options;

  if (skip) {
    logger.info('Skipping validation (--skip-validation)');
    return { success: true, steps: [] };
  }

  const steps: ValidationStepResult[] = [];
  const checksToRun = checks ?? ['typeCheck', 'lint', 'archCheck'];

  logger.newline();
  logger.info('Running validation...');
  logger.newline();

  // TypeScript check
  if (checksToRun.includes('typeCheck')) {
    logger.log('  Checking TypeScript...');
    const typeCheck = runCheck('TypeScript', 'npm run type-check', projectRoot);
    steps.push(typeCheck);
    if (typeCheck.success) {
      logger.success('  TypeScript: OK');
    } else {
      logger.error('  TypeScript: FAILED');
    }
  }

  // ESLint
  if (checksToRun.includes('lint')) {
    logger.log('  Running ESLint...');
    const lint = runCheck('ESLint', 'npm run lint', projectRoot);
    steps.push(lint);
    if (lint.success) {
      logger.success('  ESLint: OK');
    } else {
      logger.error('  ESLint: FAILED');
    }
  }

  // Architecture check
  if (checksToRun.includes('archCheck')) {
    logger.log('  Checking architecture...');
    const archCheck = runCheck('Architecture', 'npm run arch:check', projectRoot);
    steps.push(archCheck);
    if (archCheck.success) {
      logger.success('  Architecture: OK');
    } else {
      logger.error('  Architecture: FAILED');
    }
  }

  const allPassed = steps.every((s) => s.success);

  logger.newline();
  if (allPassed) {
    logger.success('All validations passed!');
  } else {
    logger.error('Validation failed. Run `hai3 validate` for details.');
    logger.info('Tip: Use `/hai3-fix-violation` to fix common issues.');
  }

  return {
    success: allPassed,
    steps,
  };
}

/**
 * Common option definition for --skip-validation flag
 */
export const skipValidationOption = {
  name: 'skip-validation',
  description: 'Skip post-scaffolding validation',
  type: 'boolean' as const,
  defaultValue: false,
};
