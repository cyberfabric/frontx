// @cpt-FEATURE:frontx-mf-gts-plugin:p1
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin } from 'vite';

// ── Types matching mf-manifest.json structure ───────────────────────────────

interface MfManifestSharedAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface MfManifestShared {
  id: string;
  name: string;
  version: string;
  singleton: boolean;
  requiredVersion: string;
  assets: MfManifestSharedAssets;
}

interface MfManifestExposeAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface MfManifestExpose {
  id: string;
  name: string;
  assets: MfManifestExposeAssets;
  path: string;
}

interface MfManifestMetaData {
  name: string;
  type: string;
  buildInfo: { buildVersion: string; buildName: string };
  remoteEntry: { name: string; path: string; type: string };
  ssrRemoteEntry: { name: string; path: string; type: string };
  types: { path: string; name: string };
  globalName: string;
  pluginVersion: string;
  publicPath: string;
}

interface MfManifest {
  id: string;
  name: string;
  metaData: MfManifestMetaData;
  shared: MfManifestShared[];
  remotes: unknown[];
  exposes: MfManifestExpose[];
}

// ── Types matching mfe.json structure ───────────────────────────────────────

interface MfeJsonManifest {
  id: string;
  remoteEntry: string;
}

interface MfeJsonEntry {
  id: string;
  requiredProperties: string[];
  actions: string[];
  domainActions: string[];
  manifest: string;
  exposedModule: string;
}

interface MfeJsonExtensionPresentation {
  label: string;
  icon: string;
  route: string;
  order: number;
}

interface MfeJsonExtension {
  id: string;
  domain: string;
  entry: string;
  presentation: MfeJsonExtensionPresentation;
}

interface MfeJsonSchema {
  $id: string;
  [key: string]: unknown;
}

interface MfeJson {
  /** Human-authored list of shared dependency names visible on the GTS contract.
   *  Must be a subset of the packages declared in vite.config.ts federation shared[].
   *  The plugin validates that every listed name appears in mf-manifest.json shared[]
   *  and rejects the build if any name is missing. */
  sharedDependencies?: string[];
  manifest: MfeJsonManifest;
  entries: MfeJsonEntry[];
  extensions: MfeJsonExtension[];
  schemas: MfeJsonSchema[];
}

// ── Types for the emitted GTS manifest ──────────────────────────────────────

interface GtsManifestMetaData {
  name: string;
  type: string;
  buildInfo: { buildVersion: string; buildName: string };
  remoteEntry: { name: string; path: string; type: string };
  globalName: string;
  publicPath: string;
}

interface GtsSharedEntry {
  id: string;
  name: string;
  version: string;
  singleton: boolean;
  requiredVersion: string;
  // Path relative to dist/assets/ for the chunk that carries this shared lib.
  // Null when the MF manifest has no sync chunk (peer-provided external).
  chunkPath: string | null;
  // Named export key that unwraps the module from the chunk. Null when the
  // chunk exports the module directly (no .then(t => t.KEY) in the import map).
  unwrapKey: string | null;
}

interface GtsEntryExposeAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface GtsEntry {
  id: string;
  requiredProperties: string[];
  actions: string[];
  domainActions: string[];
  manifest: string;
  exposedModule: string;
  exposeAssets: GtsEntryExposeAssets | null;
}

interface GtsManifest {
  id: string;
  name: string;
  metaData: GtsManifestMetaData;
  /** Only deps declared in mfe.json sharedDependencies — the contract surface. */
  shared: GtsSharedEntry[];
  mfInitKey: string;
  entries: GtsEntry[];
  extensions: MfeJsonExtension[];
  schemas: MfeJsonSchema[];
}

// ── Extraction helpers (encapsulated in a class to avoid standalone fns) ────

class MfInitKeyExtractor {
  // The key is stored as a string literal: `"__mf_init__...__"`.
  // We capture everything between the double-quotes.
  private static readonly PATTERN = /"(__mf_init__[^"]+)"/;

  extract(remoteEntrySource: string): string {
    const match = MfInitKeyExtractor.PATTERN.exec(remoteEntrySource);
    if (match === null) {
      throw new Error(
        'frontx-mf-gts: could not find __mf_init__ key in remoteEntry.js'
      );
    }
    return match[1];
  }
}

