import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: '{{mfeName}}Mfe',
      filename: 'remoteEntry.js',
      exposes: {
        './lifecycle': './src/lifecycle.tsx',
      },
      shared: ['react', 'react-dom'],
      // mf-manifest.json is generated alongside remoteEntry.js for manifest-based loading.
      manifest: true,
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    port: {{port}},
    strictPort: false,
  },
});
