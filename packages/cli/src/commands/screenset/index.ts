// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-types
import fs from 'fs-extra';
import type { CommandDefinition, CommandContext } from '../../core/command.js';
import { validationOk, validationError } from '../../core/types.js';
import type { ValidationResult } from '../../core/types.js';
import type { Hai3Config } from '../../core/types.js';
import { isCamelCase, isReservedScreensetName, isCustomUikit, isValidPackageName } from '../../utils/validation.js';
import { generateScreenset, assignMfePort, toKebabCase } from '../../generators/screenset.js';
import { loadConfig, saveConfig } from '../../utils/project.js';
import { joinUnderRoot } from '../../utils/fs.js';
import type { PromptQuestion } from '../../core/prompt.js';
/**
 * Arguments for screenset create command
 */
export interface ScreensetCreateArgs {
  name: string;
  port?: number | string;
  /** Custom parent directory (relative to project root). Optional. */
  dir?: string;
}

/**
 * Result of screenset create command
 */
export interface ScreensetCreateResult {
  mfePath: string;
  files: string[];
  port: number;
}

function parsePortArg(port: ScreensetCreateArgs['port']): number | undefined {
  if (port === undefined) {
    return undefined;
  }

  if (typeof port === 'number') {
    return Number.isInteger(port) ? port : Number.NaN;
  }

  const normalizedPort = port.trim();
  if (!/^\d+$/.test(normalizedPort)) {
    return Number.NaN;
  }

  return Number(normalizedPort);
}

function isValidPortNumber(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validate a `--dir` argument value.
 * Returns a failed ValidationResult with the appropriate error code when the
 * value violates one of the path-safety rules; returns ok otherwise.
 *
 * Rules (in evaluation order):
 *   INVALID_DIR_EMPTY      — empty string
 *   INVALID_DIR_ABSOLUTE   — starts with `/` or a Windows drive letter pattern
 *   INVALID_DIR_TRAVERSAL  — contains a `..` segment
 *   INVALID_DIR_CHARS      — a segment contains chars outside [a-zA-Z0-9_.-]
 */
export function validateDirArg(dir: string): ValidationResult {
  if (dir === '') {
    return validationError('INVALID_DIR_EMPTY', '--dir must not be an empty string.');
  }
  if (dir.startsWith('/') || /^[A-Za-z]:[/\\]/.test(dir)) {
    return validationError(
      'INVALID_DIR_ABSOLUTE',
      `--dir must be a relative path, not an absolute path: "${dir}".`
    );
  }
  const segments = dir.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      return validationError(
        'INVALID_DIR_TRAVERSAL',
        `--dir must not contain ".." segments: "${dir}".`
      );
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(seg)) {
      return validationError(
        'INVALID_DIR_CHARS',
        `--dir segment "${seg}" contains disallowed characters. Use only letters, digits, "_", ".", or "-".`
      );
    }
  }
  return validationOk();
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-types

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-load-validated-config
/**
 * Load `frontx.config.json` and assert that the required fields are present.
 * Throws with a user-facing message on any failure.
 */
