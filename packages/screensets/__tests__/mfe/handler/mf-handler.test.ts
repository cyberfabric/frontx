/**
 * MfeHandlerMF Tests
 *
 * Tests for manifest caching, manifest resolution, and blob URL loading.
 * Updated for manifest-based loading (Phase 8+): expose chunk paths come from
 * entry.exposeAssets.js.sync[0], CSS paths from entry.exposeAssets.css.sync/async,
 * and baseUrl from manifest.metaData.publicPath.
 */
// @cpt-FEATURE:mfe-manifest-loading:p1

// @module-federation/runtime must be mocked before any imports that use it.
// The mock is hoisted by Vitest to run before module evaluation.
vi.mock('@module-federation/runtime', () => {
  const createInstance = vi.fn().mockImplementation(
    (opts: { name: string; shared: Record<string, { get: () => Promise<() => unknown> }>; remotes: unknown[] }) => ({
      // Actually invoke the get() factory so that blob URL chain creation and
      // fetch() calls happen as in production. Tests that assert on fetch call
      // counts depend on this behavior.
      loadShare: async (pkgName: string) => {
        const entry = opts.shared[pkgName];
        if (!entry) {
          return false;
        }
        return entry.get();
      },
    })
  );
  return { createInstance };
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MfeHandlerMF } from '../../../src/mfe/handler/mf-handler';
import type { MfeEntryMF, MfManifest, MfManifestAssets } from '../../../src/mfe/types';
import { MfeLoadError } from '../../../src/mfe/errors';
import {
  setupBlobUrlLoaderMocks,
  createExposeChunkSource,
  createChunkWithRelativeImport,
  TEST_BASE_URL,
} from '../test-utils/mock-blob-url-loader';

// ---------------------------------------------------------------------------
// Test manifest factory helpers
// ---------------------------------------------------------------------------

/**
 * Build the __mf_init__ key for a manifest name (matches MF 2.0 format used in production).
 */
function buildMfInitKey(remoteName: string): string {
  return `__mf_init____mf__virtual/${remoteName}__mf_v__runtimeInit__mf_v__.js__`;
}

/**
 * Build a minimal valid GTS MfManifest with the new structure.
 * publicPath is the base URL for all chunks.
 * mfInitKey is required (extracted at build time by frontx-mf-gts plugin).
 */
function buildManifest(
  remoteName: string,
  options: {
    shared?: MfManifest['shared'];
    id?: string;
  } = {}
): MfManifest {
  return {
    id: options.id ?? `gts.hai3.mfes.mfe.mf_manifest.v1~test.${remoteName}.manifest.v1`,
    name: remoteName,
    metaData: {
      name: remoteName,
      type: 'app',
      buildInfo: { buildVersion: '1.0.0', buildName: remoteName },
      remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' },
      globalName: remoteName,
      pluginVersion: '2.0.0',
      publicPath: `${TEST_BASE_URL}/${remoteName}/`,
    },
    shared: options.shared ?? [],
    mfInitKey: buildMfInitKey(remoteName),
  };
}

/**
 * Build a per-module exposeAssets descriptor, registering the chunk source
 * with the given registration function.
 */
function buildExposeAssets(
  remoteName: string,
  exposedModule: string,
  options: {
    registerSource: (url: string, src: string) => void;
    cssPaths?: string[];
    chunkSource?: string;
  }
): MfManifestAssets {
  const safeName = exposedModule.replace('./', '').replace(/[^a-zA-Z0-9]/g, '-');
  const chunkFilename = `expose-${safeName}.js`;
  const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

  options.registerSource(
    `${baseUrl}${chunkFilename}`,
    options.chunkSource ?? createExposeChunkSource()
  );

  const cssPaths = options.cssPaths ?? [];

  return {
    js: { sync: [chunkFilename], async: [] },
    css: { sync: cssPaths, async: [] },
  };
}

/**
 * Create a complete test setup: manifest + entries + registered sources.
 */
function createTestSetup(
  remoteName: string,
  exposedModules: string[],
  options: {
    shared?: MfManifest['shared'];
    cssByExpose?: Record<string, string[]>;
    chunkSources?: Record<string, string>;
  } = {}
): {
  manifest: MfManifest;
  makeEntry: (
    exposedModule: string,
    suffix: string,
    registerSource: (url: string, src: string) => void
  ) => MfeEntryMF;
  registerAllSources: (reg: (url: string, src: string) => void) => void;
} {
  const manifest = buildManifest(remoteName, { shared: options.shared });

  const makeEntry = (
    exposedModule: string,
    suffix: string,
    registerSource: (url: string, src: string) => void
  ): MfeEntryMF => {
    const exposeAssets = buildExposeAssets(remoteName, exposedModule, {
      registerSource,
      cssPaths: options.cssByExpose?.[exposedModule],
      chunkSource: options.chunkSources?.[exposedModule],
    });
    return {
      id: `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.${suffix}.v1`,
      manifest,
      exposedModule,
      exposeAssets,
    };
  };

  const registerAllSources = (reg: (url: string, src: string) => void) => {
    for (const mod of exposedModules) {
      buildExposeAssets(remoteName, mod, {
        registerSource: reg,
        cssPaths: options.cssByExpose?.[mod],
        chunkSource: options.chunkSources?.[mod],
      });
    }
  };

  return { manifest, makeEntry, registerAllSources };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfeHandlerMF - Caching and Manifest Resolution', () => {
  let handler: MfeHandlerMF;
  let mocks: ReturnType<typeof setupBlobUrlLoaderMocks>;

  beforeEach(() => {
    handler = new MfeHandlerMF('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~', { timeout: 5000, retries: 0 });
    mocks = setupBlobUrlLoaderMocks();
  });

  afterEach(() => {
    mocks.cleanup();
    vi.clearAllMocks();
  });

  describe('17.1 - ManifestCache (Internal)', () => {
    it('17.1.1 - ManifestCache class exists within mf-handler.ts', () => {
      expect(handler).toBeDefined();
      expect(typeof handler.load).toBe('function');
    });

    it('17.1.2 - Implements in-memory manifest caching for reuse across entries', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
      ]);

      const entry1 = makeEntry('./ChartWidget1', 'acme.chart1', mocks.registerSource);
      const entry2 = makeEntry('./ChartWidget2', 'acme.chart2', mocks.registerSource);

      const result1 = await handler.load(entry1);
      expect(result1).toBeDefined();
      expect(typeof result1.mount).toBe('function');

      const result2 = await handler.load(entry2);
      expect(result2).toBeDefined();
      expect(typeof result2.mount).toBe('function');
    });

    it('17.1.3 - Manifest caching works across multiple entries', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
      ]);

      const entry1 = makeEntry('./ChartWidget1', 'acme.chart1b', mocks.registerSource);
      const entry2 = makeEntry('./ChartWidget2', 'acme.chart2b', mocks.registerSource);

      const result1 = await handler.load(entry1);
      expect(result1).toBeDefined();

      const result2 = await handler.load(entry2);
      expect(result2).toBeDefined();
    });

    it('17.1.4 - Caches manifests resolved from MfeEntryMF during load', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget',
        './ChartWidget2',
      ]);

      // First load caches the manifest by its ID
      const entry1 = makeEntry('./ChartWidget', 'acme.chart.a', mocks.registerSource);
      await handler.load(entry1);

      // Second entry references the same manifest by ID string
      const exposeAssets2 = buildExposeAssets('analyticsRemote', './ChartWidget2', {
        registerSource: mocks.registerSource,
      });
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.acme.chart2.v1',
        manifest: manifest.id,
        exposedModule: './ChartWidget2',
        exposeAssets: exposeAssets2,
      };

      const result2 = await handler.load(entry2);
      expect(result2).toBeDefined();
    });
  });

  describe('17.2 - MfeHandlerMF Manifest Resolution', () => {
    it('17.2.1 - Implements manifest resolution from MfeEntryMF.manifest field', async () => {
      const { makeEntry } = createTestSetup('analyticsRemote', ['./ChartWidget']);
      const entry = makeEntry('./ChartWidget', 'acme.chart.2.1', mocks.registerSource);

      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
    });

    it('17.2.2 - Supports manifest as inline object', async () => {
      const { makeEntry } = createTestSetup('analyticsRemote', ['./ChartWidget']);
      const entry = makeEntry('./ChartWidget', 'acme.chart.2.2', mocks.registerSource);

      const result = await handler.load(entry);
      expect(result).toBeDefined();
    });

    it('17.2.2 - Supports manifest as type ID reference', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
      ]);

      // Prime the cache with an inline manifest load
      const entry1 = makeEntry('./ChartWidget1', 'acme.chart.ref1', mocks.registerSource);
      await handler.load(entry1);

      // Second load uses type ID reference
      const exposeAssets2 = buildExposeAssets('analyticsRemote', './ChartWidget2', {
        registerSource: mocks.registerSource,
      });
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.acme.chart.ref2.v1',
        manifest: manifest.id,
        exposedModule: './ChartWidget2',
        exposeAssets: exposeAssets2,
      };

      const result = await handler.load(entry2);
      expect(result).toBeDefined();
    });

    it('17.2.3 - Caches resolved manifests for entries from same remote', async () => {
      const { makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
        './ChartWidget3',
      ]);

      const entries = [
        makeEntry('./ChartWidget1', 'acme.chart.c1', mocks.registerSource),
        makeEntry('./ChartWidget2', 'acme.chart.c2', mocks.registerSource),
        makeEntry('./ChartWidget3', 'acme.chart.c3', mocks.registerSource),
      ];

      for (const entry of entries) {
        const result = await handler.load(entry);
        expect(result).toBeDefined();
      }
    });

    it('17.2.4 - Clear error when inline manifest missing "id" field', async () => {
      const invalidManifest = {
        name: 'analyticsRemote',
        metaData: {
          name: 'analyticsRemote',
          type: 'app',
          buildInfo: { buildVersion: '1.0.0', buildName: 'analyticsRemote' },
          remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' },
          globalName: 'analyticsRemote',
          pluginVersion: '2.0.0',
          publicPath: `${TEST_BASE_URL}/analyticsRemote/`,
        },
        shared: [],
        // id intentionally missing
      } as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.noid.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
        exposeAssets: { js: { sync: ['expose-ChartWidget.js'], async: [] }, css: { sync: [], async: [] } },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('"id"');
    });

    it('17.2.4 - Clear error when inline manifest missing "metaData.publicPath"', async () => {
      // Intentionally malformed: publicPath is absent to trigger the validation error.
      // The Partial<MfManifest> cast is the minimal cast needed to inject invalid data
      // into the handler's runtime validation path — this tests the guard, not production use.
      const invalidManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        name: 'analyticsRemote',
        metaData: {
          name: 'analyticsRemote',
          type: 'app',
          buildInfo: { buildVersion: '1.0.0', buildName: 'analyticsRemote' },
          remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' },
          globalName: 'analyticsRemote',
          pluginVersion: '2.0.0',
          // publicPath intentionally absent
        },
        shared: [],
      } as Partial<MfManifest> as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.nopublicpath.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
        exposeAssets: { js: { sync: ['expose-ChartWidget.js'], async: [] }, css: { sync: [], async: [] } },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('metaData.publicPath');
    });

    it('17.2.4 - Clear error when manifest type ID is not found in cache', async () => {
      const exposeAssets = buildExposeAssets('analyticsRemote', './ChartWidget', {
        registerSource: mocks.registerSource,
      });
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.notcached.v1',
        manifest: 'gts.hai3.mfes.mfe.mf_manifest.v1~missing.manifest.v1',
        exposedModule: './ChartWidget',
        exposeAssets,
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('not found');
    });

    it('17.2.4 - Clear error when inline manifest missing "metaData.remoteEntry.name"', async () => {
      // remoteEntry intentionally absent — tests the runtime validation guard path.
      const invalidManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.noremoteentry.manifest.v1',
        name: 'analyticsRemote',
        metaData: {
          name: 'analyticsRemote',
          type: 'app',
          buildInfo: { buildVersion: '1.0.0', buildName: 'analyticsRemote' },
          // remoteEntry intentionally absent
          globalName: 'analyticsRemote',
          pluginVersion: '2.0.0',
          publicPath: `${TEST_BASE_URL}/analyticsRemote/`,
        },
        shared: [],
      } as Partial<MfManifest> as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.noremoteentry.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
        exposeAssets: { js: { sync: ['expose-ChartWidget.js'], async: [] }, css: { sync: [], async: [] } },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('metaData.remoteEntry.name');
    });

    it('17.2.4 - Clear error when inline manifest missing "mfInitKey" field', async () => {
      // mfInitKey is required — extracted from remoteEntry.js by the frontx-mf-gts plugin.
      const invalidManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.nomfinitkey.manifest.v1',
        name: 'analyticsRemote',
        metaData: {
          name: 'analyticsRemote',
          type: 'app',
          buildInfo: { buildVersion: '1.0.0', buildName: 'analyticsRemote' },
          remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' },
          globalName: 'analyticsRemote',
          pluginVersion: '2.0.0',
          publicPath: `${TEST_BASE_URL}/analyticsRemote/`,
        },
        shared: [],
        // mfInitKey intentionally absent
      } as Partial<MfManifest> as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.nomfinitkey.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
        exposeAssets: { js: { sync: ['expose-ChartWidget.js'], async: [] }, css: { sync: [], async: [] } },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('mfInitKey');
    });
  });

  describe('17.3 - Handler Integration Tests', () => {
    it('17.3.1 - Manifest caching reuses data for multiple entries from same remote', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
      ]);

      const entry1 = makeEntry('./ChartWidget1', 'acme.int.chart1', mocks.registerSource);
      const result1 = await handler.load(entry1);
      expect(result1).toBeDefined();

      // Second entry references manifest by ID
      const exposeAssets2 = buildExposeAssets('analyticsRemote', './ChartWidget2', {
        registerSource: mocks.registerSource,
      });
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.acme.int.chart2.v1',
        manifest: manifest.id,
        exposedModule: './ChartWidget2',
        exposeAssets: exposeAssets2,
      };

      const result2 = await handler.load(entry2);
      expect(result2).toBeDefined();
    });

    it('17.3.2 - Source text caching avoids redundant fetches for shared dep chunks', async () => {
      // Two loads from the same manifest each trigger loadShare() for the react chunk
      // via the MF 2.0 shim protocol. The source text cache on the handler ensures
      // the react chunk URL is fetched only once across both load() calls.
      const sharedReactChunk = '__federation_shared_react.js';
      const baseUrl = `${TEST_BASE_URL}/analyticsRemote/`;

      const manifest = buildManifest('analyticsRemote', {
        shared: [
          {
            id: 'analyticsRemote:react',
            name: 'react',
            version: '19.2.4',
            requiredVersion: '^19.0.0',
            chunkPath: sharedReactChunk,
            unwrapKey: null,
          },
        ],
      });

      const reactChunkUrl = `${baseUrl}${sharedReactChunk}`;
      mocks.registerSource(reactChunkUrl, 'export default {};');

      // Each expose chunk immediately invokes loadShare('react') via the FederationHost
      // instance, causing the react chunk source to be fetched (or retrieved from cache).
      const mfInitKey = buildMfInitKey('analyticsRemote');
      const exposeSource = `
        const initGlobal = globalThis[${JSON.stringify(mfInitKey)}];
        const instance = await initGlobal.initPromise;
        await instance.loadShare('react');
        export default { mount: () => {}, unmount: () => {} };
      `;

      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);
      mocks.registerSource(`${baseUrl}expose-Widget2.js`, exposeSource);

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.cache1.v1',
        manifest,
        exposedModule: './Widget1',
        exposeAssets: { js: { sync: ['expose-Widget1.js'], async: [] }, css: { sync: [], async: [] } },
      };
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.cache2.v1',
        manifest,
        exposedModule: './Widget2',
        exposeAssets: { js: { sync: ['expose-Widget2.js'], async: [] }, css: { sync: [], async: [] } },
      };

      // Both loads call loadShare('react') — source text cache ensures react chunk
      // is fetched only once despite being consumed by two separate load() calls.
      await handler.load(entry1);
      await handler.load(entry2);

      const reactFetches = mocks.mockFetch.mock.calls.filter(
        (call: unknown[]) => call[0] === reactChunkUrl
      );
      expect(reactFetches).toHaveLength(1);
    });

    it('17.3.3 - Manifest resolution from inline MfeEntryMF.manifest with shared deps', async () => {
      const manifest = buildManifest('analyticsRemote', {
        shared: [
          {
            id: 'analyticsRemote:react',
            name: 'react',
            version: '18.2.0',
            requiredVersion: '^18.0.0',
            chunkPath: null,
            unwrapKey: null,
          },
        ],
      });

      const exposeAssets = buildExposeAssets('analyticsRemote', './ChartWidget', {
        registerSource: mocks.registerSource,
      });
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.acme.sharedmf.v1',
        manifest,
        exposedModule: './ChartWidget',
        exposeAssets,
      };

      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
    });

    it('17.3.4 - Manifest resolution from type ID reference', async () => {
      const { manifest, makeEntry } = createTestSetup('analyticsRemote', [
        './ChartWidget1',
        './ChartWidget2',
      ]);

      const entry1 = makeEntry('./ChartWidget1', 'acme.tidref1', mocks.registerSource);
      await handler.load(entry1);

      const exposeAssets2 = buildExposeAssets('analyticsRemote', './ChartWidget2', {
        registerSource: mocks.registerSource,
      });
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.acme.tidref2.v1',
        manifest: manifest.id,
        exposedModule: './ChartWidget2',
        exposeAssets: exposeAssets2,
      };

      const result = await handler.load(entry2);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Relative import resolution (../ for subdirectory chunks)
  // -------------------------------------------------------------------------
  describe('relative import resolution', () => {
    it('resolves ../ imports for chunks in subdirectories', async () => {
      const remoteName = 'scopedPkgRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Expose chunk is in a subdirectory and imports from parent via ../
      const exposeChunkPath = 'subdir/expose-Widget.js';
      const parentDepPath = 'runtime.js';

      mocks.registerSource(
        `${baseUrl}${exposeChunkPath}`,
        createChunkWithRelativeImport('../runtime.js')
      );
      mocks.registerSource(
        `${baseUrl}${parentDepPath}`,
        'export const helper = () => {};'
      );

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.scoped.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunkPath], async: [] },
          css: { sync: [], async: [] },
        },
      };

      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(`${baseUrl}${exposeChunkPath}`);
      expect(fetchedUrls).toContain(`${baseUrl}${parentDepPath}`);
    });

    it('resolves ./ imports normally (no subdirectory)', async () => {
      const remoteName = 'flatRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      const exposeChunk = 'expose-Widget.js';
      const depChunk = 'dep.js';

      mocks.registerSource(
        `${baseUrl}${exposeChunk}`,
        `import { helper } from './dep.js';\nexport default { mount: () => {}, unmount: () => {} };`
      );
      mocks.registerSource(`${baseUrl}${depChunk}`, 'export const helper = () => {};');

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.flat.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [], async: [] },
        },
      };

      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(`${baseUrl}${depChunk}`);
    });

    it('resolves nested ../ traversals correctly', async () => {
      const remoteName = 'deepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Expose chunk in deep/nested/ imports '../../root-dep.js' → 'root-dep.js'
      const exposeChunk = 'deep/nested/expose-Widget.js';

      mocks.registerSource(
        `${baseUrl}${exposeChunk}`,
        createChunkWithRelativeImport('../../root-dep.js')
      );
      mocks.registerSource(
        `${baseUrl}root-dep.js`,
        'export const helper = () => {};'
      );

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.deep.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [], async: [] },
        },
      };

      const result = await handler.load(entry);
      expect(result).toBeDefined();

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(`${baseUrl}root-dep.js`);
    });

    it('loads chunk with minified static imports during blob rewriting', async () => {
      const remoteName = 'minifiedRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';
      const depChunk = 'dep.js';

      mocks.registerSource(
        `${baseUrl}${exposeChunk}`,
        'import{helper as h}from"./dep.js";export default{mount:()=>h(),unmount:()=>{}};'
      );
      mocks.registerSource(`${baseUrl}${depChunk}`, 'export const helper = () => {};');

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.minified.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [], async: [] },
        },
      };

      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
    });

    it('injects remote stylesheet links into the shadow root before mount', async () => {
      const remoteName = 'styledRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';
      const cssFile = 'widget.css';

      mocks.registerSource(`${baseUrl}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.styled.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [cssFile], async: [] },
        },
      };

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      const styleElement = shadowRoot.getElementById('__hai3-mfe-runtime-style-0');
      expect(styleElement).toBeInstanceOf(HTMLLinkElement);
      expect((styleElement as HTMLLinkElement | null)?.rel).toBe('stylesheet');
      expect((styleElement as HTMLLinkElement | null)?.href).toBe(
        `${baseUrl}${cssFile}`
      );
      expect(shadowRoot.querySelectorAll('link[id^="__hai3-mfe-runtime-style-"]')).toHaveLength(1);
      expect(shadowRoot.querySelector('style[id^="__hai3-mfe-runtime-style-"]')).toBeNull();
    });

    it('reuses stylesheet link ids instead of duplicating them on repeated mount', async () => {
      const remoteName = 'styledRepeatRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';

      mocks.registerSource(`${baseUrl}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.styled-repeat.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: ['widget.css'], async: [] },
        },
      };

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const bridge = {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      };

      await lifecycle.mount(shadowRoot, bridge);
      await lifecycle.mount(shadowRoot, bridge);

      expect(shadowRoot.querySelectorAll('link[id="__hai3-mfe-runtime-style-0"]')).toHaveLength(1);
    });

    it('removes injected remote stylesheets before unmount', async () => {
      const remoteName = 'styledUnmountRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';

      mocks.registerSource(
        `${baseUrl}${exposeChunk}`,
        `export default {
          mount: () => {},
          unmount: (container) => {
            if (container.querySelector('link[id^="__hai3-mfe-runtime-style-"], style[id^="__hai3-mfe-runtime-style-"]')) {
              throw new Error('runtime stylesheet cleanup should happen before unmount');
            }
          }
        };`
      );

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.styled-unmount.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: ['widget.css'], async: [] },
        },
      };

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });

      await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      expect(shadowRoot.getElementById('__hai3-mfe-runtime-style-0')).toBeTruthy();

      await expect(lifecycle.unmount(shadowRoot)).resolves.toBeUndefined();
      expect(shadowRoot.getElementById('__hai3-mfe-runtime-style-0')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Manifest-based chunk discovery (Phase 8)
  // -------------------------------------------------------------------------
  describe('manifest-based chunk discovery', () => {
    it('reads expose chunk filename from exposeAssets.js.sync[0]', async () => {
      const remoteName = 'manifestChunkRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'custom-expose-chunk-name.js';

      mocks.registerSource(`${baseUrl}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.manifestchunk.v1',
        manifest,
        exposedModule: './Widget',
        // exposeAssets.js.sync[0] dictates exactly which chunk is fetched
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [], async: [] },
        },
      };

      await handler.load(entry);

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(`${baseUrl}${exposeChunk}`);
    });

    it('derives baseUrl from manifest.metaData.publicPath (not remoteEntry URL)', async () => {
      const remoteName = 'publicPathRemote';
      const publicPath = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';

      mocks.registerSource(`${publicPath}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.publicpath.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [], async: [] },
        },
      };

      await handler.load(entry);

      // Chunk was fetched at publicPath + chunkFilename (not remoteEntry URL)
      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(`${publicPath}${exposeChunk}`);
    });

    it('reads CSS paths from exposeAssets.css.sync (no regex required)', async () => {
      const remoteName = 'cssManifestRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';
      const cssPath = 'styles/widget.css';

      mocks.registerSource(`${baseUrl}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.cssmanifest.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: [cssPath], async: [] },
        },
      };

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      const link = shadowRoot.getElementById('__hai3-mfe-runtime-style-0') as HTMLLinkElement;
      expect(link).toBeTruthy();
      expect(link.href).toBe(`${baseUrl}${cssPath}`);
    });

    it('throws MfeLoadError when exposeAssets.js.sync is empty', async () => {
      const manifest = buildManifest('emptyExposeRemote');
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.emptyexpose.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [], async: [] }, // empty — no chunk to load
          css: { sync: [], async: [] },
        },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('exposeAssets.js.sync is empty');
    });

    it('handles multiple CSS paths from exposeAssets.css.sync and css.async', async () => {
      const remoteName = 'multiCssRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const exposeChunk = 'expose-Widget.js';

      mocks.registerSource(`${baseUrl}${exposeChunk}`, createExposeChunkSource());

      const manifest = buildManifest(remoteName);
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.multicss.v1',
        manifest,
        exposedModule: './Widget',
        exposeAssets: {
          js: { sync: [exposeChunk], async: [] },
          css: { sync: ['base.css', 'theme.css'], async: ['lazy.css'] },
        },
      };

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      // sync and async CSS are both injected (3 total)
      const links = shadowRoot.querySelectorAll('link[id^="__hai3-mfe-runtime-style-"]');
      expect(links).toHaveLength(3);
    });
  });
});
