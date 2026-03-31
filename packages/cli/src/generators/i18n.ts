// @cpt-flow:cpt-frontx-flow-cli-tooling-scaffold-layout:p1
import type { GeneratedFile } from '../core/types.js';
import { ALL_LANGUAGES, LANGUAGE_ENUM_MAP } from './utils.js';

/**
 * Input for i18n file generation
 */
export interface I18nGeneratorInput {
  /** Base path for i18n directory (relative to project root) */
  basePath: string;
  /** Translation keys to include */
  translations: Record<string, string>;
}

/**
 * Generate i18n stub files for all 36 languages
 */
// @cpt-begin:cpt-frontx-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files
export function generateI18nStubs(input: I18nGeneratorInput): GeneratedFile[] {
  const { basePath, translations } = input;

  return ALL_LANGUAGES.map((lang) => ({
    path: `${basePath}/${lang}.json`,
    content: JSON.stringify(translations, null, 2) + '\n',
  }));
}
// @cpt-end:cpt-frontx-flow-cli-tooling-scaffold-layout:p1:inst-write-layout-files

/**
 * Generate translation loader code
 */
export function generateTranslationLoader(i18nPath: string): string {
  const lines = ALL_LANGUAGES.map(
    (lang) =>
      `  [Language.${LANGUAGE_ENUM_MAP[lang]}]: () => import('${i18nPath}/${lang}.json'),`
  );

  return `I18nRegistry.createLoader({
${lines.join('\n')}
})`;
}
