/**
 * Shared template utilities for CLI commands
 *
 * Used by both `hai3 create` and `hai3 update` commands to ensure
 * consistent template handling across project creation and updates.
 *
 * EXTENSIBILITY:
 * - presets/standalone/ content is auto-discovered (add files there, no code changes)
 * - Non-presets content (src/*, root configs) uses explicit whitelist below
 *
 * PRESERVATION:
 * - User-created screensets in src/screensets/ are preserved
 * - Only template screensets (demo) are synced
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import {
  isTargetApplicableToLayer,
  type LayerType,
} from './layers.js';

/**
 * Items to EXCLUDE from template sync (internal CLI files only)
 */
const SYNC_EXCLUDE = [
  'manifest.json',
  'screenset-template',
  'layout', // Layout templates - handled separately by `hai3 update layout`
];

/**
 * Get the path to the CLI's bundled templates directory
 */
export function getTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..', 'templates');
}

/**
 * Logger interface for template operations
 */
export interface TemplateLogger {
  info: (msg: string) => void;
  warn?: (msg: string) => void;
}

/**
 * Sync a directory, preserving user content in specific subdirectories
 *
 * For src/screensets/, only syncs template screensets (preserves user screensets)
 * For other directories, does full replacement
 */
async function syncDirectory(
  srcDir: string,
  destDir: string,
  relativePath: string
): Promise<void> {
  // Special handling for src/screensets/ - preserve user screensets
  if (relativePath === 'src/screensets' || relativePath === 'src\\screensets') {
    await fs.ensureDir(destDir);
    const templateScreensets = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of templateScreensets) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      // Replace only template screensets (like demo), preserve user screensets
      await fs.remove(destPath);
      await fs.copy(srcPath, destPath);
    }
    return;
  }

  // Special handling for src/app/themes/ - preserve user themes and generated files
  if (
    relativePath === 'src/app/themes' ||
    relativePath === 'src\\app\\themes' ||
    relativePath === 'src/themes' ||
    relativePath === 'src\\themes'
  ) {
    await fs.ensureDir(destDir);
    const templateEntries = await fs.readdir(srcDir, { withFileTypes: true });

    // Only sync items that exist in templates, preserve user-created themes
    for (const entry of templateEntries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      // Replace only template items, preserve user items
      await fs.remove(destPath);
      await fs.copy(srcPath, destPath);
    }
    return;
  }

  // Special handling for src/app/layout/ - preserve user layout customizations
  // Layout is managed by `hai3 update layout` command, skip auto-sync
  if (
    relativePath === 'src/app/layout' ||
    relativePath === 'src\\app\\layout' ||
    relativePath === 'src/layout' ||
    relativePath === 'src\\layout'
  ) {
    // Skip - layout updates are handled by `hai3 update layout` command
    return;
  }

  // Special handling for src/ and src/app/ - recursively handle subdirectories
  if (relativePath === 'src' || relativePath === 'src/app' || relativePath === 'src\\app') {
    await fs.ensureDir(destDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      const subRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await syncDirectory(srcPath, destPath, subRelativePath);
      } else {
        // Files in src/ root (like main.tsx, App.tsx) are replaced
        await fs.copy(srcPath, destPath, { overwrite: true });
      }
    }
    return;
  }

  // Default: full replacement for other directories
  await fs.remove(destDir);
  await fs.copy(srcDir, destDir);
}

/**
 * Sync template files from bundled CLI templates to project
 *
 * Syncs everything in templates/ except SYNC_EXCLUDE items.
 * This includes:
 * - presets/standalone/ content (auto-discovered, extensible)
 * - Root project files (index.html, vite.config.ts, etc.)
 * - Source directories (src/themes, src/uikit, src/icons, src/screensets/demo)
 * - AI configuration (.ai/, .claude/, .cursor/, .windsurf/, CLAUDE.md)
 *
 * User-created screensets in src/screensets/ are preserved.
 *
 * @param projectRoot - The root directory of the HAI3 project
 * @param logger - Logger instance for output
 * @param layer - Optional layer for layer-aware filtering of targets and commands
 * @returns Array of synced paths
 */
export async function syncTemplates(
  projectRoot: string,
  logger: TemplateLogger,
  layer?: LayerType
): Promise<string[]> {
  const templatesDir = getTemplatesDir();
  const synced: string[] = [];

  // Read all entries in templates directory
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;

    // Skip excluded items
    if (SYNC_EXCLUDE.includes(name)) {
      continue;
    }

    const srcPath = path.join(templatesDir, name);
    const destPath = path.join(projectRoot, name);

    try {
      // Special handling for .ai directory with layer-aware filtering
      if (entry.isDirectory() && name === '.ai' && layer) {
        await syncAiDirectory(srcPath, destPath, layer, logger);
        synced.push(name);
      } else if (entry.isDirectory()) {
        await syncDirectory(srcPath, destPath, name);
        synced.push(name);
      } else {
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath, { overwrite: true });
        synced.push(name);
      }
    } catch (err) {
      logger.info(`  Warning: Could not sync ${name}: ${err}`);
    }
  }

  return synced;
}

/**
 * Sync commands from commands-bundle/ with layer-aware variant selection
 * Uses selectCommandVariant() to pick appropriate variant for each command
 */
