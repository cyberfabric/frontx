#!/usr/bin/env node

/**
 * Dynamic dev:all orchestrator
 *
 * Scans src/mfe_packages/ for MFE packages and automatically starts
 * all found packages in parallel with the main app.
 *
 * Port discovery: reads each package's package.json preview (or dev) script
 * for a --port NNNN argument. No separate registry file required.
 */

import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Packages to skip (templates, blanks, shared libraries)
const EXCLUDED_PACKAGES = new Set(['_blank-mfe', 'shared']);

interface MfeInfo {
  name: string;
  port: number;
  /** Absolute path to the root directory containing this MFE */
  rootDir: string;
}

type PackageManager = 'npm' | 'pnpm' | 'yarn';

/**
 * Return the deduplicated list of MFE root directories (relative to cwd) to scan.
 * Always starts with the legacy "src/mfe_packages".
 * Adds mfeRoot and mfeRoots[] from frontx.config.json when present.
 * Falls back to default on any config read/parse error.
 */
function getMfeRootsSync(projectCwd: string): string[] {
  const defaults = ['src/mfe_packages'];
  try {
    const configPath = join(projectCwd, 'frontx.config.json');
    if (!existsSync(configPath)) return defaults;
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      mfeRoot?: unknown;
      mfeRoots?: unknown;
    };
    const extra: string[] = [];
    if (typeof config.mfeRoot === 'string' && config.mfeRoot) extra.push(config.mfeRoot);
    if (Array.isArray(config.mfeRoots)) {
      for (const r of config.mfeRoots) {
        if (typeof r === 'string' && r) extra.push(r);
      }
    }
    return [...new Set([...defaults, ...extra])];
  } catch {
    return defaults;
  }
}

// Scan all MFE root directories and extract port from each package's scripts
function getMFEPackages(): MfeInfo[] {
  const roots = getMfeRootsSync(process.cwd());
  const mfes: MfeInfo[] = [];

  for (const root of roots) {
    const dir = join(process.cwd(), root);
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (EXCLUDED_PACKAGES.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const pkgJsonPath = join(dir, entry.name, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;

      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
          scripts?: Record<string, string>;
        };
        const scripts = pkgJson.scripts ?? {};

        // Try preview first (stable port source), fall back to dev
        const portSource = scripts['preview'] ?? scripts['dev'] ?? '';
        const portMatch = portSource.match(/--port\s+(\d+)/);

        if (!portMatch) {
          console.warn(`⚠️  Could not find --port in scripts for ${entry.name}, skipping`);
          continue;
        }

        const port = parseInt(portMatch[1], 10);
        mfes.push({ name: entry.name, port, rootDir: dir });
      } catch (e) {
        console.warn(`⚠️  Failed to read package.json for ${entry.name}:`, e);
      }
    }
  }

  return mfes;
}

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-detect-package-manager
function getPackageManager(): PackageManager {
  const rootPkgPath = join(process.cwd(), 'package.json');
  try {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8')) as {
      packageManager?: string;
      scripts?: Record<string, string>;
    };
    const managerId = rootPkg.packageManager?.split('@')[0];
    if (managerId === 'pnpm' || managerId === 'yarn') {
      return managerId;
    }
  } catch {
    // ignore and use default
  }
  return 'npm';
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-detect-package-manager

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-commands
function runScriptCommand(packageManager: PackageManager, scriptName: string): string {
  if (packageManager === 'yarn') {
    return `yarn ${scriptName}`;
  }
  return `${packageManager} run ${scriptName}`;
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-commands

// Determine main app command based on available scripts
function getMainAppCommand(packageManager: PackageManager): string {
  const rootPkgPath = join(process.cwd(), 'package.json');
  try {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    if (rootPkg.scripts?.['generate:colors']) {
      return `${runScriptCommand(packageManager, 'generate:colors')} && vite`;
    }
  } catch {
    // ignore — fall through to default
  }
  return 'vite';
}

// Build commands for main app + all MFEs
function buildCommands(mfes: MfeInfo[], packageManager: PackageManager): string[] {
  const commands: string[] = [];

  // Add main app
  commands.push(getMainAppCommand(packageManager));

  // MFEs use "build && preview" because @module-federation/vite
  // generates remoteEntry.js and mf-manifest.json at build time, not in dev mode.
  // Each command is produced by `runScriptCommand` so pnpm/yarn users don't
  // end up with a hardcoded `npm run preview` tail mixed into the chain.
  // Use mfe.rootDir so custom-dir MFEs get the correct cd path.
  for (const mfe of mfes) {
    const build = runScriptCommand(packageManager, 'build');
    const preview = runScriptCommand(packageManager, 'preview');
    commands.push(`cd ${mfe.rootDir}/${mfe.name} && ${build} && ${preview}`);
  }

  return commands;
}

// Main execution
async function main() {
  console.log('🚀 Starting dev:all...\n');

  const mfes = getMFEPackages();

  if (mfes.length === 0) {
    console.log('ℹ️  No MFE packages found in any configured MFE root directory.');
    console.log('Starting main app only...\n');
  } else {
    console.log(`✅ Found ${mfes.length} MFE package(s):`);
    mfes.forEach((mfe, idx) => {
      console.log(`  [${idx}] ${mfe.name} (port ${mfe.port})`);
    });
    console.log();
  }

  const packageManager = getPackageManager();
  const commands = buildCommands(mfes, packageManager);

  // Quote each command properly for concurrently
  const quotedCommands = commands.map((cmd) => `"${cmd.replace(/"/g, '\\"')}"`);

  // Build concurrently command
  const concurrentlyCmd = ['concurrently', '--kill-others', ...quotedCommands];

  console.log(`📝 Running: ${concurrentlyCmd.join(' ')}\n`);

  // Execute concurrently
  const proc = spawn('npx', concurrentlyCmd, {
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (error) => {
    console.error('❌ Failed to start dev:all:', error);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
