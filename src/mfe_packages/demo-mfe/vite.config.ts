import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { hai3MfeExternalize } from '../shared/vite-plugin-hai3-externalize';

const sharedDeps = [
  'react',
  'react-dom',
  '@hai3/react',
  '@hai3/framework',
  '@hai3/state',
  '@hai3/screensets',
  '@hai3/api',
  '@hai3/i18n',
  '@reduxjs/toolkit',
  'react-redux',
];

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'demoMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './lifecycle-helloworld': './src/lifecycle-helloworld.tsx',
        './lifecycle-profile': './src/lifecycle-profile.tsx',
        './lifecycle-theme': './src/lifecycle-theme.tsx',
        './lifecycle-uikit': './src/lifecycle-uikit.tsx',
      },
      shared: sharedDeps,
    }),
    hai3MfeExternalize({ shared: sharedDeps }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    modulePreload: false,
  },
});
