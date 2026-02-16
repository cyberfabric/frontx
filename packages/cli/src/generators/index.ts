/**
 * Generator exports
 */

export {
  toPascalCase,
  toCamelCase,
  toScreamingSnake,
  toKebabCase,
  ALL_LANGUAGES,
  LANGUAGE_ENUM_MAP,
} from './utils.js';

export type { I18nGeneratorInput } from './i18n.js';
export { generateI18nStubs, generateTranslationLoader } from './i18n.js';

export type { IdTransformation } from './transform.js';
export {
  parseIdsFile,
  generateTransformationMap,
  transformContent,
  transformFileName,
} from './transform.js';

export type { ProjectGeneratorInput } from './project.js';
export { generateProject } from './project.js';
