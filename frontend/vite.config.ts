import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
// Build emits content-hashed, immutable assets (main.[hash].js, etc.) so they can be
// safely served behind AWS CloudFront with long-lived cache headers. We intentionally
// avoid any runtime config injection that would break static asset hosting / hashing.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    // Fail the build if a chunk grows unexpectedly large.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Deterministic, content-hashed filenames for cache-busting on CloudFront.
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks: {
          // Split the React runtime into its own long-cacheable vendor chunk.
          'react-vendor': ['react', 'react-dom'],
          'http-vendor': ['axios'],
          'map-vendor': ['maplibre-gl'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
});
