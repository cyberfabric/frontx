/**
 * Copy template files from main project to CLI package
 *
 * This script runs during CLI build to copy real project files
 * that will be used as templates for new projects.
 *
 * AI CONFIGURATION STRATEGY:
 * - Root .ai/ is canonical source of truth for all rules and commands
 * - Files marked with <!-- @standalone --> are copied verbatim
 * - Files marked with <!-- @standalone:override --> use versions from presets/standalone/ai/
 * - Files without markers are monorepo-only (not copied)
 * - IDE global configs (.cursor/, .windsurf/, etc.) come from presets/standalone/ai/
 * - Command adapters (.claude/commands/hai3-*.md) are GENERATED from @standalone markers
 * - OpenSpec command adapters are copied from presets/standalone/ai/.claude/commands/openspec/
 */
import fs from 'fs-extra';
import { trim } from 'lodash';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(CLI_ROOT, '../..');
const TEMPLATES_DIR = path.join(CLI_ROOT, 'templates');

/**
 * Template configuration
 */
const config = {
  // Root-level files to copy (relative to project root)
  rootFiles: [
    'index.html',
    'postcss.config.ts',
    'tailwind.config.ts',
    'tsconfig.node.json',
    'vite.config.ts',
    '.gitignore',
    'src/vite-env.d.ts',
    'src/main.tsx',
    'src/App.tsx',
    'src/screensets/screensetRegistry.tsx',
  ],

  // Directories to copy entirely (relative to project root)
  directories: [
    'src/themes',
    'src/uikit',
    'src/icons',
    'eslint-plugin-local',
    'presets/standalone', // Copy standalone presets (configs/, scripts/)
  ],

  // IDE configurations from standalone preset (not marker-based)
  ideConfigs: [
    { src: 'presets/standalone/ai/.claude', dest: '.claude' },
    { src: 'presets/standalone/ai/.cursor', dest: '.cursor' },
    { src: 'presets/standalone/ai/.windsurf', dest: '.windsurf' },
    { src: 'presets/standalone/ai/.cline', dest: '.cline' },
    { src: 'presets/standalone/ai/.aider', dest: '.aider' },
    { src: 'presets/standalone/ai/openspec', dest: 'openspec' },
  ],

  // Override files location (for @standalone:override markers)
  standaloneOverridesDir: 'presets/standalone/ai',

  // Screensets to include in new projects
  screensets: ['demo'],

  // Screenset template for `hai3 screenset create`
  screensetTemplate: '_blank',
};

/**
 * Extract description from a command file
 * Looks for the first H1 header after the marker comment
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

/**
 * Generate IDE command adapters from @standalone marked commands
 */
async function generateCommandAdapters(
  standaloneCommands: string[],
  templatesDir: string
): Promise<number> {
  const claudeCommandsDir = path.join(templatesDir, '.claude', 'commands');
  await fs.ensureDir(claudeCommandsDir);

  let count = 0;
  for (const relativePath of standaloneCommands) {
    // Only process commands/ directory files
    if (!relativePath.startsWith('commands/')) continue;

    const cmdFileName = path.basename(relativePath); // e.g., "hai3-validate.md"
    const srcPath = path.join(PROJECT_ROOT, '.ai', relativePath);
    const description = await extractCommandDescription(srcPath);

    const adapterContent = `---
description: ${description}
---

Use \`.ai/${relativePath}\` as the single source of truth.
`;

    const destPath = path.join(claudeCommandsDir, cmdFileName);
    await fs.writeFile(destPath, adapterContent);
    count++;
  }

  return count;
}

/**
 * Check if file has a standalone marker
 */
async function getStandaloneMarker(
  filePath: string
): Promise<'standalone' | 'override' | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const firstLines = content.slice(0, 200); // Check first 200 chars

    if (firstLines.includes('<!-- @standalone:override -->')) {
      return 'override';
    }
    if (firstLines.includes('<!-- @standalone -->')) {
      return 'standalone';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Recursively scan directory for files with markers
 */
async function scanForMarkedFiles(
  dir: string,
  baseDir: string
): Promise<Array<{ relativePath: string; marker: 'standalone' | 'override' }>> {
  const results: Array<{
    relativePath: string;
    marker: 'standalone' | 'override';
  }> = [];

  if (!(await fs.pathExists(dir))) {
    return results;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const subResults = await scanForMarkedFiles(fullPath, baseDir);
      results.push(...subResults);
    } else if (entry.name.endsWith('.md')) {
      const marker = await getStandaloneMarker(fullPath);
      if (marker) {
        results.push({ relativePath, marker });
      }
    }
  }

  return results;
}

