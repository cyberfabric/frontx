#!/usr/bin/env node

// @cpt-FEATURE:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2

/**
 * MFE Manifest Generation Script
 *
 * Reads the enriched mfe.json produced by the frontx-mf-gts Vite plugin for
 * each MFE package and generates a TypeScript module consumed by the host
 * application's bootstrap.
 *
 * The enriched mfe.json already contains all required data:
 * - manifest.metaData: publicPath, remoteEntry, buildInfo from mf-manifest.json
 * - manifest.shared[]: standalone ESM deps with resolved versions and chunkPaths
 * - manifest.mfInitKey: empty string (MF 2.0 runtime removed)
 * - entries[].exposeAssets: from mf-manifest.json exposes[]
 *
 * Pipeline per MFE package:
 *   1. Read mfe.json — enriched by the build plugin
 *   2. Inject resolved publicPath (overrides build-time placeholder)
 *   3. Copy shared dep `chunkPath` entries unchanged from the enriched manifest
 *   4. Map entries to MfeEntryMF shape with manifest reference and exposeAssets
 *
 * Usage:
 *   npx tsx scripts/generate-mfe-manifests.ts [--base-url <url>]
 *
 * When --base-url is omitted, publicPath comes from manifest.metaData.publicPath
 * in the enriched mfe.json (set by the build plugin from mf-manifest.json).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMfeRootsSync } from './lib/mfe-roots.mjs';

// ---------------------------------------------------------------------------
// Raw JSON shape types (what we read from the enriched mfe.json on disk)
// ---------------------------------------------------------------------------

interface RawMetaData {
  name: string;
  type: string;
  buildInfo: { buildVersion: string; buildName: string };
  remoteEntry: { name: string; path: string; type: string };
  globalName: string;
  publicPath: string;
}

interface RawShared {
  name: string;
  version: string;
  chunkPath: string;
  unwrapKey: string | null;
}

interface RawExposeAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface RawEntry {
  id: string;
  requiredProperties: string[];
  optionalProperties?: string[];
  actions: string[];
  domainActions: string[];
  manifest: string;
  exposedModule: string;
  exposeAssets: RawExposeAssets;
}

interface RawExtension {
  id: string;
  domain: string;
  entry: string;
  presentation?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RawSchema {
  $id?: string;
  [key: string]: unknown;
}

interface RawManifest {
  id: string;
  name: string;
  remoteEntry: string;
  metaData: RawMetaData;
  shared: RawShared[];
  mfInitKey: string;
}

/** Enriched mfe.json shape produced by the frontx-mf-gts Vite plugin. */
interface RawEnrichedMfeJson {
  manifest: RawManifest;
  entries: RawEntry[];
  extensions: RawExtension[];
  schemas?: RawSchema[];
}

// ---------------------------------------------------------------------------
// Output shape types (mirror the SDK MfManifest / MfeEntryMF types; kept
// local so the script has no dependency on @cyberfabric packages at run time)
// ---------------------------------------------------------------------------

interface OutMfManifestShared {
  name: string;
  version: string;
  chunkPath: string;
  unwrapKey: string | null;
}

interface OutMfManifest {
  id: string;
  name: string;
  metaData: {
    name: string;
    type: string;
    buildInfo: { buildVersion: string; buildName: string };
    remoteEntry: { name: string; path: string; type: string };
    globalName: string;
    publicPath: string;
  };
  shared: OutMfManifestShared[];
}

interface OutMfManifestAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface OutMfeEntryMF {
  id: string;
  requiredProperties: string[];
  optionalProperties?: string[];
  actions: string[];
  domainActions: string[];
  manifest: string;
  exposedModule: string;
  exposeAssets: OutMfManifestAssets;
}

interface OutMfeManifestConfig {
  manifest: OutMfManifest;
  entries: OutMfeEntryMF[];
  extensions: RawExtension[];
  schemas?: RawSchema[];
}

// ---------------------------------------------------------------------------
// ManifestGenerator — class-based implementation
// ---------------------------------------------------------------------------

