import { defineConfig } from 'tsup';
import fs from 'fs/promises';

export default defineConfig([
  // CLI entry - ESM only
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    shims: true,
    async onSuccess() {
      // Add shebang to CLI entry after build
      const cliPath = 'dist/index.js';
      const content = await fs.readFile(cliPath, 'utf-8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        await fs.writeFile(cliPath, `#!/usr/bin/env node\n${content}`);
      }
    },
  },
  // API entry - dual ESM/CJS
  {
    entry: {
      api: 'src/api.ts',
    },
    format: ['esm', 'cjs'],
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.cjs' : '.js',
      };
    },
    dts: true,
    clean: false, // Don't clean, CLI entry already built
    sourcemap: true,
    shims: true,
  },
]);
