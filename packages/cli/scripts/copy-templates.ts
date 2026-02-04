/**
 * Copy template files from main project to CLI package
 *
 * This script is DRIVEN BY manifest.yaml - the single source of truth for template assembly.
 *
 * 3-Stage Pipeline:
 * - Stage 1a: Copy static presets from packages/cli/template-sources/project/
 * - Stage 1b: Copy root project files (source code that IS the monorepo app)
 * - Stage 1c: Assemble .ai/ from markers (uses ai-overrides/ for @standalone:override files)
 * - Stage 2: Generate IDE rules and command adapters
 *
 * AI CONFIGURATION STRATEGY:
 * - Root .ai/ is canonical source of truth for all rules and commands
 * - Files marked with <!-- @standalone --> are copied verbatim
 * - Files marked with <!-- @standalone:override --> use versions from ai-overrides/
 * - Files without markers are monorepo-only (not copied)
 * - hai3dev-* commands are monorepo-only (not copied to standalone projects)
 * - Command adapters are GENERATED for all IDEs
 * - OpenSpec commands are copied from root .claude/commands/openspec/ to all IDE directories
 */
import fs from 'fs-extra';
import lodash from 'lodash';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import {
  TARGET_LAYERS,
  isTargetApplicableToLayer,
  type LayerType,
} from '../src/core/layers.js';

const { trim } = lodash;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(CLI_ROOT, '../..');
const TEMPLATES_DIR = path.join(CLI_ROOT, 'templates');
const MANIFEST_PATH = path.join(CLI_ROOT, 'template-sources', 'manifest.yaml');

/**
 * Manifest schema (loaded from manifest.yaml)
 */
interface Manifest {
  version: string;
  description: string;
  project: {
    source: string;
    description: string;
    contents: string[];
  };
  layout: {
    source: string;
    description: string;
    destination: string;
    files: string[];
  };
  root: {
    description: string;
    files: string[];
    directories: string[];
    screensets: string[];
    screensetTemplate: string;
  };
  ai_overrides: {
    source: string;
    description: string;
    usage: string;
    contents: string[];
  };
  generated: {
    description: string;
    files: string[];
  };
  output: {
    directory: string;
    description: string;
  };
}

/**
 * Load and parse manifest.yaml
 */
async function loadManifest(): Promise<Manifest> {
  if (!(await fs.pathExists(MANIFEST_PATH))) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }

  const content = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest = yaml.load(content) as Manifest;

  // Validate required fields
  if (!manifest.version || !manifest.project || !manifest.root) {
    throw new Error('Invalid manifest: missing required fields');
  }

  return manifest;
}

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
 * Generates adapters for Claude (commands), Cursor (commands), and Windsurf (workflows)
 * Excludes hai3dev-* commands (monorepo-only)
 *
 * @param standaloneCommands - List of standalone command paths
 * @param templatesDir - Destination templates directory
 * @param layer - Target layer (currently unused for adapters, reserved for future use)
 */