async function syncCommands(
  commandsBundleDir: string,
  destCommandsDir: string,
  layer: LayerType,
  logger: TemplateLogger
): Promise<void> {
  await fs.ensureDir(destCommandsDir);

  // Get all command files from bundle
  const bundledFiles = await fs.readdir(commandsBundleDir);

  // Group files by base name (e.g., "hai3-validate" from "hai3-validate.md" and "hai3-validate.sdk.md")
  const commandGroups = new Map<string, string[]>();

  for (const file of bundledFiles) {
    if (!file.endsWith('.md')) continue;

    // Extract base name: hai3-validate.sdk.md -> hai3-validate
    // hai3-validate.md -> hai3-validate
    const baseName = file
      .replace(/\.(sdk|framework|react)\.md$/, '')
      .replace(/\.md$/, '');

    if (!commandGroups.has(baseName)) {
      commandGroups.set(baseName, []);
    }
    commandGroups.get(baseName)!.push(file);
  }

  // Select appropriate variant for each command group
  for (const [baseName, variants] of commandGroups) {
    const { selectCommandVariant } = await import('./layers.js');
    const selectedVariant = selectCommandVariant(`${baseName}.md`, layer, variants);

    if (selectedVariant) {
      const srcPath = path.join(commandsBundleDir, selectedVariant);
      const destPath = path.join(destCommandsDir, `${baseName}.md`);

      await fs.copy(srcPath, destPath, { overwrite: true });

      // Log which variant was selected if it's not the base
      if (selectedVariant !== `${baseName}.md` && logger.warn) {
        logger.warn(`  Command '${baseName}.md' using ${selectedVariant.replace(`${baseName}.`, '').replace('.md', '')} variant for layer '${layer}'`);
      }
    }
    // If selectedVariant is null, command is excluded for this layer (skip silently)
  }
}

/**
 * Sync .ai directory with layer-aware filtering for targets and commands
 */
async function syncAiDirectory(
  srcDir: string,
  destDir: string,
  layer: LayerType,
  logger: TemplateLogger
): Promise<void> {
  await fs.ensureDir(destDir);

  // Sync .ai/targets/ with layer filtering
  const targetsDir = path.join(srcDir, 'targets');
  if (await fs.pathExists(targetsDir)) {
    const destTargetsDir = path.join(destDir, 'targets');
    await fs.ensureDir(destTargetsDir);

    const targetFiles = await fs.readdir(targetsDir);
    for (const targetFile of targetFiles) {
      if (targetFile.endsWith('.md')) {
        if (isTargetApplicableToLayer(targetFile, layer)) {
          await fs.copy(
            path.join(targetsDir, targetFile),
            path.join(destTargetsDir, targetFile),
            { overwrite: true }
          );
        }
      }
    }
  }

  // Select and sync appropriate GUIDELINES variant
  const guidelinesVariants: Record<LayerType, string> = {
    sdk: 'GUIDELINES.sdk.md',
    framework: 'GUIDELINES.framework.md',
    react: 'GUIDELINES.md',
    app: 'GUIDELINES.md',
  };

  const guidelinesVariant = guidelinesVariants[layer];
  const guidelinesPath = path.join(srcDir, guidelinesVariant);

  if (await fs.pathExists(guidelinesPath)) {
    await fs.copy(
      guidelinesPath,
      path.join(destDir, 'GUIDELINES.md'),
      { overwrite: true }
    );
  } else {
    // Fallback to default GUIDELINES.md
    const fallbackPath = path.join(srcDir, 'GUIDELINES.md');
    if (await fs.pathExists(fallbackPath)) {
      if (logger.warn) {
        logger.warn(`Warning: ${guidelinesVariant} not found, using default GUIDELINES.md`);
      }
      await fs.copy(
        fallbackPath,
        path.join(destDir, 'GUIDELINES.md'),
        { overwrite: true }
      );
    }
  }

  // Sync commands with layer-aware variant selection
  const commandsBundleDir = path.join(getTemplatesDir(), 'commands-bundle');
  if (await fs.pathExists(commandsBundleDir)) {
    await syncCommands(commandsBundleDir, path.join(destDir, 'commands'), layer, logger);
  }

  // Sync user commands from .ai/commands/user/ (standalone commands not in packages)
  const userCommandsDir = path.join(srcDir, 'commands', 'user');
  const destUserCommandsDir = path.join(destDir, 'commands', 'user');
  if (await fs.pathExists(userCommandsDir)) {
    await fs.copy(userCommandsDir, destUserCommandsDir, { overwrite: true });
  }

  // Sync company/ and project/ hierarchy directories if they exist in templates
  // These will be created once in new projects and then preserved on updates
  const companyDir = path.join(srcDir, 'company');
  const projectDir = path.join(srcDir, 'project');
  const destCompanyDir = path.join(destDir, 'company');
  const destProjectDir = path.join(destDir, 'project');

  // Only copy company/ if it doesn't exist in destination (preserve user content)
  if (await fs.pathExists(companyDir) && !(await fs.pathExists(destCompanyDir))) {
    await fs.copy(companyDir, destCompanyDir);
  }

  // Only copy project/ if it doesn't exist in destination (preserve user content)
  if (await fs.pathExists(projectDir) && !(await fs.pathExists(destProjectDir))) {
    await fs.copy(projectDir, destProjectDir);
  }

  // Sync other .ai files/directories (excluding targets/, GUIDELINES variants, commands/, company/, and project/)
  const aiEntries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of aiEntries) {
    // Skip targets (already handled), GUIDELINES variants, commands (already handled), and company/project (preserved)
    if (
      entry.name === 'targets' ||
      entry.name === 'commands' ||
      entry.name.startsWith('GUIDELINES.') ||
      entry.name === 'GUIDELINES.md' ||
      entry.name === 'company' ||
      entry.name === 'project'
    ) {
      continue;
    }

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await fs.copy(srcPath, destPath, { overwrite: true });
    } else {
      await fs.copy(srcPath, destPath, { overwrite: true });
    }
  }
}
