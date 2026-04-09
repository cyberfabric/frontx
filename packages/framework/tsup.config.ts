import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    '@cyberfabric/state',
    '@cyberfabric/screensets',
    '@cyberfabric/api',
    '@cyberfabric/i18n',
    '@reduxjs/toolkit',
    'react',
  ],
});
