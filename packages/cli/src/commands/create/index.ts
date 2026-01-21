import fs from 'fs-extra';
import path from 'path';
import type { CommandDefinition } from '../../core/command.js';
import { validationOk, validationError, type LayerType } from '../../core/types.js';
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
  ],

  validate(args, ctx) {
    // Validate project name
    if (!args.projectName) {
      return validationError('MISSING_NAME', 'Project name is required');
    }

    if (!isValidPackageName(args.projectName)) {
      return validationError(
        'INVALID_NAME',
        'Invalid project name. Must be a valid npm package name.'
      );
    }

    // Validate layer parameter
    if (args.layer) {
      const validLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];
      if (!validLayers.includes(args.layer)) {
        return validationError(
          'INVALID_LAYER',
          `Invalid layer '${args.layer}'. Valid options: sdk, framework, react`
        );
      }
    }

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

    // For layer packages (sdk, framework, react), skip uikit/studio prompts
    if (layer !== 'app') {
      logger.newline();
      logger.info(`Creating ${layer}-layer package '${args.projectName}'...`);
      logger.newline();

      // Generate layer package files
      const files = await generateLayerPackage({
        packageName: args.projectName,
        layer,
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
      logger.log('  npm install');
      logger.log('  npm run build');
      logger.newline();
      logger.log(`This is a ${layer}-layer package.`);
      logger.log('See .ai/GUIDELINES.md for layer-specific rules.');
      logger.newline();

      return {
        projectPath,
        files: writtenFiles,
      };
    }

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

    if (studio === undefined) {
      promptQuestions.push({
        name: 'studio',
        type: 'confirm' as const,
        message: 'Include Studio (development overlay)?',
        default: true,
      });
    }

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

    if (promptQuestions.length > 0) {
      const answers = await prompt<{
        studio?: boolean;
        uikit?: 'hai3' | 'none';
      }>(promptQuestions);

      if (studio === undefined) {
        studio = answers.studio;
      }
      if (uikit === undefined) {
        uikit = answers.uikit;
      }
    }

    logger.newline();
    logger.info(`Creating project '${args.projectName}'...`);
    logger.newline();

    // Generate project files (async - reads from templates)
    const files = await generateProject({
      projectName: args.projectName,
      studio: studio!,
      uikit: uikit || 'hai3',
      layer,
    });

    // Write files
    const writtenFiles = await writeGeneratedFiles(projectPath, files);
    logger.success(`Generated ${writtenFiles.length} files`);

    // Display message if demo screenset was excluded
    if (uikit === 'none') {
      logger.newline();
      logger.warn('Demo screenset excluded (requires @hai3/uikit).');
      logger.log('Create your own screenset with `hai3 screenset create`.');
    }

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
    logger.success(`Project '${args.projectName}' created successfully!`);
    logger.newline();
    logger.log('Next steps:');
    logger.log(`  cd ${args.projectName}`);
    logger.log('  git init');
    logger.log('  npm install');
    logger.log('  npm run dev');
    logger.newline();

    return {
      projectPath,
      files: writtenFiles,
    };
  },
};
