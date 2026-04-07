// @cpt-flow:cpt-hai3-flow-cli-tooling-scaffold-layout:p1
import type { GeneratedFile } from '../core/types.js';
import { LANGUAGE_ENUM_MAP } from './utils.js';

/**
 * Input for i18n file generation
 */
export interface I18nGeneratorInput {
  /** Base path for i18n directory (relative to project root) */
  basePath: string;
  /** Translation keys to include */
  translations: Record<string, string>;
  /** Languages to generate stubs for. Defaults to ['en']. Pass ALL_LANGUAGES for all 36. */
  languages?: string[];
}

/**
 * Generate i18n stub files. Defaults to English only unless additional languages are specified.
 */
// @cpt-begin:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files
export function generateI18nStubs(input: I18nGeneratorInput): GeneratedFile[] {
  const { basePath, translations, languages = ['en'] } = input;

  return languages.map((lang) => ({
    path: `${basePath}/${lang}.json`,
    content: JSON.stringify(translations, null, 2) + '\n',
  }));
}
// @cpt-end:cpt-hai3-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files

/**
 * Generate translation loader code. Defaults to English only unless additional languages are specified.
 */
export function generateTranslationLoader(i18nPath: string, languages: string[] = ['en']): string {
  const lines = languages.map(
    (lang) =>
      `  [Language.${LANGUAGE_ENUM_MAP[lang]}]: () => import('${i18nPath}/${lang}.json'),`
  );

  return `I18nRegistry.createLoader({
${lines.join('\n')}
})`;
}
