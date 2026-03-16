import fs from 'fs-extra';
import path from 'path';
import type { Hai3Config } from '../core/types.js';

/**
 * Config file name
 */
export const CONFIG_FILE = 'hai3.config.json';

/**
 * Check if a directory has @hai3/* dependencies in package.json
 */
async function hasHai3Dependencies(dir: string): Promise<boolean> {
  const packageJsonPath = path.join(dir, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return false;
  }
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    return Object.keys(allDeps).some((dep) => dep.startsWith('@hai3/'));
  } catch {
    return false;
  }
}

/**
 * Find HAI3 project root by looking for hai3.config.json or package.json with @hai3/* deps
 * Traverses parent directories until found or reaches filesystem root
 */
export async function findProjectRoot(
  startDir: string
): Promise<string | null> {
  let currentDir = path.resolve(startDir);
  const { root } = path.parse(currentDir);

  while (currentDir !== root) {
    // First check for explicit hai3.config.json
    const configPath = path.join(currentDir, CONFIG_FILE);
    if (await fs.pathExists(configPath)) {
      return currentDir;
    }
    // Fallback: check for package.json with @hai3/* dependencies
    if (await hasHai3Dependencies(currentDir)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load HAI3 config from project root
 * Returns null if config file doesn't exist
 */
export async function loadConfig(
  projectRoot: string
): Promise<Hai3Config | null> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content) as Hai3Config;
}

/**
 * Save HAI3 config to project root
 */
export async function saveConfig(
  projectRoot: string,
  config: Hai3Config
): Promise<void> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Check if a directory is inside a HAI3 project
 */
export async function isInsideProject(dir: string): Promise<boolean> {
  return (await findProjectRoot(dir)) !== null;
}

/**
 * Get screensets directory path
 */
export function getScreensetsDir(projectRoot: string): string {
  return path.join(projectRoot, 'src', 'screensets');
}

/**
 * Check if a screenset exists
 */
export async function screensetExists(
  projectRoot: string,
  screensetId: string
): Promise<boolean> {
  const screensetPath = path.join(getScreensetsDir(projectRoot), screensetId);
  return fs.pathExists(screensetPath);
}