async function generateCommandAdapters(
  standaloneCommands: string[],
  templatesDir: string,
  _layer: LayerType = 'app'
): Promise<{ claude: number; cursor: number; windsurf: number }> {
  const claudeCommandsDir = path.join(templatesDir, '.claude', 'commands');
  const cursorCommandsDir = path.join(templatesDir, '.cursor', 'commands');
  const windsurfWorkflowsDir = path.join(templatesDir, '.windsurf', 'workflows');

  await fs.ensureDir(claudeCommandsDir);
  await fs.ensureDir(cursorCommandsDir);
  await fs.ensureDir(windsurfWorkflowsDir);

  let claudeCount = 0;
  let cursorCount = 0;
  let windsurfCount = 0;

  // Generate hai3-* command adapters
  for (const relativePath of standaloneCommands) {
    // Only process commands/ directory files
    if (!relativePath.startsWith('commands/')) continue;

    const cmdFileName = path.basename(relativePath); // e.g., "hai3-validate.md"

    // Skip internal commands (monorepo-only - hai3dev-* and commands/internal/)
    if (cmdFileName.startsWith('hai3dev-') || relativePath.includes('commands/internal/')) continue;

    const srcPath = path.join(PROJECT_ROOT, '.ai', relativePath);
    const description = await extractCommandDescription(srcPath);

    // Claude adapter
    const claudeContent = `---
description: ${description}
---

Use \`.ai/${relativePath}\` as the single source of truth.
`;
    await fs.writeFile(path.join(claudeCommandsDir, cmdFileName), claudeContent);
    claudeCount++;

    // Cursor adapter (same format as Claude)
    const cursorContent = `---
description: ${description}
---

Use \`.ai/${relativePath}\` as the single source of truth.
`;
    await fs.writeFile(path.join(cursorCommandsDir, cmdFileName), cursorContent);
    cursorCount++;

    // Windsurf adapter (workflow format)
    const windsurfContent = `---
description: ${description}
---

Use \`.ai/${relativePath}\` as the single source of truth.
`;
    await fs.writeFile(path.join(windsurfWorkflowsDir, cmdFileName), windsurfContent);
    windsurfCount++;
  }

  // Copy openspec commands (actual content, not adapters)
  // Source: .claude/commands/openspec/ (canonical location)
  // Claude/Cursor: copy to openspec/ subfolder
  // Windsurf: copy with flattened names (no subfolder support)
  const openspecSrc = path.join(PROJECT_ROOT, '.claude', 'commands', 'openspec');
  if (await fs.pathExists(openspecSrc)) {
    const claudeOpenspecDir = path.join(claudeCommandsDir, 'openspec');
    const cursorOpenspecDir = path.join(cursorCommandsDir, 'openspec');
    await fs.ensureDir(claudeOpenspecDir);
    await fs.ensureDir(cursorOpenspecDir);

    const openspecFiles = await fs.readdir(openspecSrc);
    for (const file of openspecFiles) {
      if (!file.endsWith('.md')) continue;

      const srcFilePath = path.join(openspecSrc, file);
      const name = file.replace('.md', ''); // e.g., "apply"

      // Claude: copy to openspec/apply.md
      await fs.copy(srcFilePath, path.join(claudeOpenspecDir, file));
      claudeCount++;

      // Cursor: copy to openspec/apply.md
      await fs.copy(srcFilePath, path.join(cursorOpenspecDir, file));
      cursorCount++;

      // Windsurf: copy to openspec-apply.md (flattened)
      await fs.copy(srcFilePath, path.join(windsurfWorkflowsDir, `openspec-${name}.md`));
      windsurfCount++;
    }
  }

  return { claude: claudeCount, cursor: cursorCount, windsurf: windsurfCount };
}

/**
 * Copy OpenSpec 1.1.1 skills from root project to CLI templates
 * Copies skill directories for Claude, Cursor, and Windsurf
 * Copies OPSX command files for GitHub Copilot
 * Source: .claude/skills/openspec-XX/, .cursor/skills/openspec-XX/, .windsurf/skills/openspec-XX/
 *         .github/copilot-commands/opsx-*.md
 *
 * @param templatesDir - Destination templates directory
 */
