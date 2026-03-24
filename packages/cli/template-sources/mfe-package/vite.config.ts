import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

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
