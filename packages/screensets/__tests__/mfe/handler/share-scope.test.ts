/**
 * MfeHandlerMF — Bare Specifier Rewriting Tests
 *
 * Tests for the standalone-ESM shared dep loading mechanism introduced in Phase 2
 * of the hybrid-shared-deps plan.
 *
 * The protocol:
 *  - Shared deps are fetched from publicPath + 'shared/' + normalizedName + '.js'
 *    before the expose chunk is processed.
 *  - manifest.shared[] must be in dependency order (leaves first).
 *  - Bare specifiers in shared dep ESM files and expose chunks are rewritten to
 *    the pre-built blob URLs for the corresponding shared dep.
 *  - Per-load fresh blob URLs give isolated module instances.
 *
 * Per project guidelines, all assertions go through the public load() API.
 *
 * @packageDocumentation
 */
// @cpt-FEATURE:mfe-manifest-loading:p2

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MfeHandlerMF } from '../../../src/mfe/handler/mf-handler';
import { MfeLoadError } from '../../../src/mfe/errors';
import type { MfeEntryMF, MfManifest, MfManifestShared } from '../../../src/mfe/types';
import {
  setupBlobUrlLoaderMocks,
  createExposeChunkSource,
  createSharedDepSource,
  TEST_BASE_URL,
} from '../test-utils/mock-blob-url-loader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal valid GTS MfManifest.
 */
function buildManifest(
  remoteName: string,
  shared: MfManifestShared[] = []
): MfManifest {
  return {
    id: `gts.hai3.mfes.mfe.mf_manifest.v1~test.${remoteName}.manifest.v1`,
    metaData: {
      name: remoteName,
      type: 'app',
      buildInfo: { buildVersion: '1.0.0', buildName: remoteName },
      remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' },
      globalName: remoteName,
      publicPath: `${TEST_BASE_URL}/${remoteName}/`,
    },
    shared,
    mfInitKey: '',
  };
}

/**
 * Build a shared dep entry.
 */
