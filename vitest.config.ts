import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/setup.ts'],
    globalSetup: ['./tests/setup/teardown.ts'], // Optional global teardown logic
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
      exclude: [
        'tests/**',
        'node_modules/**',
        'dist/**',
        'vitest.config.ts',
        'src/infrastructure/database/prisma.ts' // Usually excluded
      ],
    },
  },
});
