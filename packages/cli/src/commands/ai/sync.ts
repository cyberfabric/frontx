import path from 'path';
import fs from 'fs-extra';
import lodash from 'lodash';
import type { CommandDefinition } from '../../core/command.js';

const { trim } = lodash;
import { validationOk, validationError } from '../../core/types.js';

/**
 * Supported AI tools for sync
 */
export type AiTool = 'claude' | 'copilot' | 'cursor' | 'windsurf' | 'all';

/**
 * Arguments for ai sync command
 */
export interface AiSyncArgs {
  tool?: AiTool;
  detectPackages?: boolean;
  diff?: boolean;
}

/**
 * Result of ai sync command
 */
export interface AiSyncResult {
  filesGenerated: string[];
  commandsGenerated: number;
  toolsUpdated: string[];
}

/**
 * Read user's custom rules from .ai/rules/app.md
 * This file is preserved across syncs
 */
async function readUserRules(projectRoot: string): Promise<string | null> {
  const appRulesPath = path.join(projectRoot, '.ai', 'rules', 'app.md');
  if (await fs.pathExists(appRulesPath)) {
    const content = await fs.readFile(appRulesPath, 'utf-8');
    return trim(content);
  }
  return null;
}

/**
 * Simple diff display between old and new content
 */
function showDiff(
  filePath: string,
  oldContent: string | null,
  newContent: string,
  logger: { log: (msg: string) => void }
): boolean {
  if (oldContent === null) {
    logger.log(`\n+ ${filePath} (new file)`);
    const lines = newContent.split('\n').slice(0, 10);
    for (const line of lines) {
      logger.log(`  + ${line}`);
    }
    if (newContent.split('\n').length > 10) {
      logger.log('  ... (truncated)');
    }
    return true;
  }

  if (oldContent === newContent) {
    logger.log(`\n= ${filePath} (unchanged)`);
    return false;
  }

  logger.log(`\n~ ${filePath} (modified)`);
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-by-line diff (show first 10 differences)
  let diffCount = 0;
  const maxDiffs = 10;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length) && diffCount < maxDiffs; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine !== newLine) {
      if (oldLine !== undefined && newLine === undefined) {
        logger.log(`  - ${oldLine}`);
      } else if (oldLine === undefined && newLine !== undefined) {
        logger.log(`  + ${newLine}`);
      } else if (oldLine !== newLine) {
        logger.log(`  - ${oldLine}`);
        logger.log(`  + ${newLine}`);
      }
      diffCount++;
    }
  }

  if (diffCount >= maxDiffs) {
    logger.log('  ... (more changes not shown)');
  }

  return true;
}

/**
 * Extract description from a command file
 */
async function extractCommandDescription(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Look for "# hai3:command-name - Description" pattern
    const h1Match = content.match(/^#\s+hai3:\S+\s+-\s+(.+)$/m);
    if (h1Match) {
      return trim(h1Match[1]);
    }
    // Fallback: use filename
    const name = path.basename(filePath, '.md');
    return `HAI3 ${name.replace('hai3-', '').replace(/-/g, ' ')} command`;
  } catch {
    return 'HAI3 command';
  }
}

interface GenerateOptions {
  showDiff?: boolean;
  logger?: { log: (msg: string) => void };
}

/**
 * Generate CLAUDE.md file
 */
async function generateClaudeMd(
  projectRoot: string,
  userRules: string | null,
  options: GenerateOptions = {}
): Promise<{ file: string; changed: boolean }> {
  let content = `# CLAUDE.md

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.
`;

  if (userRules) {
    content += `
## Project-Specific Rules

<!-- From .ai/rules/app.md - edit that file to modify these rules -->

${userRules}
`;
  }

  const filePath = path.join(projectRoot, 'CLAUDE.md');
  let oldContent: string | null = null;
  if (await fs.pathExists(filePath)) {
    oldContent = await fs.readFile(filePath, 'utf-8');
  }

  if (options.showDiff && options.logger) {
    const changed = showDiff('CLAUDE.md', oldContent, content, options.logger);
    return { file: 'CLAUDE.md', changed };
  }

  await fs.writeFile(filePath, content);
  return { file: 'CLAUDE.md', changed: oldContent !== content };
}

