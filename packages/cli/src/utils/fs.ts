// @cpt-dod:cpt-frontx-dod-cli-tooling-templates:p1
import fs from 'fs-extra';
import path from 'path';
import type { GeneratedFile } from '../core/types.js';

/**
 * Resolve path segments under root; rejects traversal outside root (e.g. via `..` segments).
 */
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function joinUnderRoot(root: string, ...segments: string[]): string {
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SAFE_PATH_SEGMENT.test(segment)) {
      throw new Error(`Refusing unsafe path segment: ${JSON.stringify(segment)}`);
    }
  }
  const base = path.resolve(root);
  const full = path.resolve(base, ...segments);
  const rel = path.relative(base, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Resolved path escapes root directory: ${full}`);
  }
  return full;
}

/**
 * Write generated files to disk atomically
 * Creates directories as needed
 */
export async function writeGeneratedFiles(
  basePath: string,
  files: GeneratedFile[]
): Promise<string[]> {
  const writtenPaths: string[] = [];

  for (const file of files) {
    const fullPath = path.join(basePath, file.path);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.ensureDir(dir);

    // Write file
    await fs.writeFile(fullPath, file.content, 'utf-8');
    writtenPaths.push(file.path);
  }

  return writtenPaths;
}

/**
 * Copy directory recursively with content transformation
 */
export async function copyDirectoryWithTransform(
  sourceDir: string,
  targetDir: string,
  transform: (content: string, filePath: string) => string,
  renameFile?: (fileName: string) => string
): Promise<string[]> {
  const copiedPaths: string[] = [];

  async function copyRecursive(srcDir: string, destDir: string): Promise<void> {
    await fs.ensureDir(destDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      let destName = entry.name;

      if (renameFile) {
        destName = renameFile(entry.name);
      }

      const destPath = path.join(destDir, destName);

      if (entry.isDirectory()) {
        await copyRecursive(srcPath, destPath);
      } else {
        const content = await fs.readFile(srcPath, 'utf-8');
        const transformed = transform(content, srcPath);
        await fs.writeFile(destPath, transformed, 'utf-8');
        copiedPaths.push(path.relative(targetDir, destPath));
      }
    }
  }

  await copyRecursive(sourceDir, targetDir);
  return copiedPaths;
}
