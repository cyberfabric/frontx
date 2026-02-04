import path from 'path';
import fs from 'fs-extra';
import type { GeneratedFile, Hai3Config, LayerType } from '../core/types.js';
import { getTemplatesDir } from '../core/templates.js';
import { isTargetApplicableToLayer, selectCommandVariant } from '../core/layers.js';

/**
 * Input for project generation
 */
export interface ProjectGeneratorInput {
  /** Project name (npm package name format) */
  projectName: string;
  /** Include studio */
  studio: boolean;
  /** UIKit option: 'hai3' (default) or 'none' */
  uikit?: 'hai3' | 'none';
  /** Project layer (SDK architecture tier) */
  layer?: LayerType;
}

/**
 * Read all files from a directory recursively
 */
async function readDirRecursive(
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
      files.push(...(await readDirRecursive(fullPath, relativePath)));
    } else {
      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Generate all files for a new HAI3 project
 * Combines template files with dynamically generated config files
 */
export async function generateProject(
  input: ProjectGeneratorInput
): Promise<GeneratedFile[]> {
  const { projectName, studio, uikit = 'hai3', layer = 'app' } = input;
  const templatesDir = getTemplatesDir();
  const files: GeneratedFile[] = [];

  // 1. Load manifest to know what to copy
  const manifestPath = path.join(templatesDir, 'manifest.json');
  if (!(await fs.pathExists(manifestPath))) {
    throw new Error(
      'Templates not found. Run `npm run build` in packages/cli first.'
    );
  }

  const manifest = await fs.readJson(manifestPath);

  // Extract paths from new 3-stage manifest structure
  const rootFiles = manifest.stage1b?.rootFiles || manifest.rootFiles || [];
  const directories = manifest.stage1b?.directories || manifest.directories || [];
  const screensets = manifest.stage1b?.screensets || manifest.screensets || [];

  // 2. Copy root template files
  for (const file of rootFiles) {
    // Special handling for main.tsx - select template variant based on uikit flag
    if (file === 'src/app/main.tsx') {
      const templateName = uikit === 'hai3' ? 'src/app/main.tsx' : 'src/app/main.no-uikit.tsx';
      const templatePath = path.join(templatesDir, templateName);
      const content = await fs.readFile(templatePath, 'utf-8');
      files.push({ path: 'src/app/main.tsx', content });
      continue;
    }

    // Special handling for App.tsx - select template variant based on uikit and studio flags
    if (file === 'src/app/App.tsx') {
      let templateName: string;
      if (uikit === 'hai3') {
        templateName = studio ? 'src/app/App.tsx' : 'src/app/App.no-studio.tsx';
      } else {
        templateName = studio ? 'src/app/App.no-uikit.tsx' : 'src/app/App.no-uikit.no-studio.tsx';
      }
      const templatePath = path.join(templatesDir, templateName);
      const content = await fs.readFile(templatePath, 'utf-8');
      files.push({ path: 'src/app/App.tsx', content });
      continue;
    }

    // Skip template variant files - they're handled by the special cases above
    const variantFiles = [
      'src/app/main.no-uikit.tsx',
      'src/app/App.no-studio.tsx',
      'src/app/App.no-uikit.tsx',
      'src/app/App.no-uikit.no-studio.tsx',
    ];
    if (variantFiles.includes(file)) {
      continue;
    }

    // Skip UIKit-dependent config files when uikit === 'none'
    // These files have CSS variable references that only work with @hai3/uikit
    if (uikit === 'none') {
      const uikitDependentFiles = [
        'tailwind.config.ts',
        'postcss.config.ts',
      ];
      if (uikitDependentFiles.includes(file)) {
        continue;
      }
    }

    const filePath = path.join(templatesDir, file);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ path: file, content });
    }
  }

  // 3. Copy template directories (src/themes, src/uikit, src/icons)
  for (const dir of directories) {
    // Skip themes directory when uikit === 'none' (themes depend on @hai3/uikit)
    if (dir === 'src/app/themes' && uikit === 'none') {
      continue;
    }

    // Skip components directory when uikit === 'none' (contains TextLoader.tsx which depends on @hai3/uikit)
    // We'll handle individual file filtering below for more granular control
    if (dir === 'src/app/components' && uikit === 'none') {
      continue;
    }

    const dirPath = path.join(templatesDir, dir);
    const dirFiles = await readDirRecursive(dirPath, dir);
    files.push(...dirFiles);
  }

  // 3.0 Copy layout templates (HAI3 UIKit layout) - only if uikit === 'hai3'
  if (uikit === 'hai3') {
    const layoutDir = path.join(templatesDir, 'layout', 'hai3-uikit');
    if (await fs.pathExists(layoutDir)) {
      const layoutFiles = await readDirRecursive(layoutDir, 'src/app/layout');
      files.push(...layoutFiles);
    }
  }

  // 3.1 Copy AI configuration with layer-aware filtering
  // 3.1.1 Copy .ai/targets/ with layer filtering
  const aiTargetsDir = path.join(templatesDir, '.ai/targets');
  if (await fs.pathExists(aiTargetsDir)) {
    const targetFiles = await fs.readdir(aiTargetsDir);
    for (const targetFile of targetFiles) {
      if (targetFile.endsWith('.md')) {
        if (isTargetApplicableToLayer(targetFile, layer)) {
          const content = await fs.readFile(path.join(aiTargetsDir, targetFile), 'utf-8');
          files.push({ path: `.ai/targets/${targetFile}`, content });
        }
      }
    }
  }

  // 3.1.2 Select and copy appropriate GUIDELINES variant
  const guidelinesVariants: Record<LayerType, string> = {
    sdk: 'GUIDELINES.sdk.md',
    framework: 'GUIDELINES.framework.md',
    react: 'GUIDELINES.md',
    app: 'GUIDELINES.md',
  };
  const guidelinesVariant = guidelinesVariants[layer];
  const guidelinesPath = path.join(templatesDir, '.ai', guidelinesVariant);
  if (await fs.pathExists(guidelinesPath)) {
    const content = await fs.readFile(guidelinesPath, 'utf-8');
    files.push({ path: '.ai/GUIDELINES.md', content });
  } else {
    // Fallback to default GUIDELINES.md with warning
    console.warn(`Warning: ${guidelinesVariant} not found, using default GUIDELINES.md`);
    const fallbackPath = path.join(templatesDir, '.ai/GUIDELINES.md');
    if (await fs.pathExists(fallbackPath)) {
      const content = await fs.readFile(fallbackPath, 'utf-8');
      files.push({ path: '.ai/GUIDELINES.md', content });
    }
  }

  // 3.1.2a Copy company/ and project/ hierarchy directories (placeholder templates)
  const hierarchyDirs = ['company', 'project'];
  for (const dirName of hierarchyDirs) {
    const hierarchyDir = path.join(templatesDir, '.ai', dirName);
    if (await fs.pathExists(hierarchyDir)) {
      const hierarchyFiles = await readDirRecursive(hierarchyDir, `.ai/${dirName}`);
      files.push(...hierarchyFiles);
    }
  }

  // 3.1.3 Copy IDE command adapters (.claude, .cursor, .windsurf)
  const ideDirs = ['.claude', '.cursor', '.windsurf'];
  for (const dir of ideDirs) {
    const dirPath = path.join(templatesDir, dir);
    if (await fs.pathExists(dirPath)) {
      const dirFiles = await readDirRecursive(dirPath, dir);
      files.push(...dirFiles);
    }
  }

  // 3.1.4 Select and copy package commands from commands-bundle based on layer
  const commandsBundleDir = path.join(templatesDir, 'commands-bundle');
  if (await fs.pathExists(commandsBundleDir)) {
    const bundledFiles = await fs.readdir(commandsBundleDir);

    // Group command files by base name
    const commandGroups = new Map<string, string[]>();
    for (const file of bundledFiles) {
      if (!file.endsWith('.md')) continue;

      // Extract base command name (without layer suffixes)
      const baseName = file.replace(/\.(sdk|framework|react)\.md$/, '.md');

      if (!commandGroups.has(baseName)) {
        commandGroups.set(baseName, []);
      }
      commandGroups.get(baseName)!.push(file);
    }

    // For each command group, select the most appropriate variant
    for (const [baseName, variants] of commandGroups.entries()) {
      const selectedVariant = selectCommandVariant(baseName, layer, variants);

      if (selectedVariant) {
        const content = await fs.readFile(
          path.join(commandsBundleDir, selectedVariant),
          'utf-8'
        );

        // Copy to .ai/commands/ (adapters in IDE directories will reference these)
        files.push({ path: `.ai/commands/${baseName}`, content });
      }
    }
  }

  // 3.1.5 Copy user commands from .ai/commands/user/ (standalone commands not in packages)
  const userCommandsDir = path.join(templatesDir, '.ai/commands/user');
  if (await fs.pathExists(userCommandsDir)) {
    const userCommandFiles = await readDirRecursive(userCommandsDir, '.ai/commands/user');
    files.push(...userCommandFiles);
  }

  // 3.2 Copy eslint-plugin-local
  const eslintPluginDir = path.join(templatesDir, 'eslint-plugin-local');
  if (await fs.pathExists(eslintPluginDir)) {
    const pluginFiles = await readDirRecursive(eslintPluginDir, 'eslint-plugin-local');
    files.push(...pluginFiles);
  }

  // 3.3 Copy scripts directory
  const scriptsDir = path.join(templatesDir, 'scripts');
  if (await fs.pathExists(scriptsDir)) {
    let scriptFiles = await readDirRecursive(scriptsDir, 'scripts');
    // Filter out generate-colors.ts when uikit === 'none' (not needed without @hai3/uikit)
    if (uikit === 'none') {
      scriptFiles = scriptFiles.filter(f => !f.path.includes('generate-colors'));
    }
    files.push(...scriptFiles);
  }

  // 3.4 Copy root files from templates (CLAUDE.md, README.md, configs)
  const rootConfigFiles = [
    'CLAUDE.md',
    'README.md',
    'eslint.config.js',
    'tsconfig.json',
    '.dependency-cruiser.cjs',
    '.pre-commit-config.yaml',
  ];
  for (const file of rootConfigFiles) {
    const filePath = path.join(templatesDir, file);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ path: file, content });
    }
  }

  // 4. Copy screensets from templates
  // Skip demo screenset if uikit === 'none' (demo requires @hai3/uikit)
  for (const screenset of screensets) {
    // Skip demo screenset when UIKit is not included
    if (screenset === 'demo' && uikit === 'none') {
      continue;
    }

    const screensetPath = path.join(templatesDir, 'src/screensets', screenset);
    const screensetFiles = await readDirRecursive(
      screensetPath,
      `src/screensets/${screenset}`
    );
    files.push(...screensetFiles);
  }

  // 5. Generate dynamic files (need project-specific values)

  // 5.1 hai3.config.json (marker file for project detection)
  const config: Hai3Config = {
    hai3: true,
    layer,
    uikit,
  };
  files.push({
    path: 'hai3.config.json',
    content: JSON.stringify(config, null, 2) + '\n',
  });

  // 5.2 package.json
  // Use 'alpha' tag for @hai3 packages during alpha phase
  // This resolves to the latest alpha version from npm
  // Only L3 packages allowed: @hai3/react (required), @hai3/uikit (conditional)
  const dependencies: Record<string, string> = {
    '@hai3/react': 'alpha',
    '@hookform/resolvers': '5.2.2',
    '@iconify/react': '5.0.2',
    '@reduxjs/toolkit': '2.11.2',
    'date-fns': '4.1.0',
    'input-otp': '1.4.2',
    lodash: '4.17.21',
    'lucide-react': '0.563.0',
    react: '19.2.4',
    'react-day-picker': '9.12.0',
    'react-dom': '19.2.4',
    'react-hook-form': '7.68.0',
    'react-redux': '9.2.0',
    'tailwindcss-animate': '1.0.7',
    zod: '4.0.0',
  };

  const devDependencies: Record<string, string> = {
    '@hai3/cli': 'alpha',
    '@j178/prek': '0.2.25',
    '@types/lodash': '4.17.20',
    '@types/react': '19.0.8',
    '@types/react-dom': '19.0.3',
    '@eslint/js': '9.27.0',
    '@vitejs/plugin-react': '4.3.4',
    autoprefixer: '10.4.18',
    eslint: '9.27.0',
    'eslint-plugin-react-hooks': '5.0.0',
    'eslint-plugin-unused-imports': '4.1.4',
    globals: '15.12.0',
    postcss: '8.4.35',
    'postcss-load-config': '6.0.1',
    tailwindcss: '3.4.1',
    'dependency-cruiser': '17.3.2',
    tsx: '4.20.6',
    typescript: '5.4.2',
    'typescript-eslint': '8.32.1',
    vite: '6.4.1',
  };

  if (studio) {
    devDependencies['@hai3/studio'] = 'alpha';
  }

  // Conditionally add @hai3/uikit dependency
  if (uikit === 'hai3') {
    dependencies['@hai3/uikit'] = 'alpha';
  }

  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: {
      node: '>=25.1.0',
      npm: '>=11.7.0',
    },
    packageManager: 'npm@11.7.0',
    workspaces: ['eslint-plugin-local'],
    scripts: {
      dev: uikit === 'hai3' ? 'npm run generate:colors && vite' : 'vite',
      'check:mcp': 'npx tsx scripts/check-mcp.ts',
      build: uikit === 'hai3' ? 'npm run generate:colors && vite build' : 'vite build',
      preview: 'vite preview',
      lint: 'npm run build --workspace=eslint-plugin-local && eslint . --max-warnings 0',
      'type-check': uikit === 'hai3' ? 'npm run generate:colors && tsc --noEmit' : 'tsc --noEmit',
      ...(uikit === 'hai3' && { 'generate:colors': 'npx tsx scripts/generate-colors.ts' }),
      'arch:check': 'npx tsx scripts/test-architecture.ts',
      'arch:deps':
        'npx dependency-cruiser src/ --config .dependency-cruiser.cjs --output-type err-long',
      'ai:sync': 'npx hai3 ai sync',
      'prek:install': 'npx prek install',
      'prek:run': 'npx prek run --all-files',
      postinstall: 'npx prek install',
    },
    dependencies,
    devDependencies,
  };

  files.push({
    path: 'package.json',
    content: JSON.stringify(packageJson, null, 2) + '\n',
  });

  return files;
}
