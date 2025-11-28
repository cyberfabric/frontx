import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CommandDefinition } from '../../core/command.js';
import { validationOk, validationError } from '../../core/types.js';

/**
 * Arguments for update command
 */
export interface UpdateCommandArgs {
  alpha?: boolean;
  stable?: boolean;
  aiOnly?: boolean;
}

/**
 * Result of update command
 */
export interface UpdateCommandResult {
  cliUpdated: boolean;
  projectUpdated: boolean;
  updatedPackages: string[];
  aiConfigsUpdated: boolean;
  aiConfigFiles: string[];
  channel: 'alpha' | 'stable';
}

/**
 * Detect the current release channel based on installed CLI version
 * @returns 'alpha' if version contains prerelease identifier, 'stable' otherwise
 */
function detectCurrentChannel(): 'alpha' | 'stable' {
  try {
    const output = execSync('npm list -g @hai3/cli --json', { stdio: 'pipe' }).toString();
    const data = JSON.parse(output);
    const version = data.dependencies?.['@hai3/cli']?.version || '';

    // Check for prerelease identifiers (alpha, beta, rc, etc.)
    if (version.includes('-alpha') || version.includes('-beta') || version.includes('-rc')) {
      return 'alpha';
    }
    return 'stable';
  } catch {
    // If detection fails, default to stable (safer)
    return 'stable';
  }
}

/**
 * Get the path to the CLI's bundled templates directory
 */
function getTemplatesDir(): string {
  // This file is at packages/cli/dist/commands/update/index.js when built
  // Templates are at packages/cli/templates/
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Navigate from dist/commands/update/ to templates/
  return path.resolve(__dirname, '../../..', 'templates');
}

/**
 * AI configuration directories to sync from templates to project
 * These are copied from bundled templates (which come from presets/standalone/ai/)
 * openspec/ is NOT synced here - it's managed by `openspec update` command
 */
const AI_CONFIG_DIRS = ['.ai', '.claude', '.cursor', '.windsurf', '.cline', '.aider'];

/**
 * Sync AI configuration files from bundled CLI templates to project
 * @param projectRoot - The root directory of the HAI3 project
 * @param logger - Logger instance for output
 * @returns Array of synced directory names
 */
async function syncAiConfigs(
  projectRoot: string,
  logger: { info: (msg: string) => void }
): Promise<string[]> {
  const templatesDir = getTemplatesDir();
  const synced: string[] = [];

  for (const dir of AI_CONFIG_DIRS) {
    const src = path.join(templatesDir, dir);
    const dest = path.join(projectRoot, dir);

    // Only sync if source exists in templates
    if (await fs.pathExists(src)) {
      try {
        // Full replacement - remove old and copy new
        await fs.remove(dest);
        await fs.copy(src, dest);
        synced.push(dir);
      } catch (err) {
        logger.info(`  Warning: Could not sync ${dir}: ${err}`);
      }
    }
  }

  return synced;
}

/**
 * Update command implementation
 */
export const updateCommand: CommandDefinition<
  UpdateCommandArgs,
  UpdateCommandResult
> = {
  name: 'update',
  description: 'Update HAI3 CLI and project packages',
  args: [],
  options: [
    {
      name: 'alpha',
      shortName: 'a',
      description: 'Update to latest alpha/prerelease version',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'stable',
      shortName: 's',
      description: 'Update to latest stable version',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'ai-only',
      description: 'Only sync AI configuration files (skip package updates)',
      type: 'boolean',
      defaultValue: false,
    },
  ],

  validate(args) {
    // Cannot specify both --alpha and --stable
    if (args.alpha && args.stable) {
      return validationError('CONFLICTING_OPTIONS', 'Cannot specify both --alpha and --stable');
    }
    return validationOk();
  },

  async execute(args, ctx): Promise<UpdateCommandResult> {
    const { logger, projectRoot } = ctx;

    let cliUpdated = false;
    let projectUpdated = false;
    let aiConfigsUpdated = false;
    const updatedPackages: string[] = [];
    const aiConfigFiles: string[] = [];

    // Determine which channel to use
    let channel: 'alpha' | 'stable';
    if (args.alpha) {
      channel = 'alpha';
    } else if (args.stable) {
      channel = 'stable';
    } else {
      // Auto-detect based on current installation
      channel = detectCurrentChannel();
    }

    const tag = channel === 'alpha' ? '@alpha' : '@latest';

    // Skip CLI and package updates if --ai-only
    if (!args.aiOnly) {
      logger.info(`Update channel: ${channel}`);
      logger.newline();

      // Update CLI
      logger.info('Checking for CLI updates...');
      try {
        execSync(`npm install -g @hai3/cli${tag}`, { stdio: 'pipe' });
        cliUpdated = true;
        logger.success(`@hai3/cli updated (${channel})`);
      } catch {
        logger.info('@hai3/cli is already up to date');
      }

      // If inside a project, update project packages
      if (projectRoot) {
        logger.newline();
        logger.info('Updating project HAI3 packages...');

        const packageJsonPath = path.join(projectRoot, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        const hai3Packages: string[] = [];

        // Find all @hai3/* packages
        for (const dep of Object.keys(packageJson.dependencies || {})) {
          if (dep.startsWith('@hai3/')) {
            hai3Packages.push(dep);
          }
        }
        for (const dep of Object.keys(packageJson.devDependencies || {})) {
          if (dep.startsWith('@hai3/')) {
            hai3Packages.push(dep);
          }
        }

        if (hai3Packages.length > 0) {
          const packagesToUpdate = [...new Set(hai3Packages)];
          logger.info(`Found ${packagesToUpdate.length} HAI3 packages to update`);

          try {
            // Install each package with the appropriate tag
            const packagesWithTag = packagesToUpdate.map(pkg => `${pkg}${tag}`);
            const updateCmd = `npm install ${packagesWithTag.join(' ')}`;
            execSync(updateCmd, { cwd: projectRoot, stdio: 'inherit' });
            projectUpdated = true;
            updatedPackages.push(...packagesToUpdate);
            logger.success(`Project packages updated (${channel})`);
          } catch {
            logger.warn('Failed to update some packages');
          }
        } else {
          logger.info('No HAI3 packages found in project');
        }
      } else {
        logger.newline();
        logger.info('Not inside a HAI3 project. Only CLI was updated.');
        logger.info('Run `hai3 update` from a project directory to update project packages.');
      }
    }

    // Sync AI configuration files if inside a project
    if (projectRoot) {
      logger.newline();
      logger.info('Syncing AI configuration files...');

      const syncedFiles = await syncAiConfigs(projectRoot, logger);
      if (syncedFiles.length > 0) {
        aiConfigsUpdated = true;
        aiConfigFiles.push(...syncedFiles);
        logger.success(`AI configs updated: ${syncedFiles.join(', ')}`);
      } else {
        logger.info('AI configs are already up to date');
      }
    }

    logger.newline();
    logger.success('Update complete!');

    return {
      cliUpdated,
      projectUpdated,
      updatedPackages,
      aiConfigsUpdated,
      aiConfigFiles,
      channel,
    };
  },
};
