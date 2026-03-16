import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['base.ts', 'sdk.ts', 'framework.ts', 'react.ts', 'screenset.ts', 'index.ts'],
  format: ['esm'],
  dts: false, // Skip DTS - private package, consumers don't need types
  clean: true,
  outDir: 'dist',
});