async function copyOpenSpecSkills(
  templatesDir: string
): Promise<{ claude: number; cursor: number; windsurf: number; copilot: number }> {
  const claudeSkillsDir = path.join(templatesDir, '.claude', 'skills');
  const cursorSkillsDir = path.join(templatesDir, '.cursor', 'skills');
  const windsurfSkillsDir = path.join(templatesDir, '.windsurf', 'skills');
  const copilotCommandsDir = path.join(templatesDir, '.github', 'copilot-commands');

  await fs.ensureDir(claudeSkillsDir);
  await fs.ensureDir(cursorSkillsDir);
  await fs.ensureDir(windsurfSkillsDir);
  await fs.ensureDir(copilotCommandsDir);

  let claudeCount = 0;
  let cursorCount = 0;
  let windsurfCount = 0;
  let copilotCount = 0;

  // Copy Claude skills
  const claudeSrc = path.join(PROJECT_ROOT, '.claude', 'skills');
  if (await fs.pathExists(claudeSrc)) {
    const entries = await fs.readdir(claudeSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('openspec-')) {
        const srcPath = path.join(claudeSrc, entry.name);
        const destPath = path.join(claudeSkillsDir, entry.name);
        await fs.copy(srcPath, destPath);
        claudeCount++;
      }
    }
  }

  // Copy Cursor skills
  const cursorSrc = path.join(PROJECT_ROOT, '.cursor', 'skills');
  if (await fs.pathExists(cursorSrc)) {
    const entries = await fs.readdir(cursorSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('openspec-')) {
        const srcPath = path.join(cursorSrc, entry.name);
        const destPath = path.join(cursorSkillsDir, entry.name);
        await fs.copy(srcPath, destPath);
        cursorCount++;
      }
    }
  }

  // Copy Windsurf skills
  const windsurfSrc = path.join(PROJECT_ROOT, '.windsurf', 'skills');
  if (await fs.pathExists(windsurfSrc)) {
    const entries = await fs.readdir(windsurfSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('openspec-')) {
        const srcPath = path.join(windsurfSrc, entry.name);
        const destPath = path.join(windsurfSkillsDir, entry.name);
        await fs.copy(srcPath, destPath);
        windsurfCount++;
      }
    }
  }

  // Copy GitHub Copilot OPSX commands
  const copilotSrc = path.join(PROJECT_ROOT, '.github', 'copilot-commands');
  if (await fs.pathExists(copilotSrc)) {
    const entries = await fs.readdir(copilotSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith('opsx-') && entry.name.endsWith('.md')) {
        const srcPath = path.join(copilotSrc, entry.name);
        const destPath = path.join(copilotCommandsDir, entry.name);
        await fs.copy(srcPath, destPath);
        copilotCount++;
      }
    }
  }

  return { claude: claudeCount, cursor: cursorCount, windsurf: windsurfCount, copilot: copilotCount };
}

/**
 * Bundle commands from @hai3 packages into CLI templates
 * These are the actual command files (not adapters) that ship with each package
 * Scans packages/[pkg]/commands/[cmd].md and copies ALL variants to a commands-bundle directory
 * The variant selection happens at project creation time, not at CLI build time
 *
 * @param templatesDir - Destination templates directory
 */
async function bundlePackageCommands(
  templatesDir: string
): Promise<{ bundledVariants: number; baseCommands: Set<string> }> {
  const commandsBundleDir = path.join(templatesDir, 'commands-bundle');
  await fs.ensureDir(commandsBundleDir);

  let bundledVariants = 0;
  const baseCommands = new Set<string>(); // Track base command names (without variants)

  // Scan packages/*/commands/ directories
  const packagesDir = path.join(PROJECT_ROOT, 'packages');
  const packages = await fs.readdir(packagesDir);

  for (const pkg of packages) {
    // Skip CLI package (has its own commands structure)
    if (pkg === 'cli') continue;

    const commandsDir = path.join(packagesDir, pkg, 'commands');
    if (!(await fs.pathExists(commandsDir))) continue;

    const files = await fs.readdir(commandsDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      // Skip monorepo-only commands
      if (file.startsWith('hai3dev-')) continue;

      const srcPath = path.join(commandsDir, file);
      const destPath = path.join(commandsBundleDir, file);

      // Copy all variants to commands-bundle/
      await fs.copy(srcPath, destPath);
      bundledVariants++;

      // Extract base command name (e.g., "hai3-new-api-service" from "hai3-new-api-service.framework.md")
      const baseName = file.replace(/\.(sdk|framework|react)\.md$/, '').replace(/\.md$/, '');
      baseCommands.add(baseName);
    }
  }

  return { bundledVariants, baseCommands };
}

/**
 * Generate IDE adapters for bundled package commands
 * Creates placeholder adapters that will be populated with actual commands at project creation time
 *
 * @param baseCommands - Set of base command names from bundled commands
 * @param templatesDir - Destination templates directory
 */
