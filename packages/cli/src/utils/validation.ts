/**
 * Validation utilities for CLI commands
 */
// @cpt-algo:cpt-frontx-algo-cli-tooling-validate-project-name:p1
// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-name-validation

import lodash from 'lodash';
const { toLower } = lodash;

/**
 * Validate npm package name
 * Based on npm package name rules
 */
// @cpt-begin:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-check-empty-name
export function isValidPackageName(name: string): boolean {
  if (!name || name.length === 0) return false;
  // @cpt-end:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-check-empty-name

  // @cpt-begin:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-check-npm-name-pattern
  if (name.length > 214) return false;
  if (name.startsWith('.') || name.startsWith('_')) return false;
  if (name !== toLower(name)) return false;
  if (/[~'!()*]/.test(name)) return false;
  if (encodeURIComponent(name) !== name) {
    // Check for scoped packages
    if (name.startsWith('@')) {
      const [scope, pkg] = name.slice(1).split('/');
      if (!scope || !pkg) return false;
      if (encodeURIComponent(scope) !== scope) return false;
      if (encodeURIComponent(pkg) !== pkg) return false;
    } else {
      return false;
    }
  }
  // @cpt-end:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-check-npm-name-pattern

  // @cpt-begin:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-return-name-valid
  return true;
  // @cpt-end:cpt-frontx-algo-cli-tooling-validate-project-name:p1:inst-return-name-valid
}

/**
 * Validate camelCase string
 */
export function isCamelCase(str: string): boolean {
  if (!str || str.length === 0) return false;
  // Must start with lowercase letter
  if (!/^[a-z]/.test(str)) return false;
  // Only alphanumeric characters
  if (!/^[a-zA-Z0-9]+$/.test(str)) return false;
  return true;
}

/**
 * Validate PascalCase string
 */
export function isPascalCase(str: string): boolean {
  if (!str || str.length === 0) return false;
  // Must start with uppercase letter
  if (!/^[A-Z]/.test(str)) return false;
  // Only alphanumeric characters
  if (!/^[a-zA-Z0-9]+$/.test(str)) return false;
  return true;
}

// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-name-validation

// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-uikit-resolution:p1:inst-uikit-resolution-normalize
// @cpt-algo:cpt-frontx-algo-ui-libraries-choice-uikit-resolution:p1
const NPM_PACKAGE_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const LEGACY_UIKIT_ALIAS: Record<string, string> = {
  frontx: 'shadcn',
};

/**
 * Normalize legacy uikit aliases to the current built-in values.
 */
export function normalizeUikit(uikit: string): string {
  return LEGACY_UIKIT_ALIAS[uikit] ?? uikit;
}

// @cpt-end:cpt-frontx-algo-ui-libraries-choice-uikit-resolution:p1:inst-uikit-resolution-normalize

/**
 * Defense-in-depth guard: asserts that a uikit value is safe to interpolate
 * into generated code (e.g. `export * from '${uikit}'`).
 * Throws if the value doesn't match strict npm package-name syntax.
 */
// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-1b
export function assertValidUikitForCodegen(uikit: string): void {
  if (!NPM_PACKAGE_NAME_RE.test(uikit)) {
    throw new Error(
      `Refusing to generate code: uikit value "${uikit}" is not a valid npm package name.`
    );
  }
}
// @cpt-end:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-1b

/**
 * Check if a uikit value is a custom npm package (not a built-in preset)
 */
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-uikit-resolution-impl:p1
export function isCustomUikit(uikit: string): boolean {
  const resolvedUikit = normalizeUikit(uikit);
  // @cpt-begin:cpt-frontx-algo-ui-libraries-choice-uikit-resolution:p1:inst-uikit-resolution-6
  return resolvedUikit !== 'shadcn' && resolvedUikit !== 'none';
  // @cpt-end:cpt-frontx-algo-ui-libraries-choice-uikit-resolution:p1:inst-uikit-resolution-6
}

/**
 * Validate that an npm package exists on the registry.
 * Returns { exists: true } on success, { exists: false, error } on 404,
 * or { exists: true } with a warning on network failure (graceful degradation).
 */
// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-create-thirdparty:p2:inst-create-thirdparty-validate-npm
// @cpt-flow:cpt-frontx-flow-ui-libraries-choice-create-thirdparty:p2
export async function validateNpmPackage(
  packageName: string
): Promise<{ exists: boolean; error?: string; warning?: string }> {
  if (!isValidPackageName(packageName)) {
    return { exists: false, error: `'${packageName}' is not a valid npm package name` };
  }

  const encoded = packageName.startsWith('@')
    ? `@${packageName.slice(1).split('/').map(encodeURIComponent).join('/')}`
    : encodeURIComponent(packageName);
  const url = `https://registry.npmjs.org/${encoded}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return { exists: true };
    }
    if (response.status === 404) {
      return { exists: false, error: `Package '${packageName}' not found on npm registry` };
    }
    return { exists: true, warning: `Could not verify package '${packageName}' on npm registry, continuing anyway` };
  } catch {
    return { exists: true, warning: `Could not verify package '${packageName}' on npm registry, continuing anyway` };
  }
}

// @cpt-end:cpt-frontx-flow-ui-libraries-choice-create-thirdparty:p2:inst-create-thirdparty-validate-npm

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-reserved-names
/**
 * Reserved screenset names that cannot be used
 */
const RESERVED_SCREENSET_NAMES = ['screenset', 'screen', 'index', 'api', 'core'];

/**
 * Check if screenset name is reserved
 */
export function isReservedScreensetName(name: string): boolean {
  return RESERVED_SCREENSET_NAMES.includes(toLower(name));
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-reserved-names