// @cpt-begin:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2:inst-1
class ManifestGenerator {
  private readonly mfePackagesDirs: string[];
  private readonly outputFile: string;
  private readonly globalBaseUrl: string | null;

  // Packages to skip (hidden dirs, non-MFE directories)
  private static readonly EXCLUDED = new Set(['.git', '.DS_Store']);

  constructor(
    mfePackagesDirs: string | string[],
    outputFile: string,
    globalBaseUrl: string | null
  ) {
    // Accept both legacy single-dir and new multi-dir forms for backwards compat.
    this.mfePackagesDirs = Array.isArray(mfePackagesDirs) ? mfePackagesDirs : [mfePackagesDirs];
    this.outputFile = outputFile;
    this.globalBaseUrl = globalBaseUrl;
  }

  run(): void {
    const discovered = this.discoverPackages();
    console.log(`Found ${discovered.length} MFE package(s):`);
    discovered.forEach(({ rootDir, name }) => console.log(`  - ${name} (in ${rootDir})`));

    const configs = discovered.map(({ rootDir, name }) => this.processPackage(rootDir, name));
    const output = this.renderOutputFile(configs);
    writeFileSync(this.outputFile, output, 'utf-8');
    console.log(`\nGenerated ${this.outputFile}`);
  }

  private discoverPackages(): Array<{ rootDir: string; name: string }> {
    const result: Array<{ rootDir: string; name: string }> = [];
    for (const mfePackagesDir of this.mfePackagesDirs) {
      if (!existsSync(mfePackagesDir)) continue;
      const entries = readdirSync(mfePackagesDir);
      for (const dir of entries) {
        if (ManifestGenerator.EXCLUDED.has(dir) || dir.startsWith('.')) continue;
        const pkgPath = join(mfePackagesDir, dir);
        if (existsSync(join(pkgPath, 'mfe.json'))) {
          result.push({ rootDir: mfePackagesDir, name: dir });
        }
      }
    }
    return result;
  }

  private processPackage(mfePackagesDir: string, packageDir: string): OutMfeManifestConfig {
    const pkgPath = join(mfePackagesDir, packageDir);

    const mfeJson = this.readEnrichedMfeJson(pkgPath, packageDir);
    const publicPath = this.resolvePublicPath(mfeJson, packageDir);

    const outManifest = this.buildManifest(mfeJson.manifest, publicPath);
    const outEntries = this.buildEntries(mfeJson.entries, outManifest.id, packageDir);

    return {
      manifest: outManifest,
      entries: outEntries,
      extensions: mfeJson.extensions,
      ...(mfeJson.schemas !== undefined && { schemas: mfeJson.schemas }),
    };
  }

  private readEnrichedMfeJson(pkgPath: string, packageDir: string): RawEnrichedMfeJson {
    const mfeJsonPath = join(pkgPath, 'mfe.json');
    if (!existsSync(mfeJsonPath)) {
      throw new Error(
        `[${packageDir}] mfe.json not found. ` +
          `Ensure the MFE package has an mfe.json file.`
      );
    }
    let mfeJson: RawEnrichedMfeJson;
    try {
      mfeJson = JSON.parse(readFileSync(mfeJsonPath, 'utf-8')) as RawEnrichedMfeJson;
    } catch (err) {
      throw new Error(`[${packageDir}] Cannot parse mfe.json: ${String(err)}`);
    }
    if (!mfeJson.manifest?.metaData) {
      throw new Error(
        `[${packageDir}] mfe.json is not enriched (missing manifest.metaData). ` +
          `Run 'vite build' for this MFE first (cd src/mfe_packages/${packageDir} && npm run build). ` +
          `Ensure the frontxMfGts plugin is configured in vite.config.ts.`
      );
    }
    return mfeJson;
  }

