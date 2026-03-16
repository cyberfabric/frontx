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

const MFE_PACKAGES_DIR = join(process.cwd(), 'src/mfe_packages');

// Packages to skip (templates, blanks, shared libraries)
const EXCLUDED_PACKAGES = new Set(['_blank-mfe', 'shared']);

interface MfeInfo {
  name: string;
  port: number;
}

// Scan src/mfe_packages/ and extract port from each package's scripts
function getMFEPackages(): MfeInfo[] {
  if (!existsSync(MFE_PACKAGES_DIR)) {
    return [];
  }

  const mfes: MfeInfo[] = [];
  const entries = readdirSync(MFE_PACKAGES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDED_PACKAGES.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const pkgJsonPath = join(MFE_PACKAGES_DIR, entry.name, 'package.json');
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
      mfes.push({ name: entry.name, port });
    } catch (e) {
      console.warn(`⚠️  Failed to read package.json for ${entry.name}:`, e);
    }
  }

  return mfes;
}

// Determine main app command based on available scripts
function getMainAppCommand(): string {
  const rootPkgPath = join(process.cwd(), 'package.json');
  try {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    if (rootPkg.scripts?.['generate:colors']) {
      return 'npm run generate:colors && vite';
    }
  } catch {
    // ignore — fall through to default
  }
  return 'vite';
}

// Build commands for main app + all MFEs
function buildCommands(mfes: MfeInfo[]): string[] {
  const commands: string[] = [];

  // Add main app
  commands.push(getMainAppCommand());

  // Add each MFE
  for (const mfe of mfes) {
    commands.push(`cd src/mfe_packages/${mfe.name} && npm run dev`);
  }

  return commands;
}

// Main execution
async function main() {
  console.log('🚀 Starting dev:all...\n');

  const mfes = getMFEPackages();

  if (mfes.length === 0) {
    console.log('ℹ️  No MFE packages found in src/mfe_packages/');
    console.log('Starting main app only...\n');
  } else {
    console.log(`✅ Found ${mfes.length} MFE package(s):`);
    mfes.forEach((mfe, idx) => {
      console.log(`  [${idx}] ${mfe.name} (port ${mfe.port})`);
    });
    console.log();
  }

  const commands = buildCommands(mfes);

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
