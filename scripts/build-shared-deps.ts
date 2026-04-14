#!/usr/bin/env node
// @cpt-algo:cpt-frontx-algo-mfe-isolation-build-standalone-esm:p1

/**
 * Shared Deps Build Script
 *
 * Builds each shared dependency as a standalone ESM module for use by the
 * MFE handler's bare-specifier rewriting mechanism. Each dep is bundled
 * independently via esbuild; transitive shared deps are externalized so the
 * handler can wire them together at runtime via blob URL rewriting.
 *
 * Dependency graph (auto-detected from package.json):
 *   - Leaf deps (react, @cyberfabric/screensets, etc.) → zero externals
 *   - Deps with transitive shared deps → those shared deps are external
 *
 * Usage:
 *   npx tsx scripts/build-shared-deps.ts [--outdir <path>]
 */

import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createRequire } from 'node:module';

// ── Types ────────────────────────────────────────────────────────────────────

interface PackageDeps {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface ResolvedDep {
  name: string;
  externals: string[];
}

// ── SharedDepsBuilder ────────────────────────────────────────────────────────

class SharedDepsBuilder {
  private readonly sharedDeps: string[];
  private readonly outputDir: string;
  private readonly projectRoot: string;

  constructor(sharedDeps: string[], outputDir: string, projectRoot: string) {
    this.sharedDeps = sharedDeps;
    this.outputDir = outputDir;
    this.projectRoot = projectRoot;
  }

  async build(): Promise<void> {
    mkdirSync(this.outputDir, { recursive: true });

    const resolved = this.resolveTransitiveDeps();

    for (const dep of resolved) {
      await this.buildEntry(dep);
    }
  }

