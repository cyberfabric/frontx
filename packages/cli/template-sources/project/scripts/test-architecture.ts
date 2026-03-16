#!/usr/bin/env node

/**
 * HAI3 Architecture Validation Script (Standalone)
 * Tests that the codebase follows HAI3 architectural patterns
 *
 * This is the single source of truth for standalone project architecture tests.
 * - Monorepo extends this via presets/monorepo/scripts/test-architecture.ts
 * - CLI copies this to new projects via copy-templates.ts
 */

import { execSync } from 'child_process';

interface Colors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  reset: string;
}

const colors: Colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message: string, color: keyof Colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

function runCommand(command: string, description: string): boolean {
  log(`🔍 ${description}...`, 'blue');

  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} - PASSED`, 'green');
    return true;
  } catch (error: unknown) {
    log(`❌ ${description} - FAILED`, 'red');
    const err = error as { stdout?: Buffer; stderr?: Buffer };
    if (err.stdout) {
      console.log(err.stdout.toString());
    }
    if (err.stderr) {
      console.error(err.stderr.toString());
    }
    return false;
  }
}

interface ValidationResult {
  passed: number;
  total: number;
  success: boolean;
}

interface ArchCheck {
  command: string;
  description: string;
}

/**
 * Standalone architecture checks
 * These run in all HAI3 projects (standalone and monorepo)
 */
function getStandaloneChecks(): ArchCheck[] {
  return [
    { command: 'npm run generate:colors', description: 'Generate theme colors' },
    { command: 'npm run lint -- --max-warnings 0', description: 'ESLint rules' },
    { command: 'npm run type-check', description: 'TypeScript type check' },
    { command: 'npm run arch:deps', description: 'Dependency rules' },
  ];
}

/**
 * Run architecture validation with the given checks
 */
function runValidation(checks: ArchCheck[], title: string): ValidationResult {
  log(`🏗️ ${title}`, 'blue');
  log('='.repeat(title.length + 4), 'blue');

  const results: boolean[] = [];

  for (const check of checks) {
    results.push(runCommand(check.command, check.description));
  }

  const passed = results.filter(result => result === true).length;
  const total = results.length;
  const success = passed === total;

  return { passed, total, success };
}

/**
 * Run standalone architecture validation
 */
function validateArchitecture(): ValidationResult {
  return runValidation(getStandaloneChecks(), 'HAI3 Architecture Validation');
}

function displayResults({ passed, total, success }: ValidationResult): void {
  if (success) {
    log(`🎉 ALL CHECKS PASSED (${passed}/${total})`, 'green');
    log('Architecture is compliant! 🏛️', 'green');
    process.exit(0);
  } else {
    log(`💥 ${total - passed} CHECKS FAILED (${passed}/${total})`, 'red');
    log('Architecture violations detected! 🚨', 'red');
    process.exit(1);
  }
}

// Main execution
function main(): void {
  const results = validateArchitecture();
  displayResults(results);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runCommand, runValidation, getStandaloneChecks, validateArchitecture, displayResults, log };
export type { CommandResult, ValidationResult, ArchCheck };
