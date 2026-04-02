import fs from 'fs-extra';
import path from 'path';
import type { Hai3Config, PackageManager } from './types.js';
import { resolvePathUnderProjectRoot } from '../utils/project.js';

// @cpt-algo:cpt-frontx-algo-cli-tooling-package-manager-policy:p1
export const SUPPORTED_PACKAGE_MANAGERS: PackageManager[] = ['npm', 'pnpm', 'yarn'];
export const DEFAULT_PACKAGE_MANAGER: PackageManager = 'npm';

/**
 * Workspace globs for generated standalone apps. Each MFE under `src/mfe_packages/<name>-mfe/`
 * has its own package.json; Yarn 4 requires those paths to be listed so `yarn <script>` works
 * when the current working directory is that package (CLI e2e and local workflows).
 */
export const STANDALONE_APP_WORKSPACES: readonly string[] = [
  'eslint-plugin-local',
  'src/mfe_packages/*',
];

interface PackageManagerPolicy {
  /**
   * Default exact PM version written to package.json.packageManager.
   */
  defaultVersion: string;
  /**
   * Minimum supported PM range written to package.json.engines.
   */
  minEngine: string;
}

export const PACKAGE_MANAGER_POLICY: Record<PackageManager, PackageManagerPolicy> = {
  npm: {
    defaultVersion: '11.0.0',
    minEngine: '>=10.0.0',
  },
  pnpm: {
    defaultVersion: '10.0.0',
    minEngine: '>=10.0.0',
  },
  yarn: {
    defaultVersion: '4.0.0',
    minEngine: '>=4.0.0',
  },
};

export interface PackageManagerContext {
  manager: PackageManager;
  version?: string;
  linkerMode?: 'node-modules' | 'pnp';
}

export function isSupportedPackageManager(value: unknown): value is PackageManager {
  return typeof value === 'string' && SUPPORTED_PACKAGE_MANAGERS.includes(value as PackageManager);
}

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-parse-package-manager-field
export function parsePackageManagerField(value: string | undefined): PackageManagerContext | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const managerId = value.split('@')[0];
  if (!isSupportedPackageManager(managerId)) {
    return null;
  }
  const atIndex = value.indexOf('@');
  const version = atIndex > -1 ? value.slice(atIndex + 1) : undefined;
  return {
    manager: managerId,
    version,
  };
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-parse-package-manager-field

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-field
export function packageManagerFieldValue(
  manager: PackageManager,
  version: string = PACKAGE_MANAGER_POLICY[manager].defaultVersion
): string {
  return `${manager}@${version}`;
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-field

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-engines
export function getPackageManagerEngineRange(manager: PackageManager): string {
  return PACKAGE_MANAGER_POLICY[manager].minEngine;
}

export function getPackageManagerEngines(
  manager: PackageManager,
  nodeRange: string
): Record<string, string> {
  return {
    node: nodeRange,
    [manager]: getPackageManagerEngineRange(manager),
  };
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-engines

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-detect-package-manager
export async function detectPackageManager(
  projectRoot: string,
  config?: Hai3Config | null
): Promise<PackageManagerContext> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let packageJsonContext: PackageManagerContext | null = null;

  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJsonContext = parsePackageManagerField(packageJson.packageManager);
    } catch {
      // Fall through to other sources.
    }
  }

  if (config?.packageManager && isSupportedPackageManager(config.packageManager)) {
    return {
      manager: config.packageManager,
      version:
        config.packageManagerVersion ??
        (packageJsonContext?.manager === config.packageManager
          ? packageJsonContext.version
          : undefined),
      linkerMode: config.linkerMode,
    };
  }

  if (packageJsonContext) {
    return packageJsonContext;
  }

  return { manager: DEFAULT_PACKAGE_MANAGER };
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-detect-package-manager

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-commands
export function getInstallCommand(manager: PackageManager): string {
  if (manager === 'yarn') {
    return 'yarn install';
  }
  return `${manager} install`;
}

export function getCiInstallCommand(manager: PackageManager): string {
  if (manager === 'pnpm') {
    return 'pnpm install --frozen-lockfile';
  }
  if (manager === 'yarn') {
    return 'yarn install --immutable';
  }
  return 'npm ci';
}

export function getRunScriptCommand(manager: PackageManager, scriptName: string): string {
  if (manager === 'yarn') {
    return `yarn ${scriptName}`;
  }
  return `${manager} run ${scriptName}`;
}

export type ResolveUnitTestConventionResult =
  | { ok: true; command: string; packageManager: PackageManager }
  | { ok: false; error: string };

/**
 * Resolve the FrontX Vitest / test:unit convention for a project root.
 */
