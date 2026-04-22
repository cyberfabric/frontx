// @cpt-FEATURE:frontx-mf-gts-plugin:p1
// @cpt-dod:cpt-frontx-dod-mfe-isolation-mf-vite-plugin:p1
// @cpt-flow:cpt-frontx-flow-mfe-isolation-build-v2:p2
import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Extract the root npm package name from a shared-dep entry that may include
 * a subpath. Handles scoped packages:
 *   'react-dom/client'        → 'react-dom'
 *   '@cyberfabric/react/hooks' → '@cyberfabric/react'
 *   'react'                   → 'react'
 */
function extractRootPackageName(name: string): string {
  if (name.startsWith('@')) {
    const parts = name.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : name;
  }
  const firstSlash = name.indexOf('/');
  return firstSlash === -1 ? name : name.slice(0, firstSlash);
}

/**
 * Locates a shared dep's `package.json` across npm / pnpm / yarn-pnp
 * layouts. Tries `nodeRequire.resolve('${rootName}/package.json')` first
 * (honors each package manager's resolver) and falls back to a manual
 * walk up `node_modules` directories when the package's `exports` field
 * blocks subpath access to `package.json`.
 *
 * Returns `undefined` when the package cannot be located either way —
 * callers decide whether to throw with a specific error message.
 */
