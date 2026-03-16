import fs from 'fs-extra';
import path from 'path';
import type { GeneratedFile } from '../core/types.js';

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
