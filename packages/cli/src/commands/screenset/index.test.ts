/**
 * Unit tests for screenset create command — --dir validation and persistence prompt
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { validateDirArg, screensetCreateCommand } from './index.js';
import type { CommandContext } from '../../core/command.js';
import { Logger } from '../../core/logger.js';
import { createProgrammaticPrompt } from '../../core/prompt.js';

// Mock the generator and project utilities used inside execute()
vi.mock('../../generators/screenset.js', async () => {
  const actual = await vi.importActual<typeof import('../../generators/screenset.js')>('../../generators/screenset.js');
  return {
    ...actual,
    generateScreenset: vi.fn(),
    assignMfePort: vi.fn(),
  };
});

vi.mock('../../utils/project.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/project.js')>('../../utils/project.js');
  return {
    ...actual,
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
  };
});

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
  },
  pathExists: vi.fn(),
}));

import { generateScreenset, assignMfePort } from '../../generators/screenset.js';
import { loadConfig, saveConfig } from '../../utils/project.js';
import fs from 'fs-extra';

const mockedGenerateScreenset = generateScreenset as Mock;
const mockedAssignMfePort = assignMfePort as Mock;
const mockedLoadConfig = loadConfig as Mock;
const mockedSaveConfig = saveConfig as Mock;
const mockedPathExists = fs.pathExists as unknown as Mock;

/** Build a minimal CommandContext for testing. */
function buildCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    cwd: '/project',
    projectRoot: '/project',
    config: null,
    logger: Logger.silent(),
    ...overrides,
  };
}

/** Default generate result returned by the mock. */
const GENERATE_RESULT = {
  mfePath: '/project/custom/mfes/contacts-mfe',
  files: ['package.json', 'index.html'],
  port: 5100,
};

