/**
 * Tests for host share scope bootstrap in microfrontends plugin.
 *
 * Verifies that the plugin's onInit() correctly pre-populates
 * globalThis.__federation_shared__ when hostSharedDependencies are provided,
 * and is a no-op when they are omitted.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHAI3 } from '../../../src/createHAI3';
import { screensets } from '../../../src/plugins/screensets';
import { effects } from '../../../src/plugins/effects';
import {
  microfrontends,
  type HostSharedDependency,
} from '../../../src/plugins/microfrontends';
import { resetStore } from '@hai3/state';
import type { HAI3App } from '../../../src/types';

// ---------------------------------------------------------------------------
// Helpers: typed access to globalThis federation shared scope
// ---------------------------------------------------------------------------

/** Key used by the federation runtime and the typed accessors. */
const FEDERATION_KEY = '__federation_shared__';

/** Per-version map for a single package. */
type VersionMap = Record<string, { get: () => Promise<() => unknown>; loaded?: 1 }>;

/** Per-package map within a scope. */
type PackageScope = Record<string, VersionMap>;

/** Top-level federation map (scope name → package scope). */
type FederationMap = Record<string, PackageScope>;

/** Read the federation shared map from globalThis in a type-safe way. */
function readFederation(): FederationMap | undefined {
  return (globalThis as Record<string, FederationMap | undefined>)[FEDERATION_KEY];
}

/** Write the federation shared map into globalThis in a type-safe way. */
function writeFederation(value: FederationMap): void {
  (globalThis as Record<string, FederationMap | undefined>)[FEDERATION_KEY] = value;
}

/** Clear the federation global. */
function clearFederation(): void {
  (globalThis as Record<string, undefined>)[FEDERATION_KEY] = undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('microfrontends plugin — host share scope bootstrap', () => {
  let apps: HAI3App[] = [];
  let savedGlobal: FederationMap | undefined;

  beforeEach(() => {
    savedGlobal = readFederation();
    clearFederation();
  });

  afterEach(() => {
    apps.forEach((app) => app.destroy());
    apps = [];
    resetStore();
    if (savedGlobal !== undefined) {
      writeFederation(savedGlobal);
    } else {
      clearFederation();
    }
  });

  // -------------------------------------------------------------------------
  // Scenario: plugin pre-populates global scope in onInit (8.3a)
  // -------------------------------------------------------------------------
  describe('8.3 onInit() — populates global scope when hostSharedDependencies provided', () => {
    it('writes each dependency into globalThis.__federation_shared__["default"]', () => {
      const reactGet = async () => () => ({ react: true }) as unknown;
      const reactDomGet = async () => () => ({ reactDom: true }) as unknown;

      const hostDeps: HostSharedDependency[] = [
        { name: 'react', version: '19.2.4', get: reactGet },
        { name: 'react-dom', version: '19.2.4', get: reactDomGet },
      ];

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ hostSharedDependencies: hostDeps }))
        .build();
      apps.push(app);

      const defaultScope = readFederation()?.['default'];
      expect(defaultScope).toBeDefined();
      expect(defaultScope?.['react']?.['19.2.4']).toBeDefined();
      expect(defaultScope?.['react-dom']?.['19.2.4']).toBeDefined();

      // Verify the get function is correctly stored
      expect(defaultScope?.['react']?.['19.2.4'].get).toBe(reactGet);
      // loaded flag should be 1 (host modules are already loaded)
      expect(defaultScope?.['react']?.['19.2.4'].loaded).toBe(1);
    });

    it('supports multiple versions for the same package', () => {
      const get18 = async () => () => ({}) as unknown;
      const get19 = async () => () => ({}) as unknown;

      const hostDeps: HostSharedDependency[] = [
        { name: 'react', version: '18.3.1', get: get18 },
        { name: 'react', version: '19.2.4', get: get19 },
      ];

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ hostSharedDependencies: hostDeps }))
        .build();
      apps.push(app);

      const defaultScope = readFederation()?.['default'];
      expect(defaultScope?.['react']?.['18.3.1']).toBeDefined();
      expect(defaultScope?.['react']?.['19.2.4']).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: no hostSharedDependencies provided (8.3b)
  // -------------------------------------------------------------------------
  describe('8.3 onInit() — no-op when hostSharedDependencies is omitted', () => {
    it('does not modify globalThis.__federation_shared__ when hostSharedDependencies is undefined', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      // The global scope should remain undefined since nothing was pre-populated
      expect(readFederation()).toBeUndefined();
    });

    it('does not modify globalThis.__federation_shared__ when hostSharedDependencies is empty', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ hostSharedDependencies: [] }))
        .build();
      apps.push(app);

      expect(readFederation()).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: first-registered-wins (8.3c)
  // -------------------------------------------------------------------------
  describe('8.3 onInit() — does not overwrite existing entries', () => {
    it('preserves an existing entry when the same package+version is already in the global scope', () => {
      const originalGet = async () => () => ({ __original: true }) as unknown;

      // Simulate an entry already in the global scope (e.g., from a prior plugin or test setup)
      writeFederation({
        default: {
          react: {
            '19.2.4': { get: originalGet, loaded: 1 },
          },
        },
      });

      const newGet = async () => () => ({ __new: true }) as unknown;
      const hostDeps: HostSharedDependency[] = [
        { name: 'react', version: '19.2.4', get: newGet },
      ];

      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends({ hostSharedDependencies: hostDeps }))
        .build();
      apps.push(app);

      // Original entry must not be overwritten
      const entry = readFederation()?.['default']?.['react']?.['19.2.4'];
      expect(entry?.get).toBe(originalGet);
    });
  });
});
