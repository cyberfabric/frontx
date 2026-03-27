// @cpt-flow:cpt-hai3-flow-cli-tooling-scaffold-layout:p1
/**
 * Layout Generator from Template
 *
 * Generates layout components in the user's project from HAI3 layout templates.
 */

import path from 'path';
import fs from 'fs-extra';
import type { GeneratedFile } from '../core/types.js';
import { getTemplatesDir } from '../core/templates.js';
import { loadConfig } from '../utils/project.js';

/**
 * Input for layout generation from template
 */
export interface LayoutFromTemplateInput {
  /** Project root directory */
  projectRoot: string;
  /** Whether to overwrite existing files */
  force?: boolean;
}

/**
 * Read all files from template directory recursively
 */
async function readTemplateFiles(
  dir: string,
  basePath: string = ''
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  if (!(await fs.pathExists(dir))) {
    return files;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await readTemplateFiles(fullPath, relativePath)));
    } else {
      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Generate layout files from template
 * Copies the FrontX layout templates
 */
// @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-read-layout-templates
export async function copyLayoutTemplates(
  input: LayoutFromTemplateInput
): Promise<GeneratedFile[]> {
  const { projectRoot, force = false } = input;
  const templatesDir = getTemplatesDir();

  const configResult = await loadConfig(projectRoot);
  const uikit = configResult.ok ? (configResult.config.uikit ?? 'shadcn') : 'shadcn';
  const layoutVariant = uikit === 'shadcn' ? 'shadcn' : 'custom-uikit';
  const templatePath = path.join(templatesDir, 'layout', layoutVariant);

  // Check template exists
  if (!(await fs.pathExists(templatePath))) {
    throw new Error(
      `Layout template not found at ${templatePath}. ` +
        'Run `npm run build` in packages/cli first.'
    );
  }

  // Read all template files
  const templateFiles = await readTemplateFiles(templatePath);

  if (templateFiles.length === 0) {
    throw new Error('No files found in layout template.');
  }

  // Check for existing files if not forcing
  if (!force) {
    const layoutDir = path.join(projectRoot, 'src', 'app', 'layout');
    if (await fs.pathExists(layoutDir)) {
      const existingFiles = await fs.readdir(layoutDir);
      if (existingFiles.length > 0) {
        throw new Error(
          'Layout directory already exists with files. ' +
            'Use --force to overwrite existing files.'
        );
      }
    }
  }

  // Transform paths for output
  const outputFiles: GeneratedFile[] = templateFiles.map((file) => ({
    path: `src/app/layout/${file.path}`,
    content: file.content,
  }));

  return outputFiles;
}
// @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-read-layout-templates
