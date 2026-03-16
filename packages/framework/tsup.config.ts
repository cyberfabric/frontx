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
    '@hai3/state',
    '@hai3/screensets',
    '@hai3/api',
    '@hai3/i18n',
    '@reduxjs/toolkit',
    'react',
  ],
});
