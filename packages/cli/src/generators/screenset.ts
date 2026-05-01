// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-mfe-replacements
import path from 'path';
import fs from 'fs-extra';
import { getTemplatesDir } from '../core/templates.js';
import { joinUnderRoot, writeGeneratedFiles } from '../utils/fs.js';
import type { GeneratedFile } from '../core/types.js';
import { loadConfig, rewriteTsconfigPackagePaths } from '../utils/project.js';
import { isCustomUikit, assertValidUikitForCodegen, normalizeUikit } from '../utils/validation.js';

/**
 * Input for screenset generation
 */
export interface ScreensetGeneratorInput {
  /** Screenset name in camelCase (e.g., 'contacts', 'dashboard') */
  name: string;
  /** MFE dev server port */
  port: number;
  /** Absolute path of the project root */
  projectRoot: string;
  /**
   * Relative path from projectRoot to the parent directory where the MFE
   * folder will be created. Defaults to "src/mfe_packages".
   * e.g. "custom/mfes" → MFE at <projectRoot>/custom/mfes/<name>-mfe/
   */
  mfeParentDir?: string;
}

/**
 * Output of screenset generation
 */
export interface ScreensetGeneratorOutput {
  /** Path to the created MFE package */
  mfePath: string;
  /** Files created */
  files: string[];
}

/**
 * Convert camelCase to kebab-case
 * e.g. 'myScreenset' → 'my-screenset'
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert camelCase to PascalCase
 * e.g. 'myScreenset' → 'MyScreenset'
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// @cpt-flow:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2
/**
 * Apply placeholder replacements to file content
 * Exported for use by project generator (demo MFE scaffolding)
 */
