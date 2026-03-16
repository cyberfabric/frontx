import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react/') || id.includes('react\\')) return 'vendor-react';
            if (id.includes('date-fns') || id.includes('react-day-picker')) return 'vendor-dates';
            if (id.includes('embla-carousel')) return 'vendor-embla';
            if (id.includes('input-otp')) return 'vendor-input-otp';
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('lodash')) return 'vendor-lodash';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