function resolvePackageJsonPath(
  nodeRequire: NodeRequire,
  startDir: string,
  rootName: string
): string | undefined {
  try {
    return nodeRequire.resolve(`${rootName}/package.json`);
  } catch {
    // Fall through — some packages' `exports` block subpath access.
  }
  let current = startDir;
  for (;;) {
    const candidate = path.join(current, 'node_modules', rootName, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

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
  manifest: MfeJsonManifest;
  entries: MfeJsonEntry[];
  extensions: MfeJsonExtension[];
  schemas: MfeJsonSchema[];
}

// ── Types for enriched mfe.json fields ──────────────────────────────────────

interface EnrichedMetaData {
  publicPath: string;
  name: string;
  type: string;
  buildInfo: { buildVersion: string; buildName: string };
  remoteEntry: { name: string; path: string; type: string };
  globalName: string;
}

interface EnrichedSharedEntry {
  name: string;
  version: string;
  chunkPath: string;
  unwrapKey: string | null;
}

type EnrichedManifest = MfeJsonManifest & {
  name: string;
  metaData: EnrichedMetaData;
  shared: EnrichedSharedEntry[];
};

type EnrichedMfeJsonEntry = MfeJsonEntry & {
  exposeAssets: MfManifestExposeAssets;
};

type EnrichedMfeJson = Omit<MfeJson, 'manifest' | 'entries'> & {
  manifest: EnrichedManifest;
  entries: EnrichedMfeJsonEntry[];
};

// ── mfe.json enricher ───────────────────────────────────────────────────────
// @cpt-algo:cpt-frontx-algo-mfe-isolation-enrich-mfe-json:p1

class MfeJsonEnricher {
  private readonly packageRoot: string;
  private readonly nodeRequire: NodeRequire;

  constructor(packageRoot: string) {
    this.packageRoot = packageRoot;
    this.nodeRequire = createRequire(path.join(packageRoot, 'package.json'));
  }

  enrich(
    mfeJson: MfeJson,
    mfManifest: MfManifest,
    sharedDeps: string[]
  ): EnrichedMfeJson {
    const metaData = this.buildMetaData(mfManifest);
    const shared = this.buildSharedEntries(sharedDeps);
    const entries = this.buildEntries(mfeJson.entries, mfManifest.exposes);

    return {
      ...mfeJson,
      manifest: {
        ...mfeJson.manifest,
        name: mfManifest.metaData.name,
        metaData,
        shared,
      },
      entries,
    };
  }

  private buildMetaData(mfManifest: MfManifest): EnrichedMetaData {
    return {
      publicPath: mfManifest.metaData.publicPath,
      name: mfManifest.metaData.name,
      type: mfManifest.metaData.type,
      buildInfo: mfManifest.metaData.buildInfo,
      remoteEntry: mfManifest.metaData.remoteEntry,
      globalName: mfManifest.metaData.globalName,
    };
  }

  private buildSharedEntries(
    declaredDeps: string[]
  ): EnrichedSharedEntry[] {
    return declaredDeps.map((name) => ({
      name,
      version: this.resolvePackageVersion(name),
      chunkPath: `shared/${StandaloneEsmBuilder.normalizeDepName(name)}.js`,
      unwrapKey: null,
    }));
  }

  /**
   * Resolves the installed version of a package by locating its
   * `package.json`. Accepts subpath entries like `react-dom/client` and
   * resolves the version from the parent package's `package.json`.
   *
   * Tries `nodeRequire.resolve(\`${rootName}/package.json\`)` first so the
   * lookup works across npm, pnpm, and yarn-pnp layouts; falls back to a
   * manual `node_modules` walk when the package's `exports` field blocks
   * the subpath.
   */
  private resolvePackageVersion(packageName: string): string {
    const rootName = extractRootPackageName(packageName);
    const pkgJsonPath = resolvePackageJsonPath(
      this.nodeRequire,
      this.packageRoot,
      rootName
    );
    if (!pkgJsonPath) {
      throw new Error(
        `Cannot resolve version for "${packageName}" (root package "${rootName}") from ${this.packageRoot}`
      );
    }
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
      version?: string;
    };
    return pkg.version ?? '*';
  }

  private buildEntries(
    mfeEntries: MfeJsonEntry[],
    mfExposes: MfManifestExpose[]
  ): EnrichedMfeJsonEntry[] {
    const exposesIndex = new Map<string, MfManifestExpose>();
    for (const expose of mfExposes) {
      exposesIndex.set(expose.path, expose);
    }

    return mfeEntries.map((entry) => {
      const expose = exposesIndex.get(entry.exposedModule);
      if (!expose) {
        throw new Error(
          `[frontx-mf-gts] No expose in mf-manifest.json matches ` +
            `entry exposedModule "${entry.exposedModule}"`
        );
      }
      return {
        ...entry,
        exposeAssets: expose.assets,
      };
    });
  }
}

// ── Standalone ESM builder ──────────────────────────────────────────────────
// @cpt-algo:cpt-frontx-algo-mfe-isolation-build-standalone-esm:p1

interface SharedDepPackageJson {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface ResolvedSharedDep {
  name: string;
  externals: string[];
}

class StandaloneEsmBuilder {
  private readonly sharedDeps: string[];
  private readonly outputDir: string;
  private readonly packageRoot: string;
  private readonly nodeRequire: NodeRequire;

  constructor(sharedDeps: string[], outputDir: string, packageRoot: string) {
    this.sharedDeps = sharedDeps;
    this.outputDir = outputDir;
    this.packageRoot = packageRoot;
    this.nodeRequire = createRequire(path.join(packageRoot, 'package.json'));
  }

  async build(): Promise<void> {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const resolved = this.resolveTransitiveDeps();

    for (const dep of resolved) {
      await this.buildEntry(dep);
    }
  }

  /**
   * For each shared dep, inspect its package.json dependencies and
   * peerDependencies. Any dep that is ALSO in the shared dep list
   * becomes an external for that dep's build.
   *
   * For subpath entries (e.g. `react-dom/client`) whose parent package
   * is also a declared shared dep, the parent is added to externals so
   * that internal `import 'react-dom'` references inside the subpath
   * bundle resolve to the shared parent blob URL at runtime.
   */
  private resolveTransitiveDeps(): ResolvedSharedDep[] {
    const sharedSet = new Set(this.sharedDeps);
    return this.sharedDeps.map((name) => {
      const pkgJsonPath = this.findPackageJsonPath(name);
      const pkg = JSON.parse(
        fs.readFileSync(pkgJsonPath, 'utf-8')
      ) as SharedDepPackageJson;
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.peerDependencies,
      };
      const transitiveExternals = Object.keys(allDeps).filter((d) =>
        sharedSet.has(d)
      );

      const rootName = extractRootPackageName(name);
      const isSubpath = rootName !== name;
      const externals =
        isSubpath && sharedSet.has(rootName)
          ? Array.from(new Set([rootName, ...transitiveExternals]))
          : transitiveExternals;

      return { name, externals };
    });
  }

  /**
   * Locates the `package.json` of a shared dep. Accepts subpath entries
   * like `react-dom/client` and resolves the parent package's
   * `package.json`.
   *
   * Tries `nodeRequire.resolve(\`${rootName}/package.json\`)` first so the
   * lookup works across npm, pnpm, and yarn-pnp layouts; falls back to a
   * manual `node_modules` walk when the package's `exports` field blocks
   * the subpath.
   */
  private findPackageJsonPath(packageName: string): string {
    const rootName = extractRootPackageName(packageName);
    const pkgJsonPath = resolvePackageJsonPath(
      this.nodeRequire,
      this.packageRoot,
      rootName
    );
    if (!pkgJsonPath) {
      throw new Error(
        `Cannot find package.json for "${packageName}" (root package "${rootName}") from ${this.packageRoot}`
      );
    }
    return pkgJsonPath;
  }

  private async buildEntry(dep: ResolvedSharedDep): Promise<void> {
    const outfile = path.join(
      this.outputDir,
      StandaloneEsmBuilder.normalizeDepName(dep.name) + '.js'
    );

    const plugins: esbuild.Plugin[] = [];
    if (dep.externals.length > 0) {
      plugins.push(
        StandaloneEsmBuilder.createExternalsPlugin(dep.externals)
      );
    }

    await esbuild.build({
      entryPoints: [dep.name],
      bundle: true,
      format: 'esm',
      outfile,
      plugins,
      platform: 'browser',
      target: 'esnext',
      logLevel: 'warning',
      // Use production builds for CJS packages (react, react-dom).
      // MFE expose chunks are production builds; mismatched dev/prod
      // react internals cause `dispatcher.getOwner is not a function`.
      define: { 'process.env.NODE_ENV': '"production"' },
    });

    // CJS packages bundled to ESM use __require() for external deps, which
    // doesn't work in browser ES module context. Post-process to replace
    // __require("dep") with proper ESM imports.
    if (dep.externals.length > 0) {
      StandaloneEsmBuilder.patchCjsExternals(outfile, dep.externals);
    }

    // CJS packages bundled to ESM only get `export default ...`. Add named
    // re-exports so `import { createContext } from "react"` works in blob URLs.
    this.patchCjsNamedExports(outfile, dep.name);

    const label =
      dep.externals.length > 0
        ? `(external: ${dep.externals.join(', ')})`
        : '(standalone)';
    console.log(
      `  [frontx-mf-gts] ${dep.name} -> ${path.basename(outfile)} ${label}`
    );
  }

  /**
   * esbuild plugin that externalizes exact package name imports only.
   *
   * Sub-path imports (e.g. 'react/jsx-runtime') are NOT externalized — they
   * are bundled inline. Their internal imports of the parent package remain
   * external via the exact match.
   */
  private static createExternalsPlugin(
    externals: string[]
  ): esbuild.Plugin {
    const externalSet = new Set(externals);

    return {
      name: 'externalize-shared-deps',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          if (args.path.startsWith('.') || args.path.startsWith('/')) {
            return null;
          }
          if (externalSet.has(args.path)) {
            return { path: args.path, external: true };
          }
          return null;
        });
      },
    };
  }

  /**
   * Post-processes esbuild output to fix CJS→ESM external references.
   *
   * When esbuild bundles a CJS package to ESM format with external deps,
   * it generates `__require("react")` calls. This replaces them with ESM
   * imports.
   */
  private static patchCjsExternals(
    outfile: string,
    externals: string[]
  ): void {
    let source = fs.readFileSync(outfile, 'utf-8');

    const importLines: string[] = [];
    let patched = false;

    for (const ext of externals) {
      const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      const requirePattern = new RegExp(
        String.raw`__require\(["']${escaped}["']\)`,
        'g'
      );

      if (!requirePattern.test(source)) continue;

      // Reset lastIndex after test()
      requirePattern.lastIndex = 0;

      const varName = '__ext_' + ext.replace(/\W/g, '_');
      importLines.push(`import ${varName} from "${ext}";`);
      source = source.replace(requirePattern, varName);
      patched = true;
    }

    if (patched) {
      source = importLines.join('\n') + '\n' + source;
      fs.writeFileSync(outfile, source, 'utf-8');
    }
  }

  /**
   * Post-processes esbuild output to add named re-exports for CJS packages.
   *
   * esbuild wraps CJS packages with `export default require_xxx()` which
   * only provides a default export. This detects default-only exports, loads
   * the package to discover named properties, and appends named re-exports.
   */
  private patchCjsNamedExports(
    outfile: string,
    packageName: string
  ): void {
    let source = fs.readFileSync(outfile, 'utf-8');

    // Only patch if the module is a CJS-wrapped default-only export
    const defaultMatch = source.match(/^export default (.+);$/m);
    if (!defaultMatch) return;

    // Skip if named exports already exist
    if (/^export \{/m.test(source)) return;

    // Load the package at build time to discover its named exports.
    // Node's `require()` throws `ERR_REQUIRE_ESM` on ESM-only packages and
    // may throw for packages with environment-gated (Node-vs-browser)
    // export conditions — warn so silent patch-skipping is visible.
    let mod: Record<string, unknown>;
    try {
      mod = this.nodeRequire(packageName) as Record<string, unknown>;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[frontx-mf-gts] named-export patching skipped for "${packageName}": ` +
          `${reason}. Default-only export will be used in the standalone ESM; ` +
          `consumers that import named symbols may fail at runtime.`
      );
      return;
    }

    const keys = Object.keys(mod).filter(
      (k) =>
        k !== 'default' &&
        k !== '__esModule' &&
        /^[A-Za-z_$][\w$]*$/u.test(k)
    );
    if (keys.length === 0) {
      console.warn(
        `[frontx-mf-gts] named-export patching produced no keys for "${packageName}" — ` +
          `the package's require() result exposes no valid named bindings. ` +
          `If consumers import named symbols, this will fail at runtime.`
      );
      return;
    }

    // Replace `export default <expr>;` with variable + named re-exports
    const expr = defaultMatch[1];
    const replacement = [
      `var __mod_default = ${expr};`,
      `export default __mod_default;`,
      `export var { ${keys.join(', ')} } = __mod_default;`,
    ].join('\n');

    source = source.replace(defaultMatch[0], replacement);
    fs.writeFileSync(outfile, source, 'utf-8');
  }

  /**
   * Normalizes a package name for use as a filename.
   * @scope/pkg -> scope-pkg, react-dom -> react-dom
   */
  static normalizeDepName(name: string): string {
    return name.replace(/^@/, '').replace(/\//g, '-');
  }
}

