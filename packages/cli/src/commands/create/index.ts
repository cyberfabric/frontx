// @cpt-flow:cpt-hai3-flow-cli-tooling-create-project:p1
// @cpt-dod:cpt-hai3-dod-cli-tooling-package:p1
import fs from 'fs-extra';
import path from 'path';
import type { CommandDefinition } from '../../core/command.js';
import {
  validationOk,
  validationError,
  type LayerType,
  type PackageManager,
} from '../../core/types.js';
import {
  DEFAULT_PACKAGE_MANAGER,
  getInstallCommand,
  getRunScriptCommand,
  isSupportedPackageManager,
} from '../../core/packageManager.js';
import { generateProject } from '../../generators/project.js';
import { generateLayerPackage } from '../../generators/layerPackage.js';
import { writeGeneratedFiles } from '../../utils/fs.js';
import { isValidPackageName } from '../../utils/validation.js';
import { aiSyncCommand } from '../ai/sync.js';

/**
 * Arguments for create command
 */
export interface CreateCommandArgs {
  projectName: string;
  studio?: boolean;
  uikit?: 'hai3' | 'none';
  packageManager?: PackageManager;
  layer?: LayerType;
}

/**
 * Result of create command
 */
export interface CreateCommandResult {
  projectPath: string;
  files: string[];
}

/**
 * Create command implementation
 */
// @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-invoke-create
export const createCommand: CommandDefinition<
  CreateCommandArgs,
  CreateCommandResult