// @cpt-dod:cpt-frontx-dod-unit-test-generation-and-agent-verification-standard-test-convention:p1
// @cpt-algo:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1
export async function resolveFrontxUnitTestConvention(
  projectRoot: string,
  config?: Hai3Config | null
): Promise<ResolveUnitTestConventionResult> {
  // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-read-frontx-config
  const packageJsonPath = resolvePathUnderProjectRoot(projectRoot, 'package.json');
  const packageJsonExists = await fs.pathExists(packageJsonPath);
  let packageJson: { scripts?: Record<string, string> } = {};
  let packageJsonReadable = false;

  if (packageJsonExists) {
    try {
      packageJson = await fs.readJson(packageJsonPath);
      packageJsonReadable = true;
    } catch {
      packageJsonReadable = false;
    }
  }

  const packageManagerCtx = await detectPackageManager(projectRoot, config);
  const packageManager = packageManagerCtx.manager;

  // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-read-frontx-config

  // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-fallback-default
  const command = getRunScriptCommand(packageManager, 'test:unit');
  // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-fallback-default

  // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-extract-command
  const script = packageJson.scripts?.['test:unit'];
  const scriptOk =
    packageJsonExists &&
    packageJsonReadable &&
    typeof script === 'string' &&
    script.trim().length > 0;
  // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-extract-command

  if (!packageJsonExists || !packageJsonReadable || !scriptOk) {
    // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-return-config-error
    let error: string;
    if (packageJsonExists) {
      if (packageJsonReadable) {
        error =
          'package.json must expose a non-empty scripts.test:unit entry for the FrontX Vitest scaffold convention.';
      } else {
        error = 'Unable to read package.json — cannot resolve the FrontX unit-test convention.';
      }
    } else {
      error =
        'Missing package.json — cannot resolve the FrontX unit-test convention for this project.';
    }
    return { ok: false, error };
    // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-return-config-error
  }

  // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-return-normalized-config
  return { ok: true, command, packageManager };
  // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-test-convention:p1:inst-return-normalized-config
}

export function getWorkspaceRunScriptCommand(
  manager: PackageManager,
  workspaceName: string,
  scriptName: string
): string {
  if (manager === 'pnpm') {
    return `pnpm --filter ${workspaceName} run ${scriptName}`;
  }
  if (manager === 'yarn') {
    return `yarn workspace ${workspaceName} run ${scriptName}`;
  }
  return `npm run ${scriptName} --workspace=${workspaceName}`;
}

export function getExecCommand(manager: PackageManager, command: string): string {
  if (manager === 'npm') {
    return `npm exec -- ${command}`;
  }
  return `${manager} exec ${command}`;
}

export function getAddPackagesCommand(
  manager: PackageManager,
  packages: string[],
  options?: { dev?: boolean }
): string {
  const pkgList = packages.join(' ');
  if (manager === 'npm') {
    return options?.dev ? `npm install -D ${pkgList}` : `npm install ${pkgList}`;
  }
  if (manager === 'pnpm') {
    return options?.dev ? `pnpm add -D ${pkgList}` : `pnpm add ${pkgList}`;
  }
  return options?.dev ? `yarn add -D ${pkgList}` : `yarn add ${pkgList}`;
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-commands

export function getGlobalInstallCommand(manager: PackageManager, target: string): string | null {
  if (manager === 'npm') {
    return `npm install -g ${target}`;
  }
  if (manager === 'pnpm') {
    return `pnpm add -g ${target}`;
  }
  return null;
}

// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-workspace-files
export function getManagerWorkspaceFiles(manager: PackageManager): Array<{ path: string; content: string }> {
  if (manager === 'pnpm') {
    const lines = ['packages:', ...STANDALONE_APP_WORKSPACES.map((w) => `  - ${w}`)];
    return [
      {
        path: 'pnpm-workspace.yaml',
        content: `${lines.join('\n')}\n`,
      },
    ];
  }
  if (manager === 'yarn') {
    return [
      {
        path: '.yarnrc.yml',
        content: 'nodeLinker: node-modules\n',
      },
    ];
  }
  return [];
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-build-package-manager-workspace-files

/**
 * Transform npm-focused command snippets to the configured package manager.
 * This is intentionally string-based so it can be used for docs, templates and comments.
 */
// @cpt-begin:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-transform-package-manager-text
export function transformPackageManagerText(content: string, manager: PackageManager): string {
  if (manager === 'npm') {
    return content;
  }

  let transformed = content;

  transformed = transformed.replace(
    /\bnpm run ([\w:-]+)\s+--workspace=([@/\w.-]+)/g,
    (_match, scriptName: string, workspaceName: string) =>
      getWorkspaceRunScriptCommand(manager, workspaceName, scriptName)
  );

  transformed = transformed.replace(
    /\bnpm run ([\w:-]+)/g,
    (_match, scriptName: string) => getRunScriptCommand(manager, scriptName)
  );

  transformed = transformed.replace(/\bnpm ci\b/g, getCiInstallCommand(manager));
  transformed = transformed.replace(/\bnpm install(?!\s+-g)\b/g, getInstallCommand(manager));

  // CI workflow cache key: cache: 'npm' / cache: npm → cache: 'pnpm' / cache: pnpm
  transformed = transformed.replace(/^([ \t]+cache:[ \t]*)'npm'/gm, `$1'${manager}'`);
  transformed = transformed.replace(/^([ \t]+cache:[ \t]*)npm[ \t]*$/gm, `$1${manager}`);

  return transformed;
}
// @cpt-end:cpt-frontx-algo-cli-tooling-package-manager-policy:p1:inst-transform-package-manager-text
