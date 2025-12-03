import path from 'path';
import fs from 'fs-extra';
import type { GeneratedFile, Hai3Config } from '../core/types.js';

/**
 * Input for project generation
 */
export interface ProjectGeneratorInput {
  /** Project name (npm package name format) */
  projectName: string;
  /** Use HAI3 UIKit or custom */
  uikit: 'hai3' | 'custom';
  /** Include studio */
  studio: boolean;
}

/**
 * Get the templates directory path
 * In bundled CLI: dist/index.cjs -> need to go up to package root then templates
 */
function getTemplatesDir(): string {
  // __dirname in CJS bundle is the dist folder
  // We need: packages/cli/dist -> packages/cli/templates
  return path.resolve(__dirname, '../templates');
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
  const { projectName, uikit, studio } = input;
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

  // 2. Copy root template files (with minimal transformations where needed)
  for (const file of rootFiles) {
    const filePath = path.join(templatesDir, file);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8');

      // Transform src/main.tsx for uikit='custom':
      // - Remove @hai3/uikit/styles import (custom projects provide their own styles)
      // - Add ./index.css import (for Tailwind directives)
      if (file === 'src/main.tsx' && uikit === 'custom') {
        content = content.replace(
          /import '@hai3\/uikit\/styles';.*\n/g,
          "import './index.css';\n"
        );
      }

      files.push({ path: file, content });
    }
  }

  // 2.1 Generate index.css for custom uikit (hai3 uikit includes Tailwind via @hai3/uikit/styles)
  if (uikit === 'custom') {
    files.push({
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    });
  }

  // 3. Copy template directories (src/themes, src/uikit, src/icons)
  for (const dir of directories) {
    const dirPath = path.join(templatesDir, dir);
    const dirFiles = await readDirRecursive(dirPath, dir);
    files.push(...dirFiles);
  }

  // 3.1 Copy AI configuration directories (.ai, .claude, .cursor, .windsurf)
  const aiDirs = ['.ai', '.claude', '.cursor', '.windsurf'];
  for (const dir of aiDirs) {
    const dirPath = path.join(templatesDir, dir);
    if (await fs.pathExists(dirPath)) {
      const dirFiles = await readDirRecursive(dirPath, dir);
      files.push(...dirFiles);
    }
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
    const scriptFiles = await readDirRecursive(scriptsDir, 'scripts');
    files.push(...scriptFiles);
  }

  // 3.4 Copy root files from templates (CLAUDE.md, README.md, configs)
  const rootConfigFiles = [
    'CLAUDE.md',
    'README.md',
    'eslint.config.js',
    'tsconfig.json',
    '.dependency-cruiser.cjs',
  ];
  for (const file of rootConfigFiles) {
    const filePath = path.join(templatesDir, file);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ path: file, content });
    }
  }

  // 4. Copy screensets from templates
  for (const screenset of screensets) {
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
  };
  files.push({
    path: 'hai3.config.json',
    content: JSON.stringify(config, null, 2) + '\n',
  });

  // 5.2 package.json
  // Use 'alpha' tag for @hai3 packages during alpha phase
  // This resolves to the latest alpha version from npm
  const dependencies: Record<string, string> = {
    '@hai3/uicore': 'alpha',
    '@hai3/uikit-contracts': 'alpha',
    '@reduxjs/toolkit': '2.2.1',
    lodash: '4.17.21',
    'lucide-react': '0.344.0',
    react: '18.3.1',
    'react-dom': '18.3.1',
    'react-markdown': '10.1.0',
    'remark-gfm': '4.0.1',
    'tailwindcss-animate': '1.0.7',
  };

  if (uikit === 'hai3') {
    dependencies['@hai3/uikit'] = 'alpha';
  }

  const devDependencies: Record<string, string> = {
    '@hai3/cli': 'alpha',
    '@types/lodash': '4.17.20',
    '@types/react': '18.3.3',
    '@types/react-dom': '18.3.0',
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
    tsx: '4.20.6',
    typescript: '5.4.2',
    'typescript-eslint': '8.32.1',
    vite: '6.4.1',
  };

  if (studio) {
    devDependencies['@hai3/studio'] = 'alpha';
  }

  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: {
      node: '>=25.1.0',
    },
    workspaces: ['eslint-plugin-local'],
    scripts: {
      dev: 'npm run generate:colors && vite',
      build: 'npm run generate:colors && vite build',
      preview: 'vite preview',
      lint: 'npm run build --workspace=eslint-plugin-local && eslint . --max-warnings 0',
      'type-check': 'npm run generate:colors && tsc --noEmit',
      'generate:colors': 'npx tsx scripts/generate-colors.ts',
      'arch:check': 'npx tsx scripts/test-architecture.ts',
      'arch:deps':
        'npx dependency-cruiser src/ --config .dependency-cruiser.cjs --output-type err-long',
    },
    dependencies,
    devDependencies,
  };

  files.push({
    path: 'package.json',
    content: JSON.stringify(packageJson, null, 2) + '\n',
  });

  // Config files (eslint.config.js, tsconfig.json, .dependency-cruiser.cjs)
  // are copied from templates by the manifest - no need to generate here

  return files;
}