async function generateBundledCommandAdapters(
  baseCommands: Set<string>,
  templatesDir: string
): Promise<{ claude: number; cursor: number; windsurf: number }> {
  const claudeCommandsDir = path.join(templatesDir, '.claude', 'commands');
  const cursorCommandsDir = path.join(templatesDir, '.cursor', 'commands');
  const windsurfWorkflowsDir = path.join(templatesDir, '.windsurf', 'workflows');

  await fs.ensureDir(claudeCommandsDir);
  await fs.ensureDir(cursorCommandsDir);
  await fs.ensureDir(windsurfWorkflowsDir);

  let claudeCount = 0;
  let cursorCount = 0;
  let windsurfCount = 0;

  // Generate adapters for each base command
  for (const baseName of baseCommands) {
    const cmdFileName = `${baseName}.md`;

    // Read description from the first available variant in commands-bundle
    const commandsBundleDir = path.join(templatesDir, 'commands-bundle');
    const bundleFiles = await fs.readdir(commandsBundleDir);
    const matchingVariant = bundleFiles.find(f => f.startsWith(baseName));

    if (!matchingVariant) continue;

    const description = await extractCommandDescription(path.join(commandsBundleDir, matchingVariant));

    // Claude adapter
    const claudeContent = `---
description: ${description}
---

Use \`.ai/commands/${cmdFileName}\` as the single source of truth.
`;
    await fs.writeFile(path.join(claudeCommandsDir, cmdFileName), claudeContent);
    claudeCount++;

    // Cursor adapter
    const cursorContent = `---
description: ${description}
---

Use \`.ai/commands/${cmdFileName}\` as the single source of truth.
`;
    await fs.writeFile(path.join(cursorCommandsDir, cmdFileName), cursorContent);
    cursorCount++;

    // Windsurf adapter
    const windsurfContent = `---
description: ${description}
---

Use \`.ai/commands/${cmdFileName}\` as the single source of truth.
`;
    await fs.writeFile(path.join(windsurfWorkflowsDir, cmdFileName), windsurfContent);
    windsurfCount++;
  }

  return { claude: claudeCount, cursor: cursorCount, windsurf: windsurfCount };
}

/**
 * Generate IDE rules as pointers to .ai/GUIDELINES.md
 * All IDEs use the same single source of truth
 */
