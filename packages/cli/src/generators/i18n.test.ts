import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { generateI18nStubs, generateTranslationLoader } from './i18n.js';

describe('generateI18nStubs', () => {
  it('generates only en.json by default', () => {
    const files = generateI18nStubs({ basePath: 'i18n', translations: { title: 'Hello' } });
    assert.equal(files.length, 1);
    assert.equal(files[0].path, 'i18n/en.json');
    assert.equal(files[0].content, '{\n  "title": "Hello"\n}\n');
  });

  it('generates only the requested locales when locales is provided', () => {
    const files = generateI18nStubs({
      basePath: 'src/i18n',
      translations: { title: 'Hello' },
      locales: ['en', 'de'],
    });
    assert.equal(files.length, 2);
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes('src/i18n/en.json'), 'en.json must be present');
    assert.ok(paths.includes('src/i18n/de.json'), 'de.json must be present');
  });

  it('does NOT generate non-requested languages', () => {
    const files = generateI18nStubs({
      basePath: 'i18n',
      translations: {},
      locales: ['en'],
    });
    const paths = files.map((f) => f.path);
    assert.ok(!paths.some((p) => p.includes('de.json')), 'de.json must not be generated');
    assert.ok(!paths.some((p) => p.includes('fr.json')), 'fr.json must not be generated');
    assert.ok(!paths.some((p) => p.includes('zh.json')), 'zh.json must not be generated');
  });

  it('each generated file contains the translation content', () => {
    const translations = { save: 'Save', cancel: 'Cancel' };
    const files = generateI18nStubs({ basePath: 'i18n', translations, locales: ['en', 'fr'] });
    for (const file of files) {
      const parsed = JSON.parse(file.content);
      assert.deepEqual(parsed, translations);
    }
  });

  it('throws for unknown locale', () => {
    assert.throws(
      () => generateI18nStubs({ basePath: 'i18n', translations: {}, locales: ['en', 'zz'] }),
      /unknown locale.*zz/
    );
  });

  it('deduplicates repeated locales', () => {
    const files = generateI18nStubs({ basePath: 'i18n', translations: { k: 'v' }, locales: ['en', 'en'] });
    assert.equal(files.length, 1, 'en must appear exactly once');
  });
});

describe('generateTranslationLoader', () => {
  it('generates loader with only en by default', () => {
    const result = generateTranslationLoader('./i18n');
    assert.ok(result.includes("Language.English"), 'English must be present');
    assert.ok(result.includes("import('./i18n/en.json')"), 'en.json import must be present');
    assert.ok(!result.includes('German'), 'German must NOT be present by default');
    assert.ok(!result.includes('French'), 'French must NOT be present by default');
  });

  it('generates loader with only the specified locales', () => {
    const result = generateTranslationLoader('./i18n', ['en', 'de']);
    assert.ok(result.includes('Language.English'));
    assert.ok(result.includes("import('./i18n/en.json')"));
    assert.ok(result.includes('Language.German'));
    assert.ok(result.includes("import('./i18n/de.json')"));
    assert.ok(!result.includes('French'), 'French must NOT be present');
  });

  it('wraps result in I18nRegistry.createLoader()', () => {
    const result = generateTranslationLoader('./i18n');
    assert.ok(result.startsWith('I18nRegistry.createLoader({'));
    assert.ok(result.endsWith('})'));
  });

  it('throws for unknown locale', () => {
    assert.throws(
      () => generateTranslationLoader('./i18n', ['en', 'xx']),
      /unknown locale.*xx/
    );
  });

  it('deduplicates repeated locales', () => {
    const result = generateTranslationLoader('./i18n', ['en', 'en']);
    const matches = result.match(/Language\.English/g) ?? [];
    assert.equal(matches.length, 1, 'en must appear exactly once');
  });
});
