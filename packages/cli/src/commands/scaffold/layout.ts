// @cpt-flow:cpt-hai3-flow-cli-tooling-scaffold-layout:p1
// @cpt-dod:cpt-hai3-dod-cli-tooling-package:p1
import path from 'path';
import type { CommandDefinition } from '../../core/command.js';
import { validationOk, validationError } from '../../core/types.js';
import {
  detectPackageManager,
  getAddPackagesCommand,
} from '../../core/packageManager.js';
import { copyLayoutTemplates } from '../../generators/layoutFromTemplate.js';
import { writeGeneratedFiles } from '../../utils/fs.js';

/**
 * Arguments for scaffold layout command
 */
export interface ScaffoldLayoutArgs {
  force?: boolean;
}

/**
 * Result of scaffold layout command
 */
export interface ScaffoldLayoutResult {
  layoutPath: string;
  files: string[];
}

/**
 * Scaffold layout command implementation
 *
 * Generates layout components (Layout, Header, Footer, Menu, etc.)
 * in the user's project from HAI3 UIKit templates.
 */
// @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-invoke-scaffold-layout
export const scaffoldLayoutCommand: CommandDefinition<
  ScaffoldLayoutArgs,
  ScaffoldLayoutResult
> = {
  name: 'scaffold:layout',
  description: 'Generate layout components in your project',
  args: [],
  options: [
    {
      name: 'force',
      shortName: 'f',
      description: 'Overwrite existing layout files',
      type: 'boolean',
      defaultValue: false,
    },
  ],

  // @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-check-project-root-scaffold
  validate(_args, ctx) {
    // Must be inside a project
    if (!ctx.projectRoot) {
      return validationError(
        'NOT_IN_PROJECT',
        'Not inside a HAI3 project. Run this command from a project root.'
      );
    }

    return validationOk();
  },
  // @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-check-project-root-scaffold

  async execute(args, ctx): Promise<ScaffoldLayoutResult> {
    const { logger, projectRoot } = ctx;
    const force = args.force ?? false;

    logger.info('Scaffolding HAI3 UIKit layout components...');
    logger.newline();

    // @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-read-layout-templates
    // Generate files from template
    const files = await copyLayoutTemplates({
      projectRoot: projectRoot!,
      force,
    });
    // @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-read-layout-templates

    // @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-check-force-flag
    // Write files (force flag already applied in copyLayoutTemplates)
    // @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-check-force-flag

    // @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files
    // Write files
    const writtenFiles = await writeGeneratedFiles(projectRoot!, files);
    // @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files

    logger.success(`Generated ${writtenFiles.length} layout files`);
    logger.newline();
    logger.log('Files created:');
    for (const file of writtenFiles) {
      logger.log(`  ${file}`);
    }
    logger.newline();

    const packageManager = (await detectPackageManager(projectRoot!, ctx.config)).manager;

    logger.info('Note: Make sure @hai3/uikit is installed:');
    logger.log(`  ${getAddPackagesCommand(packageManager, ['@hai3/uikit'])}`);
    logger.newline();

    const layoutPath = path.join(projectRoot!, 'src', 'app', 'layout');

    // @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-return-scaffold-layout
    return {
      layoutPath,
      files: writtenFiles,
    };
    // @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-return-scaffold-layout
  },
};
// @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-invoke-scaffold-layout
