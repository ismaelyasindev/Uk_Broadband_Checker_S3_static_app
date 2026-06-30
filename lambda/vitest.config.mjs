import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/handler.mjs', 'src/ofcom.mjs'],
      reporter: ['text', 'text-summary', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