class SharedImportMapExtractor {
  // Package keys in the localSharedImportMap object may be either quoted
  // ("@cyberfabric/react") or unquoted bare identifiers (react). Both forms
  // must be handled.
  //
  // Pattern anatomy:
  //   (?:"([^"]+)"|(\w+))           — quoted key OR bare identifier key
  //   :\s*async\s*\(\)...import     — async factory leading up to the import()
  //   \("([^"]+)"\)                  — chunk path in the import() call
  //   (?:\.then\(\w+=>\w+\.(\w+)\))?— optional .then(t => t.KEY) unwrap
  private static readonly ENTRY_PATTERN =
    /(?:"([^"]+)"|(\w+)):\s*async\s*\(\)\s*=>\s*await\s*\w+\s*\(\s*\(\s*\)\s*=>\s*import\("([^"]+)"\)(?:\.then\(\w+\s*=>\s*\w+\.(\w+)\))?/g;

  // Maps package name → { chunkPath, unwrapKey }
  extract(
    importMapSource: string
  ): Map<string, { chunkPath: string; unwrapKey: string | null }> {
    const result = new Map<
      string,
      { chunkPath: string; unwrapKey: string | null }
    >();

    let m: RegExpExecArray | null;
    while (
      (m = SharedImportMapExtractor.ENTRY_PATTERN.exec(importMapSource)) !==
      null
    ) {
      // Group 1 = quoted key, group 2 = bare identifier key, group 3 = chunk,
      // group 4 = unwrap key (optional).
      const packageName = m[1] ?? m[2];
      const chunkFile = m[3];
      const unwrapKey = m[4] ?? null;

      if (packageName !== undefined && chunkFile !== undefined) {
        result.set(packageName, { chunkPath: chunkFile, unwrapKey });
      }
    }

    return result;
  }
}

// ── Manifest assembler ─────────────────────────────────────────────────────── ───────────────────────────────────────────────────────

class GtsManifestAssembler {
  private readonly mfInitKeyExtractor = new MfInitKeyExtractor();
  private readonly importMapExtractor = new SharedImportMapExtractor();

  assemble(
    mfeJson: MfeJson,
    mfManifest: MfManifest,
    remoteEntrySource: string,
    importMapSource: string
  ): GtsManifest {
    const mfInitKey = this.mfInitKeyExtractor.extract(remoteEntrySource);
    const importMap = this.importMapExtractor.extract(importMapSource);

    const declaredDeps = this.validateAndResolveDeclaredDeps(
      mfeJson.sharedDependencies,
      mfManifest.shared
    );

    const shared = this.buildShared(declaredDeps, importMap);
    const entries = this.buildEntries(mfeJson.entries, mfManifest.exposes);

    return {
      id: mfeJson.manifest.id,
      name: mfManifest.name,
      metaData: {
        name: mfManifest.metaData.name,
        type: mfManifest.metaData.type,
        buildInfo: mfManifest.metaData.buildInfo,
        remoteEntry: mfManifest.metaData.remoteEntry,
        globalName: mfManifest.metaData.globalName,
        publicPath: mfManifest.metaData.publicPath,
      },
      shared,
      mfInitKey,
      entries,
      extensions: mfeJson.extensions,
      schemas: mfeJson.schemas,
    };
  }

  /**
   * Validates that every name in mfe.json sharedDependencies is present in the
   * mf-manifest.json shared[] output, then returns the matching subset in
   * declaration order.
   *
   * When sharedDependencies is omitted (legacy/template packages that haven't
   * declared it yet) we fall back to the full build output so existing builds
   * don't break while teams migrate.
   */
  private validateAndResolveDeclaredDeps(
    declaredNames: string[] | undefined,
    mfShared: MfManifestShared[]
  ): MfManifestShared[] {
    // Index the build output by package name for O(1) lookup.
    const builtIndex = new Map<string, MfManifestShared>();
    for (const s of mfShared) {
      builtIndex.set(s.name, s);
    }

    if (declaredNames === undefined || declaredNames.length === 0) {
      // No declaration — include everything the build produced (permissive fallback).
      return mfShared;
    }

    const resolved: MfManifestShared[] = [];
    for (const name of declaredNames) {
      const entry = builtIndex.get(name);
      if (entry === undefined) {
        throw new Error(
          `frontx-mf-gts: Shared dependency '${name}' declared in mfe.json ` +
          `but not found in mf-manifest.json. ` +
          `Add it to vite.config.ts federation shared config.`
        );
      }
      resolved.push(entry);
    }
    return resolved;
  }

  private buildShared(
    mfShared: MfManifestShared[],
    importMap: Map<string, { chunkPath: string; unwrapKey: string | null }>
  ): GtsSharedEntry[] {
    return mfShared.map((s) => {
      // Prefer the chunk path declared in the MF manifest sync assets.
      const manifestChunk = s.assets.js.sync[0] ?? null;
      const importMapEntry = importMap.get(s.name);

      // The chunkPath is relative to dist/ (includes the assets/ prefix).
      // The handler prepends publicPath to form the full URL.
      // When the manifest has a sync chunk, that's authoritative.
      // Otherwise fall back to whatever the import map recorded (with assets/ prefix).
      let chunkPath: string | null = null;
      if (manifestChunk !== null) {
        // mf-manifest stores "assets/foo.js" — keep the full relative path.
        chunkPath = manifestChunk;
      } else if (importMapEntry !== undefined) {
        // Import map stores just the filename — prepend "assets/" since
        // all chunks live in dist/assets/.
        chunkPath = importMapEntry.chunkPath.startsWith('assets/')
          ? importMapEntry.chunkPath
          : 'assets/' + importMapEntry.chunkPath;
      }

      // The unwrap key always comes from the import map — the MF manifest
      // doesn't record it.
      const unwrapKey = importMapEntry?.unwrapKey ?? null;

      return {
        id: s.id,
        name: s.name,
        version: s.version,
        singleton: s.singleton,
        requiredVersion: s.requiredVersion,
        chunkPath,
        unwrapKey,
      };
    });
  }

