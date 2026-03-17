import fs from 'fs-extra';
import path from 'path';
import type { Hai3Config, PackageManager } from './types.js';

export const SUPPORTED_PACKAGE_MANAGERS: PackageManager[] = ['npm', 'pnpm', 'yarn'];
export const DEFAULT_PACKAGE_MANAGER: PackageManager = 'npm';

const DEFAULT_VERSIONS: Record<PackageManager, string> = {
  npm: '11.0.0',
  pnpm: '9.0.0',
  yarn: '4.0.0',
};

export interface PackageManagerContext {
  manager: PackageManager;
  version?: string;
  linkerMode?: 'node-modules' | 'pnp';
}

export function isSupportedPackageManager(value: unknown): value is PackageManager {
  return typeof value === 'string' && SUPPORTED_PACKAGE_MANAGERS.includes(value as PackageManager);
}

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

export function packageManagerFieldValue(
  manager: PackageManager,
  version: string = DEFAULT_VERSIONS[manager]
): string {
  return `${manager}@${version}`;
}

export async function detectPackageManager(
  projectRoot: string,
  config?: Hai3Config | null
): Promise<PackageManagerContext> {
  if (config?.packageManager && isSupportedPackageManager(config.packageManager)) {
    return {
      manager: config.packageManager,
      version: config.packageManagerVersion,
      linkerMode: config.linkerMode,
    };
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const fromField = parsePackageManagerField(packageJson.packageManager);
      if (fromField) {
        return fromField;
      }
    } catch {
      // Fall through to default.
    }
  }

  return { manager: DEFAULT_PACKAGE_MANAGER };
}

export function getInstallCommand(manager: PackageManager): string {
  if (manager === 'yarn') {
    return 'yarn install';
  }
  return `${manager} install`;
}

export function getRunScriptCommand(manager: PackageManager, scriptName: string): string {
  if (manager === 'yarn') {
    return `yarn ${scriptName}`;
  }
  return `${manager} run ${scriptName}`;
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

export function getGlobalInstallCommand(manager: PackageManager, target: string): string | null {
  if (manager === 'npm') {
    return `npm install -g ${target}`;
  }
  if (manager === 'pnpm') {
    return `pnpm add -g ${target}`;
  }
  return null;
}

export function getManagerWorkspaceFiles(manager: PackageManager): Array<{ path: string; content: string }> {
  if (manager === 'pnpm') {
    return [
      {
        path: 'pnpm-workspace.yaml',
        content: 'packages:\n  - eslint-plugin-local\n',
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

/**
 * Transform npm-focused command snippets to the configured package manager.
 * This is intentionally string-based so it can be used for docs, templates and comments.
 */
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

  transformed = transformed.replace(/\bnpm ci\b/g, getInstallCommand(manager));
  transformed = transformed.replace(/\bnpm install(?!\s+-g)\b/g, getInstallCommand(manager));

  return transformed;
}