async function loadValidatedConfig(projectRoot: string): Promise<Hai3Config> {
  const configResult = await loadConfig(projectRoot);
  if (!configResult.ok) {
    throw new Error(configResult.message);
  }
  const config = configResult.config;
  if (!config.uikit) {
    throw new Error(
      'Missing "uikit" field in frontx.config.json. Recreate the project with `frontx create` or add a "uikit" field ("shadcn", "none", or an npm package name).'
    );
  }
  if (isCustomUikit(config.uikit) && !isValidPackageName(config.uikit)) {
    throw new Error(
      `Invalid "uikit" value in frontx.config.json: "${config.uikit}" is not a valid npm package name.`
    );
  }
  return config;
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-load-validated-config

// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-register-custom-mfe-dir
interface RegisterCustomMfeDirArgs {
  projectRoot: string;
  config: Hai3Config;
  args: ScreensetCreateArgs;
  resolvedMfeParentDir: string;
  ctx: CommandContext;
  logger: CommandContext['logger'];
}

/**
 * After a successful generation in a non-default directory:
 *   - Register the directory in `mfeRoots[]` (always, so multi-root discovery
 *     finds the MFE next time, regardless of any user choice below).
 *   - When no `mfeRoot` is yet stored, ask whether to make this directory
 *     the project default for future `screenset create` calls without --dir.
 *
 * The prompt covers ONLY `mfeRoot`. `mfeRoots[]` is updated unconditionally.
 * Non-interactive callers (no `ctx.prompt`) skip the question; the registry
 * is still updated.
 */
async function registerCustomMfeDir(opts: RegisterCustomMfeDirArgs): Promise<void> {
  const { projectRoot, config, args, resolvedMfeParentDir, ctx, logger } = opts;
  const isCustomDir = args.dir !== undefined && resolvedMfeParentDir !== 'src/mfe_packages';
  if (!isCustomDir) return;

  const knownRoots = config.mfeRoots ?? [];
  let nextConfig: Hai3Config = config;
  if (!knownRoots.includes(resolvedMfeParentDir)) {
    nextConfig = {
      ...config,
      mfeRoots: [...new Set([...knownRoots, resolvedMfeParentDir])],
    };
    await saveConfig(projectRoot, nextConfig);
    logger.info(`Registered "${resolvedMfeParentDir}" in mfeRoots for multi-root discovery.`);
  }

  if (config.mfeRoot || !ctx.prompt) return;

  const PERSIST_QUESTION: PromptQuestion = {
    name: 'persist',
    type: 'confirm',
    message: `Use "${resolvedMfeParentDir}" as the default MFE directory for future "screenset create" calls? (will be saved to frontx.config.json)`,
    default: false,
  };
  const { persist } = await ctx.prompt<{ persist: boolean }>([PERSIST_QUESTION]);
  if (persist) {
    await saveConfig(projectRoot, { ...nextConfig, mfeRoot: resolvedMfeParentDir });
    logger.info(`Saved "${resolvedMfeParentDir}" as the default MFE directory in frontx.config.json.`);
  }
}
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-register-custom-mfe-dir

/**
 * screenset create command implementation
 *
 * Scaffolds a new MFE screenset package from the _blank-mfe template.
 */
// @cpt-flow:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-screenset-generation:p2
// @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-definition
export const screensetCreateCommand: CommandDefinition<
  ScreensetCreateArgs,
  ScreensetCreateResult
> = {
  name: 'screenset:create',
  description: 'Create a new MFE screenset package',
  args: [
    {
      name: 'name',
      description: 'Screenset name in camelCase (e.g., contacts, dashboard)',
      required: true,
    },
  ],
  options: [
    {
      name: 'port',
      description: 'MFE dev server port (auto-assigned if omitted)',
      type: 'string',
    },
    {
      name: 'dir',
      description: 'Custom parent directory for the MFE (relative to project root)',
      type: 'string',
    },
  ],
// @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-definition

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-1
  validate(args, ctx) {
    const { name } = args;

    if (!name) {
      return validationError('MISSING_NAME', 'Screenset name is required.');
    }

    if (!isCamelCase(name)) {
      return validationError(
        'INVALID_NAME',
        `Invalid screenset name "${name}". Name must be camelCase (e.g., contacts, myDashboard).`
      );
    }

    if (isReservedScreensetName(name)) {
      return validationError(
        'RESERVED_NAME',
        `"${name}" is a reserved name. Choose a different screenset name.`
      );
    }

    if (!ctx.projectRoot) {
      return validationError(
        'NOT_IN_PROJECT',
        'Not inside a FrontX project. Run this command from a project root.'
      );
    }

    if (args.port !== undefined) {
      const parsedPort = parsePortArg(args.port);
      if (parsedPort === undefined || !isValidPortNumber(parsedPort)) {
        return validationError(
          'INVALID_PORT',
          `Invalid port "${String(args.port)}". Port must be an integer between 1 and 65535.`
        );
      }
    }

    if (args.dir !== undefined) {
      const dirResult = validateDirArg(args.dir);
      if (!dirResult.ok) {
        return dirResult;
      }
    }

    return validationOk();
  },
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-1

  // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-execute
  async execute(args, ctx): Promise<ScreensetCreateResult> {
    const { logger, projectRoot } = ctx;
    const { name } = args;

    if (!projectRoot) {
      throw new Error('Not inside a FrontX project. Run this command from a project root.');
    }

    // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-2
    const config = await loadValidatedConfig(projectRoot);
    // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-2

    // Resolve MFE parent dir: CLI --dir flag takes precedence over config.mfeRoot.
    const resolvedMfeParentDir = args.dir ?? config.mfeRoot ?? 'src/mfe_packages';

    const nameKebab = toKebabCase(name);
    const mfeDirName = `${nameKebab}-mfe`;
    const mfePath = joinUnderRoot(projectRoot, ...resolvedMfeParentDir.split('/'), mfeDirName);

    if (await fs.pathExists(mfePath)) {
      throw new Error(
        `MFE package already exists at ${resolvedMfeParentDir}/${mfeDirName}/. Choose a different name.`
      );
    }

    const parsedPort = parsePortArg(args.port);
    const port = parsedPort ?? (await assignMfePort(projectRoot));

    logger.info(`Creating screenset '${name}' (port: ${port})...`);
    logger.newline();

    // @cpt-begin:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-6
    const result = await generateScreenset({
      name,
      port,
      projectRoot,
      mfeParentDir: resolvedMfeParentDir,
    });
    // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-generate-6

    logger.success(`Created screenset '${name}' at ${resolvedMfeParentDir}/${mfeDirName}/`);
    logger.newline();
    logger.log(`Files created (${result.files.length} files):`);
    for (const file of result.files.slice(0, 10)) {
      logger.log(`  ${file}`);
    }
    if (result.files.length > 10) {
      logger.log(`  ... and ${result.files.length - 10} more`);
    }
    logger.newline();
    logger.log('Next steps:');
    logger.log(`  cd ${resolvedMfeParentDir}/${mfeDirName}`);
    logger.log('  npm install');
    logger.log(`  npm run dev  # starts on port ${port}`);
    logger.newline();
    logger.info('MFE manifests regenerated in src/app/mfe/generated-mfe-manifests.ts.');

    await registerCustomMfeDir({
      projectRoot,
      config,
      args,
      resolvedMfeParentDir,
      ctx,
      logger,
    });

    return {
      mfePath: result.mfePath,
      files: result.files,
      port,
    };
  },
  // @cpt-end:cpt-frontx-flow-ui-libraries-choice-screenset-generate:p2:inst-screenset-cmd-execute
};