/**
 * Generate .github/copilot-instructions.md
 */
async function generateCopilotInstructions(
  projectRoot: string,
  userRules: string | null,
  options: GenerateOptions = {}
): Promise<{ file: string; changed: boolean }> {
  let content = `# GitHub Copilot Instructions

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.
`;

  if (userRules) {
    content += `
## Project-Specific Rules

${userRules}
`;
  }

  const dir = path.join(projectRoot, '.github');
  const filePath = path.join(dir, 'copilot-instructions.md');
  let oldContent: string | null = null;
  if (await fs.pathExists(filePath)) {
    oldContent = await fs.readFile(filePath, 'utf-8');
  }

  if (options.showDiff && options.logger) {
    const changed = showDiff('.github/copilot-instructions.md', oldContent, content, options.logger);
    return { file: '.github/copilot-instructions.md', changed };
  }

  await fs.ensureDir(dir);
  await fs.writeFile(filePath, content);
  return { file: '.github/copilot-instructions.md', changed: oldContent !== content };
}

/**
 * Generate .cursor/rules/hai3.mdc
 */
async function generateCursorRules(
  projectRoot: string,
  userRules: string | null,
  options: GenerateOptions = {}
): Promise<{ file: string; changed: boolean }> {
  let content = `---
description: HAI3 development guidelines
globs: ["**/*"]
alwaysApply: true
---

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.
`;

  if (userRules) {
    content += `
## Project-Specific Rules

${userRules}
`;
  }

  const dir = path.join(projectRoot, '.cursor', 'rules');
  const filePath = path.join(dir, 'hai3.mdc');
  let oldContent: string | null = null;
  if (await fs.pathExists(filePath)) {
    oldContent = await fs.readFile(filePath, 'utf-8');
  }

  if (options.showDiff && options.logger) {
    const changed = showDiff('.cursor/rules/hai3.mdc', oldContent, content, options.logger);
    return { file: '.cursor/rules/hai3.mdc', changed };
  }

  await fs.ensureDir(dir);
  await fs.writeFile(filePath, content);
  return { file: '.cursor/rules/hai3.mdc', changed: oldContent !== content };
}

/**
 * Generate .windsurf/rules/hai3.md
 */
async function generateWindsurfRules(
  projectRoot: string,
  userRules: string | null,
  options: GenerateOptions = {}
): Promise<{ file: string; changed: boolean }> {
  let content = `---
trigger: always_on
---

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.
`;

  if (userRules) {
    content += `
## Project-Specific Rules

${userRules}
`;
  }

  const dir = path.join(projectRoot, '.windsurf', 'rules');
  const filePath = path.join(dir, 'hai3.md');
  let oldContent: string | null = null;
  if (await fs.pathExists(filePath)) {
    oldContent = await fs.readFile(filePath, 'utf-8');
  }

  if (options.showDiff && options.logger) {
    const changed = showDiff('.windsurf/rules/hai3.md', oldContent, content, options.logger);
    return { file: '.windsurf/rules/hai3.md', changed };
  }

  await fs.ensureDir(dir);
  await fs.writeFile(filePath, content);
  return { file: '.windsurf/rules/hai3.md', changed: oldContent !== content };
}

/**
 * Scan installed @hai3 packages for commands
 */
