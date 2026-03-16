#!/usr/bin/env node

/**
 * HAI3 SDK Layer Architecture Tests
 * Tests that the SDK layer packages follow the 3-layer architecture
 *
 * These tests verify:
 * - SDK packages (L1) have ZERO @hai3 dependencies
 * - Framework package (L2) only imports SDK packages
 * - React package (L3) only imports framework
 * - No package depends on deprecated @hai3/uikit-contracts
 * - Layer configs include all parent layer rules
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  skipped?: boolean;
}

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readPackageJson(packagePath: string): PackageJson | null {
  const pkgPath = join(packagePath, 'package.json');
  if (!existsSync(pkgPath)) {
    return null;
  }
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function getHai3Dependencies(pkg: PackageJson): string[] {
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.peerDependencies,
  };
  return Object.keys(allDeps).filter((dep) => dep.startsWith('@hai3/'));
}

// SDK packages that should have ZERO @hai3 dependencies
// Note: @hai3/events + @hai3/store were consolidated into @hai3/state
// Note: @hai3/layout was deleted, layout slices now in @hai3/framework
const SDK_PACKAGES = ['state', 'api', 'i18n', 'screensets'];

// Framework can only import these SDK packages
const ALLOWED_SDK_DEPS = [
  '@hai3/state',      // Consolidated from @hai3/events + @hai3/store
  '@hai3/api',
  '@hai3/i18n',
  '@hai3/screensets', // Screenset contracts and registry
];

// Deprecated packages that should not be imported
const DEPRECATED_PACKAGES = [
  '@hai3/uikit-contracts',  // Theme types now in @hai3/framework
  '@hai3/uicore',           // Consolidated into @hai3/framework
  '@hai3/layout',           // Layout slices now in @hai3/framework
];

/**
 * Test: SDK packages have zero @hai3 dependencies
 */
function testSdkZeroDependencies(): TestResult[] {
  const results: TestResult[] = [];

  for (const pkgName of SDK_PACKAGES) {
    const pkgPath = join(process.cwd(), 'packages', pkgName);
    const pkg = readPackageJson(pkgPath);

    if (!pkg) {
      results.push({
        name: `SDK @hai3/${pkgName}: Zero @hai3 deps`,
        passed: true,
        message: `Package not yet created (will be created in Phase 3)`,
        skipped: true,
      });
      continue;
    }

    const hai3Deps = getHai3Dependencies(pkg);
    const passed = hai3Deps.length === 0;

    results.push({
      name: `SDK @hai3/${pkgName}: Zero @hai3 deps`,
      passed,
      message: passed
        ? 'No @hai3 dependencies found'
        : `Found @hai3 dependencies: ${hai3Deps.join(', ')}`,
    });
  }

  return results;
}

/**
 * Test: Framework package only imports SDK packages
 */
function testFrameworkOnlySdkDeps(): TestResult {
  const pkgPath = join(process.cwd(), 'packages', 'framework');
  const pkg = readPackageJson(pkgPath);

  if (!pkg) {
    return {
      name: 'Framework: Only SDK dependencies',
      passed: true,
      message: 'Package not yet created (will be created in Phase 4)',
      skipped: true,
    };
  }

  const hai3Deps = getHai3Dependencies(pkg);
  const invalidDeps = hai3Deps.filter((dep) => !ALLOWED_SDK_DEPS.includes(dep));
  const passed = invalidDeps.length === 0;

  return {
    name: 'Framework: Only SDK dependencies',
    passed,
    message: passed
      ? `Valid deps: ${hai3Deps.join(', ') || 'none'}`
      : `Invalid deps: ${invalidDeps.join(', ')}`,
  };
}

/**
 * Test: React package only imports framework
 */
function testReactOnlyFrameworkDep(): TestResult {
  const pkgPath = join(process.cwd(), 'packages', 'react');
  const pkg = readPackageJson(pkgPath);

  if (!pkg) {
    return {
      name: 'React: Only framework dependency',
      passed: true,
      message: 'Package not yet created (will be created in Phase 4)',
      skipped: true,
    };
  }

  const hai3Deps = getHai3Dependencies(pkg);
  const invalidDeps = hai3Deps.filter((dep) => dep !== '@hai3/framework');
  const passed = invalidDeps.length === 0;

  return {
    name: 'React: Only framework dependency',
    passed,
    message: passed
      ? `Valid deps: ${hai3Deps.join(', ') || 'none'}`
      : `Invalid deps: ${invalidDeps.join(', ')}`,
  };
}