/** Base config with required uikit field. */
const BASE_CONFIG = {
  frontx: true as const,
  uikit: 'shadcn',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedPathExists.mockResolvedValue(false);
  mockedAssignMfePort.mockResolvedValue(5100);
  mockedGenerateScreenset.mockResolvedValue(GENERATE_RESULT);
  mockedSaveConfig.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// validateDirArg
// ---------------------------------------------------------------------------

describe('validateDirArg', () => {
  it('accepts a valid relative single-segment path', () => {
    const result = validateDirArg('custom-mfes');
    expect(result.ok).toBe(true);
  });

  it('accepts a valid relative multi-segment path', () => {
    const result = validateDirArg('valid/path');
    expect(result.ok).toBe(true);
  });

  it('accepts a path with underscores and dots', () => {
    const result = validateDirArg('src/mfe_packages.v2');
    expect(result.ok).toBe(true);
  });

  it('returns INVALID_DIR_EMPTY for an empty string', () => {
    const result = validateDirArg('');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_EMPTY');
  });

  it('returns INVALID_DIR_ABSOLUTE for a Unix absolute path', () => {
    const result = validateDirArg('/absolute/path');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_ABSOLUTE');
  });

  it('returns INVALID_DIR_ABSOLUTE for a Windows drive-letter path', () => {
    const result = validateDirArg('C:\\some\\path');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_ABSOLUTE');
  });

  it('returns INVALID_DIR_TRAVERSAL for a path with .. segment', () => {
    const result = validateDirArg('../../etc');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_TRAVERSAL');
  });

  it('returns INVALID_DIR_TRAVERSAL for a path with a middle .. segment', () => {
    const result = validateDirArg('some/../other');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_TRAVERSAL');
  });

  it('returns INVALID_DIR_CHARS for a path with spaces', () => {
    const result = validateDirArg('path with spaces');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_CHARS');
  });

  it('returns INVALID_DIR_CHARS for a path containing a shell-special character', () => {
    const result = validateDirArg('path;rm -rf');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_DIR_CHARS');
  });
});

// ---------------------------------------------------------------------------
// Persistence prompt — execute()
// ---------------------------------------------------------------------------

describe('screensetCreateCommand.execute — persistence prompt', () => {
  /**
   * (a) Custom --dir provided, no mfeRoot stored → prompt fires, user says yes
   *     → saveConfig called with mfeRoot set and dir added to mfeRoots.
   */
  it('saves both mfeRoots and mfeRoot when user answers yes', async () => {
    mockedLoadConfig.mockResolvedValue({ ok: true, config: { ...BASE_CONFIG } });

    const ctx = buildCtx({
      prompt: createProgrammaticPrompt({ persist: true }),
    });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'custom/mfes' },
      ctx
    );

    // Two saves: first registers mfeRoots[], second sets mfeRoot.
    expect(mockedSaveConfig).toHaveBeenCalledTimes(2);
    const [, registeredConfig] = mockedSaveConfig.mock.calls[0] as [string, Record<string, unknown>];
    expect(registeredConfig.mfeRoots).toEqual(['custom/mfes']);
    expect(registeredConfig.mfeRoot).toBeUndefined();

    const [, finalConfig] = mockedSaveConfig.mock.calls[1] as [string, Record<string, unknown>];
    expect(finalConfig.mfeRoot).toBe('custom/mfes');
    expect(finalConfig.mfeRoots).toEqual(['custom/mfes']);
  });

  /**
   * mfeRoots deduplication: existing entry already in array → no registration save,
   * only the mfeRoot save when the user opts in.
   */
  it('skips mfeRoots registration when the dir already appears there', async () => {
    mockedLoadConfig.mockResolvedValue({
      ok: true,
      config: { ...BASE_CONFIG, mfeRoots: ['custom/mfes', 'other/mfes'] },
    });

    const ctx = buildCtx({
      prompt: createProgrammaticPrompt({ persist: true }),
    });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'custom/mfes' },
      ctx
    );

    // Only one save (mfeRoot persistence) — mfeRoots registration is skipped because dir is already known.
    expect(mockedSaveConfig).toHaveBeenCalledOnce();
    const [, savedConfig] = mockedSaveConfig.mock.calls[0] as [string, Record<string, unknown>];
    expect(savedConfig.mfeRoot).toBe('custom/mfes');
    expect(savedConfig.mfeRoots).toEqual(['custom/mfes', 'other/mfes']);
  });

  /**
   * (b) Custom --dir provided, no mfeRoot stored → prompt fires, user says no
   *     → mfeRoots IS still updated (for multi-root discovery), mfeRoot is NOT.
   */
  it('still registers mfeRoots when user answers no, but does not set mfeRoot', async () => {
    mockedLoadConfig.mockResolvedValue({ ok: true, config: { ...BASE_CONFIG } });

    const ctx = buildCtx({
      prompt: createProgrammaticPrompt({ persist: false }),
    });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'custom/mfes' },
      ctx
    );

    // Single save with mfeRoots set, mfeRoot left untouched.
    expect(mockedSaveConfig).toHaveBeenCalledOnce();
    const [, savedConfig] = mockedSaveConfig.mock.calls[0] as [string, Record<string, unknown>];
    expect(savedConfig.mfeRoots).toEqual(['custom/mfes']);
    expect(savedConfig.mfeRoot).toBeUndefined();
  });

  /**
   * (c) mfeRoot already stored in config → prompt does NOT fire regardless of --dir.
   *     But mfeRoots IS still registered if the new dir is unknown.
   */
  it('does not prompt when mfeRoot is already set, but still registers new dir in mfeRoots', async () => {
    mockedLoadConfig.mockResolvedValue({
      ok: true,
      config: { ...BASE_CONFIG, mfeRoot: 'existing/mfes' },
    });

    const promptSpy = vi.fn().mockResolvedValue({ persist: true });
    const ctx = buildCtx({ prompt: promptSpy });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'custom/mfes' },
      ctx
    );

    expect(promptSpy).not.toHaveBeenCalled();
    expect(mockedSaveConfig).toHaveBeenCalledOnce();
    const [, savedConfig] = mockedSaveConfig.mock.calls[0] as [string, Record<string, unknown>];
    // mfeRoot is preserved untouched, the new dir is appended to mfeRoots.
    expect(savedConfig.mfeRoot).toBe('existing/mfes');
    expect(savedConfig.mfeRoots).toEqual(['custom/mfes']);
  });

  /**
   * (d) --dir not provided → prompt does NOT fire (no custom dir).
   */
  it('does not prompt when --dir is not provided', async () => {
    mockedLoadConfig.mockResolvedValue({ ok: true, config: { ...BASE_CONFIG } });

    const promptSpy = vi.fn().mockResolvedValue({ persist: true });
    const ctx = buildCtx({ prompt: promptSpy });

    await screensetCreateCommand.execute(
      { name: 'contacts' },
      ctx
    );

    expect(promptSpy).not.toHaveBeenCalled();
    expect(mockedSaveConfig).not.toHaveBeenCalled();
  });

  /**
   * (e) --dir equals the legacy default → prompt does NOT fire
   *     (no value in persisting the default value).
   */
  it('does not prompt when --dir equals the legacy default src/mfe_packages', async () => {
    mockedLoadConfig.mockResolvedValue({ ok: true, config: { ...BASE_CONFIG } });

    const promptSpy = vi.fn().mockResolvedValue({ persist: true });
    const ctx = buildCtx({ prompt: promptSpy });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'src/mfe_packages' },
      ctx
    );

    expect(promptSpy).not.toHaveBeenCalled();
    expect(mockedSaveConfig).not.toHaveBeenCalled();
  });

  /**
   * Non-interactive / no prompt function on ctx → mfeRoot prompt is skipped, but
   * the dir is still registered in mfeRoots so multi-root discovery works in
   * scripted contexts (CI, e2e, programmatic callers).
   */
  it('still registers mfeRoots but skips mfeRoot prompt when ctx.prompt is undefined', async () => {
    mockedLoadConfig.mockResolvedValue({ ok: true, config: { ...BASE_CONFIG } });

    // ctx has no prompt property — simulates scripts/e2e callers
    const ctx = buildCtx({ prompt: undefined });

    await screensetCreateCommand.execute(
      { name: 'contacts', dir: 'custom/mfes' },
      ctx
    );

    expect(mockedSaveConfig).toHaveBeenCalledOnce();
    const [, savedConfig] = mockedSaveConfig.mock.calls[0] as [string, Record<string, unknown>];
    expect(savedConfig.mfeRoots).toEqual(['custom/mfes']);
    expect(savedConfig.mfeRoot).toBeUndefined();
  });
});
