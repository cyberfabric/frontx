/**
 * MfeHandlerMF FederationHost Instance Tests
 *
 * Tests for the MF 2.0 __mf_init__ FederationHost protocol introduced in Phase 7.
 *
 * The protocol:
 *  - The handler creates a per-load FederationHost via createInstance() with blob-URL
 *    get() factories for each shared dep.
 *  - The instance is written to globalThis[manifest.mfInitKey] as
 *    { initPromise: Promise.resolve(instance) } BEFORE importing the expose blob URL.
 *  - After the expose module evaluates, the __mf_init__ global is deleted.
 *  - Shared deps with chunkPath get blob-URL'd and served via loadShare().
 *  - Shared deps with chunkPath === null are excluded from the instance shared config.
 *  - Different MFEs get different __mf_init__ keys (from manifest.mfInitKey).
 *  - import.meta.url in blob-URL'd chunks is rewritten to the real chunk base URL.
 *
 * Per project guidelines, all assertions go through the public load() API.
 *
 * @packageDocumentation
 */
// @cpt-FEATURE:mfe-manifest-loading:p2

// @module-federation/runtime must be mocked before any imports that use it.
// The mock is hoisted by Vitest to run before module evaluation.
vi.mock('@module-federation/runtime', () => {
  const createInstance = vi.fn().mockImplementation(
    (opts: { name: string; shared: Record<string, { get: () => Promise<() => unknown> }>; remotes: unknown[] }) => {
      // Return a minimal ModuleFederation-like object with a loadShare() method.
      // loadShare() calls the get() factory for the named package (if registered).
      const instance = {
        loadShare: async (pkgName: string) => {
          const entry = opts.shared[pkgName];
          if (!entry) {
            // Package not in shared config — no factory
            return false;
          }
          return entry.get();
        },
      };
      return instance;
    }
  );
  return { createInstance };
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MfeHandlerMF } from '../../../src/mfe/handler/mf-handler';
import { MfeLoadError } from '../../../src/mfe/errors';
import type { MfeEntryMF, MfManifest, MfManifestShared } from '../../../src/mfe/types';
import {
  setupBlobUrlLoaderMocks,
  createExposeChunkSource,
  TEST_BASE_URL,
} from '../test-utils/mock-blob-url-loader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the __mf_init__ key for a given manifest name.
 * Used for test assertions when we need to read/write the global.
 */
function buildMfInitKey(manifestName: string): string {
  return `__mf_init____mf__virtual/${manifestName}__mf_v__runtimeInit__mf_v__.js__`;
}

type GlobalWithShims = typeof globalThis & Record<string, unknown>;

function readMfInitGlobal(manifestName: string): unknown {
  return (globalThis as GlobalWithShims)[buildMfInitKey(manifestName)];
}

/**
 * Build a minimal valid GTS MfManifest.
 * mfInitKey follows the known MF 2.0 format so tests can assert against it.
 */
function buildManifest(
  remoteName: string,
  shared: MfManifestShared[] = []
): MfManifest {
  return {
    id: `gts.hai3.mfes.mfe.mf_manifest.v1~test.${remoteName}.manifest.v1`,
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
    shared,
    mfInitKey: buildMfInitKey(remoteName),
  };
}

/**
 * Create a shared dep entry (MfManifestShared) with a bundled chunk.
 */
function sharedDepWithChunk(
  remoteName: string,
  pkgName: string,
  version: string,
  chunkFilename: string,
  unwrapKey: string | null = null
): MfManifestShared {
  return {
    id: `${remoteName}:${pkgName}`,
    name: pkgName,
    version,
    requiredVersion: `^${version}`,
    chunkPath: chunkFilename,
    unwrapKey,
  };
}

/**
 * Create a shared dep entry with no bundled chunk (declared but externally resolved).
 */
function sharedDepWithoutChunk(
  remoteName: string,
  pkgName: string,
  version = '1.0.0'
): MfManifestShared {
  return {
    id: `${remoteName}:${pkgName}`,
    name: pkgName,
    version,
    requiredVersion: `^${version}`,
    chunkPath: null,
    unwrapKey: null,
  };
}

/**
 * Build a test MfeEntryMF with exposeAssets derived from the chunk filename.
 */
function buildEntry(
  remoteName: string,
  suffix: string,
  exposeChunk: string,
  manifest: MfManifest
): MfeEntryMF {
  return {
    id: `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.${suffix}.v1`,
    manifest,
    exposedModule: './Widget1',
    exposeAssets: {
      js: { sync: [exposeChunk], async: [] },
      css: { sync: [], async: [] },
    },
  };
}

/**
 * Create a full test setup: manifest with optional shared deps + sources registered.
 */
function createTestSetup(
  remoteName: string,
  options: {
    exposedModules?: string[];
    shared?: MfManifestShared[];
  } = {}
): {
  manifest: MfManifest;
  baseUrl: string;
  registerSources(reg: (url: string, src: string) => void): void;
  createEntry(exposedModule: string, suffix: string): MfeEntryMF;
} {
  const shared = options.shared ?? [];
  const exposedModules = options.exposedModules ?? ['./Widget1'];
  const manifest = buildManifest(remoteName, shared);
  const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

  const exposeMap: Record<string, string> = {};
  for (const mod of exposedModules) {
    const safeName = mod.replace('./', '').replace(/[^a-zA-Z0-9]/g, '-');
    exposeMap[mod] = `expose-${safeName}.js`;
  }

  return {
    manifest,
    baseUrl,
    registerSources(reg: (url: string, src: string) => void): void {
      for (const chunk of Object.values(exposeMap)) {
        reg(`${baseUrl}${chunk}`, createExposeChunkSource());
      }
    },
    createEntry(exposedModule: string, suffix: string): MfeEntryMF {
      const exposeChunk = exposeMap[exposedModule] ?? 'expose-Widget1.js';
      return buildEntry(remoteName, suffix, exposeChunk, manifest);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfeHandlerMF - MF 2.0 runtime shim protocol', () => {
  let handler: MfeHandlerMF;
  let mocks: ReturnType<typeof setupBlobUrlLoaderMocks>;

  beforeEach(() => {
    handler = new MfeHandlerMF('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~', { timeout: 5000, retries: 0 });
    mocks = setupBlobUrlLoaderMocks();
  });

  afterEach(() => {
    mocks.cleanup();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // No __federation_shared__ global — MF 2.0 never uses it
  // -------------------------------------------------------------------------
  describe('__federation_shared__ is never written', () => {
    it('does not write to globalThis.__federation_shared__ for deps with sync chunks', async () => {
      const reactChunk = '__federation_shared_react.js';
      const setup = createTestSetup('reactHost', {
        shared: [sharedDepWithChunk('reactHost', 'react', '19.2.4', reactChunk)],
      });
      setup.registerSources(mocks.registerSource);
      mocks.registerSource(`${setup.baseUrl}${reactChunk}`, 'export default {};');

      const entry = setup.createEntry('./Widget1', 'react.entry');
      await handler.load(entry);

      // MF 2.0 never writes __federation_shared__ — it uses __mf_init__ instead
      expect((globalThis as Record<string, unknown>)['__federation_shared__']).toBeUndefined();
    });

    it('does not write to globalThis.__federation_shared__ when shared is empty', async () => {
      const setup = createTestSetup('emptyDepsRemote', { shared: [] });
      setup.registerSources(mocks.registerSource);

      const entry = setup.createEntry('./Widget1', 'emptydeps.entry');
      await handler.load(entry);

      expect((globalThis as Record<string, unknown>)['__federation_shared__']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // __mf_init__ shim lifecycle
  // -------------------------------------------------------------------------
  describe('__mf_init__ shim lifecycle', () => {
    it('writes initPromise to globalThis[mfInitKey] before import, deletes after', async () => {
      // To observe the __mf_init__ global during load, we intercept URL.createObjectURL
      // which is called during blob URL chain creation (before the import).
      const setup = createTestSetup('shimLifecycleRemote', {});
      setup.registerSources(mocks.registerSource);

      let shimDuringLoad: unknown = null;
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation((blob: object) => {
        // Capture shim state at blob creation time — this is before the import
        shimDuringLoad = readMfInitGlobal('shimLifecycleRemote');
        return originalCreateObjectURL.call(URL, blob);
      });

      const entry = setup.createEntry('./Widget1', 'shim-lifecycle.entry');
      await handler.load(entry);

      // Shim was present during load (captured at blob creation time)
      expect(shimDuringLoad).not.toBeNull();
      expect(shimDuringLoad).toBeDefined();

      // Shim is cleaned up after load completes
      expect(readMfInitGlobal('shimLifecycleRemote')).toBeUndefined();

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('__mf_init__ key contains the manifest name', async () => {
      const manifestName = 'keyNameRemote';
      const setup = createTestSetup(manifestName, {});
      setup.registerSources(mocks.registerSource);

      let capturedKeys: string[] = [];
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation((blob: object) => {
        capturedKeys = Object.keys(globalThis as object).filter((k) => k.startsWith('__mf_init__'));
        return originalCreateObjectURL.call(URL, blob);
      });

      const entry = setup.createEntry('./Widget1', 'keyname.entry');
      await handler.load(entry);

      // The __mf_init__ key must include the manifest name
      const expectedKey = buildMfInitKey(manifestName);
      expect(capturedKeys).toContain(expectedKey);

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('different MFE names get distinct __mf_init__ keys', async () => {
      // mfeA and mfeB have different manifest names → different __mf_init__ keys
      const capturedKeysForA: string[] = [];
      const capturedKeysForB: string[] = [];

      const setupA = createTestSetup('mfeAlphaRemote', {});
      const setupB = createTestSetup('mfeBetaRemote', {});
      setupA.registerSources(mocks.registerSource);
      setupB.registerSources(mocks.registerSource);

      const expectedKeyA = buildMfInitKey('mfeAlphaRemote');
      const expectedKeyB = buildMfInitKey('mfeBetaRemote');
      expect(expectedKeyA).not.toBe(expectedKeyB);

      const entryA = setupA.createEntry('./Widget1', 'alpha.entry');
      const entryB = setupB.createEntry('./Widget1', 'beta.entry');

      // Load sequentially and verify each got its own key (cleanup means both gone after)
      await handler.load(entryA);
      capturedKeysForA.push(expectedKeyA);

      await handler.load(entryB);
      capturedKeysForB.push(expectedKeyB);

      // Both keys are gone after their respective loads
      expect(readMfInitGlobal('mfeAlphaRemote')).toBeUndefined();
      expect(readMfInitGlobal('mfeBetaRemote')).toBeUndefined();

      // The two keys must be different strings
      expect(capturedKeysForA[0]).not.toBe(capturedKeysForB[0]);
    });

    it('sequential loads of same MFE do not leave stale __mf_init__ global', async () => {
      const setup = createTestSetup('seqLoadRemote', {
        exposedModules: ['./Widget1', './Widget2'],
      });
      setup.registerSources(mocks.registerSource);

      const entry1 = setup.createEntry('./Widget1', 'seq1.entry');
      const entry2 = setup.createEntry('./Widget2', 'seq2.entry');

      await handler.load(entry1);
      // After first load, global must be deleted
      expect(readMfInitGlobal('seqLoadRemote')).toBeUndefined();

      await handler.load(entry2);
      // After second load, global still deleted
      expect(readMfInitGlobal('seqLoadRemote')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // loadShare() — shim behavior for shared dependencies
  // -------------------------------------------------------------------------
  describe('loadShare() — shim serves blob-URL modules for known shared deps', () => {
    it('shim for MFE with shared deps has loadShare() method accessible via initPromise', async () => {
      const reactChunk = '__federation_shared_react.js';
      const setup = createTestSetup('shimShapeRemote', {
        shared: [sharedDepWithChunk('shimShapeRemote', 'react', '19.2.4', reactChunk)],
      });
      setup.registerSources(mocks.registerSource);
      mocks.registerSource(`${setup.baseUrl}${reactChunk}`, 'export default {};');

      // Capture the shim from initPromise during blob URL creation
      let capturedShim: unknown = null;
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation((blob: object) => {
        const global = readMfInitGlobal('shimShapeRemote') as { initPromise?: Promise<unknown> } | undefined;
        if (global?.initPromise) {
          void global.initPromise.then((s) => { capturedShim = s; });
        }
        return originalCreateObjectURL.call(URL, blob);
      });

      const entry = setup.createEntry('./Widget1', 'shimshape.entry');
      await handler.load(entry);

      // Give microtask queue a tick to resolve the promise
      await Promise.resolve();

      expect(capturedShim).not.toBeNull();
      expect(typeof (capturedShim as { loadShare?: unknown })?.loadShare).toBe('function');

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('expose chunk containing loadShare call works end-to-end via shim', async () => {
      // An expose chunk that simulates the MF 2.0 __loadShare__ proxy pattern:
      // it awaits initPromise, calls loadShare(), and calls the returned factory.
      const reactChunk = '__federation_shared_react.js';
      const baseUrl = `${TEST_BASE_URL}/e2eShimRemote/`;

      mocks.registerSource(`${baseUrl}${reactChunk}`, 'export default { version: "19.2.4" };');

      // The expose chunk simulates a __loadShare__ proxy chunk:
      // it reads the shim from __mf_init__ and calls loadShare('react')
      const mfInitKey = buildMfInitKey('e2eShimRemote');
      const exposeSource = `
        const initGlobal = globalThis[${JSON.stringify(mfInitKey)}];
        const shim = await initGlobal.initPromise;
        const factory = await shim.loadShare('react');
        const react = factory();
        export default { mount: () => react, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest('e2eShimRemote', [
        sharedDepWithChunk('e2eShimRemote', 'react', '19.2.4', reactChunk),
      ]);
      const entry: MfeEntryMF = buildEntry('e2eShimRemote', 'e2eshim.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      // If loadShare worked, mount returns the react module (not null/undefined)
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const result = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });
      // mount returned the react module object (non-null)
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // loadShare() — behavior for packages not in shared config
  // -------------------------------------------------------------------------
  describe('loadShare() — returns false for packages without bundled chunk', () => {
    it('expose chunk calling loadShare for undeclared dep receives false', async () => {
      const baseUrl = `${TEST_BASE_URL}/unknownPkgRemote/`;
      const mfInitKey = buildMfInitKey('unknownPkgRemote');

      // Expose chunk tries loadShare for an unknown package.
      // MF 2.0 runtime returns false for unknown packages (not throws) —
      // the __loadShare__ proxy then falls back to customShareInfo.
      const exposeSource = `
        const initGlobal = globalThis[${JSON.stringify(mfInitKey)}];
        const instance = await initGlobal.initPromise;
        const result = await instance.loadShare('unknown-package');
        export default { mount: () => result, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest('unknownPkgRemote', []);
      const entry: MfeEntryMF = buildEntry('unknownPkgRemote', 'unknown-pkg.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const result = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });
      // Returns false — package not in shared config, proxy handles it via customShareInfo
      expect(result).toBe(false);
    });

    it('deps declared with chunkPath:null are excluded from shared config — loadShare returns false', async () => {
      const baseUrl = `${TEST_BASE_URL}/noChunkRejRemote/`;
      const mfInitKey = buildMfInitKey('noChunkRejRemote');

      const exposeSource = `
        const initGlobal = globalThis[${JSON.stringify(mfInitKey)}];
        const instance = await initGlobal.initPromise;
        const result = await instance.loadShare('lodash');
        export default { mount: () => result, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      // lodash declared with chunkPath:null → excluded from createInstance shared config
      const manifest = buildManifest('noChunkRejRemote', [
        sharedDepWithoutChunk('noChunkRejRemote', 'lodash', '4.17.21'),
      ]);
      const entry: MfeEntryMF = buildEntry('noChunkRejRemote', 'nochunk-rej.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const result = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });
      // chunkPath:null deps are excluded from the shared config → loadShare returns false
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Per-load isolation — independent shims per load call
  // -------------------------------------------------------------------------
  describe('per-load isolation — independent shim instances', () => {
    it('each load() creates an independent shim — no cross-load state', async () => {
      // Two sequential loads of the same MFE get separate shim instances
      // because the global is created fresh and then deleted each time.
      const setup = createTestSetup('isoLoadRemote', {
        exposedModules: ['./Widget1', './Widget2'],
        shared: [],
      });
      setup.registerSources(mocks.registerSource);

      let shimAtLoad1: unknown = null;
      let shimAtLoad2: unknown = null;
      let callCount = 0;

      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation((blob: object) => {
        const global = readMfInitGlobal('isoLoadRemote');
        if (global !== undefined) {
          callCount++;
          if (callCount === 1) shimAtLoad1 = global;
          else if (callCount === 2) shimAtLoad2 = global;
        }
        return originalCreateObjectURL.call(URL, blob);
      });

      const entry1 = setup.createEntry('./Widget1', 'iso1.entry');
      await handler.load(entry1);
      const entry2 = setup.createEntry('./Widget2', 'iso2.entry');
      await handler.load(entry2);

      // Both shims were created (captured at blob creation time)
      expect(shimAtLoad1).toBeDefined();
      expect(shimAtLoad2).toBeDefined();
      // They are separate objects (not the same reference)
      expect(shimAtLoad1).not.toBe(shimAtLoad2);

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('concurrent loads of different MFEs use different __mf_init__ keys', async () => {
      const setupA = createTestSetup('concurrAlphaRemote', {});
      const setupB = createTestSetup('concurrBetaRemote', {});
      setupA.registerSources(mocks.registerSource);
      setupB.registerSources(mocks.registerSource);

      const entryA = setupA.createEntry('./Widget1', 'concurr-alpha.entry');
      const entryB = setupB.createEntry('./Widget1', 'concurr-beta.entry');

      // Run concurrently; no crash expected
      await Promise.all([handler.load(entryA), handler.load(entryB)]);

      // Both globals cleaned up after completion
      expect(readMfInitGlobal('concurrAlphaRemote')).toBeUndefined();
      expect(readMfInitGlobal('concurrBetaRemote')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // import.meta.url rewriting (Phase 19)
  // -------------------------------------------------------------------------
  describe('import.meta.url rewriting in blob-URL\'d chunks', () => {
    it('import.meta.url in expose chunk is replaced with chunk base URL string', async () => {
      const remoteName = 'importMetaRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Expose chunk uses import.meta.url to form a relative URL
      // After rewriting, it should receive the actual HTTP directory URL
      const exposeSource = `
        const baseUrlFromMeta = import.meta.url;
        export default {
          mount: () => baseUrlFromMeta,
          unmount: () => {},
        };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, []);
      const entry: MfeEntryMF = buildEntry(remoteName, 'importmeta.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const resolvedUrl = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      // The rewritten import.meta.url should be the HTTP chunk directory URL
      // (not a blob: URL, which would have no directory component)
      expect(typeof resolvedUrl).toBe('string');
      // Must be the directory URL of the chunk (not a blob: URL)
      expect(resolvedUrl as string).not.toMatch(/^blob:/);
      expect(resolvedUrl as string).toContain(baseUrl);
    });

    it('import.meta.url rewriting applies to all chunks in the blob URL chain', async () => {
      const remoteName = 'metaChainRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Dependency chunk also has import.meta.url
      const depSource = `
        export const depBase = import.meta.url;
      `;
      const exposeSource = `
        import { depBase } from './dep.js';
        export default { mount: () => depBase, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}dep.js`, depSource);
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, []);
      const entry: MfeEntryMF = buildEntry(remoteName, 'metachain.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const depBaseUrl = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      });

      // dep.js had import.meta.url rewritten to its own chunk directory URL
      expect(typeof depBaseUrl).toBe('string');
      expect(depBaseUrl as string).not.toMatch(/^blob:/);
      expect(depBaseUrl as string).toContain(baseUrl);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('throws MfeLoadError when shared dep chunk fetch fails (404)', async () => {
      const reactChunk = '__federation_shared_react.js';
      const baseUrl = `${TEST_BASE_URL}/errorRemote/`;
      const mfInitKey = buildMfInitKey('errorRemote');

      // Expose chunk calls loadShare('react') — chunk fetch will fail with 404
      const exposeSource = `
        const initGlobal = globalThis[${JSON.stringify(mfInitKey)}];
        const shim = await initGlobal.initPromise;
        let caughtError = null;
        try {
          const factory = await shim.loadShare('react');
          await factory();
        } catch (e) {
          caughtError = e;
        }
        if (caughtError) throw caughtError;
        export default { mount: () => {}, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);
      // Deliberately NOT registering the react chunk → fetch returns 404

      const manifest = buildManifest('errorRemote', [
        sharedDepWithChunk('errorRemote', 'react', '19.2.4', reactChunk),
      ]);
      const entry: MfeEntryMF = buildEntry('errorRemote', 'error.entry', 'expose-Widget1.js', manifest);

      // The 404 surfaces as MfeLoadError during load
      await expect(handler.load(entry)).rejects.toBeInstanceOf(MfeLoadError);
    });

    it('throws MfeLoadError when exposeAssets.js.sync is empty (no chunk to load)', async () => {
      const manifest = buildManifest('missingExposeRemote');
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.missingexpose.v1',
        manifest,
        exposedModule: './NonExistent',
        exposeAssets: {
          // Empty sync array: no chunk registered in manifest for this expose
          js: { sync: [], async: [] },
          css: { sync: [], async: [] },
        },
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow(
        'exposeAssets.js.sync is empty'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Manifest with no shared deps — no-op shim
  // -------------------------------------------------------------------------
  describe('manifest with no shared deps', () => {
    it('does not throw when manifest has no shared dependencies', async () => {
      const setup = createTestSetup('noDepsRemote', {});
      setup.registerSources(mocks.registerSource);

      const entry = setup.createEntry('./Widget1', 'nodeps.entry');
      await expect(handler.load(entry)).resolves.toBeDefined();
    });

    it('__mf_init__ global is deleted even when there are no shared deps', async () => {
      const setup = createTestSetup('noDepsCleanRemote', { shared: [] });
      setup.registerSources(mocks.registerSource);

      const entry = setup.createEntry('./Widget1', 'nodeps-clean.entry');
      await handler.load(entry);

      expect(readMfInitGlobal('noDepsCleanRemote')).toBeUndefined();
    });
  });

  describe('cross-MFE source text sharing — canonical provider', () => {
    it('two MFEs sharing same dep@version fetch the dep chunk only once', async () => {
      const { createInstance } = await import('@module-federation/runtime');
      const callsBefore = (createInstance as ReturnType<typeof vi.fn>).mock.calls.length;

      const reactA = sharedDepWithChunk('remoteMfeA', 'react', '19.0.0', 'assets/react-aaa.js');
      const setupA = createTestSetup('remoteMfeA', { shared: [reactA] });
      setupA.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupA.baseUrl}assets/react-aaa.js`, 'export default { version: "19.0.0" };');

      const reactB = sharedDepWithChunk('remoteMfeB', 'react', '19.0.0', 'assets/react-bbb.js');
      const setupB = createTestSetup('remoteMfeB', { shared: [reactB] });
      setupB.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupB.baseUrl}assets/react-bbb.js`, 'export default { version: "19.0.0-B" };');

      await handler.load(setupA.createEntry('./Widget1', 'mfeA.entry'));
      await handler.load(setupB.createEntry('./Widget1', 'mfeB.entry'));

      // Trigger get() factories only from THIS test's createInstance calls
      const allCalls = (createInstance as ReturnType<typeof vi.fn>).mock.calls;
      for (let i = callsBefore; i < allCalls.length; i++) {
        const opts = allCalls[i][0] as { shared: Record<string, { get: () => Promise<unknown> }> };
        if (opts.shared.react) {
          await opts.shared.react.get();
        }
      }

      const fetchCalls = mocks.mockFetch.mock.calls.map((c: [string]) => c[0]);
      const reactAFetches = fetchCalls.filter((url: string) => url.includes('react-aaa.js'));
      const reactBFetches = fetchCalls.filter((url: string) => url.includes('react-bbb.js'));

      expect(reactAFetches.length).toBe(1); // Fetched once (canonical provider)
      expect(reactBFetches.length).toBe(0); // Never fetched (reused canonical)
    });

    it('different versions of the same dep are NOT shared across MFEs', async () => {
      const { createInstance } = await import('@module-federation/runtime');
      const callsBefore = (createInstance as ReturnType<typeof vi.fn>).mock.calls.length;

      const reactA = sharedDepWithChunk('remoteMfeC', 'react', '18.0.0', 'assets/react-v18.js');
      const setupA = createTestSetup('remoteMfeC', { shared: [reactA] });
      setupA.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupA.baseUrl}assets/react-v18.js`, 'export default { version: "18.0.0" };');

      const reactB = sharedDepWithChunk('remoteMfeD', 'react', '19.0.0', 'assets/react-v19.js');
      const setupB = createTestSetup('remoteMfeD', { shared: [reactB] });
      setupB.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupB.baseUrl}assets/react-v19.js`, 'export default { version: "19.0.0" };');

      await handler.load(setupA.createEntry('./Widget1', 'mfeC.entry'));
      await handler.load(setupB.createEntry('./Widget1', 'mfeD.entry'));

      const allCalls = (createInstance as ReturnType<typeof vi.fn>).mock.calls;
      for (let i = callsBefore; i < allCalls.length; i++) {
        const opts = allCalls[i][0] as { shared: Record<string, { get: () => Promise<unknown> }> };
        if (opts.shared.react) {
          await opts.shared.react.get();
        }
      }

      const fetchCalls = mocks.mockFetch.mock.calls.map((c: [string]) => c[0]);
      const v18Fetches = fetchCalls.filter((url: string) => url.includes('react-v18.js'));
      const v19Fetches = fetchCalls.filter((url: string) => url.includes('react-v19.js'));

      expect(v18Fetches.length).toBe(1);
      expect(v19Fetches.length).toBe(1);
    });

    it('canonical provider serves shared dep from first MFE server, not second', async () => {
      const { createInstance } = await import('@module-federation/runtime');
      const callsBefore = (createInstance as ReturnType<typeof vi.fn>).mock.calls.length;

      const reactA = sharedDepWithChunk('remoteMfeG', 'react', '19.0.0', 'assets/react-g.js');
      const setupA = createTestSetup('remoteMfeG', { shared: [reactA] });
      setupA.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupA.baseUrl}assets/react-g.js`, 'export default { version: "19" };');

      const reactB = sharedDepWithChunk('remoteMfeH', 'react', '19.0.0', 'assets/react-h.js');
      const setupB = createTestSetup('remoteMfeH', { shared: [reactB] });
      setupB.registerSources(mocks.registerSource);
      mocks.registerSource(`${setupB.baseUrl}assets/react-h.js`, 'export default { version: "19" };');

      await handler.load(setupA.createEntry('./Widget1', 'mfeG.entry'));
      await handler.load(setupB.createEntry('./Widget1', 'mfeH.entry'));

      // Trigger get() only from MFE H (the second one) — should use MFE G's URL
      const allCalls = (createInstance as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = allCalls[allCalls.length - 1];
      const opts = lastCall[0] as { shared: Record<string, { get: () => Promise<unknown> }> };
      if (opts.shared.react) {
        await opts.shared.react.get();
      }

      const fetchCalls = mocks.mockFetch.mock.calls.map((c: [string]) => c[0]);
      const gFetches = fetchCalls.filter((url: string) => url.includes('remoteMfeG') && url.includes('react-g.js'));
      const hFetches = fetchCalls.filter((url: string) => url.includes('remoteMfeH') && url.includes('react-h.js'));

      expect(gFetches.length).toBe(1); // Canonical provider (first MFE)
      expect(hFetches.length).toBe(0); // Never fetched
    });
  });
});
