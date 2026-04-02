import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {
  copyDirectoryWithTransform,
  joinUnderRoot,
  writeGeneratedFiles,
} from './fs.js';

describe('joinUnderRoot', () => {
  it('joins safe relative paths under the root', () => {
    expect(joinUnderRoot('/repo', 'src', 'index.ts')).toBe(path.resolve('/repo', 'src', 'index.ts'));
  });

  it('rejects paths that escape the root', () => {
    expect(() => joinUnderRoot('/repo', '..', 'etc', 'passwd')).toThrow(
      /unsafe path segment/
    );
  });
});

describe('writeGeneratedFiles', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'frontx-cli-fs-write-'));
  });

  afterEach(async () => {
    await fs.remove(tempRoot);
  });

  it('writes nested generated files and returns their relative paths', async () => {
    const written = await writeGeneratedFiles(tempRoot, [
      { path: path.join('src', 'index.ts'), content: 'export const ok = true;\n' },
      { path: path.join('docs', 'guide.md'), content: '# Guide\n' },
    ]);

    expect(written).toEqual([path.join('src', 'index.ts'), path.join('docs', 'guide.md')]);
    await expect(fs.readFile(path.join(tempRoot, 'src', 'index.ts'), 'utf-8')).resolves.toBe(
      'export const ok = true;\n'
    );
    await expect(fs.readFile(path.join(tempRoot, 'docs', 'guide.md'), 'utf-8')).resolves.toBe(
      '# Guide\n'
    );
  });
});

describe('copyDirectoryWithTransform', () => {
  let sourceRoot: string;
  let targetRoot: string;

  beforeEach(async () => {
    sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'frontx-cli-fs-src-'));
    targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'frontx-cli-fs-dst-'));

    await fs.ensureDir(path.join(sourceRoot, 'nested'));
    await fs.writeFile(path.join(sourceRoot, 'README.md'), 'hello root');
    await fs.writeFile(path.join(sourceRoot, 'nested', 'file.txt'), 'hello nested');
  });

  afterEach(async () => {
    await fs.remove(sourceRoot);
    await fs.remove(targetRoot);
  });

  it('copies recursively, transforms content, and optionally renames files', async () => {
    const copied = await copyDirectoryWithTransform(
      sourceRoot,
      targetRoot,
      (content, filePath) => `${content} :: ${path.basename(filePath)}`,
      (fileName) => fileName.replace('README', 'GUIDE')
    );

    expect(copied).toEqual(['GUIDE.md', path.join('nested', 'file.txt')]);
    await expect(fs.readFile(path.join(targetRoot, 'GUIDE.md'), 'utf-8')).resolves.toBe(
      'hello root :: README.md'
    );
    await expect(fs.readFile(path.join(targetRoot, 'nested', 'file.txt'), 'utf-8')).resolves.toBe(
      'hello nested :: file.txt'
    );
  });
});
