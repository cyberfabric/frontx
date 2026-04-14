#!/usr/bin/env node

// @cpt-FEATURE:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2

/**
 * MFE Manifest Generation Script
 *
 * Reads the GTS manifest (mfe.gts-manifest.json) emitted by the frontx-mf-gts
 * Vite plugin for each MFE package and generates a TypeScript module consumed
 * by the host application's bootstrap.
 *
 * The GTS manifest already contains all required data:
 * - mfInitKey: extracted from remoteEntry.js at build time
 * - shared[].chunkPath / unwrapKey: extracted from localSharedImportMap
 * - entries[].exposeAssets: from mf-manifest.json exposes[]
 *
 * Pipeline per MFE package:
 *   1. Read dist/mfe.gts-manifest.json — full GTS manifest
 *   2. Inject resolved publicPath (overrides build-time placeholder)
 *   3. Map entries to MfeEntryMF shape with manifest reference and exposeAssets
 *
 * Usage:
 *   npx tsx scripts/generate-mfe-manifests.ts [--base-url <url>] [--shared-base-url <url>]
 *
 * When --base-url is omitted, publicPath is derived per-package from the
 * old manifest.remoteEntry field in mfe.json (e.g. "http://localhost:3001/").
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Raw JSON shape types (what we read from the GTS manifest on disk)
// ---------------------------------------------------------------------------

interface RawGtsManifestMetaData {
  name: string;
  type: string;
  buildInfo: { buildVersion: string; buildName: string };
  remoteEntry: { name: string; path: string; type: string };
  globalName: string;
  publicPath: string;
}

interface RawGtsShared {
  id: string;
  name: string;
  version: string;
  requiredVersion: string;
  chunkPath: string | null;
  unwrapKey: string | null;
}

interface RawGtsEntryExposeAssets {
  js: { async: string[]; sync: string[] };
  css: { async: string[]; sync: string[] };
}

interface RawGtsEntry {
  id: string;
  requiredProperties: string[];
  optionalProperties?: string[];
  actions: string[];
  domainActions: string[];
  manifest: string;
  exposedModule: string;
  exposeAssets: RawGtsEntryExposeAssets | null;
}

interface RawGtsExtension {
  id: string;
  domain: string;
  entry: string;
  presentation?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RawGtsSchema {
  $id?: string;
  [key: string]: unknown;
}

interface RawGtsManifest {
  id: string;
  name: string;
  metaData: RawGtsManifestMetaData;
  shared: RawGtsShared[];
  mfInitKey: string;
  entries: RawGtsEntry[];
  extensions: RawGtsExtension[];
  schemas?: RawGtsSchema[];
}

// Legacy mfe.json shape — used only to extract the base URL when --base-url
// is not provided and the GTS manifest has a placeholder publicPath.
interface RawMfeJson {
  manifest?: {
    id?: string;
    remoteEntry?: string;
  };
}

// ---------------------------------------------------------------------------
// Output shape types (mirror the SDK MfManifest / MfeEntryMF types; kept
// local so the script has no dependency on @cyberfabric packages at run time)
// ---------------------------------------------------------------------------

interface OutMfManifestShared {
  id: string;
  name: string;
  version: string;
  requiredVersion: string;
  chunkPath: string | null;
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
  mfInitKey: string;
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
  extensions: RawGtsExtension[];
  schemas?: RawGtsSchema[];
}

// ---------------------------------------------------------------------------
// ManifestGenerator — class-based implementation
// ---------------------------------------------------------------------------

// @cpt-begin:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2:inst-1
class ManifestGenerator {
  private readonly mfePackagesDir: string;
  private readonly outputFile: string;
  private readonly globalBaseUrl: string | null;
  private readonly sharedBaseUrl: string | null;

  // Packages to skip (hidden dirs, non-MFE directories)
  private static readonly EXCLUDED = new Set(['.git', '.DS_Store', 'shared']);

  constructor(
    mfePackagesDir: string,
    outputFile: string,
    globalBaseUrl: string | null,
    sharedBaseUrl: string | null
  ) {
    this.mfePackagesDir = mfePackagesDir;
    this.outputFile = outputFile;
    this.globalBaseUrl = globalBaseUrl;
    this.sharedBaseUrl = sharedBaseUrl;
  }

  run(): void {
    const packageDirs = this.discoverPackages();
    console.log(`Found ${packageDirs.length} MFE package(s):`);
    packageDirs.forEach((p) => console.log(`  - ${p}`));

    const configs = packageDirs.map((dir) => this.processPackage(dir));
    this.resolveSharedChunkPaths(configs);
    const output = this.renderOutputFile(configs);
    writeFileSync(this.outputFile, output, 'utf-8');
    console.log(`\nGenerated ${this.outputFile}`);
  }

  private discoverPackages(): string[] {
    return readdirSync(this.mfePackagesDir).filter((dir) => {
      if (ManifestGenerator.EXCLUDED.has(dir) || dir.startsWith('.')) {
        return false;
      }
      // Require either the GTS manifest or mfe.json to be present.
      const pkgPath = join(this.mfePackagesDir, dir);
      return (
        existsSync(join(pkgPath, 'dist', 'mfe.gts-manifest.json')) ||
        existsSync(join(pkgPath, 'mfe.json'))
      );
    });
  }

  private processPackage(packageDir: string): OutMfeManifestConfig {
    const pkgPath = join(this.mfePackagesDir, packageDir);

    const gtsManifest = this.readGtsManifest(pkgPath, packageDir);
    const publicPath = this.resolvePublicPath(pkgPath, gtsManifest, packageDir);

    const outManifest = this.buildManifest(gtsManifest, publicPath);
    const outEntries = this.buildEntries(gtsManifest, outManifest.id, packageDir);

    return {
      manifest: outManifest,
      entries: outEntries,
      extensions: gtsManifest.extensions,
      ...(gtsManifest.schemas !== undefined && { schemas: gtsManifest.schemas }),
    };
  }

  private readGtsManifest(pkgPath: string, packageDir: string): RawGtsManifest {
    const gtsPath = join(pkgPath, 'dist', 'mfe.gts-manifest.json');
    if (!existsSync(gtsPath)) {
      throw new Error(
        `[${packageDir}] dist/mfe.gts-manifest.json not found. ` +
          `Run 'vite build' for this MFE first (cd src/mfe_packages/${packageDir} && npm run build). ` +
          `Ensure the FrontxMfGtsPlugin is configured in vite.config.ts.`
      );
    }
    try {
      return JSON.parse(readFileSync(gtsPath, 'utf-8')) as RawGtsManifest;
    } catch (err) {
      throw new Error(`[${packageDir}] Cannot parse dist/mfe.gts-manifest.json: ${String(err)}`);
    }
  }

  /**
   * Resolve publicPath for this MFE.
   * Priority:
   *   1. --base-url CLI flag (global override for all packages)
   *   2. publicPath already set in the GTS manifest (non-placeholder value)
   *   3. Origin from mfe.json manifest.remoteEntry URL (per-package default)
   *   4. "/" as final fallback
   */
  private resolvePublicPath(
    pkgPath: string,
    gtsManifest: RawGtsManifest,
    packageDir: string
  ): string {
    if (this.globalBaseUrl !== null) {
      return this.globalBaseUrl.endsWith('/')
        ? this.globalBaseUrl
        : `${this.globalBaseUrl}/`;
    }

    // If the GTS manifest already has a real publicPath (not just "/"), use it.
    const manifestPublicPath = gtsManifest.metaData.publicPath;
    if (manifestPublicPath && manifestPublicPath !== '/') {
      return manifestPublicPath.endsWith('/')
        ? manifestPublicPath
        : `${manifestPublicPath}/`;
    }

    // Fall back to mfe.json manifest.remoteEntry origin.
    const mfeJsonPath = join(pkgPath, 'mfe.json');
    if (existsSync(mfeJsonPath)) {
      try {
        const mfeJson = JSON.parse(readFileSync(mfeJsonPath, 'utf-8')) as RawMfeJson;
        const remoteEntry = mfeJson.manifest?.remoteEntry;
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
      } catch {
        // mfe.json not parseable — fall through to "/"
      }
    }

    return '/';
  }

  private buildManifest(gtsManifest: RawGtsManifest, publicPath: string): OutMfManifest {
    return {
      id: gtsManifest.id,
      name: gtsManifest.name,
      metaData: {
        name: gtsManifest.metaData.name,
        type: gtsManifest.metaData.type,
        buildInfo: {
          buildVersion: gtsManifest.metaData.buildInfo.buildVersion,
          buildName: gtsManifest.metaData.buildInfo.buildName,
        },
        remoteEntry: {
          name: gtsManifest.metaData.remoteEntry.name,
          path: gtsManifest.metaData.remoteEntry.path,
          type: gtsManifest.metaData.remoteEntry.type,
        },
        globalName: gtsManifest.metaData.globalName,
        // Inject resolved publicPath — overrides the "/" placeholder from the build
        publicPath,
      },
      shared: gtsManifest.shared.map((s) => ({
        id: s.id,
        name: s.name,
        version: s.version,
        requiredVersion: s.requiredVersion,
        chunkPath: s.chunkPath,
        unwrapKey: s.unwrapKey,
      })),
      mfInitKey: gtsManifest.mfInitKey,
    };
  }

  private buildEntries(
    gtsManifest: RawGtsManifest,
    manifestId: string,
    packageDir: string
  ): OutMfeEntryMF[] {
    return gtsManifest.entries.map((entry) => {
      if (!entry.exposeAssets) {
        throw new Error(
          `[${packageDir}] Entry "${entry.id}" has no exposeAssets. ` +
            `This usually means the exposedModule "${entry.exposedModule}" was not found in mf-manifest.json. ` +
            `Rebuild the MFE (cd src/mfe_packages/${packageDir} && npm run build).`
        );
      }

      const enriched: OutMfeEntryMF = {
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
        enriched.optionalProperties = entry.optionalProperties;
      }

      return enriched;
    });
  }

  /**
   * Resolve portable shared dep chunkPaths to absolute URLs using a shared base.
   *
   * All MFEs that share the same dependency must resolve to the SAME absolute URL
   * so the handler's sourceTextCache deduplicates fetches. Portable chunks
   * (prefixed "portable/") are identical across MFE builds, so they can be
   * served from a single canonical location.
   *
   * Strategy: use --shared-base-url if provided; otherwise use the first MFE's
   * publicPath as the canonical source for portable chunks.
   */
  private resolveSharedChunkPaths(configs: OutMfeManifestConfig[]): void {
    if (configs.length === 0) return;

    const sharedBase = this.sharedBaseUrl
      ? (this.sharedBaseUrl.endsWith('/') ? this.sharedBaseUrl : `${this.sharedBaseUrl}/`)
      : configs[0].manifest.metaData.publicPath;

    let portableCount = 0;
    let externalCount = 0;
    for (const config of configs) {
      for (const shared of config.manifest.shared) {
        if (shared.chunkPath !== null && shared.chunkPath.startsWith('portable/')) {
          shared.chunkPath = sharedBase + shared.chunkPath;
          portableCount++;
        } else if (shared.chunkPath === null) {
          // Hybrid externalized dep: host-relative path ensures all MFEs
          // resolve to the same URL → sourceTextCache deduplicates fetches.
          const filename = ManifestGenerator.normalizeDepName(shared.name) + '.js';
          shared.chunkPath = '/shared/' + filename;
          externalCount++;
        }
      }
    }

    if (portableCount > 0) {
      console.log(`  Resolved ${portableCount} portable shared dep(s) to: ${sharedBase}`);
    }
    if (externalCount > 0) {
      console.log(`  Resolved ${externalCount} externalized shared dep(s) to: /shared/`);
    }
  }

  /**
   * Normalizes a package name for use as a filename.
   * @scope/pkg → scope-pkg, react-dom → react-dom
   * Mirrors SharedDepsBuilder.normalizeDepName convention.
   */
  private static normalizeDepName(name: string): string {
    return name.replace(/^@/, '').replace(/\//g, '-');
  }

  private renderOutputFile(configs: OutMfeManifestConfig[]): string {
    const serialized = JSON.stringify(configs, null, 2);

    return `// AUTO-GENERATED FILE
// Generated by: scripts/generate-mfe-manifests.ts
// Do not edit manually!
// Regenerate: npm run generate:mfe-manifests
//
// @cpt-FEATURE:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2

import type { MfManifest, MfeEntryMF, Extension, ScreenExtension, JSONSchema } from '@cyberfabric/react';

export interface MfeManifestConfig {
  // @cpt-FEATURE:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2
  /** MF2 package-level manifest (publicPath, remoteEntry, shared deps, mfInitKey). */
  manifest: MfManifest;
  entries: MfeEntryMF[];
  /**
   * Extensions from mfe.json. ScreenExtension is the concrete type for screen-domain
   * extensions. Extension is the base type accepted by screensetsRegistry.registerExtension().
   */
  extensions: (Extension | ScreenExtension)[];
  // @cpt-FEATURE:cpt-frontx-dod-screenset-registry-mfe-schema-registration:p1
  /** MFE-carried schemas (custom actions, properties). Registered before entries and extensions. */
  schemas?: JSONSchema[];
}

export const MFE_MANIFESTS: MfeManifestConfig[] = ${serialized};

// Get all MFE manifests
// Allows Vite to statically analyze imports without warnings
export function getMfeManifests(): MfeManifestConfig[] {
  return MFE_MANIFESTS;
}
`;
  }
}
// @cpt-end:cpt-frontx-dod-mfe-isolation-chunk-path-type:p2:inst-1

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { baseUrl: string | null; sharedBaseUrl: string | null } {
  const idx = argv.indexOf('--base-url');
  const baseUrl = (idx !== -1 && idx + 1 < argv.length) ? argv[idx + 1] : null;
  const sidx = argv.indexOf('--shared-base-url');
  const sharedBaseUrl = (sidx !== -1 && sidx + 1 < argv.length) ? argv[sidx + 1] : null;
  return { baseUrl, sharedBaseUrl };
}

const { baseUrl, sharedBaseUrl } = parseArgs(process.argv.slice(2));

const MFE_PACKAGES_DIR = join(process.cwd(), 'src/mfe_packages');
const OUTPUT_FILE = join(process.cwd(), 'src/app/mfe/generated-mfe-manifests.ts');

try {
  new ManifestGenerator(MFE_PACKAGES_DIR, OUTPUT_FILE, baseUrl, sharedBaseUrl).run();
} catch (err) {
  console.error('Error generating MFE manifests:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
