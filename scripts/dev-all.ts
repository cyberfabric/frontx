#!/usr/bin/env node

/**
 * Dynamic dev:all orchestrator
 *
 * Reads MFE_REGISTRY from src/app/mfe/registry.ts and automatically
 * generates the dev:all command to start all enabled MFE packages.
 *
 * This eliminates the need to manually update package.json every time
 * a new MFE is added or enabled/disabled.
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read registry.ts and parse enabled MFEs
function getEnabledMFEs(): Array<{ name: string; port: number }> {
  const registryPath = join(process.cwd(), 'src/app/mfe/registry.ts');

  try {
    const content = readFileSync(registryPath, 'utf-8');

    // Extract enabled MFEs from registry
    const enabledMFEs: Array<{ name: string; port: number }> = [];
    const lines = content.split('\n');

    let inRegistry = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Start of MFE_REGISTRY array
      if (line.includes('export const MFE_REGISTRY')) {
        inRegistry = true;
        continue;
      }

      if (!inRegistry) continue;

      // End of array
      if (line.includes('];')) {
        break;
      }

      // Look for enabled entries (skip commented lines)
      if (!line.trimStart().startsWith('//') && line.includes('enabled: true')) {
        // Walk backwards to find name and port
        let name = '';
        let port = 0;

        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          if (!name && lines[j].includes('name:')) {
            const match = lines[j].match(/name:\s*['"]([^'"]+)['"]/);
            if (match) name = match[1];
          }
          if (!port && lines[j].includes('port:')) {
            const match = lines[j].match(/port:\s*(\d+)/);
            if (match) port = parseInt(match[1], 10);
          }
          if (name && port) break;
        }

        if (name && port) {
          enabledMFEs.push({ name, port });
        }
      }
    }

    return enabledMFEs;
  } catch (error) {
    console.error('❌ Failed to read MFE_REGISTRY:', error);
    process.exit(1);
  }
}

// Build commands for enabled MFEs
function buildCommands(enabledMFEs: Array<{ name: string; port: number }>): string[] {
  const commands: string[] = [];

  // Add main app
  commands.push('npm run generate:colors && vite');

  // Add each enabled MFE
  for (const mfe of enabledMFEs) {
    commands.push(`cd src/mfe_packages/${mfe.name} && npm run dev`);
  }

  return commands;
}

// Main execution
async function main() {
  console.log('🚀 Starting dev:all...\n');

  const enabledMFEs = getEnabledMFEs();

  if (enabledMFEs.length === 0) {
    console.log('⚠️  No enabled MFEs found in registry');
    console.log('Starting main app only...\n');
  } else {
    console.log(`✅ Found ${enabledMFEs.length} enabled MFE(s):`);
    enabledMFEs.forEach((mfe, idx) => {
      console.log(`  [${idx}] ${mfe.name} (port ${mfe.port})`);
    });
    console.log();
  }

  const commands = buildCommands(enabledMFEs);

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
