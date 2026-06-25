import { defineConfig } from 'orval';

export default defineConfig({
  auth: {
    input: './docs/openapi/openapi.json',
    output: {
      target: './generated/sdk/openapi.ts',
      client: 'react-query',
      mode: 'single',
    },
  },
});