export function applyMfeReplacements(content: string, name: string, namePascal: string, port: number): string {
  const nameKebab = toKebabCase(name);       // e.g. 'contacts' (or 'my-contacts')

  return content
    // Class names: BlankMfeLifecycle → ContactsMfeLifecycle
    .replace(/BlankMfeLifecycle/g, `${namePascal}MfeLifecycle`)
    // API class: _BlankApiService → _ContactsApiService
    .replace(/_BlankApiService/g, `_${namePascal}ApiService`)
    // Mock map: blankMockMap → contactsMockMap
    .replace(/blankMockMap/g, `${name}MockMap`)
    // Slice name: '_blank/home' → 'contacts/home'
    .replace(/'_blank\//g, `'${name}/`)
    // Redux state type: '_blank/home' → 'contacts/home'
    .replace(/"_blank\//g, `"${name}/`)
    // API route: '/api/blank' → '/api/contacts'
    .replace(/\/api\/blank/g, `/api/${nameKebab}`)
    // Federation name: blankMfe → contactsMfe
    .replace(/blankMfe/g, `${name}Mfe`)
    // Package name: @cyberfabric/blank-mfe → @cyberfabric/contacts-mfe
    .replace(/@cyberfabric\/blank-mfe/g, `@cyberfabric/${nameKebab}-mfe`)
    // GTS IDs: hai3.blank. → hai3.contacts. (always lowercase)
    .replace(/hai3\.blank\./g, `hai3.${name.toLowerCase()}.`)
    // Remote entry port: localhost:3099 → localhost:{port}
    .replace(/localhost:3099/g, `localhost:${port}`)
    // Port in scripts: --port 3099 → --port {port}
    .replace(/--port 3099/g, `--port ${port}`)
    // Port reference in README
    .replace(/from `3099`/g, `from \`${port}\``)
    // Route: /blank-home → /contacts
    .replace(/\/blank-home/g, `/${nameKebab}`)
    // Label: "Blank Home" → "Contacts"
    .replace(/"Blank Home"/g, `"${namePascal}"`)
    // Comment references: _blank-mfe → {name}-mfe
    .replace(/_blank-mfe/g, `${nameKebab}-mfe`)
    // Comment references: _Blank Domain → _{Name} Domain
    .replace(/_Blank Domain/g, `_${namePascal} Domain`)
    // Comment: Blank MFE template → {Name} MFE
    .replace(/Blank MFE template/g, `${namePascal} MFE`)
    .replace(/Blank MFE/g, `${namePascal} MFE`)
    // Comment: for the Blank → for the {Name}
    .replace(/for the Blank/g, `for the ${namePascal}`)
    // Replace monorepo file: refs with npm versions (standalone projects can't resolve file: paths)
    .replace(/"file:\.\.\/\.\.\/\.\.\/packages\/[a-z0-9-]+"/g, `"alpha"`);
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-mfe-replacements

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-mfe-rename
/**
 * Rename a file if it contains blank placeholders
 * Exported for use by project generator (demo MFE scaffolding)
 */
export function applyMfeFileRename(fileName: string, name: string): string {
  const namePascal = toPascalCase(name);
  return fileName
    .replace(/_BlankApiService/g, `_${namePascal}ApiService`);
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-mfe-rename

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-read-dir
/**
 * Recursively read all files from a directory
 */
async function readDirRecursive(
  dir: string,
  basePath: string = ''
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  if (!(await fs.pathExists(dir))) {
    return files;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await readDirRecursive(fullPath, relativePath)));
    } else {
      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-read-dir

/**
 * Read the optional `mfeRoot` / `mfeRoots[]` config fields from the project's
 * `frontx.config.json`. Returns an empty array on any failure (missing file,
 * unparseable JSON, etc.) so callers always get a deterministic shape.
 */
async function readConfiguredMfeRoots(projectRoot: string): Promise<string[]> {
  const configPath = joinUnderRoot(projectRoot, 'frontx.config.json');
  if (!(await fs.pathExists(configPath))) return [];
  const config = (await fs.readJson(configPath)) as {
    mfeRoot?: unknown;
    mfeRoots?: unknown;
  };
  const extra: string[] = [];
  if (typeof config.mfeRoot === 'string' && config.mfeRoot) extra.push(config.mfeRoot);
  if (Array.isArray(config.mfeRoots)) {
    for (const r of config.mfeRoots) {
      if (typeof r === 'string' && r) extra.push(r);
    }
  }
  return extra;
}

/**
 * Return the deduplicated list of MFE root directories (relative to project root) to scan.
 *
 * Always starts with the legacy "src/mfe_packages" for backwards compatibility.
 * Adds mfeRoot and each entry from mfeRoots[] found in frontx.config.json when present.
 * Any config read failure falls back to the default list without throwing.
 */
export async function getMfeRoots(projectRoot: string): Promise<string[]> {
  const defaults = ['src/mfe_packages'];
  const extra = await readConfiguredMfeRoots(projectRoot).catch(() => [] as string[]);
  return [...new Set([...defaults, ...extra])];
}

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-port-scan
/** Extract the `--port N` argument from a package.json `dev` script, if any. */
async function readPortFromPackageJson(pkgJsonPath: string): Promise<number | undefined> {
  try {
    const pkgJson = await fs.readJson(pkgJsonPath);
    const devScript = pkgJson?.scripts?.dev ?? '';
    const portMatch = devScript.match(/--port\s+(\d+)/);
    return portMatch ? parseInt(portMatch[1], 10) : undefined;
  } catch {
    return undefined;
  }
}

/** Collect ports declared by every MFE package directly under `rootDir`. */
async function collectPortsInRoot(rootDir: string, usedPorts: Set<number>): Promise<void> {
  if (!(await fs.pathExists(rootDir))) return;
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(rootDir, entry.name, 'package.json');
    if (!(await fs.pathExists(pkgJsonPath))) continue;
    const port = await readPortFromPackageJson(pkgJsonPath);
    if (port !== undefined) usedPorts.add(port);
  }
}

/**
 * Scan all MFE root directories to find used ports.
 * Reads roots from frontx.config.json (graceful fallback to legacy src/mfe_packages).
 */
export async function getUsedMfePorts(projectRoot: string): Promise<Set<number>> {
  const usedPorts = new Set<number>();
  const roots = await getMfeRoots(projectRoot);
  for (const root of roots) {
    await collectPortsInRoot(joinUnderRoot(projectRoot, ...root.split('/')), usedPorts);
  }
  return usedPorts;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-port-scan

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-port-assign
/**
 * Find next available MFE port starting from startPort
 */
export async function assignMfePort(projectRoot: string, startPort = 3001): Promise<number> {
  const usedPorts = await getUsedMfePorts(projectRoot);
  let port = startPort;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-port-assign

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-regenerate-manifests
/**
 * Regenerate generated-mfe-manifests.ts by scanning all MFE root directories.
 *
 * This replaces the old updateBootstrap approach (which added manual registration
 * blocks to bootstrap.ts, causing double-registration with the MFE_MANIFESTS loop).
 * Now bootstrap.ts always uses the auto-generated MFE_MANIFESTS — the only thing
 * that changes when MFEs are added/removed is this generated file.
 *
 * Scans all roots from getMfeRoots() union {resolvedMfeParentDir}, ensuring the
 * newly created MFE is always included even before config is persisted (Phase 5).
 *
 * @param resolvedMfeParentDir  Relative path to the MFE parent dir just used for generation
 */
const MANIFEST_EXCLUDED_PACKAGES = new Set(['_blank-mfe', 'shared']);

/** Collect manifest-eligible MFE entries directly under one root directory. */
async function collectManifestEntriesInRoot(
  projectRoot: string,
  root: string,
  out: Array<{ pkg: string; relPath: string }>,
): Promise<void> {
  const rootDir = joinUnderRoot(projectRoot, ...root.split('/'));
  if (!(await fs.pathExists(rootDir))) return;
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (MANIFEST_EXCLUDED_PACKAGES.has(entry.name) || entry.name.startsWith('.')) continue;
    const mfeJsonPath = path.join(rootDir, entry.name, 'mfe.json');
    if (!(await fs.pathExists(mfeJsonPath))) continue;
    // posix-style relative path from project root, for use in import path computation
    out.push({ pkg: entry.name, relPath: `${root}/${entry.name}` });
  }
}

async function regenerateMfeManifests(projectRoot: string, resolvedMfeParentDir: string): Promise<void> {
  const outputFile = path.join(projectRoot, 'src', 'app', 'mfe', 'generated-mfe-manifests.ts');

  // Union of all known roots + the dir just used, deduped.
  // getMfeRoots reads frontx.config.json; resolvedMfeParentDir is needed because
  // config persistence happens in Phase 5 (after generation).
  const configRoots = await getMfeRoots(projectRoot);
  const allRoots = [...new Set([...configRoots, resolvedMfeParentDir])];

  const mfeEntries: Array<{ pkg: string; relPath: string }> = [];
  for (const root of allRoots) {
    await collectManifestEntriesInRoot(projectRoot, root, mfeEntries);
  }

  const content = buildMfeManifestsContent(mfeEntries);
  await fs.ensureDir(path.dirname(outputFile));
  await fs.writeFile(outputFile, content, 'utf-8');
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-regenerate-manifests

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-build-manifests
/**
 * Build the content of generated-mfe-manifests.ts from MFE entries.
 * Shared by both the screenset generator (writes to disk) and the project generator (in-memory).
 *
 * Import path computation (relative to src/app/mfe/generated-mfe-manifests.ts):
 *   importPath = path.posix.relative('src/app/mfe', relPath)
 *   where relPath = mfeParentDir + '/' + pkg
 *
 * Example (legacy):  relPath = 'src/mfe_packages/contacts-mfe'
 *   → '../../mfe_packages/contacts-mfe'
 *   import from '../../mfe_packages/contacts-mfe/mfe.json'
 *
 * Example (custom):  relPath = 'custom/mfes/contacts-mfe'
 *   → '../../../custom/mfes/contacts-mfe'
 *   import from '../../../custom/mfes/contacts-mfe/mfe.json'
 */
export function buildMfeManifestsContent(mfeEntries: Array<{ pkg: string; relPath: string }>): string {
  const imports = mfeEntries
    .map(({ relPath }, idx) => {
      // Compute the import path relative to src/app/mfe/ (location of generated-mfe-manifests.ts)
      const rel = path.posix.relative('src/app/mfe', relPath);
      // Ensure the path starts with ./ or ../ as required for relative TS imports
      const importPath = rel.startsWith('.') ? rel : `./${rel}`;
      return `import mfe${idx} from '${importPath}/mfe.json' with { type: 'json' };`;
    })
    .join('\n');

  const registryEntries = mfeEntries
    .map((_, idx) => `  mfe${idx},`)
    .join('\n');

  const importBlock = imports ? `\n${imports}\n` : '';

  return `// AUTO-GENERATED FILE
// Generated by: scripts/generate-mfe-manifests.ts
// Do not edit manually!
// Regenerate: npm run generate:mfe-manifests
${importBlock}
import type { Extension, JSONSchema, MfeEntry } from '@cyberfabric/react';

export interface MfeManifestConfig {
  manifest: JSONSchema;
  entries: MfeEntry[];
  extensions: Extension[];
  /** MFE-carried schemas (custom actions, properties). Registered before entries and extensions. */
  schemas?: JSONSchema[];
}

export const MFE_MANIFESTS: MfeManifestConfig[] = [
${registryEntries}
];

export function getMfeManifests() {
  return MFE_MANIFESTS;
}
`;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-build-manifests

const COMPONENTS_UI_PREFIX = path.join('src', 'components', 'ui') + path.sep;
const COMPONENTS_UI_IMPORT_PATTERN = /(from\s+)(['"])([^'"]*?components\/ui)\/[^'"]+\2/g;

/**
 * Adapt MFE template files for a custom (non-shadcn) UI kit.
 *
 * Replaces individual shadcn component files with a single barrel re-export
 * from the library and updates screen imports to use the barrel. This ensures
 * AI agents see imports from the library, not local shadcn patterns.
 */
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2
// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-5
export function adaptMfeForCustomUikit(files: GeneratedFile[], uikit: string): GeneratedFile[] {
  assertValidUikitForCodegen(uikit);

  const barrel: GeneratedFile = {
    path: path.join('src', 'components', 'ui', 'index.ts'),
    content: `export * from '${uikit}';\n`,
  };

  const result: GeneratedFile[] = [
    barrel,
    { path: path.join('src', 'lib', 'utils.ts'), content: NONE_UTILS_CONTENT },
  ];

  for (const file of files) {
    // Drop all files under src/components/ui/ (replaced by barrel)
    if (file.path.startsWith(COMPONENTS_UI_PREFIX)) continue;

    // Keep cn() available for local screen imports, but remove shadcn-specific deps.
    if (file.path === path.join('src', 'lib', 'utils.ts')) continue;

    // Rewrite component imports in screen files to use the barrel
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
      const content = file.content
        .replace(
          COMPONENTS_UI_IMPORT_PATTERN,
          '$1$2$3$2'
        );
      result.push({ path: file.path, content });
      continue;
    }

    result.push(file);
  }

  return result;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-5

/* ---------- Plain-CSS templates for uikit === 'none' ---------- */

// @cpt-begin:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2:inst-screenset-none-css-templates
const NONE_COMPONENTS_CSS = `/* Plain-CSS component styles — no Tailwind required.
   Uses CSS custom properties from globals.css (theme tokens). */

/* --- Button --- */
.frontx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
  cursor: pointer;
  border: none;
  outline: none;
}
.frontx-btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.frontx-btn:disabled {
  pointer-events: none;
  opacity: 0.5;
}
.frontx-btn-default {
  background-color: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.frontx-btn-default:hover { opacity: 0.9; }
.frontx-btn-destructive {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.frontx-btn-destructive:hover { opacity: 0.9; }
.frontx-btn-outline {
  border: 1px solid var(--border);
  background-color: var(--background);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.frontx-btn-outline:hover { background-color: var(--accent); }
.frontx-btn-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.frontx-btn-secondary:hover { opacity: 0.8; }
.frontx-btn-ghost { background: transparent; }
.frontx-btn-ghost:hover { background-color: var(--accent); }
.frontx-btn-link {
  background: transparent;
  color: var(--primary);
  text-underline-offset: 4px;
}
.frontx-btn-link:hover { text-decoration: underline; }

.frontx-btn-size-default { height: 2.25rem; padding: 0.5rem 1rem; }
.frontx-btn-size-sm { height: 2rem; padding: 0.25rem 0.75rem; font-size: 0.75rem; border-radius: var(--radius-md, 0.375rem); }
.frontx-btn-size-lg { height: 2.5rem; padding: 0.5rem 2rem; border-radius: var(--radius-md, 0.375rem); }
.frontx-btn-size-icon { height: 2.25rem; width: 2.25rem; }

/* --- Card --- */
.frontx-card {
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.frontx-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1.5rem;
}
.frontx-card-title {
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}
.frontx-card-description {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.frontx-card-content {
  padding: 1.5rem;
  padding-top: 0;
}
.frontx-card-footer {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  padding-top: 0;
}

/* --- Skeleton --- */
.frontx-skeleton {
  border-radius: var(--radius-md, 0.375rem);
  background-color: var(--muted);
  animation: frontx-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.frontx-skeleton-inherit {
  background-color: currentColor;
  opacity: 0.2;
}
@keyframes frontx-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* --- Screen-template utility classes --- */
.p-8 { padding: 2rem; }
.p-6 { padding: 1.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.h-4 { height: 1rem; }
.h-8 { height: 2rem; }
.w-64 { width: 16rem; }
.w-96 { width: 24rem; }
.w-full { width: 100%; }
.w-3\\/4 { width: 75%; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
.text-muted-foreground { color: var(--muted-foreground); }
.grid { display: grid; }
.gap-2 { gap: 0.5rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
`;

const NONE_BUTTON_CONTENT = `import * as React from 'react';
import { cn } from '../../lib/utils';
import './components.css';

const VARIANT_CLASSES: Record<string, string> = {
  default: 'frontx-btn-default',
  destructive: 'frontx-btn-destructive',
  outline: 'frontx-btn-outline',
  secondary: 'frontx-btn-secondary',
  ghost: 'frontx-btn-ghost',
  link: 'frontx-btn-link',
};

const SIZE_CLASSES: Record<string, string> = {
  default: 'frontx-btn-size-default',
  sm: 'frontx-btn-size-sm',
  lg: 'frontx-btn-size-lg',
  icon: 'frontx-btn-size-icon',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = ({
  ref,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => (
  <button
    className={cn('frontx-btn', VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
    ref={ref}
    {...props}
  />
);
Button.displayName = 'Button';

export { Button };
`;

const NONE_CARD_CONTENT = `import * as React from 'react';
import { cn } from '../../lib/utils';
import './components.css';

const Card = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card', className)} {...props} />
);
Card.displayName = 'Card';

const CardHeader = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card-header', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

const CardTitle = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card-title', className)} {...props} />
);
CardTitle.displayName = 'CardTitle';

const CardDescription = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card-description', className)} {...props} />
);
CardDescription.displayName = 'CardDescription';

const CardContent = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card-content', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn('frontx-card-footer', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`;

const NONE_SKELETON_CONTENT = `import { cn } from '../../lib/utils';
import './components.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  inheritColor?: boolean;
}

function Skeleton({ className, inheritColor = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'frontx-skeleton',
        inheritColor && 'frontx-skeleton-inherit',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
`;

const NONE_UTILS_CONTENT = `type ClassInput = string | false | null | undefined;

export function cn(...inputs: ClassInput[]) {
  return inputs.filter(Boolean).join(' ');
}
`;
// @cpt-end:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2:inst-screenset-none-css-templates

// @cpt-begin:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2:inst-screenset-adapt-none
/**
 * Adapt MFE template files for uikit === 'none' (no UI library).
 *
 * Replaces shadcn (Tailwind-dependent) component files with plain-CSS equivalents
 * that use CSS custom properties from globals.css. Screen template files are left
 * unchanged — the components.css file includes matching utility classes.
 */
function adaptMfeForNoneUikit(files: GeneratedFile[]): GeneratedFile[] {
  const replacements: Record<string, string> = {
    [path.join('src', 'components', 'ui', 'button.tsx')]: NONE_BUTTON_CONTENT,
    [path.join('src', 'components', 'ui', 'card.tsx')]: NONE_CARD_CONTENT,
    [path.join('src', 'components', 'ui', 'skeleton.tsx')]: NONE_SKELETON_CONTENT,
    [path.join('src', 'lib', 'utils.ts')]: NONE_UTILS_CONTENT,
  };

  const result: GeneratedFile[] = [
    { path: path.join('src', 'components', 'ui', 'components.css'), content: NONE_COMPONENTS_CSS },
  ];

  for (const file of files) {
    const replacement = replacements[file.path];
    if (replacement !== undefined) {
      result.push({ path: file.path, content: replacement });
      continue;
    }
    result.push(file);
  }

  return result;
}
// @cpt-end:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2:inst-screenset-adapt-none

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-strip-shadcn-deps
/** Shadcn-specific dependency keys to strip from MFE package.json for non-shadcn projects. */
const SHADCN_ONLY_PKG_KEYS = [
  'tailwindcss',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  '@radix-ui/react-slot',
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isObjectRecord(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

/**
 * Strip shadcn-specific dependencies from MFE package.json for non-shadcn projects.
 * Includes Tailwind, tailwind-merge, class-variance-authority, and @radix-ui/react-slot.
 */
function stripShadcnDepsFromMfe(files: GeneratedFile[], uikit: string): GeneratedFile[] {
  if (uikit === 'shadcn') return files;

  return files.map((file) => {
    if (file.path !== 'package.json') return file;
    try {
      const parsed = JSON.parse(file.content);
      if (!isObjectRecord(parsed)) {
        return file;
      }

      const deps = parsed.dependencies;
      if (isStringRecord(deps)) {
        const nextDeps = { ...deps };
        for (const key of SHADCN_ONLY_PKG_KEYS) {
          delete nextDeps[key];
        }
        return {
          path: file.path,
          content: JSON.stringify({ ...parsed, dependencies: nextDeps }, null, 2) + '\n',
        };
      }

      return file;
    } catch {
      return file;
    }
  });
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-strip-shadcn-deps

/**
 * Generate a new MFE screenset package from the _blank-mfe template
 */
// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-setup
export async function generateScreenset(
  input: ScreensetGeneratorInput
): Promise<ScreensetGeneratorOutput> {
  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-1
  const { name, port, projectRoot, mfeParentDir } = input;
  // Default to legacy path so that callers without --dir or mfeRoot are byte-identical to before.
  const resolvedMfeParentDir = mfeParentDir ?? 'src/mfe_packages';
  const nameKebab = toKebabCase(name);
  const mfeDirName = `${nameKebab}-mfe`;
  // Split on '/' so this works on both POSIX and Windows without double-sep issues.
  const mfePath = joinUnderRoot(projectRoot, ...resolvedMfeParentDir.split('/'), mfeDirName);
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-1

  const templatesDir = getTemplatesDir();
  const mfeTemplateDir = path.join(templatesDir, 'mfe-template');

  if (!(await fs.pathExists(mfeTemplateDir))) {
    throw new Error(
      'MFE template not found. Run `npm run build` in packages/cli first.'
    );
  }
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-setup

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-6
  // Read all template files
  const templateFiles = await readDirRecursive(mfeTemplateDir);

  // Transform content and apply renames
  // @cpt-begin:cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests:p1:inst-generate-command-tests
  let outputFiles: GeneratedFile[] = templateFiles.map((file) => {
    // Apply file rename
    const parts = file.path.split(path.sep);
    const renamedParts = parts.map((part) => applyMfeFileRename(part, name));
    const renamedPath = renamedParts.join(path.sep);

    // Apply content replacements
    const namePascal = toPascalCase(name);
    const transformedContent = applyMfeReplacements(file.content, name, namePascal, port);

    return { path: renamedPath, content: transformedContent };
  });
  // @cpt-end:cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests:p1:inst-generate-command-tests

  outputFiles = outputFiles.map((file) => {
    if (!file.path.endsWith('tsconfig.json')) {
      return file;
    }

    return {
      path: file.path,
      content: rewriteTsconfigPackagePaths(file.content, {
        useLocalPackages: false,
        // Use the actual mfeParentDir so tsconfig relative refs (e.g. ../../../tsconfig.json)
        // resolve to the correct depth for any custom parent directory.
        tsconfigPath: path.posix.join(resolvedMfeParentDir, mfeDirName, file.path.split('\\').join('/')),
      }),
    };
  });
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-6

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-2
  // For custom uikit projects, replace shadcn component files with a barrel re-export
  // so AI agents discover and use the library's components instead of creating new ones.
  const configResult = await loadConfig(projectRoot);
  if (!configResult.ok) {
    throw new Error(configResult.message);
  }
  const uikit = normalizeUikit(configResult.config.uikit ?? 'shadcn');
  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-3
  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-4
  // For shadcn: outputFiles are used as-is (base template already includes shadcn imports).
  // For none: replace shadcn components with plain-CSS equivalents (no Tailwind compilation
  //   exists in none projects, so shadcn components would render unstyled).
  // For third-party: adaptMfeForCustomUikit replaces local component files with a barrel
  //   re-export from the custom package.
  if (uikit === 'none') {
    outputFiles = adaptMfeForNoneUikit(outputFiles);
  } else if (isCustomUikit(uikit)) {
    outputFiles = adaptMfeForCustomUikit(outputFiles, uikit);
  }
  // Non-shadcn: remove shadcn-specific deps from MFE package.json.
  outputFiles = stripShadcnDepsFromMfe(outputFiles, uikit);
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-4
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-3
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-2

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-finalize
  // Ensure mfe_packages/shared/ exists for shared build-time MFE utilities
  // such as Vite plugins used across generated packages.
  const sharedDir = path.join(projectRoot, 'src', 'mfe_packages', 'shared');
  if (!(await fs.pathExists(sharedDir))) {
    const mfeSharedTemplateDir = path.join(templatesDir, 'mfe-shared');
    if (await fs.pathExists(mfeSharedTemplateDir)) {
      await fs.copy(mfeSharedTemplateDir, sharedDir);
    }
  }

  const mfeVitestBasePath = joinUnderRoot(projectRoot, 'src', 'mfe_packages', 'vitest.mfe.base.ts');
  if (!(await fs.pathExists(mfeVitestBasePath))) {
    const mfeVitestBaseTemplatePath = joinUnderRoot(templatesDir, 'src', 'mfe_packages', 'vitest.mfe.base.ts');
    if (await fs.pathExists(mfeVitestBaseTemplatePath)) {
      await fs.ensureDir(path.dirname(mfeVitestBasePath));
      await fs.copy(mfeVitestBaseTemplatePath, mfeVitestBasePath);
    }
  }

  // Write files to mfe package directory
  const writtenFiles = await writeGeneratedFiles(mfePath, outputFiles);

  // Regenerate generated-mfe-manifests.ts so bootstrap picks up the new MFE
  await regenerateMfeManifests(projectRoot, resolvedMfeParentDir);
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-finalize

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-7
  return {
    mfePath,
    files: writtenFiles,
  };
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-7
}