async function copyTemplates() {
  console.log('📦 Copying templates from main project...\n');

  // Clean templates directory
  await fs.remove(TEMPLATES_DIR);
  await fs.ensureDir(TEMPLATES_DIR);

  // 1. Copy root files
  console.log('Root files:');
  for (const file of config.rootFiles) {
    const src = path.join(PROJECT_ROOT, file);
    const dest = path.join(TEMPLATES_DIR, file);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ⚠ ${file} (not found, skipping)`);
    }
  }

  // 2. Copy directories
  console.log('\nDirectories:');
  for (const dir of config.directories) {
    const src = path.join(PROJECT_ROOT, dir);
    const dest = path.join(TEMPLATES_DIR, dir);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest, {
        filter: (srcPath: string) => {
          // Exclude generated files and ai/ subfolder (handled separately)
          if (srcPath.endsWith('tailwindColors.ts')) return false;
          if (srcPath.includes('/ai/') || srcPath.endsWith('/ai')) return false;
          return true;
        },
      });
      const fileCount = await countFiles(dest);
      console.log(`  ✓ ${dir}/ (${fileCount} files)`);
    } else {
      console.log(`  ⚠ ${dir}/ (not found, skipping)`);
    }
  }

  // 3. Process AI configuration with markers
  console.log('\nAI Configuration (marker-based):');
  const aiSourceDir = path.join(PROJECT_ROOT, '.ai');
  const aiDestDir = path.join(TEMPLATES_DIR, '.ai');
  const overridesDir = path.join(PROJECT_ROOT, config.standaloneOverridesDir);

  await fs.ensureDir(aiDestDir);

  // Scan root .ai/ for marked files
  const markedFiles = await scanForMarkedFiles(aiSourceDir, aiSourceDir);

  let standaloneCount = 0;
  let overrideCount = 0;

  for (const { relativePath, marker } of markedFiles) {
    const destPath = path.join(aiDestDir, relativePath);
    await fs.ensureDir(path.dirname(destPath));

    if (marker === 'standalone') {
      // Copy verbatim from root .ai/
      const srcPath = path.join(aiSourceDir, relativePath);
      await fs.copy(srcPath, destPath);
      standaloneCount++;
    } else if (marker === 'override') {
      // Copy from presets/standalone/ai/.ai/
      const overridePath = path.join(overridesDir, '.ai', relativePath);
      if (await fs.pathExists(overridePath)) {
        await fs.copy(overridePath, destPath);
        overrideCount++;
      } else {
        console.log(`  ⚠ Override not found: ${relativePath}`);
      }
    }
  }

  console.log(
    `  ✓ .ai/ (${standaloneCount} standalone, ${overrideCount} overrides)`
  );

  // 4. Copy IDE configurations
  console.log('\nIDE Configurations:');
  for (const ideConfig of config.ideConfigs) {
    const src = path.join(PROJECT_ROOT, ideConfig.src);
    const dest = path.join(TEMPLATES_DIR, ideConfig.dest);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      const fileCount = await countFiles(dest);
      console.log(`  ✓ ${ideConfig.dest}/ (${fileCount} files)`);
    } else {
      console.log(`  ⚠ ${ideConfig.src} (not found, skipping)`);
    }
  }

  // 5. Generate command adapters for Claude IDE
  console.log('\nGenerated Command Adapters:');
  const standaloneCommands = markedFiles
    .filter((f) => f.marker === 'standalone')
    .map((f) => f.relativePath);
  const adapterCount = await generateCommandAdapters(
    standaloneCommands,
    TEMPLATES_DIR
  );
  console.log(`  ✓ .claude/commands/ (${adapterCount} generated adapters)`);

  // 6. Copy screensets
  console.log('\nScreensets:');
  for (const screenset of config.screensets) {
    const src = path.join(PROJECT_ROOT, 'src/screensets', screenset);
    const dest = path.join(TEMPLATES_DIR, 'src/screensets', screenset);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      const fileCount = await countFiles(dest);
      console.log(`  ✓ ${screenset}/ (${fileCount} files)`);
    } else {
      console.log(`  ⚠ ${screenset}/ (not found, skipping)`);
    }
  }

  // 7. Copy screenset template
  console.log('\nScreenset Template:');
  const templateSrc = path.join(
    PROJECT_ROOT,
    'src/screensets',
    config.screensetTemplate
  );
  const templateDest = path.join(TEMPLATES_DIR, 'screenset-template');

  if (await fs.pathExists(templateSrc)) {
    await fs.copy(templateSrc, templateDest);
    const fileCount = await countFiles(templateDest);
    console.log(
      `  ✓ ${config.screensetTemplate}/ -> screenset-template/ (${fileCount} files)`
    );
  } else {
    console.log(`  ⚠ ${config.screensetTemplate}/ (not found, skipping)`);
  }

  // 8. Write manifest
  const standaloneCommandFiles = standaloneCommands.filter((f) =>
    f.startsWith('commands/')
  );
  const manifest = {
    rootFiles: config.rootFiles,
    directories: config.directories,
    aiConfig: {
      markerBased: true,
      standaloneFiles: markedFiles
        .filter((f) => f.marker === 'standalone')
        .map((f) => f.relativePath),
      overrideFiles: markedFiles
        .filter((f) => f.marker === 'override')
        .map((f) => f.relativePath),
      generatedAdapters: standaloneCommandFiles.map((f) =>
        `.claude/commands/${path.basename(f)}`
      ),
    },
    ideConfigs: config.ideConfigs.map((c) => c.dest),
    screensets: config.screensets,
    screensetTemplate: 'screenset-template',
    generatedAt: new Date().toISOString(),
  };
  await fs.writeJson(path.join(TEMPLATES_DIR, 'manifest.json'), manifest, {
    spaces: 2,
  });

  console.log('\n✅ Templates copied successfully!');
  console.log(`   Location: ${TEMPLATES_DIR}`);
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

copyTemplates().catch((err) => {
  console.error('❌ Failed to copy templates:', err);
  process.exit(1);
});