> = {
  name: 'create',
  description: 'Create a new HAI3 project',
  args: [
    {
      name: 'projectName',
      description: 'Name of the project to create',
      required: true,
    },
  ],
  options: [
    {
      name: 'studio',
      description: 'Include Studio package',
      type: 'boolean',
    },
    {
      name: 'uikit',
      description: 'UI Kit selection',
      type: 'string',
      choices: ['hai3', 'none'],
    },
    {
      name: 'layer',
      shortName: 'l',
      description: 'Create a package for a specific SDK layer (sdk, framework, react)',
      type: 'string',
      choices: ['sdk', 'framework', 'react', 'app'],
    },
    {
      name: 'package-manager',
      description: 'Package manager to use',
      type: 'string',
      choices: ['npm', 'pnpm', 'yarn'],
    },
  ],

  validate(args, ctx) {
    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-name-validation
    // @cpt-ref:cpt-hai3-algo-cli-tooling-validate-project-name:p1:inst-check-empty-name
    if (!args.projectName) {
      return validationError('MISSING_NAME', 'Project name is required');
    }

    if (!isValidPackageName(args.projectName)) {
      return validationError(
        'INVALID_NAME',
        'Invalid project name. Must be a valid npm package name.'
      );
    }

    // @cpt-begin:cpt-hai3-algo-cli-tooling-validate-project-name:p1:inst-check-layer-enum
    if (args.layer) {
      const validLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];
      if (!validLayers.includes(args.layer)) {
        return validationError(
          'INVALID_LAYER',
          `Invalid layer '${args.layer}'. Valid options: sdk, framework, react`
        );
      }
    }
    // @cpt-end:cpt-hai3-algo-cli-tooling-validate-project-name:p1:inst-check-layer-enum

    if (args.packageManager && !isSupportedPackageManager(args.packageManager)) {
      return validationError(
        'INVALID_PACKAGE_MANAGER',
        "Invalid package manager. Valid options: npm, pnpm, yarn"
      );
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-name-validation

    // Check if directory exists
    const projectPath = path.join(ctx.cwd, args.projectName);
    if (fs.existsSync(projectPath)) {
      // Will prompt for overwrite in execute
    }

    return validationOk();
  },

  async execute(args, ctx): Promise<CreateCommandResult> {
    const { logger, prompt } = ctx;
    const projectPath = path.join(ctx.cwd, args.projectName);
    const layer = args.layer ?? 'app';
    let packageManager = args.packageManager ?? DEFAULT_PACKAGE_MANAGER;

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-check-dir-exists
    // Check for existing directory
    if (await fs.pathExists(projectPath)) {
      const { overwrite } = await prompt<{ overwrite: boolean }>([
        {
          name: 'overwrite',
          type: 'confirm',
          message: `Directory '${args.projectName}' already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        throw new Error('Aborted.');
      }

      await fs.remove(projectPath);
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-check-dir-exists

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-branch-layer
    // For layer packages (sdk, framework, react), skip uikit/studio prompts
    if (layer !== 'app') {
      logger.newline();
      logger.info(`Creating ${layer}-layer package '${args.projectName}'...`);
      logger.newline();

      // Generate layer package files
      const files = await generateLayerPackage({
        packageName: args.projectName,
        layer,
        packageManager,
      });

      // Write files
      const writtenFiles = await writeGeneratedFiles(projectPath, files);
      logger.success(`Generated ${writtenFiles.length} files`);

      // Run ai sync to generate IDE config files
      logger.newline();
      logger.info('Generating AI assistant configurations...');
      try {
        await aiSyncCommand.execute(
          { tool: 'all' },
          { ...ctx, projectRoot: projectPath }
        );
      } catch {
        // Ignore errors - ai sync is optional
      }

      // Done
      logger.newline();
      logger.success(`Package '${args.projectName}' created successfully!`);
      logger.newline();
      logger.log('Next steps:');
      logger.log(`  cd ${args.projectName}`);
      logger.log(`  ${getInstallCommand(packageManager)}`);
      logger.log(`  ${getRunScriptCommand(packageManager, 'build')}`);
      logger.newline();
      logger.log(`This is a ${layer}-layer package.`);
      logger.log('See .ai/GUIDELINES.md for layer-specific rules.');
      logger.newline();

      return {
        projectPath,
        files: writtenFiles,
      };
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-branch-layer

    // App project - get configuration via prompts if not provided
    let studio = args.studio;
    let uikit = args.uikit;

    // Prompt for missing configuration
    const promptQuestions: Array<{
      name: string;
      type: 'confirm' | 'list';
      message: string;
      default?: unknown;
      choices?: Array<{ name: string; value: unknown }>;
    }> = [];

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-prompt-studio
    if (studio === undefined) {
      promptQuestions.push({
        name: 'studio',
        type: 'confirm' as const,
        message: 'Include Studio (development overlay)?',
        default: true,
      });
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-prompt-studio

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-prompt-uikit
    if (uikit === undefined) {
      promptQuestions.push({
        name: 'uikit',
        type: 'list' as const,
        message: 'Select UI kit:',
        choices: [
          { name: 'HAI3 UIKit (@hai3/uikit)', value: 'hai3' },
          { name: 'None (implement your own)', value: 'none' },
        ],
        default: 'hai3',
      });
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-prompt-uikit

    if (args.packageManager === undefined) {
      promptQuestions.push({
        name: 'packageManager',
        type: 'list' as const,
        message: 'Select package manager:',
        choices: [
          { name: 'npm (default)', value: 'npm' },
          { name: 'pnpm', value: 'pnpm' },
          { name: 'yarn', value: 'yarn' },
        ],
        default: DEFAULT_PACKAGE_MANAGER,
      });
    }

    if (promptQuestions.length > 0) {
      const answers = await prompt<{
        studio?: boolean;
        uikit?: 'hai3' | 'none';
        packageManager?: PackageManager;
      }>(promptQuestions);

      if (studio === undefined) {
        studio = answers.studio;
      }
      if (uikit === undefined) {
        uikit = answers.uikit;
      }
      if (args.packageManager === undefined) {
        packageManager = answers.packageManager ?? DEFAULT_PACKAGE_MANAGER;
      }
    }

    logger.newline();
    logger.info(`Creating project '${args.projectName}'...`);
    logger.newline();

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-generate-project
    // Generate project files (async - reads from templates)
    const files = await generateProject({
      projectName: args.projectName,
      studio: studio!,
      uikit: uikit || 'hai3',
      packageManager,
      layer,
    });
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-generate-project

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-write-files
    // Write files
    const writtenFiles = await writeGeneratedFiles(projectPath, files);
    logger.success(`Generated ${writtenFiles.length} files`);
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-write-files

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-ai-sync-after-create
    // Run ai sync to generate IDE config files
    logger.newline();
    logger.info('Generating AI assistant configurations...');
    try {
      await aiSyncCommand.execute(
        { tool: 'all' },
        { ...ctx, projectRoot: projectPath }
      );
    } catch {
      // Ignore errors - ai sync is optional
    }
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-run-ai-sync-after-create

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-log-success-create
    // Done
    logger.newline();
    logger.success(`Project '${args.projectName}' created successfully!`);
    logger.newline();
    logger.log('Next steps:');
    logger.log(`  cd ${args.projectName}`);
    logger.log('  git init');
    logger.log(`  ${getInstallCommand(packageManager)}`);
    logger.log(`  ${getRunScriptCommand(packageManager, 'dev')}`);
    logger.newline();
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-log-success-create

    // @cpt-begin:cpt-hai3-flow-cli-tooling-create-project:p1:inst-return-create
    return {
      projectPath,
      files: writtenFiles,
    };
    // @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-return-create
  },
};
// @cpt-end:cpt-hai3-flow-cli-tooling-create-project:p1:inst-invoke-create
