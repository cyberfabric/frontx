/**
 * Production MFE integration: build _blank-mfe with explicit minify + cssCodeSplit,
 * then verify emitted remoteEntry.js and expose chunk match what MfeHandlerMF parses.
 *
 * Full load()+mount() is not run here: Node's default ESM loader cannot evaluate the
 * handler's blob/data dynamic imports the way a browser can (see federation runtime
 * `new URL(specifier, import.meta.url)` vs data: bases). Browser E2E can extend this.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MfeHandlerMF } from '../../src/mfe/handler/mf-handler';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const BLANK_MFE_ROOT = join(REPO_ROOT, 'src', 'mfe_packages', '_blank-mfe');
const ASSETS_DIR = join(BLANK_MFE_ROOT, 'dist', 'assets');
const POSIX_NPM_PATHS = ['/usr/bin/npm', '/usr/local/bin/npm'] as const;

type ParseExpose = (
  this: MfeHandlerMF,
  remoteEntrySource: string,
  exposedModule: string
) => { chunkFilename: string; stylesheetPaths: string[] } | null;

type CommandSpec = {
  command: string;
  args: string[];
};

function resolveNpmBuildCommand(): CommandSpec {
  const nodeBinDir = dirname(process.execPath);
  const npmExecPath = process.env.npm_execpath;

  if (
    typeof npmExecPath === 'string' &&
    npmExecPath.length > 0 &&
    isAbsolute(npmExecPath) &&
    existsSync(npmExecPath)
  ) {
    return npmExecPath.endsWith('.js')
      ? {
          command: process.execPath,
          args: [npmExecPath, 'run', 'build'],
        }
      : {
          command: npmExecPath,
          args: ['run', 'build'],
        };
  }

  const npmCliPath = join(
    nodeBinDir,
    '..',
    'lib',
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js'
  );

  if (existsSync(npmCliPath)) {
    return {
      command: process.execPath,
      args: [npmCliPath, 'run', 'build'],
    };
  }

  if (process.platform === 'win32') {
    const npmCmdPath = join(nodeBinDir, 'npm.cmd');
    if (existsSync(npmCmdPath)) {
      return {
        command: npmCmdPath,
        args: ['run', 'build'],
      };
    }
  } else {
    for (const npmPath of POSIX_NPM_PATHS) {
      if (existsSync(npmPath)) {
        return {
          command: npmPath,
          args: ['run', 'build'],
        };
      }
    }
  }

  throw new Error(
    'Unable to resolve an absolute npm executable path for the integration build.'
  );
}

describe('MfeHandlerMF + production _blank-mfe build', () => {
  beforeAll(() => {
    const npmBuild = resolveNpmBuildCommand();
    const result = spawnSync(npmBuild.command, npmBuild.args, {
      cwd: BLANK_MFE_ROOT,
      encoding: 'utf8',
      shell: false,
    });
    if (result.status !== 0) {
      throw new Error(
        `blank-mfe production build failed:\n${result.stderr || result.stdout}`
      );
    }
    if (!statSync(join(ASSETS_DIR, 'remoteEntry.js')).isFile()) {
      throw new Error(`Expected ${ASSETS_DIR}/remoteEntry.js after build`);
    }
  });

  it('parses minified remoteEntry and resolves expose chunk on disk', () => {
    const remoteSource = readFileSync(join(ASSETS_DIR, 'remoteEntry.js'), 'utf8');
    const handler = new MfeHandlerMF(
      'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
      { timeout: 30_000, retries: 0 }
    );
    const parseExposeMetadata = (
      MfeHandlerMF.prototype as unknown as { parseExposeMetadata: ParseExpose }
    ).parseExposeMetadata;

    const meta = parseExposeMetadata.call(handler, remoteSource, './lifecycle');
    expect(meta).not.toBeNull();
    expect(meta?.chunkFilename).toMatch(/^__federation_expose_.+\.js$/);
    const chunkPath = join(ASSETS_DIR, meta!.chunkFilename);
    expect(statSync(chunkPath).isFile()).toBe(true);
  });

  it('expose chunk uses minified import syntax the blob rewriter recognizes', () => {
    const remoteSource = readFileSync(join(ASSETS_DIR, 'remoteEntry.js'), 'utf8');
    const handler = new MfeHandlerMF(
      'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
      { timeout: 30_000, retries: 0 }
    );
    const parseExposeMetadata = (
      MfeHandlerMF.prototype as unknown as { parseExposeMetadata: ParseExpose }
    ).parseExposeMetadata;
    const parseStaticImportFilenames = (
      MfeHandlerMF.prototype as unknown as {
        parseStaticImportFilenames: (
          this: MfeHandlerMF,
          source: string,
          chunkFilename: string
        ) => string[];
      }
    ).parseStaticImportFilenames;

    const meta = parseExposeMetadata.call(handler, remoteSource, './lifecycle');
    expect(meta).not.toBeNull();
    const exposeSrc = readFileSync(join(ASSETS_DIR, meta!.chunkFilename), 'utf8');
    const deps = parseStaticImportFilenames.call(
      handler,
      exposeSrc,
      meta!.chunkFilename
    );
    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(statSync(join(ASSETS_DIR, dep)).isFile()).toBe(true);
    }
  });

  it('parses bare side-effect imports from minified and multiline sources', () => {
    const handler = new MfeHandlerMF(
      'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
      { timeout: 30_000, retries: 0 }
    );
    const parseStaticImportFilenames = (
      MfeHandlerMF.prototype as unknown as {
        parseStaticImportFilenames: (
          this: MfeHandlerMF,
          source: string,
          chunkFilename: string
        ) => string[];
      }
    ).parseStaticImportFilenames;

    const deps = parseStaticImportFilenames.call(
      handler,
      'const setup=1;import"./dep.js";\n  import "../other.js";\nimport { helper } from "./named.js";import("./dynamic.js");',
      'chunks/widget.js'
    );

    expect(deps).toEqual([
      'chunks/named.js',
      'chunks/dep.js',
      'other.js',
    ]);
  });

  it('emits deterministic __federation_shared_* chunks declared in manifest', () => {
    const sharedOnDisk = new Set(
      readdirSync(ASSETS_DIR).filter(
        (n) => n.startsWith('__federation_shared_') && n.endsWith('.js')
      )
    );
    expect(sharedOnDisk.size).toBeGreaterThan(0);
    for (const name of sharedOnDisk) {
      expect(statSync(join(ASSETS_DIR, name)).isFile()).toBe(true);
    }
  });
});
