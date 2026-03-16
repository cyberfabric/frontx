/**
 * Unit tests for currency formatter
 *
 * Covers null/undefined/NaN (return '') and valid currency formatting.
 * Uses Language.English for deterministic results (matches production type).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nRegistry } from '../../I18nRegistry';
import { Language } from '../../types';
import { formatCurrency } from '../currencyFormatter';

describe('currencyFormatter', () => {
  let getLanguageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getLanguageSpy = vi
      .spyOn(i18nRegistry, 'getLanguage')
      .mockReturnValue(Language.English);
  });

  afterEach(() => {
    getLanguageSpy.mockRestore();
  });

  it('returns empty string for null', () => {
    expect(formatCurrency(null, 'USD')).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(formatCurrency(undefined, 'USD')).toBe('');
  });
  it('returns empty string for NaN', () => {
    expect(formatCurrency(Number.NaN, 'USD')).toBe('');
  });
  it('returns formatted currency for valid value', () => {
    expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
  });
  it('accepts different currency codes', () => {
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
  });

  it('returns empty string for invalid currencyCode and does not throw', () => {
    expect(formatCurrency(100, '')).toBe('');
    expect(formatCurrency(100, 'INVALID')).toBe('');
    expect(() => formatCurrency(100, 'NOTACODE')).not.toThrow();
  });
});