  /**
   * Resolve publicPath for this MFE.
   * Priority:
   *   1. --base-url CLI flag (global override for all packages)
   *   2. publicPath from enriched mfe.json manifest.metaData (set by plugin)
   *   3. Origin from mfe.json manifest.remoteEntry URL (per-package default)
   *   4. "/" as final fallback
   */
  private resolvePublicPath(
    mfeJson: RawEnrichedMfeJson,
    packageDir: string
  ): string {
    if (this.globalBaseUrl !== null) {
      return this.globalBaseUrl.endsWith('/')
        ? this.globalBaseUrl
        : `${this.globalBaseUrl}/`;
    }

    // Use publicPath from enriched manifest (set by the plugin from mf-manifest.json).
    const manifestPublicPath = mfeJson.manifest.metaData.publicPath;
    if (manifestPublicPath && manifestPublicPath !== '/') {
      return manifestPublicPath.endsWith('/')
        ? manifestPublicPath
        : `${manifestPublicPath}/`;
    }

    // Fall back to mfe.json manifest.remoteEntry origin.
    const remoteEntry = mfeJson.manifest.remoteEntry;
    if (remoteEntry) {
      try {
        const url = new URL(remoteEntry);
        return `${url.origin}/`;
      } catch {
        console.warn(
          `[${packageDir}] Cannot parse remoteEntry URL "${remoteEntry}", defaulting publicPath to "/"`
        );
      }
    }

    return '/';
  }

  private buildManifest(rawManifest: RawManifest, publicPath: string): OutMfManifest {
    return {
      id: rawManifest.id,
      name: rawManifest.name,
      metaData: {
        name: rawManifest.metaData.name,
        type: rawManifest.metaData.type,
        buildInfo: {
          buildVersion: rawManifest.metaData.buildInfo.buildVersion,
          buildName: rawManifest.metaData.buildInfo.buildName,
        },
        remoteEntry: {
          name: rawManifest.metaData.remoteEntry.name,
          path: rawManifest.metaData.remoteEntry.path,
          type: rawManifest.metaData.remoteEntry.type,
        },
        globalName: rawManifest.metaData.globalName,
        // Inject resolved publicPath — overrides the "/" placeholder from the build
        publicPath,
      },
      shared: rawManifest.shared.map((s) => ({
        name: s.name,
        version: s.version,
        chunkPath: s.chunkPath,
        unwrapKey: s.unwrapKey,
      })),
    };
  }

  private buildEntries(
    entries: RawEntry[],
    manifestId: string,
    packageDir: string
  ): OutMfeEntryMF[] {
    return entries.map((entry) => {
      if (!entry.exposeAssets) {
        throw new Error(
          `[${packageDir}] Entry "${entry.id}" has no exposeAssets. ` +
            `This usually means mfe.json was not enriched by the build plugin. ` +
            `Rebuild the MFE (cd src/mfe_packages/${packageDir} && npm run build).`
        );
      }

      const out: OutMfeEntryMF = {
        id: entry.id,
        requiredProperties: entry.requiredProperties,
        actions: entry.actions,
        domainActions: entry.domainActions,
        manifest: manifestId,
        exposedModule: entry.exposedModule,
        exposeAssets: {
          js: {
            async: entry.exposeAssets.js.async,
            sync: entry.exposeAssets.js.sync,
          },
          css: {
            async: entry.exposeAssets.css.async,
            sync: entry.exposeAssets.css.sync,
          },
        },
      };

      if (entry.optionalProperties !== undefined) {
        out.optionalProperties = entry.optionalProperties;
      }

      return out;
    });
  }

  private renderOutputFile(configs: OutMfeManifestConfig[]): string {
    return JSON.stringify(configs, null, 2) + '\n';
  }
}
// @cpt-end:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2:inst-1

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { baseUrl: string | null } {
  const idx = argv.indexOf('--base-url');
  const baseUrl = (idx !== -1 && idx + 1 < argv.length) ? argv[idx + 1] : null;
  return { baseUrl };
}

const { baseUrl } = parseArgs(process.argv.slice(2));

const MFE_PACKAGES_DIRS = getMfeRootsSync(process.cwd()).map((r) => join(process.cwd(), r));
const OUTPUT_FILE = join(process.cwd(), 'src/app/mfe/generated-mfe-manifests.json');

try {
  new ManifestGenerator(MFE_PACKAGES_DIRS, OUTPUT_FILE, baseUrl).run();
} catch (err) {
  console.error('Error generating MFE manifests:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
