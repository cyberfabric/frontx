/**
 * Production MFE integration: build _blank-mfe and verify that:
 *  - mf-manifest.json is emitted by @module-federation/vite
 *  - mfe.gts-manifest.json is emitted by the FrontxMfGtsPlugin
 *  - The GTS manifest shape matches MfManifest (with mfInitKey, chunkPath, unwrapKey)
 *  - MfeHandlerMF can derive chunk paths from it without regex parsing
 *
 * Full load()+mount() is not run here: Node's default ESM loader cannot evaluate
 * the handler's blob/data dynamic imports the way a browser can. Browser E2E
 * can extend this to a live load test.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MfeHandlerMF } from '../../src/mfe/handler/mf-handler';
import type { MfManifest } from '../../src/mfe/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const BLANK_MFE_ROOT = join(REPO_ROOT, 'src', 'mfe_packages', '_blank-mfe');
/** Root of the build output; chunk paths in manifests are relative to this. */
const DIST_DIR = join(BLANK_MFE_ROOT, 'dist');
/** Raw @module-federation/vite output — used for expose chunk verification */
const RAW_MANIFEST_PATH = join(DIST_DIR, 'mf-manifest.json');
/** GTS manifest emitted by FrontxMfGtsPlugin — the canonical runtime manifest */
const GTS_MANIFEST_PATH = join(DIST_DIR, 'mfe.gts-manifest.json');
/** Keep for backward-compat in tests that read raw manifest */
const MANIFEST_PATH = RAW_MANIFEST_PATH;
const POSIX_NPM_PATHS = ['/usr/bin/npm', '/usr/local/bin/npm'] as const;

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
    // Build the subprocess environment:
    //  - Strip ALL npm_* lifecycle vars: when the outer `npm run test` runs in
    //    packages/screensets, npm sets npm_config_local_prefix and npm_package_json
    //    pointing to the screensets workspace; if forwarded, npm in the subprocess
    //    may resolve the wrong workspace root.
    //  - Force NODE_ENV=production: when vitest sets NODE_ENV=test, Vite runs in
    //    test mode and @module-federation/vite skips the federation plugin entirely,
    //    producing only 1 module with no mf-manifest.json output.
    //  - Strip VITEST* and VITE_* test vars that vitest injects and that may affect
    //    Vite's build mode inside the subprocess.
    //  - Preserve PATH and all other system vars so node/npm remain accessible.
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value !== 'string') continue;
      if (key.startsWith('npm_')) continue;
      if (key.startsWith('VITEST')) continue;
      if (key.startsWith('VITE_')) continue;
      if (key === 'NODE_ENV') continue;
      cleanEnv[key] = value;
    }
    cleanEnv['NODE_ENV'] = 'production';

    const result = spawnSync(npmBuild.command, npmBuild.args, {
      cwd: BLANK_MFE_ROOT,
      encoding: 'utf8',
      shell: false,
      env: cleanEnv,
    });
    const buildInfo = `Build command: ${npmBuild.command} ${npmBuild.args.join(' ')}\n` +
      `Build stdout:\n${result.stdout ?? ''}\n` +
      `Build stderr:\n${result.stderr ?? ''}`;

    if (result.status !== 0) {
      throw new Error(`blank-mfe production build failed (status ${result.status}):\n${buildInfo}`);
    }
    if (!existsSync(RAW_MANIFEST_PATH)) {
      throw new Error(`Expected mf-manifest.json at ${RAW_MANIFEST_PATH} after build.\n${buildInfo}`);
    }
    if (!existsSync(GTS_MANIFEST_PATH)) {
      throw new Error(`Expected mfe.gts-manifest.json at ${GTS_MANIFEST_PATH} after build.\n${buildInfo}`);
    }
  });

  it('emits mf-manifest.json (raw @module-federation/vite output) with correct base structure', () => {
    // mf-manifest.json is the raw MF plugin output (not the GTS manifest).
    // We assert on the fields common to both formats.
    const rawManifest = JSON.parse(readFileSync(RAW_MANIFEST_PATH, 'utf8')) as Record<string, unknown>;

    expect(typeof rawManifest['id']).toBe('string');
    expect(typeof rawManifest['name']).toBe('string');
    expect(typeof rawManifest['metaData']).toBe('object');
    expect(Array.isArray(rawManifest['shared'])).toBe(true);
    expect(Array.isArray(rawManifest['exposes'])).toBe(true);
  });

  it('mf-manifest.json exposes[].assets.js.sync points to existing chunk files', () => {
    type RawExposeEntry = {
      id: string; name: string; path: string;
      assets: { js: { sync: string[]; async: string[] }; css: { sync: string[]; async: string[] } };
    };
    const manifest = JSON.parse(readFileSync(RAW_MANIFEST_PATH, 'utf8')) as {
      exposes: RawExposeEntry[];
    };

    expect(Array.isArray(manifest.exposes)).toBe(true);
    expect(manifest.exposes.length).toBeGreaterThan(0);

    for (const expose of manifest.exposes) {
      const syncChunks = expose.assets.js.sync;
      expect(syncChunks.length).toBeGreaterThan(0);
      for (const chunk of syncChunks) {
        // Chunk paths are relative to DIST_DIR (e.g. 'assets/lifecycle-xxx.js')
        const chunkPath = join(DIST_DIR, chunk);
        expect(statSync(chunkPath).isFile()).toBe(true);
      }
    }
  });

  it('mf-manifest.json exposes ./lifecycle and its sync chunk is on disk', () => {
    type RawExposeEntry = {
      id: string; name: string; path: string;
      assets: { js: { sync: string[]; async: string[] }; css: { sync: string[]; async: string[] } };
    };
    const manifest = JSON.parse(readFileSync(RAW_MANIFEST_PATH, 'utf8')) as {
      exposes: RawExposeEntry[];
    };

    // _blank-mfe exposes './lifecycle'. The MF 2.0 plugin emits name without
    // the './' prefix (name: 'lifecycle'), so match by path or name.
    const lifecycleExpose = manifest.exposes.find(
      (e) => e.name === './lifecycle' || e.name === 'lifecycle' || e.path === './lifecycle'
    );
    expect(lifecycleExpose).toBeDefined();

    const syncChunk = lifecycleExpose!.assets.js.sync[0];
    expect(typeof syncChunk).toBe('string');
    expect(syncChunk.length).toBeGreaterThan(0);

    // Chunk paths are relative to DIST_DIR (e.g. 'assets/lifecycle-xxx.js')
    const chunkPath = join(DIST_DIR, syncChunk);
    expect(statSync(chunkPath).isFile()).toBe(true);
  });

  it('expose chunk uses import syntax the blob rewriter recognizes', () => {
    type RawExposeEntry = {
      id: string; name: string; path: string;
      assets: { js: { sync: string[]; async: string[] }; css: { sync: string[]; async: string[] } };
    };
    const manifest = JSON.parse(readFileSync(RAW_MANIFEST_PATH, 'utf8')) as {
      exposes: RawExposeEntry[];
    };

    const lifecycleExpose = manifest.exposes.find(
      (e) => e.name === './lifecycle' || e.name === 'lifecycle' || e.path === './lifecycle'
    );
    expect(lifecycleExpose).toBeDefined();

    const handler = new MfeHandlerMF(
      'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
      { timeout: 30_000, retries: 0 }
    );

    // parseStaticImportFilenames is private. Integration tests access it via
    // prototype to verify the blob rewriter handles real production-minified
    // import syntax — the public load() API cannot be driven in Node because
    // dynamic blob/data imports require a browser ESM loader.
    type MfeHandlerMFInternal = Record<string, (source: string, chunkFilename: string) => string[]>;
    const proto = MfeHandlerMF.prototype as MfeHandlerMFInternal;
    const parseStaticImportFilenames = proto.parseStaticImportFilenames;

    // Chunk paths in manifest are relative to DIST_DIR
    const chunkFilename = lifecycleExpose!.assets.js.sync[0];
    const exposeSrc = readFileSync(join(DIST_DIR, chunkFilename), 'utf8');
    // Pass just the filename portion (no 'assets/' prefix) as the chunk identity
    // for path resolution purposes — imports within the chunk are relative to it.
    const deps = parseStaticImportFilenames.call(handler, exposeSrc, chunkFilename);

    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(statSync(join(DIST_DIR, dep)).isFile()).toBe(true);
    }
  });

  it('parses bare side-effect imports from minified and multiline sources', () => {
    const handler = new MfeHandlerMF(
      'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
      { timeout: 30_000, retries: 0 }
    );
    type MfeHandlerMFInternal = Record<string, (source: string, chunkFilename: string) => string[]>;
    const proto = MfeHandlerMF.prototype as MfeHandlerMFInternal;
    const parseStaticImportFilenames = proto.parseStaticImportFilenames;

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

  it('emits GTS manifest (mfe.gts-manifest.json) with correct shape', () => {
    const gtsManifest = JSON.parse(readFileSync(GTS_MANIFEST_PATH, 'utf8')) as MfManifest;

    // Top-level shape required by MfManifest
    expect(typeof gtsManifest.id).toBe('string');
    expect(typeof gtsManifest.name).toBe('string');
    expect(gtsManifest.metaData).toBeDefined();
    expect(typeof gtsManifest.metaData.publicPath).toBe('string');
    expect(gtsManifest.metaData.remoteEntry).toBeDefined();
    expect(typeof gtsManifest.metaData.remoteEntry.name).toBe('string');
    expect(Array.isArray(gtsManifest.shared)).toBe(true);
    // mfInitKey extracted from remoteEntry.js by the plugin
    expect(typeof gtsManifest.mfInitKey).toBe('string');
    expect(gtsManifest.mfInitKey.length).toBeGreaterThan(0);
    expect(gtsManifest.mfInitKey).toContain('__mf_init__');
  });

  it('GTS manifest shared[] has chunkPath and unwrapKey (not assets)', () => {
    const gtsManifest = JSON.parse(readFileSync(GTS_MANIFEST_PATH, 'utf8')) as MfManifest;

    expect(gtsManifest.shared.length).toBeGreaterThan(0);
    for (const dep of gtsManifest.shared) {
      // chunkPath is string | null (null = no bundled chunk)
      expect(dep.chunkPath === null || typeof dep.chunkPath === 'string').toBe(true);
      // unwrapKey is string | null
      expect(dep.unwrapKey === null || typeof dep.unwrapKey === 'string').toBe(true);
    }
  });

  it('GTS manifest shared[] chunkPath files exist on disk', () => {
    const gtsManifest = JSON.parse(readFileSync(GTS_MANIFEST_PATH, 'utf8')) as MfManifest;

    let checkedCount = 0;
    for (const dep of gtsManifest.shared) {
      if (dep.chunkPath !== null) {
        // chunkPath is relative to dist/ (includes assets/ prefix)
        const fullPath = join(DIST_DIR, dep.chunkPath);
        expect(statSync(fullPath).isFile()).toBe(true);
        checkedCount++;
      }
    }
    // At least some deps should have a chunk (react, react-dom, etc.)
    expect(checkedCount).toBeGreaterThan(0);
  });

  it('GTS manifest shared[].version contains exact version strings (not wildcards)', () => {
    const gtsManifest = JSON.parse(readFileSync(GTS_MANIFEST_PATH, 'utf8')) as MfManifest;

    expect(gtsManifest.shared.length).toBeGreaterThan(0);
    for (const dep of gtsManifest.shared) {
      // Exact version (e.g. '19.2.4') — NOT wildcard '*'
      expect(dep.version).not.toBe('*');
      expect(dep.version).toMatch(/^\d+\.\d+\.\d+/);
    }
  });
});
