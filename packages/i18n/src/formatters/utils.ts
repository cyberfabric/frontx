/**
 * Shared formatter utilities - locale and value coercion used by formatters.
 */
// @cpt-algo:cpt-hai3-algo-i18n-infrastructure-locale-resolution:p1
// @cpt-algo:cpt-hai3-algo-i18n-infrastructure-formatter-input-guard:p2
// @cpt-dod:cpt-hai3-dod-i18n-infrastructure-formatters:p1

import { i18nRegistry } from '../I18nRegistry';
import { Language } from '../types';

// @cpt-begin:cpt-hai3-algo-i18n-infrastructure-locale-resolution:p1:inst-1
export function getLocale(): string {
  return i18nRegistry.getLanguage() ?? Language.English;
}
// @cpt-end:cpt-hai3-algo-i18n-infrastructure-locale-resolution:p1:inst-1

// @cpt-begin:cpt-hai3-algo-i18n-infrastructure-formatter-input-guard:p2:inst-1
export function toNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
// @cpt-end:cpt-hai3-algo-i18n-infrastructure-formatter-input-guard:p2:inst-1