async function scanPackageCommands(
  projectRoot: string
): Promise<{ package: string; commandPath: string; name: string }[]> {
  const commands: { package: string; commandPath: string; name: string }[] = [];
  const nodeModulesDir = path.join(projectRoot, 'node_modules', '@hai3');

  if (!(await fs.pathExists(nodeModulesDir))) {
    return commands;
  }

  const packages = await fs.readdir(nodeModulesDir);

  for (const pkg of packages) {
    const commandsDir = path.join(nodeModulesDir, pkg, 'commands');
    if (!(await fs.pathExists(commandsDir))) continue;

    const entries = await fs.readdir(commandsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      // Skip hai3dev-* commands (monorepo-only)
      if (entry.name.startsWith('hai3dev-')) continue;

      commands.push({
        package: `@hai3/${pkg}`,
        commandPath: path.join(commandsDir, entry.name),
        name: entry.name,
      });
    }
  }

  return commands;
}

/**
 * Scan a directory for command files
 */
async function scanCommandsInDirectory(
  commandsDir: string,
  relativePathPrefix: string
): Promise<Map<string, { srcPath: string; relativePath: string }>> {
  const commands = new Map<string, { srcPath: string; relativePath: string }>();

  if (!(await fs.pathExists(commandsDir))) {
    return commands;
  }

  const entries = await fs.readdir(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    // Skip hai3dev-* commands (monorepo-only)
    if (entry.name.startsWith('hai3dev-')) continue;

    const baseName = entry.name.replace(/\.md$/, '');
    const srcPath = path.join(commandsDir, entry.name);
    const relativePath = `${relativePathPrefix}${entry.name}`;

    commands.set(baseName, { srcPath, relativePath });
  }

  return commands;
}

/**
 * Generate command adapters for an IDE
 * Implements precedence: project > company > hai3 > packages
 */
async function generateCommandAdapters(
  projectRoot: string,
  commandsDir: string,
  targetDir: string,
  packageCommands: { package: string; commandPath: string; name: string }[] = []
): Promise<number> {
  await fs.ensureDir(targetDir);
  let count = 0;

  // Scan commands from all levels with precedence
  const hai3Commands = await scanCommandsInDirectory(commandsDir, 'commands/');
  const companyCommandsDir = path.join(projectRoot, '.ai', 'company', 'commands');
  const companyCommands = await scanCommandsInDirectory(companyCommandsDir, 'company/commands/');
  const projectCommandsDir = path.join(projectRoot, '.ai', 'project', 'commands');
  const projectCommands = await scanCommandsInDirectory(projectCommandsDir, 'project/commands/');

  // Collect all unique command names
  const allCommandNames = new Set<string>();
  hai3Commands.forEach((_, name) => allCommandNames.add(name));
  companyCommands.forEach((_, name) => allCommandNames.add(name));
  projectCommands.forEach((_, name) => allCommandNames.add(name));
  packageCommands.forEach(cmd => allCommandNames.add(cmd.name.replace(/\.md$/, '')));

  // Generate adapters with precedence: project > company > hai3 > packages
  for (const baseName of allCommandNames) {
    const targetPath = path.join(targetDir, `${baseName}.md`);

    // Check project level first (highest precedence)
    if (projectCommands.has(baseName)) {
      const cmd = projectCommands.get(baseName)!;
      const description = await extractCommandDescription(cmd.srcPath);
      const adapterContent = `---
description: ${description}
---

Use \`.ai/${cmd.relativePath}\` as the single source of truth.
`;
      await fs.writeFile(targetPath, adapterContent);
      count++;
      continue;
    }

    // Check company level
    if (companyCommands.has(baseName)) {
      const cmd = companyCommands.get(baseName)!;
      const description = await extractCommandDescription(cmd.srcPath);
      const adapterContent = `---
description: ${description}
---

Use \`.ai/${cmd.relativePath}\` as the single source of truth.
`;
      await fs.writeFile(targetPath, adapterContent);
      count++;
      continue;
    }

    // Check hai3 level
    if (hai3Commands.has(baseName)) {
      const cmd = hai3Commands.get(baseName)!;
      const description = await extractCommandDescription(cmd.srcPath);
      const adapterContent = `---
description: ${description}
---

Use \`.ai/${cmd.relativePath}\` as the single source of truth.
`;
      await fs.writeFile(targetPath, adapterContent);
      count++;
      continue;
    }

    // Check package commands (lowest precedence)
    const packageCmd = packageCommands.find(cmd => cmd.name.replace(/\.md$/, '') === baseName);
    if (packageCmd) {
      const content = await fs.readFile(packageCmd.commandPath, 'utf-8');
      await fs.writeFile(targetPath, content);
      count++;
    }
  }

  return count;
}

