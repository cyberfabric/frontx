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
   *  With shared:{}, these are no longer validated against mf-manifest.json shared[]
   *  (which is empty). Instead they declare the deps the handler must provide. */
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
  chunkPath: string | null;
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
  /** Shared deps declared in mfe.json — the handler uses this list to know
   *  which bare specifiers to rewrite to blob URLs at runtime. */
  shared: GtsSharedEntry[];
  /** No longer used — kept for backward compatibility with generate script.
   *  With shared:{}, MF 2.0 does not produce __mf_init__ keys. */
  mfInitKey: string;
  entries: GtsEntry[];
  extensions: MfeJsonExtension[];
  schemas: MfeJsonSchema[];
}

// ── Manifest assembler ──────────────────────────────────────────────────────

class GtsManifestAssembler {
  assemble(
    mfeJson: MfeJson,
    mfManifest: MfManifest,
    federationName: string
  ): GtsManifest {
    const shared = this.buildShared(
      mfeJson.sharedDependencies ?? [],
      federationName
    );
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
      // No longer used — shared deps are loaded via bare specifier rewriting,
      // not via MF 2.0's __mf_init__ mechanism.
      mfInitKey: '',
      entries,
      extensions: mfeJson.extensions,
      schemas: mfeJson.schemas,
    };
  }

  /**
   * Build shared entries from the declared dependency names in mfe.json.
   * With shared:{}, there are no MF 2.0 shared chunks — the handler builds
   * and provides shared deps independently via standalone ESM blob URLs.
   * chunkPath and unwrapKey are null; the handler resolves deps by name.
   */
  private buildShared(
    declaredDeps: string[],
    federationName: string
  ): GtsSharedEntry[] {
    return declaredDeps.map((name) => ({
      id: `${federationName}:${name}`,
      name,
      version: '*',
      singleton: true,
      requiredVersion: '*',
      chunkPath: null,
      unwrapKey: null,
    }));
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

  createPlugin(): Plugin {
    const assembler = this.assembler;
    const packageRoot = this.packageRoot;

    return {
      name: 'frontx-mf-gts',
      // Run after all other plugins, including @module-federation/vite, so
      // that dist/mf-manifest.json is already on disk.
      enforce: 'post',

      // @cpt-algo:cpt-frontx-algo-mfe-isolation-enrich-mfe-json:p1
      closeBundle() {
        const distDir = path.join(packageRoot, 'dist');

        // ── Read inputs ─────────────────────────────────────────────────────

        const mfeJson: MfeJson = JSON.parse(
          fs.readFileSync(path.join(packageRoot, 'mfe.json'), 'utf-8')
        ) as MfeJson;

        const mfManifest: MfManifest = JSON.parse(
          fs.readFileSync(path.join(distDir, 'mf-manifest.json'), 'utf-8')
        ) as MfManifest;

        // With shared:{}, the MF 2.0 build no longer produces:
        //   - localSharedImportMap (no shared dep chunks)
        //   - __mf_init__ keys (no FederationHost initialization)
        //   - shared dep proxy/library chunks
        // The plugin only needs mf-manifest.json for expose asset paths.

        // ── Assemble ─────────────────────────────────────────────────────────

        const gtsManifest = assembler.assemble(
          mfeJson,
          mfManifest,
          mfManifest.name
        );

        // ── Emit GTS manifest ───────────────────────────────────────────────

        const outPath = path.join(distDir, 'mfe.gts-manifest.json');
        fs.writeFileSync(
          outPath,
          JSON.stringify(gtsManifest, null, 2),
          'utf-8'
        );

        // Use console.log because Vite's `this.info()` is unavailable in
        // closeBundle when called outside a normal rollup context.
        console.log(`[frontx-mf-gts] emitted ${outPath}`);
      },
    };
  }
}
// @cpt-end:frontx-mf-gts-plugin:p1:inst-1
