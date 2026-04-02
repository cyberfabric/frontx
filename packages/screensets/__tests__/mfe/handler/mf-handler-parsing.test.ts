import { describe, expect, it } from 'vitest';

import {
  parseExposeMetadataFromRemoteEntry,
  parseStaticImportFilenamesFromChunk,
} from '../../../src/mfe/handler/mf-handler';
import {
  createMinifiedRemoteEntrySource,
  createRemoteEntrySource,
} from '../../../__test-utils__/mock-blob-url-loader';

describe('mf-handler parsing helpers', () => {
  describe('parseExposeMetadataFromRemoteEntry', () => {
    it('parses expose chunk and stylesheet paths from pretty remoteEntry output', () => {
      const remoteEntrySource = createRemoteEntrySource(
        { './Widget': '__federation_expose_Widget.js' },
        { './Widget': ['assets/widget.css', 'assets/theme.css?used'] }
      );

      expect(
        parseExposeMetadataFromRemoteEntry(remoteEntrySource, './Widget')
      ).toEqual({
        chunkFilename: '__federation_expose_Widget.js',
        stylesheetPaths: ['assets/widget.css', 'assets/theme.css?used'],
      });
    });

    it('parses minified remoteEntry callback bodies and css arrays', () => {
      const remoteEntrySource =
        'const moduleMap={"./Widget":()=>(E(["assets/widget.css","assets/theme.css"],!1,"./Widget"),w("./__federation_expose_Widget-min.js").then(e=>e))};';

      expect(
        parseExposeMetadataFromRemoteEntry(remoteEntrySource, './Widget')
      ).toEqual({
        chunkFilename: '__federation_expose_Widget-min.js',
        stylesheetPaths: ['assets/widget.css', 'assets/theme.css'],
      });
    });

    it('returns null when the exposed module is not present', () => {
      const remoteEntrySource = createRemoteEntrySource({
        './OtherWidget': '__federation_expose_OtherWidget.js',
      });

      expect(
        parseExposeMetadataFromRemoteEntry(remoteEntrySource, './Widget')
      ).toBeNull();
    });

    it('returns null when the expose callback has no chunk import', () => {
      const remoteEntrySource =
        'const moduleMap={"./Widget":()=>{dynamicLoadingCss(["assets/widget.css"],false,"./Widget");return Promise.resolve({ default: {} });}};';

      expect(
        parseExposeMetadataFromRemoteEntry(remoteEntrySource, './Widget')
      ).toBeNull();
    });

    it('supports exposed module ids containing regex characters', () => {
      const exposedModule = './Widget(v2)+';
      const remoteEntrySource = createMinifiedRemoteEntrySource({
        [exposedModule]: '__federation_expose_Widget-special.js',
      });

      expect(
        parseExposeMetadataFromRemoteEntry(remoteEntrySource, exposedModule)
      ).toEqual({
        chunkFilename: '__federation_expose_Widget-special.js',
        stylesheetPaths: [],
      });
    });
  });

  describe('parseStaticImportFilenamesFromChunk', () => {
    it.each([
      {
        description: 'resolves named and side-effect relative imports',
        chunkFilename: 'nested/expose-Widget.js',
        source: [
          "import { helper } from '../dep.js';",
          "export { other } from './other.js';",
          "import './styles.css';",
        ].join('\n'),
        expected: ['dep.js', 'nested/other.js', 'nested/styles.css'],
      },
      {
        description: 'dedupes repeated imports while preserving relative resolution',
        chunkFilename: 'deep/expose-Widget.js',
        source: [
          "import { helper } from './dep.js';",
          "export { helper as helperAgain } from './dep.js';",
          "import './dep.js';",
        ].join('\n'),
        expected: ['deep/dep.js'],
      },
      {
        description: 'ignores package imports and import-like identifiers',
        chunkFilename: 'expose-Widget.js',
        source: [
          "import React from 'react';",
          "const importMeta = 'import ./not-a-real-import.js';",
          'const importer = () => "import";',
          "import '../runtime.js';",
        ].join('\n'),
        expected: ['runtime.js'],
      },
    ])('$description', ({ chunkFilename, expected, source }) => {
      expect(
        parseStaticImportFilenamesFromChunk(source, chunkFilename)
      ).toEqual(expected);
    });
  });
});