/**
 * Generate GitHub Copilot command adapters
 */
async function generateCopilotCommands(
  projectRoot: string,
  commandsDir: string,
  packageCommands: { package: string; commandPath: string; name: string }[] = []
): Promise<number> {
  const targetDir = path.join(projectRoot, '.github', 'copilot-commands');
  return generateCommandAdapters(projectRoot, commandsDir, targetDir, packageCommands);
}

/**
 * AI sync command implementation
 *
 * Generates IDE-specific configuration files from .ai/ directory.
 */
export const aiSyncCommand: CommandDefinition<AiSyncArgs, AiSyncResult> = {
  name: 'ai:sync',
  description: 'Sync AI assistant configuration files',
  args: [],
  options: [
    {
      name: 'tool',
      shortName: 't',
      description: 'Specific tool to sync (claude, copilot, cursor, windsurf, all)',
      type: 'string',
      choices: ['claude', 'copilot', 'cursor', 'windsurf', 'all'],
      defaultValue: 'all',
    },
    {
      name: 'detect-packages',
      shortName: 'd',
      description: 'Detect installed @hai3 packages and include their CLAUDE.md',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'diff',
      description: 'Show diff of changes without writing files',
      type: 'boolean',
      defaultValue: false,
    },
  ],

  validate(_args, ctx) {
    if (!ctx.projectRoot) {
      return validationError(
        'NOT_IN_PROJECT',
        'Not inside a HAI3 project. Run this command from a project root.'
      );
    }

    return validationOk();
  },

  async execute(args, ctx): Promise<AiSyncResult> {
    const { logger, projectRoot } = ctx;
    const tool = (args.tool ?? 'all') as AiTool;
    const detectPackages = args.detectPackages ?? false;
    const showDiff = args.diff ?? false;

    if (showDiff) {
      logger.info('Showing diff of AI assistant configuration changes...');
    } else {
      logger.info('Syncing AI assistant configuration...');
    }
    logger.newline();

    const filesGenerated: string[] = [];
    const toolsUpdated: string[] = [];
    let commandsGenerated = 0;

    const aiDir = path.join(projectRoot!, '.ai');
    const commandsDir = path.join(aiDir, 'commands');

    // Check if .ai/ directory exists
    if (!(await fs.pathExists(aiDir))) {
      if (showDiff) {
        logger.warn('.ai/ directory not found. Nothing to diff.');
        return { filesGenerated: [], commandsGenerated: 0, toolsUpdated: [] };
      }
      logger.warn('.ai/ directory not found. Creating minimal structure...');
      await fs.ensureDir(aiDir);
      await fs.writeFile(
        path.join(aiDir, 'GUIDELINES.md'),
        '# HAI3 Development Guidelines\n\nAdd your project-specific guidelines here.\n'
      );
    }

    // Read user's custom rules from .ai/rules/app.md (preserved across syncs)
    const userRules = await readUserRules(projectRoot!);
    if (userRules && !showDiff) {
      logger.log('  ✓ Found user rules in .ai/rules/app.md');
    }

    // Scan installed package commands if --detect-packages is enabled
    let packageCommands: { package: string; commandPath: string; name: string }[] = [];
    if (detectPackages) {
      packageCommands = await scanPackageCommands(projectRoot!);
      if (packageCommands.length > 0 && !showDiff) {
        logger.log(`  ✓ Found ${packageCommands.length} commands from installed packages`);
      }
    }

    const genOptions: GenerateOptions = { showDiff, logger };

    // Generate files for each tool
    if (tool === 'all' || tool === 'claude') {
      const result = await generateClaudeMd(projectRoot!, userRules, genOptions);
      if (result.changed) filesGenerated.push(result.file);
      if (!showDiff) {
        const claudeCommandsDir = path.join(projectRoot!, '.claude', 'commands');
        const claudeCount = await generateCommandAdapters(
          projectRoot!,
          commandsDir,
          claudeCommandsDir,
          packageCommands
        );
        commandsGenerated += claudeCount;
        toolsUpdated.push('Claude');
        logger.log(`  ✓ Claude: CLAUDE.md + ${claudeCount} command adapters`);
      } else {
        toolsUpdated.push('Claude');
      }
    }

    if (tool === 'all' || tool === 'copilot') {
      const result = await generateCopilotInstructions(projectRoot!, userRules, genOptions);
      if (result.changed) filesGenerated.push(result.file);
      if (!showDiff) {
        const copilotCount = await generateCopilotCommands(
          projectRoot!,
          commandsDir,
          packageCommands
        );
        commandsGenerated += copilotCount;
        toolsUpdated.push('GitHub Copilot');
        logger.log(`  ✓ GitHub Copilot: .github/copilot-instructions.md + ${copilotCount} commands`);
      } else {
        toolsUpdated.push('GitHub Copilot');
      }
    }

    if (tool === 'all' || tool === 'cursor') {
      const result = await generateCursorRules(projectRoot!, userRules, genOptions);
      if (result.changed) filesGenerated.push(result.file);
      if (!showDiff) {
        const cursorCommandsDir = path.join(projectRoot!, '.cursor', 'commands');
        const cursorCount = await generateCommandAdapters(
          projectRoot!,
          commandsDir,
          cursorCommandsDir,
          packageCommands
        );
        commandsGenerated += cursorCount;
        toolsUpdated.push('Cursor');
        logger.log(`  ✓ Cursor: .cursor/rules/hai3.mdc + ${cursorCount} command adapters`);
      } else {
        toolsUpdated.push('Cursor');
      }
    }

    if (tool === 'all' || tool === 'windsurf') {
      const result = await generateWindsurfRules(projectRoot!, userRules, genOptions);
      if (result.changed) filesGenerated.push(result.file);
      if (!showDiff) {
        const windsurfWorkflowsDir = path.join(projectRoot!, '.windsurf', 'workflows');
        const windsurfCount = await generateCommandAdapters(
          projectRoot!,
          commandsDir,
          windsurfWorkflowsDir,
          packageCommands
        );
        commandsGenerated += windsurfCount;
        toolsUpdated.push('Windsurf');
        logger.log(`  ✓ Windsurf: .windsurf/rules/hai3.md + ${windsurfCount} workflow adapters`);
      } else {
        toolsUpdated.push('Windsurf');
      }
    }

    // Report detected packages
    if (detectPackages) {
      const nodeModulesDir = path.join(projectRoot!, 'node_modules', '@hai3');
      if (await fs.pathExists(nodeModulesDir)) {
        const packages = await fs.readdir(nodeModulesDir);
        const packageDocs: string[] = [];

        for (const pkg of packages) {
          const claudeMdPath = path.join(nodeModulesDir, pkg, 'CLAUDE.md');
          if (await fs.pathExists(claudeMdPath)) {
            packageDocs.push(`@hai3/${pkg}`);
          }
        }

        if (packageDocs.length > 0) {
          logger.newline();
          logger.log(`Detected ${packageDocs.length} @hai3 packages with documentation:`);
          for (const pkg of packageDocs) {
            logger.log(`  • ${pkg}`);
          }
        }
      }
    }

    logger.newline();
    if (showDiff) {
      if (filesGenerated.length > 0) {
        logger.info(`${filesGenerated.length} files would be changed`);
      } else {
        logger.success('All files are up to date (no changes needed)');
      }
    } else {
      logger.success(
        `Synced ${filesGenerated.length} files for ${toolsUpdated.length} AI tools`
      );
    }

    return {
      filesGenerated,
      commandsGenerated,
      toolsUpdated,
    };
  },
};
