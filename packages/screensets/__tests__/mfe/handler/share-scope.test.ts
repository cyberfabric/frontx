/**
 * MfeHandlerMF Share Scope Tests
 *
 * Tests for share scope construction (buildShareScope) and post-load
 * registration (registerMfeSharedModules) via the public load() API.
 *
 * Per project guidelines, private methods are tested through the public API only.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MfeHandlerMF } from '../../../src/mfe/handler/mf-handler';
import { GtsPlugin } from '../../../src/mfe/plugins/gts';
import type { MfeEntryMF, MfManifest } from '../../../src/mfe/types';
import type { FederationSharedMap } from '../../../src/mfe/handler/federation-types';
import {
  getFederationShared,
  setFederationShared,
} from '../../../src/mfe/handler/federation-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Key used by the federation runtime and the typed accessors. */
const FEDERATION_KEY = '__federation_shared__';

/** Clear the federation global between tests. */
function clearFederationShared(): void {
  (globalThis as Record<string, undefined>)[FEDERATION_KEY] = undefined;
}

/**
 * Build a data:-URL remote entry that records the shareScope passed to init()
 * and optionally mutates it to simulate the federation runtime writing back
 * its own shared module entries.
 */
function createCapturingRemoteEntry(options: {
  remoteName: string;
  /** Packages the "container" will write back into shareScope during init(). */
  providedModules?: Array<{ name: string; version: string }>;
} = { remoteName: 'testRemote' }): string {
  const providedModulesJson = JSON.stringify(options.providedModules ?? []);

  const moduleCode = `
    export async function get(module) {
      return () => ({
        mount: () => {},
        unmount: () => {}
      });
    }
    export async function init(shared) {
      // Record what the handler passed to init()
      globalThis.__test_captured_share_scope__ = JSON.parse(JSON.stringify(
        Object.fromEntries(
          Object.entries(shared).map(([pkg, versions]) => [
            pkg,
            Object.keys(versions)
          ])
        )
      ));

      // Simulate federation runtime writing back its own entries for packages
      // the container provides (the real runtime does this automatically).
      const provided = ${providedModulesJson};
      for (const { name, version } of provided) {
        if (!shared[name]) {
          shared[name] = {};
        }
        if (!shared[name][version]) {
          shared[name][version] = {
            get: async () => () => ({ __source: name }),
            loaded: 1,
          };
        }
      }
    }
  `;

  const base64Code = Buffer.from(moduleCode).toString('base64');
  return `data:text/javascript;base64,${base64Code}`;
}