// ── Plugin class ─────────────────────────────────────────────────────────────

// @cpt-begin:frontx-mf-gts-plugin:p1:inst-1

/**
 * Creates the frontx-mf-gts Vite plugin.
 *
 * Runs in `closeBundle` after `@module-federation/vite`. Builds standalone
 * ESM modules for shared deps and enriches `mfe.json` in-place with manifest
 * metadata, shared dep info, and per-entry expose assets.
 *
 * The package root is resolved from Vite's `config.root` — no `__dirname`
 * argument needed.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { frontxMfGts } from '@cyberfabric/screensets/build/mf-gts';
 *
 * export default defineConfig({
 *   plugins: [react(), federation({ ... }), frontxMfGts()],
 * });
 * ```
 */
export function frontxMfGts(): Plugin {
  let packageRoot = '';
  let resolvedExternals: string[] = [];

  return {
    name: 'frontx-mf-gts',
    // Run after all other plugins, including @module-federation/vite, so
    // that dist/mf-manifest.json is already on disk.
    enforce: 'post',

    configResolved(config) {
      packageRoot = config.root;
      // Derive shared deps from rollupOptions.external so they stay in sync
      // with what the build actually externalizes. Sub-path imports and
      // function-form externals are not supported here — the handler
      // runtime only rewrites exact bare specifiers anyway.
      const ext = config.build?.rollupOptions?.external;
      if (Array.isArray(ext)) {
        resolvedExternals = ext.filter(
          (e): e is string => typeof e === 'string'
        );
      } else {
        if (ext !== undefined) {
          console.warn(
            '[frontx-mf-gts] rollupOptions.external is not a string[]; ' +
              'no shared deps will be derived for auto-sharing.'
          );
        }
        resolvedExternals = [];
      }
    },

    async closeBundle() {
      const distDir = path.join(packageRoot, 'dist');
      const mfeJsonPath = path.join(packageRoot, 'mfe.json');

        // ── Read inputs ─────────────────────────────────────────────────────

        const mfeJson = JSON.parse(
          fs.readFileSync(mfeJsonPath, 'utf-8')
        ) as MfeJson;

        const mfManifest = JSON.parse(
          fs.readFileSync(path.join(distDir, 'mf-manifest.json'), 'utf-8')
        ) as MfManifest;

        // With shared:{}, the MF 2.0 build no longer produces:
        //   - localSharedImportMap (no shared dep chunks)
        //   - __mf_init__ keys (no FederationHost initialization)
        //   - shared dep proxy/library chunks
        // The plugin only needs mf-manifest.json for expose asset paths.

        // ── Build standalone ESMs for shared deps ───────────────────────────

        const sharedDeps = resolvedExternals;
        if (sharedDeps.length > 0) {
          const sharedOutputDir = path.join(distDir, 'shared');
          const esmBuilder = new StandaloneEsmBuilder(
            sharedDeps,
            sharedOutputDir,
            packageRoot
          );
          console.log(
            '[frontx-mf-gts] Building shared deps as standalone ESM...'
          );
          await esmBuilder.build();
          console.log('[frontx-mf-gts] Shared deps build complete.');
        }

        // ── Enrich mfe.json in-place ────────────────────────────────────────

        const enricher = new MfeJsonEnricher(packageRoot);
        const enrichedMfeJson = enricher.enrich(mfeJson, mfManifest, sharedDeps);

        fs.writeFileSync(
          mfeJsonPath,
          JSON.stringify(enrichedMfeJson, null, 2) + '\n',
          'utf-8'
        );

        console.log(`[frontx-mf-gts] enriched ${mfeJsonPath}`);
      },
    };
}
// @cpt-end:frontx-mf-gts-plugin:p1:inst-1
