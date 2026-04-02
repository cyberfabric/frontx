import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    testing: 'src/testing.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Share query-cache modules across entries so `dist/testing.js` does not duplicate
  // plugin singletons (globalThis + WeakMaps) relative to `dist/index.js`.
  splitting: true,
  external: [
    '@cyberfabric/state',
    '@cyberfabric/screensets',
    '@cyberfabric/api',
    '@cyberfabric/i18n',
    '@reduxjs/toolkit',
    'react',
    'vitest',
  ],
});
