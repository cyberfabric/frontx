// @cpt-dod:cpt-frontx-dod-unit-test-generation-and-agent-verification-standard-test-convention:p1
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { definePackageVitestConfig } from '../../vitest.shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  ...definePackageVitestConfig({
    rootDir: __dirname,
    environment: 'jsdom',
    plugins: [react()],
  }),
  resolve: {
    alias: [
      {
        find: '@cyberfabric/framework/testing',
        replacement: path.resolve(__dirname, '../framework/src/testing.ts'),
      },
      {
        find: '@cyberfabric/react/testing',
        replacement: path.resolve(__dirname, './src/testing.ts'),
      },
      {
        find: '@cyberfabric/screensets/mfe/handler',
        replacement: path.resolve(__dirname, '../screensets/src/mfe/handler/index.ts'),
      },
      {
        find: '@cyberfabric/screensets/plugins/gts',
        replacement: path.resolve(__dirname, '../screensets/src/mfe/plugins/gts/index.ts'),
      },
      {
        find: '@cyberfabric/state',
        replacement: path.resolve(__dirname, '../state/src/index.ts'),
      },
      {
        find: '@cyberfabric/screensets',
        replacement: path.resolve(__dirname, '../screensets/src/index.ts'),
      },
      {
        find: '@cyberfabric/api',
        replacement: path.resolve(__dirname, '../api/src/index.ts'),
      },
      {
        find: '@cyberfabric/i18n',
        replacement: path.resolve(__dirname, '../i18n/src/index.ts'),
      },
      {
        find: '@cyberfabric/framework',
        replacement: path.resolve(__dirname, '../framework/src/index.ts'),
      },
      {
        find: '@cyberfabric/react',
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
};