  /**
   * For each shared dep, inspect its package.json dependencies and
   * peerDependencies. Any dep that is ALSO in the shared dep list
   * becomes an external for that dep's build.
   */
  private resolveTransitiveDeps(): ResolvedDep[] {
    const sharedSet = new Set(this.sharedDeps);
    return this.sharedDeps.map((name) => {
      const pkgPath = join(
        this.projectRoot,
        'node_modules',
        name,
        'package.json'
      );
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageDeps;
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.peerDependencies ?? {}),
      };
      const externals = Object.keys(allDeps).filter((d) => sharedSet.has(d));
      return { name, externals };
    });
  }

  private async buildEntry(dep: ResolvedDep): Promise<void> {
    const outfile = join(
      this.outputDir,
      SharedDepsBuilder.normalizeDepName(dep.name) + '.js'
    );

    const plugins: esbuild.Plugin[] = [];
    if (dep.externals.length > 0) {
      plugins.push(
        SharedDepsBuilder.createExternalsPlugin(dep.externals)
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
      SharedDepsBuilder.patchCjsExternals(outfile, dep.externals);
    }

    // CJS packages bundled to ESM only get `export default ...`. Add named
    // re-exports so `import { createContext } from "react"` works in blob URLs.
    SharedDepsBuilder.patchCjsNamedExports(outfile, dep.name, this.projectRoot);

    const label =
      dep.externals.length > 0
        ? `(external: ${dep.externals.join(', ')})`
        : '(standalone)';
    console.log(`  ${dep.name} -> ${basename(outfile)} ${label}`);
  }

  /**
   * esbuild plugin that externalizes exact package name imports only.
   *
   * Sub-path imports (e.g. 'react/jsx-runtime', '@cyberfabric/screensets/mfe/handler')
   * are NOT externalized — they are bundled inline. Their internal imports of the
   * parent package remain external via the exact match, so the handler can still
   * rewrite those bare specifiers to blob URLs at runtime.
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
   * When esbuild bundles a CJS package (e.g. react-dom) to ESM format with
   * external deps, it generates `__require("react")` calls instead of ESM
   * imports. The `__require` shim throws in browser ES module context because
   * `require` is not available.
   *
   * This method:
   * 1. Detects `__require("dep")` calls for each external
   * 2. Adds `import __ext_dep from "dep"` at the top (default import = CJS module.exports)
   * 3. Replaces `__require("dep")` with `__ext_dep`
   *
   * Only modifies files that actually contain __require calls for externals.
   */
  private static patchCjsExternals(outfile: string, externals: string[]): void {
    let source = readFileSync(outfile, 'utf-8');

    const importLines: string[] = [];
    let patched = false;

    for (const ext of externals) {
      const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const requirePattern = new RegExp(
        `__require\\(["']${escaped}["']\\)`,
        'g'
      );

      if (!requirePattern.test(source)) continue;

      // Reset lastIndex after test()
      requirePattern.lastIndex = 0;

      const varName = '__ext_' + ext.replace(/[^a-zA-Z0-9_]/g, '_');
      importLines.push(`import ${varName} from "${ext}";`);
      source = source.replace(requirePattern, varName);
      patched = true;
    }

    if (patched) {
      source = importLines.join('\n') + '\n' + source;
      writeFileSync(outfile, source, 'utf-8');
    }
  }

  /**
   * Post-processes esbuild output to add named re-exports for CJS packages.
   *
   * esbuild wraps CJS packages with `export default require_xxx()` which
   * only provides a default export. Named imports like
   * `import { createContext } from "react"` fail at runtime in blob URLs.
   *
   * This detects default-only exports, loads the package to discover named
   * properties, and appends `export var { p1, p2, ... } = __default;`.
   */
  private static patchCjsNamedExports(
    outfile: string,
    packageName: string,
    projectRoot: string
  ): void {
    let source = readFileSync(outfile, 'utf-8');

    // Only patch if the module is a CJS-wrapped default-only export
    const defaultMatch = source.match(/^export default (.+);$/m);
    if (!defaultMatch) return;

    // Skip if named exports already exist
    if (/^export \{/m.test(source)) return;

    // Load the package at build time to discover its named exports
    const nodeRequire = createRequire(join(projectRoot, 'package.json'));
    let mod: Record<string, unknown>;
    try {
      mod = nodeRequire(packageName) as Record<string, unknown>;
    } catch {
      return; // Package can't be loaded — skip
    }

    const keys = Object.keys(mod).filter(
      (k) => k !== 'default' && k !== '__esModule' && /^[a-zA-Z_$]/.test(k)
    );
    if (keys.length === 0) return;

    // Replace `export default <expr>;` with variable + named re-exports
    const expr = defaultMatch[1];
    const replacement = [
      `var __mod_default = ${expr};`,
      `export default __mod_default;`,
      `export var { ${keys.join(', ')} } = __mod_default;`,
    ].join('\n');

    source = source.replace(defaultMatch[0], replacement);
    writeFileSync(outfile, source, 'utf-8');
  }

  /**
   * Normalizes a package name for use as a filename.
   * @scope/pkg -> scope-pkg, react-dom -> react-dom
   */
  static normalizeDepName(name: string): string {
    return name.replace(/^@/, '').replace(/\//g, '-');
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();

const outdirIdx = process.argv.indexOf('--outdir');
const OUTPUT_DIR =
  outdirIdx !== -1 && outdirIdx + 1 < process.argv.length
    ? process.argv[outdirIdx + 1]!
    : join(PROJECT_ROOT, 'public', 'shared');

// Canonical shared dep list — must match mfe.json sharedDependencies and
// the sharedDeps array in MFE vite.config.ts files.
const SHARED_DEPS = [
  'react',
  'react-dom',
  '@cyberfabric/react',
  '@cyberfabric/framework',
  '@cyberfabric/state',
  '@cyberfabric/screensets',
  '@cyberfabric/api',
  '@cyberfabric/i18n',
  '@reduxjs/toolkit',
  'react-redux',
];

console.log('Building shared deps as standalone ESM...\n');

try {
  await new SharedDepsBuilder(SHARED_DEPS, OUTPUT_DIR, PROJECT_ROOT).build();
  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\nError building shared deps:', message);
  process.exit(1);
}
