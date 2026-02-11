/**
 * MfeHandlerMF Tests
 *
 * Tests for Phase 17: MFE Handler Internal Caching
 * Verifies manifest caching, container caching, and manifest resolution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MfeHandlerMF } from '../../../src/mfe/handler/mf-handler';
import { GtsPlugin } from '../../../src/mfe/plugins/gts';
import type { MfeEntryMF, MfManifest } from '../../../src/mfe/types';
import { MfeLoadError } from '../../../src/mfe/errors';

describe('MfeHandlerMF - Phase 17 Caching', () => {
  let handler: MfeHandlerMF;
  let mockDocument: {
    createElement: ReturnType<typeof vi.fn>;
    head: { appendChild: ReturnType<typeof vi.fn> };
  };
  let mockScript: {
    src: string;
    type: string;
    async: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let originalDocument: unknown;
  let containerNames: string[] = [];

  beforeEach(() => {
    const typeSystem = new GtsPlugin();
    handler = new MfeHandlerMF(typeSystem, { timeout: 5000, retries: 0 });

    // Save original document
    originalDocument = (globalThis as unknown as { document?: unknown }).document;

    // Track container names we add to globalThis
    containerNames = [];

    // Mock DOM APIs
    mockScript = {
      src: '',
      type: '',
      async: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockDocument = {
      createElement: vi.fn().mockReturnValue(mockScript),
      head: {
        appendChild: vi.fn(),
      },
    };

    // Replace document in global scope
    (globalThis as unknown as { document: unknown }).document = mockDocument;
  });

  afterEach(() => {
    // Restore original document
    if (originalDocument !== undefined) {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }

    // Clean up container names from globalThis
    for (const name of containerNames) {
      delete (globalThis as Record<string, unknown>)[name];
    }
    containerNames = [];

    vi.clearAllMocks();
  });

  describe('17.1 - ManifestCache (Internal)', () => {
    it('17.1.1 - ManifestCache class exists within mf-handler.ts', () => {
      // ManifestCache is internal to MfeHandlerMF
      // We verify its behavior through handler methods
      expect(handler).toBeDefined();
      expect(typeof handler.load).toBe('function');
      expect(typeof handler.preload).toBe('function');
    });

    it('17.1.2 - Implements in-memory manifest caching for reuse across entries', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
        manifest,
        exposedModule: './ChartWidget1',
      };

      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
        manifest,
        exposedModule: './ChartWidget2',
      };

      // Setup mock container
      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      // Mock script loading - trigger load event immediately
      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          // Set up global container before triggering load
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load first entry - should cache manifest
      await handler.load(entry1);

      // Load second entry with same manifest - should reuse cached manifest
      await handler.load(entry2);

      // Both entries should share the same cached manifest and container
      // Verified by checking that init was only called once (container reused)
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
    });

    it('17.1.3 - Implements container caching per remoteName', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
        manifest,
        exposedModule: './ChartWidget1',
      };

      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
        manifest,
        exposedModule: './ChartWidget2',
      };

      // Setup mock container
      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      // Mock script loading
      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load first entry
      await handler.load(entry1);
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);

      // Load second entry with same remoteName
      await handler.load(entry2);

      // Script should not be loaded again (container cached)
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
      // Container init should only be called once
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
    });

    it('17.1.4 - Caches manifests resolved from MfeEntryMF during load', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest,
        exposedModule: './ChartWidget',
      };

      // Setup mock container
      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load entry - manifest should be cached
      await handler.load(entry);

      // Create another entry with same manifest ID (string reference)
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
        manifest: manifest.id, // Use cached manifest by ID
        exposedModule: './ChartWidget2',
      };

      // Load second entry - should use cached manifest
      await handler.load(entry2);

      // Both loads should succeed, confirming manifest was cached
      expect(mockContainer.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('17.2 - MfeHandlerMF Manifest Resolution', () => {
    it('17.2.1 - Implements manifest resolution from MfeEntryMF.manifest field', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest,
        exposedModule: './ChartWidget',
      };

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Should resolve manifest from entry.manifest field
      const result = await handler.load(entry);
      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
    });

    it('17.2.2 - Supports manifest as inline object', async () => {
      const inlineManifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: inlineManifest, // Inline object
        exposedModule: './ChartWidget',
      };

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[inlineManifest.remoteName] = mockContainer;
          containerNames.push(inlineManifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      const result = await handler.load(entry);
      expect(result).toBeDefined();
    });

    it('17.2.2 - Supports manifest as type ID reference', async () => {
      // First, load with inline manifest to cache it
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
        manifest, // Inline to cache
        exposedModule: './ChartWidget1',
      };

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      await handler.load(entry1);

      // Now use type ID reference
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
        manifest: manifest.id, // Type ID reference
        exposedModule: './ChartWidget2',
      };

      const result = await handler.load(entry2);
      expect(result).toBeDefined();
    });

    it('17.2.3 - Caches resolved manifests for entries from same remote', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entries: MfeEntryMF[] = [
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
          manifest,
          exposedModule: './ChartWidget1',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
          manifest,
          exposedModule: './ChartWidget2',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart3.v1',
          manifest,
          exposedModule: './ChartWidget3',
        },
      ];

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load all entries
      for (const entry of entries) {
        await handler.load(entry);
      }

      // Container should only be initialized once (manifest and container cached)
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
      // Script should only be loaded once
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
      // Each entry should get its module
      expect(mockContainer.get).toHaveBeenCalledTimes(3);
    });

    it('17.2.4 - Clear error messaging if manifest resolution fails (missing inline fields)', async () => {
      const invalidManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        // Missing remoteEntry and remoteName
      } as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('remoteEntry');
    });

    it('17.2.4 - Clear error messaging if manifest resolution fails (type ID not found)', async () => {
      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: 'gts.hai3.mfes.mfe.mf_manifest.v1~missing.manifest.v1', // Not cached
        exposedModule: './ChartWidget',
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('not found');
    });

    it('17.2.4 - Clear error messaging for invalid manifest object (missing id)', async () => {
      const invalidManifest = {
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
        // Missing id field
      } as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('"id"');
    });

    it('17.2.4 - Clear error messaging for invalid manifest object (missing remoteName)', async () => {
      const invalidManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        // Missing remoteName
      } as MfManifest;

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: invalidManifest,
        exposedModule: './ChartWidget',
      };

      await expect(handler.load(entry)).rejects.toThrow(MfeLoadError);
      await expect(handler.load(entry)).rejects.toThrow('remoteName');
    });
  });

  describe('17.3 - Handler Caching Integration Tests', () => {
    it('17.3.1 - Manifest caching reuses data for multiple entries from same remote', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entries: MfeEntryMF[] = [
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
          manifest,
          exposedModule: './ChartWidget1',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
          manifest: manifest.id, // Reference by ID
          exposedModule: './ChartWidget2',
        },
      ];

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load first entry with inline manifest
      await handler.load(entries[0]);

      // Load second entry with type ID reference
      await handler.load(entries[1]);

      // Both should succeed, proving manifest was cached and reused
      expect(mockContainer.get).toHaveBeenCalledTimes(2);
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
    });

    it('17.3.2 - Container caching avoids redundant script loads', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entries: MfeEntryMF[] = [
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
          manifest,
          exposedModule: './Widget1',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
          manifest,
          exposedModule: './Widget2',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart3.v1',
          manifest,
          exposedModule: './Widget3',
        },
      ];

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Load all entries
      for (const entry of entries) {
        await handler.load(entry);
      }

      // Script should only be appended once
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
      // Container should only be initialized once
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
      // Each entry should get its module
      expect(mockContainer.get).toHaveBeenCalledTimes(3);
      expect(mockContainer.get).toHaveBeenNthCalledWith(1, './Widget1');
      expect(mockContainer.get).toHaveBeenNthCalledWith(2, './Widget2');
      expect(mockContainer.get).toHaveBeenNthCalledWith(3, './Widget3');
    });

    it('17.3.3 - Manifest resolution from inline MfeEntryMF.manifest', async () => {
      const inlineManifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
        sharedDependencies: [
          { name: 'react', requiredVersion: '^18.0.0', singleton: false },
        ],
      };

      const entry: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart.v1',
        manifest: inlineManifest, // Inline object with all fields
        exposedModule: './ChartWidget',
      };

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[inlineManifest.remoteName] = mockContainer;
          containerNames.push(inlineManifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      const result = await handler.load(entry);

      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
    });

    it('17.3.4 - Manifest resolution from type ID reference', async () => {
      // Setup: Load first entry with inline manifest to cache it
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entry1: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
        manifest, // Inline
        exposedModule: './ChartWidget1',
      };

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      await handler.load(entry1);

      // Test: Load second entry with type ID reference
      const entry2: MfeEntryMF = {
        id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
        manifest: manifest.id, // Type ID reference (string)
        exposedModule: './ChartWidget2',
      };

      const result = await handler.load(entry2);

      expect(result).toBeDefined();
      expect(typeof result.mount).toBe('function');
      expect(typeof result.unmount).toBe('function');
      // Container should be reused (no additional script load)
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('17.3 - Preload with Caching', () => {
    it('preload() batches container loading for multiple entries', async () => {
      const manifest: MfManifest = {
        id: 'gts.hai3.mfes.mfe.mf_manifest.v1~acme.analytics.manifest.v1',
        remoteEntry: 'https://cdn.example.com/remoteEntry.js',
        remoteName: 'analyticsRemote',
      };

      const entries: MfeEntryMF[] = [
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart1.v1',
          manifest,
          exposedModule: './Widget1',
        },
        {
          id: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.chart2.v1',
          manifest,
          exposedModule: './Widget2',
        },
      ];

      const mockContainer = {
        get: vi.fn().mockResolvedValue(() => ({
          mount: vi.fn(),
          unmount: vi.fn(),
        })),
        init: vi.fn().mockResolvedValue(undefined),
      };

      mockScript.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          (globalThis as Record<string, unknown>)[manifest.remoteName] = mockContainer;
          containerNames.push(manifest.remoteName);
          setTimeout(() => handler(), 0);
        }
      });

      // Preload should load container once for both entries
      await handler.preload(entries);

      // Now load entries - should not reload container
      await handler.load(entries[0]);
      await handler.load(entries[1]);

      // Container should be loaded and initialized only once during preload
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(1);
      expect(mockContainer.init).toHaveBeenCalledTimes(1);
    });
  });
});
