/**
 * String transformation utilities for code generation
 */

import lodash from 'lodash';
const { upperFirst, lowerFirst, toUpper, toLower } = lodash;

/**
 * Escape special regex characters in a string
 * @example escapeRegExp('hello.world') // 'hello\\.world'
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert string to PascalCase
 * @example toPascalCase('hello-world') // 'HelloWorld'
 * @example toPascalCase('helloWorld') // 'HelloWorld'
 */
export function toPascalCase(str: string): string {
  const withoutSeparators = str.replace(/[-_](.)/g, (_, char) => toUpper(char));
  return upperFirst(withoutSeparators);
}

/**
 * Convert string to camelCase
 * @example toCamelCase('hello-world') // 'helloWorld'
 * @example toCamelCase('HelloWorld') // 'helloWorld'
 */
export function toCamelCase(str: string): string {
  const withoutSeparators = str.replace(/[-_](.)/g, (_, char) => toUpper(char));
  return lowerFirst(withoutSeparators);
}

/**
 * Convert string to SCREAMING_SNAKE_CASE
 * @example toScreamingSnake('helloWorld') // 'HELLO_WORLD'
 * @example toScreamingSnake('HelloWorld') // 'HELLO_WORLD'
 */
export function toScreamingSnake(str: string): string {
  const withUnderscores = str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]/g, '_');
  return toUpper(withUnderscores);
}

/**
 * Convert string to kebab-case
 * @example toKebabCase('helloWorld') // 'hello-world'
 * @example toKebabCase('HelloWorld') // 'hello-world'
 */
export function toKebabCase(str: string): string {
  const withDashes = str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-');
  return toLower(withDashes);
}

/**
 * All 36 supported languages
 */
export const ALL_LANGUAGES = [
  'en',
  'ar',
  'bn',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fa',
  'fi',
  'fr',
  'he',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sv',
  'sw',
  'ta',
  'th',
  'tl',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
  'zh-TW',
] as const;

/**
 * Language enum mapping for code generation
 */
export const LANGUAGE_ENUM_MAP: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  bn: 'Bengali',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  es: 'Spanish',
  fa: 'Persian',
  fi: 'Finnish',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ms: 'Malay',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  th: 'Thai',
  tl: 'Tagalog',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese',
  zh: 'ChineseSimplified',
  'zh-TW': 'ChineseTraditional',
};
