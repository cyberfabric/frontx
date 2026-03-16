import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  dts: {
    compilerOptions: {
      moduleResolution: 'node',
    },
  },
  clean: true,
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    '@radix-ui/react-avatar',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-navigation-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    'class-variance-authority',
    'clsx',
    'lucide-react',
    'react-hook-form',
    '@hookform/resolvers',
    'recharts',
    'tailwind-merge',
  ],
  treeshake: true,
  splitting: false,
  esbuildOptions(options) {
    options.alias = {
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/uikit': path.resolve(__dirname, 'src'),
    };
  },
});
