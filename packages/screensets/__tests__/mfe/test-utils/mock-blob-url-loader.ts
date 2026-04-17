/**
 * Test utilities for mocking the blob URL loading mechanism in MfeHandlerMF.
 *
 * The loading mechanism:
 *  1. Fetches chunk source text via fetch()
 *  2. Creates blob URLs via URL.createObjectURL()
 *  3. Imports blob URLs via dynamic import()
 *
 * In Node.js/Vitest (jsdom), we mock:
 *  - fetch() to return registered source texts by URL
 *  - Blob constructor to track string content
 *  - URL.createObjectURL() to return data: URLs (importable in Node.js)
 *  - URL.revokeObjectURL() as no-op
 *
 * @packageDocumentation
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Blob content tracking
// ---------------------------------------------------------------------------

/**
 * Maps MockBlob instance IDs → their string content.
 * URL.createObjectURL reads content back from this map.
 */
const blobContentMap = new Map<number, string>();
let blobIdCounter = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set up all mocks needed for the blob URL loading mechanism.
 *
 * Returns an object with:
 *  - registerSource(url, source): register source text for a URL
 *  - mockFetch: the mock fetch function (for assertion)
 *  - cleanup(): restore all original globals
 */
export function setupBlobUrlLoaderMocks() {
  const sourceTexts = new Map<string, string>();

  // Save originals
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const OriginalBlob = globalThis.Blob;

  // Reset tracking
  blobContentMap.clear();
  blobIdCounter = 0;

  // Override Blob to track content for createObjectURL
  const MockBlobClass = class MockBlob {
    _blobMockId: number;
    constructor(parts: BlobPart[], _options?: BlobPropertyBag) {
      this._blobMockId = blobIdCounter++;
      blobContentMap.set(
        this._blobMockId,
        parts.map((p) => String(p)).join('')
      );
    }
  };
  globalThis.Blob = MockBlobClass as unknown as typeof Blob;

  // Mock URL.createObjectURL → data: URL (importable in Node.js)
  URL.createObjectURL = vi.fn().mockImplementation(
    (blob: { _blobMockId?: number }) => {
      const content = blobContentMap.get(blob._blobMockId ?? -1) ?? '';
      const base64 = Buffer.from(content).toString('base64');
      return `data:text/javascript;base64,${base64}`;
    }
  );

  // Mock URL.revokeObjectURL — no-op
  URL.revokeObjectURL = vi.fn();

  // Mock fetch — returns registered source text or 404
  const mockFetch = vi.fn().mockImplementation(async (url: string) => {
    const source = sourceTexts.get(url);
    if (source !== undefined) {
      return {
        ok: true,
        headers: { get: (_name: string) => 'text/javascript' },
        text: () => Promise.resolve(source),
      } as unknown as Response;
    }
    return {
      ok: false,
      status: 404,
      headers: { get: (_name: string) => null },
      text: () => Promise.resolve('Not Found'),
    } as unknown as Response;
  });
  globalThis.fetch = mockFetch;

  return {
    /** Register source text for a URL so fetch() returns it. */
    registerSource(url: string, source: string): void {
      sourceTexts.set(url, source);
    },

    /** The mock fetch function for assertions (e.g., call count). */
    mockFetch,

    /** Restore all original globals. Call in afterEach(). */
    cleanup(): void {
      globalThis.fetch = originalFetch;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      globalThis.Blob = OriginalBlob;
      blobContentMap.clear();
      blobIdCounter = 0;
      sourceTexts.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Source text factories
// ---------------------------------------------------------------------------

/**
 * Create remote entry source text that the handler can parse.
 *
 * The source contains a moduleMap with expose entries matching the pattern
 * that parseExposeChunkFilename() looks for:
 *   "exposedModule"....__federation_import('./chunkFilename')
 *
 * @param exposedModules - Map of expose name → chunk filename
 *   e.g. { './Widget1': 'expose-Widget1.js' }
 */
export function createRemoteEntrySource(
  exposedModules: Record<string, string>,
  cssByExpose: Record<string, string[]> = {}
): string {
  const entries = Object.entries(exposedModules)
    .map(
      ([key, chunk]) => {
        const cssPaths = cssByExpose[key] ?? [];
        const cssArg = `[${cssPaths.map((path) => "'" + path + "'").join(',')}]`;
        return `"${key}":()=>{dynamicLoadingCss(${cssArg},false,'${key}');return __federation_import('./${chunk}')}`;
      }
    )
    .join(',');
  return `const moduleMap = {${entries}};`;
}

/**
 * Create expose chunk source text that exports a valid lifecycle module.
 * No relative imports, so createBlobUrlChain won't recurse.
 */
export function createExposeChunkSource(): string {
  return 'export default { mount: () => {}, unmount: () => {} };';
}

/**
 * Create a chunk source that imports from a relative path.
 * Used to test '../' import resolution for chunks in subdirectories.
 *
 * @param relImport - The relative import specifier (e.g. '../runtime.js')
 */
export function createChunkWithRelativeImport(relImport: string): string {
  return `import { helper } from '${relImport}';\nexport default { mount: () => {}, unmount: () => {} };`;
}

/**
 * Create a standalone ESM source text for a shared dependency.
 *
 * The generated source imports the given bare specifiers (simulating a shared
 * dep that itself depends on other shared deps) and exports a default object.
 * Bare specifier rewrites in the handler will replace these imports with blob URLs.
 *
 * @param bareImports - Package names to import as bare specifiers
 */
export function createSharedDepSource(bareImports?: string[]): string {
  const imports = bareImports?.map(
    (name) => `import __ext_${name.replace(/\W/g, '_')} from "${name}";`
  ).join('\n') ?? '';
  return imports ? `${imports}\nexport default {};` : 'export default {};';
}

/** Standard test base URL for mock MFEs. */
export const TEST_BASE_URL = 'http://test-mfe.local/assets';
