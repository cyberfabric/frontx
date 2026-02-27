import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'blankMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './lifecycle': './src/lifecycle.tsx',
      },
      shared: [
        'react',
        'react-dom',
        'tailwindcss',
        '@hai3/uikit',
        '@hai3/react',
        '@hai3/framework',
        '@hai3/state',
        '@hai3/screensets',
        '@hai3/api',
        '@hai3/i18n',
        '@reduxjs/toolkit',
        'react-redux',
      ],
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
