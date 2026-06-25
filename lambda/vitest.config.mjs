import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/handler.mjs'],
      reporter: ['text', 'text-summary', 'html'],
      // Fail the suite if coverage drops below 100% on any metric.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
