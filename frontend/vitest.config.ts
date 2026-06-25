import { defineConfig } from 'vitest/config';

// Test config is kept separate from vite.config.ts so the production build stays
// untouched. Unit tests cover pure helpers (no DOM), so a node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