async function generateIdeRules(templatesDir: string): Promise<void> {
  // CLAUDE.md at project root
  const claudeMdContent = `# CLAUDE.md

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.
`;
  await fs.writeFile(path.join(templatesDir, 'CLAUDE.md'), claudeMdContent);

  // Cursor rules
  const cursorRulesDir = path.join(templatesDir, '.cursor', 'rules');
  await fs.ensureDir(cursorRulesDir);
  const cursorRuleContent = `---
description: HAI3 development guidelines
globs: ["**/*"]
alwaysApply: true
---

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.
`;
  await fs.writeFile(path.join(cursorRulesDir, 'hai3.mdc'), cursorRuleContent);

  // Windsurf rules
  const windsurfRulesDir = path.join(templatesDir, '.windsurf', 'rules');
  await fs.ensureDir(windsurfRulesDir);
  const windsurfRuleContent = `---
trigger: always_on
---

Use \`.ai/GUIDELINES.md\` as the single source of truth for HAI3 development guidelines.
`;
  await fs.writeFile(path.join(windsurfRulesDir, 'hai3.md'), windsurfRuleContent);

  // GitHub Copilot instructions
  const githubDir = path.join(templatesDir, '.github');
  await fs.ensureDir(githubDir);
  const copilotInstructionsContent = `# HAI3 Development Guidelines for GitHub Copilot

Always read \`.ai/GUIDELINES.md\` before making changes.

## Quick Reference

For detailed guidance, use these resources:
- **Architecture**: See \`.ai/GUIDELINES.md\` and target files in \`.ai/targets/\`
- **Event-driven patterns**: \`.ai/targets/EVENTS.md\`
- **Screensets**: \`.ai/targets/SCREENSETS.md\`
- **API services**: \`.ai/targets/API.md\`
- **Styling**: \`.ai/targets/STYLING.md\`
- **Themes**: \`.ai/targets/THEMES.md\`

## Critical Rules

1. **REQUIRED**: Read the appropriate target file before changing code
2. **REQUIRED**: Event-driven architecture only (dispatch events, handle in actions)
3. **FORBIDDEN**: Direct slice dispatch from UI components
4. **FORBIDDEN**: Hardcoded colors or inline styles
5. **REQUIRED**: Use \`@hai3/uikit\` components for all UI
6. **REQUIRED**: Run \`npm run arch:check\` before committing

## Available Commands

Use \`.ai/commands/\` for detailed workflows:
- \`hai3-new-screenset\` - Create new screenset
- \`hai3-new-screen\` - Add screen to screenset
- \`hai3-new-action\` - Create action handler
- \`hai3-new-api-service\` - Add API service
- \`hai3-new-component\` - Add UI component
- \`hai3-validate\` - Validate changes
- \`hai3-quick-ref\` - Quick reference guide

## Routing

Always consult \`.ai/GUIDELINES.md\` ROUTING section to find the correct target file for your task.
`;
  await fs.writeFile(path.join(githubDir, 'copilot-instructions.md'), copilotInstructionsContent);
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
 *
 * @param dir - Directory to scan
 * @param baseDir - Base directory for relative paths
 * @param layer - Target layer for filtering targets (optional)
 */
async function scanForMarkedFiles(
  dir: string,
  baseDir: string,
  layer?: LayerType
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
      const subResults = await scanForMarkedFiles(fullPath, baseDir, layer);
      results.push(...subResults);
    } else if (entry.name.endsWith('.md')) {
      const marker = await getStandaloneMarker(fullPath);
      if (marker) {
        // Filter targets based on layer if specified
        if (layer && relativePath.startsWith('targets/')) {
          const targetFileName = path.basename(relativePath);
          if (!isTargetApplicableToLayer(targetFileName, layer)) {
            console.log(`  ⓘ Excluding target '${targetFileName}' for layer '${layer}'`);
            continue;
          }
        }

        results.push({ relativePath, marker });
      }
    }
  }

  return results;
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  if (!(await fs.pathExists(dir))) return 0;
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

