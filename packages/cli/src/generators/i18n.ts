// @cpt-flow:cpt-frontx-flow-cli-tooling-scaffold-layout:p1
import type { GeneratedFile } from '../core/types.js';
import { ALL_LANGUAGES, LANGUAGE_ENUM_MAP } from './utils.js';

const DEFAULT_LOCALES = ['en'];

/**
 * Validate and deduplicate locales against ALL_LANGUAGES.
 * Throws if any locale is not supported.
 */
function normalizeLocales(locales: string[], callerName: string): string[] {
  const unknown = locales.filter(
    (l) => !Object.prototype.hasOwnProperty.call(LANGUAGE_ENUM_MAP, l)
  );
  if (unknown.length > 0) {
    throw new Error(
      `${callerName}: unknown locale(s): ${unknown.join(', ')}. ` +
      `Supported locales: ${ALL_LANGUAGES.join(', ')}`
    );
  }
  // Deduplicate while preserving order
  return [...new Set(locales)];
}

/**
 * Input for i18n file generation
 */
export interface I18nGeneratorInput {
  /** Base path for i18n directory (relative to project root) */
  basePath: string;
  /** Translation keys to include */
  translations: Record<string, string>;
  /**
   * Locales to generate stubs for.
   * Defaults to ['en']. Pass additional locales only on explicit request.
   */
  locales?: string[];
}

/**
 * Generate i18n stub files.
 * Defaults to en-only; pass locales to include additional languages.
 * Throws if any locale is not in ALL_LANGUAGES.
 */
// @cpt-begin:cpt-frontx-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files
export function generateI18nStubs(input: I18nGeneratorInput): GeneratedFile[] {
  const { basePath, translations, locales: rawLocales = DEFAULT_LOCALES } = input;
  const locales = normalizeLocales(rawLocales, 'generateI18nStubs');

  return locales.map((lang) => ({
    path: `${basePath}/${lang}.json`,
    content: JSON.stringify(translations, null, 2) + '\n',
  }));
}
// @cpt-end:cpt-frontx-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files

/**
 * Generate translation loader code.
 * Defaults to en-only; pass locales to include additional languages.
 * Throws if any locale is not in ALL_LANGUAGES.
 */
export function generateTranslationLoader(i18nPath: string, locales: string[] = DEFAULT_LOCALES): string {
  const normalized = normalizeLocales(locales, 'generateTranslationLoader');

  const lines = normalized.map(
    (lang) =>
      `  [Language.${LANGUAGE_ENUM_MAP[lang]}]: () => import('${i18nPath}/${lang}.json'),`
  );

  return `I18nRegistry.createLoader({
${lines.join('\n')}
})`;
}
