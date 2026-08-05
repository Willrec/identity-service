import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.test' });

// Fallback values for OAuth testing to avoid boot failures when local .env.test is not updated
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'google-client-id-test';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? 'google-client-secret-test';
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/v1/auth/oauth/google/callback';
process.env.OAUTH_COOKIE_SECRET = process.env.OAUTH_COOKIE_SECRET ?? 'dummy-oauth-cookie-secret-32-chars-long';
process.env.OAUTH_HTTP_TIMEOUT_MS = process.env.OAUTH_HTTP_TIMEOUT_MS ?? '10000';

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
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
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