async function copyTemplates() {
  console.log('📦 Copying templates from main project...\n');

  // Load manifest - single source of truth
  const manifest = await loadManifest();
  console.log(`📄 Loaded manifest v${manifest.version}\n`);

  // Clean templates directory
  await fs.remove(TEMPLATES_DIR);
  await fs.ensureDir(TEMPLATES_DIR);

  // ============================================
  // STAGE 1a: Copy static presets (from manifest.project)
  // ============================================
  console.log(`Stage 1a: Static Presets (${manifest.project.source}):`);
  const presetsDir = path.join(CLI_ROOT, 'template-sources/project');

  // Copy eslint-plugin-local
  const eslintPluginSrc = path.join(presetsDir, 'eslint-plugin-local');
  const eslintPluginDest = path.join(TEMPLATES_DIR, 'eslint-plugin-local');
  if (await fs.pathExists(eslintPluginSrc)) {
    await fs.copy(eslintPluginSrc, eslintPluginDest, {
      filter: (src: string) => !src.includes('/dist/') && !src.includes('/node_modules/'),
    });
    console.log(`  ✓ eslint-plugin-local/ (${await countFiles(eslintPluginDest)} files)`);
  }

  // Flatten configs/ to templates root
  const configsSrc = path.join(presetsDir, 'configs');
  if (await fs.pathExists(configsSrc)) {
    const configFiles = await fs.readdir(configsSrc);
    for (const file of configFiles) {
      const srcPath = path.join(configsSrc, file);
      // Rename _pre-commit-config.yaml to .pre-commit-config.yaml
      // (stored with underscore to prevent prek from detecting it during monorepo commits)
      const destFileName = file === '_pre-commit-config.yaml' ? '.pre-commit-config.yaml' : file;
      const destPath = path.join(TEMPLATES_DIR, destFileName);

      // Transform eslint.config.js path for standalone projects
      // In monorepo: ../eslint-plugin-local (configs/ -> eslint-plugin-local/)
      // In standalone: ./eslint-plugin-local (root -> eslint-plugin-local/)
      if (file === 'eslint.config.js') {
        let content = await fs.readFile(srcPath, 'utf-8');
        content = content.replace(
          "../eslint-plugin-local",
          './eslint-plugin-local'
        );
        await fs.writeFile(destPath, content);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
    console.log(`  ✓ configs/ flattened to root (${configFiles.length} files)`);
  }

  // Flatten scripts/ to templates/scripts/
  const scriptsSrc = path.join(presetsDir, 'scripts');
  const scriptsDest = path.join(TEMPLATES_DIR, 'scripts');
  if (await fs.pathExists(scriptsSrc)) {
    await fs.ensureDir(scriptsDest);
    const scriptFiles = await fs.readdir(scriptsSrc);
    for (const file of scriptFiles) {
      await fs.copy(path.join(scriptsSrc, file), path.join(scriptsDest, file));
    }
    console.log(`  ✓ scripts/ (${scriptFiles.length} files)`);
  }

  // Copy root-level files from template-sources/project/
  const presetsEntries = await fs.readdir(presetsDir, { withFileTypes: true });
  const rootFiles = presetsEntries.filter(e => e.isFile());
  for (const file of rootFiles) {
    await fs.copy(path.join(presetsDir, file.name), path.join(TEMPLATES_DIR, file.name));
    console.log(`  ✓ ${file.name}`);
  }

  // ============================================
  // STAGE 1b: Copy root project files (from manifest.root)
  // ============================================
  console.log('\nStage 1b: Root Project Files:');

  // Copy root files from manifest
  for (const file of manifest.root.files) {
    const src = path.join(PROJECT_ROOT, file);
    const dest = path.join(TEMPLATES_DIR, file);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ⚠ ${file} (not found, skipping)`);
    }
  }

  // Copy root directories from manifest
  for (const dir of manifest.root.directories) {
    const src = path.join(PROJECT_ROOT, dir);
    const dest = path.join(TEMPLATES_DIR, dir);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest, {
        filter: (srcPath: string) => {
          // Exclude generated files (they exist in standalone projects, not in templates)
          if (srcPath.endsWith('tailwindColors.ts')) return false;
          return true;
        },
      });
      const fileCount = await countFiles(dest);
      console.log(`  ✓ ${dir}/ (${fileCount} files)`);
    } else {
      console.log(`  ⚠ ${dir}/ (not found, skipping)`);
    }
  }

  // Copy screensets from manifest
  for (const screenset of manifest.root.screensets) {
    const src = path.join(PROJECT_ROOT, 'src/screensets', screenset);
    const dest = path.join(TEMPLATES_DIR, 'src/screensets', screenset);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      const fileCount = await countFiles(dest);
      console.log(`  ✓ src/screensets/${screenset}/ (${fileCount} files)`);
    } else {
      console.log(`  ⚠ src/screensets/${screenset}/ (not found, skipping)`);
    }
  }

  // Copy screenset template from manifest
  const templateSrc = path.join(PROJECT_ROOT, 'src/screensets', manifest.root.screensetTemplate);
  const templateDest = path.join(TEMPLATES_DIR, 'screenset-template');
  if (await fs.pathExists(templateSrc)) {
    await fs.copy(templateSrc, templateDest);
    const fileCount = await countFiles(templateDest);
    console.log(`  ✓ screenset-template/ (${fileCount} files)`);
  }

  // Copy layout templates from monorepo source (single source of truth)
  // Source: /src/app/layout/ (monorepo's canonical layout files)
  // Destination: templates/layout/hai3-uikit/ (CLI template with subdirectory structure)
  const layoutSrc = path.join(PROJECT_ROOT, 'src/app/layout');
  const layoutDest = path.join(TEMPLATES_DIR, 'layout', 'hai3-uikit');
  if (await fs.pathExists(layoutSrc)) {
    await fs.copy(layoutSrc, layoutDest);
    const fileCount = await countFiles(layoutDest);
    console.log(`  ✓ layout/ templates (${fileCount} files from monorepo source)`);
  }

  // ============================================
  // STAGE 1c: Assemble .ai/ from markers (using manifest.ai_overrides)
  // ============================================
  console.log('\nStage 1c: AI Configuration (marker-based):');
  const aiSourceDir = path.join(PROJECT_ROOT, '.ai');
  const aiDestDir = path.join(TEMPLATES_DIR, '.ai');
  const overridesDir = path.join(CLI_ROOT, 'template-sources', 'ai-overrides');

  await fs.ensureDir(aiDestDir);

  // Scan root .ai/ for marked files (no layer filtering at build time)
  const markedFiles = await scanForMarkedFiles(aiSourceDir, aiSourceDir);

  let standaloneCount = 0;
  let overrideCount = 0;

  for (const { relativePath, marker } of markedFiles) {
    const destPath = path.join(aiDestDir, relativePath);
    await fs.ensureDir(path.dirname(destPath));

    // Skip internal commands (monorepo-only - hai3dev-* and commands/internal/)
    if (relativePath.includes('hai3dev-') || relativePath.includes('commands/internal/')) continue;

    if (marker === 'standalone') {
      // Copy verbatim from root .ai/
      const srcPath = path.join(aiSourceDir, relativePath);
      await fs.copy(srcPath, destPath);
      standaloneCount++;
    } else if (marker === 'override') {
      // Copy from ai-overrides/ (path from manifest)
      const overridePath = path.join(overridesDir, relativePath);
      if (await fs.pathExists(overridePath)) {
        await fs.copy(overridePath, destPath);
        overrideCount++;
      } else {
        console.log(`  ⚠ Override not found: ${relativePath}`);
      }
    }
  }

  // Copy all GUIDELINES layer variants from ai-overrides/
  // These will be selected at project creation time based on layer
  const guidelinesVariants = ['GUIDELINES.sdk.md', 'GUIDELINES.framework.md'];
  for (const variant of guidelinesVariants) {
    const variantSrc = path.join(overridesDir, variant);
    const variantDest = path.join(aiDestDir, variant);
    if (await fs.pathExists(variantSrc)) {
      await fs.copy(variantSrc, variantDest);
      console.log(`  ✓ ${variant} (layer variant)`);
    } else {
      console.log(`  ⚠ ${variant} (layer variant not found, skipping)`);
    }
  }

  // Copy company/ and project/ hierarchy directories from ai-overrides/
  // These are preserved across updates and not marked with standalone markers
  const hierarchyDirs = ['company', 'project'];
  for (const dirName of hierarchyDirs) {
    const hierarchySrc = path.join(overridesDir, dirName);
    const hierarchyDest = path.join(aiDestDir, dirName);
    if (await fs.pathExists(hierarchySrc)) {
      await fs.copy(hierarchySrc, hierarchyDest);
      console.log(`  ✓ ${dirName}/ (hierarchy placeholder)`);
    }
  }

  console.log(`  ✓ .ai/ (${standaloneCount} standalone, ${overrideCount} overrides)`);

  // ============================================
  // STAGE 2: Generate IDE rules and adapters
  // ============================================
  console.log('\nStage 2: Generated IDE Configuration:');

  // Generate command adapters for all IDEs (from .ai/commands/)
  const standaloneCommands = markedFiles
    .filter((f) => f.marker === 'standalone')
    .map((f) => f.relativePath);
  const adapterCounts = await generateCommandAdapters(standaloneCommands, TEMPLATES_DIR);

  // Bundle ALL command variants from @hai3 packages (packages/*/commands/)
  // Variant selection happens at project creation time
  const packageCounts = await bundlePackageCommands(TEMPLATES_DIR);

  // Generate IDE adapters for bundled commands
  const bundledAdapterCounts = await generateBundledCommandAdapters(packageCounts.baseCommands, TEMPLATES_DIR);

  const totalClaude = adapterCounts.claude + bundledAdapterCounts.claude;
  const totalCursor = adapterCounts.cursor + bundledAdapterCounts.cursor;
  const totalWindsurf = adapterCounts.windsurf + bundledAdapterCounts.windsurf;

  console.log(`  ✓ .claude/commands/ (${totalClaude} adapters: ${adapterCounts.claude} from .ai/commands/, ${bundledAdapterCounts.claude} from packages)`);
  console.log(`  ✓ .cursor/commands/ (${totalCursor} adapters: ${adapterCounts.cursor} from .ai/commands/, ${bundledAdapterCounts.cursor} from packages)`);
  console.log(`  ✓ .windsurf/workflows/ (${totalWindsurf} adapters: ${adapterCounts.windsurf} from .ai/commands/, ${bundledAdapterCounts.windsurf} from packages)`);
  console.log(`  ✓ commands-bundle/ (${packageCounts.bundledVariants} command variants from packages)`);

  // Copy OpenSpec 1.1.1 skills for all IDEs
  const openspecSkillCounts = await copyOpenSpecSkills(TEMPLATES_DIR);
  console.log(`  ✓ .claude/skills/ (${openspecSkillCounts.claude} OpenSpec skills)`);
  console.log(`  ✓ .cursor/skills/ (${openspecSkillCounts.cursor} OpenSpec skills)`);
  console.log(`  ✓ .windsurf/skills/ (${openspecSkillCounts.windsurf} OpenSpec skills)`);
  console.log(`  ✓ .github/copilot-commands/ (${openspecSkillCounts.copilot} OPSX commands)`);

  // Generate IDE rules (CLAUDE.md, .cursor/rules/, .windsurf/rules/, .github/copilot-instructions.md)
  await generateIdeRules(TEMPLATES_DIR);
  console.log('  ✓ CLAUDE.md (pointer to .ai/GUIDELINES.md)');
  console.log('  ✓ .cursor/rules/hai3.mdc (pointer)');
  console.log('  ✓ .windsurf/rules/hai3.md (pointer)');
  console.log('  ✓ .github/copilot-instructions.md (GitHub Copilot)');

  // ============================================
  // Write output manifest.json (runtime manifest for CLI)
  // ============================================
  const standaloneCommandFiles = standaloneCommands
    .filter((f) => f.startsWith('commands/') && !f.includes('hai3dev-') && !f.includes('commands/internal/'));
  const outputManifest = {
    pipeline: '3-stage',
    sourceManifest: 'packages/cli/template-sources/manifest.yaml',
    stage1a: {
      source: manifest.project.source,
      items: manifest.project.contents,
    },
    stage1b: {
      source: 'project root',
      rootFiles: manifest.root.files,
      directories: manifest.root.directories,
      screensets: manifest.root.screensets,
    },
    stage1c: {
      source: 'root .ai/ (marker-based)',
      overridesSource: manifest.ai_overrides.source,
      standaloneFiles: markedFiles
        .filter((f) => f.marker === 'standalone' && !f.relativePath.includes('hai3dev-') && !f.relativePath.includes('commands/internal/'))
        .map((f) => f.relativePath),
      overrideFiles: markedFiles
        .filter((f) => f.marker === 'override')
        .map((f) => f.relativePath),
    },
    stage2: {
      generated: [
        'CLAUDE.md',
        '.cursor/rules/hai3.mdc',
        '.windsurf/rules/hai3.md',
        ...standaloneCommandFiles.map((f) => `.claude/commands/${path.basename(f)}`),
      ],
    },
    layerConfiguration: {
      description: 'Layer-aware filtering for SDK architecture',
      layers: ['sdk', 'framework', 'react', 'app'],
      targetMapping: TARGET_LAYERS,
      guidelinesVariants: {
        sdk: 'GUIDELINES.sdk.md',
        framework: 'GUIDELINES.framework.md',
        react: 'GUIDELINES.md',
        app: 'GUIDELINES.md',
      },
    },
    screensetTemplate: 'screenset-template',
    generatedAt: new Date().toISOString(),
  };
  await fs.writeJson(path.join(TEMPLATES_DIR, 'manifest.json'), outputManifest, {
    spaces: 2,
  });

  console.log('\n✅ Templates copied successfully!');
  console.log(`   Location: ${TEMPLATES_DIR}`);
}

copyTemplates().catch((err) => {
  console.error('❌ Failed to copy templates:', err);
  process.exit(1);
});