/** Small helper to create a typed global shared map entry. */
function makeGlobalEntry(_version: string) {
  return {
    get: async () => () => ({ __host: true }) as unknown,
    loaded: 1 as const,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfeHandlerMF - share scope construction and registration', () => {
  let handler: MfeHandlerMF;
  let savedGlobal: FederationSharedMap | undefined;

  beforeEach(() => {
    const typeSystem = new GtsPlugin();
    handler = new MfeHandlerMF(typeSystem, { timeout: 5000, retries: 0 });
    // Save and clear the global scope between tests
    savedGlobal = getFederationShared();
    clearFederationShared();
    // Clear captured scope
    (globalThis as Record<string, unknown>).__test_captured_share_scope__ = undefined;
  });

  afterEach(() => {
    if (savedGlobal !== undefined) {
      setFederationShared(savedGlobal);
    } else {
      clearFederationShared();
    }
    (globalThis as Record<string, unknown>).__test_captured_share_scope__ = undefined;
  });

  // -------------------------------------------------------------------------
  // Scenario: buildShareScope — entry found (8.1a)
  // -------------------------------------------------------------------------
  describe('8.1 buildShareScope — matching entry found', () => {
    it('passes a matching host entry to init() when global scope has a compatible version', async () => {
      // Pre-populate global scope with react@19.2.4
      setFederationShared({
        default: {
          react: {
            '19.2.4': makeGlobalEntry('19.2.4'),
          },
        },
      });

      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'reactHost' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.react.manifest.v1',
        remoteEntry,
        remoteName: 'reactHost',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.react.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await handler.load(entry);

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      expect(captured).toBeDefined();
      expect(captured['react']).toContain('19.2.4');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: buildShareScope — no match (8.1b)
  // -------------------------------------------------------------------------
  describe('8.1 buildShareScope — no compatible version (fallback)', () => {
    it('omits packages where no compatible version exists in the global scope', async () => {
      // Only have react@16.x in the global scope; manifest requires ^19.0.0
      setFederationShared({
        default: {
          react: {
            '16.14.0': makeGlobalEntry('16.14.0'),
          },
        },
      });

      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'noMatchRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.nomatch.manifest.v1',
        remoteEntry,
        remoteName: 'noMatchRemote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.nomatch.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      // Should not throw — MFE falls back to its own bundled copy
      await expect(handler.load(entry)).resolves.toBeDefined();

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      // react was not passed to init() (no compatible version)
      expect(captured?.['react']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: buildShareScope — missing requiredVersion = any-version (8.1c)
  // -------------------------------------------------------------------------
  describe('8.1 buildShareScope — missing requiredVersion matches any version', () => {
    it('accepts the first available version when requiredVersion is omitted', async () => {
      setFederationShared({
        default: {
          tailwindcss: {
            '3.4.1': makeGlobalEntry('3.4.1'),
          },
        },
      });

      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'anyVersionRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.anyver.manifest.v1',
        remoteEntry,
        remoteName: 'anyVersionRemote',
        sharedDependencies: [
          // No requiredVersion → any version is acceptable
          { name: 'tailwindcss', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.anyver.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await handler.load(entry);

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      expect(captured['tailwindcss']).toContain('3.4.1');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: buildShareScope — empty global scope (8.1d)
  // -------------------------------------------------------------------------
  describe('8.1 buildShareScope — empty global scope results in empty shareScope', () => {
    it('passes an empty shareScope to init() when global scope is undefined', async () => {
      // globalThis federation key is already cleared from beforeEach
      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'emptyGlobalRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.emptyglobal.manifest.v1',
        remoteEntry,
        remoteName: 'emptyGlobalRemote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.emptyglobal.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      // Must not throw
      await expect(handler.load(entry)).resolves.toBeDefined();

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      // No packages in the shareScope
      expect(Object.keys(captured ?? {})).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: buildShareScope — bare version = exact match (8.1e)
  // -------------------------------------------------------------------------
  describe('8.1 buildShareScope — bare version string treated as exact match', () => {
    it('matches when the available version exactly equals a bare requiredVersion', async () => {
      setFederationShared({
        default: {
          tailwindcss: {
            '3.4.1': makeGlobalEntry('3.4.1'),
          },
        },
      });

      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'exactMatchRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.exact.manifest.v1',
        remoteEntry,
        remoteName: 'exactMatchRemote',
        sharedDependencies: [
          // Bare version — exact match only
          { name: 'tailwindcss', requiredVersion: '3.4.1', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.exact.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await handler.load(entry);

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      expect(captured['tailwindcss']).toContain('3.4.1');
    });

    it('does not match when available version differs from bare requiredVersion', async () => {
      setFederationShared({
        default: {
          tailwindcss: {
            '3.4.2': makeGlobalEntry('3.4.2'),
          },
        },
      });

      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'exactNoMatchRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.exactnomatch.manifest.v1',
        remoteEntry,
        remoteName: 'exactNoMatchRemote',
        sharedDependencies: [
          { name: 'tailwindcss', requiredVersion: '3.4.1', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.exactnomatch.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await expect(handler.load(entry)).resolves.toBeDefined();

      const captured = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      expect(captured?.['tailwindcss']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: registerMfeSharedModules — registers new entries from init() (8.2a)
  // -------------------------------------------------------------------------
  describe('8.2 registerMfeSharedModules — registers new entries from init()', () => {
    it('writes packages provided by the MFE container back into the global scope', async () => {
      // Global scope starts empty
      expect(getFederationShared()).toBeUndefined();

      // The container will write react@19.0.0 and react-dom@19.0.0 during init()
      const remoteEntry = createCapturingRemoteEntry({
        remoteName: 'registeringRemote',
        providedModules: [
          { name: 'react', version: '19.0.0' },
          { name: 'react-dom', version: '19.0.0' },
        ],
      });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.registering.manifest.v1',
        remoteEntry,
        remoteName: 'registeringRemote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
          { name: 'react-dom', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.registering.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await handler.load(entry);

      // The handler should have promoted the MFE's provided modules to global scope
      const defaultScope = getFederationShared()?.['default'];
      expect(defaultScope).toBeDefined();
      expect(defaultScope?.['react']?.['19.0.0']).toBeDefined();
      expect(defaultScope?.['react-dom']?.['19.0.0']).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: registerMfeSharedModules — first-loaded wins (8.2b)
  // -------------------------------------------------------------------------
  describe('8.2 registerMfeSharedModules — does not overwrite existing entries', () => {
    it('preserves the original entry when a second MFE provides the same package+version', async () => {
      const originalGet = async () => () => ({ __original: true }) as unknown;

      // Pre-populate global scope with react@19.0.0 from the "host"
      setFederationShared({
        default: {
          react: {
            '19.0.0': { get: originalGet, loaded: 1 },
          },
        },
      });

      // A second container also provides react@19.0.0
      const remoteEntry = createCapturingRemoteEntry({
        remoteName: 'secondRemote',
        providedModules: [{ name: 'react', version: '19.0.0' }],
      });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.second.manifest.v1',
        remoteEntry,
        remoteName: 'secondRemote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.second.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await handler.load(entry);

      // The original host entry must be preserved
      const reactEntry = getFederationShared()?.['default']?.['react']?.['19.0.0'];
      expect(reactEntry?.get).toBe(originalGet);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: registerMfeSharedModules — handles empty shareScope (8.2c)
  // -------------------------------------------------------------------------
  describe('8.2 registerMfeSharedModules — handles manifests with no sharedDependencies', () => {
    it('does not throw when manifest has no sharedDependencies', async () => {
      const remoteEntry = createCapturingRemoteEntry({ remoteName: 'noDepsRemote' });

      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.nodeps.manifest.v1',
        remoteEntry,
        remoteName: 'noDepsRemote',
        // No sharedDependencies
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.nodeps.entry.v1',
        manifest,
        exposedModule: './Widget1',
      };

      await expect(handler.load(entry)).resolves.toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Integration — sequential MFE loading; second reuses first (8.4)
  // -------------------------------------------------------------------------
  describe('8.4 Integration — second MFE reuses modules registered by first MFE', () => {
    it('second MFE load receives modules registered by first MFE into global scope', async () => {
      // Both MFEs are independent containers (different remoteNames)
      const remoteEntry1 = createCapturingRemoteEntry({
        remoteName: 'mfe1Remote',
        providedModules: [{ name: 'react', version: '19.0.0' }],
      });

      const remoteEntry2 = createCapturingRemoteEntry({ remoteName: 'mfe2Remote' });

      const manifest1: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.mfe1.manifest.v1',
        remoteEntry: remoteEntry1,
        remoteName: 'mfe1Remote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const manifest2: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~test.mfe2.manifest.v1',
        remoteEntry: remoteEntry2,
        remoteName: 'mfe2Remote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^19.0.0', singleton: false },
        ],
      };

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.mfe1.entry.v1',
        manifest: manifest1,
        exposedModule: './Widget1',
      };

      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~test.mfe2.entry.v1',
        manifest: manifest2,
        exposedModule: './Widget1',
      };

      // Load MFE-1: it provides react@19.0.0 which is registered into global scope
      await handler.load(entry1);

      // Verify MFE-1 registered react@19.0.0
      expect(getFederationShared()?.['default']?.['react']?.['19.0.0']).toBeDefined();

      // Clear the captured scope so we can inspect what MFE-2 receives
      (globalThis as Record<string, unknown>).__test_captured_share_scope__ = undefined;

      // Load MFE-2: should receive react@19.0.0 (registered by MFE-1) in its shareScope
      await handler.load(entry2);

      const capturedForMfe2 = (globalThis as Record<string, unknown>).__test_captured_share_scope__ as Record<string, string[]>;
      expect(capturedForMfe2?.['react']).toContain('19.0.0');
    });
  });
});