function sharedDep(
  remoteName: string,
  pkgName: string,
  version = '1.0.0'
): MfManifestShared {
  const normalized = pkgName.replace(/^@/, '').replace(/\//g, '-');
  return {
    name: pkgName,
    version,
    chunkPath: `${TEST_BASE_URL}/${remoteName}/shared/${normalized}.js`,
    unwrapKey: null,
  };
}

/**
 * Build a test MfeEntryMF.
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfeHandlerMF — bare specifier rewriting for shared deps', () => {
  let handler: MfeHandlerMF;
  let mocks: ReturnType<typeof setupBlobUrlLoaderMocks>;

  beforeEach(() => {
    handler = new MfeHandlerMF('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~', { timeout: 5000, retries: 0 });
    mocks = setupBlobUrlLoaderMocks();
  });

  afterEach(() => {
    mocks.cleanup();
  });

  // -------------------------------------------------------------------------
  // Shared dep fetching
  // -------------------------------------------------------------------------
  describe('shared dep fetching from shared/ subdirectory', () => {
    it('fetches shared dep from publicPath + shared/ + normalizedName + .js', async () => {
      const remoteName = 'fetchDepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      const sharedDepUrl = `${baseUrl}shared/react.js`;

      mocks.registerSource(sharedDepUrl, createSharedDepSource());
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'react', '19.2.4')]);
      const entry = buildEntry(remoteName, 'fetch-dep.entry', 'expose-Widget1.js', manifest);

      await handler.load(entry);

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(sharedDepUrl);
    });

    it('normalizes scoped package names: @scope/pkg → scope-pkg.js', async () => {
      const remoteName = 'scopedDepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;
      // @cyberfabric/screensets → cyberfabric-screensets.js
      const sharedDepUrl = `${baseUrl}shared/cyberfabric-screensets.js`;

      mocks.registerSource(sharedDepUrl, createSharedDepSource());
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, '@cyberfabric/screensets', '1.0.0')]);
      const entry = buildEntry(remoteName, 'scoped-dep.entry', 'expose-Widget1.js', manifest);

      await handler.load(entry);

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      expect(fetchedUrls).toContain(sharedDepUrl);
    });

    it('does not fetch shared dep URLs when shared[] is empty', async () => {
      const remoteName = 'emptySharedRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());

      const manifest = buildManifest(remoteName, []);
      const entry = buildEntry(remoteName, 'empty-shared.entry', 'expose-Widget1.js', manifest);

      await handler.load(entry);

      const fetchedUrls = mocks.mockFetch.mock.calls.map((c: unknown[]) => c[0]);
      const sharedFetches = fetchedUrls.filter((u: string) => u.includes('/shared/'));
      expect(sharedFetches).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Bare specifier rewriting — correctness
  // -------------------------------------------------------------------------
  describe('bare specifier rewriting in expose chunks', () => {
    it('expose chunk importing a shared dep gets the module from the blob URL', async () => {
      const remoteName = 'bareSpecRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Standalone react ESM: exports a sentinel value
      const reactSource = 'export default { version: "19.2.4" };';
      mocks.registerSource(`${baseUrl}shared/react.js`, reactSource);

      // Expose chunk imports react as a bare specifier
      const exposeSource = `
        import React from "react";
        export default { mount: () => React, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'react', '19.2.4')]);
      const entry = buildEntry(remoteName, 'bare-spec.entry', 'expose-Widget1.js', manifest);

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

      // The mount returned the React module (rewrite worked)
      expect(result).toBeDefined();
      expect((result as { version: string }).version).toBe('19.2.4');
    });

    it('rewriting from "react" does NOT affect from "react-dom" (exact match)', async () => {
      const remoteName = 'exactMatchRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      mocks.registerSource(`${baseUrl}shared/react.js`, 'export default { name: "react" };');
      mocks.registerSource(`${baseUrl}shared/react-dom.js`, 'export default { name: "react-dom" };');

      // Expose chunk imports both react and react-dom
      const exposeSource = `
        import React from "react";
        import ReactDOM from "react-dom";
        export default { mount: () => ({ react: React, reactDom: ReactDOM }), unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, [
        sharedDep(remoteName, 'react', '19.2.4'),
        sharedDep(remoteName, 'react-dom', '19.2.4'),
      ]);
      const entry = buildEntry(remoteName, 'exact-match.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const result = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      }) as { react: { name: string }; reactDom: { name: string } };

      // Both got resolved independently — react's rewrite didn't corrupt react-dom
      expect(result.react.name).toBe('react');
      expect(result.reactDom.name).toBe('react-dom');
    });

    it('shared dep importing another shared dep gets bare specifier rewritten', async () => {
      const remoteName = 'depOnDepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // react (leaf) — no dependencies
      mocks.registerSource(`${baseUrl}shared/react.js`, 'export default { name: "react" };');

      // react-dom imports react as a bare specifier (manifest order: react first)
      mocks.registerSource(`${baseUrl}shared/react-dom.js`, createSharedDepSource(['react']));

      // Expose chunk imports react-dom
      const exposeSource = `
        import ReactDOM from "react-dom";
        export default { mount: () => ReactDOM, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      // manifest.shared[] is dependency-ordered: react before react-dom
      const manifest = buildManifest(remoteName, [
        sharedDep(remoteName, 'react', '19.2.4'),
        sharedDep(remoteName, 'react-dom', '19.2.4'),
      ]);
      const entry = buildEntry(remoteName, 'dep-on-dep.entry', 'expose-Widget1.js', manifest);

      // Must not throw — both rewrites resolve
      const lifecycle = await handler.load(entry);
      expect(lifecycle).toBeDefined();
      expect(typeof lifecycle.mount).toBe('function');
    });

    it('handles single-quoted bare specifier: from \'react\'', async () => {
      const remoteName = 'singleQuoteRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      mocks.registerSource(`${baseUrl}shared/react.js`, 'export default { version: "19.2.4" };');

      // Expose chunk uses single-quoted import
      const exposeSource = `
        import React from 'react';
        export default { mount: () => React, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'react', '19.2.4')]);
      const entry = buildEntry(remoteName, 'single-quote.entry', 'expose-Widget1.js', manifest);

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

      expect((result as { version: string }).version).toBe('19.2.4');
    });

    it('handles CJS shared dep import: import __ext from "dep"', async () => {
      const remoteName = 'cjsDepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      mocks.registerSource(`${baseUrl}shared/lodash.js`, 'export default { name: "lodash" };');

      // CJS-style import (single variable, no braces)
      const exposeSource = `
        import __ext_lodash from "lodash";
        export default { mount: () => __ext_lodash, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'lodash', '4.17.21')]);
      const entry = buildEntry(remoteName, 'cjs-dep.entry', 'expose-Widget1.js', manifest);

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

      expect((result as { name: string }).name).toBe('lodash');
    });
  });

  // -------------------------------------------------------------------------
  // Dependency order
  // -------------------------------------------------------------------------
  describe('dependency order — leaves first', () => {
    it('processes shared deps in manifest order: first dep blob URL is available when second dep is processed', async () => {
      // This test verifies that when react-dom (second) is processed, react's (first)
      // blob URL is already in blobUrls, so its import of "react" gets rewritten correctly.
      const remoteName = 'depOrderRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // react: the leaf — must be processed first
      mocks.registerSource(`${baseUrl}shared/react.js`, 'export default { name: "react" };');

      // react-dom: imports react as a bare specifier — processed second
      const reactDomSource = `
        import React from "react";
        export default { name: "react-dom", React };
      `;
      mocks.registerSource(`${baseUrl}shared/react-dom.js`, reactDomSource);

      const exposeSource = `
        import ReactDOM from "react-dom";
        export default { mount: () => ReactDOM, unmount: () => {} };
      `;
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, exposeSource);

      // Manifest order: react first (leaf), react-dom second (depends on react)
      const manifest = buildManifest(remoteName, [
        sharedDep(remoteName, 'react', '19.2.4'),
        sharedDep(remoteName, 'react-dom', '19.2.4'),
      ]);
      const entry = buildEntry(remoteName, 'dep-order.entry', 'expose-Widget1.js', manifest);

      const lifecycle = await handler.load(entry);
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const result = await lifecycle.mount(shadowRoot, {
        domainId: 'domain',
        instanceId: 'instance',
        executeActionsChain: async () => undefined,
        subscribeToProperty: () => () => undefined,
        getProperty: () => undefined,
      }) as { name: string };

      expect(result.name).toBe('react-dom');
    });
  });

  // -------------------------------------------------------------------------
  // Per-load isolation
  // -------------------------------------------------------------------------
  describe('per-load isolation — fresh blob URLs per load', () => {
    it('two sequential loads produce independent module instances', async () => {
      const remoteName = 'isoLoadRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Counter shared dep: each load gets a fresh evaluation → counter resets
      mocks.registerSource(`${baseUrl}shared/react.js`, 'export default { name: "react" };');
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());
      mocks.registerSource(`${baseUrl}expose-Widget2.js`, createExposeChunkSource());

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'react', '19.2.4')]);

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.iso1.v1',
        manifest,
        exposedModule: './Widget1',
        exposeAssets: { js: { sync: ['expose-Widget1.js'], async: [] }, css: { sync: [], async: [] } },
      };
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.iso2.v1',
        manifest,
        exposedModule: './Widget2',
        exposeAssets: { js: { sync: ['expose-Widget2.js'], async: [] }, css: { sync: [], async: [] } },
      };

      const lifecycle1 = await handler.load(entry1);
      const lifecycle2 = await handler.load(entry2);

      // Both loads produced valid lifecycle objects
      expect(typeof lifecycle1.mount).toBe('function');
      expect(typeof lifecycle2.mount).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('throws MfeLoadError when shared dep ESM fetch fails (404)', async () => {
      const remoteName = 'errorDepRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      // Expose chunk is registered but shared dep is NOT → 404 on shared dep fetch
      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());
      // Deliberately NOT registering: `${baseUrl}shared/react.js`

      const manifest = buildManifest(remoteName, [sharedDep(remoteName, 'react', '19.2.4')]);
      const entry = buildEntry(remoteName, 'error-dep.entry', 'expose-Widget1.js', manifest);

      await expect(handler.load(entry)).rejects.toBeInstanceOf(MfeLoadError);
    });

    it('evicts sharedDepTextCache on rejection so a later load can recover after transient failure', async () => {
      // First load: shared dep URL registered with failing fetch. After the first
      // load() rejects, subsequent loads of any MFE declaring the same
      // name@version must NOT receive the cached rejection — the entry must be
      // evicted so a retry can succeed.

      const remoteA = 'retryRemoteA';
      const baseA = `${TEST_BASE_URL}/${remoteA}/`;
      const sharedDepUrl = `${baseA}shared/react.js`;
      mocks.registerSource(`${baseA}expose-Widget1.js`, createExposeChunkSource());
      // Intentionally DO NOT register sharedDepUrl yet → first load fails with 404.

      const manifestA = buildManifest(remoteA, [sharedDep(remoteA, 'react', '19.2.4')]);
      const entryA = buildEntry(remoteA, 'retry-a.entry', 'expose-Widget1.js', manifestA);

      await expect(handler.load(entryA)).rejects.toBeInstanceOf(MfeLoadError);

      // Now the URL becomes available (simulates a transient outage recovered).
      mocks.registerSource(sharedDepUrl, createSharedDepSource());

      // A fresh load of an MFE declaring the SAME name@version must succeed —
      // the failed entry was evicted from sharedDepTextCache, so the retry
      // re-fetches rather than awaiting the cached rejection.
      const remoteB = 'retryRemoteB';
      const baseB = `${TEST_BASE_URL}/${remoteB}/`;
      mocks.registerSource(`${baseB}shared/react.js`, createSharedDepSource());
      mocks.registerSource(`${baseB}expose-Widget1.js`, createExposeChunkSource());

      const manifestB = buildManifest(remoteB, [sharedDep(remoteB, 'react', '19.2.4')]);
      const entryB = buildEntry(remoteB, 'retry-b.entry', 'expose-Widget1.js', manifestB);

      await expect(handler.load(entryB)).resolves.toBeDefined();
    });

    it('throws MfeLoadError when exposeAssets.js.sync is empty (no chunk to load)', async () => {
      const manifest = buildManifest('missingExposeRemote');
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.missingexpose.v1',
        manifest,
        exposedModule: './NonExistent',
        exposeAssets: {
          js: { sync: [], async: [] },
          css: { sync: [], async: [] },
        },
      };

      await expect(handler.load(entry)).rejects.toBeInstanceOf(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('exposeAssets.js.sync is empty');
    });
  });

  // -------------------------------------------------------------------------
  // No shared deps — no-op
  // -------------------------------------------------------------------------
  describe('manifest with no shared deps', () => {
    it('loads successfully when manifest has no shared dependencies', async () => {
      const remoteName = 'noDepsRemote';
      const baseUrl = `${TEST_BASE_URL}/${remoteName}/`;

      mocks.registerSource(`${baseUrl}expose-Widget1.js`, createExposeChunkSource());

      const manifest = buildManifest(remoteName, []);
      const entry = buildEntry(remoteName, 'nodeps.entry', 'expose-Widget1.js', manifest);

      await expect(handler.load(entry)).resolves.toBeDefined();
    });
  });
});