  private buildEntries(
    mfeEntries: MfeJsonEntry[],
    mfExposes: MfManifestExpose[]
  ): GtsEntry[] {
    // Index exposes by their path (e.g. "./lifecycle-helloworld") for O(1) lookup.
    const exposesIndex = new Map<string, MfManifestExpose>();
    for (const expose of mfExposes) {
      exposesIndex.set(expose.path, expose);
    }

    return mfeEntries.map((entry) => {
      const expose = exposesIndex.get(entry.exposedModule) ?? null;
      return {
        id: entry.id,
        requiredProperties: entry.requiredProperties,
        actions: entry.actions,
        domainActions: entry.domainActions,
        manifest: entry.manifest,
        exposedModule: entry.exposedModule,
        exposeAssets: expose !== null ? expose.assets : null,
      };
    });
  }
}

// ── Plugin class ─────────────────────────────────────────────────────────────

// @cpt-begin:frontx-mf-gts-plugin:p1:inst-1
export class FrontxMfGtsPlugin {
  private readonly assembler = new GtsManifestAssembler();

  // The package root is injected at construction time so the plugin can locate
  // mfe.json independently of Vite's cwd (which may differ in monorepo setups).
  constructor(private readonly packageRoot: string) {}

  /**
   * Search dist/ and dist/assets/ for a JS file containing the __mf_init__ key.
   * The key may be in remoteEntry.js itself or in a chunk it imports
   * (e.g., virtual_mf-REMOTE_ENTRY_ID_*.js when Vite code-splits the entry).
   */
  private findMfInitSource(distDir: string, assetsDir: string): string {
    const candidates: string[] = [];

    // Check dist/ root JS files first (remoteEntry.js)
    for (const f of fs.readdirSync(distDir)) {
      if (f.endsWith('.js')) candidates.push(path.join(distDir, f));
    }

    // Then check dist/assets/ for the runtime chunk
    if (fs.existsSync(assetsDir)) {
      for (const f of fs.readdirSync(assetsDir)) {
        if (f.endsWith('.js') && (f.includes('REMOTE_ENTRY') || f.includes('remoteEntry') || f.includes('runtimeInit'))) {
          candidates.push(path.join(assetsDir, f));
        }
      }
    }

    for (const filePath of candidates) {
      const source = fs.readFileSync(filePath, 'utf-8');
      if (source.includes('__mf_init__')) {
        return source;
      }
    }

    throw new Error(
      'frontx-mf-gts: could not find __mf_init__ key in any JS file under dist/. ' +
      'Ensure @module-federation/vite is configured and builds correctly.'
    );
  }

  createPlugin(): Plugin {
    const self = this;
    const assembler = this.assembler;
    const packageRoot = this.packageRoot;

    return {
      name: 'frontx-mf-gts',
      // Run after all other plugins, including @module-federation/vite, so
      // that dist/mf-manifest.json and remoteEntry.js are already on disk.
      enforce: 'post',

      closeBundle() {
        const distDir = path.join(packageRoot, 'dist');
        const assetsDir = path.join(distDir, 'assets');

        // ── Read inputs ─────────────────────────────────────────────────────

        const mfeJson: MfeJson = JSON.parse(
          fs.readFileSync(path.join(packageRoot, 'mfe.json'), 'utf-8')
        ) as MfeJson;

        const mfManifest: MfManifest = JSON.parse(
          fs.readFileSync(path.join(distDir, 'mf-manifest.json'), 'utf-8')
        ) as MfManifest;

        // The __mf_init__ key may be in remoteEntry.js or in a chunk that
        // remoteEntry.js imports (e.g., virtual_mf-REMOTE_ENTRY_ID_*.js).
        // Search all JS files in dist/ and dist/assets/ for the key.
        const remoteEntrySource = self.findMfInitSource(distDir, assetsDir);

        // Locate the localSharedImportMap chunk — its name includes a content
        // hash, so we glob for it rather than hardcoding.
        const importMapFiles = fs
          .readdirSync(assetsDir)
          .filter((f) => f.startsWith('localSharedImportMap'));

        if (importMapFiles.length === 0) {
          throw new Error(
            'frontx-mf-gts: no localSharedImportMap file found in dist/assets/'
          );
        }

        const importMapSource = fs.readFileSync(
          path.join(assetsDir, importMapFiles[0]!),
          'utf-8'
        );

        // ── Assemble and emit ────────────────────────────────────────────────

        const gtsManifest = assembler.assemble(
          mfeJson,
          mfManifest,
          remoteEntrySource,
          importMapSource
        );

        const outPath = path.join(distDir, 'mfe.gts-manifest.json');
        fs.writeFileSync(outPath, JSON.stringify(gtsManifest, null, 2), 'utf-8');

        // Use console.log because Vite's `this.info()` is unavailable in
        // closeBundle when called outside a normal rollup context.
        console.log(`[frontx-mf-gts] emitted ${outPath}`);
      },
    };
  }
}
// @cpt-end:frontx-mf-gts-plugin:p1:inst-1