/**
 * Test: No package depends on deprecated packages
 */
function testNoDeprecatedDependencies(): TestResult[] {
  const results: TestResult[] = [];
  const packagesToCheck = [...SDK_PACKAGES, 'framework', 'react'];

  for (const pkgName of packagesToCheck) {
    const pkgPath = join(process.cwd(), 'packages', pkgName);
    const pkg = readPackageJson(pkgPath);

    if (!pkg) {
      results.push({
        name: `@hai3/${pkgName}: No deprecated deps`,
        passed: true,
        message: 'Package not yet created',
        skipped: true,
      });
      continue;
    }

    const hai3Deps = getHai3Dependencies(pkg);
    const deprecatedDeps = hai3Deps.filter((dep) =>
      DEPRECATED_PACKAGES.includes(dep)
    );
    const passed = deprecatedDeps.length === 0;

    results.push({
      name: `@hai3/${pkgName}: No deprecated deps`,
      passed,
      message: passed
        ? 'No deprecated dependencies'
        : `Found deprecated deps: ${deprecatedDeps.join(', ')}`,
    });
  }

  return results;
}

/**
 * Test: Layered config packages exist
 */
function testLayeredConfigsExist(): TestResult[] {
  const results: TestResult[] = [];

  // ESLint config package (in internal/, compiled to dist/)
  const eslintConfigPath = join(process.cwd(), 'internal', 'eslint-config', 'dist');
  const eslintConfigFiles = ['base.js', 'sdk.js', 'framework.js', 'react.js', 'screenset.js'];

  for (const file of eslintConfigFiles) {
    const filePath = join(eslintConfigPath, file);
    const exists = existsSync(filePath);
    results.push({
      name: `ESLint config: ${file}`,
      passed: exists,
      message: exists ? 'File exists' : 'File not found',
    });
  }

  // Depcruise config package (in internal/)
  const depcruiseConfigPath = join(process.cwd(), 'internal', 'depcruise-config');
  const depcruiseConfigFiles = ['base.cjs', 'sdk.cjs', 'framework.cjs', 'react.cjs', 'screenset.cjs'];

  for (const file of depcruiseConfigFiles) {
    const filePath = join(depcruiseConfigPath, file);
    const exists = existsSync(filePath);
    results.push({
      name: `Depcruise config: ${file}`,
      passed: exists,
      message: exists ? 'File exists' : 'File not found',
    });
  }

  return results;
}

/**
 * Run all SDK layer tests
 */
function runSdkLayerTests(): { results: TestResult[]; summary: { passed: number; failed: number; skipped: number } } {
  const allResults: TestResult[] = [];

  log('\n🔬 SDK Layer Architecture Tests', 'blue');
  log('='.repeat(40), 'blue');

  // Run all tests
  allResults.push(...testSdkZeroDependencies());
  allResults.push(testFrameworkOnlySdkDeps());
  allResults.push(testReactOnlyFrameworkDep());
  allResults.push(...testNoDeprecatedDependencies());
  allResults.push(...testLayeredConfigsExist());

  // Display results
  for (const result of allResults) {
    if (result.skipped) {
      log(`⏭️  ${result.name}: SKIPPED - ${result.message}`, 'yellow');
    } else if (result.passed) {
      log(`✅ ${result.name}: ${result.message}`, 'green');
    } else {
      log(`❌ ${result.name}: ${result.message}`, 'red');
    }
  }

  const summary = {
    passed: allResults.filter((r) => r.passed && !r.skipped).length,
    failed: allResults.filter((r) => !r.passed && !r.skipped).length,
    skipped: allResults.filter((r) => r.skipped).length,
  };

  return { results: allResults, summary };
}

// Main execution
function main(): void {
  const { summary } = runSdkLayerTests();

  log('\n📊 Summary', 'blue');
  log(`  ✅ Passed: ${summary.passed}`, 'green');
  log(`  ❌ Failed: ${summary.failed}`, summary.failed > 0 ? 'red' : 'green');
  log(`  ⏭️  Skipped: ${summary.skipped}`, 'yellow');

  if (summary.failed > 0) {
    log('\n💥 SDK Layer tests failed!', 'red');
    process.exit(1);
  } else {
    log('\n🎉 SDK Layer tests passed!', 'green');
    process.exit(0);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runSdkLayerTests, testSdkZeroDependencies, testFrameworkOnlySdkDeps, testReactOnlyFrameworkDep };
